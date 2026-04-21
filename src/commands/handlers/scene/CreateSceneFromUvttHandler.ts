import type { CreateSceneFromUvttParams, CreateSceneFromUvttResult } from '@/commands/types';

interface FoundryCreatedScene {
  id: string;
  name: string;
  img: string;
  width: number;
  height: number;
  active: boolean;
  grid: { size: number };
  update(data: Record<string, unknown>): Promise<void>;
  createEmbeddedDocuments(type: string, data: Record<string, unknown>[]): Promise<Array<{ id: string }>>;
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
declare const CONST: Record<string, Record<string, number>>;

export async function createSceneFromUvttHandler(
  params: CreateSceneFromUvttParams,
): Promise<CreateSceneFromUvttResult> {
  const { uvtt } = params;
  const ppg = uvtt.resolution.pixels_per_grid;
  const mapSize = uvtt.resolution.map_size;
  const sceneWidth = Math.round(mapSize.x * ppg);
  const sceneHeight = Math.round(mapSize.y * ppg);

  // 1. Create the scene
  const sceneData: Record<string, unknown> = {
    name: params.name,
    width: sceneWidth,
    height: sceneHeight,
    padding: 0,
    grid: {
      size: ppg,
      distance: params.gridDistance ?? 5,
      units: params.gridUnits ?? 'ft',
    },
  };

  // Foundry v14: background images live on Level documents, not the Scene itself.
  // Include a default level with the background in the creation data so the
  // scene.background shim getter has a firstLevel to read from.
  if (params.img) {
    sceneData['levels'] = [
      {
        name: 'Ground',
        elevation: { bottom: 0, top: 20 },
        background: { src: params.img },
      },
    ];
  }

  const scene = await game.scenes.documentClass.create(sceneData);

  // 2. Convert line_of_sight to wall segments
  const moveNormal = CONST['WALL_MOVEMENT_TYPES']?.['NORMAL'] ?? 20;
  const senseNormal = CONST['WALL_SENSE_TYPES']?.['NORMAL'] ?? 20;

  const wallData: Record<string, unknown>[] = uvtt.line_of_sight
    .filter((seg) => seg.length >= 2)
    .map((seg) => {
      const p0 = seg[0] as { x: number; y: number };
      const p1 = seg[1] as { x: number; y: number };
      return {
        c: [Math.round(p0.x * ppg), Math.round(p0.y * ppg), Math.round(p1.x * ppg), Math.round(p1.y * ppg)],
        move: moveNormal,
        light: senseNormal,
        sight: senseNormal,
        sound: senseNormal,
      };
    });

  // 3. Convert portals to door walls
  let doorsCreated = 0;
  if (uvtt.portals && uvtt.portals.length > 0) {
    const doorType = CONST['WALL_DOOR_TYPES']?.['DOOR'] ?? 1;
    for (const portal of uvtt.portals) {
      if (portal.bounds.length >= 2) {
        const b0 = portal.bounds[0] as { x: number; y: number };
        const b1 = portal.bounds[1] as { x: number; y: number };
        wallData.push({
          c: [Math.round(b0.x * ppg), Math.round(b0.y * ppg), Math.round(b1.x * ppg), Math.round(b1.y * ppg)],
          door: doorType,
          ds: portal.closed === false ? 1 : 0,
          move: moveNormal,
          light: senseNormal,
          sight: senseNormal,
          sound: senseNormal,
        });
        doorsCreated++;
      }
    }
  }

  // 4. Create all walls on the scene
  let wallsCreated = 0;
  if (wallData.length > 0) {
    const created = await scene.createEmbeddedDocuments('Wall', wallData);
    wallsCreated = created.length;
  }

  // 5. Activate if requested
  if (params.activate) {
    await scene.update({ active: true });
  }

  return {
    id: scene.id,
    name: scene.name,
    img: scene.img,
    width: scene.width,
    height: scene.height,
    active: params.activate ?? false,
    wallsCreated: wallsCreated - doorsCreated,
    doorsCreated,
    gridSize: ppg,
    gridCols: Math.round(mapSize.x),
    gridRows: Math.round(mapSize.y),
  };
}
