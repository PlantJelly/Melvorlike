import { describe, expect, it } from 'vitest';
import { ResourceDB } from '../content/resources';
import { advance, completeDailyQuest, dailyQuestReward, generateDailyQuests, unlockedGame as initial } from './model';
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
    expect(generateDailyQuests(s, 0, () => 0)).toHaveLength(3); // 같은 난수만 반복해도 종료되고 중복되지 않음
  });

  it('날짜가 바뀌면 완료 여부와 무관하게 새 퀘스트로 교체되고, 같은 날에는 그대로 유지된다', () => {
    const s = initial(0);
    const quest0 = s.dailyQuests.quests[0];
    s.inventory[quest0.resourceId] = quest0.amount;
    expect(completeDailyQuest(s, 0, quest0.resourceId)).toBe(true);
    const afterComplete = s.dailyQuests.quests;
    advance(s, 1000); // 같은 날 안에서 시간만 흐름
    expect(s.dailyQuests.day).toBe(0);
    expect(s.dailyQuests.quests[0].done).toBe(true);
    expect(s.dailyQuests.quests).toBe(afterComplete); // 재생성되지 않고 같은 배열 그대로

    advance(s, DAY);
    expect(s.dailyQuests.day).toBe(1);
    expect(s.dailyQuests.quests.every(q => !q.done)).toBe(true); // 완료 여부와 무관하게 새 3개로 교체
  });

  it('요구량을 채우면 인벤토리를 소모하고 골드를 보상하며(장신구 판매가 보너스 포함), 다시 납품할 수 없다', () => {
    const s = initial(0);
    s.accessories.crown = {tier: 0, optionId: 'sale', rarity: 0}; // 하급 흥정 +5%
    const quest = s.dailyQuests.quests[0];
    const r = ResourceDB[quest.resourceId];
    s.inventory[quest.resourceId] = quest.amount;
    const goldBefore = s.gold;
    const expectedReward = Math.floor(quest.amount * r.sell * 2 * 1.05);
    expect(dailyQuestReward(s, quest)).toBe(expectedReward);
    expect(completeDailyQuest(s, 0, quest.resourceId)).toBe(true);
    expect(s.inventory[quest.resourceId]).toBe(0);
    expect(s.gold).toBe(goldBefore + expectedReward);
    expect(s.dailyQuests.quests[0].done).toBe(true);
    expect(completeDailyQuest(s, 0, quest.resourceId)).toBe(false); // 이미 완료
  });

  it('요구량 미달, 잘못된 인덱스, resourceId 불일치는 실패하고 아무것도 바뀌지 않는다', () => {
    const s = initial(0);
    const quest = s.dailyQuests.quests[0];
    s.inventory[quest.resourceId] = quest.amount - 1;
    expect(completeDailyQuest(s, 0, quest.resourceId)).toBe(false); // 요구량 미달
    s.inventory[quest.resourceId] = quest.amount;
    expect(completeDailyQuest(s, -1, quest.resourceId)).toBe(false); // 잘못된 인덱스
    expect(completeDailyQuest(s, 99, quest.resourceId)).toBe(false);
    expect(completeDailyQuest(s, 0, `not-${quest.resourceId}`)).toBe(false); // 화면이 보여준 것과 다른 재료로 확인(불일치)
    expect(s.inventory[quest.resourceId]).toBe(quest.amount);
    expect(s.gold).toBe(1000);
  });

  it('클릭 순간 날짜가 바뀌어 퀘스트가 통째로 교체돼도, resourceId가 다르면 엉뚱한 퀘스트를 완료하지 않는다', () => {
    const s = initial(0);
    const index = 1;
    const oldQuest = s.dailyQuests.quests[index];
    s.inventory[oldQuest.resourceId] = oldQuest.amount;
    for (let day = 1; day <= 100 && s.dailyQuests.quests[index].resourceId === oldQuest.resourceId; day++) {
      advance(s, DAY * day);
    }
    expect(s.dailyQuests.quests[index].resourceId).not.toBe(oldQuest.resourceId);
    expect(completeDailyQuest(s, index, oldQuest.resourceId)).toBe(false);
    expect(s.gold).toBe(1000);
    expect(s.inventory[oldQuest.resourceId]).toBe(oldQuest.amount);
  });

  it('v8 저장은 왕복 시 퀘스트 상태가 정확히 보존되고, v7 이전 저장은 복원된 실제 스킬 레벨로 새 퀘스트를 채운다', () => {
    const s = initial(0);
    s.inventory[s.dailyQuests.quests[0].resourceId] = s.dailyQuests.quests[0].amount;
    completeDailyQuest(s, 0, s.dailyQuests.quests[0].resourceId);
    const restored = decodeSave(encodeSave(s));
    expect(restored.dailyQuests).toEqual(s.dailyQuests);

    // 레벨 1에서는 나오지 않는 고레벨 채광 재료가 실제 생성 결과에 포함되도록 미리 레벨을 준 뒤 이전.
    const highLevel = initial(0);
    highLevel.skills.mining.level = 50;
    const {dailyQuests: _dq, ...withoutQuests} = JSON.parse(encodeSave(highLevel));
    const legacy = {...withoutQuests, version: 7};
    delete (legacy as Record<string, unknown>).checksum;
    const migrated = decodeSave(JSON.stringify(legacy));
    expect(migrated.skills.mining.level).toBe(50);
    expect(migrated.dailyQuests.quests).toEqual(generateDailyQuests(highLevel, 0));
    // 스킬 복원 전 레벨 1 상태로 뽑았다면 나왔을 후보군(레벨을 올리기 전의 highLevel)과
    // 실제 결과가 달라야, 재굴림이 복원된 레벨을 실제로 사용했다는 것이 (구체적으로 어떤
    // 재료가 뽑혔는지에 기대지 않고) 안정적으로 증명된다.
    expect(migrated.dailyQuests.quests).not.toEqual(generateDailyQuests(initial(0), 0));
  });

  it('시간이 거슬러 온 호출은 생산 정산 시계(lastSaveTime)와 같은 날짜 기준으로 퀘스트를 판단한다', () => {
    const s = initial(90_000_000); // dayId(90000000) = 1
    const day1Quests = s.dailyQuests.quests;
    advance(s, 5000); // dayId(5000) = 0 이지만 lastSaveTime은 절대 뒤로 가지 않는다
    expect(s.lastSaveTime).toBe(90_000_000);
    expect(s.dailyQuests.day).toBe(1); // 생산 시계와 같은 날짜 유지, 조용히 0일차로 되돌아가지 않음
    expect(s.dailyQuests.quests).toBe(day1Quests);
  });

  it('퀘스트 정보가 구조적으로 잘못되면(형식 오류·중복 재료) 거부한다', () => {
    const s = initial(0);
    const raw = JSON.parse(encodeSave(s));
    raw.dailyQuests.quests[0].amount = -1;
    delete raw.checksum;
    expect(() => decodeSave(JSON.stringify(raw))).toThrow('퀘스트 정보 오류');

    const raw2 = JSON.parse(encodeSave(s));
    raw2.dailyQuests.quests[0].resourceId = 'brick'; // 가공품은 대상이 될 수 없음
    delete raw2.checksum;
    expect(() => decodeSave(JSON.stringify(raw2))).toThrow('퀘스트 정보 오류');

    const raw3 = JSON.parse(encodeSave(s));
    raw3.dailyQuests.quests[1].resourceId = raw3.dailyQuests.quests[0].resourceId; // 중복 재료
    delete raw3.checksum;
    expect(() => decodeSave(JSON.stringify(raw3))).toThrow('퀘스트 정보 오류');

    const raw4 = JSON.parse(encodeSave(s));
    raw4.dailyQuests.quests.pop(); // 정상 저장은 매일 정확히 3개
    delete raw4.checksum;
    expect(() => decodeSave(JSON.stringify(raw4))).toThrow('퀘스트 정보 오류');

    const raw5 = JSON.parse(encodeSave(s));
    raw5.dailyQuests.quests[0].amount = 16; // 생성 범위 밖 수량
    delete raw5.checksum;
    expect(() => decodeSave(JSON.stringify(raw5))).toThrow('퀘스트 정보 오류');

    const raw6 = JSON.parse(encodeSave(s));
    raw6.dailyQuests.quests[0].resourceId = 'magic_wood'; // 현재 벌목 Lv1에서 잠긴 원재료
    delete raw6.checksum;
    expect(() => decodeSave(JSON.stringify(raw6))).toThrow('퀘스트 정보 오류');
  });
});
