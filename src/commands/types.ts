import type { JournalData, ItemData, CompendiumMetadata, CompendiumData } from '@/types/foundry';

export interface Command<T = unknown> {
  id: string;
  type: CommandType;
  params: T;
}

export interface CommandResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

export type CommandType =
  | 'roll-dice'
  | 'roll-ability'
  | 'roll-skill'
  | 'roll-save'
  | 'roll-attack'
  | 'roll-damage'
  | 'get-world-info'
  | 'get-actors'
  | 'get-actor'
  | 'get-prepared-actor'
  | 'get-statistic-trace'
  | 'run-script'
  | 'create-actor'
  | 'create-actor-from-compendium'
  | 'update-actor'
  | 'delete-actor'
  | 'send-chat-message'
  | 'create-journal'
  | 'update-journal'
  | 'delete-journal'
  | 'create-journal-page'
  | 'update-journal-page'
  | 'delete-journal-page'
  | 'create-combat'
  | 'add-combatant'
  | 'remove-combatant'
  | 'start-combat'
  | 'end-combat'
  | 'delete-combat'
  | 'next-turn'
  | 'previous-turn'
  | 'get-combat-state'
  | 'set-turn'
  | 'roll-initiative'
  | 'set-initiative'
  | 'roll-all-initiative'
  | 'update-combatant'
  | 'set-combatant-defeated'
  | 'toggle-combatant-visibility'
  | 'create-token'
  | 'delete-token'
  | 'move-token'
  | 'update-token'
  | 'get-scene-tokens'
  | 'move-token-path'
  | 'set-patrol'
  | 'stop-patrol'
  | 'get-patrols'
  | 'get-actor-items'
  | 'use-item'
  | 'add-item-to-actor'
  | 'add-item-from-compendium'
  | 'update-actor-item'
  | 'delete-actor-item'
  | 'get-actor-effects'
  | 'toggle-actor-status'
  | 'add-actor-effect'
  | 'remove-actor-effect'
  | 'update-actor-effect'
  | 'get-scene'
  | 'get-scenes-list'
  | 'activate-scene'
  | 'create-scene'
  | 'create-scene-from-uvtt'
  | 'create-walls'
  | 'delete-wall'
  | 'normalize-scene'
  | 'analyze-scene'
  | 'activate-item'
  | 'get-journals'
  | 'get-journal'
  | 'get-items'
  | 'get-item'
  | 'get-compendiums'
  | 'get-compendium'
  | 'find-in-compendium'
  | 'list-compendium-packs'
  | 'list-compendium-sources'
  | 'get-compendium-document'
  | 'dump-compendium-pack'
  | 'find-or-create-folder'
  | 'list-roll-tables'
  | 'get-roll-table'
  | 'roll-on-table'
  | 'reset-table'
  | 'create-roll-table'
  | 'update-roll-table'
  | 'delete-roll-table'
  | 'capture-scene'
  | 'get-scene-background'
  | 'update-scene'
  | 'get-combat-turn-context'
  | 'fetch-asset';

export interface RollDiceParams {
  formula: string;
  showInChat?: boolean;
  flavor?: string;
}

export interface RollAbilityParams {
  actorId: string;
  ability: AbilityKey;
  showInChat?: boolean;
}

export interface RollSkillParams {
  actorId: string;
  skill: string;
  showInChat?: boolean;
}

export interface RollSaveParams {
  actorId: string;
  ability: AbilityKey;
  showInChat?: boolean;
}

export interface RollAttackParams {
  actorId: string;
  itemId: string;
  advantage?: boolean;
  disadvantage?: boolean;
  showInChat?: boolean;
}

export interface RollDamageParams {
  actorId: string;
  itemId: string;
  critical?: boolean;
  showInChat?: boolean;
}

export interface GetActorParams {
  actorId: string;
}

// Actor Commands
export interface CreateActorParams {
  name: string;
  type: string;
  folder?: string;
  img?: string;
  system?: Record<string, unknown>;
}

export interface CreateActorFromCompendiumParams {
  packId: string;
  actorId: string;
  name?: string;
  folder?: string;
}

export interface UpdateActorParams {
  actorId: string;
  name?: string;
  img?: string;
  folder?: string;
  system?: Record<string, unknown>;
}

export interface DeleteActorParams {
  actorId: string;
}

// Actor Results
export interface ActorResult {
  id: string;
  uuid: string;
  name: string;
  type: string;
  img: string;
  folder: string | null;
}

export interface SendChatMessageParams {
  content: string;
  speaker?: string;
  actorId?: string;
  flavor?: string;
  whisperTo?: string[];
  type?: 'ic' | 'ooc' | 'emote';
}

export interface SendChatMessageResult {
  messageId: string;
  sent: boolean;
}

// Journal Commands
export type JournalPageType = 'text' | 'image' | 'video';

export interface CreateJournalParams {
  name: string;
  folder?: string;
  content?: string;
  pageType?: JournalPageType;
}

export interface UpdateJournalParams {
  journalId: string;
  name?: string;
  folder?: string;
}

export interface DeleteJournalParams {
  journalId: string;
}

export interface CreateJournalPageParams {
  journalId: string;
  name: string;
  type?: JournalPageType;
  content?: string;
}

