import { For, Show } from 'solid-js';
import { playable, skillNames } from '../content/resources';
import { projectIds } from '../content/projects';
import { ECONOMY_EXCHANGE_BONUS, GROWTH_SALE_BONUS, economyThresholds, growthLevels } from '../content/achievements';
import { state } from '../state/gameState';
import { economyAchievements, exchangeRateFor, growthAchievements, skillUnlocked } from '../engine/model';
import { fmt } from './ProductionView';

const percent = (n: number) => `${Math.round(n * 100)}%`;

export function AchievementsView() {
  const nextGrowth = (level: number) => growthLevels.find(target => level < target);
  const nextEconomy = () => economyThresholds.find(threshold => state().goldEarned < threshold);
  const maxedSkills = () => playable.filter(id => state().skills[id].level >= 99).length;
  const restored = () => projectIds.filter(id => state().projects[id].phase === 'complete').length;
  return <>
    <h1>업적</h1>
    <p class="intro-note">업적은 달성하는 즉시 실제 효과가 적용됩니다. 완주 목표는 보상 없이 스스로 정하는 엔딩입니다.</p>

    <h2>성장 — 스킬 레벨 {growthLevels.join('/')}</h2>
    <p class="muted">단계마다 그 스킬로 만든 물건의 판매가(일일 퀘스트 보상 포함) +{percent(GROWTH_SALE_BONUS)}</p>
    <div class="cards">
      <For each={playable.filter(id => skillUnlocked(state(), id))}>{id => {
        const level = () => state().skills[id].level;
        const achieved = () => growthAchievements(state(), id);
        return <article>
          <h2>{skillNames[id]}</h2>
          <p>Lv.{level()} · <strong>{achieved()}/{growthLevels.length}</strong> 달성</p>
          <p class="muted">판매가 +{percent(achieved() * GROWTH_SALE_BONUS)}{nextGrowth(level()) ? ` · 다음 Lv.${nextGrowth(level())}` : ' · 모두 달성'}</p>
        </article>;
      }}</For>
    </div>

    <h2>경제 — 누적 획득 골드</h2>
    <section class="current">
      <div><span class="label">누적 {fmt(state().goldEarned)} G · {economyAchievements(state())}/{economyThresholds.length} 달성</span><h2>환전 배율 ×{exchangeRateFor(state()).toFixed(2)}</h2></div>
      <small>판매·일일 퀘스트·마일스톤으로 번 골드가 {economyThresholds.map(fmt).join(' / ')} G를 넘을 때마다 환전 배율 +{ECONOMY_EXCHANGE_BONUS}{nextEconomy() ? ` · 다음 목표 ${fmt(nextEconomy()!)} G` : ' · 모두 달성'}</small>
    </section>

    <h2>제작 — 첫 전설 리롤</h2>
    <section class="current">
      <div><span class="label">{state().legendaryRolled ? '달성' : '미달성'}</span><h2>{state().legendaryRolled ? '마법부여석 약초 재료 1개 절감 적용 중' : '장신구 리롤에서 전설 희귀도를 얻으세요'}</h2></div>
      <small>보상: 마법부여석을 만들 때 드는 농사 약초가 1개 줄어듭니다(최소 1개).</small>
    </section>

    <h2>완주 목표</h2>
    <div class="cards">
      <article><h2>전 스킬 만렙</h2><p><strong>{maxedSkills()}/{playable.length}</strong> 스킬 Lv.99</p></article>
      <article><h2>왕국 완전 복원</h2><p><strong>{restored()}/{projectIds.length}</strong> 구역 복원</p><Show when={restored() === projectIds.length}><p class="muted">모든 구역을 복원했습니다.</p></Show></article>
    </div>
  </>;
}
