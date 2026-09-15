import { describe, expect, it } from 'vitest';
import { ProjectDB } from '../content/projects';
import {
  advance,
  begin,
  buyAnimal,
  buyResource,
  deliverProjectMaterial,
  featureUnlocked,
  initial,
  kingdomRestoration,
  unlockedGame,
  skillUnlocked,
  startProjectWork,
  surveyProject,
  upgrade,
  type Model,
} from './model';
import { decodeSave, encodeSave } from './save';

const project = ProjectDB.ruined_forge;

function finishClearing(s: Model) {
  expect(surveyProject(s, 'ruined_forge')).toBe(true);
  expect(startProjectWork(s, 'ruined_forge')).toBe(true);
  advance(s, s.lastSaveTime + project.clearingDurationMs);
  expect(s.projects.ruined_forge.phase).toBe('delivery');
}

function supplyForge(s: Model) {
  s.inventory.wood = (s.inventory.wood ?? 0) + project.materials.wood;
  s.inventory.stone = (s.inventory.stone ?? 0) + project.materials.stone;
  expect(deliverProjectMaterial(s, 'ruined_forge', 'wood', project.materials.wood)).toBe(project.materials.wood);
  expect(deliverProjectMaterial(s, 'ruined_forge', 'stone', project.materials.stone)).toBe(project.materials.stone);
  expect(s.projects.ruined_forge.phase).toBe('restorable');
}

