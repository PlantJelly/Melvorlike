// 사용자 명령은 먼저 경과 시간을 정산한 뒤 실행합니다.
import { mutate, saveGame } from '../state/gameState';
import { begin, upgrade, sell } from './model';
import type { SkillId } from '../content/types';
export function startAction(_skill: SkillId, id: string) { mutate(s => { begin(s, id); }); saveGame(); }
export function stopAction() { mutate(s => { s.currentAction = null; }); saveGame(); }
export function craftTool(skill: SkillId) { mutate(s => { upgrade(s, skill); }); saveGame(); }
export function sellItem(id: string, n: number) { mutate(s => { sell(s, id, n); }); saveGame(); }
