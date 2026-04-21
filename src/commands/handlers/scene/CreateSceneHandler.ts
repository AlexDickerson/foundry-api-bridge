import type { CreateSceneParams, CreateSceneResult } from '@/commands/types';

interface FoundryCreatedScene {
  id: string;
  name: string;
  img: string;
  width: number;
  height: number;
  active: boolean;
}

interface SceneDocumentClass {
  create(data: Record<string, unknown>): Promise<FoundryCreatedScene>;
}

interface ScenesCollection {
  documentClass: SceneDocumentClass;
}

interface FoundryGame {
  scenes: ScenesCollection;
}

declare const game: FoundryGame;

export async function createSceneHandler(params: CreateSceneParams): Promise<CreateSceneResult> {
  const sceneData: Record<string, unknown> = {
    name: params.name,
  };

  if (params.img !== undefined) {
    // Foundry v13 moved background image from `img` to `background.src`
    sceneData['background'] = { src: params.img };
  }

  if (params.width !== undefined) {
    sceneData['width'] = params.width;
  }

  if (params.height !== undefined) {
    sceneData['height'] = params.height;
  }

  if (params.folder !== undefined) {
    sceneData['folder'] = params.folder;
  }

  if (params.gridSize !== undefined || params.gridUnits !== undefined || params.gridDistance !== undefined) {
    const grid: Record<string, unknown> = {};
    if (params.gridSize !== undefined) grid['size'] = params.gridSize;
    if (params.gridUnits !== undefined) grid['units'] = params.gridUnits;
    if (params.gridDistance !== undefined) grid['distance'] = params.gridDistance;
    sceneData['grid'] = grid;
  }

  const scene = await game.scenes.documentClass.create(sceneData);

  return {
    id: scene.id,
    name: scene.name,
    img: scene.img,
    width: scene.width,
    height: scene.height,
    active: scene.active,
  };
}
