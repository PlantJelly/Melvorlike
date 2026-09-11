import { createSignal, Show } from 'solid-js';
import { FoodDB } from '../content/foods';
import { ResourceDB } from '../content/resources';
import { state } from '../state/gameState';
import { useFood } from '../engine/actions';

export function timeText(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}

export function FoodButtons(props: {id: string}) {
  const [pending, setPending] = createSignal(0);
  const food = () => FoodDB[props.id];
  const replacing = () => !!state().meal && state().meal!.foodId !== props.id;
  function request(count: number) {
    if (replacing()) setPending(count);
    else useFood(props.id, count);
  }
  return <Show when={food()}>
    <div class="food-controls">
      <small class="food-description">{food().description} · 1개당 {food().durationMs / 60000}분</small>
      <div class="button-row">
        <button disabled={(state().inventory[props.id] ?? 0) < 1} onClick={() => request(1)}>1개 먹기</button>
        <button disabled={(state().inventory[props.id] ?? 0) < 5} onClick={() => request(5)}>5개 먹기</button>
      </div>
      <Show when={pending()}>
        <div class="replace-meal" role="alert">
          <p>{state().meal ? `${ResourceDB[state().meal!.foodId].name}의 남은 효과 ${timeText(state().meal!.remainingMs)}를 없애고 교체합니다.` : '선택한 음식을 사용합니다.'}</p>
          <div class="button-row">
            <button disabled={(state().inventory[props.id] ?? 0) < pending()} onClick={() => {useFood(props.id, pending()); setPending(0);}}>음식 사용 확정</button>
            <button onClick={() => setPending(0)}>취소</button>
          </div>
        </div>
      </Show>
    </div>
  </Show>;
}

export function MealStatus() {
  const meal = () => state().meal;
  return <section class="meal-status" aria-label="음식 효과">
    <Show when={meal()} fallback={<span>🍽️ 음식 효과 없음 · 요리한 음식을 먹으면 작업 속도가 높아집니다.</span>}>
      <strong>🍽️ {ResourceDB[meal()!.foodId].name}</strong>
      <span>{FoodDB[meal()!.foodId].description}</span>
      <span>남은 시간 {timeText(meal()!.remainingMs)}</span>
    </Show>
  </section>;
}
