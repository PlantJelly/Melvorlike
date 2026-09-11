import { initial, type Model } from './model';
import { ResourceDB, toolTiers, playable, passiveSkills } from '../content/resources';
import { AnimalDB } from '../content/animals';
import { FoodDB } from '../content/foods';
import { guildTiers } from '../content/guild';
import {accessoryOptionIds, accessorySlots, accessoryTiers, type AccessoryOptionId} from '../content/accessories';
export const SAVE_KEY = 'melvorlike_save';

export function encodeSave(s: Model): string {
  return JSON.stringify(s);
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function decodeSave(text: string): Model {
  const raw: unknown = JSON.parse(text);
  if (!object(raw) || ![1, 2, 3, 4, 5, 6, 7].includes(raw.version as number)) throw Error('지원하지 않는 저장 버전');
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
