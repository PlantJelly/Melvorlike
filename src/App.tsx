import { For, Show, createSignal } from 'solid-js';
import { ResourceDB, playable, passiveSkills, skillNames } from './content/resources';
import type { SkillId } from './content/types';
import { initGameLoop } from './engine/gameLoop';
import { state } from './state/gameState';
import { duration } from './engine/model';
import { stopAction } from './engine/actions';
import { ProductionView, fmt } from './ui/ProductionView';
import { ToolsView } from './ui/ToolsView';
import { InventoryView } from './ui/InventoryView';
import { MealStatus } from './ui/Food';
import { FarmingView, FarmStatus } from './ui/FarmingView';
import { RanchingView, RanchStatus } from './ui/RanchingView';
import { GuildView } from './ui/GuildView';
import { EquipmentView } from './ui/EquipmentView';
import { SettingsView } from './ui/SettingsView';

function App() {
  initGameLoop();
  const [page, setPage] = createSignal<SkillId | 'inventory' | 'tools' | 'guild' | 'equipment' | 'settings'>('logging');
  const active = () => state().currentAction;
  const resource = () => active() ? ResourceDB[active()!.resourceId] : null;
  return <div id="app">
    <aside>
      <div class="brand">🌿<div>왕국 재건<small>작은 작업에서 시작하는 정착</small></div></div>
      <span class="label">생산 기술</span>
      <For each={playable}>{id => <button classList={{selected: page() === id}} onClick={() => setPage(id)}>{skillNames[id]} <span>Lv.{state().skills[id].level}</span></button>}</For>
      <span class="label">작업실</span>
      <button classList={{selected: page() === 'tools'}} onClick={() => setPage('tools')}>도구 제작</button>
      <button classList={{selected: page() === 'equipment'}} onClick={() => setPage('equipment')}>장신구</button>
      <button classList={{selected: page() === 'inventory'}} onClick={() => setPage('inventory')}>보관함</button>
      <button classList={{selected: page() === 'guild'}} onClick={() => setPage('guild')}>길드</button>
      <button classList={{selected: page() === 'settings'}} onClick={() => setPage('settings')}>설정</button>
      <p class="aside-note">첫 목표<br/>나무 5개와 돌 6개로 돌 도구를 제작해보세요.<br/><br/>다음 목표<br/>피라미를 잡아 구운 생선을 만들고, 낚시 속도를 높여보세요.</p>
    </aside>
    <main>
      <header><span>첫 정착 · 개발 중</span><strong>🪙 {fmt(state().gold)} G</strong></header>
      <Show when={state().notice}><p role="status" class="notice">{state().notice}</p></Show>
      <section class="current">
        <div><span class="label">현재 작업</span><h2>{resource() ? `${resource()!.icon} ${resource()!.name}` : '작업을 선택하세요'}</h2></div>
        <Show when={active()}><button onClick={stopAction}>작업 중지</button></Show>
        <progress aria-label="현재 작업 진행률" max="100" value={active() ? Math.min(100, active()!.progressMs / resource()!.baseDurationMs * 100) : 0}/>
        <small>{resource() ? `${(duration(state(), resource()!.id) / 1000).toFixed(1)}초마다 1개 · 화면을 바꿔도 계속 진행됩니다` : '한 번에 하나의 작업이 진행됩니다.'}</small>
      </section>
      <MealStatus/>
      <FarmStatus/>
      <RanchStatus/>
      <Show when={playable.includes(page() as SkillId) && !passiveSkills.includes(page() as SkillId)}><ProductionView skill={page() as SkillId}/></Show>
      <Show when={page() === 'farming'}><FarmingView/></Show>
      <Show when={page() === 'ranching'}><RanchingView/></Show>
      <Show when={page() === 'tools'}><ToolsView/></Show>
      <Show when={page() === 'equipment'}><EquipmentView/></Show>
      <Show when={page() === 'inventory'}><InventoryView/></Show>
      <Show when={page() === 'guild'}><GuildView/></Show>
      <Show when={page() === 'settings'}><SettingsView/></Show>
    </main>
  </div>;
}
export default App;
