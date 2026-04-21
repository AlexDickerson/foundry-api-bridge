import type { GetSceneParams, SceneDetailResult, SceneScreenshot } from '@/commands/types';
import { getScene, mapSceneToDetail, type FoundryGame } from './sceneTypes';
import { generateAsciiMap } from './AsciiMapGenerator';
import { addGridOverlay, removeGridOverlay, type OverlayCanvas } from './GridOverlay';

declare const game: FoundryGame;

interface CanvasView {
  toDataURL(type?: string, quality?: number): string;
  width: number;
  height: number;
}

interface CanvasRenderer {
  render(stage: unknown): void;
  screen: { width: number; height: number };
}

interface PixiPoint {
  x: number;
  y: number;
  set(x: number, y: number): void;
}

interface FoundryCanvas {
  ready: boolean;
  app: {
    renderer: CanvasRenderer;
    view: CanvasView;
  };
  stage: {
    position: PixiPoint;
    scale: PixiPoint;
  };
  scene: {
    id: string;
    grid: { size: number };
    dimensions: { sceneWidth: number; sceneHeight: number; sceneX: number; sceneY: number };
  } | null;
  pan(options: { x: number; y: number; scale: number; duration?: number }): unknown;
}

interface CollisionBackend {
  testCollision(
    origin: { x: number; y: number },
    destination: { x: number; y: number },
    config: { type: string; mode: string },
  ): boolean;
}

interface CanvasGlobals {
  canvas?: FoundryCanvas;
  CONFIG?: {
    Canvas?: {
      polygonBackends?: {
        move?: CollisionBackend;
      };
    };
  };
}

const MIME_TYPE = 'image/webp';
const QUALITY = 0.8;
const BASE64_PREFIX_PATTERN = /^data:[^;]+;base64,/;

function getGlobals(): CanvasGlobals {
  return globalThis as unknown as CanvasGlobals;
}

function captureScreenshot(canvas: FoundryCanvas): SceneScreenshot | undefined {
  try {
    if (!canvas.scene) throw new Error('No active canvas scene');
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
    (canvas as unknown as FoundryCanvas).pan({
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

    return {
      image,
      mimeType: MIME_TYPE,
      width: view.width,
      height: view.height,
    };
  } catch {
    return undefined;
  }
}

export function getSceneHandler(params: GetSceneParams): Promise<SceneDetailResult> {
  try {
    const scene = getScene(game, params.sceneId);
    const include = params.include ? new Set(params.include) : undefined;
    const detail = mapSceneToDetail(scene, include);
    const globals = getGlobals();

    if (!include || include.has('asciiMap')) {
      const collisionBackend = globals.CONFIG?.Canvas?.polygonBackends?.move;
      const gridSize = scene.grid?.size ?? 100;

      const walls = (scene.walls?.contents ?? []).map((w) => ({
        c: w.c,
        door: w.door,
        ds: w.ds ?? 0,
        move: w.move,
      }));

      const tokens = (scene.tokens?.contents ?? []).map((t) => ({
        id: t.id,
        name: t.name ?? '',
        x: t.x,
        y: t.y,
        width: t.width ?? 1,
        height: t.height ?? 1,
        hp: t.actor?.system?.attributes?.hp,
        disposition: t.disposition ?? 0,
      }));

      detail.asciiMap = generateAsciiMap({
        gridSize,
        gridDistance: scene.grid?.distance ?? 5,
        gridUnits: scene.grid?.units ?? 'ft',
        sceneName: scene.name,
        sceneWidth: scene.width ?? 0,
        sceneHeight: scene.height ?? 0,
        tokens,
        walls,
        collisionBackend,
        center: params.center ? { gx: params.center.x, gy: params.center.y } : undefined,
        radius: params.radius,
      });
    }

    if (params.includeScreenshot) {
      const canvas = globals.canvas;
      if (canvas?.ready && canvas.scene) {
        const screenshot = captureScreenshot(canvas);
        if (screenshot) {
          detail.screenshot = screenshot;
        }
      }
    }

    return Promise.resolve(detail);
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}
