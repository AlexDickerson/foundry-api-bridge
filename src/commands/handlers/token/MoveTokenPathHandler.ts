import type { MoveTokenPathParams, MoveTokenPathResult } from '@/commands/types';
import { getActiveScene, getToken, type FoundryGame, type TokenUpdateData } from './tokenTypes';

declare const game: FoundryGame;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function moveTokenPathHandler(params: MoveTokenPathParams): Promise<MoveTokenPathResult> {
  const scene = getActiveScene(game, params.sceneId);
  const token = getToken(scene, params.tokenId);
  const animate = params.animate !== false;
  const delayMs = params.delayMs ?? 500;
  const canvasObj = (globalThis as Record<string, unknown>)['canvas'] as
    | { scene?: { grid?: { size?: number } } }
    | undefined;
  const gridSize = canvasObj?.scene?.grid?.size ?? 100;

  let current = token;

  for (let i = 0; i < params.waypoints.length; i++) {
    const wp = params.waypoints[i];
    if (!wp) break;
    const x = params.coordType === 'grid' ? wp.x * gridSize : wp.x;
    const y = params.coordType === 'grid' ? wp.y * gridSize : wp.y;

    const updateData: TokenUpdateData = { x, y };
    await current.update(updateData, { animate });

    const refreshed = scene.tokens.get(token.id);
    if (!refreshed) throw new Error('Token lost during path movement');
    current = refreshed;

    if (i < params.waypoints.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return { id: token.id, steps: params.waypoints.length };
}