export interface UpdateJournalPageParams {
  journalId: string;
  pageId: string;
  name?: string;
  content?: string;
}

export interface DeleteJournalPageParams {
  journalId: string;
  pageId: string;
}

// Combat Commands
export interface CreateCombatParams {
  sceneId?: string;
  activate?: boolean;
}

export interface AddCombatantParams {
  combatId?: string;
  actorId: string;
  tokenId?: string;
  initiative?: number;
  hidden?: boolean;
}

export interface RemoveCombatantParams {
  combatId?: string;
  combatantId: string;
}

export interface CombatIdParams {
  combatId?: string;
}

export interface SetTurnParams {
  combatantId: string;
  combatId?: string;
}

export interface RollInitiativeParams {
  combatId?: string;
  combatantIds: string[];
  formula?: string;
}

export interface SetInitiativeParams {
  combatId?: string;
  combatantId: string;
  initiative: number;
}

export interface RollAllInitiativeParams {
  combatId?: string;
  formula?: string;
  npcsOnly?: boolean;
}

export interface UpdateCombatantParams {
  combatId?: string;
  combatantId: string;
  initiative?: number;
  defeated?: boolean;
  hidden?: boolean;
}

export interface SetCombatantDefeatedParams {
  combatId?: string;
  combatantId: string;
  defeated: boolean;
}

export interface ToggleCombatantVisibilityParams {
  combatId?: string;
  combatantId: string;
}

// Token Commands
export interface CreateTokenParams {
  sceneId?: string;
  actorId: string;
  x: number;
  y: number;
  hidden?: boolean;
  elevation?: number;
  rotation?: number;
  scale?: number;
}

export interface DeleteTokenParams {
  sceneId?: string;
  tokenId: string;
}

export interface MoveTokenParams {
  sceneId?: string;
  tokenId: string;
  x: number;
  y: number;
  elevation?: number;
  rotation?: number;
  animate?: boolean;
}

export interface UpdateTokenParams {
  sceneId?: string;
  tokenId: string;
  hidden?: boolean;
  elevation?: number;
  rotation?: number;
  scale?: number;
  name?: string;
  displayName?: number;
  disposition?: number;
  lockRotation?: boolean;
}

export interface GetSceneTokensParams {
  sceneId?: string;
}

// Shared waypoint for paths and patrols
export interface TokenWaypoint {
  x: number;
  y: number;
}

export interface MoveTokenPathParams {
  sceneId?: string;
  tokenId: string;
  waypoints: TokenWaypoint[];
  coordType?: 'pixel' | 'grid';
  delayMs?: number;
  animate?: boolean;
}

export interface MoveTokenPathResult {
  id: string;
  steps: number;
}

export interface SetPatrolParams {
  sceneId?: string;
  tokenId: string;
  waypoints: TokenWaypoint[];
  coordType?: 'pixel' | 'grid';
  delayMs?: number;
  intervalMs?: number;
  loop?: boolean;
  animate?: boolean;
}

export interface SetPatrolResult {
  patrolId: string;
  tokenId: string;
  waypoints: number;
}

export interface StopPatrolParams {
  tokenId: string;
}

export interface StopPatrolResult {
  stopped: boolean;
}

export interface GetPatrolsParams {
  sceneId?: string;
}

export interface PatrolInfo {
  patrolId: string;
  tokenId: string;
  tokenName: string;
  waypoints: TokenWaypoint[];
  currentStep: number;
  loop: boolean;
  delayMs: number;
  intervalMs: number;
}

export interface GetPatrolsResult {
  patrols: PatrolInfo[];
}

export interface InitiativeResult {
  combatantId: string;
  name: string;
  initiative: number;
}

export interface InitiativeRollResult {
  results: InitiativeResult[];
}

export interface RollResult {
  total: number;
  formula: string;
  dice: DiceResult[];
  isCritical?: boolean;
  isFumble?: boolean;
}

export interface DiceResult {
  type: string;
  count: number;
  results: number[];
}

export interface ActorSummary {
  id: string;
  name: string;
  type: string;
  img: string;
}

export interface ActorDetailResult {
  id: string;
  name: string;
  type: string;
  img: string;
  system: Record<string, unknown>;
  items: ItemSummary[];
}

export interface PreparedActorResult {
  id: string;
  uuid: string;
  name: string;
  type: string;
  img: string;
  system: Record<string, unknown>;
  items: ItemSummary[];
}

export interface GetStatisticTraceParams {
  actorId: string;
  slug: string;
}

export type StatisticTraceResult = Record<string, unknown>;

export interface RunScriptParams {
  script: string;
}

export type RunScriptResult = unknown;

export interface ItemSummary {
  id: string;
  name: string;
  type: string;
  img: string;
  system: Record<string, unknown>;
}

// Journal Results
export interface JournalPageResult {
  id: string;
  name: string;
  type: string;
}

export interface JournalResult {
  id: string;
  name: string;
  folder: string | null;
  pages: JournalPageResult[];
}

export interface DeleteResult {
  deleted: boolean;
}

export interface MutationResult {
  id: string;
}

// Combat Results
export interface CombatantResult {
  id: string;
  actorId: string;
  tokenId: string | null;
  name: string;
  img: string;
  initiative: number | null;
  defeated: boolean;
  hidden: boolean;
}

