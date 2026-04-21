import type { GetActorParams, PreparedActorResult, ItemSummary } from '@/commands/types';

interface ToObjectable {
  toObject(source: boolean): { system: Record<string, unknown> };
}

interface ActorItem extends ToObjectable {
  id: string;
  name: string;
  type: string;
  img: string | undefined;
}

interface ActorItemsCollection {
  forEach(fn: (item: ActorItem) => void): void;
}

interface FoundryActor extends ToObjectable {
  id: string;
  uuid: string;
  name: string;
  type: string;
  img: string | undefined;
  items: ActorItemsCollection;
}

interface ActorsCollection {
  get(id: string): FoundryActor | undefined;
}

interface FoundryGame {
  actors: ActorsCollection;
}

function getGame(): FoundryGame {
  return (globalThis as unknown as { game: FoundryGame }).game;
}

// Returns the actor post-prepareData, with derived state merged into `system`
// (final AC value, save modifiers, skill totals, etc.). `toObject(false)` is
// the Foundry API that returns a snapshot including prepared/derived data,
// as opposed to the default `toObject()` which returns only `_source`.
export function getPreparedActorHandler(params: GetActorParams): Promise<PreparedActorResult> {
  const actor = getGame().actors.get(params.actorId);

  if (!actor) {
    return Promise.reject(new Error(`Actor not found: ${params.actorId}`));
  }

  const items: ItemSummary[] = [];
  actor.items.forEach((item) => {
    items.push({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img ?? '',
      system: item.toObject(false).system,
    });
  });

  return Promise.resolve({
    id: actor.id,
    uuid: actor.uuid,
    name: actor.name,
    type: actor.type,
    img: actor.img ?? '',
    system: actor.toObject(false).system,
    items,
  });
}
