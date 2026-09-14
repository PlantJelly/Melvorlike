import { For, Show } from 'solid-js';
import { ResourceDB, skillNames } from '../content/resources';
import { ExchangeDB, exchangeRate, guildTiers, milestones } from '../content/guild';
import { state } from '../state/gameState';
import { buyResourceAction, exchangeResourceAction, upgradeGuildAction, completeDailyQuestAction, claimMilestoneAction } from '../engine/actions';
import { dailyQuestReward, milestoneReady } from '../engine/model';
import { fmt } from './ProductionView';

export function GuildView() {
  const tier = () => guildTiers[state().guild];
  const next = () => guildTiers[state().guild + 1];
  const depth = () => state().guild + 1;
  return <>
    <h1>길드</h1>
    <p class="muted">{tier().name} · 환전 가능 티어 차이 {depth()}단계까지</p>
    <p class="intro-note">이미 해금한 원재료는 골드로 바로 구매할 수 있습니다. 상위 티어 재료가 남아돌면 하위 티어로 환전해 부족한 재료를 채우세요 — 환전은 항상 하위 티어로만 가능합니다.</p>
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
    <p class="muted">스킬 레벨로 이미 해금한 원재료만 구매할 수 있습니다. 가공품은 대상이 아닙니다.</p>
    <div class="inventory">
      <For each={Object.values(ResourceDB).filter(r => !r.recipe)}>{r => {
        const unlocked = () => state().skills[r.skill].level >= r.reqLevel;
        return <article>
          <div><h2>{r.icon} {r.name}</h2><small>{unlocked() ? `개당 ${fmt(r.buy)} G` : `${skillNames[r.skill]} Lv.${r.reqLevel}에 해금`}</small></div>
          <strong>보유 {fmt(state().inventory[r.id] ?? 0)}개</strong>
          <button disabled={!unlocked() || state().gold < r.buy} onClick={() => buyResourceAction(r.id, 1)}>1개 구매</button>
          <button disabled={!unlocked() || state().gold < r.buy * 10} onClick={() => buyResourceAction(r.id, 10)}>10개 구매</button>
        </article>;
      }}</For>
    </div>

    <h2 class="section-title">환전</h2>
    <p class="muted">보유한 재료를 전부 하위 티어로 바꿉니다. 티어 차이가 클수록 받는 수량이 늘어납니다.</p>
    <div class="inventory">
      <For each={Object.entries(ExchangeDB)}>{([id, ex]) => {
        const r = ResourceDB[id];
        const target = ResourceDB[ex.targetId];
        const owned = () => state().inventory[id] ?? 0;
        const allowed = () => ex.tierGap <= depth();
        const rate = Math.pow(exchangeRate, ex.tierGap);
        return <article>
          <div><h2>{r.icon} {r.name} → {target.icon} {target.name}</h2><small>{allowed() ? `1개당 ${target.name} ${Math.floor(rate)}개` : `${guildTiers[ex.tierGap - 1]?.name ?? '더 높은 등급'} 필요`}</small></div>
          <strong>보유 {fmt(owned())}개</strong>
          <button disabled={!allowed() || owned() < 1} onClick={() => exchangeResourceAction(id, owned())}>전부 환전</button>
        </article>;
      }}</For>
    </div>
  </>;
}
