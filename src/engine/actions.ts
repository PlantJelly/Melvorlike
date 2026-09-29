import { mutate, saveGame } from '../state/gameState';
import { begin, queueAction, clearQueuedAction, upgrade, sell, eat, buyResource, plant, harvest, clearPlot, expandFarm, automateFarm, buyFertilizer, buyAnimal, expandBarn, exchangeResource, upgradeGuild, completeDailyQuest, claimMilestone, craftAccessory, upgradeAccessory, rerollAccessory, surveyProject, startProjectWork, deliverProjectMaterial, upgradeFacility } from './model';
import type { SkillId } from '../content/types';
import type { AccessorySlotId } from '../content/accessories';
import type { MilestoneId } from '../content/guild';
import type { ProjectId } from '../content/projects';
import type { FertilizerId } from '../content/fertilizers';

export function startAction(_skill: SkillId, id: string, target?: number) {
  mutate(s => { begin(s, id, target); });
  saveGame();
}
export function queueActionAction(id: string, target?: number) {
  mutate(s => { queueAction(s, id, target); });
  saveGame();
}
export function clearQueuedActionAction() {
  mutate(s => { clearQueuedAction(s); });
  saveGame();
}
export function stopAction() {
  mutate(s => { s.currentAction = null; });
  saveGame();
}
export function surveyProjectAction(projectId: ProjectId) {
  mutate(s => { surveyProject(s, projectId); });
  saveGame();
}
export function startProjectWorkAction(projectId: ProjectId) {
  mutate(s => { startProjectWork(s, projectId); });
  saveGame();
}
export function deliverProjectMaterialAction(projectId: ProjectId, resourceId: string, count: number) {
  mutate(s => { deliverProjectMaterial(s, projectId, resourceId, count); });
  saveGame();
}
export function craftTool(skill: SkillId) {
  mutate(s => { upgrade(s, skill); });
  saveGame();
}
export function sellItem(id: string, n: number) {
  mutate(s => { sell(s, id, n); });
  saveGame();
}
export function useFood(id: string, n = 1) {
  mutate(s => { eat(s, id, n); });
  saveGame();
}
export function buySeed(id: string, n = 1) {
  mutate(s => { buyResource(s, id, n); });
  saveGame();
}
export function plantCrop(id: string, fertilizer?: FertilizerId) {
  mutate(s => { plant(s, id, fertilizer); });
  saveGame();
}
export function clearPlotAction(index: number) {
  mutate(s => { clearPlot(s, index); });
  saveGame();
}
export function harvestCrop() {
  mutate(s => { harvest(s); });
  saveGame();
}
export function buyAnimalAction(id: string) {
  mutate(s => { buyAnimal(s, id); });
  saveGame();
}
export function expandBarnAction() {
  mutate(s => { expandBarn(s); });
  saveGame();
}
export function buyResourceAction(id: string, n = 1) {
  mutate(s => { buyResource(s, id, n); });
  saveGame();
}
export function exchangeResourceAction(id: string, n: number) {
  mutate(s => { exchangeResource(s, id, n); });
  saveGame();
}
export function upgradeGuildAction() {
  mutate(s => { upgradeGuild(s); });
  saveGame();
}
export function completeDailyQuestAction(index: number, resourceId: string) {
  mutate(s => { completeDailyQuest(s, index, resourceId); });
  saveGame();
}
export function claimMilestoneAction(id: MilestoneId) {
  mutate(s => { claimMilestone(s, id); });
  saveGame();
}
export function craftAccessoryAction(slotId: AccessorySlotId) {
  mutate(s => { craftAccessory(s, slotId); });
  saveGame();
}
export function upgradeAccessoryAction(slotId: AccessorySlotId) {
  mutate(s => { upgradeAccessory(s, slotId); });
  saveGame();
}
export function rerollAccessoryAction(slotId: AccessorySlotId, stoneId: string) {
  mutate(s => { rerollAccessory(s, slotId, stoneId); });
  saveGame();
}
export function expandFarmAction() {
  mutate(s => { expandFarm(s); });
  saveGame();
}
export function automateFarmAction() {
  mutate(s => { automateFarm(s); });
  saveGame();
}
export function buyFertilizerAction(id: FertilizerId, n: number) {
  mutate(s => { buyFertilizer(s, id, n); });
  saveGame();
}
export function upgradeFacilityAction(id: ProjectId) {
  mutate(s => { upgradeFacility(s, id); });
  saveGame();
}
