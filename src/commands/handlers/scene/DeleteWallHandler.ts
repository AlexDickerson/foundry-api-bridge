import type { DeleteWallParams, DeleteResult } from '@/commands/types';

interface FoundryWallDocument {
  id: string;
  delete(): Promise<void>;
}

interface FoundryScene {
  id: string;
  walls: { get(id: string): FoundryWallDocument | undefined };
}

interface FoundryScenesCollection {
  get(id: string): FoundryScene | undefined;
  active: FoundryScene | null;
}

interface FoundryGame {
  scenes: FoundryScenesCollection;
}

declare const game: FoundryGame;

export async function deleteWallHandler(params: DeleteWallParams): Promise<DeleteResult> {
  const scene = params.sceneId ? game.scenes.get(params.sceneId) : game.scenes.active;

  if (!scene) {
    throw new Error(params.sceneId ? `Scene not found: ${params.sceneId}` : 'No active scene');
  }

  const wall = scene.walls.get(params.wallId);
  if (!wall) {
    throw new Error(`Wall not found: ${params.wallId}`);
  }

  await wall.delete();
  return { deleted: true };
}
