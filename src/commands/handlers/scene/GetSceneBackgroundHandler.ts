import type { GetSceneBackgroundParams, GetSceneBackgroundResult } from '@/commands/types';
import { getScene, type FoundryGame } from './sceneTypes';

declare const game: FoundryGame;

const MIME_TYPE = 'image/webp';
const QUALITY = 0.8;
const DEFAULT_MAX_DIM = 2048;
const BASE64_PREFIX_PATTERN = /^data:[^;]+;base64,/;

export async function getSceneBackgroundHandler(params: GetSceneBackgroundParams): Promise<GetSceneBackgroundResult> {
  const scene = getScene(game, params.sceneId);
  const src = scene.background?.src ?? scene.img;
  if (!src) throw new Error('Scene has no background image');

  const maxDim = params.maxDimension ?? DEFAULT_MAX_DIM;

  // Load the image via browser fetch
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = (): void => {
      resolve();
    };
    img.onerror = (): void => {
      reject(new Error(`Failed to load background image: ${src}`));
    };
    img.src = src;
  });

  // Scale to fit within maxDim
  const aspect = img.width / img.height;
  let w: number, h: number;
  if (img.width >= img.height) {
    w = Math.min(img.width, maxDim);
    h = Math.round(w / aspect);
  } else {
    h = Math.min(img.height, maxDim);
    w = Math.round(h * aspect);
  }

  // Render to offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL(MIME_TYPE, QUALITY);
  const image = dataUrl.replace(BASE64_PREFIX_PATTERN, '');

  return {
    sceneId: scene.id,
    sceneName: scene.name,
    image,
    mimeType: MIME_TYPE,
    width: w,
    height: h,
  };
}
