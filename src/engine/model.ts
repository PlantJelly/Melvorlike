import { ResourceDB, toolTiers, playable, cropYield, passiveSkills, skillNames } from '../content/resources';
import { AnimalDB, barnUpgrades } from '../content/animals';
import { FoodDB } from '../content/foods';
import { ExchangeDB, exchangeRate, guildTiers, milestoneById, type MilestoneId } from '../content/guild';
import {
  accessoryOptionIds,
  accessoryOptions,
  accessorySlots,
  accessoryTiers,
  emptyAccessories,
  enchantmentStoneByResource,
  type AccessoryOptionId,
  type AccessorySlotId,
  type AccessoryState,
} from '../content/accessories';
import type { SkillId } from '../content/types';
import {
  ProjectDB,
  featureIds,
  projectIds,
  starterFeatures,
  starterSkills,
  type FeatureId,
  type ProjectId,
  type ProjectPhase,
} from '../content/projects';
import { experienceToNextLevel, getSpeedMultiplier, MAX_SKILL_LEVEL } from './formulas';
import { CHANCE_SCALE } from '../content/chance';
import { COAL_CHANCE, veinBonusOre, veinChance } from '../content/mining';
import { junkChance } from '../content/fishing';
import { SAPLING_CHANCE, saplingHarvest, saplingOf } from '../content/saplings';

import { farmAutomation, plotUpgrades } from '../content/farm';

import { FertilizerDB, fertilizerIds, type FertilizerId } from '../content/fertilizers';

import { ECONOMY_EXCHANGE_BONUS, GROWTH_SALE_BONUS, LEGENDARY_RARITY, economyThresholds, growthLevels } from '../content/achievements';

import { FACILITY_MAX_LEVEL, FACILITY_SPEED_PER_LEVEL, FacilityDB, facilityCost, facilityIds, facilityRequirement } from '../content/facilities';

export const SAVE_VERSION = 30;

export interface DailyQuest { resourceId: string; amount: number; done: boolean }

export interface ProjectState {
  phase: ProjectPhase;
  clearingProgressMs: number;
  restorationProgressMs: number;
  delivered: Record<string, number>;
}

// fertilizer는 이 칸에 파종할 때 쓴 비료. 수확될 때까지 유지된다.
export interface FarmPlot { cropId: string; progressMs: number; fertilizer?: FertilizerId }

export interface QueuedAction { resourceId: string; target?: number }

export type CurrentAction =
  // target: 남은 목표 수량. 있으면 그만큼 만든 뒤 멈춘다(content_spec §12 "목표 수량에서 자동 정지").
  | {kind: 'production'; resourceId: string; progressMs: number; target?: number}
  | {kind: 'project'; projectId: ProjectId; stage: 'clearing' | 'restoring'; progressMs: number};

export interface Model {
  version: typeof SAVE_VERSION;
  gold: number;
  skills: Record<SkillId, { level: number; exp: number; maxExp: number }>;
  inventory: Record<string, number>;
  tools: Record<SkillId, number>;
  // progressMs는 속도 보정 전 작업량. 속도가 변해도 진행률은 유지한다.
  currentAction: CurrentAction | null;
  // 현재 작업이 목표 달성·재료 소진·프로젝트 단계 완료로 멈추면 이어서 시작할 생산 작업 1개(content_spec §12 "다음 작업 예약").
  queuedAction: QueuedAction | null;
  unlockedSkills: SkillId[];
  unlockedFeatures: FeatureId[];
  projects: Record<ProjectId, ProjectState>;
  meal: { foodId: string; remainingMs: number } | null;
  // 농사는 액티브 작업과 별개로 항상 병행 진행된다. 배열 길이가 보유한 밭 칸 수(1~MAX_FARM_PLOTS).
  farmPlots: (FarmPlot | null)[];
  // 자동 파종/수확 업그레이드 구매 여부.
  farmAuto: boolean;
  // 키 존재 여부가 보유 여부. 값은 다음 산출까지의 진행량(속도 보정 전).
  ranch: Record<string, number>;
  // 2마리 이상 키우는 종만 기록한다(없으면 1마리). 한 종의 동물들은 같은 주기로 함께 산출한다.
  ranchCounts: Record<string, number>;
  // barnUpgrades 중 완료한 단계 수. 동물종당 최대 사육 수 = 1 + barnLevel.
  barnLevel: number;
  // guildTiers 인덱스. 등급이 오를수록 환전 가능한 티어 차이가 늘어난다.
  guild: number;
  // day는 UTC 날짜 id(dayId 참고). 날짜가 바뀌면 advance()가 완료 여부와 무관하게 새로 갱신한다.
  dailyQuests: { day: number; quests: DailyQuest[] };
  // 달성 조건은 기존 영구 상태에서 계산하고 수령 여부만 저장한다. 과거 상태로 추론할 수 없는 환전만 별도 기록한다.
  milestones: { claimed: MilestoneId[]; exchangeUsed: boolean };
  // 슬롯별 장신구는 없거나 정확히 하나만 존재한다. 승급은 동일 객체의 재질만 올려 옵션을 보존한다.
  accessories: Record<AccessorySlotId, AccessoryState | null>;
  // 광맥 발견 누적량(만분율, CHANCE_SCALE 미만). 채광 산출 횟수 × 레벨별 확률만큼 쌓인다.
  veinProgress: number;
  // 나무묘목 누적량(만분율, CHANCE_SCALE 미만). 벌목 산출 횟수 × SAPLING_CHANCE만큼 쌓인다.
  saplingProgress: number;
  // 석탄 누적량(만분율, CHANCE_SCALE 미만). 채광 산출 횟수 × COAL_CHANCE만큼 쌓인다.
  coalProgress: number;
  // 낚시 꽝 누적량(만분율, CHANCE_SCALE 미만). 낚시 산출 횟수 × 낚시터·레벨별 꽝 확률만큼 쌓인다.
  junkProgress: number;
  // 보유 비료 수량과 배양·회수비료 확률 누적량(만분율, CHANCE_SCALE 미만).
  fertilizers: Record<FertilizerId, number>;
  bumperProgress: number;
  recoveryProgress: number;
  // 업적 판정용: 저장 이후 벌어들인 골드 누계(판매·퀘스트·마일스톤)와 첫 전설 리롤 여부.
  goldEarned: number;
  legendaryRolled: boolean;
  // 왕국 시설 강화 단계(복원한 구역별, 0~FACILITY_MAX_LEVEL). 길드 회관처럼 강화 대상이 아닌 구역은 없다.
  facilities: Partial<Record<ProjectId, number>>;
  lastSaveTime: number;
  notice: string;
}

function dayId(time: number) {
  return Math.floor(time / 86400000);
}

