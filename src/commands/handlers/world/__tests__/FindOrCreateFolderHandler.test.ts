import { findOrCreateFolderHandler } from '../FindOrCreateFolderHandler';

interface MockFolder {
  id: string;
  name: string;
  type: string;
  folder: { id: string } | null;
}

function setGame(folders: MockFolder[] | undefined, createImpl?: jest.Mock): void {
  const foldersCollection =
    folders !== undefined
      ? {
          filter: jest.fn((predicate: (f: MockFolder) => boolean) => folders.filter(predicate)),
          documentClass: {
            create: createImpl ?? jest.fn(),
          },
        }
      : undefined;
  (globalThis as Record<string, unknown>)['game'] = { folders: foldersCollection };
}

function clearGame(): void {
  delete (globalThis as Record<string, unknown>)['game'];
}

describe('findOrCreateFolderHandler', () => {
  afterEach(clearGame);

  it('creates a new folder when none matches', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'folder-1',
      name: 'Goblin Ambush',
      type: 'Actor',
      folder: null,
    });
    setGame([], create);

    const result = await findOrCreateFolderHandler({ name: 'Goblin Ambush', type: 'Actor' });

    expect(create).toHaveBeenCalledWith({ name: 'Goblin Ambush', type: 'Actor' });
    expect(result).toEqual({
      id: 'folder-1',
      name: 'Goblin Ambush',
      type: 'Actor',
      created: true,
    });
  });

  it('reuses an existing folder that matches name + type (case-insensitive)', async () => {
    const create = jest.fn();
    setGame([{ id: 'existing', name: 'Goblin Ambush', type: 'Actor', folder: null }], create);

    const result = await findOrCreateFolderHandler({ name: 'GOBLIN AMBUSH', type: 'Actor' });

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'existing',
      name: 'Goblin Ambush',
      type: 'Actor',
      created: false,
    });
  });

  it('treats folders of a different type with the same name as distinct', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'new-actor-folder',
      name: 'Dungeon',
      type: 'Actor',
      folder: null,
    });
    setGame(
      [
        // Same name, different type — should NOT match.
        { id: 'item-folder', name: 'Dungeon', type: 'Item', folder: null },
      ],
      create,
    );

    const result = await findOrCreateFolderHandler({ name: 'Dungeon', type: 'Actor' });

    expect(create).toHaveBeenCalled();
    expect(result.created).toBe(true);
  });

  it('scopes by parentFolderId — same name under different parents counts as distinct', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'new-child',
      name: 'Minions',
      type: 'Actor',
      folder: { id: 'parent-b' },
    });
    setGame(
      [
        // Same name, same type, but under a different parent.
        { id: 'old-child', name: 'Minions', type: 'Actor', folder: { id: 'parent-a' } },
      ],
      create,
    );

    const result = await findOrCreateFolderHandler({
      name: 'Minions',
      type: 'Actor',
      parentFolderId: 'parent-b',
    });

    expect(create).toHaveBeenCalledWith({ name: 'Minions', type: 'Actor', folder: 'parent-b' });
    expect(result.created).toBe(true);
  });

  it('reuses a folder when name + type + parent all match', async () => {
    const create = jest.fn();
    setGame([{ id: 'existing-child', name: 'Minions', type: 'Actor', folder: { id: 'parent-a' } }], create);

    const result = await findOrCreateFolderHandler({
      name: 'Minions',
      type: 'Actor',
      parentFolderId: 'parent-a',
    });

    expect(create).not.toHaveBeenCalled();
    expect(result.id).toBe('existing-child');
    expect(result.created).toBe(false);
  });

  it('rejects empty or whitespace-only names', async () => {
    setGame([], jest.fn());

    await expect(findOrCreateFolderHandler({ name: '   ', type: 'Actor' })).rejects.toThrow(
      'Folder name cannot be empty',
    );
  });

  it('rejects when the folders collection is unavailable', async () => {
    setGame(undefined);

    await expect(findOrCreateFolderHandler({ name: 'X', type: 'Actor' })).rejects.toThrow(
      'Foundry folders collection not available',
    );
  });
});
