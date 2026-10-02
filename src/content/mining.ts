// 광맥 발견(game_design §2.2): 채광 중 확률적으로 그 판에 한해 상위 광물 + 마나석을 추가로 얻는다.
// 확률은 만분율 정수로 누적해 1회분(CHANCE_SCALE)을 넘을 때마다 지급한다 — 틱을 어떻게 나눠
// 정산해도 같은 결과가 나오게 하기 위한 결정론적 방식이다.
export { CHANCE_SCALE } from './chance';

// 캐는 광물 → 광맥에서 추가로 나오는 한 단계 위 광물. 최상위 광물은 자기 자신을 한 번 더 준다.
export const veinBonusOre: Record<string, string> = {
  stone: 'copper',
  copper: 'iron',
  iron: 'silver_ore',
  silver_ore: 'crystal',
  mana_stone: 'crystal',
  crystal: 'gold_ore',
  gold_ore: 'lapis',
  lapis: 'star_ore',
  star_ore: 'mithril_ore',
  mithril_ore: 'sunstone',
  sunstone: 'sunstone',
};

// 석탄: 모든 채광 산출 1회당 50%(만분율) — 대장작업 주괴의 연료로 항상 흘러나오게 한다.
// 금 주괴의 마법 나무는 연료가 아니라 제련 촉매로 보고 그대로 둔다.
export const COAL_CHANCE = 5000;

// Lv1 1.05% → Lv99 5.95%. 수치는 플레이테스트 전 임시값.
export function veinChance(miningLevel: number) {
  return 100 + 5 * miningLevel;
}