// 날짜 id를 시드로 하는 결정론적 의사난수(xorshift32) — 같은 날짜·같은 해금 상태면 항상
// 같은 퀘스트가 나오게 해서, 이 프로젝트의 다른 시간 정산과 마찬가지로 온라인(짧은 틱)과
// 오프라인(긴 시간 한 번에 정산)이 같은 결과를 내도록 한다.
function seededRandom(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

// 이미 해금한 원재료 중에서만 골라 중복 없이 최대 3개 뽑는다(해금 재료가 3개 미만인
// 극단적인 경우에는 있는 만큼만 반환). decodeSave가 옛 저장을 이전할 때, 스킬을 복원한
// 뒤 해금 상태를 다시 반영해 퀘스트를 새로 뽑기 위해 이 함수를 그대로 가져다 쓴다.
export function generateDailyQuests(s: Model, day: number, random: () => number = seededRandom(day)): DailyQuest[] {
  const pool = Object.values(ResourceDB).filter(r => !r.recipe && skillUnlocked(s, r.skill) && s.skills[r.skill].level >= r.reqLevel && facilityGateMet(s, r.id));
  const quests: DailyQuest[] = [];
  // 뽑힌 항목을 후보군에서 제거하면 난수 함수가 같은 값을 반복해도 루프가 반드시 끝난다.
  while (quests.length < 3 && pool.length) {
    const [r] = pool.splice(Math.floor(random() * pool.length), 1);
    quests.push({ resourceId: r.id, amount: 5 + Math.floor(random() * 11), done: false });
  }
  return quests;
}

// 날짜가 바뀌면 완료 여부와 무관하게 새 퀘스트 3개로 교체한다(연체·이월 없음).
function refreshDailyQuests(s: Model, time: number) {
  const today = dayId(time);
  if (s.dailyQuests.day !== today) {
    s.dailyQuests = { day: today, quests: generateDailyQuests(s, today) };
  }
}

function projectStates(completed: boolean): Record<ProjectId, ProjectState> {
  return Object.fromEntries(projectIds.map(id => {
    const project = ProjectDB[id];
    return [id, completed ? {
      phase: 'complete',
      clearingProgressMs: project.clearingDurationMs,
      restorationProgressMs: project.restorationDurationMs,
      delivered: {...project.materials},
    } : {
      phase: 'surveyable',
      clearingProgressMs: 0,
      restorationProgressMs: 0,
      delivered: Object.fromEntries(Object.keys(project.materials).map(resourceId => [resourceId, 0])),
    }];
  })) as Record<ProjectId, ProjectState>;
}

function createModel(time: number, unlockedSkills: SkillId[], unlockedFeatures: FeatureId[], completedProjects: boolean): Model {
  const s: Model = {
    version: SAVE_VERSION, gold: 1000,
    skills: Object.fromEntries(playable.map(id => [id, { level: 1, exp: 0, maxExp: experienceToNextLevel(1) }])) as Model['skills'],
    tools: Object.fromEntries(playable.map(id => [id, 0])) as Model['tools'],
    inventory: {}, currentAction: null, queuedAction: null, meal: null, farmPlots: [null], farmAuto: false, ranch: {}, ranchCounts: {}, barnLevel: 0, guild: 0,
    unlockedSkills: [...unlockedSkills], unlockedFeatures: [...unlockedFeatures], projects: projectStates(completedProjects),
    dailyQuests: { day: dayId(time), quests: [] }, milestones: {claimed: [], exchangeUsed: false},
    accessories: emptyAccessories(), veinProgress: 0, saplingProgress: 0, coalProgress: 0, junkProgress: 0,
    fertilizers: Object.fromEntries(fertilizerIds.map(id => [id, 0])) as Model['fertilizers'], bumperProgress: 0, recoveryProgress: 0,
    goldEarned: 0, legendaryRolled: false,
    facilities: Object.fromEntries(facilityIds.map(id => [id, 0])),
    lastSaveTime: time, notice: '',
  };
  s.dailyQuests.quests = generateDailyQuests(s, s.dailyQuests.day);
  return s;
}

export function initial(time = Date.now()): Model {
  return createModel(time, starterSkills, starterFeatures, false);
}

// 기존 기능 단위 테스트와 진행 시뮬레이터가 각 시스템을 바로 다룰 때 사용하는 완전 해금 기준 상태.
export function unlockedGame(time = Date.now()): Model {
  return createModel(time, playable, featureIds, true);
}

export function skillUnlocked(s: Model, skill: SkillId) {
  return s.unlockedSkills.includes(skill);
}

export function featureUnlocked(s: Model, feature: FeatureId) {
  return s.unlockedFeatures.includes(feature);
}

export function kingdomRestoration(s: Model) {
  return projectIds.reduce((total, id) => total + (s.projects[id].phase === 'complete' ? ProjectDB[id].restorationPoints : 0), 0);
}

// ── 업적(content_spec §9) ── 달성 여부는 현재 상태에서 계산한다.
export function growthAchievements(s: Model, skill: SkillId) {
  return growthLevels.filter(level => s.skills[skill].level >= level).length;
}

export function economyAchievements(s: Model) {
  return economyThresholds.filter(threshold => s.goldEarned >= threshold).length;
}

export function exchangeRateFor(s: Model) {
  return exchangeRate + ECONOMY_EXCHANGE_BONUS * economyAchievements(s);
}

// 판매가 보너스 = 장신구 흥정 + 그 자원을 만드는 스킬의 성장형 업적.
export function saleBonus(s: Model, resourceId: string) {
  return accessoryBonus(s, 'sale') + GROWTH_SALE_BONUS * growthAchievements(s, ResourceDB[resourceId].skill);
}

function earnGold(s: Model, amount: number) {
  s.gold += amount;
  s.goldEarned += amount;
}

// 제작형 업적 보상: 전설 리롤을 달성하면 마법부여석의 농사 약초 재료가 1개 줄어든다(최소 1).
export function recipeFor(s: Model, id: string): Record<string, number> {
  const r = ResourceDB[id];
  if (!r.recipe) return {};
  if (!s.legendaryRolled || r.skill !== 'magic') return r.recipe;
  return Object.fromEntries(Object.entries(r.recipe).map(([mid, n]) => [mid, ResourceDB[mid].skill === 'farming' ? Math.max(1, n - 1) : n]));
}

export function accessoryBonus(s: Model, optionId: AccessoryOptionId) {
  let total = 0;
  for (const accessory of Object.values(s.accessories)) {
    if (accessory?.optionId === optionId && accessory.rarity !== null) {
      total += accessoryOptions[optionId].values[accessory.rarity];
    }
  }
  return total;
}

export function speedMultiplier(s: Model, skill: SkillId, extraBonus = 0) {
  const food = s.meal && s.meal.remainingMs > 0 ? FoodDB[s.meal.foodId] : null;
  return getSpeedMultiplier(
    toolTiers[s.tools[skill]].bonus,
    food?.skills.includes(skill) ? food.speedBonus : 0,
    accessoryBonus(s, 'speed'),
    facilityBonus(s, skill),
    extraBonus,
  );
}

// Lv65·80·95 재료·레시피는 해당 구역 시설 단계가 필요하다(D049).
export function facilityGateMet(s: Model, id: string) {
  const r = ResourceDB[id];
  const need = facilityRequirement(r.skill, r.reqLevel);
  return !need || (s.facilities[need.projectId] ?? 0) >= need.level;
}

// ── 왕국 시설 강화(D048) ──
export function facilityBonus(s: Model, skill: SkillId) {
  return facilityIds.reduce((sum, id) => sum + (FacilityDB[id]!.skills.includes(skill) ? (s.facilities[id] ?? 0) * FACILITY_SPEED_PER_LEVEL : 0), 0);
}

// 복원한 구역의 다음 강화 단계와 비용. 최대 단계이거나 강화 대상이 아니면 null.
export function nextFacilityUpgrade(s: Model, id: ProjectId) {
  const def = Object.hasOwn(FacilityDB, id) ? FacilityDB[id] : undefined;
  const level = s.facilities[id] ?? 0;
  if (!def || s.projects[id]?.phase !== 'complete' || level >= FACILITY_MAX_LEVEL) return null;
  return {...facilityCost(id, level), skill: def.skills[0]};
}

export function upgradeFacility(s: Model, id: ProjectId) {
  const next = nextFacilityUpgrade(s, id);
  if (!next || s.skills[next.skill].level < next.reqLevel || s.gold < next.goldCost || !afford(s, next.cost)) return false;
  s.gold -= next.goldCost;
  spend(s, next.cost);
  s.facilities[id] = next.level;
  s.notice = `${ProjectDB[id].name} 시설 ${next.level}단계 · ${FacilityDB[id]!.skills.map(skill => skillNames[skill]).join('·')} 속도 +${Math.round(next.level * FACILITY_SPEED_PER_LEVEL * 100)}%`;
  return true;
}

// 칸마다 비료(속성비료)가 달라 성장 속도가 다를 수 있다.
export function plotSpeed(s: Model, plot: FarmPlot) {
  return speedMultiplier(s, 'farming', plot.fertilizer ? FertilizerDB[plot.fertilizer].speedBonus ?? 0 : 0);
}

export function duration(s: Model, id: string) {
  return ResourceDB[id].baseDurationMs / speedMultiplier(s, ResourceDB[id].skill);
}

export function afford(s: Model, cost: Record<string, number>) {
  return Object.entries(cost).every(([id, n]) => (s.inventory[id] ?? 0) >= n);
}

function spend(s: Model, cost: Record<string, number>, count = 1) {
  for (const [id, n] of Object.entries(cost)) s.inventory[id] -= n * count;
}

// 경험치 음식은 음식 만료 시점으로 구간이 나뉘는 액티브 작업과 사용자가 직접 누르는 수확에만 적용한다.
// 목장·자동 수확은 경과 시간 전체를 한 번에 정산하므로 여기에 적용하면 오프라인에서 효과가 과하게 붙는다.
export function mealExpBonus(s: Model, skill: SkillId) {
  const food = s.meal && s.meal.remainingMs > 0 ? FoodDB[s.meal.foodId] : null;
  return food?.skills.includes(skill) ? food.expBonus ?? 0 : 0;
}

function addExperience(s: Model, skillId: SkillId, amount: number, bonus = 0) {
  const skill = s.skills[skillId];
  skill.exp += amount * (1 + accessoryBonus(s, 'experience') + bonus);
  while (skill.level < MAX_SKILL_LEVEL && skill.exp >= skill.maxExp) {
    skill.exp -= skill.maxExp;
    skill.level++;
    skill.maxExp = experienceToNextLevel(skill.level);
  }
  if (skill.level === MAX_SKILL_LEVEL) skill.exp = Math.min(skill.exp, skill.maxExp);
}

// 한 구간 안에서는 속도가 일정하므로 횟수별 반복 없이 전체 생산량을 계산한다.
function advanceSegment(s: Model, elapsed: number): number {
  const action = s.currentAction;
  if (!action) return 0;
  if (action.kind === 'project') {
    const leftover = advanceProjectAction(s, action, elapsed);
    return leftover === null ? 0 : continueWithQueued(s, leftover);
  }
  const r = ResourceDB[action.resourceId];
  const speed = speedMultiplier(s, r.skill);
  action.progressMs += elapsed * speed;
  let count = Math.floor((action.progressMs + 1e-7) / r.baseDurationMs);
  const recipe = recipeFor(s, r.id);
  if (r.recipe) {
    count = Math.min(count, ...Object.entries(recipe).map(([id, n]) => Math.floor((s.inventory[id] ?? 0) / n)));
  }
  if (action.target !== undefined) count = Math.min(count, action.target);
  // 광맥·꽝처럼 레벨에 따라 달라지는 확률이 있으므로, 레벨이 오르는 지점마다 나눠 정산한다.
  // 그래야 오프라인에서 한 번에 정산해도 짧은 틱으로 한 번씩 정산한 것과 결과가 같다.
  const bonus = mealExpBonus(s, r.skill);
  for (let left = count; left > 0;) {
    const n = Math.min(left, actionsUntilLevelUp(s, r.skill, r.exp * (1 + accessoryBonus(s, 'experience') + bonus)));
    if (r.recipe) spend(s, recipe, n);
    // 낚시 꽝은 물고기만 줄이고 경험치는 그대로 준다.
    const junk = r.skill === 'fishing' ? accrue(s, 'junkProgress', n * junkChance(r.id, r.reqLevel, s.skills.fishing.level)) : 0;
    s.inventory[r.id] = (s.inventory[r.id] ?? 0) + n - junk;
    if (r.skill === 'mining') { discoverVeins(s, r.id, n); dropCoal(s, n); }
    if (r.skill === 'logging') dropSaplings(s, r.id, n);
    addExperience(s, r.skill, r.exp * n, bonus);
    left -= n;
  }
  if (count) action.progressMs = Math.max(0, action.progressMs - count * r.baseDurationMs);
  if (action.target !== undefined) action.target -= count;
  const reached = action.target === 0;
  if (!reached && !(r.recipe && !afford(s, recipe))) return count;
  // 멈춘 뒤 남은 작업량은 실제 시간으로 되돌려 예약 작업에 넘긴다 — 짧은 틱으로 나눠 정산해도,
  // 오프라인에서 한 번에 정산해도 예약 작업이 같은 시점에 시작된 것과 결과가 같다.
  const leftover = action.progressMs / speed;
  s.currentAction = null;
  s.notice = reached ? `${r.name} 목표 수량을 채워 작업을 멈췄습니다.` : '재료가 부족해 제작을 멈췄습니다.';
  return count + continueWithQueued(s, leftover);
}

// 예약 작업이 있으면 시작하고 남은 시간을 이어서 정산한다. 시작하지 못하면(재료 부족 등) 예약을 지운다.
function continueWithQueued(s: Model, leftover: number): number {
  const queued = s.queuedAction;
  if (!queued) return 0;
  s.queuedAction = null;
  const name = ResourceDB[queued.resourceId].name;
  if (!begin(s, queued.resourceId, queued.target)) {
    s.notice = `예약한 작업(${name})을 시작하지 못했습니다 · 재료나 레벨을 확인하세요.`;
    return 0;
  }
  s.notice = `예약한 작업 시작 · ${name}`;
  return leftover > 0 ? advanceSegment(s, leftover) : 0;
}

// 이번 레벨에서 다음 레벨업을 일으키는 작업까지 몇 번 남았는지(그 작업 포함). 레벨업을 일으킨 작업은
// 짧은 틱 정산에서도 오르기 전 레벨의 확률을 쓰므로 그 작업까지를 한 구간으로 묶는다.
function actionsUntilLevelUp(s: Model, skillId: SkillId, expPerAction: number) {
  const skill = s.skills[skillId];
  if (skill.level >= MAX_SKILL_LEVEL || expPerAction <= 0) return Infinity;
  return Math.max(1, Math.ceil((skill.maxExp - skill.exp) / expPerAction - 1e-9));
}

type ChanceKey = 'veinProgress' | 'saplingProgress' | 'coalProgress' | 'junkProgress' | 'bumperProgress' | 'recoveryProgress';

// 확률만큼 적립하고 1회분이 쌓인 횟수를 돌려준다(D034).
function accrue(s: Model, key: ChanceKey, amount: number) {
  s[key] += amount;
  const hits = Math.floor(s[key] / CHANCE_SCALE);
  s[key] -= hits * CHANCE_SCALE;
  return hits;
}

function dropSaplings(s: Model, logId: string, count: number) {
  const saplingId = saplingOf[logId];
  if (!saplingId) return;
  const saplings = accrue(s, 'saplingProgress', count * SAPLING_CHANCE);
  if (!saplings) return;
  s.inventory[saplingId] = (s.inventory[saplingId] ?? 0) + saplings;
  s.notice = `${ResourceDB[saplingId].name} +${saplings} · 밭에 심으면 원목을 수확합니다.`;
}

function dropCoal(s: Model, count: number) {
  const coal = accrue(s, 'coalProgress', count * COAL_CHANCE);
  if (coal) s.inventory.coal = (s.inventory.coal ?? 0) + coal;
}

function discoverVeins(s: Model, oreId: string, count: number) {
  const bonusOre = veinBonusOre[oreId];
  if (!bonusOre) return;
  const veins = accrue(s, 'veinProgress', count * veinChance(s.skills.mining.level));
  if (!veins) return;
  s.inventory[bonusOre] = (s.inventory[bonusOre] ?? 0) + veins;
  s.inventory.mana_stone = (s.inventory.mana_stone ?? 0) + veins;
  s.notice = `광맥 발견! ${ResourceDB[bonusOre].name} +${veins} · ${ResourceDB.mana_stone.name} +${veins}`;
}

function addUnique<T>(values: T[], additions: T[]) {
  for (const value of additions) if (!values.includes(value)) values.push(value);
}

// 단계가 끝나면 끝난 뒤 남은 시간(예약 작업에 넘길 몫)을, 아니면 null을 돌려준다.
function advanceProjectAction(s: Model, action: Extract<CurrentAction, {kind: 'project'}>, elapsed: number): number | null {
  const project = ProjectDB[action.projectId];
  const state = s.projects[action.projectId];
  if (action.stage === 'clearing') {
    if (state.phase !== 'clearing') { s.currentAction = null; return null; }
    const leftover = Math.max(0, state.clearingProgressMs + elapsed - project.clearingDurationMs);
    state.clearingProgressMs = Math.min(project.clearingDurationMs, state.clearingProgressMs + elapsed);
    action.progressMs = state.clearingProgressMs;
    if (state.clearingProgressMs + 1e-7 < project.clearingDurationMs) return null;
    // 오차 범위 안에서 완료로 본 진행량은 기간 값으로 맞춘다 — 저장 검증은 정확히 같아야 완료 단계로 인정한다.
    state.clearingProgressMs = project.clearingDurationMs;
    state.phase = 'delivery';
    for (const [id, count] of Object.entries(project.salvage)) s.inventory[id] = (s.inventory[id] ?? 0) + count;
    s.currentAction = null;
    s.notice = `${project.name} 정리 완료 · 회수품을 확보했습니다.`;
    return leftover;
  }
  if (state.phase !== 'restoring') { s.currentAction = null; return null; }
  const leftover = Math.max(0, state.restorationProgressMs + elapsed - project.restorationDurationMs);
  state.restorationProgressMs = Math.min(project.restorationDurationMs, state.restorationProgressMs + elapsed);
  action.progressMs = state.restorationProgressMs;
  if (state.restorationProgressMs + 1e-7 < project.restorationDurationMs) return null;
  state.restorationProgressMs = project.restorationDurationMs;
  state.phase = 'complete';
  addUnique(s.unlockedSkills, project.unlockSkills);
  addUnique(s.unlockedFeatures, project.unlockFeatures);
  s.currentAction = null;
  s.notice = `${project.name} 복원 완료 · ${project.unlockSkills.map(skill => skillNames[skill]).join(', ')} 해금`;
  return leftover;
}

// 밭은 재접속 여부와 무관하게 항상 흐른다. 자동화가 없으면 다 자란 뒤 수확 전까지 멈추고,
// 자동화가 있으면 다 자랄 때마다 거두고 같은 씨앗(묘목)이 있으면 남은 시간으로 곧바로 다시 키운다.
// 자동 수확은 경과 시간 전체를 한 번에 정산하므로 경험치 음식은 적용하지 않는다(mealExpBonus 참고).
function advanceFarm(s: Model, elapsed: number) {
  for (let i = 0; i < s.farmPlots.length; i++) {
    let plot = s.farmPlots[i];
    if (!plot) continue;
    const duration = ResourceDB[plot.cropId].baseDurationMs;
    if (!s.farmAuto) {
      plot.progressMs = Math.min(duration, plot.progressMs + elapsed * plotSpeed(s, plot));
      continue;
    }
    // 다시 심을 때 비료가 떨어져 속도가 바뀔 수 있으므로 남은 작업량이 아니라 남은 실제 시간으로 반복한다.
    let time = elapsed;
    for (;;) {
      const rate = plotSpeed(s, plot);
      const need = duration - plot.progressMs;
      if (time * rate + 1e-7 < need) { plot.progressMs += time * rate; break; }
      time = Math.max(0, time - need / rate);
      collectHarvest(s, plot.cropId, 0, plot.fertilizer);
      if (!sow(s, i, plot.cropId, plot.fertilizer, true)) { s.farmPlots[i] = null; break; }
      plot = s.farmPlots[i]!;
    }
  }
}

// 작은 틱이 누적되며 생기는 부동소수점 오차로 수확이 한 틱 밀리지 않게 advanceSegment와 같은 여유를 둔다.
export function plotReady(plot: FarmPlot | null) {
  return !!plot && plot.progressMs + 1e-7 >= ResourceDB[plot.cropId].baseDurationMs;
}

export function farmReady(s: Model, index = 0) {
  return plotReady(s.farmPlots[index] ?? null);
}

// progressMs는 속도 보정 전 작업량이므로 실제 남은 시간으로 바꾸려면 현재 속도로 나눈다.
export function farmRemainingMs(s: Model, index = 0) {
  const plot = s.farmPlots[index];
  if (!plot) return 0;
  const r = ResourceDB[plot.cropId];
  return Math.max(0, r.baseDurationMs - plot.progressMs) / plotSpeed(s, plot);
}

// 사육 중인 모든 동물을 병행 정산한다. 사료가 모자라면 주기 1회분에서 진행을 멈춰
// 무한정 적체됐다가 사료를 채우는 순간 몰아서 나오는 것을 막는다(D007 참고).
// 한 종을 여러 마리 키우면 주기마다 마릿수만큼 사료를 먹고 마릿수만큼 산출한다. 한 주기에 필요한 사료가
// 모자라면 그 종 전체가 대기한다(일부 마리만 먹이는 규칙은 두지 않는다).
function advanceRanch(s: Model, elapsed: number) {
  for (const id of Object.keys(s.ranch)) {
    const a = AnimalDB[id];
    const p = ResourceDB[a.productId];
    const heads = animalCount(s, id);
    let progressMs = s.ranch[id] + elapsed * speedMultiplier(s, p.skill);
    const timeCount = Math.floor((progressMs + 1e-7) / p.baseDurationMs);
    if (timeCount > 0) {
      const affordable = Math.floor((s.inventory[a.feedId] ?? 0) / (a.feedAmount * heads));
      const count = Math.min(timeCount, affordable);
      if (count > 0) {
        s.inventory[a.feedId] -= a.feedAmount * heads * count;
        s.inventory[p.id] = (s.inventory[p.id] ?? 0) + heads * count;
        addExperience(s, p.skill, p.exp * heads * count);
      }
      progressMs = count < timeCount ? p.baseDurationMs : progressMs - count * p.baseDurationMs;
    }
    s.ranch[id] = progressMs;
  }
}

// advanceSegment와 같은 여유(1e-7)로 주기 완료 여부를 판정한다.
function ranchCycleReady(s: Model, id: string) {
  const p = ResourceDB[AnimalDB[id].productId];
  return s.ranch[id] + 1e-7 >= p.baseDurationMs;
}

// 주기를 채웠지만 사료가 없어 다음 산출을 만들지 못하는 상태 — 손해 없이 대기, 사료를 채우면 바로 재개.
export function ranchStarved(s: Model, id: string) {
  if (!Object.hasOwn(s.ranch, id)) return false;
  const a = AnimalDB[id];
  return ranchCycleReady(s, id) && (s.inventory[a.feedId] ?? 0) < a.feedAmount * animalCount(s, id);
}

export function animalCount(s: Model, id: string) {
  return Object.hasOwn(s.ranch, id) ? s.ranchCounts[id] ?? 1 : 0;
}

export function barnCapacity(s: Model) {
  return 1 + s.barnLevel;
}

export function nextBarnUpgrade(s: Model) {
  return barnUpgrades[s.barnLevel];
}

export function expandBarn(s: Model) {
  const upgrade = nextBarnUpgrade(s);
  if (!upgrade || !skillUnlocked(s, 'ranching') || s.skills.ranching.level < upgrade.reqLevel || s.gold < upgrade.goldCost || !afford(s, upgrade.cost)) return false;
  s.gold -= upgrade.goldCost;
  spend(s, upgrade.cost);
  s.barnLevel++;
  s.notice = `축사 강화 완료 · 동물종당 최대 ${barnCapacity(s)}마리까지 키울 수 있습니다.`;
  return true;
}

export function ranchRemainingMs(s: Model, id: string) {
  if (!Object.hasOwn(s.ranch, id)) return 0;
  const a = AnimalDB[id];
  const p = ResourceDB[a.productId];
  return Math.max(0, p.baseDurationMs - s.ranch[id]) / speedMultiplier(s, p.skill);
}

export function advance(s: Model, time: number) {
  if (!Number.isFinite(time)) return 0;
  let elapsed = Math.max(0, time - s.lastSaveTime);
  s.lastSaveTime = Math.max(time, s.lastSaveTime);
  // 시간이 거슬러 오는 호출(과거 time)에도 방금 위에서 고정한 s.lastSaveTime을 날짜 기준으로
  // 써야, 생산 정산이 쓰는 시계와 퀘스트 갱신이 쓰는 시계가 서로 어긋나지 않는다.
  refreshDailyQuests(s, s.lastSaveTime);
  advanceFarm(s, elapsed);
  advanceRanch(s, elapsed);
  let count = 0;
  // 음식 만료 시점을 경계로 분리해 오프라인 전체에 효과가 적용되지 않게 한다.
  if (s.meal) {
    const boostedTime = Math.min(elapsed, s.meal.remainingMs);
    count += advanceSegment(s, boostedTime);
    elapsed -= boostedTime;
    s.meal.remainingMs -= boostedTime;
    if (s.meal.remainingMs <= 0) s.meal = null;
  }
  count += advanceSegment(s, elapsed);
  return count;
}

// 액티브 슬롯으로 만들 수 있는 자원인지(재료 보유는 따지지 않음). 작업 시작·예약·저장 검증이 함께 쓴다.
export function producible(s: Model, id: string) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  // 패시브 스킬(농사/목장) 산출물은 밭/축사에서만 나온다. 액티브 슬롯으로도 생산되면 이중 생산이 된다.
  return !!r && !r.dropOnly && skillUnlocked(s, r.skill) && !passiveSkills.includes(r.skill) && s.skills[r.skill].level >= r.reqLevel && facilityGateMet(s, id);
}

