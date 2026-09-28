import { describe, expect, it } from 'vitest';
import { advance, begin, duration, eat, harvest, plant, unlockedGame as initial } from './model';

describe('농사·목장 산출물을 쓰는 요리', () => {
  it('야채죽: 감자·당근으로 제작해 먹으면 액티브뿐 아니라 패시브 스킬(농사)도 함께 빨라진다', () => {
    const s = initial(0);
    s.inventory = {potato: 2, carrot: 1};
    begin(s, 'vegetable_porridge');
    advance(s, 5000);
    expect(s.inventory.potato).toBe(0);
    expect(s.inventory.carrot).toBe(0);
    expect(s.inventory.vegetable_porridge).toBe(1);
    expect(eat(s, 'vegetable_porridge')).toBe(true);
    expect(duration(s, 'wood')).toBeCloseTo(3000 / 1.05);
    expect(duration(s, 'wheat')).toBeCloseTo(180000 / 1.05); // 농사도 '전 스킬'에 포함
  });

  it('나무꾼 도시락: 감자·당근·구운 생선으로 제작해 먹으면 벌목만 빨라진다', () => {
    const s = initial(0);
    s.skills.cooking.level = 15;
    s.inventory = {potato: 1, carrot: 1, grilled_fish: 1};
    begin(s, 'lumberjack_lunchbox');
    advance(s, 7000);
    expect(s.inventory.lumberjack_lunchbox).toBe(1);
    eat(s, 'lumberjack_lunchbox');
    expect(duration(s, 'wood')).toBeCloseTo(3000 / 1.15);
    expect(duration(s, 'stone')).toBe(4000); // 채광은 대상이 아님
  });

  it('광부의 스튜: 우유·당근으로 제작해 먹으면 채광만 빨라진다', () => {
    const s = initial(0);
    s.skills.cooking.level = 15;
    s.inventory = {milk: 1, carrot: 2};
    begin(s, 'miners_stew');
    advance(s, 7000);
    expect(s.inventory.miners_stew).toBe(1);
    eat(s, 'miners_stew');
    expect(duration(s, 'stone')).toBeCloseTo(4000 / 1.15);
    expect(duration(s, 'wood')).toBe(3000);
  });

  it('대장장이 정식: 달걀·감자·우유로 제작해 먹으면 대장작업만 빨라진다', () => {
    const s = initial(0);
    s.skills.cooking.level = 25;
    s.inventory = {egg: 2, potato: 1, milk: 1};
    begin(s, 'blacksmith_meal');
    advance(s, 9000);
    expect(s.inventory.blacksmith_meal).toBe(1);
    eat(s, 'blacksmith_meal');
    expect(duration(s, 'brick')).toBeCloseTo(4000 / 1.15);
  });

  it('축제 요리: 감자·당근·달걀·우유·구운 생선으로 제작해 먹으면 전 스킬이 빨라지고 기존 버프를 대체한다', () => {
    const s = initial(0);
    s.skills.cooking.level = 40;
    s.inventory = {potato: 1, carrot: 1, egg: 1, milk: 1, grilled_fish: 2};
    eat(s, 'grilled_fish'); // 먼저 낚시 버프를 걸어둔다
    expect(s.meal?.foodId).toBe('grilled_fish');
    begin(s, 'festival_dish');
    advance(s, 12000);
    expect(s.inventory.festival_dish).toBe(1);
    eat(s, 'festival_dish');
    expect(s.meal?.foodId).toBe('festival_dish'); // 대체, 중첩 없음
    expect(duration(s, 'wood')).toBeCloseTo(3000 / 1.1);
    expect(duration(s, 'egg')).toBeCloseTo(1800000 / 1.1); // 목장도 '전 스킬'에 포함
  });

  it('달걀찜: 달걀 2개로 제작해 먹으면 속도는 그대로, 경험치만 10% 늘어난다', () => {
    const s = initial(0);
    s.skills.cooking.level = 10;
    s.inventory = {egg: 2};
    begin(s, 'steamed_egg');
    advance(s, 7000);
    expect(s.inventory.egg).toBe(0);
    expect(s.inventory.steamed_egg).toBe(1);
    expect(eat(s, 'steamed_egg')).toBe(true);
    expect(duration(s, 'wood')).toBe(3000);
    begin(s, 'wood');
    advance(s, 10000);
    expect(s.skills.logging.exp).toBeCloseTo(25 * 1.1);
  });

  it('달걀찜 효과는 만료 시점 이후의 오프라인 작업에는 붙지 않는다', () => {
    const s = initial(0);
    s.meal = {foodId: 'steamed_egg', remainingMs: 3000};
    begin(s, 'wood');
    advance(s, 6000);
    expect(s.inventory.wood).toBe(2);
    expect(s.skills.logging.exp).toBeCloseTo(25 * 1.1 + 25);
    expect(s.meal).toBeNull();
  });

  it('달걀찜 효과는 직접 수확하는 농사 경험치에도 적용된다', () => {
    const harvested = (withMeal: boolean) => {
      const s = initial(0);
      s.inventory.wheat = 1;
      plant(s, 'wheat');
      advance(s, 180000);
      if (withMeal) s.meal = {foodId: 'steamed_egg', remainingMs: 600000};
      harvest(s);
      return s.skills.farming;
    };
    const boosted = harvested(true);
    const plain = harvested(false);
    expect(boosted.level > plain.level || (boosted.level === plain.level && boosted.exp > plain.exp)).toBe(true);
  });

  it('기존 생선 레시피는 그대로 보존된다', () => {
    const s = initial(0);
    s.inventory.fish_small = 2;
    begin(s, 'grilled_fish');
    advance(s, 5000);
    expect(s.inventory.grilled_fish).toBe(1);
    expect(eat(s, 'grilled_fish')).toBe(true);
    expect(duration(s, 'fish_small')).toBeCloseTo(3500 / 1.1);
  });
});
