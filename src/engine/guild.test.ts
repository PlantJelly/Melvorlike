import { describe, expect, it } from 'vitest';
import { ExchangeDB, exchangeRate, guildTiers } from '../content/guild';
import { ResourceDB } from '../content/resources';
import { buyResource, exchangeResource, unlockedGame as initial, upgradeGuild } from './model';
import { decodeSave } from './save';

describe('길드: 원재료 구매', () => {
  it('원재료를 구매하면 골드가 줄고 인벤토리가 는다 — 스킬과 무관하게 이미 해금된 재료면 가능', () => {
    const s = initial(0);
    expect(buyResource(s, 'wheat', 3)).toBe(true);
    expect(s.gold).toBe(1000 - 2 * 5 * 3);
    expect(s.inventory.wheat).toBe(3);
    expect(buyResource(s, 'wood', 1)).toBe(true); // 농사가 아닌 벌목 재료도 구매 가능
    expect(s.inventory.wood).toBe(1);
  });

  it('잘못된 수량, 존재하지 않는 아이템, 가공품, 미해금 재료, 골드 부족은 막는다', () => {
    const s = initial(0);
    expect(buyResource(s, 'wheat', 0)).toBe(false);
    expect(buyResource(s, 'wheat', -1)).toBe(false);
    expect(buyResource(s, 'missing', 1)).toBe(false);
    expect(buyResource(s, 'brick', 1)).toBe(false); // 가공품은 제작으로만
    expect(buyResource(s, 'potato', 1)).toBe(false); // 농사 Lv10 필요, 아직 Lv1
    const poor = initial(0);
    poor.gold = 5;
    expect(buyResource(poor, 'wheat', 1)).toBe(false);
  });

  it('골드가 정확히 비용만큼이면 구매할 수 있다', () => {
    const s = initial(0);
    s.gold = ResourceDB.wheat.buy; // 부족하지도 넉넉하지도 않은 정확한 경계
    expect(buyResource(s, 'wheat', 1)).toBe(true);
    expect(s.gold).toBe(0);
  });
});

describe('길드: 환전', () => {
  it('허용된 티어 차이만큼 환전하면 수량이 배율만큼 늘어 하위 재료로 바뀐다', () => {
    const s = initial(0);
    s.inventory.oak = 4;
    expect(exchangeResource(s, 'oak', 4)).toBe(true);
    expect(s.inventory.oak).toBe(0);
    expect(s.inventory.wood).toBe(Math.floor(4 * exchangeRate));
  });

  it('채집도 벌목/채광/낚시와 마찬가지로 상위 티어를 하위 티어(산딸기)로 환전할 수 있다', () => {
    const s = initial(0);
    s.inventory.wild_mushroom = 4;
    expect(exchangeResource(s, 'wild_mushroom', 4)).toBe(true);
    expect(s.inventory.wild_mushroom).toBe(0);
    expect(s.inventory.wild_berry).toBe(Math.floor(4 * exchangeRate));
  });

  it('길드 등급이 낮으면 깊은 티어 차이는 환전할 수 없고, 승급하면 가능해진다', () => {
    const s = initial(0);
    s.gold = 20000;
    s.inventory.hardwood = 4; // tierGap 2, 초급 길드(깊이 1)로는 불가
    expect(exchangeResource(s, 'hardwood', 4)).toBe(false);
    expect(s.inventory.hardwood).toBe(4);
    expect(upgradeGuild(s)).toBe(true); // 중급 길드, 깊이 2
    expect(s.guild).toBe(1);
    expect(exchangeResource(s, 'hardwood', 4)).toBe(true);
    expect(s.inventory.hardwood).toBe(0);
    expect(s.inventory.wood).toBe(Math.floor(4 * Math.pow(exchangeRate, 2)));
  });

  it('재고보다 많이 환전하거나 잘못된 수량, 대상이 아닌 아이템은 막는다', () => {
    const s = initial(0);
    s.inventory.oak = 2;
    expect(exchangeResource(s, 'oak', 3)).toBe(false);
    expect(exchangeResource(s, 'oak', 0)).toBe(false);
    expect(exchangeResource(s, 'oak', -1)).toBe(false);
    expect(exchangeResource(s, 'wood', 1)).toBe(false); // 최하위 재료는 환전 대상이 아님(역방향 경로 없음)
  });

  it('환전 후 되팔아도 원재료를 직접 파는 것보다 이득이 되지 않는다 — 순환 거래 방지', () => {
    for (const [id, ex] of Object.entries(ExchangeDB)) {
      const ratio = Math.pow(exchangeRate, ex.tierGap) * ResourceDB[ex.targetId].sell / ResourceDB[id].sell;
      expect(ratio).toBeLessThan(1);
    }
  });

  it('최하위 재료(wood/stone/fish_small/wild_berry)는 환전 대상 목록에 없다 — 역방향 경로가 구조적으로 존재하지 않는다', () => {
    for (const baseline of ['wood', 'stone', 'fish_small', 'wild_berry']) {
      expect(Object.hasOwn(ExchangeDB, baseline)).toBe(false);
    }
  });

  it('모든 환전 항목이 실제로 같은 스킬 안에서 더 낮은 티어를 가리킨다', () => {
    for (const [id, ex] of Object.entries(ExchangeDB)) {
      expect(ResourceDB[id]).toBeDefined();
      const target = ResourceDB[ex.targetId];
      expect(target).toBeDefined();
      expect(target.skill).toBe(ResourceDB[id].skill);
      expect(target.reqLevel).toBeLessThan(ResourceDB[id].reqLevel);
      expect(ex.tierGap).toBeGreaterThan(0);
    }
  });
});