const validTarget = (target: number | undefined) => target === undefined || (Number.isSafeInteger(target) && target >= 1);

export function begin(s: Model, id: string, target?: number) {
  if (!producible(s, id) || !validTarget(target) || !afford(s, recipeFor(s, id))) return false;
  s.currentAction = target === undefined ? {kind: 'production', resourceId: id, progressMs: 0} : {kind: 'production', resourceId: id, progressMs: 0, target};
  s.notice = '';
  return true;
}

// 작업 중이면 다음 작업으로 예약하고(기존 예약은 교체), 쉬는 중이면 바로 시작한다.
export function queueAction(s: Model, id: string, target?: number) {
  if (!s.currentAction) return begin(s, id, target);
  if (!producible(s, id) || !validTarget(target)) return false;
  s.queuedAction = target === undefined ? {resourceId: id} : {resourceId: id, target};
  s.notice = `다음 작업 예약 · ${ResourceDB[id].name}${target ? ` ${target}개` : ''}`;
  return true;
}

export function clearQueuedAction(s: Model) {
  if (!s.queuedAction) return false;
  s.queuedAction = null;
  return true;
}

export function surveyProject(s: Model, projectId: ProjectId) {
  const state = s.projects[projectId];
  if (!state || state.phase !== 'surveyable') return false;
  state.phase = 'clearing';
  s.notice = `${ProjectDB[projectId].name} 조사 완료 · 폐허를 정리할 수 있습니다.`;
  return true;
}

