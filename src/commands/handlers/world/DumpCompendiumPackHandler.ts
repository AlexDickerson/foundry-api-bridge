import type {
  CompendiumDocumentData,
  DumpCompendiumPackParams,
  DumpCompendiumPackResult,
} from '@/commands/types';
import type { FoundryPackMetadata } from './worldTypes';

// Foundry's CompendiumCollection exposes getDocuments() which walks
// the pack in one async batch. That's dramatically faster than N
// separate fromUuid() calls because it hits the pack's internal
// hydration pipeline once and avoids the per-uuid WS round-trip.

interface FoundryDocument {
  id: string;
  uuid: string;
  name: string;
  type: string;
  img: string | null;
  toObject(source?: boolean): { system: Record<string, unknown> };
}

interface FoundryBulkPack {
  collection: string;
  metadata: FoundryPackMetadata;
  getDocuments(): Promise<FoundryDocument[]>;
}

interface FoundryPacksCollection {
  get(id: string): FoundryBulkPack | undefined;
}

interface FoundryGame {
  packs: FoundryPacksCollection | undefined;
}

function getGame(): FoundryGame {
  return (globalThis as unknown as { game: FoundryGame }).game;
}

// Return every document in a pack as its serialized source form. Used
// by the mcp-side compendium cache at warm-up time — lets the server
// prime a full pack in one round-trip instead of N.
export async function dumpCompendiumPackHandler(
  params: DumpCompendiumPackParams,
): Promise<DumpCompendiumPackResult> {
  const { packs } = getGame();
  if (!packs) {
    throw new Error('Foundry game.packs is not available');
  }
  const pack = packs.get(params.packId);
  if (!pack) {
    throw new Error(`Compendium pack not found: ${params.packId}`);
  }

  const docs = await pack.getDocuments();
  const documents: CompendiumDocumentData[] = docs.map((doc) => ({
    id: doc.id,
    uuid: doc.uuid,
    name: doc.name,
    type: doc.type,
    img: doc.img ?? '',
    system: doc.toObject(false).system,
  }));

  return {
    packId: pack.collection,
    packLabel: pack.metadata.label,
    documents,
  };
}
