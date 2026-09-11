import { createSignal } from 'solid-js';
import { initial, advance, type Model } from '../engine/model';
import { decodeSave, SAVE_KEY } from '../engine/save';
let blocked = false;
function load() { try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw)
        return initial();
    const s = decodeSave(raw);
    const n = advance(s, Date.now());
    if (n)
        s.notice = `자리를 비운 동안 ${n.toLocaleString()}회 작업했습니다.`;
    return s;
}
catch {
    blocked = true;
    const s = initial();
    s.notice = '저장 데이터를 읽지 못했습니다. 원본 보호를 위해 자동 저장을 중단했습니다.';
    return s;
} }
const [state, setState] = createSignal<Model>(load());
export { state };
export function mutate(fn: (s: Model) => void) { const s = structuredClone(state()); advance(s, Date.now()); fn(s); setState(s); }
export function tick() { mutate(() => { }); }
export function saveGame() { if (blocked)
    return; try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state()));
}
catch {
    mutate(s => { s.notice = '저장 공간에 접근할 수 없습니다. 브라우저 설정을 확인해주세요.'; });
} }