export function startProjectWork(s: Model, projectId: ProjectId) {
  const state = s.projects[projectId];
  if (!state || (state.phase !== 'clearing' && state.phase !== 'restorable' && state.phase !== 'restoring')) return false;
  if (state.phase === 'restorable') state.phase = 'restoring';
  const stage = state.phase === 'clearing' ? 'clearing' : 'restoring';
  const progressMs = stage === 'clearing' ? state.clearingProgressMs : state.restorationProgressMs;
  s.currentAction = {kind: 'project', projectId, stage, progressMs};
  s.notice = '';
  return true;
}

export function deliverProjectMaterial(s: Model, projectId: ProjectId, resourceId: string, count: number) {
  const project = ProjectDB[projectId];
  const state = s.projects[projectId];
  const required = project?.materials[resourceId];
  if (!project || !state || state.phase !== 'delivery' || !required || !Number.isInteger(count) || count <= 0) return 0;
  const remaining = required - (state.delivered[resourceId] ?? 0);
  const moved = Math.min(count, remaining, s.inventory[resourceId] ?? 0);
  if (moved <= 0) return 0;
  s.inventory[resourceId] -= moved;
  state.delivered[resourceId] = (state.delivered[resourceId] ?? 0) + moved;
  if (Object.entries(project.materials).every(([id, amount]) => state.delivered[id] === amount)) state.phase = 'restorable';
  s.notice = `${ResourceDB[resourceId].name} ${moved}개 납품`;
  return moved;
}

