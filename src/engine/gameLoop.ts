import { onCleanup, onMount } from 'solid-js';
import { tick, saveGame } from '../state/gameState';
export function initGameLoop() { onMount(() => { const timer = setInterval(tick, 200); const saveTimer = setInterval(saveGame, 10000); const flush = () => { tick(); saveGame(); }; document.addEventListener('visibilitychange', flush); window.addEventListener('pagehide', flush); onCleanup(() => { clearInterval(timer); clearInterval(saveTimer); document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush); flush(); }); }); }
