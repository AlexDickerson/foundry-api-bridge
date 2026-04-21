import type { FindInCompendiumParams, FindInCompendiumResult, CompendiumMatch } from '@/commands/types';
import type { FoundryPackMetadata } from './worldTypes';

// Foundry exposes each compendium pack with an index Collection of lean
// entries. We load that via getIndex() rather than getDocuments() — the
// index is typically cached after first access and avoids hydrating full
// system data we don't need for name matching.
//
// When the caller filters by trait or level, we request those fields
// explicitly via getIndex({fields: [...]}) so the index Collection
// carries `system.traits.value` and `system.level.value` without
// forcing the full document load.

interface FoundrySystemSlice {
  traits?: { value?: unknown };
  level?: { value?: unknown };
}

interface FoundryIndexEntry {
  _id: string;
  name?: string;
  type?: string;
  img?: string;
  uuid?: string;
  system?: FoundrySystemSlice;
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

function score(entryName: string, joinedQuery: string): number {
  if (entryName === joinedQuery) return 0; // exact whole-name match
  if (entryName.startsWith(joinedQuery)) return 1; // phrase prefix
  if (entryName.includes(joinedQuery)) return 2; // phrase contains (contiguous)
  return 3; // tokenized — all tokens present but not contiguous
}

export async function findInCompendiumHandler(params: FindInCompendiumParams): Promise<FindInCompendiumResult> {
  const game = getGame();
  if (!game.packs) return { matches: [] };

  // Tokenize on whitespace so word order doesn't matter: "adult blue dragon"
  // and "blue dragon adult" both match "Blue Dragon (Adult)". A single-word
  // query degenerates to a plain substring check. Ranking still privileges
  // contiguous phrase matches over scattered-token matches (see score()).
  const joinedQuery = params.name.trim().toLowerCase();
  if (!joinedQuery) return { matches: [] };
  const tokens = joinedQuery.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return { matches: [] };

  const limit = Math.max(1, Math.min(params.limit ?? 10, 100));

  const requiredTraits = (params.traits ?? []).map((t) => t.toLowerCase()).filter((t) => t.length > 0);
  const hasTraitFilter = requiredTraits.length > 0;
  const hasLevelFilter = typeof params.maxLevel === 'number';
  // Ask Foundry for the extra index columns only when a filter or the
  // caller needs them. Plain name-only queries stay on the lean index.
  const indexFields = hasTraitFilter || hasLevelFilter ? ['system.traits.value', 'system.level.value'] : undefined;

  // Collect all candidate packs first so we can await getIndex for each in
  // sequence — packs have internal caching so the cost is bounded by the
  // number of packs that haven't been indexed yet this session.
  const candidatePacks: FoundryIndexablePack[] = [];
  if (params.packId !== undefined) {
    const pack = game.packs.get(params.packId);
    if (!pack) {
      throw new Error(`Compendium pack not found: ${params.packId}`);
    }
    if (params.documentType !== undefined && pack.metadata.type !== params.documentType) {
      return { matches: [] };
    }
    candidatePacks.push(pack);
  } else {
    game.packs.forEach((pack) => {
      if (params.documentType !== undefined && pack.metadata.type !== params.documentType) return;
      candidatePacks.push(pack);
    });
  }

  interface ScoredMatch extends CompendiumMatch {
    rank: number;
  }

  const scored: ScoredMatch[] = [];

  for (const pack of candidatePacks) {
    const index = await (indexFields ? pack.getIndex({ fields: indexFields }) : pack.getIndex());
    index.forEach((entry) => {
      const entryName = entry.name ?? '';
      const lower = entryName.toLowerCase();
      // Every token must appear somewhere in the name for this entry to
      // qualify. Ranking (below) then distinguishes "entire phrase present
      // contiguously" from "tokens present but scattered".
      if (!tokens.every((t) => lower.includes(t))) return;

      const entryTraits = extractTraits(entry);
      if (hasTraitFilter) {
        const lowered = entryTraits.map((t) => t.toLowerCase());
        if (!requiredTraits.every((req) => lowered.includes(req))) return;
      }

      const entryLevel = extractLevel(entry);
      if (hasLevelFilter && entryLevel !== undefined && entryLevel > (params.maxLevel ?? Infinity)) {
        return;
      }

      const match: ScoredMatch = {
        packId: pack.collection,
        packLabel: pack.metadata.label,
        documentId: entry._id,
        uuid: entry.uuid ?? `Compendium.${pack.collection}.${pack.metadata.type}.${entry._id}`,
        name: entryName,
        type: entry.type ?? pack.metadata.type,
        img: entry.img ?? '',
        rank: score(lower, joinedQuery),
      };
      // Only surface the extra fields when we asked Foundry for them,
      // so name-only queries keep getting the lean response.
      if (indexFields) {
        if (entryLevel !== undefined) match.level = entryLevel;
        if (entryTraits.length > 0) match.traits = entryTraits;
      }
      scored.push(match);
    });
  }

  // Exact → prefix → contains, then alphabetical within tier.
  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.name.localeCompare(b.name);
  });

  const matches: CompendiumMatch[] = scored.slice(0, limit).map(({ rank: _rank, ...match }) => match);
  return { matches };
}

function extractTraits(entry: FoundryIndexEntry): string[] {
  const raw = entry.system?.traits?.value;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

function extractLevel(entry: FoundryIndexEntry): number | undefined {
  const raw = entry.system?.level?.value;
  return typeof raw === 'number' ? raw : undefined;
}
