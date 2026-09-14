import { ResourceDB, playable, skillNames } from '../src/content/resources';
import { progressionCheckpoints, progressionScenarios, resourceRate, simulateSkillToLevel } from '../src/engine/progression';

function duration(ms: number) {
  const minutes = ms / 60_000;
  if (minutes < 60) return `${minutes.toFixed(1)}분`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)}시간`;
  return `${(hours / 24).toFixed(1)}일`;
}

function number(value: number) {
  return Math.round(value).toLocaleString('ko-KR');
}

console.log('# 왕국 재건 성장 곡선 보고서');
console.log('');
console.log('- 현재 콘텐츠 데이터와 엔진 경험치 공식을 직접 사용합니다.');
console.log('- 각 레벨에서 시간당 경험치가 가장 높은 해금 자원을 자동 선택합니다.');
console.log('- 가공 스킬의 입력 재료와 도구 제작 비용은 무한히 공급된다고 가정한 순수 성장 시간입니다.');
console.log('- 해금 도구 시나리오는 요구 레벨에 도달하면 제작 비용 없이 즉시 장착한다고 가정합니다.');
console.log('- 생산량과 판매가는 입력 재료·씨앗 비용을 빼지 않은 총량이며, 농사는 실제 수확 반환량을 반영합니다.');
console.log('');
console.log('## 레벨 체크포인트');
console.log('');
console.log(`| 스킬 | 목표 | ${progressionScenarios.map(scenario => scenario.name).join(' | ')} |`);
console.log(`| --- | ---: | ${progressionScenarios.map(() => '---:').join(' | ')} |`);
for (const skill of playable) {
  for (const checkpoint of progressionCheckpoints) {
    const cells = progressionScenarios.map(scenario => duration(simulateSkillToLevel(skill, checkpoint, scenario).elapsedMs));
    console.log(`| ${skillNames[skill]} | Lv.${checkpoint} | ${cells.join(' | ')} |`);
  }
}

console.log('');
console.log('## 자원 기본 효율');
console.log('');
console.log('| 스킬 | 자원 | 해금 | 1회 시간 | 시간당 생산 | 시간당 경험치 | 시간당 총 판매가 |');
console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: |');
for (const resource of Object.values(ResourceDB)) {
  const rate = resourceRate(resource.id, progressionScenarios[0], resource.reqLevel);
  console.log(`| ${skillNames[resource.skill]} | ${resource.name} | Lv.${resource.reqLevel} | ${(rate.durationMs / 1000).toFixed(1)}초 | ${number(rate.unitsPerHour)} | ${number(rate.experiencePerHour)} | ${number(rate.grossGoldPerHour)} G |`);
}
