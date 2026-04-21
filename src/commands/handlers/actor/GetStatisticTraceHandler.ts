import type { GetStatisticTraceParams, StatisticTraceResult } from '@/commands/types';

interface Statistic {
  getTraceData(): StatisticTraceResult;
}

interface StatisticActor {
  armorClass?: Statistic;
  perception?: Statistic;
  classDC?: Statistic | null;
  saves?: Record<string, Statistic | undefined>;
  skills?: Record<string, Statistic | undefined>;
}

interface ActorsCollection {
  get(id: string): StatisticActor | undefined;
}

interface FoundryGame {
  actors: ActorsCollection;
}

function getGame(): FoundryGame {
  return (globalThis as unknown as { game: FoundryGame }).game;
}

// PF2e exposes Statistic instances on the actor at these canonical paths:
//   actor.armorClass, actor.perception, actor.classDC
//   actor.saves.{fortitude,reflex,will}
//   actor.skills.{acrobatics,arcana,...}  (all 16 PF2e skills)
// We accept a flat slug and resolve it — unknown systems will simply not
// have these properties and will get a clear "Statistic not found" error.
function resolveStatistic(actor: StatisticActor, slug: string): Statistic | null {
  const key = slug.toLowerCase();
  const compact = key.replace(/[-_\s]/g, '');

  if (compact === 'ac' || compact === 'armorclass') return actor.armorClass ?? null;
  if (compact === 'perception') return actor.perception ?? null;
  if (compact === 'class' || compact === 'classdc') return actor.classDC ?? null;

  const save = actor.saves?.[key];
  if (save) return save;

  const skill = actor.skills?.[key];
  if (skill) return skill;

  return null;
}

export function getStatisticTraceHandler(params: GetStatisticTraceParams): Promise<StatisticTraceResult> {
  const actor = getGame().actors.get(params.actorId);

  if (!actor) {
    return Promise.reject(new Error(`Actor not found: ${params.actorId}`));
  }

  const statistic = resolveStatistic(actor, params.slug);

  if (!statistic) {
    return Promise.reject(
      new Error(
        `Statistic not found: "${params.slug}". Expected one of: ac, perception, fortitude, reflex, will, class, or a PF2e skill slug (acrobatics, arcana, ...).`,
      ),
    );
  }

  return Promise.resolve(statistic.getTraceData());
}
