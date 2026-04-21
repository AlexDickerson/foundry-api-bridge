import type { AnalyzeSceneParams, AnalyzeSceneResult } from '@/commands/types';

interface FoundryScene {
  id: string;
  name: string;
  width: number;
  height: number;
  background: { src: string };
  grid: { size: number };
}

interface FoundryScenesCollection {
  get(id: string): FoundryScene | undefined;
  active: FoundryScene | null;
}

declare const game: { scenes: FoundryScenesCollection };

// ---------------------------------------------------------------------------
// Pixel classification
// ---------------------------------------------------------------------------

interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

function luminance({ r, g, b }: RGB): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation({ r, g, b }: RGB): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function hue({ r, g, b }: RGB): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

/**
 * Classify a pixel sample into a map feature character.
 *
 * The classification is deliberately simple and tuned for typical
 * fantasy battle map palettes:
 *   - Very dark or transparent → outside/void  (~)
 *   - Dark brown/grey (low luminance) → wall structure  (#)
 *   - Green hue with decent saturation → outside/grass  (~)
 *   - Medium-to-high luminance → floor  (·)
 */
function classify(sample: RGB): string {
  // Transparent or near-transparent
  if (sample.a < 30) return ' ';

  const lum = luminance(sample);
  const sat = saturation(sample);
  const h = hue(sample);

  // Very dark → outside/void
  if (lum < 0.12) return '~';

  // Green-ish with some saturation → outside (grass, foliage)
  if (sat > 0.25 && h >= 60 && h <= 170 && lum < 0.45) return '~';

  // Dark with low saturation → wall/structure
  if (lum < 0.3 && sat < 0.35) return '#';

  // Medium dark, brownish → could be wall or dark floor
  if (lum < 0.35 && sat < 0.5) return '#';

  // Everything else → floor
  return '·';
}

// ---------------------------------------------------------------------------
// Image sampling
// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = (): void => {
      resolve(img);
    };
    img.onerror = (): void => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

/**
 * Sample the average color of a region around a point.
 * Uses a small kernel (5x5) centered on the grid cell center
 * to avoid single-pixel noise.
 */
function sampleRegion(ctx: CanvasRenderingContext2D, cx: number, cy: number, imgW: number, imgH: number): RGB {
  const radius = 2; // 5x5 kernel
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(imgW - 1, Math.floor(cx + radius));
  const y1 = Math.min(imgH - 1, Math.floor(cy + radius));
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;

  const data = ctx.getImageData(x0, y0, w, h).data;
  let rSum = 0,
    gSum = 0,
    bSum = 0,
    aSum = 0;
  const count = w * h;
  for (let i = 0; i < count; i++) {
    rSum += data[i * 4] ?? 0;
    gSum += data[i * 4 + 1] ?? 0;
    bSum += data[i * 4 + 2] ?? 0;
    aSum += data[i * 4 + 3] ?? 0;
  }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
    a: Math.round(aSum / count),
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function analyzeSceneHandler(params: AnalyzeSceneParams): Promise<AnalyzeSceneResult> {
  const scene = params.sceneId ? game.scenes.get(params.sceneId) : game.scenes.active;

  if (!scene) {
    throw new Error(params.sceneId ? `Scene not found: ${params.sceneId}` : 'No active scene');
  }

  const bgSrc = scene.background.src;
  if (!bgSrc) {
    throw new Error(`Scene "${scene.name}" has no background image`);
  }

  const gridSize = scene.grid.size;
  const cols = Math.floor(scene.width / gridSize);
  const rows = Math.floor(scene.height / gridSize);

  // Load background image onto an offscreen canvas
  const img = await loadImage(bgSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');
  ctx.drawImage(img, 0, 0);

  // Scale factor: image pixels may differ from scene pixels
  const scaleX = img.naturalWidth / scene.width;
  const scaleY = img.naturalHeight / scene.height;

  // Sample each grid cell center
  const gridChars: string[] = [];
  for (let row = 0; row < rows; row++) {
    const rowChars: string[] = [];
    for (let col = 0; col < cols; col++) {
      // Center of grid cell in scene coordinates, then scale to image coordinates
      const sceneCx = (col + 0.5) * gridSize;
      const sceneCy = (row + 0.5) * gridSize;
      const imgCx = sceneCx * scaleX;
      const imgCy = sceneCy * scaleY;

      const sample = sampleRegion(ctx, imgCx, imgCy, img.naturalWidth, img.naturalHeight);
      rowChars.push(classify(sample));
    }
    gridChars.push(rowChars.join(''));
  }

  // Format as rows separated by newlines
  const gridStr = gridChars.join('\n');

  return {
    id: scene.id,
    name: scene.name,
    gridSize,
    cols,
    rows,
    grid: gridStr,
    legend: '# = wall/structure  · = floor  ~ = outside/void  (space) = transparent',
  };
}