export function upgrade(s: Model, skill: SkillId) {
  const tier = toolTiers[s.tools[skill] + 1];
  if (!skillUnlocked(s, skill) || !featureUnlocked(s, 'tools') || !tier || s.skills[skill].level < tier.level || !afford(s, tier.cost)) return false;
  spend(s, tier.cost);
  s.tools[skill]++;
  return true;
}

export function sell(s: Model, id: string, count: number) {
  if (!Object.hasOwn(ResourceDB, id) || !Number.isInteger(count) || count <= 0 || (s.inventory[id] ?? 0) < count) return false;
  s.inventory[id] -= count;
  earnGold(s, Math.floor(ResourceDB[id].sell * count * (1 + saleBonus(s, id))));
  return true;
}

export function craftAccessory(s: Model, slotId: AccessorySlotId) {
  if (!featureUnlocked(s, 'equipment') || !skillUnlocked(s, 'blacksmithing') || !accessorySlots.some(slot => slot.id === slotId) || s.accessories[slotId]) return false;
  const tier = accessoryTiers[0];
  if (s.skills.blacksmithing.level < tier.reqLevel || s.gold < tier.goldCost || !afford(s, tier.cost)) return false;
  s.gold -= tier.goldCost;
  spend(s, tier.cost);
  s.accessories[slotId] = {tier: 0, optionId: null, rarity: null};
  s.notice = `${accessorySlots.find(slot => slot.id === slotId)!.name} 제작 완료`;
  return true;
}