describe('길드: 등급 승급', () => {
  it('골드를 내고 승급하면 환전 가능 깊이가 늘고, 골드가 부족하거나 최고 등급이면 막는다', () => {
    const s = initial(0);
    s.gold = 20000;
    expect(s.guild).toBe(0);
    const poor = initial(0);
    poor.gold = 100;
    expect(upgradeGuild(poor)).toBe(false);
    expect(upgradeGuild(s)).toBe(true);
    expect(s.guild).toBe(1);
    expect(upgradeGuild(s)).toBe(true);
    expect(s.guild).toBe(2);
    expect(upgradeGuild(s)).toBe(false); // guildTiers 범위를 벗어남
    expect(s.guild).toBe(guildTiers.length - 1);
  });

  it('골드가 정확히 승급 비용만큼이면 승급할 수 있다', () => {
    const s = initial(0);
    s.gold = guildTiers[1].goldCost; // 부족하지도 넉넉하지도 않은 정확한 경계
    expect(upgradeGuild(s)).toBe(true);
    expect(s.gold).toBe(0);
    expect(s.guild).toBe(1);
  });
});

describe('길드: 저장 이전', () => {
  it('v5 저장을 불러오면 길드는 기본값으로 시작하고, v6 저장은 길드 등급을 복원한다', () => {
    const s = initial(0);
    const loaded = decodeSave(JSON.stringify({version: 5, gold: 500, skills: s.skills, tools: s.tools, inventory: {}, currentAction: null, meal: null, farmPlot: null, ranch: {}, lastSaveTime: 0}));
    expect(loaded.version).toBe(20);
    expect(loaded.guild).toBe(0);

    const s2 = initial(0);
    s2.gold = 20000;
    upgradeGuild(s2);
    const loaded2 = decodeSave(JSON.stringify(s2));
    expect(loaded2.guild).toBe(1);
  });

  it('손상된 길드 정보는 거부한다', () => {
    const s = initial(0);
    for (const guild of [-1, 1.5, guildTiers.length, 'x']) {
      expect(() => decodeSave(JSON.stringify({...s, guild}))).toThrow();
    }
  });
});
