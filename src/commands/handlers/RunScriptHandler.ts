import type { RunScriptParams, RunScriptResult } from '@/commands/types';

interface FoundryGlobals {
  game: unknown;
  canvas: unknown;
  CONFIG: unknown;
  Hooks: unknown;
}

// Runs an arbitrary JS snippet in the Foundry page. Intended as a dev-only
// escape hatch so the frontend can ask for data paths we haven't wrapped in
// a typed command yet (e.g. `game.actors.get(id).armorClass.getTraceData()`).
//
// The script body runs inside an async function, so `await` works and the
// last `return` statement is the response. Script must explicitly return —
// JS has no implicit last-expression return.
//
// Exposure is gated on the server by the ALLOW_EVAL env var. This handler
// will still respond if called directly via WS without the REST gate, so
// treat the server flag as a defense-in-depth hint, not a hard boundary.
export async function runScriptHandler(params: RunScriptParams): Promise<RunScriptResult> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- eval IS the feature
  const fn = new Function('game', 'canvas', 'CONFIG', 'Hooks', `return (async () => {\n${params.script}\n})();`) as (
    game: unknown,
    canvas: unknown,
    CONFIG: unknown,
    Hooks: unknown,
  ) => Promise<unknown>;
  const g = globalThis as unknown as FoundryGlobals;
  const result: unknown = await fn(g.game, g.canvas, g.CONFIG, g.Hooks);

  // The bridge serializes results over WS via JSON.stringify. If the user
  // returns something with functions, circular refs, or Foundry Document
  // instances, stringify throws and the caller sees an opaque WS failure.
  // Force the check here and surface a clear hint instead.
  try {
    JSON.stringify(result);
    return result;
  } catch {
    return {
      __error: 'Result is not JSON-serializable',
      __hint: 'Call .toObject(false) on Foundry documents before returning them.',
      __type: Object.prototype.toString.call(result),
    };
  }
}
