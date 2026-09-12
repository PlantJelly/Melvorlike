import { createSignal } from 'solid-js';
import { initial, advance, type Model } from '../engine/model';
import { decodeSave, encodeSave, SAVE_KEY } from '../engine/save';
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
    localStorage.setItem(SAVE_KEY, encodeSave(state()));
}
catch {
    mutate(s => { s.notice = '저장 공간에 접근할 수 없습니다. 브라우저 설정을 확인해주세요.'; });
} }

export function exportSave() { return encodeSave(state()); }

// 백업 복원은 decodeSave로 먼저 검증하고, 성공할 때만 기존 저장을 덮어쓴다.
// load()와 같이 advance()로 백업 시점 이후 경과 시간을 정산해야, 오래된 백업을 복원했을 때
// 다음 틱에서 아무 안내 없이 조용히 밀린 생산이 한꺼번에 반영되는 것을 막는다.
// 저장을 읽지 못해 자동 저장이 막힌 상태(blocked)도 여기서 풀어 정상 저장을 재개시킨다.
export function restoreFromBackup(text: string): { ok: true } | { ok: false; error: string } {
  let s: Model;
  try { s = decodeSave(text); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : '백업 파일을 읽지 못했습니다.' }; }
  blocked = false;
  const n = advance(s, Date.now());
  s.notice = n ? `백업에서 복원했습니다. 자리를 비운 동안 ${n.toLocaleString()}회 작업했습니다.` : '백업에서 복원했습니다.';
  setState(s);
  saveGame();
  return { ok: true };
}
