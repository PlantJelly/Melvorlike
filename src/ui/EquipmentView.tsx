import {For, Show} from 'solid-js';
import {
  accessoryOptions,
  accessorySlots,
  accessoryTiers,
  enchantmentStones,
  rarityNames,
  type AccessoryState,
} from '../content/accessories';
import {ResourceDB} from '../content/resources';
import {craftAccessoryAction, rerollAccessoryAction, upgradeAccessoryAction} from '../engine/actions';
import {accessoryBonus, afford} from '../engine/model';
import {state} from '../state/gameState';
import {costText, fmt} from './ProductionView';

function optionText(accessory: AccessoryState) {
  if (accessory.optionId === null || accessory.rarity === null) return '아직 마법 옵션이 없습니다.';
  const option = accessoryOptions[accessory.optionId];
  return `${rarityNames[accessory.rarity]} · ${option.name} · ${option.description} +${fmt(option.values[accessory.rarity] * 100)}%`;
}

function oddsText(accessory: AccessoryState, stoneTier: number) {
  const stone = enchantmentStones[stoneTier];
  const weights = stone.weights.slice(0, accessoryTiers[accessory.tier].maxRarity + 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights
    .map((weight, rarity) => weight > 0 ? `${rarityNames[rarity]} ${fmt(weight / total * 100)}%` : '')
    .filter(Boolean)
    .join(' · ');
}

function fullCostText(goldCost: number, cost: Record<string, number>) {
  return `${fmt(goldCost)} G · ${costText(cost)}`;
}

export function EquipmentView() {
  const blacksmithing = () => state().skills.blacksmithing;
  return <>
    <h1>장신구와 마법부여</h1>
    <p class="muted">대장작업 Lv.{blacksmithing().level} · 각 슬롯은 하나만 존재하며 승급해도 현재 옵션은 유지됩니다.</p>
    <section class="meal-status" aria-label="장신구 총 효과">
      <strong>장신구 총 효과</strong>
      <span>전 스킬 속도 +{fmt(accessoryBonus(state(), 'speed') * 100)}%</span>
      <span>경험치 +{fmt(accessoryBonus(state(), 'experience') * 100)}%</span>
      <span>판매가 +{fmt(accessoryBonus(state(), 'sale') * 100)}%</span>
    </section>
    <div class="cards accessory-cards">
      <For each={accessorySlots}>{slot => {
        const accessory = () => state().accessories[slot.id];
        const nextTier = () => accessory() ? accessoryTiers[accessory()!.tier + 1] : accessoryTiers[0];
        const canPay = () => !!nextTier() && state().gold >= nextTier()!.goldCost && afford(state(), nextTier()!.cost);
        return <article>
          <div class="item-icon">{slot.icon}</div>
          <h2>{slot.name}</h2>
          <Show when={accessory()} fallback={<>
            <p>아직 제작하지 않았습니다.</p>
            <p class="recipe">스톤 재질 · {fullCostText(accessoryTiers[0].goldCost, accessoryTiers[0].cost)}</p>
            <button
              disabled={blacksmithing().level < accessoryTiers[0].reqLevel || !canPay()}
              onClick={() => craftAccessoryAction(slot.id)}
            >스톤 장신구 제작</button>
          </>}>
            <p><strong>{accessoryTiers[accessory()!.tier].name} 재질</strong> · 최대 {rarityNames[accessoryTiers[accessory()!.tier].maxRarity]}</p>
            <p class="accessory-option">{optionText(accessory()!)}</p>
            <Show when={nextTier()} fallback={<p class="muted">최고 재질입니다.</p>}>
              <p class="recipe">다음: {nextTier()!.name} · 대장작업 Lv.{nextTier()!.reqLevel}<br/>{fullCostText(nextTier()!.goldCost, nextTier()!.cost)}</p>
              <button
                disabled={blacksmithing().level < nextTier()!.reqLevel || !canPay()}
                onClick={() => upgradeAccessoryAction(slot.id)}
              >옵션을 유지하고 승급</button>
            </Show>
            <div class="enchant-controls">
              <h3>옵션 리롤</h3>
              <For each={enchantmentStones}>{stone => {
                const owned = () => state().inventory[stone.resourceId] ?? 0;
                const tooLow = () => stone.tier < accessory()!.tier;
                return <div class="enchant-choice">
                  <small>{ResourceDB[stone.resourceId].name} · 보유 {fmt(owned())}개</small>
                  <small>{tooLow() ? '현재 재질보다 낮아 사용 불가' : oddsText(accessory()!, stone.tier)}</small>
                  <button disabled={tooLow() || owned() < 1} onClick={() => rerollAccessoryAction(slot.id, stone.resourceId)}>1개 사용</button>
                </div>;
              }}</For>
            </div>
          </Show>
        </article>;
      }}</For>
    </div>
  </>;
}