export function upgradeAccessory(s: Model, slotId: AccessorySlotId) {
  if (!featureUnlocked(s, 'equipment') || !skillUnlocked(s, 'blacksmithing')) return false;
  const accessory = s.accessories[slotId];
  if (!accessory) return false;
  const next = accessoryTiers[accessory.tier + 1];
  if (!next || s.skills.blacksmithing.level < next.reqLevel || s.gold < next.goldCost || !afford(s, next.cost)) return false;
  s.gold -= next.goldCost;
  spend(s, next.cost);
  accessory.tier++;
  s.notice = `${accessorySlots.find(slot => slot.id === slotId)!.name} · ${next.name} 재질로 승급`;
  return true;
}

export function rollAccessoryRarity(accessoryTier: number, stoneTier: number, roll: number) {
  const accessoryTierDef = accessoryTiers[accessoryTier];
  const stone = Object.values(enchantmentStoneByResource).find(candidate => candidate.tier === stoneTier);
  if (!accessoryTierDef || !stone || stoneTier < accessoryTier || !Number.isFinite(roll) || roll < 0 || roll >= 1) return null;
  const allowed = stone.weights.slice(0, accessoryTierDef.maxRarity + 1);
  const total = allowed.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return null;
  const target = roll * total;
  let cumulative = 0;
  for (let rarity = 0; rarity < allowed.length; rarity++) {
    cumulative += allowed[rarity];
    if (target < cumulative) return rarity;
  }
  return allowed.length - 1;
}

export function rerollAccessory(s: Model, slotId: AccessorySlotId, stoneId: string, random: () => number = Math.random) {
  if (!featureUnlocked(s, 'equipment') || !skillUnlocked(s, 'magic')) return false;
  const accessory = s.accessories[slotId];
  const stone = Object.hasOwn(enchantmentStoneByResource, stoneId) ? enchantmentStoneByResource[stoneId] : undefined;
  if (!accessory || !stone || stone.tier < accessory.tier || (s.inventory[stoneId] ?? 0) < 1) return false;
  const rarityRoll = random();
  const optionRoll = random();
  const rarity = rollAccessoryRarity(accessory.tier, stone.tier, rarityRoll);
  if (rarity === null || !Number.isFinite(optionRoll) || optionRoll < 0 || optionRoll >= 1) return false;
  const optionId = accessoryOptionIds[Math.floor(optionRoll * accessoryOptionIds.length)];
  s.inventory[stoneId]--;
  accessory.optionId = optionId;
  accessory.rarity = rarity;
  if (rarity === LEGENDARY_RARITY) s.legendaryRolled = true;
  s.notice = `${accessoryOptions[optionId].name} · ${accessoryOptions[optionId].description} +${Math.round(accessoryOptions[optionId].values[rarity] * 100)}%`;
  return true;
}

