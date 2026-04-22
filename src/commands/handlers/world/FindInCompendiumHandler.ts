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
  publication?: { title?: unknown };
  // Heritages (and a few other child-of-ancestry items) carry a
  // parent-ancestry reference here. Versatile heritages set this to
  // null; most other item types omit it entirely.
  ancestry?: { slug?: unknown } | null;
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
  const tokens = joinedQuery ? joinedQuery.split(/\s+/).filter((t) => t.length > 0) : [];
  const hasNameFilter = tokens.length > 0;

  // Cap is sized so the mcp-side compendium cache can pull whole
  // packs in one round-trip (pf2e.equipment-srd is the largest at
  // ~5.6k items). The iteration below walks the pack index either
  // way, so the cap only bounds response size, not server work.
  const limit = Math.max(1, Math.min(params.limit ?? 10, 10_000));

  const requiredTraits = (params.traits ?? []).map((t) => t.toLowerCase()).filter((t) => t.length > 0);
  const hasTraitFilter = requiredTraits.length > 0;
  const anyTraits = (params.anyTraits ?? []).map((t) => t.toLowerCase()).filter((t) => t.length > 0);
  const hasAnyTraitFilter = anyTraits.length > 0;
  const hasLevelFilter = typeof params.maxLevel === 'number';
  const allowedSources = (params.sources ?? []).map((s) => s.toLowerCase()).filter((s) => s.length > 0);
  const hasSourceFilter = allowedSources.length > 0;
  const ancestrySlug = params.ancestrySlug?.toLowerCase();
  const hasAncestryFilter = typeof ancestrySlug === 'string' && ancestrySlug.length > 0;

  // Guard rail: with no name and no other narrowing filter, returning
  // every item in every pack is almost never what the caller wants
  // and makes the network trip hurt. Force them to narrow.
  const hasPackFilter = params.packId !== undefined;
  const hasTypeFilter = params.documentType !== undefined;
  if (
    !hasNameFilter &&
    !hasTraitFilter &&
    !hasAnyTraitFilter &&
    !hasLevelFilter &&
    !hasPackFilter &&
    !hasTypeFilter &&
    !hasSourceFilter
  ) {
    return { matches: [] };
  }

  // Always include traits (so the name query can hit trait tags),
  // levels (free — level filter + display), publication titles
  // (source filter + display-ready), and the heritage ancestry link
  // (used both for the `ancestrySlug` filter and for surfacing the
  // `isVersatile` flag on heritage results so the picker can group).
  const indexFields = ['system.traits.value', 'system.level.value', 'system.publication.title', 'system.ancestry.slug'];

  // Collect all candidate packs first so we can await getIndex for each in
  // sequence — packs have internal caching so the cost is bounded by the
  // number of packs that haven't been indexed yet this session.
  const candidatePacks: FoundryIndexablePack[] = [];
  const requestedPackIds: string[] =
    params.packId === undefined ? [] : Array.isArray(params.packId) ? params.packId : [params.packId];
  if (requestedPackIds.length > 0) {
    for (const id of requestedPackIds) {
      const pack = game.packs.get(id);
      if (!pack) {
        throw new Error(`Compendium pack not found: ${id}`);
      }
      if (params.documentType !== undefined && pack.metadata.type !== params.documentType) {
        // A single pack being of the wrong type is a no-op contribution;
        // the rest may still be searched.
        continue;
      }
      candidatePacks.push(pack);
    }
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
    const index = await pack.getIndex({ fields: indexFields });
    index.forEach((entry) => {
      const entryName = entry.name ?? '';
      const lower = entryName.toLowerCase();
      const entryTraits = extractTraits(entry);
      const loweredTraits = entryTraits.map((t) => t.toLowerCase());

      // Name query matches if every token appears in the name OR in any
      // trait tag. Ranking below demotes matches that only hit through
      // traits so a name-containing result always wins.
      let allTokensInName = true;
      if (hasNameFilter) {
        for (const tok of tokens) {
          const inName = lower.includes(tok);
          const inTraits = loweredTraits.some((t) => t.includes(tok));
          if (!inName && !inTraits) return;
          if (!inName) allTokensInName = false;
        }
      }

      // AND-required trait filter from the caller (separate from the
      // tokenised tag-match above).
      if (hasTraitFilter) {
        if (!requiredTraits.every((req) => loweredTraits.includes(req))) return;
      }
      // OR-filter: at least one candidate trait must be in anyTraits.
      // Composes with the AND check above when both filters are set.
      if (hasAnyTraitFilter) {
        if (!loweredTraits.some((t) => anyTraits.includes(t))) return;
      }

      const entryLevel = extractLevel(entry);
      if (hasLevelFilter && entryLevel !== undefined && entryLevel > (params.maxLevel ?? Infinity)) {
        return;
      }

      const entrySource = extractSource(entry);
      if (hasSourceFilter) {
        if (entrySource === undefined) return;
        if (!allowedSources.includes(entrySource.toLowerCase())) return;
      }

      if (hasAncestryFilter) {
        const entryAncestrySlug = extractAncestrySlug(entry);
        // Three cases:
        //   - entry has no ancestry field at all (not a heritage-like
        //     item) → pass through
        //   - entry has ancestry === null (versatile heritage) → pass
        //   - entry has an ancestry slug → must match
        if (entryAncestrySlug !== undefined && entryAncestrySlug !== null && entryAncestrySlug !== ancestrySlug) {
          return;
        }
      }

      const match: ScoredMatch = {
        packId: pack.collection,
        packLabel: pack.metadata.label,
        documentId: entry._id,
        uuid: entry.uuid ?? `Compendium.${pack.collection}.${pack.metadata.type}.${entry._id}`,
        name: entryName,
        type: entry.type ?? pack.metadata.type,
        img: entry.img ?? '',
        // Rank tiers, lower is better:
        //   0-3: every token landed in the name (score() breakdown)
        //   4:   at least one token only matched via a trait tag
        //   0:   browse mode (no text query) — final sort is alpha.
        rank: hasNameFilter ? (allTokensInName ? score(lower, joinedQuery) : 4) : 0,
      };
      // Surface the extra index-loaded fields on the match. The
      // handler always loads traits / level / publication /
      // ancestry.slug now, so no conditional on field presence.
      if (entryLevel !== undefined) match.level = entryLevel;
      if (entryTraits.length > 0) match.traits = entryTraits;
      // `system.ancestry === null` is the pf2e signal for a versatile
      // heritage. Emit the flag only in that case so it doesn't
      // appear on every item.
      if (extractAncestrySlug(entry) === null) {
        match.isVersatile = true;
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

function extractSource(entry: FoundryIndexEntry): string | undefined {
  const raw = entry.system?.publication?.title;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

// Return the entry's ancestry slug (lowercased), `null` for versatile
// heritages (where pf2e explicitly sets `system.ancestry = null`), or
// `undefined` when the field isn't present at all. The tri-state
// mirrors how the caller treats each case — "no field" means the
// filter doesn't apply to this item.
function extractAncestrySlug(entry: FoundryIndexEntry): string | null | undefined {
  const anc = entry.system?.ancestry;
  if (anc === undefined) return undefined;
  if (anc === null) return null;
  const slug = anc.slug;
  return typeof slug === 'string' && slug.length > 0 ? slug.toLowerCase() : null;
}
