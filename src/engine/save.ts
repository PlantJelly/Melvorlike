import { initial, unlockedGame, generateDailyQuests, milestoneReady, skillUnlocked, type Model, type DailyQuest, type ProjectState } from './model';
import { ResourceDB, toolTiers, playable, passiveSkills } from '../content/resources';
import { AnimalDB } from '../content/animals';
import { FoodDB } from '../content/foods';
import { guildTiers, milestoneIds, type MilestoneId } from '../content/guild';
import {accessoryOptionIds, accessorySlots, accessoryTiers, type AccessoryOptionId} from '../content/accessories';
import {ProjectDB, featureIds, projectIds, starterSkills, type FeatureId, type ProjectId, type ProjectPhase} from '../content/projects';
export const SAVE_KEY = 'melvorlike_save';

// 키를 정렬해 직렬화한다 — 인코딩 시점과 디코딩 시점의 JS 객체 키 순서가 달라도
// 체크섬이 항상 같은 문자열을 해시하도록 보장한다. undefined 값은 JSON.stringify와
// 동일하게 취급한다(객체 키는 생략, 배열 원소는 null) — 그렇지 않으면 encodeSave가
// 실제로 저장한 텍스트(undefined 키가 빠짐)와 canonical()이 해시한 내용이 어긋나
// 손상되지 않은 저장까지 체크섬 불일치로 거부될 수 있다.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(v => v === undefined ? 'null' : canonical(v)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

