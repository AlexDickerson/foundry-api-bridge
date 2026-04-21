import type { NormalizeSceneParams, NormalizeSceneResult } from '@/commands/types';

interface EmbeddedDoc {
  id: string;
  x?: number;
  y?: number;
  c?: [number, number, number, number];
}

interface FoundryScene {
  id: string;
  name: string;
  width: number;
  height: number;
  padding: number;
  background: { src: string };
  grid: { size: number };
  tokens: { contents: EmbeddedDoc[] };
  walls: { contents: EmbeddedDoc[] };
  lights: { contents: EmbeddedDoc[] };
  notes: { contents: EmbeddedDoc[] };
  tiles: { contents: EmbeddedDoc[] };
  drawings: { contents: EmbeddedDoc[] };
  sounds: { contents: EmbeddedDoc[] };
  update(data: Record<string, unknown>): Promise<FoundryScene>;
  updateEmbeddedDocuments(type: string, updates: Record<string, unknown>[]): Promise<unknown>;
}

interface FoundryScenesCollection {
  get(id: string): FoundryScene | undefined;
  active: FoundryScene | null;
}

interface FoundryGame {
  scenes: FoundryScenesCollection;
}

declare const game: FoundryGame;

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = (): void => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (): void => {
      reject(new Error(`Failed to load background image: ${src}`));
    };
    img.src = src;
  });
}

/**
 * Shift all positioned embedded documents by (dx, dy) to compensate for
 * the padding removal. Walls use a `c` array; everything else uses x/y.
 */
async function shiftEmbedded(
  scene: FoundryScene,
  type: string,
  docs: EmbeddedDoc[],
  dx: number,
  dy: number,
): Promise<number> {
  if (docs.length === 0) return 0;

  if (type === 'Wall') {
    const updates = docs
      .filter((d): d is EmbeddedDoc & { c: [number, number, number, number] } => d.c != null)
      .map((d) => ({
        _id: d.id,
        c: [d.c[0] - dx, d.c[1] - dy, d.c[2] - dx, d.c[3] - dy],
      }));
    if (updates.length) await scene.updateEmbeddedDocuments(type, updates);
    return updates.length;
  }

  // Tokens, Lights, Notes, Tiles, Drawings, AmbientSounds
  const updates = docs
    .filter((d): d is EmbeddedDoc & { x: number; y: number } => d.x !== undefined && d.y !== undefined)
    .map((d) => ({
      _id: d.id,
      x: d.x - dx,
      y: d.y - dy,
    }));
  if (updates.length) await scene.updateEmbeddedDocuments(type, updates);
  return updates.length;
}

export async function normalizeSceneHandler(params: NormalizeSceneParams): Promise<NormalizeSceneResult> {
  const scene = params.sceneId ? game.scenes.get(params.sceneId) : game.scenes.active;

  if (!scene) {
    throw new Error(params.sceneId ? `Scene not found: ${params.sceneId}` : 'No active scene');
  }

  const bgSrc = scene.background.src;
  if (!bgSrc) {
    throw new Error(`Scene "${scene.name}" has no background image`);
  }

  const before = {
    width: scene.width,
    height: scene.height,
    padding: scene.padding,
  };

  // Nothing to do if already normalized
  if (before.padding === 0) {
    const gridSize = scene.grid.size;
    return {
      id: scene.id,
      name: scene.name,
      before,
      after: before,
      gridSize,
      gridCols: Math.floor(before.width / gridSize),
      gridRows: Math.floor(before.height / gridSize),
    };
  }

  // Calculate the pixel offset that padding adds
  const dx = Math.round(before.width * before.padding);
  const dy = Math.round(before.height * before.padding);

  // Load the background image to get its native pixel dimensions
  const imgDims = await getImageDimensions(bgSrc);

  // Update scene dimensions and remove padding
  await scene.update({
    width: imgDims.width,
    height: imgDims.height,
    padding: 0,
  });

  // Shift all embedded documents to compensate for removed padding
  const collections: [string, EmbeddedDoc[]][] = [
    ['Token', scene.tokens.contents],
    ['Wall', scene.walls.contents],
    ['AmbientLight', scene.lights.contents],
    ['Note', scene.notes.contents],
    ['Tile', scene.tiles.contents],
    ['Drawing', scene.drawings.contents],
    ['AmbientSound', scene.sounds.contents],
  ];

  for (const [type, docs] of collections) {
    await shiftEmbedded(scene, type, docs, dx, dy);
  }

  const gridSize = scene.grid.size;

  return {
    id: scene.id,
    name: scene.name,
    before,
    after: {
      width: imgDims.width,
      height: imgDims.height,
      padding: 0,
    },
    gridSize,
    gridCols: Math.floor(imgDims.width / gridSize),
    gridRows: Math.floor(imgDims.height / gridSize),
  };
}
