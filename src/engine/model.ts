import { ResourceDB, toolTiers } from '../content/resources';
import type { SkillId } from '../content/types';
export interface Model {
    version: 2;
    gold: number;
    skills: Record<SkillId, {
        level: number;
        exp: number;
        maxExp: number;
    }>;
    inventory: Record<string, number>;
    tools: Record<SkillId, number>;
    currentAction: {
        resourceId: string;
        progressMs: number;
    } | null;
    lastSaveTime: number;
    notice: string;
}
export function initial(time = Date.now()): Model { const skill = () => ({ level: 1, exp: 0, maxExp: 100 }); return { version: 2, gold: 1000, skills: { logging: skill(), mining: skill(), fishing: skill(), blacksmithing: skill() }, inventory: {}, tools: { logging: 0, mining: 0, fishing: 0, blacksmithing: 0 }, currentAction: null, lastSaveTime: time, notice: '' }; }
export function duration(s: Model, id: string) { const r = ResourceDB[id]; return r.baseDurationMs / (1 + toolTiers[s.tools[r.skill]].bonus); }
export function afford(s: Model, cost: Record<string, number>) { return Object.entries(cost).every(([id, n]) => (s.inventory[id] ?? 0) >= n); }
function spend(s: Model, cost: Record<string, number>, count = 1) { for (const [id, n] of Object.entries(cost))
    s.inventory[id] -= n * count; }
export function advance(s: Model, time: number) {
    const elapsed = Math.max(0, time - s.lastSaveTime);
    s.lastSaveTime = Math.max(time, s.lastSaveTime);
    const a = s.currentAction;
    if (!a)
        return 0;
    const r = ResourceDB[a.resourceId], ms = duration(s, r.id);
    a.progressMs += elapsed;
    let count = Math.floor(a.progressMs / ms);
    if (!count)
        return 0;
    if (r.recipe)
        count = Math.min(count, ...Object.entries(r.recipe).map(([id, n]) => Math.floor((s.inventory[id] ?? 0) / n)));
    if (count) {
        if (r.recipe)
            spend(s, r.recipe, count);
        s.inventory[r.id] = (s.inventory[r.id] ?? 0) + count;
        const skill = s.skills[r.skill];
        skill.exp += r.exp * count;
        while (skill.level < 99 && skill.exp >= skill.maxExp) {
            skill.exp -= skill.maxExp;
            skill.level++;
            skill.maxExp = Math.floor(100 * Math.pow(1.12, skill.level - 1));
        }
        if (skill.level === 99)
            skill.exp = Math.min(skill.exp, skill.maxExp);
        a.progressMs -= count * ms;
    }
    if (r.recipe && !afford(s, r.recipe)) {
        s.currentAction = null;
        s.notice = '재료가 부족해 제작을 멈췄습니다.';
    }
    return count;
}
export function begin(s: Model, id: string) { const r = ResourceDB[id]; if (!r || s.skills[r.skill].level < r.reqLevel || !afford(s, r.recipe ?? {}))
    return false; s.currentAction = { resourceId: id, progressMs: 0 }; s.notice = ''; return true; }
export function upgrade(s: Model, skill: SkillId) { const tier = toolTiers[s.tools[skill] + 1]; if (!tier || s.skills[skill].level < tier.level || !afford(s, tier.cost))
    return false; spend(s, tier.cost); s.tools[skill]++; return true; }
export function sell(s: Model, id: string, count: number) { if (!ResourceDB[id] || !Number.isInteger(count) || count <= 0 || (s.inventory[id] ?? 0) < count)
    return false; s.inventory[id] -= count; s.gold += ResourceDB[id].sell * count; return true; }
