export { rollDiceHandler } from '@/commands/handlers/RollDiceHandler';
export { sendChatMessageHandler } from '@/commands/handlers/SendChatMessageHandler';
export { runScriptHandler } from '@/commands/handlers/RunScriptHandler';

// Actor handlers
export {
  rollSkillHandler,
  SKILL_KEYS,
  type SkillKey,
  rollSaveHandler,
  rollAbilityHandler,
  rollAttackHandler,
  rollDamageHandler,
  createActorHandler,
  createActorFromCompendiumHandler,
  updateActorHandler,
  deleteActorHandler,
  getActorsHandler,
  getActorHandler,
  getPreparedActorHandler,
  getStatisticTraceHandler,
} from '@/commands/handlers/actor';

// Journal handlers
export {
  createJournalHandler,
  updateJournalHandler,
  deleteJournalHandler,
  createJournalPageHandler,
  updateJournalPageHandler,
  deleteJournalPageHandler,
  getJournalsHandler,
  getJournalHandler,
} from '@/commands/handlers/journal';

// Combat handlers
export {
  createCombatHandler,
  addCombatantHandler,
  removeCombatantHandler,
  startCombatHandler,
  endCombatHandler,
  deleteCombatHandler,
  nextTurnHandler,
  previousTurnHandler,
  getCombatStateHandler,
  setTurnHandler,
  rollInitiativeHandler,
  setInitiativeHandler,
  rollAllInitiativeHandler,
  updateCombatantHandler,
  setCombatantDefeatedHandler,
  toggleCombatantVisibilityHandler,
  getCombatTurnContextHandler,
} from '@/commands/handlers/combat';

// Token handlers
export {
  createTokenHandler,
  deleteTokenHandler,
  moveTokenHandler,
  moveTokenPathHandler,
  updateTokenHandler,
  getSceneTokensHandler,
  setPatrolHandler,
  stopPatrolHandler,
  getPatrolsHandler,
} from '@/commands/handlers/token';

// Item handlers
export {
  getActorItemsHandler,
  useItemHandler,
  activateItemHandler,
  addItemToActorHandler,
  addItemFromCompendiumHandler,
  updateActorItemHandler,
  deleteActorItemHandler,
  getItemsHandler,
  getItemHandler,
} from '@/commands/handlers/item';

// Scene handlers
export {
  getSceneHandler,
  getScenesListHandler,
  activateSceneHandler,
  captureSceneHandler,
  createSceneHandler,
  createSceneFromUvttHandler,
  createWallsHandler,
  deleteWallHandler,
  normalizeSceneHandler,
  analyzeSceneHandler,
  getSceneBackgroundHandler,
  updateSceneHandler,
} from '@/commands/handlers/scene';

// World handlers
export {
  getWorldInfoHandler,
  getCompendiumsHandler,
  getCompendiumHandler,
  findInCompendiumHandler,
  listCompendiumPacksHandler,
  listCompendiumSourcesHandler,
  getCompendiumDocumentHandler,
  dumpCompendiumPackHandler,
  findOrCreateFolderHandler,
} from '@/commands/handlers/world';

// Table handlers
export {
  listRollTablesHandler,
  getRollTableHandler,
  rollOnTableHandler,
  resetTableHandler,
  createRollTableHandler,
  updateRollTableHandler,
  deleteRollTableHandler,
} from '@/commands/handlers/table';

// Effect handlers
export {
  getActorEffectsHandler,
  toggleActorStatusHandler,
  addActorEffectHandler,
  removeActorEffectHandler,
  updateActorEffectHandler,
} from '@/commands/handlers/effect';

// Asset proxy handler
export { fetchAssetHandler, createFetchAssetHandler } from '@/commands/handlers/asset';
