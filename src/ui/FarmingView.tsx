import { For, Show } from 'solid-js';
import { ResourceDB, cropYield } from '../content/resources';
import { state } from '../state/gameState';
import { duration } from '../engine/model';
import { buySeed, plantCrop, harvestCrop } from '../engine/actions';
import { fmt } from './ProductionView';

function minutes(ms: number) {
  return (ms / 60000).toFixed(1);
}

export function FarmStatus() {
  const plot = () => state().farmPlot;
  const crop = () => plot() ? ResourceDB[plot()!.cropId] : null;
  const ready = () => !!plot() && plot()!.progressMs >= crop()!.baseDurationMs;
  return <section class="meal-status" aria-label="농사 상태">
    <Show when={plot()} fallback={<span>🌱 심은 작물 없음 · 농사 탭에서 씨앗을 심어보세요.</span>}>
      <strong>🌱 {crop()!.name}</strong>
      <span>{ready() ? '수확 가능' : `진행 ${Math.floor(plot()!.progressMs / crop()!.baseDurationMs * 100)}%`}</span>
    </Show>
  </section>;
}

export function FarmingView() {
  const skill = () => state().skills.farming;
  const plot = () => state().farmPlot;
  const crop = () => plot() ? ResourceDB[plot()!.cropId] : null;
  const ready = () => !!plot() && plot()!.progressMs >= crop()!.baseDurationMs;
  return <>
    <h1>농사</h1>
    <p class="muted">레벨 {skill().level} · 경험치 {fmt(skill().exp)} / {fmt(skill().maxExp)}</p>
    <p class="intro-note">씨앗을 구매해 밭에 심으면 다른 화면에 있거나 접속하지 않아도 자랍니다. 다 자라면 수확해서 씨앗을 보충하고, 남는 것은 판매하거나 요리에 쓰세요.</p>
    <section class="current">
      <div><span class="label">밭 상태</span><h2>{plot() ? `${crop()!.icon} ${crop()!.name}` : '심은 작물 없음'}</h2></div>
      <Show when={ready()}><button onClick={harvestCrop}>수확하기</button></Show>
      <Show when={plot()}>
        <progress aria-label="농사 진행률" max="100" value={plot()!.progressMs / crop()!.baseDurationMs * 100}/>
        <small>{ready() ? '수확할 수 있습니다' : `${minutes(crop()!.baseDurationMs - plot()!.progressMs)}분 후 수확 가능 · 화면을 바꿔도 계속 자랍니다`}</small>
      </Show>
    </section>
    <div class="cards">
      <For each={Object.values(ResourceDB).filter(r => r.skill === 'farming')}>{r =>
        <article>
          <div class="item-icon">{r.icon}</div>
          <h2>{r.name}</h2>
          <p>보유 <strong>{fmt(state().inventory[r.id] ?? 0)}</strong></p>
          <p class="muted">성장 {minutes(duration(state(), r.id))}분 · 수확 {cropYield[r.id]}개 · 경험치 +{r.exp}</p>
          <p class="recipe">씨앗 {fmt(r.buy)} G</p>
          <div class="button-row">
            <button disabled={skill().level < r.reqLevel || state().gold < r.buy} onClick={() => buySeed(r.id, 1)}>씨앗 구매</button>
            <button disabled={skill().level < r.reqLevel || !!plot() || (state().inventory[r.id] ?? 0) < 1} onClick={() => plantCrop(r.id)}>
              {skill().level < r.reqLevel ? `레벨 ${r.reqLevel}에 해금` : '심기'}
            </button>
          </div>
        </article>
      }</For>
    </div>
  </>;
}
