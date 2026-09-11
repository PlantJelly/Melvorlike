import { describe, expect, it } from 'vitest';
import { FoodDB } from '../content/foods';
import { ResourceDB, playable } from '../content/resources';
import { advance, begin, duration, eat, initial, upgrade } from './model';
import { decodeSave } from './save';

describe('낚시와 음식', () => {
  it('낚시 → 요리 → 섭취가 재료와 경험치, 작업 속도에 반영된다', () => {
    const s = initial(0);
    begin(s, 'fish_small');
    advance(s, 7000);
    expect(s.inventory.fish_small).toBe(2);
    expect(s.skills.fishing.exp).toBe(50);
    begin(s, 'grilled_fish');
    advance(s, 12000);
    expect(s.inventory.fish_small).toBe(0);
    expect(s.inventory.grilled_fish).toBe(1);
    expect(s.skills.cooking.exp).toBe(35);
    expect(s.currentAction).toBeNull();
    expect(eat(s, 'grilled_fish')).toBe(true);
    expect(s.inventory.grilled_fish).toBe(0);
    expect(duration(s, 'fish_small')).toBeCloseTo(3500 / 1.1);
    expect(duration(s, 'wood')).toBe(3000);
  });

  it('도구와 음식은 가산되고 음식 변경 시 진행률이 유지된다', () => {
    const s = initial(0);
    begin(s, 'fish_small');
    advance(s, 1750);
    s.inventory = {wood: 5, brick: 3, grilled_fish: 1};
    upgrade(s, 'fishing');
    eat(s, 'grilled_fish');
    expect(s.currentAction?.progressMs).toBe(1750);
    expect(duration(s, 'fish_small')).toBe(2800);
    advance(s, 3150);
    expect(s.inventory.fish_small).toBe(1);
  });

  it('같은 음식은 시간을 연장하고 다른 음식은 대체하며 중첩되지 않는다', () => {
    const s = initial(0);
    s.inventory = {grilled_fish: 7, fish_soup: 1};
    eat(s, 'grilled_fish');
    advance(s, 10000);
    eat(s, 'grilled_fish', 5);
    expect(s.meal?.remainingMs).toBe(3590000);
    expect(s.inventory.grilled_fish).toBe(1);
    eat(s, 'fish_soup');
    expect(s.meal).toEqual({foodId:'fish_soup', remainingMs:900000});
    expect(duration(s, 'fish_small')).toBeCloseTo(3500 / 1.05);
  });

  it('음식이 만료되는 긴 오프라인 구간도 작은 틱과 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      s.inventory.grilled_fish = 1;
      s.tools.fishing = 1;
      begin(s, 'fish_small');
      eat(s, 'grilled_fish');
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 700000);
    for (let t = 137; t < 700000; t += 137) advance(b, t);
    advance(b, 700000);
    expect(a.inventory).toEqual(b.inventory);
    expect(a.skills).toEqual(b.skills);
    expect(a.meal).toBeNull();
    expect(b.meal).toBeNull();
    expect(a.currentAction?.progressMs).toBeCloseTo(b.currentAction!.progressMs, 5);
    expect(a.inventory.fish_small).toBe(247);
  });

  it('만료 경계에서 작업 중간 진행량을 보존하고 새 속도로 이어간다', () => {
    const s = initial(0);
    s.inventory.grilled_fish = 1;
    eat(s, 'grilled_fish');
    s.meal!.remainingMs = 1000;
    begin(s, 'fish_small');
    advance(s, 1000);
    expect(s.meal).toBeNull();
    expect(s.currentAction?.progressMs).toBe(1100);
    advance(s, 3400);
    expect(s.inventory.fish_small).toBe(1);
    expect(s.currentAction?.progressMs).toBe(0);
  });

  it('작업이 없거나 재료가 고갈돼도 음식 시간은 흐른다', () => {
    const s = initial(0);
    s.inventory = {grilled_fish:1, fish_small:2};
    eat(s, 'grilled_fish');
    begin(s, 'grilled_fish');
    advance(s, 700000);
    expect(s.currentAction).toBeNull();
    expect(s.inventory.grilled_fish).toBe(1);
    expect(s.meal).toBeNull();
    eat(s, 'grilled_fish');
    advance(s, 1300000);
    expect(s.meal).toBeNull();
  });

  it('음식이 아닌 아이템, 잘못된 수량과 재고 부족은 소모하지 않는다', () => {
    const s = initial(0);
    s.inventory = {grilled_fish:2, wood:10};
    const before = structuredClone(s);
    for (const [id, n] of [['wood',1],['grilled_fish',5],['grilled_fish',-1],['grilled_fish',1.5],['toString',1]] as const) {
      expect(eat(s, id, n)).toBe(false);
    }
    expect(s).toEqual(before);
  });
});

describe('저장 이전과 콘텐츠 참조', () => {
  it('실제 v2 구조에서 요리를 추가하고 도구가 적용된 진행량을 변환한다', () => {
    const s = initial(0);
    const {cooking: _skill, ...skills} = s.skills;
    const {cooking: _tool, ...tools} = s.tools;
    const loaded = decodeSave(JSON.stringify({version:2, gold:1234, skills, tools:{...tools,logging:1}, inventory:{wood:8}, lastSaveTime:1000, currentAction:{resourceId:'wood',progressMs:1000}}));
    expect(loaded.version).toBe(4);
    expect(loaded.skills.cooking.level).toBe(1);
    expect(loaded.tools.cooking).toBe(0);
    expect(loaded.gold).toBe(1234);
    expect(loaded.currentAction?.progressMs).toBeCloseTo(1150);
    advance(loaded, 3000);
    expect(loaded.inventory.wood).toBe(9);
    expect(loaded.currentAction?.progressMs).toBeCloseTo(450);
  });

  it('음식을 먹은 상태를 저장해도 재접속에서 만료가 정확히 적용된다', () => {
    const s = initial(0);
    s.inventory.grilled_fish = 1;
    eat(s, 'grilled_fish');
    begin(s, 'fish_small');
    advance(s, 12345);
    const loaded = decodeSave(JSON.stringify(s));
    advance(s, 700000);
    advance(loaded, 700000);
    expect(loaded).toEqual({...s,notice:''});
    const count = loaded.inventory.fish_small;
    advance(loaded, 700000);
    expect(loaded.inventory.fish_small).toBe(count);
  });

  it('손상된 음식 효과와 v3 누락 필드는 거부한다', () => {
    const s = initial(0);
    for (const meal of [{foodId:'wood',remainingMs:1},{foodId:'grilled_fish',remainingMs:-1},{foodId:'constructor',remainingMs:1},{}]) {
      expect(() => decodeSave(JSON.stringify({...s,meal}))).toThrow();
    }
    expect(() => decodeSave(JSON.stringify({...s,skills:{}}))).toThrow();
    expect(() => decodeSave(JSON.stringify({...s,inventory:{constructor:1}}))).toThrow();
  });

  it('모든 레시피와 음식 효과가 실제 아이템과 스킬을 참조한다', () => {
    for (const r of Object.values(ResourceDB)) {
      expect(playable).toContain(r.skill);
      expect(r.baseDurationMs).toBeGreaterThan(0);
      for (const [id, n] of Object.entries(r.recipe ?? {})) {
        expect(ResourceDB[id]).toBeDefined();
        expect(n).toBeGreaterThan(0);
      }
    }
    for (const [id, food] of Object.entries(FoodDB)) {
      expect(ResourceDB[id].skill).toBe('cooking');
      for (const skill of food.skills) expect(playable).toContain(skill);
    }
  });
});
