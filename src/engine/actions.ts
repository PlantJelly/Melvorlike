import { mutate, saveGame } from '../state/gameState';
import { begin, upgrade, sell, eat, buyResource, plant, harvest, buyAnimal, exchangeResource, upgradeGuild, craftAccessory, upgradeAccessory, rerollAccessory } from './model';
import type { SkillId } from '../content/types';
import type { AccessorySlotId } from '../content/accessories';

export function startAction(_skill: SkillId, id: string) {
  mutate(s => { begin(s, id); });
  saveGame();
}
export function stopAction() {
  mutate(s => { s.currentAction = null; });
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
export function plantCrop(id: string) {
  mutate(s => { plant(s, id); });
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