export interface CombatResult {
  id: string;
  round: number;
  turn: number;
  started: boolean;
  combatants: CombatantResult[];
  current: CombatantResult | null;
}

// Token Results
export interface TokenHpData {
  value: number;
  max: number;
}

export interface TokenResult {
  id: string;
  name: string;
  actorId: string | null;
  x: number;
  y: number;
  elevation: number;
  rotation: number;
  hidden: boolean;
  disposition: number;
  hp?: TokenHpData;
  ac?: number;
  conditions: string[];
}

export interface SceneTokensResult {
  sceneId: string;
  sceneName: string;
  tokens: TokenResult[];
}

// Item Commands
export interface GetActorItemsParams {
  actorId: string;
  type?: string;
  equipped?: boolean;
  hasActivities?: boolean;
}

export interface UseItemParams {
  actorId: string;
  itemId: string;
  activityId?: string;
  activityType?: string;
  consume?: boolean;
  scaling?: number;
  showInChat?: boolean;
}

// Item Results
export interface ItemDetailSummary {
  id: string;
  name: string;
  type: string;
  img: string;
  equipped: boolean;
  quantity: number;
  hasActivities: boolean;
  activityTypes: string[];
  description: string;
  damage: Record<string, unknown> | null;
  range: Record<string, unknown> | null;
}

export interface ActorItemsResult {
  actorId: string;
  actorName: string;
  items: ItemDetailSummary[];
}

export interface ActivityInfo {
  id: string;
  name: string;
  type: string;
}

export interface UseItemResult {
  itemId: string;
  itemName: string;
  itemType: string;
  activityUsed?: ActivityInfo;
  rolls: RollResult[];
  chatMessageId?: string;
}

// Item CRUD Commands
export interface ItemSystemData {
  description?: { value: string };
  quantity?: number;
  weight?: { value: number; units?: string };
  price?: { value: number; denomination?: string };
  rarity?: string;
  identified?: boolean;
  equipped?: boolean;
  attunement?: number;
}

export interface AddItemToActorParams {
  actorId: string;
  name: string;
  type: string;
  img?: string;
  system?: ItemSystemData;
}

export interface AddItemFromCompendiumParams {
  actorId: string;
  packId: string;
  itemId: string;
  name?: string;
  quantity?: number;
  /** Shallow-merged into the copied item's `system` before creation.
   *  Used by the character-creator to tag feats with the slot
   *  location pf2e expects (`system.location = 'class-1'`, etc.)
   *  so the sheet and Progression tab can match them to slots. */
  systemOverrides?: Record<string, unknown>;
}

export interface UpdateActorItemParams {
  actorId: string;
  itemId: string;
  name?: string;
  img?: string;
  system?: Partial<ItemSystemData>;
}

export interface DeleteActorItemParams {
  actorId: string;
  itemId: string;
}

export interface ItemResult {
  id: string;
  name: string;
  type: string;
  img: string;
  actorId: string;
  actorName: string;
}

// Effect Commands
export interface GetActorEffectsParams {
  actorId: string;
  includeDisabled?: boolean;
}

export interface EffectChangeData {
  key: string;
  value: string;
  mode: number;
}

export interface EffectDurationData {
  seconds?: number;
  rounds?: number;
  turns?: number;
}

export interface EffectSummary {
  id: string;
  name: string;
  img: string;
  disabled: boolean;
  isTemporary: boolean;
  statuses: string[];
  origin: string | null;
  changes?: EffectChangeData[];
  duration?: EffectDurationData;
}

export interface ActorEffectsResult {
  actorId: string;
  actorName: string;
  effects: EffectSummary[];
  activeStatuses: string[];
}

export interface ToggleActorStatusParams {
  actorId: string;
  statusId: string;
  active?: boolean;
  overlay?: boolean;
}

export interface ToggleStatusResult {
  actorId: string;
  statusId: string;
  active: boolean;
  effectId?: string;
}

export interface AddActorEffectParams {
  actorId: string;
  name: string;
  img?: string;
  disabled?: boolean;
  statuses?: string[];
  changes?: EffectChangeData[];
  duration?: EffectDurationData;
  origin?: string;
}

export interface AddEffectResult {
  actorId: string;
  effectId: string;
  name: string;
}

export interface RemoveActorEffectParams {
  actorId: string;
  effectId: string;
}

export interface RemoveEffectResult {
  actorId: string;
  effectId: string;
  removed: boolean;
}

export interface UpdateActorEffectParams {
  actorId: string;
  effectId: string;
  name?: string;
  img?: string;
  disabled?: boolean;
  changes?: EffectChangeData[];
  duration?: EffectDurationData;
}

export interface UpdateEffectResult {
  actorId: string;
  effectId: string;
  name: string;
}

// Activate Item Command (full automation pipeline)
export interface ActivateItemParams {
  actorId: string;
  itemId: string;
  activityId?: string;
  activityType?: string;
  targetTokenIds?: string[];
  templatePosition?: { x: number; y: number; direction?: number };
  spellLevel?: number;
}

