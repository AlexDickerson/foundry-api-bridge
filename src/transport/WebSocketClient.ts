import type { Command, CommandResponse } from '@/commands';

export interface WebSocketClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type MessageHandler = (command: Command) => void;
export type ConnectionHandler = () => void;

// Module-initiated events flow opposite the command path: the module
// ships a `BridgeEvent` to the server and waits on the matching
// `BridgeEventResponse`. Currently used by the ChoiceSet prompt
// intercept to hand pf2e's dialog-driven choices over to the
// character-creator frontend.
export interface BridgeEvent {
  bridgeId: string;
  type: string;
  payload: unknown;
}

export interface BridgeEventResponse {
  bridgeId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

const BRIDGE_EVENT_TIMEOUT_MS = 5 * 60 * 1000;

export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

const DEFAULT_RECONNECT_INTERVAL = 5000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const WS_OPEN = 1; // WS_OPEN constant for Node.js compatibility

export class WebSocketClient {
  private socket: WebSocketLike | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandler: MessageHandler | null = null;
  private connectHandler: ConnectionHandler | null = null;
  private disconnectHandler: ConnectionHandler | null = null;
  private isManualClose = false;
  private readonly pendingBridgeEvents = new Map<
    string,
    { resolve: (data: unknown) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  private readonly config: Required<WebSocketClientConfig>;
  private readonly createSocket: WebSocketFactory;

  constructor(config: WebSocketClientConfig, socketFactory?: WebSocketFactory) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
    };
    this.createSocket = socketFactory ?? ((url: string): WebSocketLike => new WebSocket(url));
  }

  connect(): void {
    if (this.socket?.readyState === WS_OPEN) {
      return;
    }

    this.isManualClose = false;
    this.socket = this.createSocket(this.config.url);
    this.setupSocketHandlers();
  }

  disconnect(): void {
    this.isManualClose = true;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
  }

  send(response: CommandResponse): void {
    if (this.socket?.readyState !== WS_OPEN) {
      console.warn('Foundry API Bridge | WebSocket is not connected');
      return;
    }

    this.socket.send(JSON.stringify(response));
  }

  // Ship a module-initiated event and wait on the matching bridge
  // response keyed by bridgeId. Each in-flight request has a
  // generous timeout so long-running frontend prompts don't reject
  // prematurely, but the caller should still await the result with
  // its own UI fallbacks.
  sendEvent(type: string, payload: unknown): Promise<unknown> {
    const socket = this.socket;
    if (socket === null || socket.readyState !== WS_OPEN) {
      return Promise.reject(new Error('WebSocket is not connected'));
    }
    const bridgeId = generateBridgeId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingBridgeEvents.delete(bridgeId);
        reject(new Error(`Bridge event '${type}' timed out after ${(BRIDGE_EVENT_TIMEOUT_MS / 1000).toString()}s`));
      }, BRIDGE_EVENT_TIMEOUT_MS);
      this.pendingBridgeEvents.set(bridgeId, { resolve, reject, timer });
      const event: BridgeEvent = { bridgeId, type, payload };
      socket.send(JSON.stringify(event));
    });
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onConnect(handler: ConnectionHandler): void {
    this.connectHandler = handler;
  }

  onDisconnect(handler: ConnectionHandler): void {
    this.disconnectHandler = handler;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WS_OPEN;
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = (): void => {
      this.reconnectAttempts = 0;
      console.log('Foundry API Bridge | WebSocket connected');
      this.connectHandler?.();
    };

    this.socket.onclose = (): void => {
      console.log('Foundry API Bridge | WebSocket disconnected');
      this.disconnectHandler?.();

      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (event: Event): void => {
      console.error('Foundry API Bridge | WebSocket error:', event);
    };

    this.socket.onmessage = (event: MessageEvent): void => {
      this.handleMessage(event);
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string) as unknown;

      // Responses to module-initiated bridge events carry a bridgeId
      // distinct from the per-command id. Resolve the pending promise
      // and return before falling through to the command path.
      if (this.isBridgeEventResponse(data)) {
        const pending = this.pendingBridgeEvents.get(data.bridgeId);
        if (!pending) {
          console.warn('Foundry API Bridge | Unknown bridgeId in response:', data.bridgeId.slice(0, 8));
          return;
        }
        clearTimeout(pending.timer);
        this.pendingBridgeEvents.delete(data.bridgeId);
        if (data.success) {
          pending.resolve(data.data);
        } else {
          pending.reject(new Error(data.error ?? 'Bridge event failed'));
        }
        return;
      }

      if (!this.isValidCommand(data)) {
        console.error('Foundry API Bridge | Invalid command format:', data);
        return;
      }

      this.messageHandler?.(data);
    } catch (error) {
      console.error('Foundry API Bridge | Failed to parse WebSocket message:', error);
    }
  }

  private isValidCommand(data: unknown): data is Command {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;
    return typeof obj['id'] === 'string' && typeof obj['type'] === 'string' && 'params' in obj;
  }

  private isBridgeEventResponse(data: unknown): data is BridgeEventResponse {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return typeof obj['bridgeId'] === 'string' && typeof obj['success'] === 'boolean';
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn('Foundry API Bridge | Max reconnect attempts reached. Use module settings to reconfigure.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    console.log(
      `Foundry API Bridge | Reconnecting in ${String(delay)}ms (attempt ${String(this.reconnectAttempts)}/${String(this.config.maxReconnectAttempts)})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

function generateBridgeId(): string {
  // Foundry runs in the browser where crypto.randomUUID is always
  // available (https context), so keep this dep-free.
  return crypto.randomUUID();
}
