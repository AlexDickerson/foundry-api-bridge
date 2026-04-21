import type { WebSocketClient } from '@/transport';

// Intercepts pf2e's ChoiceSet dialog (PickAThingPrompt) and forwards
// the choice request to the character-creator frontend via the
// bridge. The frontend renders its own modal, posts the selection
// back, and the server relays the answer here — we write it onto
// the pf2e Application instance and close it, which fires
// `_onClose` → resolves pf2e's internal promise with our value and
// lets ChoiceSetRuleElement.preCreate continue.
//
// When the intercept is not wired (bridge disconnected, no actor
// being created, response times out), the native Foundry dialog
// stays on screen and the user can answer it there.

interface PickAThingChoice {
  value: string | number | boolean | Record<string, unknown>;
  label: string;
  img?: string;
  group?: string;
}

interface PickAThingPromptApp {
  choices: PickAThingChoice[];
  prompt: string;
  item?: { name?: string; img?: string; uuid?: string } | null;
  options?: { window?: { title?: string } };
  allowNoSelection?: boolean;
  selection: PickAThingChoice | null;
  close(): Promise<unknown>;
}

interface PromptRequestPayload {
  // Compact description the frontend needs to render the modal —
  // we keep the payload plain-JSON to cross the WebSocket.
  title: string;
  prompt: string;
  item: { name: string | null; img: string | null; uuid: string | null };
  allowNoSelection: boolean;
  choices: Array<{
    // `value` can be anything pf2e accepts; the frontend just
    // echoes it back untouched on resolve.
    value: PickAThingChoice['value'];
    label: string;
    img: string | null;
    group: string | null;
  }>;
}

interface PromptResponse {
  // null means the user asked to skip (only valid when
  // allowNoSelection). Anything else should be one of the
  // `value`s from the request.
  value: PickAThingChoice['value'] | null;
}

const HOOK_NAME = 'renderPickAThingPrompt';

export function installPromptInterception(wsClient: WebSocketClient): void {
  // @ts-expect-error — Foundry's Hooks global is untyped in this module
  Hooks.on(HOOK_NAME, (app: PickAThingPromptApp) => {
    void handlePrompt(app, wsClient);
  });
  console.log('Foundry API Bridge | ChoiceSet prompt interception installed');
}

async function handlePrompt(app: PickAThingPromptApp, wsClient: WebSocketClient): Promise<void> {
  if (!wsClient.isConnected()) {
    // No frontend listening — fall back to the native dialog.
    return;
  }

  const payload: PromptRequestPayload = {
    title: app.options?.window?.title ?? 'Choose',
    prompt: app.prompt,
    item: {
      name: app.item?.name ?? null,
      img: app.item?.img ?? null,
      uuid: app.item?.uuid ?? null,
    },
    allowNoSelection: app.allowNoSelection === true,
    choices: app.choices.map((c) => ({
      value: c.value,
      label: c.label,
      img: c.img ?? null,
      group: c.group ?? null,
    })),
  };

  try {
    const raw = await wsClient.sendEvent('prompt-request', payload);
    const response = raw as PromptResponse | null;
    if (!response || response.value === null) {
      // User skipped — let pf2e's close-without-selection path run.
      await app.close();
      return;
    }
    const pickedValue = response.value;
    const match = app.choices.find((c) => sameChoiceValue(c.value, pickedValue));
    if (!match) {
      console.warn('Foundry API Bridge | Prompt response did not match any choice', response, payload);
      await app.close();
      return;
    }
    app.selection = match;
    await app.close();
  } catch (err) {
    console.warn('Foundry API Bridge | Prompt intercept failed, falling back to native dialog', err);
    // Leave the dialog alone so the user can pick manually.
  }
}

function sameChoiceValue(a: PickAThingChoice['value'], b: PickAThingChoice['value']): boolean {
  if (a === b) return true;
  // Deep-equal shallow object-valued choices (pf2e's `Record`-shaped
  // selection payloads). Primitive mismatches fall through to false.
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
