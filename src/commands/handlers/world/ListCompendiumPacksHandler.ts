import type { CompendiumPackInfo, ListCompendiumPacksParams, ListCompendiumPacksResult } from '@/commands/types';
import type { FoundryPackMetadata } from './worldTypes';

interface FoundryPack {
  collection: string;
  metadata: FoundryPackMetadata;
}

interface FoundryPacksCollection {
  forEach(fn: (pack: FoundryPack) => void): void;
}

interface FoundryGame {
  packs: FoundryPacksCollection | undefined;
}

function getGame(): FoundryGame {
  return (globalThis as unknown as { game: FoundryGame }).game;
}

// Lists every compendium pack Foundry currently exposes, optionally
// scoped to a document type (Item / Actor / JournalEntry / ...).
// Powers the pack-filter dropdown in the creator picker.
// eslint-disable-next-line @typescript-eslint/require-await
export async function listCompendiumPacksHandler(
  params: ListCompendiumPacksParams,
): Promise<ListCompendiumPacksResult> {
  const game = getGame();
  if (!game.packs) return { packs: [] };

  const packs: CompendiumPackInfo[] = [];
  game.packs.forEach((pack) => {
    if (params.documentType !== undefined && pack.metadata.type !== params.documentType) return;
    const info: CompendiumPackInfo = {
      id: pack.collection,
      label: pack.metadata.label,
      type: pack.metadata.type,
    };
    if (pack.metadata.system !== undefined) info.system = pack.metadata.system;
    info.packageName = pack.metadata.packageName;
    packs.push(info);
  });

  // Alphabetical by label makes the dropdown readable — pf2e ships ~40
  // packs, so keeping them in a stable order matters.
  packs.sort((a, b) => a.label.localeCompare(b.label));
  return { packs };
}