export interface MidiWorkflowResult {
  attackTotal: number | undefined;
  damageTotal: number | undefined;
  isCritical: boolean;
  isFumble: boolean;
  hitTargetIds: string[];
  saveTargetIds: string[];
  failedSaveTargetIds: string[];
}

export interface ActivateItemResult {
  itemId: string;
  itemName: string;
  itemType: string;
  activityUsed?: ActivityInfo;
  activated: boolean;
  targetsSet: number;
  rolls: RollResult[];
  chatMessageId?: string;
  workflow?: MidiWorkflowResult;
}

// Scene Commands
export interface GetSceneParams {
  sceneId?: string;
  includeScreenshot?: boolean;
  include?: string[];
  center?: { x: number; y: number };
  radius?: number;
}

export type GetScenesListParams = Record<string, never>;

export interface CreateSceneParams {
  name: string;
  img?: string;
  width?: number;
  height?: number;
  gridSize?: number;
  gridUnits?: string;
  gridDistance?: number;
  folder?: string;
}

export interface WallDefinition {
  c: [number, number, number, number];
  move?: number; // 0=none, 1=normal (default 1)
  sense?: number; // 0=none, 1=normal (default 1)
  door?: number; // 0=none, 1=door, 2=secret (default 0)
}

export interface CreateWallsParams {
  sceneId?: string;
  walls: WallDefinition[];
}

export interface CreateWallsResult {
  created: number;
  wallIds: string[];
}

export interface UvttResolution {
  pixels_per_grid: number;
  map_size: { x: number; y: number };
  map_origin?: { x: number; y: number };
}

export interface UvttPortal {
  position: { x: number; y: number };
  bounds: Array<{ x: number; y: number }>;
  rotation?: number;
  closed?: boolean;
  freestanding?: boolean;
}

export interface UvttData {
  resolution: UvttResolution;
  line_of_sight: Array<Array<{ x: number; y: number }>>;
  portals?: UvttPortal[];
}

export interface CreateSceneFromUvttParams {
  name: string;
  img?: string;
  uvtt: UvttData;
  gridDistance?: number;
  gridUnits?: string;
  activate?: boolean;
}

export interface CreateSceneFromUvttResult {
  id: string;
  name: string;
  img: string;
  width: number;
  height: number;
  active: boolean;
  wallsCreated: number;
  doorsCreated: number;
  gridSize: number;
  gridCols: number;
  gridRows: number;
}

export interface DeleteWallParams {
  sceneId?: string;
  wallId: string;
}

export interface NormalizeSceneParams {
  sceneId?: string;
}

export interface NormalizeSceneResult {
  id: string;
  name: string;
  before: { width: number; height: number; padding: number };
  after: { width: number; height: number; padding: number };
  gridSize: number;
  gridCols: number;
  gridRows: number;
}

export interface AnalyzeSceneParams {
  sceneId?: string;
}

export interface AnalyzeSceneResult {
  id: string;
  name: string;
  gridSize: number;
  cols: number;
  rows: number;
  /** One character per cell, row-major. '#'=wall, '·'=floor, '~'=outside, ' '=empty */
  grid: string;
  legend: string;
}

export interface ActivateSceneParams {
  sceneId: string;
}

// Scene Results
export interface SceneGridResult {
  size: number;
  type: number;
  units: string;
  distance: number;
}

export interface SceneNoteResult {
  x: number;
  y: number;
  text: string;
  label: string;
  entryId: string | null;
}

export interface SceneWallResult {
  c: number[];
  move: number;
  sense: number;
  door: number;
}

export interface SceneLightResult {
  x: number;
  y: number;
  bright: number;
  dim: number;
  color: string | null;
  angle: number;
  walls: boolean;
  hidden: boolean;
}

export interface SceneTileResult {
  x: number;
  y: number;
  width: number;
  height: number;
  img: string;
  hidden: boolean;
  elevation: number;
  rotation: number;
}

export interface SceneDrawingResult {
  x: number;
  y: number;
  shape: { type: string; width: number; height: number; points: number[] };
  text: string;
  hidden: boolean;
  fillColor: string | null;
  strokeColor: string | null;
}

export interface SceneRegionResult {
  id: string;
  name: string;
  color: string | null;
  shapes: { type: string }[];
}

export interface SceneTokenSummary {
  id: string;
  name: string;
  actorId: string | null;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  elevation: number;
  hidden: boolean;
  disposition: number;
  hp?: TokenHpData;
  ac?: number;
  conditions: string[];
}

export interface SceneDetailResult {
  id: string;
  name: string;
  active: boolean;
  img: string;
  width: number;
  height: number;
  grid: SceneGridResult;
  darkness: number;
  notes: SceneNoteResult[];
  walls: SceneWallResult[];
  lights: SceneLightResult[];
  tiles: SceneTileResult[];
  drawings: SceneDrawingResult[];
  regions: SceneRegionResult[];
  tokens: SceneTokenSummary[];
  asciiMap: string;
  screenshot?: SceneScreenshot;
}

