/**
 * game_design.md §6 원칙: 레벨이 무한히 올라도 시간이 0/음수가 되거나
 * 확률이 100%를 넘지 않도록, 수식 자체가 구조적으로 이를 막아야 함.
 */

export const MIN_ACTION_DURATION_MS = 100;

/**
 * speedBonus: 0 = +0%, 1 = +100% ...
 * 점근선 수식(base / (1 + bonus))이라 bonus가 아무리 커져도 duration은 0에 한없이
 * 가까워질 뿐 음수가 되지 않음. 추가로 100ms 하드캡도 걸어둠.
 */
export function getActualDurationMs(baseDurationMs: number, speedBonus: number): number {
  const duration = baseDurationMs / (1 + Math.max(0, speedBonus));
  return Math.max(MIN_ACTION_DURATION_MS, duration);
}

/** 확률형 옵션(절약/캐시백 등)은 전부 이 함수를 거쳐서 0~100 범위를 벗어나지 못하게 함. */
export function clampProbabilityPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
