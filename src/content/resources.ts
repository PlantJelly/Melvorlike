import type { ResourceDef, SkillId } from './types';
const row = (id: string, name: string, skill: SkillId, reqLevel: number, baseDurationMs: number, exp: number, sell: number, icon: string, recipe?: Record<string, number>): ResourceDef => ({ id, name, skill, reqLevel, baseDurationMs, exp, sell, buy: sell * 5, icon, recipe });
export const ResourceDB: Record<string, ResourceDef> = Object.fromEntries([
    row('wood', '나무', 'logging', 1, 3000, 25, 1, '🪵'), row('oak', '참나무', 'logging', 10, 5000, 60, 3, '🌳'),
    row('hardwood', '단단한 나무', 'logging', 30, 8000, 150, 12, '🌲'), row('magic_wood', '마법 나무', 'logging', 50, 12000, 400, 50, '✨'),
    // 채집 단계 격자(D049): Lv1·10·20·30·40·50·65·80·95. 새 단계의 경험치·판매가는 벌목 Lv1·10·30·50의 초당 값을
    // 기하 보간(50 이후는 30→50 기울기로 외삽)한 값 × 작업 시간. Lv65·80·95는 해당 구역 시설 4·6·8단계가 필요하다.
    row('pine', '소나무', 'logging', 20, 6500, 98, 6, '🌲'), row('birch', '자작나무', 'logging', 40, 10000, 250, 25, '🪵'),
    row('moon_wood', '달빛나무', 'logging', 65, 14000, 718, 126, '🌙'), row('star_wood', '별빛나무', 'logging', 80, 16000, 1264, 309, '⭐'),
    row('world_branch', '세계수 가지', 'logging', 95, 18000, 2190, 747, '🌳'),
    // 채광 경험치는 벌목과 같은 초당 경험치로 맞췄다(D049).
    row('stone', '돌', 'mining', 1, 4000, 33, 1, '🪨'), row('copper', '구리 광석', 'mining', 1, 5000, 42, 3, '⛏️'), row('iron', '철 광석', 'mining', 10, 7000, 84, 8, '⛏️'),
    row('gold_ore', '금 광석', 'mining', 50, 11000, 367, 35, '🟡'), row('mana_stone', '마나석', 'mining', 30, 9000, 169, 22, '🔷'),
    row('silver_ore', '은 광석', 'mining', 20, 8000, 120, 8, '⚪'), row('crystal', '수정 원석', 'mining', 40, 10000, 250, 25, '💎'),
    row('lapis', '청금석', 'mining', 65, 13000, 667, 117, '🔵'), row('star_ore', '별철 광석', 'mining', 80, 15000, 1185, 289, '🌠'),
    row('sunstone', '태양석', 'mining', 95, 17000, 2068, 706, '☀️'),
    row('brick', '돌 벽돌', 'blacksmithing', 1, 4000, 30, 5, '🧱', { stone: 2 }), row('copper_ingot', '구리 주괴', 'blacksmithing', 1, 6000, 40, 12, '▰', { copper: 3, coal: 1 }), row('iron_ingot', '철 주괴', 'blacksmithing', 10, 8000, 90, 30, '▰', { iron: 3, coal: 2 }),
    // 석탄은 모든 채광의 부산물(game_design §2.2 "전 광산 공통 드랍, 별도 탄광 없음"). 판매가는 나무 연료와 같게 둬 주괴 원가가 바뀌지 않게 했다.
    {...row('coal', '석탄', 'mining', 1, 4000, 0, 1, '⚫'), dropOnly: true},
    row('gold_ingot', '금 주괴', 'blacksmithing', 50, 12000, 320, 110, '▰', {gold_ore: 3, magic_wood: 1}),
    {...row('fish_small', '피라미', 'fishing', 1, 3500, 25, 2, '🐟'), area: '마을 개울'},
    {...row('fish_carp', '붕어', 'fishing', 10, 5500, 60, 5, '🐠'), area: '갈대 호수'},
    {...row('fish_salmon', '연어', 'fishing', 30, 8500, 150, 15, '🐟'), area: '상류 여울'},
    {...row('catfish', '메기', 'fishing', 20, 7000, 105, 7, '🐡'), area: '늪지 웅덩이'},
    {...row('trout', '송어', 'fishing', 40, 9500, 238, 24, '🐟'), area: '산속 계곡'},
    {...row('eel', '장어', 'fishing', 50, 11000, 367, 46, '🐍'), area: '강 하구'},
    {...row('sturgeon', '철갑상어', 'fishing', 65, 13000, 667, 117, '🐋'), area: '큰 호수'},
    {...row('tuna', '참치', 'fishing', 80, 15000, 1185, 289, '🐟'), area: '바다 절벽'},
    {...row('golden_carp', '황금 잉어', 'fishing', 95, 17000, 2068, 706, '🎏'), area: '신성한 연못'},
    row('grilled_fish', '구운 생선', 'cooking', 1, 5000, 35, 5, '🍢', {fish_small: 2}),
    row('fish_soup', '민물 생선탕', 'cooking', 10, 7000, 75, 12, '🍲', {fish_carp: 2}),
    row('smoked_salmon', '훈제 연어', 'cooking', 30, 10000, 180, 35, '🍣', {fish_salmon: 2, wood: 1}),
    row('steamed_egg', '달걀찜', 'cooking', 10, 7000, 75, 180, '🍮', {egg: 2}),
    // 보존제로 오래 가게 만든 음식 — 버프를 자주 갈아끼우지 않아도 되게 60분 지속(판매가는 D033 요리 비율 Lv30 1.129배).
    row('field_ration', '보존 식량', 'cooking', 30, 10000, 180, 215, '🥫', {preservative: 1, potato: 2, egg: 1}),
    row('vegetable_porridge', '야채죽', 'cooking', 1, 5000, 35, 264, '🥣', {potato: 2, carrot: 1}),
    row('lumberjack_lunchbox', '나무꾼 도시락', 'cooking', 15, 7000, 90, 209, '🍱', {potato: 1, carrot: 1, grilled_fish: 1}),
    row('miners_stew', '광부의 스튜', 'cooking', 15, 7000, 90, 1083, '🍛', {milk: 1, carrot: 2}),
    row('blacksmith_meal', '대장장이 정식', 'cooking', 25, 9000, 140, 962, '🍽️', {egg: 2, potato: 1, milk: 1}),
    row('festival_dish', '축제 요리', 'cooking', 40, 12000, 220, 986, '🎉', {potato: 1, carrot: 1, egg: 1, milk: 1, grilled_fish: 1}),
    // 농사·목장: D032 값(밭 1칸·동물 1마리 기준)에서 판매가 ×0.1, 경험치 농사 ×0.1·목장 ×0.05로 낮췄다 —
    // 밭 3칸·동물 9마리·도구 보너스로 병렬 생산량이 늘어난 만큼(D047). 파생 완제품 판매가는 D033 비율로 재계산.
    row('wheat', '밀', 'farming', 1, 180000, 133, 8, '🌾'),
    row('potato', '감자', 'farming', 10, 480000, 539, 39, '🥔'),
    row('carrot', '당근', 'farming', 25, 900000, 1490, 133, '🥕'),
    row('golden_corn', '황금옥수수', 'farming', 40, 1440000, 3490, 379, '🌽'),
    row('chamomile', '캐모마일', 'farming', 1, 240000, 178, 10, '🌼'),
    row('mugwort', '쑥', 'farming', 10, 540000, 606, 44, '🌿'),
    row('magic_mugwort', '마법쑥', 'farming', 25, 960000, 1590, 142, '🍃'),
    row('mystic_herb', '신비 허브', 'farming', 40, 1500000, 3640, 395, '☘️'),
    row('sapling_wood', '나무 묘목', 'farming', 1, 240000, 178, 10, '🌱'),
    row('sapling_oak', '참나무 묘목', 'farming', 10, 540000, 606, 44, '🌱'),
    row('sapling_hardwood', '단단한 나무 묘목', 'farming', 25, 960000, 1590, 142, '🌱'),
    row('sapling_magic', '마법 나무 묘목', 'farming', 40, 1500000, 3640, 395, '🌱'),
    row('egg', '달걀', 'ranching', 1, 1800000, 665, 75, '🥚'),
    row('wool', '양털', 'ranching', 15, 2700000, 1725, 268, '🧶'),
    row('milk', '우유', 'ranching', 30, 3600000, 3380, 650, '🥛'),
    row('enchant_stone_stone', '스톤급 마법부여석', 'magic', 1, 10000, 50, 84, '🔮', {chamomile: 2, mana_stone: 1}),
    row('enchant_stone_copper', '구리급 마법부여석', 'magic', 10, 14000, 120, 259, '🔮', {mugwort: 2, mana_stone: 2, copper_ingot: 1}),
    row('enchant_stone_iron', '철급 마법부여석', 'magic', 30, 20000, 280, 468, '🔮', {magic_mugwort: 2, mana_stone: 3, iron_ingot: 1}),
    row('enchant_stone_gold', '금급 마법부여석', 'magic', 50, 30000, 600, 873, '🔮', {mystic_herb: 2, mana_stone: 5, gold_ingot: 1}),
    row('wild_berry', '산딸기', 'foraging', 1, 3000, 25, 1, '🍓'),
    // 섬유(game_design §2.12 "재봉은 목장의 양털과 야외 채집의 섬유를 함께 소비") — 수치는 산딸기와 같다(D046).
    row('fiber', '섬유', 'foraging', 1, 3000, 25, 1, '🎋'), row('wild_mushroom', '들버섯', 'foraging', 10, 5000, 60, 3, '🍄'),
    row('wild_herb', '산약초', 'foraging', 30, 8000, 150, 12, '🌱'), row('rare_mushroom', '영지버섯', 'foraging', 50, 12000, 400, 50, '🌰'),
    // 채집 새 단계는 약재이자 섬유가 되는 식물이라 조제와 재봉이 함께 쓴다(수치는 벌목과 같음, D049).
    row('nettle', '쐐기풀', 'foraging', 20, 6500, 98, 6, '🌿'), row('flax', '아마', 'foraging', 40, 10000, 250, 25, '🌾'),
    row('silver_moss', '은빛 이끼', 'foraging', 65, 14000, 718, 126, '🍀'), row('silk_vine', '비단 덩굴', 'foraging', 80, 16000, 1264, 309, '🕸️'),
    row('fairy_flower', '요정 꽃', 'foraging', 95, 18000, 2190, 747, '🌸'),
    row('plank', '나무 판자', 'woodworking', 1, 4000, 30, 6, '▬', {wood: 3}), row('oak_plank', '참나무 판자', 'woodworking', 10, 6500, 95, 18, '▬', {oak: 3, wood: 1}),
    row('hardwood_beam', '단단한 들보', 'woodworking', 30, 9500, 230, 48, '▬', {hardwood: 3, oak: 1}), row('magic_frame', '마법 골조', 'woodworking', 50, 13500, 500, 140, '▬', {magic_wood: 3, hardwood: 1}),
    // 조제 보조재(game_design §2.11 "접착제·보존제·염료 + 제작 보조재"): 시설 조립·장신구 채색·보존 식량에 쓰인다.
    // 시간·경험치는 같은 레벨의 기존 조제 레시피, 판매가는 D033의 레벨별 판매가/원가 비율(2.0/1.8/1.2308)을 따른다.
    row('glue', '접착제', 'apothecary', 1, 4000, 30, 6, '🫙', {wild_berry: 2, wood: 1}),
    row('dye', '염료', 'apothecary', 10, 6500, 95, 14, '🎨', {wild_mushroom: 2, wild_berry: 2}),
    row('preservative', '보존제', 'apothecary', 30, 9500, 230, 37, '🧂', {wild_herb: 2, wild_mushroom: 2}),
    row('berry_tonic', '산딸기 물약', 'apothecary', 1, 4000, 30, 6, '🧪', {wild_berry: 3}), row('mushroom_balm', '들버섯 연고', 'apothecary', 10, 6500, 95, 18, '🧪', {wild_mushroom: 3, wild_berry: 1}),
    row('herb_elixir', '산약초 영약', 'apothecary', 30, 9500, 230, 48, '🧪', {wild_herb: 3, wild_mushroom: 1}), row('rare_remedy', '영지버섯 묘약', 'apothecary', 50, 13500, 500, 140, '🧪', {rare_mushroom: 3, wild_herb: 1}),
    // 재봉 자재(game_design §2.12 "밧줄·천 … 왕국 시설과 생산 보조품"): 축사·밭 시설에 쓰인다.
    // 재봉은 섬유가 주 재료이고 양털은 의복에만 1개씩 들어간다(D046) — 양털 공급만으로 재봉 레벨이 묶이지 않게.
    // 시간·경험치는 같은 레벨의 기존 재봉 레시피, 판매가는 D033 비율(2.0/1.8/1.2308/0.8642)을 따른다.
    row('rope', '밧줄', 'sewing', 1, 4000, 30, 6, '🪢', {fiber: 3}),
    row('cloth', '천', 'sewing', 10, 6500, 95, 32, '🧣', {fiber: 4, dye: 1}),
    row('wool_garment', '양털 옷', 'sewing', 1, 4000, 30, 542, '🧵', {fiber: 3, wool: 1}), row('trimmed_garment', '장식 의복', 'sewing', 10, 6500, 95, 511, '🧵', {fiber: 4, wool: 1, copper_ingot: 1}),
    row('reinforced_garment', '보강 의복', 'sewing', 30, 9500, 230, 373, '🧵', {fiber: 5, wool: 1, iron_ingot: 1}), row('enchanted_garment', '마법 의복', 'sewing', 50, 13500, 500, 332, '🧵', {fiber: 6, wool: 1, gold_ingot: 1})
].map(r => [r.id, r]));
// 수확 시 씨앗 1개를 심어 한 번에 돌려받는 개수. 재파종 분을 남기고 잉여를 판매/요리에 쓴다.
export const cropYield: Record<string, number> = { wheat: 3, potato: 3, carrot: 3, golden_corn: 3, chamomile: 3, mugwort: 3, magic_mugwort: 3, mystic_herb: 3 };
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