describe('왕국 복원 프로젝트', () => {
  it('신규 저장은 벌목과 채광만 열리고 대장작업과 시설 행동을 거부한다', () => {
    const s = initial(0);
    expect(s.unlockedSkills).toEqual(['logging', 'mining']);
    expect(s.unlockedFeatures).toEqual([]);
    expect(s.projects.ruined_forge.phase).toBe('surveyable');
    expect(skillUnlocked(s, 'blacksmithing')).toBe(false);
    expect(begin(s, 'brick')).toBe(false);
    s.inventory.wood = 5;
    s.inventory.brick = 3;
    expect(upgrade(s, 'logging')).toBe(false);
    expect(buyResource(s, 'wheat', 1)).toBe(false);
    expect(buyAnimal(s, 'chicken')).toBe(false);
    expect(kingdomRestoration(s)).toBe(0);
  });

  it('정리 진행도는 작업 전환 뒤에도 보존되고 회수품은 한 번만 지급된다', () => {
    const s = initial(0);
    expect(surveyProject(s, 'ruined_forge')).toBe(true);
    expect(startProjectWork(s, 'ruined_forge')).toBe(true);
    advance(s, 10_000);
    expect(s.projects.ruined_forge.clearingProgressMs).toBe(10_000);
    expect(begin(s, 'wood')).toBe(true);
    advance(s, 13_000);
    expect(s.inventory.wood).toBe(1);
    expect(s.projects.ruined_forge.clearingProgressMs).toBe(10_000);
    expect(startProjectWork(s, 'ruined_forge')).toBe(true);
    advance(s, 33_000);
    expect(s.projects.ruined_forge.phase).toBe('delivery');
    expect(s.inventory.wood).toBe(1 + project.salvage.wood);
    expect(s.inventory.stone).toBe(project.salvage.stone);
    advance(s, 333_000);
    expect(s.inventory.wood).toBe(1 + project.salvage.wood);
    expect(s.inventory.stone).toBe(project.salvage.stone);
  });

  it('짧은 틱과 긴 오프라인 정산의 정리 결과가 같다', () => {
    const offline = initial(0);
    const online = initial(0);
    surveyProject(offline, 'ruined_forge');
    surveyProject(online, 'ruined_forge');
    startProjectWork(offline, 'ruined_forge');
    startProjectWork(online, 'ruined_forge');
    advance(offline, project.clearingDurationMs);
    for (let time = 137; time < project.clearingDurationMs; time += 137) advance(online, time);
    advance(online, project.clearingDurationMs);
    expect(online).toEqual(offline);
  });

  it('자재를 나누어 납품하고 보유량과 요구량을 넘겨 소비하지 않는다', () => {
    const s = initial(0);
    finishClearing(s);
    s.inventory.wood = 20;
    s.inventory.stone = 6;
    expect(deliverProjectMaterial(s, 'ruined_forge', 'wood', 5)).toBe(5);
    expect(deliverProjectMaterial(s, 'ruined_forge', 'wood', 100)).toBe(7);
    expect(deliverProjectMaterial(s, 'ruined_forge', 'wood', 1)).toBe(0);
    expect(s.inventory.wood).toBe(8);
    expect(deliverProjectMaterial(s, 'ruined_forge', 'stone', 100)).toBe(6);
    expect(s.inventory.stone).toBe(0);
    expect(s.projects.ruined_forge.phase).toBe('delivery');
    s.inventory.stone = 10;
    expect(deliverProjectMaterial(s, 'ruined_forge', 'stone', 100)).toBe(4);
    expect(s.inventory.stone).toBe(6);
    expect(s.projects.ruined_forge.phase).toBe('restorable');
  });

  it('복원 진행도를 보존하고 완료 시 대장작업과 도구 제작을 영구 해금한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    expect(startProjectWork(s, 'ruined_forge')).toBe(true);
    advance(s, s.lastSaveTime + 15_000);
    expect(s.projects.ruined_forge.restorationProgressMs).toBe(15_000);
    expect(begin(s, 'wood')).toBe(true);
    expect(s.projects.ruined_forge.restorationProgressMs).toBe(15_000);
    expect(startProjectWork(s, 'ruined_forge')).toBe(true);
    advance(s, s.lastSaveTime + 30_000);
    expect(s.projects.ruined_forge.phase).toBe('complete');
    expect(skillUnlocked(s, 'blacksmithing')).toBe(true);
    expect(featureUnlocked(s, 'tools')).toBe(true);
    expect(kingdomRestoration(s)).toBe(1);
    expect(startProjectWork(s, 'ruined_forge')).toBe(false);
  });

  it('v10은 중단된 프로젝트 작업과 부분 납품을 왕복 보존한다', () => {
    const active = initial(0);
    surveyProject(active, 'ruined_forge');
    startProjectWork(active, 'ruined_forge');
    advance(active, 10_000);
    const restoredActive = decodeSave(encodeSave(active));
    expect(restoredActive.projects).toEqual(active.projects);
    expect(restoredActive.currentAction).toEqual(active.currentAction);

    const partial = initial(0);
    finishClearing(partial);
    partial.inventory.wood = 8;
    expect(deliverProjectMaterial(partial, 'ruined_forge', 'wood', 5)).toBe(5);
    const restoredPartial = decodeSave(encodeSave(partial));
    expect(restoredPartial.projects).toEqual(partial.projects);
    expect(restoredPartial.unlockedSkills).toEqual(partial.unlockedSkills);
    expect(restoredPartial.unlockedFeatures).toEqual(partial.unlockedFeatures);
    expect(restoredPartial.inventory).toEqual(partial.inventory);
  });

  it('v1~v9 저장은 모든 기존 기능과 생산 작업을 유지하고 회수품을 재지급하지 않는다', () => {
    const old = unlockedGame(0);
    old.inventory.wood = 7;
    begin(old, 'wood');
    advance(old, 1_000);
    const raw = JSON.parse(encodeSave(old));
    delete raw.checksum;
    raw.version = 9;
    delete raw.unlockedSkills;
    delete raw.unlockedFeatures;
    delete raw.projects;
    raw.currentAction = {resourceId: raw.currentAction.resourceId, progressMs: raw.currentAction.progressMs};
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(11);
    expect(migrated.unlockedSkills).toEqual(old.unlockedSkills);
    expect(migrated.unlockedFeatures).toEqual(old.unlockedFeatures);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    // v9는 왕국 시스템 자체가 없던 시절의 저장이라(그 어떤 스킬도 잠겨있지 않았음), 부서진
    // 다리를 포함해 그 시점에 존재하는 모든 프로젝트가 이미 완료된 것으로 이전된다 —
    // "이미 열려 있던 기능을 잃지 않는다" 원칙이 대장간에만 국한되지 않고 적용된다.
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(migrated.inventory.wood).toBe(7);
    expect(migrated.currentAction).toEqual({kind: 'production', resourceId: 'wood', progressMs: 1_000});
  });

  it('부서진 다리 도입 전(v10) 저장은 대장간 상태를 보존하고 다리는 미시작으로 이전한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    expect(startProjectWork(s, 'ruined_forge')).toBe(true);
    advance(s, s.lastSaveTime + project.restorationDurationMs);
    expect(s.projects.ruined_forge.phase).toBe('complete');
    expect(skillUnlocked(s, 'blacksmithing')).toBe(true);

    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 10;
    delete raw.projects.broken_bridge;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'fishing');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(11);
    // 대장간은 v10에서 이미 진행한 그대로 보존된다.
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    // 새로 추가된 다리는 자동 완료되지 않고 미시작 상태로 나타난다 — 직접 진행해야 한다.
    expect(migrated.projects.broken_bridge.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'fishing')).toBe(false);
  });

  it('v11 저장은 두 프로젝트를 모두 검증하고, 저장 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    expect(surveyProject(s, 'broken_bridge')).toBe(true);
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    // v10인데 아직 도입되지 않았어야 할 broken_bridge 키가 섞여 있으면 거부.
    const asV10 = {...raw, version: 10};
    expect(() => decodeSave(JSON.stringify(asV10))).toThrow('왕국 정보 오류');
    // v11인데 ruined_forge 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingForge = JSON.parse(JSON.stringify(raw));
    delete missingForge.projects.ruined_forge;
    expect(() => decodeSave(JSON.stringify(missingForge))).toThrow('왕국 정보 오류');
  });

  it('부서진 다리 완료 시 낚시를 영구 해금하고 복원도가 2가 된다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    expect(startProjectWork(s, 'ruined_forge')).toBe(true);
    advance(s, s.lastSaveTime + project.restorationDurationMs);
    expect(kingdomRestoration(s)).toBe(1);

    const bridge = ProjectDB.broken_bridge;
    expect(surveyProject(s, 'broken_bridge')).toBe(true);
    expect(startProjectWork(s, 'broken_bridge')).toBe(true);
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    expect(s.projects.broken_bridge.phase).toBe('delivery');
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    // 벽돌은 대장작업(이미 해금됨) 산출물이다 — 가공 자체는 다른 테스트가 이미 검증하므로
    // 여기서는 납품에 필요한 만큼 보유한 상태만 준비한다.
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    expect(deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood)).toBe(bridge.materials.wood);
    expect(deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick)).toBe(bridge.materials.brick);
    expect(s.projects.broken_bridge.phase).toBe('restorable');
    expect(startProjectWork(s, 'broken_bridge')).toBe(true);
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    expect(s.projects.broken_bridge.phase).toBe('complete');
    expect(skillUnlocked(s, 'fishing')).toBe(true);
    expect(kingdomRestoration(s)).toBe(2);
  });

  it('모순된 프로젝트 단계와 현재 작업을 손상 저장으로 거부한다', () => {
    const partial = initial(0);
    surveyProject(partial, 'ruined_forge');
    startProjectWork(partial, 'ruined_forge');
    advance(partial, 10_000);
    const wrongProgress = JSON.parse(encodeSave(partial));
    delete wrongProgress.checksum;
    wrongProgress.currentAction.progressMs = 9_999;
    expect(() => decodeSave(JSON.stringify(wrongProgress))).toThrow('작업 정보 오류');

    const impossible = JSON.parse(encodeSave(initial(0)));
    delete impossible.checksum;
    impossible.projects.ruined_forge.phase = 'complete';
    expect(() => decodeSave(JSON.stringify(impossible))).toThrow('왕국 정보 오류');
  });
});
