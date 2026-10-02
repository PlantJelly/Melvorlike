import { ResourceDB, playable, skillNames, toolTiers } from '../src/content/resources';
import { projectIds } from '../src/content/projects';
import { FACILITY_MAX_LEVEL, facilityIds } from '../src/content/facilities';
import { decodeSave, encodeSave } from '../src/engine/save';
import { LEVEL_MARKS, playthroughScenarios, simulatePlaythrough, type PlaythroughResult } from '../src/engine/playthrough';

const DAY = 86_400_000;
// scripts는 Node 타입 없이 타입 검사되므로 process를 globalThis로 읽는다.
const argv = (globalThis as {process?: {argv: string[]}}).process?.argv ?? [];
const horizonDays = Number(argv[2] ?? 365);
if (!Number.isFinite(horizonDays) || horizonDays <= 0) throw new RangeError('시뮬레이션 기간(일)은 양수여야 합니다.');

function duration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return '미달';
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}초`;
  const minutes = ms / 60_000;
  if (minutes < 60) return `${minutes.toFixed(0)}분`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)}시간`;
  return `${(hours / 24).toFixed(1)}일`;
}

const number = (value: number) => Math.round(value).toLocaleString('ko-KR');
const percent = (part: number, whole: number) => `${(part / whole * 100).toFixed(1)}%`;

const results = playthroughScenarios.map(scenario => simulatePlaythrough(scenario, {horizonMs: horizonDays * DAY}));
const header = (first: string) => `| ${first} | ${results.map(r => r.scenario.name).join(' | ')} |\n| --- | ${results.map(() => '---:').join(' | ')} |`;
const lastOf = (r: PlaythroughResult, test: (id: string) => boolean) => {
  const goals = r.goals.filter(goal => test(goal.id));
  return goals.every(goal => goal.doneMs !== null) ? Math.max(...goals.map(goal => goal.doneMs!)) : null;
};
const maxed = (r: PlaythroughResult) => playable.filter(skill => r.final.skills[skill].level >= 99);

console.log('# 전체 진행 경로 시뮬레이션 보고서');
console.log('');
console.log(`- 새 저장에서 실제 게임 엔진 함수만 호출하는 플레이 정책(봇)으로 ${horizonDays}일을 진행한 측정값입니다(D044). 최적 플레이나 확정 밸런스가 아닙니다.`);
console.log('- 목표 순서: 왕국 11구역 복원(구역이 연 스킬의 돌 도구 포함) → 장신구·도구 티어·밭/축사·동물·길드 → 전 스킬 Lv99.');
console.log('- 정책 가정: 음식·비료·일일 퀘스트·환전 미사용. 원재료 구매: 첫 씨앗, 동물 사료(밭이 못 따라갈 때), 그리고 보유 골드가 200만 G를 넘으면 그 초과분으로 필요한 채집 원재료 중 그 스킬의 현재 최고 단계보다 낮은 것을 산다(D051 따라잡기, 산 재료는 되팔지 않음). 골드가 모자라면 목표에 쓰이지 않는 보유품을 팔고, 그래도 모자라면 시간당 판매가가 가장 높은 원재료를 채집해 판다. 목표가 밭·동물을 기다리는 동안에는 가장 낮은 채집 스킬을 올린다.');
console.log('- 자동 파종/수확을 설치하며(농사 Lv25), 필요한 작물이 어느 칸에도 없으면 필요 없는 작물 칸을 비우고 바꿔 심는다(D045).');
console.log('- "1시간마다 확인"은 1시간 간격으로만 결정하며, 지금 작업이 먼저 끝나면 남는 시간을 채울 채집을 다음 작업으로 예약한다.');
console.log('');

console.log('## 요약');
console.log('');
console.log(header('항목'));
const rows: [string, (r: PlaythroughResult) => string][] = [
  ['왕국 11구역 복원', r => duration(lastOf(r, id => id.startsWith('project:')))],
  ['전 스킬 구리 도구', r => duration(lastOf(r, id => id.startsWith('tool:') && id.endsWith(':2')))],
  ['전 스킬 철 도구', r => duration(lastOf(r, id => id.startsWith('tool:') && id.endsWith(':3')))],
  ['밭 3칸·축사 2단계', r => duration(lastOf(r, id => id === 'plot:3' || id === 'barn:2'))],
  ['동물 종별 3마리', r => duration(lastOf(r, id => id.startsWith('animal:') && id.endsWith(':3')))],
  ['장신구 금 재질 3개', r => duration(lastOf(r, id => id.startsWith('accessory:') && id.endsWith(':3')))],
  ['왕국 시설 전부 최대 강화', r => duration(r.samples.find(sample => sample.facilityLevels === facilityIds.length * FACILITY_MAX_LEVEL)?.timeMs ?? null)],
  ['전 스킬 Lv99·시설 최대', r => duration(lastOf(r, id => id === 'max'))],
  [`${horizonDays}일 뒤 Lv99 스킬 수`, r => `${maxed(r).length}/${playable.length}`],
  [`${horizonDays}일 뒤 가장 낮은 스킬`, r => { const low = [...playable].sort((a, b) => r.final.skills[a].level - r.final.skills[b].level)[0]; return `${skillNames[low]} Lv${r.final.skills[low].level}`; }],
  [`${horizonDays}일 뒤 누적 획득 골드`, r => `${number(r.final.goldEarned)} G`],
  ['원재료 구매에 쓴 골드', r => `${number(r.goldSpentBuying)} G`],
  [`${horizonDays}일 뒤 보유 골드`, r => `${number(r.final.gold)} G`],
  ['액티브 슬롯 유휴 비율', r => percent(r.idleMs, r.elapsedMs)],
  ['멈춤', r => r.stuck ?? '없음'],
  ['최종 상태 저장 검증', r => { try { decodeSave(encodeSave(r.final)); return '통과'; } catch (error) { return `실패(${(error as Error).message})`; } }],
];
for (const [label, cell] of rows) console.log(`| ${label} | ${results.map(cell).join(' | ')} |`);

