import { initial, type Model } from './model';
import { ResourceDB, toolTiers, playable, passiveSkills } from '../content/resources';
import { AnimalDB } from '../content/animals';
import { FoodDB } from '../content/foods';
import { guildTiers } from '../content/guild';
import {accessoryOptionIds, accessorySlots, accessoryTiers, type AccessoryOptionId} from '../content/accessories';
export const SAVE_KEY = 'melvorlike_save';

// 키를 정렬해 직렬화한다 — 인코딩 시점과 디코딩 시점의 JS 객체 키 순서가 달라도
// 체크섬이 항상 같은 문자열을 해시하도록 보장한다.
function canonical(value: unknown): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return JSON.stringify(value);
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
  if (!object(raw) || ![1, 2, 3, 4, 5, 6, 7].includes(raw.version as number)) throw Error('지원하지 않는 저장 버전');
  // 체크섬은 v7 이전 저장에는 없었으므로 있을 때만 검증한다(있는데 값이 다르면만 거부).
  if (typeof raw.checksum === 'string') {
    const {checksum: saved, ...rest} = raw;
    if (checksum(rest) !== saved) throw Error('저장 데이터가 손상되었거나 수정되었습니다');
  }
  const version = raw.version as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  if (!finite(raw.gold) || !finite(raw.lastSaveTime) || !object(raw.skills)) throw Error('저장 값 오류');
  const s = initial(raw.lastSaveTime);
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
      if (!object(a) || typeof a.resourceId !== 'string' || !Object.hasOwn(ResourceDB, a.resourceId) || !finite(a.progressMs)) throw Error('작업 정보 오류');
      const r = ResourceDB[a.resourceId];
      // 패시브 스킬 산출물은 밭/축사에서만 나온다. begin()과 같은 규칙을 저장 데이터 검증에도 적용한다.
      if (passiveSkills.includes(r.skill) || a.progressMs > r.baseDurationMs || s.skills[r.skill].level < r.reqLevel) throw Error('작업 정보 오류');
      // v2는 실제 경과 시간, v3+는 속도 보정 전 작업량으로 저장한다.
      const progressMs = a.progressMs * (version === 2 ? 1 + toolTiers[s.tools[r.skill]].bonus : 1);
      s.currentAction = {resourceId: r.id, progressMs};
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
    if (plot.progressMs > r.baseDurationMs || s.skills.farming.level < r.reqLevel) throw Error('농사밭 정보 오류');
    s.farmPlot = {cropId: r.id, progressMs: plot.progressMs};
  }
  if (version >= 5) {
    if (!object(raw.ranch)) throw Error('목장 정보 오류');
    for (const [id, progressMs] of Object.entries(raw.ranch)) {
      if (!Object.hasOwn(AnimalDB, id) || !finite(progressMs)) throw Error('목장 정보 오류');
      const a = AnimalDB[id];
      const p = ResourceDB[a.productId];
      if (progressMs > p.baseDurationMs || s.skills.ranching.level < p.reqLevel) throw Error('목장 정보 오류');
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
  return s;
}
