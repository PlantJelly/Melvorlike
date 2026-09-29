import { For, Index, Show, createSignal } from 'solid-js';
import { ResourceDB } from '../content/resources';
import { farmAutomation, type FarmUpgrade } from '../content/farm';
import { FertilizerDB, fertilizerIds, type FertilizerId } from '../content/fertilizers';
import { state } from '../state/gameState';
import { afford, duration, farmRemainingMs, harvestOutput, nextPlotUpgrade, plotReady } from '../engine/model';
import { buySeed, plantCrop, harvestCrop, clearPlotAction, expandFarmAction, automateFarmAction, buyFertilizerAction } from '../engine/actions';
import { costText, fmt } from './ProductionView';

function minutes(ms: number) {
  return (ms / 60000).toFixed(1);
}

const plots = () => state().farmPlots;
const planted = () => plots().filter(plot => plot !== null).length;
const readyCount = () => plots().filter(plotReady).length;
const hasEmpty = () => plots().includes(null);

export function FarmStatus() {
  return <section class="meal-status" aria-label="농사 상태">
    <Show when={planted()} fallback={<span>🌱 심은 작물 없음 · 농사 탭에서 씨앗을 심어보세요.</span>}>
      <strong>🌱 밭 {planted()}/{plots().length}칸</strong>
      <span>{readyCount() ? `수확 가능 ${readyCount()}칸` : '자라는 중'}{state().farmAuto ? ' · 자동 파종/수확' : ''}</span>
    </Show>
  </section>;
}

function UpgradeCard(props: {title: string; description: string; upgrade: FarmUpgrade; onBuy: () => void}) {
  const skill = () => state().skills.farming;
  const locked = () => skill().level < props.upgrade.reqLevel;
  return <article>
    <h2>{props.title}</h2>
    <p class="muted">{props.description}</p>
    <p class="recipe">{fmt(props.upgrade.goldCost)} G · {costText(props.upgrade.cost)}</p>
    <button disabled={locked() || state().gold < props.upgrade.goldCost || !afford(state(), props.upgrade.cost)} onClick={props.onBuy}>
      {locked() ? `레벨 ${props.upgrade.reqLevel}에 해금` : '설치하기'}
    </button>
  </article>;
}

