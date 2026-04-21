import type { CompendiumSource, ListCompendiumSourcesParams, ListCompendiumSourcesResult } from '@/commands/types';
import type { FoundryPackMetadata } from './worldTypes';

interface FoundryIndexEntry {
  name?: string;
  system?: {
    publication?: { title?: unknown };
    traits?: { value?: unknown };
    level?: { value?: unknown };
  };
}

interface FoundryPackIndex {
  forEach(fn: (entry: FoundryIndexEntry) => void): void;
}

interface FoundryGetIndexOptions {
  fields?: string[];
}

interface FoundryIndexablePack {
  collection: string;
  metadata: FoundryPackMetadata;
  getIndex(options?: FoundryGetIndexOptions): Promise<FoundryPackIndex>;
}

interface FoundryPacksCollection {
  get(id: string): FoundryIndexablePack | undefined;
  forEach(fn: (pack: FoundryIndexablePack) => void): void;
}

interface FoundryGame {
  packs: FoundryPacksCollection | undefined;
}

function getGame(): FoundryGame {
  return (globalThis as unknown as { game: FoundryGame }).game;
}

// Walks the compendium index for every in-scope pack, collecting the
// distinct `system.publication.title` values. Fronts the "source book"
// dropdown in the creator picker.
//
// When name / traits / maxLevel filters are supplied, the count next to
// each source is the number of entries matching THOSE filters from that
// source — so the dropdown shows a live "how many Player Core matches
// are there for this query?" instead of raw totals. Multi-select-
// friendly: the source filter itself is deliberately excluded here (the
// caller shouldn't pass it), so picking "Player Core" in the picker
// doesn't zero out every other source's count.
export async function listCompendiumSourcesHandler(
  params: ListCompendiumSourcesParams,
): Promise<ListCompendiumSourcesResult> {
  const game = getGame();
  if (!game.packs) return { sources: [] };

  const packs: FoundryIndexablePack[] = [];
  const requestedPackIds: string[] =
    params.packId === undefined ? [] : Array.isArray(params.packId) ? params.packId : [params.packId];
  if (requestedPackIds.length > 0) {
    for (const id of requestedPackIds) {
      const pack = game.packs.get(id);
      if (!pack) continue;
      if (params.documentType !== undefined && pack.metadata.type !== params.documentType) continue;
      packs.push(pack);
    }
  } else {
    game.packs.forEach((pack) => {
      if (params.documentType !== undefined && pack.metadata.type !== params.documentType) return;
      packs.push(pack);
    });
  }

  // Normalise filter inputs — same semantics as find-in-compendium's
  // handler, so dropdown counts stay in lockstep with search counts.
  const joinedQuery = (params.name ?? '').trim().toLowerCase();
  const tokens = joinedQuery.split(/\s+/).filter((t) => t.length > 0);
  const hasNameFilter = tokens.length > 0;
  const requiredTraits = (params.traits ?? []).map((t) => t.toLowerCase()).filter((t) => t.length > 0);
  const hasTraitFilter = requiredTraits.length > 0;
  const hasLevelFilter = typeof params.maxLevel === 'number';
  const maxLevel = params.maxLevel ?? Infinity;

  // Include traits + level in the index only when a filter needs them.
  // Publication title is always in scope since that's what we aggregate.
  const fields = ['system.publication.title'];
  if (hasTraitFilter || hasNameFilter) fields.push('system.traits.value');
  if (hasLevelFilter) fields.push('system.level.value');

  const counts = new Map<string, number>();
  for (const pack of packs) {
    const index = await pack.getIndex({ fields });
    index.forEach((entry) => {
      const title = entry.system?.publication?.title;
      if (typeof title !== 'string' || title.length === 0) return;

      const rawTraits = entry.system?.traits?.value;
      const entryTraits = Array.isArray(rawTraits) ? rawTraits.filter((v): v is string => typeof v === 'string') : [];
      const loweredTraits = entryTraits.map((t) => t.toLowerCase());

      // Name query matches against name or any trait tag, same as
      // find-in-compendium. Browse mode (no tokens) passes every entry.
      if (hasNameFilter) {
        const lowerName = (entry.name ?? '').toLowerCase();
        for (const tok of tokens) {
          if (!lowerName.includes(tok) && !loweredTraits.some((t) => t.includes(tok))) return;
        }
      }

      if (hasTraitFilter) {
        if (!requiredTraits.every((req) => loweredTraits.includes(req))) return;
      }

      if (hasLevelFilter) {
        const rawLevel = entry.system?.level?.value;
        const entryLevel = typeof rawLevel === 'number' ? rawLevel : undefined;
        if (entryLevel !== undefined && entryLevel > maxLevel) return;
      }

      counts.set(title, (counts.get(title) ?? 0) + 1);
    });
  }

  const sources: CompendiumSource[] = Array.from(counts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return { sources };
}
