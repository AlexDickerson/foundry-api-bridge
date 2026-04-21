import type {
  CompendiumDocumentData,
  GetCompendiumDocumentParams,
  GetCompendiumDocumentResult,
} from '@/commands/types';

interface FoundryDocument {
  id: string;
  uuid: string;
  name: string;
  type: string;
  img: string | null;
  toObject(source?: boolean): { system: Record<string, unknown> };
}

interface FoundryGlobals {
  fromUuid: (uuid: string) => Promise<FoundryDocument | null | undefined>;
}

function getFoundry(): FoundryGlobals {
  return globalThis as unknown as FoundryGlobals;
}

// Resolves a compendium UUID to its full document payload. Used by the
// picker's detail panel; the normal name-match response from
// find-in-compendium is deliberately lean.
//
// We call `document.toObject(false)` so the caller gets the *source*
// data minus any transient runtime bits pf2e layers on. That's what a
// subsequent "create from compendium" path would reuse anyway.
export async function getCompendiumDocumentHandler(
  params: GetCompendiumDocumentParams,
): Promise<GetCompendiumDocumentResult> {
  const { fromUuid } = getFoundry();
  const doc = await fromUuid(params.uuid);
  if (!doc) {
    throw new Error(`Compendium document not found: ${params.uuid}`);
  }
  const data: CompendiumDocumentData = {
    id: doc.id,
    uuid: doc.uuid,
    name: doc.name,
    type: doc.type,
    img: doc.img ?? '',
    system: doc.toObject(false).system,
  };
  return { document: data };
}
