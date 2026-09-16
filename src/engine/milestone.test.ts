import { describe, expect, it } from 'vitest';
import { milestones, type MilestoneId } from '../content/guild';
import { claimMilestone, exchangeResource, unlockedGame as initial, milestoneReady } from './model';
import { decodeSave, encodeSave } from './save';

function progressFor(s: ReturnType<typeof initial>, id: MilestoneId) {
  switch (id) {
    case 'first_gather': s.skills.logging.exp = 1; break;
    case 'any_skill_10': s.skills.mining.level = 10; break;
    case 'first_tool': s.tools.fishing = 1; break;
    case 'first_meal': s.skills.cooking.exp = 1; break;
    case 'first_animal': s.ranch.chicken = 0; break;
    case 'first_harvest': s.skills.farming.exp = 1; break;
    case 'first_exchange': s.milestones.exchangeUsed = true; break;
    case 'any_skill_50': s.skills.blacksmithing.level = 50; break;
    case 'first_enchantment_stone': s.skills.magic.exp = 1; break;
  }
}

function uncheckedSave(s = initial(0)) {
  const raw = JSON.parse(encodeSave(s));
  delete raw.checksum;
  return raw;
}

describe('길드: 마일스톤 퀘스트', () => {
  it('기획된 9개 목표가 각각 영구 진행 상태로 달성된다', () => {
    expect(milestones).toHaveLength(9);
    for (const milestone of milestones) {
      const s = initial(0);
      expect(milestoneReady(s, milestone.id)).toBe(false);
      progressFor(s, milestone.id);
      expect(milestoneReady(s, milestone.id)).toBe(true);
    }
  });

  it('달성한 목표만 정확한 골드를 한 번 받을 수 있다', () => {
    const s = initial(0);
    const milestone = milestones[0];
    expect(claimMilestone(s, milestone.id)).toBe(false);
    progressFor(s, milestone.id);
    const before = s.gold;
    expect(claimMilestone(s, milestone.id)).toBe(true);
    expect(s.gold).toBe(before + milestone.reward);
    expect(s.milestones.claimed).toEqual([milestone.id]);
    expect(claimMilestone(s, milestone.id)).toBe(false);
    expect(s.gold).toBe(before + milestone.reward);
  });

  it('실패한 환전은 기록하지 않고 성공한 환전만 첫 환전 목표를 연다', () => {
    const s = initial(0);
    s.inventory.oak = 2;
    expect(exchangeResource(s, 'oak', 3)).toBe(false);
    expect(s.milestones.exchangeUsed).toBe(false);
    expect(milestoneReady(s, 'first_exchange')).toBe(false);
    expect(exchangeResource(s, 'oak', 2)).toBe(true);
    expect(s.milestones.exchangeUsed).toBe(true);
    expect(milestoneReady(s, 'first_exchange')).toBe(true);
  });

  it('v8 저장은 기존 진행을 유지해 판별 가능한 목표를 즉시 열고 새 상태는 비어 있다', () => {
    const s = initial(0);
    s.skills.logging.exp = 1;
    s.skills.cooking.level = 10;
    s.tools.mining = 1;
    s.ranch.chicken = 0;
    const raw = uncheckedSave(s);
    raw.version = 8;
    delete raw.milestones;

    const loaded = decodeSave(JSON.stringify(raw));
    expect(loaded.version).toBe(16);
    expect(loaded.milestones).toEqual({claimed: [], exchangeUsed: false});
    expect(milestoneReady(loaded, 'first_gather')).toBe(true);
    expect(milestoneReady(loaded, 'any_skill_10')).toBe(true);
    expect(milestoneReady(loaded, 'first_tool')).toBe(true);
    expect(milestoneReady(loaded, 'first_animal')).toBe(true);
    expect(milestoneReady(loaded, 'first_exchange')).toBe(false);
  });

  it('v9 저장은 수령 목록과 환전 플래그를 왕복한다', () => {
    const s = initial(0);
    progressFor(s, 'first_gather');
    progressFor(s, 'first_exchange');
    expect(claimMilestone(s, 'first_gather')).toBe(true);
    expect(claimMilestone(s, 'first_exchange')).toBe(true);
    expect(decodeSave(encodeSave(s)).milestones).toEqual(s.milestones);
  });

  it('알 수 없거나 중복된 수령 id, 잘못된 플래그와 달성하지 않은 수령 기록은 거부한다', () => {
    const unknown = uncheckedSave();
    unknown.milestones.claimed = ['missing'];
    expect(() => decodeSave(JSON.stringify(unknown))).toThrow('마일스톤 정보 오류');

    const duplicate = uncheckedSave();
    duplicate.skills.logging.exp = 1;
    duplicate.milestones.claimed = ['first_gather', 'first_gather'];
    expect(() => decodeSave(JSON.stringify(duplicate))).toThrow('마일스톤 정보 오류');

    const badFlag = uncheckedSave();
    badFlag.milestones.exchangeUsed = 'yes';
    expect(() => decodeSave(JSON.stringify(badFlag))).toThrow('마일스톤 정보 오류');

    const impossibleClaim = uncheckedSave();
    impossibleClaim.milestones.claimed = ['first_exchange'];
    expect(() => decodeSave(JSON.stringify(impossibleClaim))).toThrow('마일스톤 정보 오류');
  });
});