export interface SceneScreenshot {
  image: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface SceneSummaryResult {
  id: string;
  name: string;
  active: boolean;
  img: string;
}

export interface SceneListResult {
  scenes: SceneSummaryResult[];
}

export interface CreateSceneResult {
  id: string;
  name: string;
  img: string;
  width: number;
  height: number;
  active: boolean;
}

export interface ActivateSceneResult {
  id: string;
  name: string;
  active: boolean;
}

// World Info (pull query)
export type GetWorldInfoParams = Record<string, never>;

export interface WorldInfoData {
  id: string;
  title: string;
  system: string;
  systemVersion: string;
  foundryVersion: string;
}

export interface WorldCounts {
  journals: number;
  actors: number;
  items: number;
  scenes: number;
}

export interface CompendiumMetaSummary {
  id: string;
  label: string;
  type: string;
  system: string;
  count: number;
}

export interface WorldInfoResult {
  world: WorldInfoData;
  counts: WorldCounts;
  compendiumMeta: CompendiumMetaSummary[];
}

// Pull query params (Batch 2)
export type GetJournalsParams = Record<string, never>;

export interface GetJournalParams {
  journalId: string;
}

export type GetItemsParams = Record<string, never>;

export interface GetItemParams {
  itemId: string;
}

export type GetCompendiumsParams = Record<string, never>;

export interface GetCompendiumParams {
  packId: string;
}

export interface FindInCompendiumParams {
  /** Substring (case-insensitive) to match against document names. Tokenized
   *  on whitespace — all tokens must appear in the name. */
  name: string;
  /** Optional — restrict to one or more packs (e.g. 'pf2e.feats-srd' or
   *  ['pf2e.feats-srd', 'pf2e.classfeatures']). A string and a
   *  single-element array behave identically. When omitted, every pack
   *  (filtered by documentType if provided) is searched. */
  packId?: string | string[];
  /** Optional — restrict to packs of this document type (e.g. 'Actor', 'Item'). */
  documentType?: string;
  /** Optional — require every trait in this list to be present on the
   *  candidate's `system.traits.value`. Used by creator pickers to
   *  scope class feat slots to the character's class trait, ancestry
   *  feat slots to the ancestry trait, etc. */
  traits?: string[];
  /** Optional — OR-filter: a candidate qualifies if any of its
   *  `system.traits.value` entries matches any value in this list
   *  (case-insensitive). Used for ancestry feat pickers where a
   *  versatile heritage (Aiuvarin, Changeling …) exposes a second
   *  pool of feats tagged with the heritage slug alongside the
   *  parent ancestry's feats. `traits` and `anyTraits` compose — a
   *  candidate must satisfy both filters when both are supplied. */
  anyTraits?: string[];
  /** Optional — cap `system.level.value` at this level. Used by feat
   *  pickers to hide feats the character doesn't yet qualify for. */
  maxLevel?: number;
  /** Optional — OR-filter on `system.publication.title`. A candidate
   *  qualifies if its publication title matches any value in the
   *  list (case-insensitive). Used by the source-book filter in the
   *  picker ("Pathfinder Player Core", "GM Core", ...). */
  sources?: string[];
  /** Optional — restrict heritage-style items to those whose
   *  `system.ancestry.slug` matches. Items with `system.ancestry ===
   *  null` (versatile heritages like Aiuvarin) are passed through
   *  regardless so the heritage picker still surfaces them. Items
   *  without any `system.ancestry` field at all are unaffected. */
  ancestrySlug?: string;
  /** Max results to return. Defaults to 10. */
  limit?: number;
}

export interface CompendiumMatch {
  packId: string;
  packLabel: string;
  documentId: string;
  uuid: string;
  name: string;
  type: string;
  img: string;
  /** Present when the filter path required loading index fields
   *  (traits or maxLevel). Omitted on plain name-only queries to keep
   *  the response small. */
  level?: number;
  traits?: string[];
  /** Set to `true` for heritage items with `system.ancestry === null`
   *  (versatile heritages like Aiuvarin, Changeling, Beastkin). Absent
   *  for ancestry-specific heritages and for items outside the
   *  heritage tree. Callers group the picker list by this flag. */
  isVersatile?: boolean;
}

export interface FindInCompendiumResult {
  matches: CompendiumMatch[];
}

export interface ListCompendiumPacksParams {
  /** Optional filter — restrict to packs of this document type
   *  (e.g. 'Item', 'Actor', 'JournalEntry'). */
  documentType?: string;
}

export interface CompendiumPackInfo {
  id: string; // pack.collection (e.g. 'pf2e.feats-srd')
  label: string; // pack.metadata.label (e.g. 'Class Feats')
  type: string; // pack.metadata.type (e.g. 'Item')
  system?: string; // pack.metadata.system
  packageName?: string; // pack.metadata.packageName
}

export interface ListCompendiumPacksResult {
  packs: CompendiumPackInfo[];
}

export interface ListCompendiumSourcesParams {
  /** Optional — restrict the walk to packs of this document type. */
  documentType?: string;
  /** Optional — restrict the walk to these packs (e.g.
   *  ['pf2e.feats-srd']). When omitted, every pack matching
   *  documentType is walked. */
  packId?: string | string[];
  /** Free-text query applied to names and trait tags, same semantics
   *  as find-in-compendium. When present, only matching entries are
   *  counted per source. */
  name?: string;
  /** AND-required traits, same semantics as find-in-compendium. */
  traits?: string[];
  /** Cap on `system.level.value`, same semantics as find-in-compendium. */
  maxLevel?: number;
}

export interface CompendiumSource {
  title: string;
  /** How many entries across the scanned packs were published here.
   *  Lets the UI show a count next to each source. */
  count: number;
}

export interface ListCompendiumSourcesResult {
  sources: CompendiumSource[];
}

export interface GetCompendiumDocumentParams {
  uuid: string; // e.g. 'Compendium.pf2e.feats-srd.Item.abc123'
}

export interface CompendiumDocumentData {
  id: string;
  uuid: string;
  name: string;
  type: string;
  img: string;
  /** Full `system.*` slice as serialized by `document.toObject(false)`.
   *  Shape varies by item type; the picker treats it as raw data and
   *  reads only what its renderer needs. */
  system: Record<string, unknown>;
}

export interface GetCompendiumDocumentResult {
  document: CompendiumDocumentData;
}

export interface DumpCompendiumPackParams {
  packId: string; // e.g. 'pf2e.equipment-srd'
}

export interface DumpCompendiumPackResult {
  packId: string;
  packLabel: string;
  documents: CompendiumDocumentData[];
}

/** Folder document types Foundry supports. The set mirrors
 *  CONST.FOLDER_DOCUMENT_TYPES in recent Foundry versions. */
export type FolderDocumentType =
  | 'Actor'
  | 'Item'
  | 'Scene'
  | 'JournalEntry'
  | 'RollTable'
  | 'Macro'
  | 'Playlist'
  | 'Adventure'
  | 'Card';

export interface FindOrCreateFolderParams {
  /** Folder name to look up or create. Matched case-insensitively against
   *  existing folders of the same document type. */
  name: string;
  /** Document type the folder holds. Required because Foundry scopes
   *  folder names by document type — an "Actor" folder and an "Item" folder
   *  can share a name without conflict. */
  type: FolderDocumentType;
  /** Optional parent folder ID to nest under. Existing folders match by
   *  name + parent, so the same name under different parents counts as
   *  separate folders. */
  parentFolderId?: string;
}

export interface FindOrCreateFolderResult {
  id: string;
  name: string;
  type: string;
  /** true when a new folder was created, false when an existing one was
   *  reused. Lets callers decide whether to emit a "created" or "reused"
   *  status message. */
  created: boolean;
}

// Roll Table types
export type ListRollTablesParams = Record<string, never>;

export interface GetRollTableParams {
  tableId: string;
}

export interface RollOnTableParams {
  tableId: string;
  displayChat?: boolean;
}

export interface ResetTableParams {
  tableId: string;
}

export interface CreateTableResultData {
  text: string;
  range: [number, number];
  weight?: number;
  type?: number;
  documentCollection?: string;
  documentId?: string;
  img?: string;
}

export interface CreateRollTableParams {
  name: string;
  formula?: string;
  replacement?: boolean;
  displayRoll?: boolean;
  description?: string;
  img?: string;
  folder?: string;
  results?: CreateTableResultData[];
}

export interface UpdateRollTableParams {
  tableId: string;
  name?: string;
  formula?: string;
  replacement?: boolean;
  displayRoll?: boolean;
  description?: string;
  img?: string;
}

export interface DeleteRollTableParams {
  tableId: string;
}

export interface TableResultData {
  id: string;
  type: number;
  text: string;
  img: string;
  range: [number, number];
  weight: number;
  drawn: boolean;
  documentCollection: string | null;
  documentId: string | null;
}

export interface RollTableSummary {
  id: string;
  name: string;
  img: string;
  description: string;
  formula: string;
  replacement: boolean;
  totalResults: number;
  drawnResults: number;
}

export interface RollTableResult {
  id: string;
  name: string;
  img: string;
  description: string;
  formula: string;
  replacement: boolean;
  displayRoll: boolean;
  results: TableResultData[];
}

export interface RollOnTableResult {
  tableId: string;
  tableName: string;
  roll: {
    formula: string;
    total: number;
  };
  results: TableResultData[];
}

export interface ResetTableResult {
  tableId: string;
  tableName: string;
  resetCount: number;
}

// Capture Scene types
export type CaptureSceneParams = Record<string, never>;

export interface CaptureSceneResult {
  sceneId: string;
  sceneName: string;
  image: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface UpdateSceneParams {
  sceneId?: string;
  background?: string;
  name?: string;
  darkness?: number;
  gridSize?: number;
  gridUnits?: string;
  gridDistance?: number;
}

export interface UpdateSceneResult {
  id: string;
}

export interface GetSceneBackgroundParams {
  sceneId?: string;
  maxDimension?: number;
}

export interface GetSceneBackgroundResult {
  sceneId: string;
  sceneName: string;
  image: string;
  mimeType: string;
  width: number;
  height: number;
}

// Combat Turn Context types
export interface GetCombatTurnContextParams {
  combatId?: string;
}

export interface TurnCombatantInfo {
  id: string;
  actorId: string;
  tokenId: string;
  name: string;
  gridX: number;
  gridY: number;
  hp?: TokenHpData;
  ac?: number;
  conditions: string[];
}

export interface NearbyTokenInfo {
  tokenId: string;
  actorId: string | null;
  name: string;
  gridX: number;
  gridY: number;
  distanceFt: number;
  disposition: string;
  hp?: TokenHpData;
  ac?: number;
  conditions: string[];
  lineOfSight: boolean;
}

export interface CombatTurnContext {
  round: number;
  turn: number;
  currentCombatant: TurnCombatantInfo;
  nearbyTokens: NearbyTokenInfo[];
  asciiMap: string;
}

// Asset Proxy (cloud SPA -> Foundry local files via WS)
//
// The character-creator SPA is served from the MCP cloud server but
// references Foundry assets by relative path (`systems/pf2e/icons/...`,
// etc.). Those paths don't exist on the cloud server, so the SPA asks
// the MCP server to fetch them; the MCP server hands the request to
// the bridge, which fetches from its local Foundry (same-origin) and
// returns the bytes base64-encoded.
export interface FetchAssetParams {
  /** Absolute URL path on Foundry - leading `/`, no host, no query. */
  path: string;
}

export interface FetchAssetSuccess {
  ok: true;
  /** Foundry response's Content-Type, or 'application/octet-stream'. */
  contentType: string;
  /** Base64-encoded file bytes. */
  bytes: string;
}

export interface FetchAssetError {
  ok: false;
  /** HTTP-ish status: 400 invalid path, 404 not found, 502 fetch failed. */
  status: number;
  error: string;
}

export type FetchAssetResult = FetchAssetSuccess | FetchAssetError;

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const ABILITY_KEYS: readonly AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export type CommandHandler<TParams = unknown, TResult = unknown> = (params: TParams) => Promise<TResult>;

export interface CommandParamsMap {
  'roll-dice': RollDiceParams;
  'roll-ability': RollAbilityParams;
  'roll-skill': RollSkillParams;
  'roll-save': RollSaveParams;
  'roll-attack': RollAttackParams;
  'roll-damage': RollDamageParams;
  'get-world-info': GetWorldInfoParams;
  'get-actors': Record<string, never>;
  'get-actor': GetActorParams;
  'get-prepared-actor': GetActorParams;
  'get-statistic-trace': GetStatisticTraceParams;
  'run-script': RunScriptParams;
  'create-actor': CreateActorParams;
  'create-actor-from-compendium': CreateActorFromCompendiumParams;
  'update-actor': UpdateActorParams;
  'delete-actor': DeleteActorParams;
  'send-chat-message': SendChatMessageParams;
  'create-journal': CreateJournalParams;
  'update-journal': UpdateJournalParams;
  'delete-journal': DeleteJournalParams;
  'create-journal-page': CreateJournalPageParams;
  'update-journal-page': UpdateJournalPageParams;
  'delete-journal-page': DeleteJournalPageParams;
  'create-combat': CreateCombatParams;
  'add-combatant': AddCombatantParams;
  'remove-combatant': RemoveCombatantParams;
  'start-combat': CombatIdParams;
  'end-combat': CombatIdParams;
  'delete-combat': CombatIdParams;
  'next-turn': CombatIdParams;
  'previous-turn': CombatIdParams;
  'get-combat-state': CombatIdParams;
  'set-turn': SetTurnParams;
  'roll-initiative': RollInitiativeParams;
  'set-initiative': SetInitiativeParams;
  'roll-all-initiative': RollAllInitiativeParams;
  'update-combatant': UpdateCombatantParams;
  'set-combatant-defeated': SetCombatantDefeatedParams;
  'toggle-combatant-visibility': ToggleCombatantVisibilityParams;
  'create-token': CreateTokenParams;
  'delete-token': DeleteTokenParams;
  'move-token': MoveTokenParams;
  'update-token': UpdateTokenParams;
  'get-scene-tokens': GetSceneTokensParams;
  'move-token-path': MoveTokenPathParams;
  'set-patrol': SetPatrolParams;
  'stop-patrol': StopPatrolParams;
  'get-patrols': GetPatrolsParams;
  'get-actor-items': GetActorItemsParams;
  'use-item': UseItemParams;
  'add-item-to-actor': AddItemToActorParams;
  'add-item-from-compendium': AddItemFromCompendiumParams;
  'update-actor-item': UpdateActorItemParams;
  'delete-actor-item': DeleteActorItemParams;
  'get-actor-effects': GetActorEffectsParams;
  'toggle-actor-status': ToggleActorStatusParams;
  'add-actor-effect': AddActorEffectParams;
  'remove-actor-effect': RemoveActorEffectParams;
  'update-actor-effect': UpdateActorEffectParams;
  'get-scene': GetSceneParams;
  'get-scenes-list': GetScenesListParams;
  'activate-scene': ActivateSceneParams;
  'create-scene': CreateSceneParams;
  'create-scene-from-uvtt': CreateSceneFromUvttParams;
  'create-walls': CreateWallsParams;
  'delete-wall': DeleteWallParams;
  'normalize-scene': NormalizeSceneParams;
  'analyze-scene': AnalyzeSceneParams;
  'activate-item': ActivateItemParams;
  'get-journals': GetJournalsParams;
  'get-journal': GetJournalParams;
  'get-items': GetItemsParams;
  'get-item': GetItemParams;
  'get-compendiums': GetCompendiumsParams;
  'get-compendium': GetCompendiumParams;
  'find-in-compendium': FindInCompendiumParams;
  'list-compendium-packs': ListCompendiumPacksParams;
  'list-compendium-sources': ListCompendiumSourcesParams;
  'get-compendium-document': GetCompendiumDocumentParams;
  'dump-compendium-pack': DumpCompendiumPackParams;
  'find-or-create-folder': FindOrCreateFolderParams;
  'list-roll-tables': ListRollTablesParams;
  'get-roll-table': GetRollTableParams;
  'roll-on-table': RollOnTableParams;
  'reset-table': ResetTableParams;
  'create-roll-table': CreateRollTableParams;
  'update-roll-table': UpdateRollTableParams;
  'delete-roll-table': DeleteRollTableParams;
  'capture-scene': CaptureSceneParams;
  'get-scene-background': GetSceneBackgroundParams;
  'update-scene': UpdateSceneParams;
  'get-combat-turn-context': GetCombatTurnContextParams;
  'fetch-asset': FetchAssetParams;
}

export interface CommandResultMap {
  'roll-dice': RollResult;
  'roll-ability': RollResult;
  'roll-skill': RollResult;
  'roll-save': RollResult;
  'roll-attack': RollResult;
  'roll-damage': RollResult;
  'get-world-info': WorldInfoResult;
  'get-actors': ActorSummary[];
  'get-actor': ActorDetailResult;
  'get-prepared-actor': PreparedActorResult;
  'get-statistic-trace': StatisticTraceResult;
  'run-script': RunScriptResult;
  'create-actor': ActorResult;
  'create-actor-from-compendium': ActorResult;
  'update-actor': ActorResult;
  'delete-actor': DeleteResult;
  'send-chat-message': SendChatMessageResult;
  'create-journal': JournalResult;
  'update-journal': JournalResult;
  'delete-journal': DeleteResult;
  'create-journal-page': JournalPageResult;
  'update-journal-page': JournalPageResult;
  'delete-journal-page': DeleteResult;
  'create-combat': CombatResult;
  'add-combatant': CombatantResult;
  'remove-combatant': DeleteResult;
  'start-combat': CombatResult;
  'end-combat': DeleteResult;
  'delete-combat': DeleteResult;
  'next-turn': CombatResult;
  'previous-turn': CombatResult;
  'get-combat-state': CombatResult;
  'set-turn': CombatResult;
  'roll-initiative': InitiativeRollResult;
  'set-initiative': CombatantResult;
  'roll-all-initiative': InitiativeRollResult;
  'update-combatant': CombatantResult;
  'set-combatant-defeated': CombatantResult;
  'toggle-combatant-visibility': CombatantResult;
  'create-token': TokenResult;
  'delete-token': DeleteResult;
  'move-token': MutationResult;
  'update-token': MutationResult;
  'get-scene-tokens': SceneTokensResult;
  'move-token-path': MoveTokenPathResult;
  'set-patrol': SetPatrolResult;
  'stop-patrol': StopPatrolResult;
  'get-patrols': GetPatrolsResult;
  'get-actor-items': ActorItemsResult;
  'use-item': UseItemResult;
  'add-item-to-actor': ItemResult;
  'add-item-from-compendium': ItemResult;
  'update-actor-item': ItemResult;
  'delete-actor-item': DeleteResult;
  'get-actor-effects': ActorEffectsResult;
  'toggle-actor-status': ToggleStatusResult;
  'add-actor-effect': AddEffectResult;
  'remove-actor-effect': RemoveEffectResult;
  'update-actor-effect': UpdateEffectResult;
  'get-scene': SceneDetailResult;
  'get-scenes-list': SceneListResult;
  'activate-scene': ActivateSceneResult;
  'create-scene': CreateSceneResult;
  'create-scene-from-uvtt': CreateSceneFromUvttResult;
  'create-walls': CreateWallsResult;
  'delete-wall': DeleteResult;
  'normalize-scene': NormalizeSceneResult;
  'analyze-scene': AnalyzeSceneResult;
  'activate-item': ActivateItemResult;
  'get-journals': JournalData[];
  'get-journal': JournalData;
  'get-items': ItemData[];
  'get-item': ItemData;
  'get-compendiums': CompendiumMetadata[];
  'get-compendium': CompendiumData;
  'find-in-compendium': FindInCompendiumResult;
  'list-compendium-packs': ListCompendiumPacksResult;
  'list-compendium-sources': ListCompendiumSourcesResult;
  'get-compendium-document': GetCompendiumDocumentResult;
  'dump-compendium-pack': DumpCompendiumPackResult;
  'find-or-create-folder': FindOrCreateFolderResult;
  'list-roll-tables': RollTableSummary[];
  'get-roll-table': RollTableResult;
  'roll-on-table': RollOnTableResult;
  'reset-table': ResetTableResult;
  'create-roll-table': RollTableResult;
  'update-roll-table': RollTableResult;
  'delete-roll-table': DeleteResult;
  'capture-scene': CaptureSceneResult;
  'get-scene-background': GetSceneBackgroundResult;
  'update-scene': UpdateSceneResult;
  'get-combat-turn-context': CombatTurnContext;
  'fetch-asset': FetchAssetResult;
}
