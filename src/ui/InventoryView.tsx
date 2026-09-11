import { For } from 'solid-js';
import { ResourceDB } from '../content/resources';
import { state } from '../state/gameState';
import { sellItem } from '../engine/actions';
import { FoodButtons } from './Food';
import { fmt } from './ProductionView';

export function InventoryView() {
  return <>
    <h1>보관함</h1>
    <p class="muted">제작에 필요한 재료를 남겨두고 여유분을 판매하세요. 음식은 이곳에서도 사용할 수 있습니다.</p>
    <div class="inventory">
      <For each={Object.values(ResourceDB).filter(r => (state().inventory[r.id] ?? 0) > 0)} fallback={<p>채집을 시작하면 이곳에 재료가 쌓입니다.</p>}>{r =>
        <article>
          <div><h2>{r.icon} {r.name}</h2><small>개당 {r.sell} G</small></div>
          <strong>{fmt(state().inventory[r.id])}개</strong>
          <button onClick={() => sellItem(r.id, 1)}>1개 판매</button>
          <button disabled={state().inventory[r.id] < 10} onClick={() => sellItem(r.id, 10)}>10개 판매</button>
          <FoodButtons id={r.id}/>
        </article>
      }</For>
    </div>
  </>;
}
