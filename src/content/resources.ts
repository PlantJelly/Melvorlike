import type { ResourceDef, SkillId } from './types';
const row = (id: string, name: string, skill: SkillId, reqLevel: number, baseDurationMs: number, exp: number, sell: number, icon: string, recipe?: Record<string, number>): ResourceDef => ({ id, name, skill, reqLevel, baseDurationMs, exp, sell, buy: sell * 5, icon, recipe });
export const ResourceDB: Record<string, ResourceDef> = Object.fromEntries([
    row('wood', '나무', 'logging', 1, 3000, 25, 1, '🪵'), row('oak', '참나무', 'logging', 10, 5000, 60, 3, '🌳'),
    row('hardwood', '단단한 나무', 'logging', 30, 8000, 150, 12, '🌲'), row('magic_wood', '마법 나무', 'logging', 50, 12000, 400, 50, '✨'),
    row('stone', '돌', 'mining', 1, 4000, 25, 1, '🪨'), row('copper', '구리 광석', 'mining', 1, 5000, 35, 3, '⛏️'), row('iron', '철 광석', 'mining', 10, 7000, 70, 8, '⛏️'),
    row('brick', '돌 벽돌', 'blacksmithing', 1, 4000, 30, 5, '🧱', { stone: 2 }), row('copper_ingot', '구리 주괴', 'blacksmithing', 1, 6000, 40, 12, '▰', { copper: 3, wood: 1 }), row('iron_ingot', '철 주괴', 'blacksmithing', 10, 8000, 90, 30, '▰', { iron: 3, wood: 2 }),
    {...row('fish_small', '피라미', 'fishing', 1, 3500, 25, 2, '🐟'), area: '마을 개울'},
    {...row('fish_carp', '붕어', 'fishing', 10, 5500, 60, 5, '🐠'), area: '갈대 호수'},
    {...row('fish_salmon', '연어', 'fishing', 30, 8500, 150, 15, '🐟'), area: '상류 여울'},
    row('grilled_fish', '구운 생선', 'cooking', 1, 5000, 35, 5, '🍢', {fish_small: 2}),
    row('fish_soup', '민물 생선탕', 'cooking', 10, 7000, 75, 12, '🍲', {fish_carp: 2}),
    row('smoked_salmon', '훈제 연어', 'cooking', 30, 10000, 180, 35, '🍣', {fish_salmon: 2, wood: 1}),
    row('wheat', '밀', 'farming', 1, 180000, 30, 2, '🌾'),
    row('potato', '감자', 'farming', 10, 480000, 90, 5, '🥔'),
    row('carrot', '당근', 'farming', 25, 900000, 200, 9, '🥕'),
    row('egg', '달걀', 'ranching', 1, 1800000, 60, 4, '🥚'),
    row('wool', '양털', 'ranching', 15, 2700000, 150, 20, '🧶'),
    row('milk', '우유', 'ranching', 30, 3600000, 300, 8, '🥛')
].map(r => [r.id, r]));
// 수확 시 씨앗 1개를 심어 한 번에 돌려받는 개수. 재파종 분을 남기고 잉여를 판매/요리에 쓴다.
export const cropYield: Record<string, number> = { wheat: 3, potato: 3, carrot: 3 };
export const skillNames: Record<SkillId, string> = { logging: '벌목', mining: '채광', blacksmithing: '대장작업', fishing: '낚시', cooking: '요리', farming: '농사', ranching: '목장' };
export const playable: SkillId[] = ['logging', 'mining', 'blacksmithing', 'fishing', 'cooking', 'farming', 'ranching'];
// 액티브 단일 작업 슬롯을 쓰지 않고 항상 배경에서 병행 진행되는 스킬. begin()/저장 검증/화면 라우팅이 함께 참조한다.
export const passiveSkills: SkillId[] = ['farming', 'ranching'];
export const toolNames: Record<SkillId, string> = { logging: '도끼', mining: '곡괭이', blacksmithing: '망치', fishing: '낚싯대', cooking: '조리도구', farming: '괭이', ranching: '사료통' };
export const toolTiers: {
    name: string;
    level: number;
    bonus: number;
    cost: Record<string, number>;
}[] = [{ name: '맨손', level: 1, bonus: 0, cost: {} }, { name: '돌', level: 1, bonus: .15, cost: { wood: 5, brick: 3 } }, { name: '구리', level: 10, bonus: .35, cost: { wood: 10, copper_ingot: 5 } }, { name: '철', level: 30, bonus: .65, cost: { oak: 10, iron_ingot: 8 } }];
