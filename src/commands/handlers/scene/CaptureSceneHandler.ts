import type { CaptureSceneParams, CaptureSceneResult } from '@/commands/types';
import { addGridOverlay, removeGridOverlay, type OverlayCanvas } from './GridOverlay';

interface FoundryView {
  toDataURL(type?: string, quality?: number): string;
  width: number;
  height: number;
}

interface FoundryRenderer {
  render(stage: unknown): void;
}

interface PixiPoint {
  x: number;
  y: number;
  set(x: number, y: number): void;
}

interface FoundryCanvas {
  ready: boolean;
  app: {
    renderer: FoundryRenderer;
    view: FoundryView;
  };
  stage: {
    position: PixiPoint;
    scale: PixiPoint;
  };
  scene: {
    id: string;
    name: string;
    grid: { size: number };
    dimensions: { sceneWidth: number; sceneHeight: number; sceneX: number; sceneY: number };
  } | null;
  pan(options: { x: number; y: number; scale: number; duration?: number }): unknown;
}

const MIME_TYPE = 'image/webp';
const QUALITY = 0.8;
const BASE64_PREFIX_PATTERN = /^data:[^;]+;base64,/;

function getCanvas(): FoundryCanvas | undefined {
  return (globalThis as unknown as { canvas?: FoundryCanvas }).canvas;
}

export function captureSceneHandler(_params: CaptureSceneParams): Promise<CaptureSceneResult> {
  const canvas = getCanvas();

  if (!canvas?.ready || !canvas.scene) {
    return Promise.reject(new Error('Canvas not ready'));
  }

  const dims = canvas.scene.dimensions;
  const view = canvas.app.view;
  const stage = canvas.stage;

  // Save current viewport
  const saved = {
    px: stage.position.x,
    py: stage.position.y,
    sx: stage.scale.x,
    sy: stage.scale.y,
  };

  // Use Foundry's pan() to zoom to fit the full scene
  const vw = (globalThis as unknown as { innerWidth: number }).innerWidth;
  const vh = (globalThis as unknown as { innerHeight: number }).innerHeight;
  const scale = Math.min(vw / dims.sceneWidth, vh / dims.sceneHeight);
  canvas.pan({
    x: dims.sceneX + dims.sceneWidth / 2,
    y: dims.sceneY + dims.sceneHeight / 2,
    scale,
    duration: 0,
  });

  const overlay = addGridOverlay(canvas as unknown as OverlayCanvas);

  canvas.app.renderer.render(stage as unknown);
  const dataUrl = view.toDataURL(MIME_TYPE, QUALITY);
  const image = dataUrl.replace(BASE64_PREFIX_PATTERN, '');

  if (overlay) {
    removeGridOverlay(canvas as unknown as OverlayCanvas, overlay);
  }

  // Restore viewport
  stage.position.set(saved.px, saved.py);
  stage.scale.set(saved.sx, saved.sy);
  canvas.app.renderer.render(stage as unknown);

  return Promise.resolve({
    sceneId: canvas.scene.id,
    sceneName: canvas.scene.name,
    image,
    mimeType: MIME_TYPE,
    width: view.width,
    height: view.height,
  });
}