// 가공품(recipe가 있는 아이템)은 제작으로만 얻을 수 있다. 원재료만 해금된 스킬 레벨 이상이면 즉시 구매 가능
// (game_design.md의 "이미 해금한 하위 티어 기본 재료는 골드로 즉시 구매 가능" 캐치업 규칙).
export function buyResource(s: Model, id: string, count: number) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  if (!r || !skillUnlocked(s, r.skill) || r.recipe || !Number.isInteger(count) || count <= 0 || s.skills[r.skill].level < r.reqLevel || !facilityGateMet(s, id)) return false;
  const cost = r.buy * count;
  if (s.gold < cost) return false;
  s.gold -= cost;
  s.inventory[id] = (s.inventory[id] ?? 0) + count;
  return true;
}

// 상위 티어 원재료를 하위 티어로 환전한다. 하위 티어(targetId)는 그 자체로 환전 대상이 없어
// 역방향 경로가 존재하지 않으므로, 환전을 반복해도 가치를 만들어내는 순환 거래가 될 수 없다.
export function exchangeResource(s: Model, id: string, count: number) {
  const ex = Object.hasOwn(ExchangeDB, id) ? ExchangeDB[id] : undefined;
  if (!featureUnlocked(s, 'guild') || !ex || !Number.isInteger(count) || count <= 0 || ex.tierGap > s.guild + 1 || (s.inventory[id] ?? 0) < count) return false;
  const gained = Math.floor(count * Math.pow(exchangeRateFor(s), ex.tierGap));
  if (gained <= 0) return false;
  s.inventory[id] -= count;
  s.inventory[ex.targetId] = (s.inventory[ex.targetId] ?? 0) + gained;
  s.milestones.exchangeUsed = true;
  return true;
}

function skillHasProgress(s: Model, skill: SkillId) {
  return s.skills[skill].level > 1 || s.skills[skill].exp > 0;
}

export function milestoneReady(s: Model, id: MilestoneId) {
  switch (id) {
    case 'first_gather': return (['logging', 'mining', 'fishing'] as const).some(skill => skillHasProgress(s, skill));
    case 'any_skill_10': return playable.some(skill => s.skills[skill].level >= 10);
    case 'first_tool': return playable.some(skill => s.tools[skill] > 0);
    case 'first_meal': return skillHasProgress(s, 'cooking');
    case 'first_animal': return Object.keys(s.ranch).length > 0;
    case 'first_harvest': return skillHasProgress(s, 'farming');
    case 'first_exchange': return s.milestones.exchangeUsed;
    case 'any_skill_50': return playable.some(skill => s.skills[skill].level >= 50);
    case 'first_enchantment_stone': return skillHasProgress(s, 'magic');
  }
}

export function claimMilestone(s: Model, id: MilestoneId) {
  const milestone = milestoneById[id];
  if (!featureUnlocked(s, 'guild') || !milestone || s.milestones.claimed.includes(id) || !milestoneReady(s, id)) return false;
  s.milestones.claimed.push(id);
  earnGold(s, milestone.reward);
  s.notice = `마일스톤 완료 · ${milestone.name} · ${milestone.reward} G 획득`;
  return true;
}

// 판매가의 2배(그냥 파는 것보다 낫게)에 판매가 장신구 보너스를 반영한다 — sell()과 같은 규칙.
// 엔진과 화면(GuildView)이 항상 같은 값을 쓰도록 이 함수 하나로 계산한다.
export function dailyQuestReward(s: Model, quest: DailyQuest) {
  return Math.floor(quest.amount * ResourceDB[quest.resourceId].sell * 2 * (1 + saleBonus(s, quest.resourceId)));
}

// 요구량만큼 인벤토리에서 소모하고 골드로 보상한다. resourceId까지 함께 확인해, 클릭과 날짜
// 갱신이 겹쳐 퀘스트 배열이 통째로 바뀐 사이에 다른 퀘스트를 잘못 완료 처리하지 않게 한다.
export function completeDailyQuest(s: Model, index: number, resourceId: string) {
  const quest = s.dailyQuests.quests[index];
  if (!featureUnlocked(s, 'guild') || !quest || quest.resourceId !== resourceId || quest.done || (s.inventory[quest.resourceId] ?? 0) < quest.amount) return false;
  const r = ResourceDB[quest.resourceId];
  const reward = dailyQuestReward(s, quest);
  s.inventory[quest.resourceId] -= quest.amount;
  quest.done = true;
  earnGold(s, reward);
  s.notice = `일일 퀘스트 완료 · ${r.name} ${quest.amount}개 납품 · ${reward} G 획득`;
  return true;
}

export function upgradeGuild(s: Model) {
  const tier = guildTiers[s.guild + 1];
  if (!featureUnlocked(s, 'guild') || !tier || s.gold < tier.goldCost) return false;
  s.gold -= tier.goldCost;
  s.guild++;
  s.notice = `${tier.name} 승급 · 환전 가능 티어 ${s.guild + 1}단계까지 확대`;
  return true;
}

// 씨앗 1개(회수비료 적중 시 0개)와 비료 1개를 써서 index 칸에 심는다. 자동 재파종에서는 비료가
// 떨어졌으면 비료 없이 심고(optionalFertilizer), 수동 파종에서는 고른 비료가 없으면 실패한다.
function sow(s: Model, index: number, cropId: string, fertilizer: FertilizerId | undefined, optionalFertilizer: boolean) {
  if ((s.inventory[cropId] ?? 0) < 1) return false;
  if (fertilizer && s.fertilizers[fertilizer] < 1) {
    if (!optionalFertilizer) return false;
    fertilizer = undefined;
  }
  if (fertilizer) s.fertilizers[fertilizer]--;
  const chance = fertilizer ? FertilizerDB[fertilizer].seedReturnChance ?? 0 : 0;
  if (!chance || !accrue(s, 'recoveryProgress', chance)) s.inventory[cropId]--;
  s.farmPlots[index] = fertilizer ? {cropId, progressMs: 0, fertilizer} : {cropId, progressMs: 0};
  return true;
}

