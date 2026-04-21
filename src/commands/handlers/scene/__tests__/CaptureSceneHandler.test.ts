import { captureSceneHandler } from '../CaptureSceneHandler';

jest.mock('../GridOverlay', () => ({
  addGridOverlay: jest.fn().mockReturnValue(null),
  removeGridOverlay: jest.fn(),
}));

interface MockPixiPoint {
  x: number;
  y: number;
  set: jest.Mock;
}

interface MockCanvas {
  ready: boolean;
  app: {
    renderer: { render: jest.Mock };
    view: {
      toDataURL: jest.Mock;
      width: number;
      height: number;
    };
  };
  stage: {
    position: MockPixiPoint;
    scale: MockPixiPoint;
  };
  scene: {
    id: string;
    name: string;
    grid: { size: number };
    dimensions: { sceneWidth: number; sceneHeight: number; sceneX: number; sceneY: number };
  } | null;
  pan: jest.Mock;
}

function createMockCanvas(overrides?: Partial<MockCanvas>): MockCanvas {
  return {
    ready: true,
    app: {
      renderer: { render: jest.fn() },
      view: {
        toDataURL: jest.fn().mockReturnValue('data:image/webp;base64,abc123encodeddata'),
        width: 2658,
        height: 1864,
      },
    },
    stage: {
      position: { x: 0, y: 0, set: jest.fn() },
      scale: { x: 1, y: 1, set: jest.fn() },
    },
    scene: {
      id: 'scene-1',
      name: 'Cragmaw Castle',
      grid: { size: 100 },
      dimensions: { sceneWidth: 2658, sceneHeight: 1864, sceneX: 0, sceneY: 0 },
    },
    pan: jest.fn(),
    ...overrides,
  };
}

function setCanvas(canvas: MockCanvas | undefined): void {
  if (canvas === undefined) {
    delete (globalThis as Record<string, unknown>)['canvas'];
  } else {
    (globalThis as Record<string, unknown>)['canvas'] = canvas;
  }
}

function clearCanvas(): void {
  delete (globalThis as Record<string, unknown>)['canvas'];
}

describe('captureSceneHandler', () => {
  beforeAll(() => {
    (globalThis as Record<string, unknown>)['innerWidth'] = 1920;
    (globalThis as Record<string, unknown>)['innerHeight'] = 1080;
  });
  afterEach(clearCanvas);

  it('should render stage, capture viewport and return base64 image', async () => {
    const canvas = createMockCanvas();
    setCanvas(canvas);

    const result = await captureSceneHandler({} as Record<string, never>);

    expect(canvas.app.renderer.render).toHaveBeenCalledWith(canvas.stage);
    expect(result.sceneId).toBe('scene-1');
    expect(result.sceneName).toBe('Cragmaw Castle');
    expect(result.image).toBe('abc123encodeddata');
    expect(result.mimeType).toBe('image/webp');
    expect(result.width).toBe(2658);
    expect(result.height).toBe(1864);
  });

  it('should call renderer.render before toDataURL', async () => {
    const callOrder: string[] = [];
    const canvas = createMockCanvas();
    canvas.app.renderer.render = jest.fn(() => {
      callOrder.push('render');
    });
    canvas.app.view.toDataURL = jest.fn(() => {
      callOrder.push('toDataURL');
      return 'data:image/webp;base64,x';
    });
    setCanvas(canvas);

    await captureSceneHandler({} as Record<string, never>);

    expect(callOrder).toEqual(['render', 'toDataURL', 'render']);
  });

  it('should call toDataURL with webp and quality 0.8', async () => {
    const canvas = createMockCanvas();
    setCanvas(canvas);

    await captureSceneHandler({} as Record<string, never>);

    expect(canvas.app.view.toDataURL).toHaveBeenCalledWith('image/webp', 0.8);
  });

  it('should strip data URL prefix from base64', async () => {
    setCanvas(createMockCanvas());

    const result = await captureSceneHandler({} as Record<string, never>);

    expect(result.image).not.toContain('data:');
    expect(result.image).toBe('abc123encodeddata');
  });

  it('should strip png prefix if browser falls back to png', async () => {
    const canvas = createMockCanvas();
    canvas.app.view.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,pngfallback');
    setCanvas(canvas);

    const result = await captureSceneHandler({} as Record<string, never>);

    expect(result.image).toBe('pngfallback');
  });

  it('should reject when canvas is not ready', async () => {
    setCanvas(createMockCanvas({ ready: false }));

    await expect(captureSceneHandler({} as Record<string, never>)).rejects.toThrow('Canvas not ready');
  });

  it('should reject when canvas is undefined', async () => {
    setCanvas(undefined);

    await expect(captureSceneHandler({} as Record<string, never>)).rejects.toThrow('Canvas not ready');
  });

  it('should reject when canvas.scene is null', async () => {
    setCanvas(createMockCanvas({ scene: null }));

    await expect(captureSceneHandler({} as Record<string, never>)).rejects.toThrow('Canvas not ready');
  });

  it('should return view dimensions', async () => {
    const canvas = createMockCanvas();
    canvas.app.view.width = 3840;
    canvas.app.view.height = 2160;
    setCanvas(canvas);

    const result = await captureSceneHandler({} as Record<string, never>);

    expect(result.width).toBe(3840);
    expect(result.height).toBe(2160);
  });

  it('should propagate render errors', () => {
    const canvas = createMockCanvas();
    canvas.app.renderer.render = jest.fn(() => {
      throw new Error('WebGL context lost');
    });
    setCanvas(canvas);

    expect(() => captureSceneHandler({} as Record<string, never>)).toThrow('WebGL context lost');
  });
});