export function FarmingView() {
  const skill = () => state().skills.farming;
  // 다음 파종에 쓸 비료. 재고가 없으면 심기 버튼이 비활성화된다.
  const [fertilizer, setFertilizer] = createSignal<FertilizerId | ''>('');
  const fertilizerReady = () => !fertilizer() || state().fertilizers[fertilizer() as FertilizerId] > 0;
  return <>
    <h1>농사</h1>
    <p class="muted">레벨 {skill().level} · 경험치 {fmt(skill().exp)} / {fmt(skill().maxExp)}</p>
    <p class="intro-note">씨앗을 구매해 밭에 심으면 다른 화면에 있거나 접속하지 않아도 자랍니다. 다 자라면 수확해서 씨앗을 보충하고, 남는 것은 판매하거나 요리에 쓰세요.</p>
    <section class="current">
      <div><span class="label">밭 {plots().length}칸{state().farmAuto ? ' · 자동 파종/수확 중' : ''}</span><h2>{planted() ? `${planted()}칸에서 자라는 중` : '심은 작물 없음'}</h2></div>
      <Show when={readyCount()}><button onClick={harvestCrop}>모두 수확하기</button></Show>
      <Index each={plots()}>{(plot, i) => <Show when={plot()} fallback={<small>{i + 1}번 밭 · 비어 있음</small>}>{p => {
        const crop = () => ResourceDB[p().cropId];
        return <>
          <small>{i + 1}번 밭 · {crop().icon} {crop().name}{p().fertilizer ? ` · ${FertilizerDB[p().fertilizer!].icon} ${FertilizerDB[p().fertilizer!].name}` : ''} · {plotReady(p()) ? '수확할 수 있습니다' : `${minutes(farmRemainingMs(state(), i))}분 후 수확 가능`}</small>
          <progress aria-label={`${i + 1}번 밭 진행률`} max="100" value={p().progressMs / crop().baseDurationMs * 100}/>
          <button aria-label={`${i + 1}번 밭 비우기`} onClick={() => clearPlotAction(i)}>{plotReady(p()) ? '수확하고 비우기' : '비우기(자라는 작물은 사라짐)'}</button>
        </>;
      }}</Show>}</Index>
    </section>
    <h2>비료</h2>
    <p class="muted">파종할 때 한 칸에 하나를 쓰고, 그 칸의 작물을 거둘 때까지 효과가 이어집니다. 확률 효과는 확률만큼 쌓였다가 한 번씩 발동합니다.</p>
    <div class="cards">
      <For each={fertilizerIds}>{id => {
        const f = FertilizerDB[id];
        return <article>
          <div class="item-icon">{f.icon}</div>
          <h2>{f.name}</h2>
          <p>보유 <strong>{fmt(state().fertilizers[id])}</strong></p>
          <p class="muted">{f.description}</p>
          <p class="recipe">{fmt(f.goldCost)} G</p>
          <div class="button-row">
            <button disabled={state().gold < f.goldCost} onClick={() => buyFertilizerAction(id, 1)}>1개 구매</button>
            <button disabled={state().gold < f.goldCost * 10} onClick={() => buyFertilizerAction(id, 10)}>10개 구매</button>
          </div>
        </article>;
      }}</For>
    </div>
    <div class="cards">
      <Show when={nextPlotUpgrade(state())}>{upgrade =>
        <UpgradeCard title={`밭 늘리기 (${plots().length + 1}칸)`} description="목재와 접착제로 울타리를 세워 밭을 한 칸 더 일굽니다." upgrade={upgrade()} onBuy={expandFarmAction}/>
      }</Show>
      <Show when={!state().farmAuto}>
        <UpgradeCard title="자동 파종/수확" description="다 자란 작물을 자동으로 거두고, 같은 씨앗(묘목)이 있으면 곧바로 다시 심습니다." upgrade={farmAutomation} onBuy={automateFarmAction}/>
      </Show>
    </div>
    <label class="muted">파종할 때 쓸 비료 <select aria-label="파종 비료" value={fertilizer()} onChange={e => setFertilizer(e.currentTarget.value as FertilizerId | '')}>
      <option value="">사용 안 함</option>
      <For each={fertilizerIds}>{id => <option value={id}>{FertilizerDB[id].name} (보유 {state().fertilizers[id]})</option>}</For>
    </select></label>
    <div class="cards">
      <For each={Object.values(ResourceDB).filter(r => r.skill === 'farming')}>{r => {
        const out = harvestOutput(r.id);
        const sapling = out.resourceId !== r.id;
        return <article>
          <div class="item-icon">{r.icon}</div>
          <h2>{r.name}</h2>
          <p>보유 <strong>{fmt(state().inventory[r.id] ?? 0)}</strong></p>
          <p class="muted">성장 {minutes(duration(state(), r.id))}분 · 수확 {sapling ? `${ResourceDB[out.resourceId].name} ` : ''}{fmt(out.count)}개 · 경험치 +{r.exp}</p>
          <p class="recipe">{sapling ? '묘목' : '씨앗'} {fmt(r.buy)} G{sapling ? ' · 벌목 중에도 얻을 수 있습니다' : ''}</p>
          <div class="button-row">
            <button disabled={skill().level < r.reqLevel || state().gold < r.buy} onClick={() => buySeed(r.id, 1)}>{sapling ? '묘목 구매' : '씨앗 구매'}</button>
            <button disabled={skill().level < r.reqLevel || !hasEmpty() || (state().inventory[r.id] ?? 0) < 1 || !fertilizerReady()} onClick={() => plantCrop(r.id, fertilizer() || undefined)}>
              {skill().level < r.reqLevel ? `레벨 ${r.reqLevel}에 해금` : '심기'}
            </button>
          </div>
        </article>;
      }}</For>
    </div>
  </>;
}
