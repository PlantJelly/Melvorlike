import type { ResourceDef, SkillId } from './types';
const row = (id: string, name: string, skill: SkillId, reqLevel: number, baseDurationMs: number, exp: number, sell: number, icon: string, recipe?: Record<string, number>): ResourceDef => ({ id, name, skill, reqLevel, baseDurationMs, exp, sell, buy: sell * 5, icon, recipe });
export const ResourceDB: Record<string, ResourceDef> = Object.fromEntries([
    row('wood', '나무', 'logging', 1, 3000, 25, 1, '🪵'), row('oak', '참나무', 'logging', 10, 5000, 60, 3, '🌳'),
    row('hardwood', '단단한 나무', 'logging', 30, 8000, 150, 12, '🌲'), row('magic_wood', '마법 나무', 'logging', 50, 12000, 400, 50, '✨'),
    row('stone', '돌', 'mining', 1, 4000, 25, 1, '🪨'), row('copper', '구리 광석', 'mining', 1, 5000, 35, 3, '⛏️'), row('iron', '철 광석', 'mining', 10, 7000, 70, 8, '⛏️'),
    row('brick', '돌 벽돌', 'blacksmithing', 1, 4000, 30, 5, '🧱', { stone: 2 }), row('copper_ingot', '구리 주괴', 'blacksmithing', 1, 6000, 40, 12, '▰', { copper: 3, wood: 1 }), row('iron_ingot', '철 주괴', 'blacksmithing', 10, 8000, 90, 30, '▰', { iron: 3, wood: 2 })
].map(r => [r.id, r]));
export const skillNames: Record<SkillId, string> = { logging: '벌목', mining: '채광', blacksmithing: '대장작업', fishing: '낚시' };
export const playable: SkillId[] = ['logging', 'mining', 'blacksmithing'];
export const toolNames: Record<SkillId, string> = { logging: '도끼', mining: '곡괭이', blacksmithing: '망치', fishing: '낚싯대' };
export const toolTiers: {
    name: string;
    level: number;
    bonus: number;
    cost: Record<string, number>;
}[] = [{ name: '맨손', level: 1, bonus: 0, cost: {} }, { name: '돌', level: 1, bonus: .15, cost: { wood: 5, brick: 3 } }, { name: '구리', level: 10, bonus: .35, cost: { wood: 10, copper_ingot: 5 } }, { name: '철', level: 30, bonus: .65, cost: { oak: 10, iron_ingot: 8 } }];
