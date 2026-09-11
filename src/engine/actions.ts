import { mutate, saveGame } from '../state/gameState';
import { begin, upgrade, sell, eat, buyCrop, plant, harvest } from './model';
import type { SkillId } from '../content/types';

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
  mutate(s => { buyCrop(s, id, n); });
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
