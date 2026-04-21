import type { ModuleConfig } from '@/config/types';
import { DEFAULT_CONFIG } from '@/config/defaults';

const MODULE_ID = 'foundry-api-bridge';
const CONFIG_KEY = 'config';

export function registerSettings(): void {
  if (!game.settings) {
    throw new Error('game.settings is not available');
  }
  // @ts-expect-error v13 types narrowed namespace to 'core'; our custom module namespace is valid at runtime
  game.settings.register(MODULE_ID, CONFIG_KEY, {
    name: 'Module Configuration',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_CONFIG,
  });

  // @ts-expect-error v13 types narrowed namespace to 'core'; our custom module namespace is valid at runtime
  game.settings.register(MODULE_ID, 'wsUrl', {
    name: 'WebSocket URL',
    hint: 'URL for WebSocket connection to the server',
    scope: 'world',
    config: true,
    type: String,
    // foundry-mcp patch: default points at the self-hosted MCP server's Foundry endpoint instead of the upstream SaaS host. See PATCHES.md for the original value.
    default: 'ws://127.0.0.1:8765/foundry',
    requiresReload: true,
  });

  // @ts-expect-error v13 types narrowed namespace to 'core'; our custom module namespace is valid at runtime
  game.settings.register(MODULE_ID, 'apiKey', {
    name: 'API Key',
    hint: 'API key for server authorization (format: pk_...)',
    scope: 'world',
    config: true,
    type: String,
    default: '',
    requiresReload: true,
  });
}

export async function registerMenu(): Promise<void> {
  if (!game.settings) {
    throw new Error('game.settings is not available');
  }

  const { ApiConfigForm } = await import('@/ui/ApiConfigForm');

  game.settings.registerMenu(MODULE_ID, 'configMenu', {
    name: 'Configure Module',
    label: 'Configure',
    hint: 'Configure WebSocket and logging settings',
    icon: 'fas fa-cog',
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    type: ApiConfigForm as unknown as new () => FormApplication,
    restricted: true,
  });
}

export function getWsUrl(): string {
  if (!game.settings) {
    throw new Error('game.settings is not available');
  }
  // @ts-expect-error v13 types narrowed namespace to 'core'; our custom module namespace is valid at runtime
  return game.settings.get(MODULE_ID, 'wsUrl') as string;
}

export function getApiKey(): string {
  if (!game.settings) {
    throw new Error('game.settings is not available');
  }
  // @ts-expect-error v13 types narrowed namespace to 'core'; our custom module namespace is valid at runtime
  return game.settings.get(MODULE_ID, 'apiKey') as string;
}

export function getConfig(): ModuleConfig {
  if (!game.settings) {
    throw new Error('game.settings is not available');
  }
  // @ts-expect-error v13 types narrowed namespace to 'core'; our custom module namespace is valid at runtime
  const config = game.settings.get(MODULE_ID, CONFIG_KEY);
  return config as ModuleConfig;
}

export async function setConfig(config: ModuleConfig): Promise<void> {
  if (!game.settings) {
    throw new Error('game.settings is not available');
  }
  // @ts-expect-error v13 types narrowed namespace to 'core'; our custom module namespace is valid at runtime
  await game.settings.set(MODULE_ID, CONFIG_KEY, config);
}
