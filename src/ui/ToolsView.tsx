import { For, Show } from 'solid-js';
import { playable, skillNames, toolNames, toolTiers } from '../content/resources';
import { state } from '../state/gameState';
import { afford } from '../engine/model';
import { craftTool } from '../engine/actions';
import { costText, fmt } from './ProductionView';

export function ToolsView() {
  return <>
    <h1>도구 제작</h1>
    <p class="muted">도구는 제작 즉시 적용되며, 각 기술에 영구적으로 남습니다.</p>
    <div class="cards">
      <For each={playable}>{id => {
        const next = () => toolTiers[state().tools[id] + 1];
        return <article>
          <h2>{skillNames[id]} · {toolNames[id]}</h2>
          <p>{toolTiers[state().tools[id]].name} · 속도 +{fmt(toolTiers[state().tools[id]].bonus * 100)}%</p>
          <Show when={next()} fallback={<p>현재 최고 단계입니다.</p>}>
            <h3>다음: {next()!.name} {toolNames[id]}</h3>
            <p>속도 +{fmt(next()!.bonus * 100)}% · {skillNames[id]} Lv.{next()!.level}</p>
            <p class="recipe">{costText(next()!.cost)}</p>
            <button disabled={state().skills[id].level < next()!.level || !afford(state(), next()!.cost)} onClick={() => craftTool(id)}>제작하고 적용</button>
          </Show>
        </article>;
      }}</For>
    </div>
  </>;
}
