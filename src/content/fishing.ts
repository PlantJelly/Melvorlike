// 낚시 꽝(game_design §2.3): 낚시터마다 꽝 확률이 다르고, 미끼 대신 낚시 레벨이 오를수록 줄어든다.
// 꽝이어도 경험치는 얻고 물고기만 없다. 확률은 만분율이며 D034의 정수 누적으로 처리한다. 수치는 임시값.
export const junkBase: Record<string, number> = {
  fish_small: 2000,
  fish_carp: 2500,
  fish_salmon: 3000,
};

// 낚시터 해금 레벨보다 1레벨 높을 때마다 0.5%p씩 줄어 0이 된다(개울 Lv41, 호수 Lv60, 여울 Lv90).
export const JUNK_DROP_PER_LEVEL = 50;

export function junkChance(fishId: string, reqLevel: number, fishingLevel: number) {
  const base = junkBase[fishId] ?? 0;
  return Math.max(0, base - Math.max(0, fishingLevel - reqLevel) * JUNK_DROP_PER_LEVEL);
}
