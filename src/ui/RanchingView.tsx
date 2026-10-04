import { For, Show } from 'solid-js';
import { AnimalDB } from '../content/animals';
import { ResourceDB } from '../content/resources';
import { state } from '../state/gameState';
import { afford, animalCount, barnCapacity, facilityGateMet, nextBarnUpgrade, ranchRemainingMs, ranchStarved } from '../engine/model';
import { ProjectDB } from '../content/projects';
import { facilityRequirement } from '../content/facilities';
import { buyAnimalAction, expandBarnAction } from '../engine/actions';
import { costText, fmt } from './ProductionView';

function minutes(ms: number) {
  return (ms / 60000).toFixed(1);
}

const owned = (id: string) => Object.hasOwn(state().ranch, id);

// 모든 화면 위에 붙는 요약이라 동물 종 수와 무관하게 한 줄로 보인다(플레이테스트: 후반 7종이 7줄을 차지하던 문제).
export function RanchStatus() {
  const ownedIds = () => Object.keys(state().ranch);
  const heads = () => ownedIds().reduce((sum, id) => sum + animalCount(state(), id), 0);
  const starved = () => ownedIds().filter(id => ranchStarved(state(), id));
  const nextMs = () => Math.min(...ownedIds().filter(id => !ranchStarved(state(), id)).map(id => ranchRemainingMs(state(), id)));
  return <section class="meal-status" aria-label="목장 상태">
    <Show when={ownedIds().length} fallback={<span>🐔 사육 중인 동물 없음 · 목장 탭에서 동물을 구매해보세요.</span>}>
      <strong>{ownedIds().map(id => AnimalDB[id].icon).join('')} 동물 {ownedIds().length}종 {heads()}마리</strong>
      <span>{Number.isFinite(nextMs()) ? `다음 산출 ${minutes(nextMs())}분 후` : '산출 대기'}{starved().length ? ` · 사료 부족 ${starved().map(id => AnimalDB[id].name).join('·')}` : ''}</span>
    </Show>
  </section>;
}

export function RanchingView() {
  const skill = () => state().skills.ranching;
  return <>
    <h1>목장</h1>
    <p class="muted">레벨 {skill().level} · 경험치 {fmt(skill().exp)} / {fmt(skill().maxExp)} · 동물종당 최대 {barnCapacity(state())}마리</p>
    <p class="intro-note">동물을 사서 사료를 채워두면 접속 여부와 무관하게 자동으로 산출물을 만듭니다. 같은 동물을 여러 마리 키우면 주기마다 마릿수만큼 사료를 먹고 마릿수만큼 만듭니다. 한 주기 사료가 모자라면 손해 없이 대기하고, 다시 채우면 바로 재개됩니다.</p>
    <Show when={nextBarnUpgrade(state())}>{upgrade => {
      const locked = () => skill().level < upgrade().reqLevel;
      return <div class="cards">
        <article>
          <h2>축사 강화 ({barnCapacity(state()) + 1}마리)</h2>
          <p class="muted">목재 칸막이와 재봉 자재로 축사를 넓혀 동물종당 한 마리를 더 키울 수 있게 합니다.</p>
          <p class="recipe">{fmt(upgrade().goldCost)} G · {costText(upgrade().cost)}</p>
          <button disabled={locked() || state().gold < upgrade().goldCost || !afford(state(), upgrade().cost)} onClick={expandBarnAction}>
            {locked() ? `레벨 ${upgrade().reqLevel}에 해금` : '강화하기'}
          </button>
        </article>
      </div>;
    }}</Show>
    <div class="cards">
      <For each={Object.values(AnimalDB)}>{a => {
        const p = () => ResourceDB[a.productId];
        const locked = () => skill().level < p().reqLevel;
        // Lv75·90 동물은 낡은 축사 시설 단계가 필요하다(D050).
        const gated = () => !facilityGateMet(state(), p().id);
        const gateText = () => {
          const need = facilityRequirement('ranching', p().reqLevel)!;
          return `${ProjectDB[need.projectId].name} 시설 ${need.level}단계 필요`;
        };
        const heads = () => animalCount(state(), a.id);
        const feedStock = () => state().inventory[a.feedId] ?? 0;
        const starved = () => ranchStarved(state(), a.id);
        const canBuyMore = () => heads() < barnCapacity(state());
        return <article>
          <div class="item-icon">{a.icon}</div>
          <h2>{a.name}</h2>
          <p class="muted">한 마리당 사료 {ResourceDB[a.feedId].name} {a.feedAmount}개 · 주기 {minutes(p().baseDurationMs)}분 · {p().icon} {p().name} 1개 · 경험치 +{p().exp}</p>
          <Show when={owned(a.id)}>
            <p>{heads()}마리 사육 중 · 주기마다 사료 {a.feedAmount * heads()}개 · {ResourceDB[a.feedId].name} {fmt(feedStock())}개 보유</p>
            <Show when={starved()} fallback={<>
              <progress aria-label={`${a.name} 산출 진행률`} max="100" value={state().ranch[a.id] / p().baseDurationMs * 100}/>
              <small>{minutes(ranchRemainingMs(state(), a.id))}분 후 산출 · 화면을 바꿔도 계속 진행됩니다</small>
            </>}>
              <p class="notice">사료가 부족해 대기 중입니다 · {ResourceDB[a.feedId].name} {a.feedAmount * heads()}개가 있으면 바로 재개됩니다.</p>
            </Show>
          </Show>
          <Show when={!owned(a.id) || canBuyMore()}>
            <p class="recipe">구매 {fmt(a.buyGold)} G</p>
            <button disabled={locked() || gated() || state().gold < a.buyGold} onClick={() => buyAnimalAction(a.id)}>
              {locked() ? `레벨 ${p().reqLevel}에 해금` : gated() ? gateText() : owned(a.id) ? '한 마리 더 구매' : '구매하기'}
            </button>
          </Show>
        </article>;
      }}</For>
    </div>
  </>;
}
