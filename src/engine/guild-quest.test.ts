import { describe, expect, it } from 'vitest';
import { ResourceDB } from '../content/resources';
import { advance, completeDailyQuest, initial } from './model';
import { decodeSave, encodeSave } from './save';

const DAY = 86400000;

describe('길드: 일일 퀘스트', () => {
  it('해금된 원재료 중에서만, 중복 없이 최대 3개를 결정론적으로 뽑는다', () => {
    const s = initial(0);
    expect(s.dailyQuests.quests.length).toBe(3);
    const ids = s.dailyQuests.quests.map(q => q.resourceId);
    expect(new Set(ids).size).toBe(3);
    for (const q of s.dailyQuests.quests) {
      const r = ResourceDB[q.resourceId];
      expect(r.recipe).toBeUndefined();
      expect(s.skills[r.skill].level).toBeGreaterThanOrEqual(r.reqLevel);
    }
    const other = initial(0);
    expect(other.dailyQuests).toEqual(s.dailyQuests);
  });

  it('날짜가 바뀌면 완료 여부와 무관하게 새 퀘스트로 교체되고, 같은 날에는 그대로 유지된다', () => {
    const s = initial(0);
    const quest0 = s.dailyQuests.quests[0];
    s.inventory[quest0.resourceId] = quest0.amount;
    expect(completeDailyQuest(s, 0)).toBe(true);
    const afterComplete = s.dailyQuests.quests;
    advance(s, 1000); // 같은 날 안에서 시간만 흐름
    expect(s.dailyQuests.day).toBe(0);
    expect(s.dailyQuests.quests[0].done).toBe(true);
    expect(s.dailyQuests.quests).toBe(afterComplete); // 재생성되지 않고 같은 배열 그대로

    advance(s, DAY);
    expect(s.dailyQuests.day).toBe(1);
    expect(s.dailyQuests.quests.every(q => !q.done)).toBe(true); // 완료 여부와 무관하게 새 3개로 교체
  });

  it('요구량을 채우면 인벤토리를 소모하고 골드를 보상하며, 다시 납품할 수 없다', () => {
    const s = initial(0);
    const quest = s.dailyQuests.quests[0];
    const r = ResourceDB[quest.resourceId];
    s.inventory[quest.resourceId] = quest.amount;
    const goldBefore = s.gold;
    expect(completeDailyQuest(s, 0)).toBe(true);
    expect(s.inventory[quest.resourceId]).toBe(0);
    expect(s.gold).toBe(goldBefore + Math.round(quest.amount * r.sell * 2));
    expect(s.dailyQuests.quests[0].done).toBe(true);
    expect(completeDailyQuest(s, 0)).toBe(false); // 이미 완료
  });

  it('요구량 미달, 잘못된 인덱스는 실패하고 아무것도 바뀌지 않는다', () => {
    const s = initial(0);
    const quest = s.dailyQuests.quests[0];
    s.inventory[quest.resourceId] = quest.amount - 1;
    expect(completeDailyQuest(s, 0)).toBe(false);
    expect(completeDailyQuest(s, -1)).toBe(false);
    expect(completeDailyQuest(s, 99)).toBe(false);
    expect(s.inventory[quest.resourceId]).toBe(quest.amount - 1);
    expect(s.gold).toBe(1000);
  });

  it('v8 저장은 왕복 시 퀘스트 상태가 정확히 보존되고, v7 이전 저장은 새 퀘스트로 채워진다', () => {
    const s = initial(0);
    s.inventory[s.dailyQuests.quests[0].resourceId] = s.dailyQuests.quests[0].amount;
    completeDailyQuest(s, 0);
    const restored = decodeSave(encodeSave(s));
    expect(restored.dailyQuests).toEqual(s.dailyQuests);

    const {dailyQuests: _dq, ...withoutQuests} = JSON.parse(encodeSave(initial(0)));
    const legacy = {...withoutQuests, version: 7};
    delete (legacy as Record<string, unknown>).checksum;
    const migrated = decodeSave(JSON.stringify(legacy));
    expect(migrated.dailyQuests.quests.length).toBeGreaterThan(0);
  });

  it('퀘스트 정보가 구조적으로 잘못되면 거부한다', () => {
    const s = initial(0);
    const raw = JSON.parse(encodeSave(s));
    raw.dailyQuests.quests[0].amount = -1;
    delete raw.checksum;
    expect(() => decodeSave(JSON.stringify(raw))).toThrow('퀘스트 정보 오류');

    const raw2 = JSON.parse(encodeSave(s));
    raw2.dailyQuests.quests[0].resourceId = 'brick'; // 가공품은 대상이 될 수 없음
    delete raw2.checksum;
    expect(() => decodeSave(JSON.stringify(raw2))).toThrow('퀘스트 정보 오류');
  });
});
