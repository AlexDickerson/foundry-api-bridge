import { findInCompendiumHandler } from '../FindInCompendiumHandler';

interface MockIndexEntry {
  _id: string;
  name: string;
  type?: string;
  img?: string;
  uuid?: string;
  system?: { traits?: { value?: string[] }; level?: { value?: number } };
}

interface MockPackMetadata {
  label: string;
  type: string;
  system: string | undefined;
  packageName: string;
}

interface MockPack {
  collection: string;
  metadata: MockPackMetadata;
  getIndex: jest.Mock;
}

function mockIndex(entries: MockIndexEntry[]): { forEach: (fn: (e: MockIndexEntry) => void) => void } {
  return {
    forEach: (fn) => entries.forEach(fn),
  };
}

function createPack(collection: string, entries: MockIndexEntry[], metadata?: Partial<MockPackMetadata>): MockPack {
  return {
    collection,
    metadata: {
      label: collection,
      type: 'Actor',
      system: 'pf2e',
      packageName: 'pf2e',
      ...metadata,
    },
    getIndex: jest.fn().mockResolvedValue(mockIndex(entries)),
  };
}

function setGame(packs: MockPack[] | undefined): void {
  const packsCollection =
    packs !== undefined
      ? {
          get: jest.fn((id: string) => packs.find((p) => p.collection === id)),
          forEach: jest.fn((fn: (pack: MockPack) => void) => {
            packs.forEach(fn);
          }),
        }
      : undefined;
  (globalThis as Record<string, unknown>)['game'] = { packs: packsCollection };
}

function clearGame(): void {
  delete (globalThis as Record<string, unknown>)['game'];
}

