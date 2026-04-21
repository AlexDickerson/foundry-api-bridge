import type { CreateWallsParams, CreateWallsResult } from '@/commands/types';

interface FoundryWallDocument {
  id: string;
}

interface FoundryScene {
  id: string;
  createEmbeddedDocuments(type: string, data: Record<string, unknown>[]): Promise<FoundryWallDocument[]>;
}

interface FoundryScenesCollection {
  get(id: string): FoundryScene | undefined;
  active: FoundryScene | null;
}

interface FoundryGame {
  scenes: FoundryScenesCollection;
}

declare const game: FoundryGame;
declare const CONST: Record<string, Record<string, number>>;

export async function createWallsHandler(params: CreateWallsParams): Promise<CreateWallsResult> {
  const scene = params.sceneId ? game.scenes.get(params.sceneId) : game.scenes.active;

  if (!scene) {
    throw new Error(params.sceneId ? `Scene not found: ${params.sceneId}` : 'No active scene');
  }

  // Foundry v13 uses CONST values (e.g. 20=NORMAL) not 0/1
  const moveNormal = CONST['WALL_MOVEMENT_TYPES']?.['NORMAL'] ?? 20;
  const senseNormal = CONST['WALL_SENSE_TYPES']?.['NORMAL'] ?? 20;

  const wallData: Record<string, unknown>[] = params.walls.map((w) => {
    const d: Record<string, unknown> = { c: w.c };
    if (w.door) d['door'] = w.door;
    if (w.move !== undefined) d['move'] = w.move === 1 ? moveNormal : w.move;
    if (w.sense !== undefined) {
      const val = w.sense === 1 ? senseNormal : w.sense;
      d['light'] = val;
      d['sight'] = val;
      d['sound'] = val;
    }
    return d;
  });

  const created = await scene.createEmbeddedDocuments('Wall', wallData);

  return {
    created: created.length,
    wallIds: created.map((w) => w.id),
  };
}
