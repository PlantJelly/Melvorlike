import { For, Show } from 'solid-js';
import type { SkillId } from '../content/types';
import { ResourceDB, skillNames } from '../content/resources';
import { state } from '../state/gameState';
import { afford, duration } from '../engine/model';
import { startAction } from '../engine/actions';
import { FoodButtons } from './Food';

export const fmt = (n: number) => n.toLocaleString('ko-KR', {maximumFractionDigits: 0});
export const costText = (cost: Record<string, number>) => Object.entries(cost)
  .map(([id, n]) => `${ResourceDB[id].name} ${n} (보유 ${state().inventory[id] ?? 0})`).join(' · ');

export function ProductionView(props: {skill: SkillId}) {
  const skill = () => state().skills[props.skill];
  return <>
    <h1>{skillNames[props.skill]}</h1>
    <p class="muted">레벨 {skill().level} · 경험치 {fmt(skill().exp)} / {fmt(skill().maxExp)}</p>
    <Show when={props.skill === 'fishing'}><p class="intro-note">개울에서 시작해 더 높은 레벨의 낚시터를 여세요. 잡은 물고기는 요리 재료가 됩니다.</p></Show>
    <Show when={props.skill === 'cooking'}><p class="intro-note">음식 효과는 한 종류만 적용됩니다. 같은 음식은 지속시간이 늘어나며, 접속을 종료해도 시간이 흐릅니다.</p></Show>
    <div class="cards">
      <For each={Object.values(ResourceDB).filter(r => r.skill === props.skill)}>{r =>
        <article>
          <Show when={r.area}><span class="area-label">{r.area}</span></Show>
          <div class="item-icon">{r.icon}</div>
          <h2>{r.name}</h2>
          <p>보유 <strong>{fmt(state().inventory[r.id] ?? 0)}</strong></p>
          <p class="muted">{(duration(state(), r.id) / 1000).toFixed(1)}초 · 경험치 +{r.exp}</p>
          <Show when={r.recipe}><p class="recipe">{costText(r.recipe!)}</p></Show>
          <button class="production-button"
            disabled={skill().level < r.reqLevel || !afford(state(), r.recipe ?? {}) || state().currentAction?.resourceId === r.id}
            onClick={() => startAction(r.skill, r.id)}>
            {skill().level < r.reqLevel ? `레벨 ${r.reqLevel}에 해금` : state().currentAction?.resourceId === r.id ? '진행 중' : r.recipe ? '제작 시작' : '채집 시작'}
          </button>
          <FoodButtons id={r.id}/>
        </article>
      }</For>
    </div>
  </>;
}
