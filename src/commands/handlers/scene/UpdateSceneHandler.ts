import type { UpdateSceneParams, UpdateSceneResult } from '@/commands/types';
import { getScene, type FoundryGame } from './sceneTypes';

declare const game: FoundryGame;

export async function updateSceneHandler(params: UpdateSceneParams): Promise<UpdateSceneResult> {
  const scene = getScene(game, params.sceneId);
  const updateData: Record<string, unknown> = {};

  if (params.background !== undefined) {
    updateData['background'] = { src: params.background };
  }
  if (params.name !== undefined) updateData['name'] = params.name;
  if (params.darkness !== undefined) updateData['darkness'] = params.darkness;

  const grid: Record<string, unknown> = {};
  if (params.gridSize !== undefined) grid['size'] = params.gridSize;
  if (params.gridUnits !== undefined) grid['units'] = params.gridUnits;
  if (params.gridDistance !== undefined) grid['distance'] = params.gridDistance;
  if (Object.keys(grid).length > 0) updateData['grid'] = grid;

  await (scene as unknown as { update(data: Record<string, unknown>): Promise<unknown> }).update(updateData);

  return { id: scene.id };
}
