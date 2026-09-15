import { For, Show, createEffect, createSignal } from 'solid-js';
import { ResourceDB, playable, passiveSkills, skillNames } from './content/resources';
import type { SkillId } from './content/types';
import { initGameLoop } from './engine/gameLoop';
import { state } from './state/gameState';
import { duration, featureUnlocked, kingdomRestoration, skillUnlocked } from './engine/model';
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
import { ProjectDB, projectIds } from './content/projects';
import { KingdomView } from './ui/KingdomView';

type Page = SkillId | 'kingdom' | 'inventory' | 'tools' | 'guild' | 'equipment' | 'settings';

function App() {
  initGameLoop();
  const [page, setPage] = createSignal<Page>('kingdom');
  const active = () => state().currentAction;
  const resource = () => {
    const action = active();
    return action?.kind === 'production' ? ResourceDB[action.resourceId] : null;
  };
  const project = () => {
    const action = active();
    return action?.kind === 'project' ? ProjectDB[action.projectId] : null;
  };
  const projectStage = () => {
    const action = active();
    return action?.kind === 'project' ? action.stage : null;
  };
  const activeDuration = () => {
    const action = active();
    if (!action) return 1;
    if (action.kind === 'production') return ResourceDB[action.resourceId].baseDurationMs;
    return action.stage === 'clearing' ? ProjectDB[action.projectId].clearingDurationMs : ProjectDB[action.projectId].restorationDurationMs;
  };
  createEffect(() => {
    const current = page();
    if (playable.includes(current as SkillId) && !skillUnlocked(state(), current as SkillId)) setPage('kingdom');
    if ((current === 'tools' || current === 'equipment' || current === 'guild') && !featureUnlocked(state(), current)) setPage('kingdom');
  });
  return <div id="app">
    <aside>
      <div class="brand">🌿<div>왕국 재건<small>작은 작업에서 시작하는 정착</small></div></div>
      <button class="kingdom-nav" classList={{selected: page() === 'kingdom'}} onClick={() => setPage('kingdom')}>왕국 <span>복원도 {kingdomRestoration(state())}</span></button>
      <span class="label">생산 기술</span>
      <For each={playable.filter(id => skillUnlocked(state(), id))}>{id => <button classList={{selected: page() === id}} onClick={() => setPage(id)}>{skillNames[id]} <span>Lv.{state().skills[id].level}</span></button>}</For>
      <span class="label">작업실</span>
      <Show when={featureUnlocked(state(), 'tools')}><button classList={{selected: page() === 'tools'}} onClick={() => setPage('tools')}>도구 제작</button></Show>
      <Show when={featureUnlocked(state(), 'equipment')}><button classList={{selected: page() === 'equipment'}} onClick={() => setPage('equipment')}>장신구</button></Show>
      <button classList={{selected: page() === 'inventory'}} onClick={() => setPage('inventory')}>보관함</button>
      <Show when={featureUnlocked(state(), 'guild')}><button classList={{selected: page() === 'guild'}} onClick={() => setPage('guild')}>길드</button></Show>
      <button classList={{selected: page() === 'settings'}} onClick={() => setPage('settings')}>설정</button>
      <p class="aside-note">현재 목표<br/>{projectIds.every(id => state().projects[id].phase === 'complete') ? '복원된 시설과 생산 기술을 활용해 왕국을 성장시키세요.' : '왕국 화면에서 구역을 조사하고 복원해 새 생산 기술을 여세요.'}</p>
    </aside>
    <main>
      <header><span>왕국 복원도 {kingdomRestoration(state())}</span><strong>🪙 {fmt(state().gold)} G</strong></header>
      <Show when={state().notice}><p role="status" class="notice">{state().notice}</p></Show>
      <section class="current">
        <div><span class="label">현재 작업</span><h2>{resource() ? `${resource()!.icon} ${resource()!.name}` : project() ? `${project()!.icon} ${project()!.name}` : '작업을 선택하세요'}</h2></div>
        <Show when={active()}><button onClick={stopAction}>작업 중지</button></Show>
        <progress aria-label="현재 작업 진행률" max="100" value={active() ? Math.min(100, active()!.progressMs / activeDuration() * 100) : 0}/>
        <small>{resource() ? `${(duration(state(), resource()!.id) / 1000).toFixed(1)}초마다 1개 · 화면을 바꿔도 계속 진행됩니다` : project() ? `${projectStage() === 'clearing' ? '폐허 정리' : '복원 공사'} · 화면을 바꿔도 계속 진행됩니다` : '한 번에 하나의 작업이 진행됩니다.'}</small>
      </section>
      <MealStatus/>
      <FarmStatus/>
      <RanchStatus/>
      <Show when={page() === 'kingdom'}><KingdomView/></Show>
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
