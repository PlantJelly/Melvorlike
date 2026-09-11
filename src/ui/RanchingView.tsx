import { For, Show } from 'solid-js';
import { AnimalDB } from '../content/animals';
import { ResourceDB } from '../content/resources';
import { state } from '../state/gameState';
import { ranchRemainingMs, ranchStarved } from '../engine/model';
import { buyAnimalAction } from '../engine/actions';
import { fmt } from './ProductionView';

function minutes(ms: number) {
  return (ms / 60000).toFixed(1);
}

const owned = (id: string) => Object.hasOwn(state().ranch, id);

export function RanchStatus() {
  const ownedIds = () => Object.keys(state().ranch);
  return <section class="meal-status" aria-label="목장 상태">
    <Show when={ownedIds().length} fallback={<span>🐔 사육 중인 동물 없음 · 목장 탭에서 동물을 구매해보세요.</span>}>
      <For each={ownedIds()}>{id => {
        const a = AnimalDB[id];
        const p = ResourceDB[a.productId];
        return <span>{a.icon} {a.name} {ranchStarved(state(), id) ? '사료 부족' : `진행 ${Math.floor(state().ranch[id] / p.baseDurationMs * 100)}%`}</span>;
      }}</For>
    </Show>
  </section>;
}

export function RanchingView() {
  const skill = () => state().skills.ranching;
  return <>
    <h1>목장</h1>
    <p class="muted">레벨 {skill().level} · 경험치 {fmt(skill().exp)} / {fmt(skill().maxExp)}</p>
    <p class="intro-note">동물을 사서 사료를 채워두면 접속 여부와 무관하게 자동으로 산출물을 만듭니다. 사료가 떨어지면 손해 없이 대기하고, 다시 채우면 바로 재개됩니다.</p>
    <div class="cards">
      <For each={Object.values(AnimalDB)}>{a => {
        const p = () => ResourceDB[a.productId];
        const locked = () => skill().level < p().reqLevel;
        const feedStock = () => state().inventory[a.feedId] ?? 0;
        const starved = () => ranchStarved(state(), a.id);
        return <article>
          <div class="item-icon">{a.icon}</div>
          <h2>{a.name}</h2>
          <p class="muted">사료 {ResourceDB[a.feedId].name} {a.feedAmount}개 · 주기 {minutes(p().baseDurationMs)}분 · {p().icon} {p().name} 1개 · 경험치 +{p().exp}</p>
          <Show when={!owned(a.id)} fallback={
            <>
              <p>보유 중 · {ResourceDB[a.feedId].name} {fmt(feedStock())}개 보유</p>
              <Show when={starved()} fallback={<>
                <progress aria-label={`${a.name} 산출 진행률`} max="100" value={state().ranch[a.id] / p().baseDurationMs * 100}/>
                <small>{minutes(ranchRemainingMs(state(), a.id))}분 후 산출 · 화면을 바꿔도 계속 진행됩니다</small>
              </>}>
                <p class="notice">사료가 부족해 대기 중입니다 · {ResourceDB[a.feedId].name}을(를) 채우면 바로 재개됩니다.</p>
              </Show>
            </>
          }>
            <p class="recipe">구매 {fmt(a.buyGold)} G</p>
            <button disabled={locked() || state().gold < a.buyGold} onClick={() => buyAnimalAction(a.id)}>
              {locked() ? `레벨 ${p().reqLevel}에 해금` : '구매하기'}
            </button>
          </Show>
        </article>;
      }}</For>
    </div>
  </>;
}
