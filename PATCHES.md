# foundry-mcp patch set

This is a fork of [`foundry-api-bridge`](https://github.com/alexivenkov/foundry-api-bridge-module) v7.7.0
with minimal, surgical edits to remove every code path that talks to a host other than the
self-hosted MCP server. The fork is intended to run only against a local
`foundry-mcp` server (one user, one box). All edits are tagged in source with
`// foundry-mcp patch:` comments so they remain visible during review.

The upstream module already removed its periodic world-data POST and HTTP push
mechanism in v7.0.0 (see upstream `CHANGELOG.md`). The remaining hygiene work
addressed here is small.

## Hygiene goals

- No outbound network traffic at runtime except the WebSocket to the local MCP server.
- No Foundry-side auto-update check against an external manifest URL.
- No UI affordance that opens an external "get an API key" page.
- No stale dead-code config files lying around in the source tree.

## Edits

### 1. `src/main.ts` — remove the Patreon "Get API Key" button hook

Upstream lines 89–115 registered a `renderSettingsConfig` hook that injected a
button into the module settings panel. Clicking the button called
`window.open('https://foundry-mcp.com/auth/patreon', '_blank')`. The window-open is
gated on a user click, so it's not strictly phone-home, but it's the only path
in the bundle that mentions the upstream SaaS host and it has no purpose in a
self-hosted setup.

The entire hook block is replaced with a one-line patch comment. No other code
references the hook or the button.

### 2. `src/settings/SettingsManager.ts` — flip the default WebSocket URL

Upstream default was `wss://foundry-mcp.com/ws`. Changed to
`ws://127.0.0.1:8765/foundry`, matching the loopback bind plan for the local MCP
server.

The setting itself is still configurable from the module settings panel; this is
only the default value used on first install. The end-to-end plan is to expose
the MCP server via SSH local port forward (`-L 8765:127.0.0.1:8765 server.ad`)
so the GM browser session sees the MCP server on `127.0.0.1:8765`.

### 3. `dist/module.json` — strip the auto-update URLs and rewrite description

Removed:

- `"manifest": "https://raw.githubusercontent.com/alexivenkov/foundry-api-bridge-module/master/dist/module.json"`
- `"download": "https://github.com/alexivenkov/foundry-api-bridge-module/releases/latest/download/foundry-api-bridge.zip"`

Foundry uses these two fields for its built-in module-update check. With them
present, every Foundry boot quietly hits raw.githubusercontent.com. Removing them
makes the module update-locked, which is exactly what we want for a forked
local-only build.

`"url"` is kept as a documentation pointer to the upstream — Foundry doesn't fetch
from `url`.

The `description` field also previously claimed the module "Syncs world data"
(no longer true since v7.0.0) and credited foundry-mcp.com. Rewritten to describe
the actual current pull architecture and the self-hosted target.

### 4. `package.json` — description and `copy-config` script

- `description` rewritten for the same reason as `dist/module.json`.
- `build` script no longer chains `npm run copy-config`, and the `copy-config`
  entry is removed. It existed to copy `config/config.schema.json` into `dist/`,
  which is now unused (see #5).

### 5. Removed stale pre-7.0.0 config files

The following four files described the pre-7.0.0 push architecture
(`apiServer`, `features.collectWorldData`, `features.periodicUpdates`,
`compendium.autoLoad`, etc.). None of those fields exist in the current
`ModuleConfig` type and no source file in `src/` references them at runtime.
They were dead code left over from upstream's own cleanup, and a casual reader
of the source could easily mistake them for active configuration.

Deleted:

- `config/config.example.json`
- `config/config.schema.json`
- `dist/config.json`
- `dist/config.schema.json`

The `config/` directory is now empty and was removed.

## Verification

After running `npm install && npm run build && npm test`:

- Build succeeds: `tsc --noEmit` clean, vite emits `dist/module.js` (~96 kB).
- All 577 tests pass across 39 suites.
- `grep -i "foundry-mcp\.com\|patreon\|Get API Key\|/auth/patreon"` against
  `dist/module.js` and `dist/module.json` returns nothing.
- The only HTTP/WS literal anywhere in `dist/module.js` is
  `ws://127.0.0.1:8765/foundry` (the new default).

## Not changed

- LICENSE — kept as-is, MIT.
- Author/credits in `package.json` and `dist/module.json` — kept as-is.
- README.md — kept as-is. (Stale references to the upstream SaaS in README would
  be a separate doc pass.)
- Source layout, command handlers, WebSocket client — untouched.
- The reconnect-with-exponential-backoff loop in `WebSocketClient` is left
  alone; it only ever retries against the configured URL, so on a self-hosted
  setup the only thing it ever talks to is the local MCP server.

## Provenance

- Upstream: https://github.com/alexivenkov/foundry-api-bridge-module
- Upstream version forked: 7.7.0
- Upstream license: MIT (Copyright "AI DM Project")
