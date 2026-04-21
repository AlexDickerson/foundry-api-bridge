import type {
  SetPatrolParams,
  SetPatrolResult,
  StopPatrolParams,
  StopPatrolResult,
  GetPatrolsParams,
  GetPatrolsResult,
  PatrolInfo,
  TokenWaypoint,
} from '@/commands/types';
import { getActiveScene, getToken, type FoundryGame, type TokenUpdateData } from './tokenTypes';

declare const game: FoundryGame;

interface ActivePatrol {
  patrolId: string;
  tokenId: string;
  sceneId: string;
  waypoints: TokenWaypoint[];
  pixelWaypoints: Array<{ x: number; y: number }>;
  currentStep: number;
  direction: 1 | -1;
  loop: boolean;
  delayMs: number;
  intervalMs: number;
  animate: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

const activePatrols = new Map<string, ActivePatrol>();
let patrolCounter = 0;

function getGridSize(): number {
  const canvas = (globalThis as Record<string, unknown>)['canvas'] as
    | { scene?: { grid?: { size?: number } } }
    | undefined;
  return canvas?.scene?.grid?.size ?? 100;
}

function toPixelWaypoints(
  waypoints: TokenWaypoint[],
  coordType: 'pixel' | 'grid',
  gridSize: number,
): Array<{ x: number; y: number }> {
  if (coordType === 'grid') {
    return waypoints.map((wp) => ({ x: wp.x * gridSize, y: wp.y * gridSize }));
  }
  return waypoints.map((wp) => ({ x: wp.x, y: wp.y }));
}

async function stepPatrol(patrol: ActivePatrol): Promise<void> {
  try {
    const scene = game.scenes.get(patrol.sceneId);
    if (!scene) {
      stopPatrolById(patrol.tokenId);
      return;
    }

    const token = scene.tokens.get(patrol.tokenId);
    if (!token) {
      stopPatrolById(patrol.tokenId);
      return;
    }

    const wp = patrol.pixelWaypoints[patrol.currentStep];
    if (!wp) {
      stopPatrolById(patrol.tokenId);
      return;
    }

    const updateData: TokenUpdateData = { x: wp.x, y: wp.y };
    await token.update(updateData, { animate: patrol.animate });

    // Advance step
    const nextStep = patrol.currentStep + patrol.direction;
    if (nextStep >= patrol.pixelWaypoints.length || nextStep < 0) {
      if (patrol.loop) {
        // Ping-pong: reverse direction
        patrol.direction = patrol.direction === 1 ? -1 : 1;
        patrol.currentStep = patrol.currentStep + patrol.direction;
      } else {
        // Non-loop: restart from beginning
        patrol.currentStep = 0;
      }
    } else {
      patrol.currentStep = nextStep;
    }

    // Schedule next step
    const isAtEnd = patrol.currentStep === 0 || patrol.currentStep === patrol.pixelWaypoints.length - 1;
    const delay = isAtEnd ? patrol.intervalMs : patrol.delayMs;
    patrol.timer = setTimeout(() => {
      void stepPatrol(patrol);
    }, delay);
  } catch {
    stopPatrolById(patrol.tokenId);
  }
}

function stopPatrolById(tokenId: string): boolean {
  const patrol = activePatrols.get(tokenId);
  if (!patrol) return false;
  if (patrol.timer) clearTimeout(patrol.timer);
  activePatrols.delete(tokenId);
  return true;
}

export function setPatrolHandler(params: SetPatrolParams): Promise<SetPatrolResult> {
  const scene = getActiveScene(game, params.sceneId);
  const token = getToken(scene, params.tokenId);

  // Stop existing patrol on this token
  stopPatrolById(params.tokenId);

  const gridSize = getGridSize();
  const coordType = params.coordType ?? 'grid';
  const pixelWaypoints = toPixelWaypoints(params.waypoints, coordType, gridSize);

  const patrolId = `patrol-${String(++patrolCounter)}`;
  const patrol: ActivePatrol = {
    patrolId,
    tokenId: params.tokenId,
    sceneId: scene.id,
    waypoints: params.waypoints,
    pixelWaypoints,
    currentStep: 0,
    direction: 1,
    loop: params.loop !== false,
    delayMs: params.delayMs ?? 500,
    intervalMs: params.intervalMs ?? 5000,
    animate: params.animate !== false,
    timer: null,
  };

  activePatrols.set(params.tokenId, patrol);

  // Start the patrol
  patrol.timer = setTimeout(() => {
    void stepPatrol(patrol);
  }, patrol.delayMs);

  return Promise.resolve({
    patrolId,
    tokenId: token.id,
    waypoints: params.waypoints.length,
  });
}

export function stopPatrolHandler(params: StopPatrolParams): Promise<StopPatrolResult> {
  const stopped = stopPatrolById(params.tokenId);
  return Promise.resolve({ stopped });
}

export function getPatrolsHandler(params: GetPatrolsParams): Promise<GetPatrolsResult> {
  const sceneId = params.sceneId ?? game.scenes.active?.id;
  const patrols: PatrolInfo[] = [];

  for (const patrol of activePatrols.values()) {
    if (sceneId && patrol.sceneId !== sceneId) continue;

    const scene = game.scenes.get(patrol.sceneId);
    const token = scene?.tokens.get(patrol.tokenId);

    patrols.push({
      patrolId: patrol.patrolId,
      tokenId: patrol.tokenId,
      tokenName: token?.name ?? 'Unknown',
      waypoints: patrol.waypoints,
      currentStep: patrol.currentStep,
      loop: patrol.loop,
      delayMs: patrol.delayMs,
      intervalMs: patrol.intervalMs,
    });
  }

  return Promise.resolve({ patrols });
}