describe('findInCompendiumHandler', () => {
  afterEach(clearGame);

  it('returns substring matches across all packs', async () => {
    const p1 = createPack('pf2e.pathfinder-bestiary', [
      {
        _id: 'a1',
        name: 'Goblin Warrior',
        type: 'npc',
        img: 'g.webp',
        uuid: 'Compendium.pf2e.pathfinder-bestiary.Actor.a1',
      },
      {
        _id: 'a2',
        name: 'Orc Brute',
        type: 'npc',
        img: 'o.webp',
        uuid: 'Compendium.pf2e.pathfinder-bestiary.Actor.a2',
      },
    ]);
    const p2 = createPack('pf2e.pathfinder-bestiary-2', [
      {
        _id: 'b1',
        name: 'Goblin Pyro',
        type: 'npc',
        img: 'gp.webp',
        uuid: 'Compendium.pf2e.pathfinder-bestiary-2.Actor.b1',
      },
    ]);
    setGame([p1, p2]);

    const result = await findInCompendiumHandler({ name: 'goblin' });

    expect(result.matches).toHaveLength(2);
    expect(result.matches.map((m) => m.name)).toEqual(['Goblin Pyro', 'Goblin Warrior']);
    expect(result.matches[0]?.packId).toBe('pf2e.pathfinder-bestiary-2');
    expect(result.matches[0]?.uuid).toBe('Compendium.pf2e.pathfinder-bestiary-2.Actor.b1');
  });

  it('matches case-insensitively', async () => {
    const p1 = createPack('pack', [{ _id: '1', name: 'Adult Blue Dragon', type: 'npc' }]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'BLUE DRAGON' });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.name).toBe('Adult Blue Dragon');
  });

  it('ranks exact matches before prefix matches before substring matches', async () => {
    const p1 = createPack('pack', [
      { _id: '1', name: 'Ancient Red Dragon', type: 'npc' },
      { _id: '2', name: 'Dragon', type: 'npc' },
      { _id: '3', name: 'Dragonborn', type: 'npc' },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'dragon' });

    expect(result.matches.map((m) => m.name)).toEqual(['Dragon', 'Dragonborn', 'Ancient Red Dragon']);
  });

  it('respects the packId filter', async () => {
    const p1 = createPack('pack.a', [{ _id: '1', name: 'Goblin', type: 'npc' }]);
    const p2 = createPack('pack.b', [{ _id: '2', name: 'Goblin', type: 'npc' }]);
    setGame([p1, p2]);

    const result = await findInCompendiumHandler({ name: 'goblin', packId: 'pack.b' });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.packId).toBe('pack.b');
  });

  it('throws when an explicit packId is not found', async () => {
    setGame([]);

    await expect(findInCompendiumHandler({ name: 'anything', packId: 'missing.pack' })).rejects.toThrow(
      'Compendium pack not found: missing.pack',
    );
  });

  it('filters by documentType', async () => {
    const actors = createPack('actors.pack', [{ _id: '1', name: 'Potion Peddler', type: 'npc' }]);
    const items = createPack('items.pack', [{ _id: '2', name: 'Potion of Healing', type: 'consumable' }], {
      type: 'Item',
    });
    setGame([actors, items]);

    const result = await findInCompendiumHandler({ name: 'potion', documentType: 'Item' });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.name).toBe('Potion of Healing');
    expect(result.matches[0]?.packId).toBe('items.pack');
  });

  it('honors the limit parameter', async () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({ _id: `id${i}`, name: `Goblin ${i}`, type: 'npc' }));
    const p1 = createPack('pack', entries);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'goblin', limit: 5 });

    expect(result.matches).toHaveLength(5);
  });

  it('defaults limit to 10', async () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({ _id: `id${i}`, name: `Goblin ${i}`, type: 'npc' }));
    const p1 = createPack('pack', entries);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'goblin' });

    expect(result.matches).toHaveLength(10);
  });

  it('returns empty matches for a blank query', async () => {
    const p1 = createPack('pack', [{ _id: '1', name: 'Anything', type: 'npc' }]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: '   ' });

    expect(result.matches).toEqual([]);
  });

  it('returns empty matches when packs collection is undefined', async () => {
    setGame(undefined);

    const result = await findInCompendiumHandler({ name: 'goblin' });

    expect(result.matches).toEqual([]);
  });

  it('synthesizes a uuid when the index entry lacks one', async () => {
    const p1 = createPack('pf2e.bestiary', [{ _id: 'xyz', name: 'Goblin', type: 'npc' }]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'goblin' });

    expect(result.matches[0]?.uuid).toBe('Compendium.pf2e.bestiary.Actor.xyz');
  });

  it('falls back to pack.metadata.type when the entry has no type', async () => {
    const p1 = createPack('pack', [{ _id: '1', name: 'Goblin' }]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'goblin' });

    expect(result.matches[0]?.type).toBe('Actor');
  });

  // --- Tokenized / word-order-independent matching -------------------------

  it('matches word-order-independent multi-word queries', async () => {
    const p1 = createPack('pack', [
      { _id: '1', name: 'Blue Dragon (Adult)', type: 'npc' },
      { _id: '2', name: 'Ancient Blue Wyrm', type: 'npc' },
      { _id: '3', name: 'Red Dragon (Adult)', type: 'npc' },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'adult blue dragon' });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.name).toBe('Blue Dragon (Adult)');
  });

  it('requires ALL tokens to be present — partial matches are filtered', async () => {
    const p1 = createPack('pack', [
      { _id: '1', name: 'Blue Dragon', type: 'npc' }, // has only "blue" and "dragon"
      { _id: '2', name: 'Blue Dragon (Adult)', type: 'npc' }, // has all three
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'adult blue dragon' });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.name).toBe('Blue Dragon (Adult)');
  });

  it('ranks contiguous phrase matches above tokens-scattered matches', async () => {
    const p1 = createPack('pack', [
      // Tokens present but scattered (rank 3).
      { _id: '1', name: 'Ancient Red Dragon Blue Eyes', type: 'npc' },
      // Phrase contiguous but not a prefix (rank 2).
      { _id: '2', name: 'Legendary Blue Dragon', type: 'npc' },
      // Phrase is a prefix (rank 1).
      { _id: '3', name: 'Blue Dragon Hatchling', type: 'npc' },
      // Exact whole-name match (rank 0).
      { _id: '4', name: 'Blue Dragon', type: 'npc' },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'blue dragon' });

    expect(result.matches.map((m) => m.name)).toEqual([
      'Blue Dragon',
      'Blue Dragon Hatchling',
      'Legendary Blue Dragon',
      'Ancient Red Dragon Blue Eyes',
    ]);
  });

  it('collapses runs of whitespace in the query', async () => {
    const p1 = createPack('pack', [{ _id: '1', name: 'Blue Dragon (Adult)', type: 'npc' }]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: '  adult   blue\tdragon  ' });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.name).toBe('Blue Dragon (Adult)');
  });

  // --- Trait + level filters ----------------------------------------------

  it('filters by a required trait', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      { _id: '1', name: 'Sudden Charge', type: 'feat', system: { traits: { value: ['barbarian', 'fighter'] } } },
      { _id: '2', name: 'Power Attack', type: 'feat', system: { traits: { value: ['fighter'] } } },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: '', traits: ['barbarian'] });
    // name=''; but only 'sudden' gives hits under our tokenizer — so query instead with a wildcard.
    // Swap: pass a letter common to both names.
    const result2 = await findInCompendiumHandler({ name: 'a', traits: ['barbarian'] });

    // Empty-name still short-circuits before filtering.
    expect(result.matches).toEqual([]);
    expect(result2.matches.map((m) => m.name)).toEqual(['Sudden Charge']);
  });

  it('requires every trait in the filter to be present', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      { _id: '1', name: 'Rage', type: 'feat', system: { traits: { value: ['barbarian', 'instinct'] } } },
      { _id: '2', name: 'Ranged', type: 'feat', system: { traits: { value: ['fighter'] } } },
      { _id: '3', name: 'Raging Intimidation', type: 'feat', system: { traits: { value: ['barbarian'] } } },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'ra', traits: ['barbarian', 'instinct'] });

    expect(result.matches.map((m) => m.name)).toEqual(['Rage']);
  });

  it('filters by maxLevel', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      { _id: '1', name: 'Sudden Charge', type: 'feat', system: { level: { value: 1 } } },
      { _id: '2', name: 'Sudden Leap', type: 'feat', system: { level: { value: 8 } } },
      { _id: '3', name: 'Sudden Blow', type: 'feat', system: { level: { value: 4 } } },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'sudden', maxLevel: 4 });

    expect(result.matches.map((m) => m.name).sort()).toEqual(['Sudden Blow', 'Sudden Charge']);
  });

  it('combines trait + maxLevel filters', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      {
        _id: '1',
        name: 'Raging Intimidation',
        type: 'feat',
        system: { traits: { value: ['barbarian'] }, level: { value: 1 } },
      },
      { _id: '2', name: 'Rage', type: 'feat', system: { traits: { value: ['barbarian'] }, level: { value: 1 } } },
      {
        _id: '3',
        name: 'Brutal Bully',
        type: 'feat',
        system: { traits: { value: ['barbarian'] }, level: { value: 2 } },
      },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'a', traits: ['barbarian'], maxLevel: 1 });

    expect(result.matches.map((m) => m.name).sort()).toEqual(['Rage', 'Raging Intimidation']);
  });

  it('surfaces level + traits on matches when filters were applied', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      {
        _id: '1',
        name: 'Sudden Charge',
        type: 'feat',
        system: { traits: { value: ['barbarian', 'fighter'] }, level: { value: 1 } },
      },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'sudden', traits: ['barbarian'] });

    expect(result.matches[0]?.level).toBe(1);
    expect(result.matches[0]?.traits).toEqual(['barbarian', 'fighter']);
  });

  it('omits level + traits on plain name-only queries', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      {
        _id: '1',
        name: 'Sudden Charge',
        type: 'feat',
        system: { traits: { value: ['barbarian'] }, level: { value: 1 } },
      },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'sudden' });

    expect(result.matches[0]?.level).toBeUndefined();
    expect(result.matches[0]?.traits).toBeUndefined();
  });

  it('requests extra index fields from Foundry when filtering', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      { _id: '1', name: 'Sudden Charge', type: 'feat', system: { traits: { value: ['barbarian'] } } },
    ]);
    setGame([p1]);

    await findInCompendiumHandler({ name: 'sudden', traits: ['barbarian'] });

    const call = p1.getIndex.mock.calls[0]?.[0] as { fields?: string[] } | undefined;
    expect(call?.fields).toEqual(['system.traits.value', 'system.level.value']);
  });

  it('does not request extra index fields for name-only queries', async () => {
    const p1 = createPack('pf2e.feats-srd', [{ _id: '1', name: 'Sudden Charge', type: 'feat' }]);
    setGame([p1]);

    await findInCompendiumHandler({ name: 'sudden' });

    expect(p1.getIndex.mock.calls[0]?.[0]).toBeUndefined();
  });

  it('ignores entries missing a level when maxLevel filter is active', async () => {
    const p1 = createPack('pf2e.feats-srd', [
      { _id: '1', name: 'Sudden Charge', type: 'feat', system: { level: { value: 1 } } },
      { _id: '2', name: 'Sudden Leap', type: 'feat' /* no level */ },
    ]);
    setGame([p1]);

    const result = await findInCompendiumHandler({ name: 'sudden', maxLevel: 5 });

    // Missing-level entries pass the filter (we can't prove they fail it).
    expect(result.matches.map((m) => m.name).sort()).toEqual(['Sudden Charge', 'Sudden Leap']);
  });
});
