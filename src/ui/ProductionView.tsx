import { For, Show, createSignal } from 'solid-js';
import type { SkillId } from '../content/types';
import { ResourceDB, skillNames } from '../content/resources';
import { state } from '../state/gameState';
import { afford, duration } from '../engine/model';
import { queueActionAction, startAction } from '../engine/actions';
import { FoodButtons } from './Food';
import { CHANCE_SCALE } from '../content/chance';
import { COAL_CHANCE, veinChance } from '../content/mining';
import { junkChance } from '../content/fishing';
import { SAPLING_CHANCE } from '../content/saplings';

// game_design §2.4: 화로/용광로는 별도 건물이 아니라 같은 대장간의 레벨 구간별 명칭이다.
// 철 주괴 해금 레벨(Lv10)부터 용광로로 부른다.
const FURNACE_LEVEL = 10;
const forgeName = (level: number) => level < FURNACE_LEVEL ? '화로' : '용광로';

export const fmt = (n: number) => n.toLocaleString('ko-KR', {maximumFractionDigits: 0});
export const costText = (cost: Record<string, number>) => Object.entries(cost)
  .map(([id, n]) => `${ResourceDB[id].name} ${n} (보유 ${state().inventory[id] ?? 0})`).join(' · ');

// 목표 수량 입력은 화면을 오가도 유지한다(빈칸이면 제한 없이 계속).
const [targetText, setTargetText] = createSignal('');
const target = () => {
  const n = Number(targetText());
  return targetText().trim() !== '' && Number.isSafeInteger(n) && n >= 1 ? n : undefined;
};

export function ProductionView(props: {skill: SkillId}) {
  const skill = () => state().skills[props.skill];
  const busy = () => !!state().currentAction;
  const running = (resourceId: string) => {
    const action = state().currentAction;
    return action?.kind === 'production' && action.resourceId === resourceId;
  };
  return <>
    <h1>{skillNames[props.skill]}</h1>
    <p class="muted">레벨 {skill().level} · 경험치 {fmt(skill().exp)} / {fmt(skill().maxExp)}</p>
    <Show when={props.skill === 'fishing'}><p class="intro-note">개울에서 시작해 더 높은 레벨의 낚시터를 여세요. 잡은 물고기는 요리 재료가 됩니다. 낚시터마다 꽝이 나올 수 있고, 낚시 레벨이 오를수록 줄어듭니다(꽝이어도 경험치는 얻습니다).</p></Show>
    <Show when={props.skill === 'logging'}><p class="intro-note">묘목 확률 {(SAPLING_CHANCE / 100).toFixed(2)}% · 묘목 기운 {Math.floor(state().saplingProgress / CHANCE_SCALE * 100)}% — 나무를 벨 때마다 쌓이고 100%가 되면 그 나무의 묘목을 얻습니다. 농사가 열려 있으면 밭에 심어 원목을 대량으로 수확할 수 있습니다.</p></Show>
    <Show when={props.skill === 'mining'}><p class="intro-note">광맥 발견 확률 {(veinChance(skill().level) / 100).toFixed(2)}% · 광맥 기운 {Math.floor(state().veinProgress / CHANCE_SCALE * 100)}% — 채굴할 때마다 쌓이고 100%가 되면 한 단계 위 광물과 마나석을 1개씩 더 얻습니다. 어떤 광물을 캐든 석탄이 {COAL_CHANCE / 100}% 확률로 함께 나오며(보유 {fmt(state().inventory.coal ?? 0)}), 구리·철 주괴의 연료로 쓰입니다.</p></Show>
    <Show when={props.skill === 'blacksmithing'}><p class="intro-note">대장간 설비: <strong>{forgeName(skill().level)}</strong>{skill().level < FURNACE_LEVEL ? ` — 대장작업 Lv${FURNACE_LEVEL}에 용광로로 확장됩니다.` : ' — 철 이상의 주괴를 제련할 수 있습니다.'}</p></Show>
    <Show when={props.skill === 'cooking'}><p class="intro-note">음식 효과는 한 종류만 적용됩니다. 같은 음식은 지속시간이 늘어나며, 접속을 종료해도 시간이 흐릅니다.</p></Show>
    <label class="muted target-input">목표 수량 <input aria-label="목표 수량" type="number" min="1" step="1" placeholder="제한 없음" value={targetText()} onInput={e => setTargetText(e.currentTarget.value)}/> 개 — 채우면 멈추고, 예약한 다음 작업이 있으면 이어서 시작합니다.</label>
    <div class="cards">
      <For each={Object.values(ResourceDB).filter(r => r.skill === props.skill && !r.dropOnly)}>{r =>
        <article>
          <Show when={r.area}><span class="area-label">{r.area}</span></Show>
          <div class="item-icon">{r.icon}</div>
          <h2>{r.name}</h2>
          <p>보유 <strong>{fmt(state().inventory[r.id] ?? 0)}</strong></p>
          <p class="muted">{(duration(state(), r.id) / 1000).toFixed(1)}초 · 경험치 +{r.exp}{r.skill === 'fishing' && skill().level >= r.reqLevel ? ` · 꽝 ${(junkChance(r.id, r.reqLevel, skill().level) / 100).toFixed(1)}%` : ''}</p>
          <Show when={r.recipe}><p class="recipe">{costText(r.recipe!)}</p></Show>
          <button class="production-button"
            disabled={skill().level < r.reqLevel || !afford(state(), r.recipe ?? {}) || running(r.id)}
            onClick={() => startAction(r.skill, r.id, target())}>
            {skill().level < r.reqLevel ? `레벨 ${r.reqLevel}에 해금` : running(r.id) ? '진행 중' : r.recipe ? '제작 시작' : '채집 시작'}
          </button>
          <Show when={busy() && !running(r.id) && skill().level >= r.reqLevel}>
            <button onClick={() => queueActionAction(r.id, target())}>다음 작업으로 예약</button>
          </Show>
          <FoodButtons id={r.id}/>
        </article>
      }</For>
    </div>
  </>;
}
