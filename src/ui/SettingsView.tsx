import { Show, createSignal } from 'solid-js';
import { exportSave, restoreFromBackup } from '../state/gameState';

function downloadBackup() {
  const blob = new Blob([exportSave()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `melvorlike-save-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function SettingsView() {
  const [restoreMessage, setRestoreMessage] = createSignal('');
  let fileInput: HTMLInputElement | undefined;

  async function onFileChosen(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (fileInput) fileInput.value = '';
    if (!file) return;
    if (!confirm('현재 저장 데이터를 백업 파일 내용으로 덮어씁니다. 계속할까요?')) return;
    const text = await file.text();
    const result = restoreFromBackup(text);
    // 성공 메시지는 state().notice를 통해 화면 상단 알림으로 이미 표시되므로 여기서는 실패만 알린다.
    setRestoreMessage(result.ok ? '' : `복원 실패: ${result.error}`);
  }

  return <>
    <h1>설정</h1>
    <p class="intro-note">저장은 이 브라우저에만 보관됩니다. 다른 기기로 옮기거나 저장 손상에 대비하려면 백업 파일을 내려받아 두세요.</p>
    <h2 class="section-title">백업 다운로드</h2>
    <p class="muted">현재 진행 상황을 JSON 파일로 내려받습니다.</p>
    <button onClick={downloadBackup}>백업 파일 다운로드</button>
    <h2 class="section-title">백업 복원</h2>
    <p class="muted">백업 파일을 선택하면 현재 저장을 덮어씁니다. 형식이 올바르지 않은 파일은 적용되지 않습니다.</p>
    <input ref={fileInput} type="file" accept="application/json,.json" onChange={onFileChosen}/>
    <Show when={restoreMessage()}><p role="status" class="notice">{restoreMessage()}</p></Show>
  </>;
}
