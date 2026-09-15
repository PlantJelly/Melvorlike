import { For, Show } from 'solid-js';
import { ProjectDB, projectIds, type ProjectId, type ProjectPhase } from '../content/projects';
import { ResourceDB, skillNames } from '../content/resources';
import { kingdomRestoration } from '../engine/model';
import { deliverProjectMaterialAction, startProjectWorkAction, surveyProjectAction } from '../engine/actions';
import { state } from '../state/gameState';
import { fmt } from './ProductionView';

const phaseLabel: Record<ProjectPhase, string> = {
  surveyable: '조사 가능',
  clearing: '폐허 정리',
  delivery: '자재 납품',
  restorable: '복원 준비 완료',
  restoring: '복원 공사',
  complete: '복원 완료',
};

const clearingPhases: ProjectPhase[] = ['surveyable', 'clearing'];
const restorationPhases: ProjectPhase[] = ['delivery', 'restorable', 'restoring'];

function running(projectId: ProjectId, stage: 'clearing' | 'restoring') {
  const action = state().currentAction;
  return action?.kind === 'project' && action.projectId === projectId && action.stage === stage;
}

function ProjectCard(props: {id: ProjectId}) {
  const project = () => ProjectDB[props.id];
  const progress = () => state().projects[props.id];
  const clearingPercent = () => progress().clearingProgressMs / project().clearingDurationMs * 100;
  const restorationPercent = () => progress().restorationProgressMs / project().restorationDurationMs * 100;

  return <article class="district-card" data-phase={progress().phase}>
    <div class="district-heading">
      <span class="district-icon">{project().icon}</span>
      <div><span class="phase-badge">{phaseLabel[progress().phase]}</span><h2>{project().name}</h2></div>
    </div>
    <p>{project().description}</p>

    <Show when={progress().phase === 'surveyable'}>
      <p class="project-hint">먼저 현장을 조사해 정리 범위와 필요한 자재를 확인하세요.</p>
      <button onClick={() => surveyProjectAction(props.id)}>현장 조사</button>
    </Show>

    <Show when={progress().phase === 'clearing'}>
      <div class="project-step"><strong>폐허 정리</strong><span>{Math.floor(clearingPercent())}%</span></div>
      <progress aria-label={`${project().name} 폐허 정리 진행률`} max="100" value={clearingPercent()}/>
      <p class="project-hint">완료하면 {Object.entries(project().salvage).map(([id, count]) => `${ResourceDB[id].name} ${count}개`).join(' · ')}를 확정 회수합니다.</p>
      <button disabled={running(props.id, 'clearing')} onClick={() => startProjectWorkAction(props.id)}>{running(props.id, 'clearing') ? '정리 중' : progress().clearingProgressMs > 0 ? '정리 재개' : '폐허 정리 시작'}</button>
    </Show>

    <Show when={progress().phase === 'delivery'}>
      <h3>복원 자재</h3>
      <div class="material-list">
        <For each={Object.entries(project().materials)}>{([resourceId, required]) => {
          const delivered = () => progress().delivered[resourceId] ?? 0;
          const remaining = () => required - delivered();
          const available = () => state().inventory[resourceId] ?? 0;
          return <div class="material-row">
            <span>{ResourceDB[resourceId].icon} {ResourceDB[resourceId].name}</span>
            <strong>{delivered()} / {required}</strong>
            <small>보유 {fmt(available())}</small>
            <div class="material-actions">
              <button disabled={remaining() === 0 || available() === 0} onClick={() => deliverProjectMaterialAction(props.id, resourceId, 1)}>1개</button>
              <button disabled={remaining() === 0 || available() === 0} onClick={() => deliverProjectMaterialAction(props.id, resourceId, Math.min(remaining(), available()))}>가능한 만큼</button>
            </div>
          </div>;
        }}</For>
      </div>
      <p class="project-hint">납품한 자재는 그대로 보존됩니다. 부족한 자재를 모아 나중에 이어서 납품할 수 있습니다.</p>
    </Show>

    <Show when={progress().phase === 'restorable' || progress().phase === 'restoring'}>
      <div class="project-step"><strong>복원 공사</strong><span>{Math.floor(restorationPercent())}%</span></div>
      <progress aria-label={`${project().name} 복원 공사 진행률`} max="100" value={restorationPercent()}/>
      <p class="project-hint">완료 효과: {project().unlockSkills.map(skill => skillNames[skill]).join(', ')} 및 도구 제작 해금</p>
      <button disabled={running(props.id, 'restoring')} onClick={() => startProjectWorkAction(props.id)}>{running(props.id, 'restoring') ? '복원 중' : progress().restorationProgressMs > 0 ? '복원 재개' : '복원 공사 시작'}</button>
    </Show>

    <Show when={progress().phase === 'complete'}>
      <div class="completion-mark"><span>✓</span><div><strong>복원된 대장간</strong><small>대장작업과 도구 제작을 이용할 수 있습니다.</small></div></div>
    </Show>
  </article>;
}

function ProjectLane(props: {title: string; description: string; phases: ProjectPhase[]}) {
  const ids = () => projectIds.filter(id => props.phases.includes(state().projects[id].phase));
  return <section class="project-lane">
    <div class="lane-heading"><div><h2>{props.title}</h2><p>{props.description}</p></div><span>{ids().length}</span></div>
    <Show when={ids().length > 0} fallback={<p class="empty-lane">현재 해당하는 구역이 없습니다.</p>}>
      <For each={ids()}>{id => <ProjectCard id={id}/>}</For>
    </Show>
  </section>;
}

export function KingdomView() {
  return <>
    <section class="kingdom-hero">
      <div><span class="eyebrow">왕국 재건 기록</span><h1>무너진 구역에 다시 불을 밝히세요</h1><p>현장을 정리하고 자재를 모아 복원하면 새로운 생산 기술과 시설이 열립니다.</p></div>
      <div class="restoration-score"><strong>{kingdomRestoration(state())}</strong><span>복원도</span></div>
    </section>
    <div class="kingdom-board">
      <ProjectLane title="폐허 회수" description="현장을 조사하고 쓸 수 있는 자재를 회수합니다." phases={clearingPhases}/>
      <ProjectLane title="복원" description="필요한 자재를 납품하고 공사를 마칩니다." phases={restorationPhases}/>
      <ProjectLane title="완료 구역" description="복원해 다시 기능하는 왕국의 시설입니다." phases={['complete']}/>
    </div>
  </>;
}
