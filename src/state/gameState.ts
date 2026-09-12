import { createSignal } from 'solid-js';
import { initial, advance, type Model } from '../engine/model';
import { decodeSave, encodeSave, SAVE_KEY } from '../engine/save';
let blocked = false;

// decodeSave 후 곧바로 advance()로 경과 시간을 정산한다 — load()/restoreFromBackup()/
// storage 동기화 모두 "외부에서 가져온 저장을 살려서 지금 시점까지 진행시킨다"는 같은 절차를 쓴다.
function decodeAndAdvance(text: string): { s: Model; n: number } {
  const s = decodeSave(text);
  const n = advance(s, Date.now());
  return { s, n };
}

function load() { try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw)
        return initial();
    const { s, n } = decodeAndAdvance(raw);
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

// 다른 탭이 저장을 갱신하면 storage 이벤트가 발생한다(값을 쓴 탭 자신에게는 발생하지 않고
// 다른 탭에서만 발생). 이 탭이 지금 보이는 탭이라면(사용자가 보고 있는 탭 — gameLoop.ts의
// visibilitychange 플러시와 같은 기준) 그 값을 그대로 받아들이지 않는다 — 방치된 다른 탭의
// 오래된 자동 저장이 이 탭에서 진행 중인 사용자의 최신 조작을 덮어쓸 수 있기 때문이다
// (개발 중 실제로 목격한 문제의 반대 방향). 대신 이 탭이 가진 현재 상태를 즉시 다시 저장해
// 그 값을 덮어쓴다(blocked 상태면 saveGame이 그대로 무시하므로 손상 보호도 유지된다).
// 보이지 않는(방치된) 탭만 다른 탭의 최신 내용을 그대로 받아들인다 — 그래야 그 탭의
// 다음 자동 저장이 최신 내용을 덮어쓰지 않는다.
// 완벽한 동시 편집 병합이 아니라 어느 방향이든 조용한 덮어쓰기를 막는 것이 목적이다.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== SAVE_KEY || !e.newValue) return;
    if (document.visibilityState !== 'hidden') { saveGame(); return; }
    try {
      const { s } = decodeAndAdvance(e.newValue);
      blocked = false;
      setState(s);
    } catch {
      // 다른 탭이 쓴 값이 유효하지 않으면 무시하고 이 탭의 상태를 그대로 유지한다.
    }
  });
}

export function exportSave() { return encodeSave(state()); }

// 백업 복원은 decodeSave로 먼저 검증하고, 성공할 때만 기존 저장을 덮어쓴다.
// load()와 같이 advance()로 백업 시점 이후 경과 시간을 정산해야, 오래된 백업을 복원했을 때
// 다음 틱에서 아무 안내 없이 조용히 밀린 생산이 한꺼번에 반영되는 것을 막는다.
// 저장을 읽지 못해 자동 저장이 막힌 상태(blocked)도 여기서 풀어 정상 저장을 재개시킨다.
export function restoreFromBackup(text: string): { ok: true } | { ok: false; error: string } {
  let result: { s: Model; n: number };
  try { result = decodeAndAdvance(text); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : '백업 파일을 읽지 못했습니다.' }; }
  const { s, n } = result;
  blocked = false;
  s.notice = n ? `백업에서 복원했습니다. 자리를 비운 동안 ${n.toLocaleString()}회 작업했습니다.` : '백업에서 복원했습니다.';
  setState(s);
  saveGame();
  return { ok: true };
}