// 비어 있는 첫 밭에 심는다. 모든 칸이 차 있으면 실패한다.
export function plant(s: Model, id: string, fertilizer?: FertilizerId) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  const index = s.farmPlots.indexOf(null);
  if (!skillUnlocked(s, 'farming') || !r || r.skill !== 'farming' || index < 0 || s.skills.farming.level < r.reqLevel || !facilityGateMet(s, id)) return false;
  if (fertilizer !== undefined && !fertilizerIds.includes(fertilizer)) return false;
  if (!sow(s, index, id, fertilizer, false)) return false;
  s.notice = '';
  return true;
}

export function buyFertilizer(s: Model, id: FertilizerId, count: number) {
  const f = fertilizerIds.includes(id) ? FertilizerDB[id] : undefined;
  if (!skillUnlocked(s, 'farming') || !f || !Number.isInteger(count) || count <= 0 || s.gold < f.goldCost * count) return false;
  s.gold -= f.goldCost * count;
  s.fertilizers[id] += count;
  return true;
}

// 작물은 같은 작물(씨앗 포함)을, 묘목은 그 티어 원목을 돌려준다.
export function harvestOutput(cropId: string) {
  return saplingHarvest[cropId] ?? {resourceId: cropId, count: cropYield[cropId] ?? 1};
}

function collectHarvest(s: Model, cropId: string, bonus: number, fertilizer?: FertilizerId) {
  const out = {...harvestOutput(cropId)};
  const chance = fertilizer ? FertilizerDB[fertilizer].doubleChance ?? 0 : 0;
  if (chance && accrue(s, 'bumperProgress', chance)) out.count *= 2;
  s.inventory[out.resourceId] = (s.inventory[out.resourceId] ?? 0) + out.count;
  addExperience(s, 'farming', ResourceDB[cropId].exp, bonus);
  return out;
}

// index 칸을 비운다. 다 자랐으면 먼저 거두고(손실 없음), 자라는 중이면 그 작물과 비료는 사라진다.
// 자동 파종/수확은 수확물로 같은 작물을 계속 다시 심으므로, 작물을 바꾸려면 칸을 비워야 한다.
export function clearPlot(s: Model, index: number) {
  const plot = Number.isInteger(index) ? s.farmPlots[index] : undefined;
  if (!skillUnlocked(s, 'farming') || !plot) return false;
  const name = ResourceDB[plot.cropId].name;
  if (plotReady(plot)) collectHarvest(s, plot.cropId, mealExpBonus(s, 'farming'), plot.fertilizer);
  s.farmPlots[index] = null;
  s.notice = `${index + 1}번 밭을 비웠습니다(${name}) · 새 작물을 심을 수 있습니다.`;
  return true;
}

// 다 자란 칸을 모두 거둔다. 하나라도 거두면 true.
export function harvest(s: Model) {
  if (!skillUnlocked(s, 'farming')) return false;
  const gained: Record<string, number> = {};
  let exp = 0;
  for (let i = 0; i < s.farmPlots.length; i++) {
    const plot = s.farmPlots[i];
    if (!plot || !plotReady(plot)) continue;
    const out = collectHarvest(s, plot.cropId, mealExpBonus(s, 'farming'), plot.fertilizer);
    gained[out.resourceId] = (gained[out.resourceId] ?? 0) + out.count;
    exp += ResourceDB[plot.cropId].exp;
    s.farmPlots[i] = null;
  }
  if (!exp) return false;
  s.notice = `${Object.entries(gained).map(([id, n]) => `${ResourceDB[id].name} ${n}개`).join(' · ')} 수확 · 경험치 +${exp}`;
  return true;
}

function nextPlotUpgrade(s: Model) {
  return plotUpgrades[s.farmPlots.length - 1];
}

function payFarmUpgrade(s: Model, upgrade: {reqLevel: number; goldCost: number; cost: Record<string, number>}) {
  if (!skillUnlocked(s, 'farming') || s.skills.farming.level < upgrade.reqLevel || s.gold < upgrade.goldCost || !afford(s, upgrade.cost)) return false;
  s.gold -= upgrade.goldCost;
  spend(s, upgrade.cost);
  return true;
}

export function expandFarm(s: Model) {
  const upgrade = nextPlotUpgrade(s);
  if (!upgrade || !payFarmUpgrade(s, upgrade)) return false;
  s.farmPlots.push(null);
  s.notice = `밭이 ${s.farmPlots.length}칸으로 늘었습니다.`;
  return true;
}

export function automateFarm(s: Model) {
  if (s.farmAuto || !payFarmUpgrade(s, farmAutomation)) return false;
  s.farmAuto = true;
  s.notice = '자동 파종/수확 설치 완료 · 다 자란 작물을 거두고 같은 씨앗으로 다시 심습니다.';
  return true;
}

export { nextPlotUpgrade };

// 처음 사면 사육을 시작하고, 이미 키우는 종은 축사 수용량까지 한 마리씩 늘린다(진행 중인 주기는 유지).
export function buyAnimal(s: Model, id: string) {
  const a = Object.hasOwn(AnimalDB, id) ? AnimalDB[id] : undefined;
  if (!skillUnlocked(s, 'ranching') || !a || animalCount(s, id) >= barnCapacity(s)) return false;
  const p = ResourceDB[a.productId];
  if (s.skills.ranching.level < p.reqLevel || !facilityGateMet(s, p.id) || s.gold < a.buyGold) return false;
  s.gold -= a.buyGold;
  if (Object.hasOwn(s.ranch, id)) {
    s.ranchCounts[id] = animalCount(s, id) + 1;
    s.notice = `${a.name} ${s.ranchCounts[id]}마리 · 주기마다 사료 ${a.feedAmount * s.ranchCounts[id]}개를 먹고 ${p.name} ${s.ranchCounts[id]}개를 만듭니다.`;
    return true;
  }
  s.ranch[id] = 0;
  s.notice = `${a.name} 입주 · 사료(${ResourceDB[a.feedId].name})를 채워두면 자동으로 ${p.name}을(를) 만듭니다.`;
  return true;
}

export function eat(s: Model, foodId: string, count = 1) {
  const food = Object.hasOwn(FoodDB, foodId) ? FoodDB[foodId] : undefined;
  if (!skillUnlocked(s, 'cooking') || !food || !Number.isInteger(count) || count < 1 || count > 5 || (s.inventory[foodId] ?? 0) < count) return false;
  s.inventory[foodId] -= count;
  const remaining = s.meal?.foodId === foodId ? s.meal.remainingMs : 0;
  s.meal = { foodId, remainingMs: remaining + food.durationMs * count };
  s.notice = `${ResourceDB[foodId].name} ${count}개 사용 · ${food.description}`;
  return true;
}
