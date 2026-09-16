import type { ResourceDef, SkillId } from './types';
const row = (id: string, name: string, skill: SkillId, reqLevel: number, baseDurationMs: number, exp: number, sell: number, icon: string, recipe?: Record<string, number>): ResourceDef => ({ id, name, skill, reqLevel, baseDurationMs, exp, sell, buy: sell * 5, icon, recipe });
export const ResourceDB: Record<string, ResourceDef> = Object.fromEntries([
    row('wood', '나무', 'logging', 1, 3000, 25, 1, '🪵'), row('oak', '참나무', 'logging', 10, 5000, 60, 3, '🌳'),
    row('hardwood', '단단한 나무', 'logging', 30, 8000, 150, 12, '🌲'), row('magic_wood', '마법 나무', 'logging', 50, 12000, 400, 50, '✨'),
    row('stone', '돌', 'mining', 1, 4000, 25, 1, '🪨'), row('copper', '구리 광석', 'mining', 1, 5000, 35, 3, '⛏️'), row('iron', '철 광석', 'mining', 10, 7000, 70, 8, '⛏️'),
    row('gold_ore', '금 광석', 'mining', 50, 11000, 300, 35, '🟡'), row('mana_stone', '마나석', 'mining', 30, 9000, 180, 22, '🔷'),
    row('brick', '돌 벽돌', 'blacksmithing', 1, 4000, 30, 5, '🧱', { stone: 2 }), row('copper_ingot', '구리 주괴', 'blacksmithing', 1, 6000, 40, 12, '▰', { copper: 3, wood: 1 }), row('iron_ingot', '철 주괴', 'blacksmithing', 10, 8000, 90, 30, '▰', { iron: 3, wood: 2 }),
    row('gold_ingot', '금 주괴', 'blacksmithing', 50, 12000, 320, 110, '▰', {gold_ore: 3, magic_wood: 1}),
    {...row('fish_small', '피라미', 'fishing', 1, 3500, 25, 2, '🐟'), area: '마을 개울'},
    {...row('fish_carp', '붕어', 'fishing', 10, 5500, 60, 5, '🐠'), area: '갈대 호수'},
    {...row('fish_salmon', '연어', 'fishing', 30, 8500, 150, 15, '🐟'), area: '상류 여울'},
    row('grilled_fish', '구운 생선', 'cooking', 1, 5000, 35, 5, '🍢', {fish_small: 2}),
    row('fish_soup', '민물 생선탕', 'cooking', 10, 7000, 75, 12, '🍲', {fish_carp: 2}),
    row('smoked_salmon', '훈제 연어', 'cooking', 30, 10000, 180, 35, '🍣', {fish_salmon: 2, wood: 1}),
    row('vegetable_porridge', '야채죽', 'cooking', 1, 5000, 35, 6, '🥣', {potato: 2, carrot: 1}),
    row('lumberjack_lunchbox', '나무꾼 도시락', 'cooking', 15, 7000, 90, 15, '🍱', {potato: 1, carrot: 1, grilled_fish: 1}),
    row('miners_stew', '광부의 스튜', 'cooking', 15, 7000, 90, 15, '🍛', {milk: 1, carrot: 2}),
    row('blacksmith_meal', '대장장이 정식', 'cooking', 25, 9000, 140, 25, '🍽️', {egg: 2, potato: 1, milk: 1}),
    row('festival_dish', '축제 요리', 'cooking', 40, 12000, 220, 45, '🎉', {potato: 1, carrot: 1, egg: 1, milk: 1, grilled_fish: 1}),
    row('wheat', '밀', 'farming', 1, 180000, 1330, 75, '🌾'),
    row('potato', '감자', 'farming', 10, 480000, 5390, 390, '🥔'),
    row('carrot', '당근', 'farming', 25, 900000, 14900, 1330, '🥕'),
    row('chamomile', '캐모마일', 'farming', 1, 240000, 1780, 100, '🌼'),
    row('mugwort', '쑥', 'farming', 10, 540000, 6060, 440, '🌿'),
    row('magic_mugwort', '마법쑥', 'farming', 25, 960000, 15900, 1420, '🍃'),
    row('mystic_herb', '신비 허브', 'farming', 40, 1500000, 36400, 3950, '☘️'),
    row('egg', '달걀', 'ranching', 1, 1800000, 13300, 750, '🥚'),
    row('wool', '양털', 'ranching', 15, 2700000, 34500, 2680, '🧶'),
    row('milk', '우유', 'ranching', 30, 3600000, 67600, 6500, '🥛'),
    row('enchant_stone_stone', '스톤급 마법부여석', 'magic', 1, 10000, 50, 40, '🔮', {chamomile: 2, mana_stone: 1}),
    row('enchant_stone_copper', '구리급 마법부여석', 'magic', 10, 14000, 120, 100, '🔮', {mugwort: 2, mana_stone: 2, copper_ingot: 1}),
    row('enchant_stone_iron', '철급 마법부여석', 'magic', 30, 20000, 280, 260, '🔮', {magic_mugwort: 2, mana_stone: 3, iron_ingot: 1}),
    row('enchant_stone_gold', '금급 마법부여석', 'magic', 50, 30000, 600, 700, '🔮', {mystic_herb: 2, mana_stone: 5, gold_ingot: 1}),
    row('wild_berry', '산딸기', 'foraging', 1, 3000, 25, 1, '🍓'), row('wild_mushroom', '들버섯', 'foraging', 10, 5000, 60, 3, '🍄'),
    row('wild_herb', '산약초', 'foraging', 30, 8000, 150, 12, '🌱'), row('rare_mushroom', '영지버섯', 'foraging', 50, 12000, 400, 50, '🌰'),
    row('plank', '나무 판자', 'woodworking', 1, 4000, 30, 6, '▬', {wood: 3}), row('oak_plank', '참나무 판자', 'woodworking', 10, 6500, 95, 18, '▬', {oak: 3, wood: 1}),
    row('hardwood_beam', '단단한 들보', 'woodworking', 30, 9500, 230, 48, '▬', {hardwood: 3, oak: 1}), row('magic_frame', '마법 골조', 'woodworking', 50, 13500, 500, 140, '▬', {magic_wood: 3, hardwood: 1}),
    row('berry_tonic', '산딸기 물약', 'apothecary', 1, 4000, 30, 6, '🧪', {wild_berry: 3}), row('mushroom_balm', '들버섯 연고', 'apothecary', 10, 6500, 95, 18, '🧪', {wild_mushroom: 3, wild_berry: 1}),
    row('herb_elixir', '산약초 영약', 'apothecary', 30, 9500, 230, 48, '🧪', {wild_herb: 3, wild_mushroom: 1}), row('rare_remedy', '영지버섯 묘약', 'apothecary', 50, 13500, 500, 140, '🧪', {rare_mushroom: 3, wild_herb: 1}),
    row('wool_garment', '양털 옷', 'sewing', 1, 4000, 30, 6, '🧵', {wool: 3}), row('trimmed_garment', '장식 의복', 'sewing', 10, 6500, 95, 18, '🧵', {wool: 4, copper_ingot: 1}),
    row('reinforced_garment', '보강 의복', 'sewing', 30, 9500, 230, 48, '🧵', {wool: 5, iron_ingot: 1}), row('enchanted_garment', '마법 의복', 'sewing', 50, 13500, 500, 140, '🧵', {wool: 6, gold_ingot: 1})
].map(r => [r.id, r]));
// 수확 시 씨앗 1개를 심어 한 번에 돌려받는 개수. 재파종 분을 남기고 잉여를 판매/요리에 쓴다.
export const cropYield: Record<string, number> = { wheat: 3, potato: 3, carrot: 3, chamomile: 3, mugwort: 3, magic_mugwort: 3, mystic_herb: 3 };
export const skillNames: Record<SkillId, string> = { logging: '벌목', mining: '채광', blacksmithing: '대장작업', fishing: '낚시', cooking: '요리', farming: '농사', ranching: '목장', magic: '마법', foraging: '채집', woodworking: '목공', apothecary: '조제', sewing: '재봉' };
export const playable: SkillId[] = ['logging', 'mining', 'blacksmithing', 'fishing', 'cooking', 'farming', 'ranching', 'magic', 'foraging', 'woodworking', 'apothecary', 'sewing'];
// 액티브 단일 작업 슬롯을 쓰지 않고 항상 배경에서 병행 진행되는 스킬. begin()/저장 검증/화면 라우팅이 함께 참조한다.
export const passiveSkills: SkillId[] = ['farming', 'ranching'];
export const toolNames: Record<SkillId, string> = { logging: '도끼', mining: '곡괭이', blacksmithing: '망치', fishing: '낚싯대', cooking: '조리도구', farming: '괭이', ranching: '사료통', magic: '마법봉', foraging: '바구니', woodworking: '대패', apothecary: '절구', sewing: '바늘' };
export const toolTiers: {
    name: string;
    level: number;
    bonus: number;
    cost: Record<string, number>;
}[] = [{ name: '맨손', level: 1, bonus: 0, cost: {} }, { name: '돌', level: 1, bonus: .15, cost: { wood: 5, brick: 3 } }, { name: '구리', level: 10, bonus: .35, cost: { wood: 10, copper_ingot: 5 } }, { name: '철', level: 30, bonus: .65, cost: { oak: 10, iron_ingot: 8 } }];
