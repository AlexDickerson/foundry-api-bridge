import type { FindOrCreateFolderParams, FindOrCreateFolderResult, FolderDocumentType } from '@/commands/types';

// Folder lookup + create primitive. Idempotent — callers can invoke this
// repeatedly for the same name/type and only the first call produces a new
// folder. Used by clients that want to organize batches of generated
// documents (e.g. dm-tool pushing a combat encounter's actors into a
// folder named after the encounter).

interface FoundryFolder {
  id: string;
  name: string;
  type: string;
  folder: { id: string } | null;
}

interface FolderDocumentClass {
  create(data: Record<string, unknown>): Promise<FoundryFolder>;
}

interface FoundryFoldersCollection {
  filter(predicate: (folder: FoundryFolder) => boolean): FoundryFolder[];
  documentClass: FolderDocumentClass;
}

interface FoundryGame {
  folders: FoundryFoldersCollection | undefined;
}

function getGame(): FoundryGame {
  return (globalThis as unknown as { game: FoundryGame }).game;
}

export async function findOrCreateFolderHandler(params: FindOrCreateFolderParams): Promise<FindOrCreateFolderResult> {
  const game = getGame();
  if (!game.folders) {
    throw new Error('Foundry folders collection not available');
  }

  const name = params.name.trim();
  if (!name) {
    throw new Error('Folder name cannot be empty');
  }

  const type: FolderDocumentType = params.type;
  const parentId = params.parentFolderId ?? null;

  // Match case-insensitively; scope by type + parent so "Monsters" under
  // two different parent folders stays distinct.
  const lowered = name.toLowerCase();
  const existing = game.folders.filter((f) => {
    if (f.type !== type) return false;
    if ((f.folder?.id ?? null) !== parentId) return false;
    return f.name.toLowerCase() === lowered;
  });

  const found = existing[0];
  if (found !== undefined) {
    return {
      id: found.id,
      name: found.name,
      type: found.type,
      created: false,
    };
  }

  const data: Record<string, unknown> = { name, type };
  if (parentId !== null) data['folder'] = parentId;

  const created = await game.folders.documentClass.create(data);
  return {
    id: created.id,
    name: created.name,
    type: created.type,
    created: true,
  };
}
