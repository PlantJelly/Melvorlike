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
    expect(migrated.version).toBe(17);
    expect(migrated.unlockedSkills).toEqual(old.unlockedSkills);
    expect(migrated.unlockedFeatures).toEqual(old.unlockedFeatures);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    // v9는 왕국 시스템 자체가 없던 시절의 저장이라(그 어떤 스킬도 잠겨있지 않았음), 부서진
    // 다리·무너진 식당·길드 회관·버려진 밭·낡은 축사·쓰러진 마법탑·무성해진 숲길을 포함해
    // 그 시점에 존재하는 모든 프로젝트가 이미 완료된 것으로 이전된다 — "이미 열려 있던
    // 기능을 잃지 않는다" 원칙이 대장간에만 국한되지 않는다.
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(migrated.projects.ruined_restaurant.phase).toBe('complete');
    expect(migrated.projects.guild_hall.phase).toBe('complete');
    expect(migrated.projects.abandoned_field.phase).toBe('complete');
    expect(migrated.projects.worn_out_barn.phase).toBe('complete');
    expect(migrated.projects.fallen_tower.phase).toBe('complete');
    expect(migrated.projects.overgrown_trail.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(skillUnlocked(migrated, 'cooking')).toBe(true);
    expect(featureUnlocked(migrated, 'guild')).toBe(true);
    expect(skillUnlocked(migrated, 'farming')).toBe(true);
    expect(skillUnlocked(migrated, 'ranching')).toBe(true);
    expect(skillUnlocked(migrated, 'magic')).toBe(true);
    expect(featureUnlocked(migrated, 'equipment')).toBe(true);
    expect(skillUnlocked(migrated, 'foraging')).toBe(true);
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
    delete raw.projects.ruined_restaurant;
    delete raw.projects.guild_hall;
    delete raw.projects.abandoned_field;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'fishing');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(17);
    // 대장간은 v10에서 이미 진행한 그대로 보존된다.
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    // 새로 추가된 다리·식당·길드 회관·버려진 밭·낡은 축사·쓰러진 마법탑·무성해진 숲길은 자동 완료되지 않고 미시작 상태로 나타난다 — 직접 진행해야 한다.
    expect(migrated.projects.broken_bridge.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'fishing')).toBe(false);
    expect(migrated.projects.ruined_restaurant.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'cooking')).toBe(false);
    expect(migrated.projects.guild_hall.phase).toBe('surveyable');
    expect(featureUnlocked(migrated, 'guild')).toBe(false);
    expect(migrated.projects.abandoned_field.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'farming')).toBe(false);
    expect(migrated.projects.worn_out_barn.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'ranching')).toBe(false);
    expect(migrated.projects.fallen_tower.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'magic')).toBe(false);
    expect(featureUnlocked(migrated, 'equipment')).toBe(false);
    expect(migrated.projects.overgrown_trail.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'foraging')).toBe(false);
  });

  it('무너진 식당 도입 전(v11) 저장은 대장간·다리 상태를 보존하고 식당은 미시작으로 이전한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);
    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);
    expect(s.projects.broken_bridge.phase).toBe('complete');

    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 11;
    delete raw.projects.ruined_restaurant;
    delete raw.projects.guild_hall;
    delete raw.projects.abandoned_field;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'cooking');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(17);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(migrated.projects.ruined_restaurant.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'cooking')).toBe(false);
    expect(migrated.projects.guild_hall.phase).toBe('surveyable');
    expect(featureUnlocked(migrated, 'guild')).toBe(false);
    expect(migrated.projects.abandoned_field.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'farming')).toBe(false);
    expect(migrated.projects.worn_out_barn.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'ranching')).toBe(false);
    expect(migrated.projects.fallen_tower.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'magic')).toBe(false);
    expect(featureUnlocked(migrated, 'equipment')).toBe(false);
    expect(migrated.projects.overgrown_trail.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'foraging')).toBe(false);
  });

  it('길드 회관 도입 전(v12) 저장은 대장간·다리·식당 상태를 보존하고 길드 회관은 미시작으로 이전한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);
    expect(s.projects.ruined_restaurant.phase).toBe('complete');

    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 12;
    delete raw.projects.guild_hall;
    delete raw.projects.abandoned_field;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    raw.unlockedFeatures = raw.unlockedFeatures.filter((id: string) => id !== 'guild');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(17);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(migrated.projects.ruined_restaurant.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(skillUnlocked(migrated, 'cooking')).toBe(true);
    expect(migrated.projects.guild_hall.phase).toBe('surveyable');
    expect(featureUnlocked(migrated, 'guild')).toBe(false);
    expect(migrated.projects.abandoned_field.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'farming')).toBe(false);
    expect(migrated.projects.worn_out_barn.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'ranching')).toBe(false);
    expect(migrated.projects.fallen_tower.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'magic')).toBe(false);
    expect(featureUnlocked(migrated, 'equipment')).toBe(false);
    expect(migrated.projects.overgrown_trail.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'foraging')).toBe(false);
  });

  it('버려진 밭 도입 전(v13) 저장은 대장간·다리·식당·길드 회관 상태를 보존하고 밭은 미시작으로 이전한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    const guildHall = ProjectDB.guild_hall;
    surveyProject(s, 'guild_hall');
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood);
    deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish);
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);
    expect(s.projects.guild_hall.phase).toBe('complete');

    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 13;
    delete raw.projects.abandoned_field;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'farming');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(17);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(migrated.projects.ruined_restaurant.phase).toBe('complete');
    expect(migrated.projects.guild_hall.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(skillUnlocked(migrated, 'cooking')).toBe(true);
    expect(featureUnlocked(migrated, 'guild')).toBe(true);
    expect(migrated.projects.abandoned_field.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'farming')).toBe(false);
    expect(migrated.projects.worn_out_barn.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'ranching')).toBe(false);
    expect(migrated.projects.fallen_tower.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'magic')).toBe(false);
    expect(featureUnlocked(migrated, 'equipment')).toBe(false);
    expect(migrated.projects.overgrown_trail.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'foraging')).toBe(false);
  });

  it('낡은 축사 도입 전(v14) 저장은 대장간·다리·식당·길드 회관·밭 상태를 보존하고 축사는 미시작으로 이전한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    const guildHall = ProjectDB.guild_hall;
    surveyProject(s, 'guild_hall');
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood);
    deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish);
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);

    const field = ProjectDB.abandoned_field;
    surveyProject(s, 'abandoned_field');
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + field.materials.wood;
    s.inventory.stone = (s.inventory.stone ?? 0) + field.materials.stone;
    deliverProjectMaterial(s, 'abandoned_field', 'wood', field.materials.wood);
    deliverProjectMaterial(s, 'abandoned_field', 'stone', field.materials.stone);
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.restorationDurationMs);
    expect(s.projects.abandoned_field.phase).toBe('complete');

    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 14;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'ranching');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(17);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(migrated.projects.ruined_restaurant.phase).toBe('complete');
    expect(migrated.projects.guild_hall.phase).toBe('complete');
    expect(migrated.projects.abandoned_field.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(skillUnlocked(migrated, 'cooking')).toBe(true);
    expect(featureUnlocked(migrated, 'guild')).toBe(true);
    expect(skillUnlocked(migrated, 'farming')).toBe(true);
    expect(migrated.projects.worn_out_barn.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'ranching')).toBe(false);
    expect(migrated.projects.fallen_tower.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'magic')).toBe(false);
    expect(featureUnlocked(migrated, 'equipment')).toBe(false);
    expect(migrated.projects.overgrown_trail.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'foraging')).toBe(false);
  });

  it('쓰러진 마법탑 도입 전(v15) 저장은 대장간·다리·식당·길드 회관·밭·축사 상태를 보존하고 마법탑은 미시작으로 이전한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    const guildHall = ProjectDB.guild_hall;
    surveyProject(s, 'guild_hall');
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood);
    deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish);
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);

    const field = ProjectDB.abandoned_field;
    surveyProject(s, 'abandoned_field');
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + field.materials.wood;
    s.inventory.stone = (s.inventory.stone ?? 0) + field.materials.stone;
    deliverProjectMaterial(s, 'abandoned_field', 'wood', field.materials.wood);
    deliverProjectMaterial(s, 'abandoned_field', 'stone', field.materials.stone);
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.restorationDurationMs);

    const barn = ProjectDB.worn_out_barn;
    surveyProject(s, 'worn_out_barn');
    startProjectWork(s, 'worn_out_barn');
    advance(s, s.lastSaveTime + barn.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + barn.materials.wood;
    s.inventory.wheat = (s.inventory.wheat ?? 0) + barn.materials.wheat;
    deliverProjectMaterial(s, 'worn_out_barn', 'wood', barn.materials.wood);
    deliverProjectMaterial(s, 'worn_out_barn', 'wheat', barn.materials.wheat);
    startProjectWork(s, 'worn_out_barn');
    advance(s, s.lastSaveTime + barn.restorationDurationMs);
    expect(s.projects.worn_out_barn.phase).toBe('complete');

    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 15;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'magic');
    raw.unlockedFeatures = raw.unlockedFeatures.filter((id: string) => id !== 'equipment');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(17);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(migrated.projects.ruined_restaurant.phase).toBe('complete');
    expect(migrated.projects.guild_hall.phase).toBe('complete');
    expect(migrated.projects.abandoned_field.phase).toBe('complete');
    expect(migrated.projects.worn_out_barn.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(skillUnlocked(migrated, 'cooking')).toBe(true);
    expect(featureUnlocked(migrated, 'guild')).toBe(true);
    expect(skillUnlocked(migrated, 'farming')).toBe(true);
    expect(skillUnlocked(migrated, 'ranching')).toBe(true);
    expect(migrated.projects.fallen_tower.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'magic')).toBe(false);
    expect(featureUnlocked(migrated, 'equipment')).toBe(false);
    expect(migrated.projects.overgrown_trail.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'foraging')).toBe(false);
  });

  it('무성해진 숲길 도입 전(v16) 저장은 대장간~마법탑 상태를 보존하고 숲길은 미시작으로 이전한다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    const guildHall = ProjectDB.guild_hall;
    surveyProject(s, 'guild_hall');
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood);
    deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish);
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);

    const field = ProjectDB.abandoned_field;
    surveyProject(s, 'abandoned_field');
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + field.materials.wood;
    s.inventory.stone = (s.inventory.stone ?? 0) + field.materials.stone;
    deliverProjectMaterial(s, 'abandoned_field', 'wood', field.materials.wood);
    deliverProjectMaterial(s, 'abandoned_field', 'stone', field.materials.stone);
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.restorationDurationMs);

    const barn = ProjectDB.worn_out_barn;
    surveyProject(s, 'worn_out_barn');
    startProjectWork(s, 'worn_out_barn');
    advance(s, s.lastSaveTime + barn.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + barn.materials.wood;
    s.inventory.wheat = (s.inventory.wheat ?? 0) + barn.materials.wheat;
    deliverProjectMaterial(s, 'worn_out_barn', 'wood', barn.materials.wood);
    deliverProjectMaterial(s, 'worn_out_barn', 'wheat', barn.materials.wheat);
    startProjectWork(s, 'worn_out_barn');
    advance(s, s.lastSaveTime + barn.restorationDurationMs);

    const tower = ProjectDB.fallen_tower;
    surveyProject(s, 'fallen_tower');
    startProjectWork(s, 'fallen_tower');
    advance(s, s.lastSaveTime + tower.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + tower.materials.wood;
    s.inventory.wool = (s.inventory.wool ?? 0) + tower.materials.wool;
    deliverProjectMaterial(s, 'fallen_tower', 'wood', tower.materials.wood);
    deliverProjectMaterial(s, 'fallen_tower', 'wool', tower.materials.wool);
    startProjectWork(s, 'fallen_tower');
    advance(s, s.lastSaveTime + tower.restorationDurationMs);
    expect(s.projects.fallen_tower.phase).toBe('complete');

    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 16;
    delete raw.projects.overgrown_trail;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'foraging');

    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(17);
    expect(migrated.projects.ruined_forge.phase).toBe('complete');
    expect(migrated.projects.broken_bridge.phase).toBe('complete');
    expect(migrated.projects.ruined_restaurant.phase).toBe('complete');
    expect(migrated.projects.guild_hall.phase).toBe('complete');
    expect(migrated.projects.abandoned_field.phase).toBe('complete');
    expect(migrated.projects.worn_out_barn.phase).toBe('complete');
    expect(migrated.projects.fallen_tower.phase).toBe('complete');
    expect(skillUnlocked(migrated, 'blacksmithing')).toBe(true);
    expect(skillUnlocked(migrated, 'fishing')).toBe(true);
    expect(skillUnlocked(migrated, 'cooking')).toBe(true);
    expect(featureUnlocked(migrated, 'guild')).toBe(true);
    expect(skillUnlocked(migrated, 'farming')).toBe(true);
    expect(skillUnlocked(migrated, 'ranching')).toBe(true);
    expect(skillUnlocked(migrated, 'magic')).toBe(true);
    expect(featureUnlocked(migrated, 'equipment')).toBe(true);
    expect(migrated.projects.overgrown_trail.phase).toBe('surveyable');
    expect(skillUnlocked(migrated, 'foraging')).toBe(false);
  });

  it('v12 저장(대장간+다리+식당 시절)은 세 프로젝트만 검증하고, 그 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    surveyProject(s, 'ruined_restaurant');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 12;
    delete raw.projects.guild_hall;
    delete raw.projects.abandoned_field;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    // v11인데 아직 도입되지 않았어야 할 ruined_restaurant 키가 섞여 있으면 거부.
    const asV11 = {...raw, version: 11};
    expect(() => decodeSave(JSON.stringify(asV11))).toThrow('왕국 정보 오류');
    // v12인데 broken_bridge 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingBridge = JSON.parse(JSON.stringify(raw));
    delete missingBridge.projects.broken_bridge;
    expect(() => decodeSave(JSON.stringify(missingBridge))).toThrow('왕국 정보 오류');
    // v12 그대로는(길드 회관·밭·축사·마법탑·숲길 키가 없는 채) 정상 통과해야 한다.
    expect(decodeSave(JSON.stringify(raw)).version).toBe(17);
  });

  it('v13 저장(대장간+다리+식당+길드 회관 시절)은 네 프로젝트만 검증하고, 그 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    surveyProject(s, 'guild_hall');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 13;
    delete raw.projects.abandoned_field;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    // v12인데 아직 도입되지 않았어야 할 guild_hall 키가 섞여 있으면 거부.
    const asV12 = {...raw, version: 12};
    expect(() => decodeSave(JSON.stringify(asV12))).toThrow('왕국 정보 오류');
    // v13인데 ruined_restaurant 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingRestaurant = JSON.parse(JSON.stringify(raw));
    delete missingRestaurant.projects.ruined_restaurant;
    expect(() => decodeSave(JSON.stringify(missingRestaurant))).toThrow('왕국 정보 오류');
    // v13 그대로는(밭·축사·마법탑·숲길 키가 없는 채) 정상 통과해야 한다.
    expect(decodeSave(JSON.stringify(raw)).version).toBe(17);
  });

  it('v14 저장(대장간+다리+식당+길드 회관+밭 시절)은 다섯 프로젝트만 검증하고, 그 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    surveyProject(s, 'abandoned_field');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 14;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    // v13인데 아직 도입되지 않았어야 할 abandoned_field 키가 섞여 있으면 거부.
    const asV13 = {...raw, version: 13};
    expect(() => decodeSave(JSON.stringify(asV13))).toThrow('왕국 정보 오류');
    // v14인데 guild_hall 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingGuildHall = JSON.parse(JSON.stringify(raw));
    delete missingGuildHall.projects.guild_hall;
    expect(() => decodeSave(JSON.stringify(missingGuildHall))).toThrow('왕국 정보 오류');
    // v14 그대로는(축사·마법탑·숲길 키가 없는 채) 정상 통과해야 한다.
    expect(decodeSave(JSON.stringify(raw)).version).toBe(17);
  });

  it('v15 저장(대장간+다리+식당+길드 회관+밭+축사 시절)은 여섯 프로젝트만 검증하고, 그 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    surveyProject(s, 'worn_out_barn');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 15;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    // v14인데 아직 도입되지 않았어야 할 worn_out_barn 키가 섞여 있으면 거부.
    const asV14 = {...raw, version: 14};
    expect(() => decodeSave(JSON.stringify(asV14))).toThrow('왕국 정보 오류');
    // v15인데 abandoned_field 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingField = JSON.parse(JSON.stringify(raw));
    delete missingField.projects.abandoned_field;
    expect(() => decodeSave(JSON.stringify(missingField))).toThrow('왕국 정보 오류');
    // v15 그대로는(마법탑·숲길 키가 없는 채) 정상 통과해야 한다.
    expect(decodeSave(JSON.stringify(raw)).version).toBe(17);
  });

  it('v16 저장은 일곱 프로젝트를 모두 검증하고, 저장 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    surveyProject(s, 'fallen_tower');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    // encodeSave는 항상 현재(ambient) 버전으로 쓰므로, 이 테스트가 실제로 v16을 검증하려면
    // raw.version을 16으로 명시적으로 고정해야 한다(아닐 경우 ambient 버전이 오를 때마다
    // 테스트 이름과 실제 검증 내용이 조용히 어긋나는, D024에서 닫은 것과 같은 종류의 버그).
    raw.version = 16;
    delete raw.projects.overgrown_trail;
    // v15인데 아직 도입되지 않았어야 할 fallen_tower 키가 섞여 있으면 거부.
    const asV15 = {...raw, version: 15};
    expect(() => decodeSave(JSON.stringify(asV15))).toThrow('왕국 정보 오류');
    // v16인데 worn_out_barn 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingBarn = JSON.parse(JSON.stringify(raw));
    delete missingBarn.projects.worn_out_barn;
    expect(() => decodeSave(JSON.stringify(missingBarn))).toThrow('왕국 정보 오류');
    // v16 그대로는(숲길 키가 없는 채) 정상 통과해야 한다.
    expect(decodeSave(JSON.stringify(raw)).version).toBe(17);
  });

  it('v17 저장은 여덟 프로젝트를 모두 검증하고, 저장 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    surveyProject(s, 'overgrown_trail');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    // v16인데 아직 도입되지 않았어야 할 overgrown_trail 키가 섞여 있으면 거부.
    const asV16 = {...raw, version: 16};
    expect(() => decodeSave(JSON.stringify(asV16))).toThrow('왕국 정보 오류');
    // v17인데 fallen_tower 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingTower = JSON.parse(JSON.stringify(raw));
    delete missingTower.projects.fallen_tower;
    expect(() => decodeSave(JSON.stringify(missingTower))).toThrow('왕국 정보 오류');
  });

  it('무너진 식당 완료 시 요리를 영구 해금하고 복원도가 3이 된다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);
    expect(kingdomRestoration(s)).toBe(2);

    const restaurant = ProjectDB.ruined_restaurant;
    expect(surveyProject(s, 'ruined_restaurant')).toBe(true);
    expect(startProjectWork(s, 'ruined_restaurant')).toBe(true);
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    expect(s.projects.ruined_restaurant.phase).toBe('delivery');
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    // 피라미는 낚시(이미 해금됨) 산출물이다 — 채집 자체는 다른 테스트가 검증하므로
    // 여기서는 납품에 필요한 만큼 보유한 상태만 준비한다.
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    expect(deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood)).toBe(restaurant.materials.wood);
    expect(deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small)).toBe(restaurant.materials.fish_small);
    expect(s.projects.ruined_restaurant.phase).toBe('restorable');
    expect(startProjectWork(s, 'ruined_restaurant')).toBe(true);
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    expect(s.projects.ruined_restaurant.phase).toBe('complete');
    expect(skillUnlocked(s, 'cooking')).toBe(true);
    expect(kingdomRestoration(s)).toBe(3);
  });

  it('v11 저장(대장간+다리 시절)은 두 프로젝트만 검증하고, 그 버전에 없어야 할 구역이 섞여 있으면 거부한다', () => {
    const s = initial(0);
    expect(surveyProject(s, 'broken_bridge')).toBe(true);
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 11;
    delete raw.projects.ruined_restaurant;
    delete raw.projects.guild_hall;
    delete raw.projects.abandoned_field;
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    raw.unlockedSkills = raw.unlockedSkills.filter((id: string) => id !== 'cooking');
    // v10인데 아직 도입되지 않았어야 할 broken_bridge 키가 섞여 있으면 거부.
    const asV10 = {...raw, version: 10};
    expect(() => decodeSave(JSON.stringify(asV10))).toThrow('왕국 정보 오류');
    // v11인데 ruined_forge 키가 빠져 있으면(있어야 할 구역 누락) 거부.
    const missingForge = JSON.parse(JSON.stringify(raw));
    delete missingForge.projects.ruined_forge;
    expect(() => decodeSave(JSON.stringify(missingForge))).toThrow('왕국 정보 오류');
    // v11 그대로는(식당·길드 회관·밭·축사·마법탑·숲길 키가 없는 채) 정상 통과해야 한다.
    expect(decodeSave(JSON.stringify(raw)).version).toBe(17);
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

  it('먼지 쌓인 길드 회관 완료 시 길드 기능을 영구 해금하고 복원도가 4가 된다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);
    expect(kingdomRestoration(s)).toBe(3);

    const guildHall = ProjectDB.guild_hall;
    expect(surveyProject(s, 'guild_hall')).toBe(true);
    expect(startProjectWork(s, 'guild_hall')).toBe(true);
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    expect(s.projects.guild_hall.phase).toBe('delivery');
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    // 구운 생선은 요리(이미 해금됨) 산출물이다 — 조리 자체는 다른 테스트가 검증하므로
    // 여기서는 납품에 필요한 만큼 보유한 상태만 준비한다.
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    expect(deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood)).toBe(guildHall.materials.wood);
    expect(deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish)).toBe(guildHall.materials.grilled_fish);
    expect(s.projects.guild_hall.phase).toBe('restorable');
    expect(startProjectWork(s, 'guild_hall')).toBe(true);
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);

    expect(s.projects.guild_hall.phase).toBe('complete');
    expect(featureUnlocked(s, 'guild')).toBe(true);
    expect(kingdomRestoration(s)).toBe(4);
  });

  it('버려진 밭 완료 시 농사를 영구 해금하고 복원도가 5가 된다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    const guildHall = ProjectDB.guild_hall;
    surveyProject(s, 'guild_hall');
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood);
    deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish);
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);
    expect(kingdomRestoration(s)).toBe(4);

    const field = ProjectDB.abandoned_field;
    expect(surveyProject(s, 'abandoned_field')).toBe(true);
    expect(startProjectWork(s, 'abandoned_field')).toBe(true);
    advance(s, s.lastSaveTime + field.clearingDurationMs);
    expect(s.projects.abandoned_field.phase).toBe('delivery');
    s.inventory.wood = (s.inventory.wood ?? 0) + field.materials.wood;
    s.inventory.stone = (s.inventory.stone ?? 0) + field.materials.stone;
    expect(deliverProjectMaterial(s, 'abandoned_field', 'wood', field.materials.wood)).toBe(field.materials.wood);
    expect(deliverProjectMaterial(s, 'abandoned_field', 'stone', field.materials.stone)).toBe(field.materials.stone);
    expect(s.projects.abandoned_field.phase).toBe('restorable');
    expect(startProjectWork(s, 'abandoned_field')).toBe(true);
    advance(s, s.lastSaveTime + field.restorationDurationMs);

    expect(s.projects.abandoned_field.phase).toBe('complete');
    expect(skillUnlocked(s, 'farming')).toBe(true);
    expect(kingdomRestoration(s)).toBe(5);
  });

  it('낡은 축사 완료 시 목장을 영구 해금하고 복원도가 6이 된다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    const guildHall = ProjectDB.guild_hall;
    surveyProject(s, 'guild_hall');
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood);
    deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish);
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);

    const field = ProjectDB.abandoned_field;
    surveyProject(s, 'abandoned_field');
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + field.materials.wood;
    s.inventory.stone = (s.inventory.stone ?? 0) + field.materials.stone;
    deliverProjectMaterial(s, 'abandoned_field', 'wood', field.materials.wood);
    deliverProjectMaterial(s, 'abandoned_field', 'stone', field.materials.stone);
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.restorationDurationMs);
    expect(kingdomRestoration(s)).toBe(5);

    const barn = ProjectDB.worn_out_barn;
    expect(surveyProject(s, 'worn_out_barn')).toBe(true);
    expect(startProjectWork(s, 'worn_out_barn')).toBe(true);
    advance(s, s.lastSaveTime + barn.clearingDurationMs);
    expect(s.projects.worn_out_barn.phase).toBe('delivery');
    s.inventory.wood = (s.inventory.wood ?? 0) + barn.materials.wood;
    // 밀은 농사(이미 해금됨) 산출물이다 — 재배 자체는 다른 테스트가 검증하므로
    // 여기서는 납품에 필요한 만큼 보유한 상태만 준비한다.
    s.inventory.wheat = (s.inventory.wheat ?? 0) + barn.materials.wheat;
    expect(deliverProjectMaterial(s, 'worn_out_barn', 'wood', barn.materials.wood)).toBe(barn.materials.wood);
    expect(deliverProjectMaterial(s, 'worn_out_barn', 'wheat', barn.materials.wheat)).toBe(barn.materials.wheat);
    expect(s.projects.worn_out_barn.phase).toBe('restorable');
    expect(startProjectWork(s, 'worn_out_barn')).toBe(true);
    advance(s, s.lastSaveTime + barn.restorationDurationMs);

    expect(s.projects.worn_out_barn.phase).toBe('complete');
    expect(skillUnlocked(s, 'ranching')).toBe(true);
    expect(kingdomRestoration(s)).toBe(6);
  });

  it('쓰러진 마법탑 완료 시 마법과 장신구 화면을 영구 해금하고 복원도가 7이 된다', () => {
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);

    const bridge = ProjectDB.broken_bridge;
    surveyProject(s, 'broken_bridge');
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + bridge.materials.wood;
    s.inventory.brick = (s.inventory.brick ?? 0) + bridge.materials.brick;
    deliverProjectMaterial(s, 'broken_bridge', 'wood', bridge.materials.wood);
    deliverProjectMaterial(s, 'broken_bridge', 'brick', bridge.materials.brick);
    startProjectWork(s, 'broken_bridge');
    advance(s, s.lastSaveTime + bridge.restorationDurationMs);

    const restaurant = ProjectDB.ruined_restaurant;
    surveyProject(s, 'ruined_restaurant');
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + restaurant.materials.wood;
    s.inventory.fish_small = (s.inventory.fish_small ?? 0) + restaurant.materials.fish_small;
    deliverProjectMaterial(s, 'ruined_restaurant', 'wood', restaurant.materials.wood);
    deliverProjectMaterial(s, 'ruined_restaurant', 'fish_small', restaurant.materials.fish_small);
    startProjectWork(s, 'ruined_restaurant');
    advance(s, s.lastSaveTime + restaurant.restorationDurationMs);

    const guildHall = ProjectDB.guild_hall;
    surveyProject(s, 'guild_hall');
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + guildHall.materials.wood;
    s.inventory.grilled_fish = (s.inventory.grilled_fish ?? 0) + guildHall.materials.grilled_fish;
    deliverProjectMaterial(s, 'guild_hall', 'wood', guildHall.materials.wood);
    deliverProjectMaterial(s, 'guild_hall', 'grilled_fish', guildHall.materials.grilled_fish);
    startProjectWork(s, 'guild_hall');
    advance(s, s.lastSaveTime + guildHall.restorationDurationMs);

    const field = ProjectDB.abandoned_field;
    surveyProject(s, 'abandoned_field');
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + field.materials.wood;
    s.inventory.stone = (s.inventory.stone ?? 0) + field.materials.stone;
    deliverProjectMaterial(s, 'abandoned_field', 'wood', field.materials.wood);
    deliverProjectMaterial(s, 'abandoned_field', 'stone', field.materials.stone);
    startProjectWork(s, 'abandoned_field');
    advance(s, s.lastSaveTime + field.restorationDurationMs);

    const barn = ProjectDB.worn_out_barn;
    surveyProject(s, 'worn_out_barn');
    startProjectWork(s, 'worn_out_barn');
    advance(s, s.lastSaveTime + barn.clearingDurationMs);
    s.inventory.wood = (s.inventory.wood ?? 0) + barn.materials.wood;
    s.inventory.wheat = (s.inventory.wheat ?? 0) + barn.materials.wheat;
    deliverProjectMaterial(s, 'worn_out_barn', 'wood', barn.materials.wood);
    deliverProjectMaterial(s, 'worn_out_barn', 'wheat', barn.materials.wheat);
    startProjectWork(s, 'worn_out_barn');
    advance(s, s.lastSaveTime + barn.restorationDurationMs);
    expect(kingdomRestoration(s)).toBe(6);

    const tower = ProjectDB.fallen_tower;
    expect(surveyProject(s, 'fallen_tower')).toBe(true);
    expect(startProjectWork(s, 'fallen_tower')).toBe(true);
    advance(s, s.lastSaveTime + tower.clearingDurationMs);
    expect(s.projects.fallen_tower.phase).toBe('delivery');
    s.inventory.wood = (s.inventory.wood ?? 0) + tower.materials.wood;
    // 양털은 목장(이미 해금됨) 산출물이다 — 사육 자체는 다른 테스트가 검증하므로
    // 여기서는 납품에 필요한 만큼 보유한 상태만 준비한다.
    s.inventory.wool = (s.inventory.wool ?? 0) + tower.materials.wool;
    expect(deliverProjectMaterial(s, 'fallen_tower', 'wood', tower.materials.wood)).toBe(tower.materials.wood);
    expect(deliverProjectMaterial(s, 'fallen_tower', 'wool', tower.materials.wool)).toBe(tower.materials.wool);
    expect(s.projects.fallen_tower.phase).toBe('restorable');
    expect(startProjectWork(s, 'fallen_tower')).toBe(true);
    advance(s, s.lastSaveTime + tower.restorationDurationMs);

    expect(s.projects.fallen_tower.phase).toBe('complete');
    expect(skillUnlocked(s, 'magic')).toBe(true);
    expect(featureUnlocked(s, 'equipment')).toBe(true);
    expect(kingdomRestoration(s)).toBe(7);

    const trail = ProjectDB.overgrown_trail;
    expect(surveyProject(s, 'overgrown_trail')).toBe(true);
    expect(startProjectWork(s, 'overgrown_trail')).toBe(true);
    advance(s, s.lastSaveTime + trail.clearingDurationMs);
    expect(s.projects.overgrown_trail.phase).toBe('delivery');
    s.inventory.wood = (s.inventory.wood ?? 0) + trail.materials.wood;
    // 스톤급 마법부여석은 마법(이미 해금됨) 산출물이다 — 제작 자체는 다른 테스트가
    // 검증하므로 여기서는 납품에 필요한 만큼 보유한 상태만 준비한다.
    s.inventory.enchant_stone_stone = (s.inventory.enchant_stone_stone ?? 0) + trail.materials.enchant_stone_stone;
    expect(deliverProjectMaterial(s, 'overgrown_trail', 'wood', trail.materials.wood)).toBe(trail.materials.wood);
    expect(deliverProjectMaterial(s, 'overgrown_trail', 'enchant_stone_stone', trail.materials.enchant_stone_stone)).toBe(trail.materials.enchant_stone_stone);
    expect(s.projects.overgrown_trail.phase).toBe('restorable');
    expect(startProjectWork(s, 'overgrown_trail')).toBe(true);
    advance(s, s.lastSaveTime + trail.restorationDurationMs);

    expect(s.projects.overgrown_trail.phase).toBe('complete');
    expect(skillUnlocked(s, 'foraging')).toBe(true);
    expect(kingdomRestoration(s)).toBe(8);
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

  it('아직 도입되지 않은 구역의 스킬·기능이 해금 목록에 몰래 섞여 있으면 거부한다(반대 방향 검증)', () => {
    // v14(대장간~밭까지만 도입) 저장에는 fallen_tower(v16 도입) 키 자체가 없어
    // 정방향(프로젝트별) 검사가 이 프로젝트를 아예 보지 않는다 — 그 빈틈에서 magic을
    // unlockedSkills에 직접 끼워 넣어도 반대 방향 검증 이전에는 걸러지지 않았다.
    const s = initial(0);
    finishClearing(s);
    supplyForge(s);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + project.restorationDurationMs);
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 14;
    // v14에는 아직 worn_out_barn(v15)·fallen_tower(v16)·overgrown_trail(v17)만 도입되지
    // 않았다 — 그보다 먼저 도입된 구역(다리~밭)은 미완료 상태로라도 키 자체는 존재해야 한다.
    delete raw.projects.worn_out_barn;
    delete raw.projects.fallen_tower;
    delete raw.projects.overgrown_trail;
    // 정상적인 v14 저장(대장간만 완료, 나머지는 미시작)은 통과해야 한다.
    expect(decodeSave(JSON.stringify(raw)).version).toBe(17);

    const sneakedSkill = JSON.parse(JSON.stringify(raw));
    sneakedSkill.unlockedSkills = [...sneakedSkill.unlockedSkills, 'magic'];
    expect(() => decodeSave(JSON.stringify(sneakedSkill))).toThrow('왕국 정보 오류');

    const sneakedFeature = JSON.parse(JSON.stringify(raw));
    sneakedFeature.unlockedFeatures = [...sneakedFeature.unlockedFeatures, 'equipment'];
    expect(() => decodeSave(JSON.stringify(sneakedFeature))).toThrow('왕국 정보 오류');
  });

  it('시작 스킬을 제외한 모든 해금은 실제로 완료된 프로젝트로만 설명 가능해야 한다', () => {
    const s = unlockedGame(0);
    // unlockedGame()은 정의된 모든 프로젝트를 완료 처리해서 만들어지므로, 완료된
    // 프로젝트들이 주는 스킬·기능의 합집합이 정확히 전체 해금 목록과 일치해야 한다.
    const restored = decodeSave(encodeSave(s));
    expect(restored.unlockedSkills).toEqual(s.unlockedSkills);
    expect(restored.unlockedFeatures).toEqual(s.unlockedFeatures);
  });
});