for (const r of results) {
  console.log('');
  console.log(`## 병목 — 대기가 긴 목표 (${r.scenario.name})`);
  console.log('');
  console.log('- 목표가 밭 작물·동물 산출·패시브 레벨을 기다린 시간입니다. 그 사이 액티브 슬롯은 다른 스킬을 올립니다.');
  console.log('');
  console.log('| 목표 | 대기 사유 | 대기 | 목표 소요 |');
  console.log('| --- | --- | ---: | ---: |');
  const waits = r.goals.flatMap(goal => Object.entries(goal.waitMs).map(([reason, ms]) => ({goal, reason, ms})))
    .sort((a, b) => b.ms - a.ms).slice(0, 8);
  for (const {goal, reason, ms} of waits) {
    const spent = goal.startMs === null ? null : (goal.doneMs ?? r.elapsedMs) - goal.startMs;
    console.log(`| ${goal.label} | ${reason} | ${duration(ms)} | ${goal.doneMs === null ? `미달(${duration(spent)} 경과)` : duration(spent)} |`);
  }
}

console.log('');
console.log('## 목표 달성 시각');
console.log('');
console.log(header('목표'));
results[0].goals.forEach((goal, i) => console.log(`| ${goal.label} | ${results.map(r => duration(r.goals[i].doneMs)).join(' | ')} |`));

for (const r of results) {
  console.log('');
  console.log(`## 스킬 레벨 도달 시각 (${r.scenario.name})`);
  console.log('');
  console.log(`| 스킬 | ${LEVEL_MARKS.map(level => `Lv${level}`).join(' | ')} | 활동 시간 |`);
  console.log(`| --- | ${LEVEL_MARKS.map(() => '---:').join(' | ')} | ---: |`);
  for (const skill of playable) {
    const cells = LEVEL_MARKS.map(level => duration(r.levelMarks.find(mark => mark.skill === skill && mark.level === level)?.timeMs ?? null));
    const active = skill === 'farming' || skill === 'ranching' ? '패시브' : duration(r.activeMs[skill] ?? 0);
    console.log(`| ${skillNames[skill]} | ${cells.join(' | ')} | ${active} |`);
  }
  console.log(`| 왕국 공사 | | | | | | ${duration(r.activeMs.kingdom ?? 0)} |`);
  console.log(`| 유휴 | | | | | | ${duration(r.idleMs)} |`);
}

// 해금 간격(D049): 스킬별 해금 레벨(그 스킬 재료·레시피 + 도구 단계)에 처음 도달한 시각과, Lv50 이후 가장 긴 해금 사이 시간.
for (const r of results) {
  console.log('');
  console.log(`## 해금 간격 (${r.scenario.name})`);
  console.log('');
  console.log('- 해금 레벨 = 그 스킬의 새 재료·레시피 레벨 + 도구 단계 레벨. 시각은 그 레벨에 처음 도달한 때입니다.');
  console.log('');
  console.log('| 스킬 | 해금 횟수 | Lv50 | Lv65 | Lv80 | Lv95 | Lv99 | Lv50 이후 최장 간격 |');
  console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const skill of playable) {
    const unlocks = [...new Set([...Object.values(ResourceDB).filter(x => x.skill === skill && !x.dropOnly).map(x => x.reqLevel), ...toolTiers.slice(1).map(x => x.level)])].sort((a, b) => a - b);
    const at = (level: number) => r.levelTimes[skill][level] ?? null;
    const late = [...unlocks.filter(level => level >= 50), 99];
    let gap = 0;
    for (let i = 1; i < late.length; i++) {
      const a = at(late[i - 1]), b = at(late[i]) ?? (a === null ? null : r.elapsedMs);
      if (a !== null && b !== null) gap = Math.max(gap, b - a);
    }
    console.log(`| ${skillNames[skill]} | ${unlocks.length} | ${[50, 65, 80, 95, 99].map(level => duration(at(level))).join(' | ')} | ${gap ? duration(gap) : '-'} |`);
  }
}

console.log('');
console.log('## 골드·복원·시설 곡선');
console.log('');
const days = [1, 3, 7, 14, 30, 60, 90, 180, 365].filter(day => day <= horizonDays);
console.log(`| 일차 | ${results.map(r => `${r.scenario.name} 보유 | 누적 획득 | 복원 | 시설 단계`).join(' | ')} |`);
console.log(`| ---: | ${results.map(() => '---: | ---: | ---: | ---:').join(' | ')} |`);
for (const day of days) {
  const cells = results.map(r => {
    const sample = r.samples.find(entry => entry.timeMs === day * DAY);
    return sample ? `${number(sample.gold)} | ${number(sample.goldEarned)} | ${sample.restored}/${projectIds.length} | ${sample.facilityLevels}/${facilityIds.length * FACILITY_MAX_LEVEL}` : '- | - | - | -';
  });
  console.log(`| ${day} | ${cells.join(' | ')} |`);
}