// 암호학적 서명이 아니라, 텍스트 편집기로 값을 슬쩍 바꾸고 그대로 복원하는 것을
// 막기 위한 무결성 체크섬(FNV-1a)이다. 알고리즘이 클라이언트 코드에 그대로 들어있으므로
// 체크섬까지 다시 계산해 넣는 조작은 막지 못한다 — 목적은 그 정도 마찰이지 보안이 아니다.
function checksum(value: unknown): string {
  const text = canonical(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function encodeSave(s: Model): string {
  return JSON.stringify({...s, checksum: checksum(s)});
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function decodeSave(text: string): Model {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw Error('저장 파일 형식이 올바르지 않습니다'); }
  if (!object(raw) || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(raw.version as number)) throw Error('지원하지 않는 저장 버전');
  // 체크섬은 v7 이전 저장에는 없었으므로 필드 자체가 없을 때만 건너뛴다.
  // 필드가 있는데 문자열이 아니거나 값이 다르면(타입이 깨졌어도) 거부한다.
  if (raw.checksum !== undefined) {
    const {checksum: saved, ...rest} = raw;
    if (typeof saved !== 'string' || checksum(rest) !== saved) throw Error('저장 데이터가 손상되었거나 수정되었습니다');
  }
  const version = raw.version as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
  if (!finite(raw.gold) || !finite(raw.lastSaveTime) || !object(raw.skills)) throw Error('저장 값 오류');
  // v1~v9는 모든 기능이 처음부터 보이던 기존 게임이다. v10 이상만 실제 해금 상태를 복원한다.
  const s = version < 10 ? unlockedGame(raw.lastSaveTime) : initial(raw.lastSaveTime);
  s.gold = raw.gold;
  for (const id of playable) {
    if (version < 3 && id === 'cooking') continue;
    if (version < 4 && id === 'farming') continue;
    if (version < 5 && id === 'ranching') continue;
    if (version < 7 && id === 'magic') continue;
    const k = raw.skills[id];
    if (!object(k) || !finite(k.level) || k.level < 1 || !Number.isInteger(k.level) || !finite(k.exp) || !finite(k.maxExp) || k.maxExp <= 0) throw Error('스킬 정보 오류');
    s.skills[id] = {level: Math.min(99, k.level), exp: k.exp, maxExp: k.maxExp};
  }
  if (version >= 10) {
    if (!Array.isArray(raw.unlockedSkills) || !Array.isArray(raw.unlockedFeatures) || !object(raw.projects)) throw Error('왕국 정보 오류');
    const unlockedSkills = raw.unlockedSkills;
    const unlockedFeatures = raw.unlockedFeatures;
    if (unlockedSkills.some(id => typeof id !== 'string' || !playable.includes(id as (typeof playable)[number])) || new Set(unlockedSkills).size !== unlockedSkills.length || starterSkills.some(id => !unlockedSkills.includes(id))) throw Error('왕국 정보 오류');
    if (unlockedFeatures.some(id => typeof id !== 'string' || !featureIds.includes(id as FeatureId)) || new Set(unlockedFeatures).size !== unlockedFeatures.length) throw Error('왕국 정보 오류');
    s.unlockedSkills = [...unlockedSkills] as Model['unlockedSkills'];
    s.unlockedFeatures = [...unlockedFeatures] as Model['unlockedFeatures'];
    // 이 저장 버전에 등장해야 할 구역만 정확히 있어야 한다 — 아직 도입되지 않은 구역은
    // 저장에 없는 게 맞고(initial()의 조사 가능 기본값을 그대로 씀), 반대로 그 저장 버전엔
    // 없어야 할 구역이 섞여 있으면 손상/변조로 거부한다.
    const projectIdsAtVersion = projectIds.filter(id => ProjectDB[id].introducedVersion <= version);
    if (Object.keys(raw.projects).length !== projectIdsAtVersion.length || Object.keys(raw.projects).some(id => !projectIdsAtVersion.includes(id as ProjectId))) throw Error('왕국 정보 오류');
    for (const projectId of projectIdsAtVersion) {
      const value = raw.projects[projectId];
      const project = ProjectDB[projectId];
      if (!object(value) || !['surveyable', 'clearing', 'delivery', 'restorable', 'restoring', 'complete'].includes(value.phase as string) || !finite(value.clearingProgressMs) || value.clearingProgressMs > project.clearingDurationMs || !finite(value.restorationProgressMs) || value.restorationProgressMs > project.restorationDurationMs || !object(value.delivered)) throw Error('왕국 정보 오류');
      const materialIds = Object.keys(project.materials);
      if (Object.keys(value.delivered).length !== materialIds.length || Object.keys(value.delivered).some(id => !materialIds.includes(id))) throw Error('왕국 정보 오류');
      const delivered: Record<string, number> = {};
      for (const id of materialIds) {
        const amount = value.delivered[id];
        if (!finite(amount) || !Number.isSafeInteger(amount) || amount > project.materials[id]) throw Error('왕국 정보 오류');
        delivered[id] = amount;
      }
      const phase = value.phase as ProjectPhase;
      const cleared = value.clearingProgressMs === project.clearingDurationMs;
      const restored = value.restorationProgressMs === project.restorationDurationMs;
      const supplied = materialIds.every(id => delivered[id] === project.materials[id]);
      const emptyDelivery = materialIds.every(id => delivered[id] === 0);
      const validPhase =
        (phase === 'surveyable' && value.clearingProgressMs === 0 && value.restorationProgressMs === 0 && emptyDelivery) ||
        (phase === 'clearing' && !cleared && value.restorationProgressMs === 0 && emptyDelivery) ||
        (phase === 'delivery' && cleared && value.restorationProgressMs === 0 && !supplied) ||
        (phase === 'restorable' && cleared && value.restorationProgressMs === 0 && supplied) ||
        (phase === 'restoring' && cleared && !restored && supplied) ||
        (phase === 'complete' && cleared && restored && supplied);
      if (!validPhase) throw Error('왕국 정보 오류');
      s.projects[projectId] = {phase, clearingProgressMs: value.clearingProgressMs, restorationProgressMs: value.restorationProgressMs, delivered} as ProjectState;
      const completed = phase === 'complete';
      if (project.unlockSkills.some(id => s.unlockedSkills.includes(id) !== completed) || project.unlockFeatures.some(id => s.unlockedFeatures.includes(id) !== completed)) throw Error('왕국 정보 오류');
    }
  }
  // 기준 모델이 만든 dailyQuests는 아직 스킬이 복원되기 전(레벨 1 기준)으로 뽑힌 것이므로,
  // v8 이전 저장(뒤의 dailyQuests 블록이 실행되지 않음)은 방금 복원한 실제 레벨로 다시 뽑는다.
  if (version < 8) s.dailyQuests.quests = generateDailyQuests(s, s.dailyQuests.day);
  if (version !== 1) {
    if (!object(raw.inventory) || !object(raw.tools)) throw Error('소지품 정보 오류');
    for (const [id, n] of Object.entries(raw.inventory)) {
      if (!Object.hasOwn(ResourceDB, id) || !finite(n) || !Number.isSafeInteger(n)) throw Error('재료 정보 오류');
      s.inventory[id] = n;
    }
    for (const id of playable) {
      if (version === 2 && id === 'cooking') continue;
      if (version < 4 && id === 'farming') continue;
      if (version < 5 && id === 'ranching') continue;
      if (version < 7 && id === 'magic') continue;
      const n = raw.tools[id];
      if (!finite(n) || !Number.isInteger(n) || n >= toolTiers.length) throw Error('도구 정보 오류');
      s.tools[id] = n;
    }
    if (raw.currentAction !== null) {
      const a = raw.currentAction;
      if (!object(a) || !finite(a.progressMs)) throw Error('작업 정보 오류');
      if (version < 10) {
        if (typeof a.resourceId !== 'string' || !Object.hasOwn(ResourceDB, a.resourceId)) throw Error('작업 정보 오류');
        const r = ResourceDB[a.resourceId];
        // 패시브 스킬 산출물은 밭/축사에서만 나온다. begin()과 같은 규칙을 저장 데이터 검증에도 적용한다.
        if (passiveSkills.includes(r.skill) || a.progressMs > r.baseDurationMs || s.skills[r.skill].level < r.reqLevel) throw Error('작업 정보 오류');
        // v2는 실제 경과 시간, v3+는 속도 보정 전 작업량으로 저장한다.
        const progressMs = a.progressMs * (version === 2 ? 1 + toolTiers[s.tools[r.skill]].bonus : 1);
        s.currentAction = {kind: 'production', resourceId: r.id, progressMs};
      } else if (a.kind === 'production') {
        if (typeof a.resourceId !== 'string' || !Object.hasOwn(ResourceDB, a.resourceId)) throw Error('작업 정보 오류');
        const r = ResourceDB[a.resourceId];
        if (!skillUnlocked(s, r.skill) || passiveSkills.includes(r.skill) || a.progressMs > r.baseDurationMs || s.skills[r.skill].level < r.reqLevel) throw Error('작업 정보 오류');
        s.currentAction = {kind: 'production', resourceId: r.id, progressMs: a.progressMs};
      } else if (a.kind === 'project') {
        if (typeof a.projectId !== 'string' || !projectIds.includes(a.projectId as ProjectId) || (a.stage !== 'clearing' && a.stage !== 'restoring')) throw Error('작업 정보 오류');
        const projectId = a.projectId as ProjectId;
        const project = ProjectDB[projectId];
        const state = s.projects[projectId];
        const expectedProgress = a.stage === 'clearing' ? state.clearingProgressMs : state.restorationProgressMs;
        const duration = a.stage === 'clearing' ? project.clearingDurationMs : project.restorationDurationMs;
        if (state.phase !== a.stage || a.progressMs !== expectedProgress || a.progressMs >= duration) throw Error('작업 정보 오류');
        s.currentAction = {kind: 'project', projectId, stage: a.stage, progressMs: a.progressMs};
      } else throw Error('작업 정보 오류');
    }
  }
  if (version >= 3 && raw.meal !== null) {
    const meal = raw.meal;
    if (!object(meal) || typeof meal.foodId !== 'string' || !Object.hasOwn(FoodDB, meal.foodId) || !finite(meal.remainingMs) || meal.remainingMs <= 0) throw Error('음식 정보 오류');
    s.meal = {foodId: meal.foodId, remainingMs: meal.remainingMs};
  }
  if (version >= 4 && raw.farmPlot !== null) {
    const plot = raw.farmPlot;
    if (!object(plot) || typeof plot.cropId !== 'string' || !Object.hasOwn(ResourceDB, plot.cropId) || ResourceDB[plot.cropId].skill !== 'farming' || !finite(plot.progressMs)) throw Error('농사밭 정보 오류');
    const r = ResourceDB[plot.cropId];
    if (!skillUnlocked(s, 'farming') || plot.progressMs > r.baseDurationMs || s.skills.farming.level < r.reqLevel) throw Error('농사밭 정보 오류');
    s.farmPlot = {cropId: r.id, progressMs: plot.progressMs};
  }
  if (version >= 5) {
    if (!object(raw.ranch)) throw Error('목장 정보 오류');
    for (const [id, progressMs] of Object.entries(raw.ranch)) {
      if (!Object.hasOwn(AnimalDB, id) || !finite(progressMs)) throw Error('목장 정보 오류');
      const a = AnimalDB[id];
      const p = ResourceDB[a.productId];
      if (!skillUnlocked(s, 'ranching') || progressMs > p.baseDurationMs || s.skills.ranching.level < p.reqLevel) throw Error('목장 정보 오류');
      s.ranch[id] = progressMs;
    }
  }
  if (version >= 6) {
    if (!finite(raw.guild) || !Number.isInteger(raw.guild) || raw.guild >= guildTiers.length) throw Error('길드 정보 오류');
    s.guild = raw.guild;
  }
  if (version >= 7) {
    if (!object(raw.accessories)) throw Error('장신구 정보 오류');
    const slotIds = accessorySlots.map(slot => slot.id);
    if (Object.keys(raw.accessories).some(id => !slotIds.includes(id as (typeof slotIds)[number]))) throw Error('장신구 정보 오류');
    for (const slotId of slotIds) {
      const accessory = raw.accessories[slotId];
      if (accessory === null) continue;
      if (!s.unlockedFeatures.includes('equipment')) throw Error('장신구 정보 오류');
      if (!object(accessory) || !finite(accessory.tier) || !Number.isInteger(accessory.tier) || accessory.tier >= accessoryTiers.length) throw Error('장신구 정보 오류');
      if (s.skills.blacksmithing.level < accessoryTiers[accessory.tier].reqLevel) throw Error('장신구 정보 오류');
      const optionId = accessory.optionId;
      const rarity = accessory.rarity;
      if (optionId === null || rarity === null) {
        if (optionId !== null || rarity !== null) throw Error('장신구 정보 오류');
        s.accessories[slotId] = {tier: accessory.tier, optionId: null, rarity: null};
        continue;
      }
      if (typeof optionId !== 'string' || !accessoryOptionIds.includes(optionId as AccessoryOptionId) || !finite(rarity) || !Number.isInteger(rarity) || rarity > accessoryTiers[accessory.tier].maxRarity) throw Error('장신구 정보 오류');
      s.accessories[slotId] = {tier: accessory.tier, optionId: optionId as AccessoryOptionId, rarity};
    }
  }
  if (version >= 8) {
    const dq = raw.dailyQuests;
    if (!object(dq) || !finite(dq.day) || !Number.isInteger(dq.day) || !Array.isArray(dq.quests) || dq.quests.length !== 3) throw Error('퀘스트 정보 오류');
    const quests: DailyQuest[] = [];
    const seen = new Set<string>();
    for (const q of dq.quests) {
      if (!object(q) || typeof q.resourceId !== 'string' || !Object.hasOwn(ResourceDB, q.resourceId)) throw Error('퀘스트 정보 오류');
      const resource = ResourceDB[q.resourceId];
      if (resource.recipe || !skillUnlocked(s, resource.skill) || s.skills[resource.skill].level < resource.reqLevel || !finite(q.amount) || !Number.isInteger(q.amount) || q.amount < 5 || q.amount > 15 || typeof q.done !== 'boolean' || seen.has(q.resourceId)) throw Error('퀘스트 정보 오류');
      seen.add(q.resourceId);
      quests.push({resourceId: q.resourceId, amount: q.amount, done: q.done});
    }
    s.dailyQuests = {day: dq.day, quests};
  }
  if (version >= 9) {
    const state = raw.milestones;
    if (!object(state) || !Array.isArray(state.claimed) || typeof state.exchangeUsed !== 'boolean') throw Error('마일스톤 정보 오류');
    const claimed: MilestoneId[] = [];
    const seen = new Set<string>();
    for (const id of state.claimed) {
      if (typeof id !== 'string' || !milestoneIds.includes(id as MilestoneId) || seen.has(id)) throw Error('마일스톤 정보 오류');
      seen.add(id);
      claimed.push(id as MilestoneId);
    }
    s.milestones = {claimed, exchangeUsed: state.exchangeUsed};
    if (claimed.some(id => !milestoneReady(s, id))) throw Error('마일스톤 정보 오류');
  }
  return s;
}
