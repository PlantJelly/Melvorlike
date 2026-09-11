import { initial, type Model } from './model';
import { ResourceDB, toolTiers } from '../content/resources';
export const SAVE_KEY = 'melvorlike_save';
export function decodeSave(text: string): Model {
    const raw = JSON.parse(text);
    if (!raw || ![1, 2].includes(raw.version))
        throw Error('지원하지 않는 저장 버전');
    const s = initial();
    const number = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
    if (!number(raw.gold) || !number(raw.lastSaveTime))
        throw Error('저장 값 오류');
    s.gold = raw.gold;
    s.lastSaveTime = raw.lastSaveTime;
    for (const id of Object.keys(s.skills) as (keyof Model['skills'])[]) {
        const k = raw.skills?.[id];
        if (!k || !number(k.level) || k.level < 1 || !Number.isInteger(k.level) || !number(k.exp) || !number(k.maxExp) || k.maxExp <= 0)
            throw Error('스킬 정보 오류');
        s.skills[id] = { level: Math.min(99, k.level), exp: k.exp, maxExp: k.maxExp };
    }
    if (raw.version === 2) {
        if (!raw.inventory || !raw.tools)
            throw Error('소지품 정보 오류');
        for (const [id, n] of Object.entries(raw.inventory)) {
            if (!ResourceDB[id] || !number(n) || !Number.isSafeInteger(n))
                throw Error('재료 정보 오류');
            s.inventory[id] = n as number;
        }
        for (const id of Object.keys(s.tools) as (keyof Model['tools'])[]) {
            const n = raw.tools[id];
            if (!Number.isInteger(n) || n < 0 || n >= toolTiers.length)
                throw Error('도구 정보 오류');
            s.tools[id] = n;
        }
        if (raw.currentAction) {
            const a = raw.currentAction, r = ResourceDB[a.resourceId];
            if (!r || !number(a.progressMs) || a.progressMs > r.baseDurationMs || s.skills[r.skill].level < r.reqLevel)
                throw Error('작업 정보 오류');
            s.currentAction = { resourceId: r.id, progressMs: a.progressMs };
        }
    }
    return s;
}
