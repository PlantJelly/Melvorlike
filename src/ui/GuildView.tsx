import { For, Show } from 'solid-js';
import { ResourceDB, skillNames } from '../content/resources';
import { ExchangeDB, guildTiers, milestones } from '../content/guild';
import { state } from '../state/gameState';
import { buyResourceAction, exchangeResourceAction, upgradeGuildAction, completeDailyQuestAction, claimMilestoneAction } from '../engine/actions';
import { dailyQuestReward, exchangeRateFor, exchangeYield, facilityGateMet, milestoneReady, purchasable, skillUnlocked } from '../engine/model';
import { fmt } from './ProductionView';

export function GuildView() {
  const tier = () => guildTiers[state().guild];
  const next = () => guildTiers[state().guild + 1];
  const depth = () => state().guild + 1;
  return <>
    <h1>길드</h1>
    <p class="muted">{tier().name} · 환전 가능 티어 차이 {depth()}단계까지</p>
    <p class="intro-note">해금한 원재료는 골드로 바로 살 수 있습니다(벌목·채광·낚시·채집 재료는 그 스킬의 현재 최고 단계보다 낮은 것만). 상위 티어 재료가 남아돌면 하위 티어로 환전해 부족한 재료를 채우세요 — 환전은 항상 하위 티어로만 가능합니다.</p>
    <section class="current">
      <div><span class="label">다음 등급</span><h2>{next() ? next()!.name : '현재 최고 등급입니다'}</h2></div>
      <Show when={next()}>
        <button disabled={state().gold < next()!.goldCost} onClick={upgradeGuildAction}>승급하기 · {fmt(next()!.goldCost)} G</button>
      </Show>
    </section>

    <h2 class="section-title">마일스톤 퀘스트</h2>
    <p class="muted">왕국을 성장시키며 한 번씩 달성하는 목표입니다. 달성한 보상은 직접 수령할 수 있습니다.</p>
    <div class="inventory">
      <For each={milestones}>{milestone => {
        const claimed = () => state().milestones.claimed.includes(milestone.id);
        const ready = () => milestoneReady(state(), milestone.id);
        return <article>
          <div><h2>{milestone.icon} {milestone.name}</h2><small>{milestone.description} · 보상 {fmt(milestone.reward)} G</small></div>
          <strong>{claimed() ? '수령 완료' : ready() ? '달성' : '진행 중'}</strong>
          <button disabled={claimed() || !ready()} onClick={() => claimMilestoneAction(milestone.id)}>{claimed() ? '완료됨' : ready() ? '보상 받기' : '미달성'}</button>
        </article>;
      }}</For>
    </div>

    <h2 class="section-title">일일 퀘스트</h2>
    <p class="muted">매일 자동으로 3개가 갱신됩니다. 완료하지 않은 퀘스트는 다음 날 그냥 교체되며 손해는 없습니다.</p>
    <div class="inventory">
      <For each={state().dailyQuests.quests}>{(quest, i) => {
        const r = () => ResourceDB[quest.resourceId];
        const owned = () => state().inventory[quest.resourceId] ?? 0;
        const reward = () => dailyQuestReward(state(), quest);
        return <article>
          <div><h2>{r().icon} {r().name} {quest.amount}개 납품</h2><small>보상 {fmt(reward())} G</small></div>
          <strong>보유 {fmt(owned())}개</strong>
          <button disabled={quest.done || owned() < quest.amount} onClick={() => completeDailyQuestAction(i(), quest.resourceId)}>{quest.done ? '완료됨' : '납품'}</button>
        </article>;
      }}</For>
    </div>

    <h2 class="section-title">재료 구매</h2>
    <p class="muted">스킬 레벨로 이미 해금한 원재료를 살 수 있습니다. 벌목·채광·낚시·채집 재료는 그 스킬의 현재 최고 단계보다 낮은 것만 살 수 있고, 가공품은 대상이 아닙니다.</p>
    <div class="inventory">
      <For each={Object.values(ResourceDB).filter(r => !r.recipe)}>{r => {
        const levelMet = () => skillUnlocked(state(), r.skill) && state().skills[r.skill].level >= r.reqLevel;
        const gateMet = () => levelMet() && facilityGateMet(state(), r.id);
        const unlocked = () => purchasable(state(), r.id);
        return <article>
          <div><h2>{r.icon} {r.name}</h2><small>{unlocked() ? `개당 ${fmt(r.buy)} G` : gateMet() ? '현재 최고 단계 — 직접 채집하세요' : levelMet() ? '해당 구역 시설 강화 필요' : `${skillNames[r.skill]} Lv.${r.reqLevel}에 해금`}</small></div>
          <strong>보유 {fmt(state().inventory[r.id] ?? 0)}개</strong>
          <button disabled={!unlocked() || state().gold < r.buy} onClick={() => buyResourceAction(r.id, 1)}>1개 구매</button>
          <button disabled={!unlocked() || state().gold < r.buy * 10} onClick={() => buyResourceAction(r.id, 10)}>10개 구매</button>
          <button disabled={!unlocked() || state().gold < r.buy * 100} onClick={() => buyResourceAction(r.id, 100)}>100개 구매</button>
        </article>;
      }}</For>
    </div>

    <h2 class="section-title">환전</h2>
    <p class="muted">보유한 원재료를 같은 스킬의 1~3단계 아래 원재료로 전부 바꿉니다. 단계마다 ×{exchangeRateFor(state()).toFixed(2)}개씩 늘고(원재료 가치의 90%까지), 길드 등급이 오를수록 더 아래 단계까지 바꿀 수 있습니다.</p>
    <div class="inventory">
      <For each={Object.keys(ExchangeDB).filter(id => (state().inventory[id] ?? 0) > 0)} fallback={<p class="muted">환전할 수 있는 원재료가 없습니다.</p>}>{id => {
        const r = ResourceDB[id];
        const owned = () => state().inventory[id] ?? 0;
        return <article>
          <div><h2>{r.icon} {r.name}</h2><small>보유 {fmt(owned())}개</small></div>
          <div class="exchange-targets">
            <For each={ExchangeDB[id]}>{ex => {
              const target = ResourceDB[ex.targetId];
              const allowed = () => ex.tierGap <= depth();
              return <button disabled={!allowed()} title={allowed() ? '' : `${guildTiers[ex.tierGap - 1]?.name ?? '더 높은 등급'} 필요`} onClick={() => exchangeResourceAction(id, ex.targetId, owned())}>
                → {target.icon} {target.name} {allowed() ? `×${exchangeYield(state(), id, ex).toFixed(2)}` : `(${guildTiers[ex.tierGap - 1]?.name ?? '더 높은 등급'})`}
              </button>;
            }}</For>
          </div>
        </article>;
      }}</For>
    </div>
  </>;
}
