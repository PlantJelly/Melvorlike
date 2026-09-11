// Database Configuration
const ResourceDB = {
    wood: { name: '나무', skill: 'logging', reqLevel: 1, baseDuration: 3000, exp: 25, sell: 1, buy: 5, icon: '🪵' },
    oak: { name: '참나무', skill: 'logging', reqLevel: 10, baseDuration: 5000, exp: 60, sell: 3, buy: 15, icon: '🌳' },
    hardwood: { name: '단단한 나무', skill: 'logging', reqLevel: 30, baseDuration: 8000, exp: 150, sell: 12, buy: 60, icon: '🌲' },
    magic_wood: { name: '마법 나무', skill: 'logging', reqLevel: 50, baseDuration: 12000, exp: 400, sell: 50, buy: 250, icon: '✨' },
    stone: { name: '돌', skill: 'mining', reqLevel: 1, baseDuration: 4000, exp: 25, sell: 1, buy: 5, icon: '🪨' },
    copper: { name: '구리 광석', skill: 'mining', reqLevel: 10, baseDuration: 6000, exp: 60, sell: 4, buy: 20, icon: '🥉' },
    iron_ore: { name: '철 광석', skill: 'mining', reqLevel: 30, baseDuration: 9000, exp: 150, sell: 15, buy: 75, icon: '🌑' },
    gold_ore: { name: '금 광석', skill: 'mining', reqLevel: 50, baseDuration: 14000, exp: 450, sell: 60, buy: 300, icon: '🌟' },
    fish_small: { name: '피라미', skill: 'fishing', reqLevel: 1, baseDuration: 3500, exp: 25, sell: 1, buy: 5, icon: '🐟' },
    fish_carp: { name: '붕어', skill: 'fishing', reqLevel: 10, baseDuration: 5500, exp: 60, sell: 3, buy: 15, icon: '🐠' },
    fish_salmon: { name: '연어', skill: 'fishing', reqLevel: 30, baseDuration: 8500, exp: 150, sell: 14, buy: 70, icon: '🍣' },
    fish_shark: { name: '상어', skill: 'fishing', reqLevel: 50, baseDuration: 13000, exp: 420, sell: 55, buy: 275, icon: '🦈' },
    stone_brick: { name: '돌 벽돌', skill: 'blacksmithing', reqLevel: 1, baseDuration: 4000, exp: 30, sell: 5, buy: 25, icon: '🧱', recipe: { stone: 2 } },
    copper_ingot: { name: '구리 주괴', skill: 'blacksmithing', reqLevel: 10, baseDuration: 6000, exp: 70, sell: 20, buy: 100, icon: '🔶', recipe: { copper: 3 } },
    iron_ingot: { name: '철 주괴', skill: 'blacksmithing', reqLevel: 30, baseDuration: 9000, exp: 200, sell: 60, buy: 300, icon: '🔗', recipe: { iron_ore: 3 } },
    gold_ingot: { name: '금 주괴', skill: 'blacksmithing', reqLevel: 50, baseDuration: 14000, exp: 600, sell: 250, buy: 1250, icon: '👑', recipe: { gold_ore: 3 } }
};

const BuildingDB = {
    sawmill: { name: '제재소', skill: 'logging', icon: '🪚', desc: '벌목 작업 속도를 레벨당 5% 상승시킵니다.', baseCostGold: 100, baseCostAmt: 50 },
    quarry: { name: '채석장', skill: 'mining', icon: '⛏️', desc: '채광 작업 속도를 레벨당 5% 상승시킵니다.', baseCostGold: 100, baseCostAmt: 50 },
    fishing_hut: { name: '낚시터', skill: 'fishing', icon: '🎣', desc: '낚시 작업 속도를 레벨당 5% 상승시킵니다.', baseCostGold: 100, baseCostAmt: 50 },
    forge: { name: '대장간 건물', skill: 'blacksmithing', icon: '🔥', desc: '가공 작업 속도를 레벨당 5% 상승시킵니다.', baseCostGold: 500, baseCostAmt: 25 }
};

const EquipmentTiers = {
    stone: { id: 'stone', name: '돌', reqLevel: 1, baseMult: 0.05, costGold: 1000, costItem: 'stone_brick', costAmt: 10, legGold: 5000, legItem: 'stone_brick', legAmt: 50, legPower: 1 },
    copper: { id: 'copper', name: '구리', reqLevel: 10, baseMult: 0.10, costGold: 5000, costItem: 'copper_ingot', costAmt: 10, legGold: 20000, legItem: 'copper_ingot', legAmt: 50, legPower: 2 },
    iron: { id: 'iron', name: '철', reqLevel: 30, baseMult: 0.20, costGold: 20000, costItem: 'iron_ingot', costAmt: 10, legGold: 100000, legItem: 'iron_ingot', legAmt: 50, legPower: 3 },
    gold: { id: 'gold', name: '금', reqLevel: 50, baseMult: 0.40, costGold: 100000, costItem: 'gold_ingot', costAmt: 10, legGold: 500000, legItem: 'gold_ingot', legAmt: 50, legPower: 4 }
};

const EquipmentDB = {
    axe: { name: '도끼', skill: 'logging', icon: '🪓' },
    pickaxe: { name: '곡괭이', skill: 'mining', icon: '⛏️' },
    rod: { name: '낚싯대', skill: 'fishing', icon: '🎣' },
    hammer: { name: '대장장이 망치', skill: 'blacksmithing', icon: '🔨' }
};

// V8: Probabilities capped to prevent 100% guarantees.
const LegendaryOptions = {
    opt_double: { name: '[풍요]', descBase: '결과물 2배 획득 (확률 +{val}%)', calc: (power, lv) => Math.min(80, power * 2 * lv) },
    opt_save_mat: { name: '[절약]', descBase: '재료 비소모 (확률 +{val}%)', calc: (power, lv) => Math.min(50, power * 4 * lv) },
    opt_exp: { name: '[현자]', descBase: '경험치 획득량 추가 (+{val}%)', calc: (power, lv) => power * 5 * lv },
    opt_speed: { name: '[신속]', descBase: '작업 속도 상승 (+{val}%)', calc: (power, lv) => power * 4 * lv },
    opt_sub_res: { name: '[하도급]', descBase: '최하위 자원 추가 획득 (확률 +{val}%)', calc: (power, lv) => Math.min(80, power * 2 * lv) },
    opt_cashback: { name: '[캐시백]', descBase: '판매가 50%를 골드로 획득 (확률 +{val}%)', calc: (power, lv) => Math.min(80, power * 20 * lv) }
};

function getLegDesc(optKey, legPower, lv) {
    const opt = LegendaryOptions[optKey];
    return opt.descBase.replace('{val}', opt.calc(legPower, lv).toFixed(0));
}

const EstateTiers = {
    logging: ['wood', 'oak', 'hardwood', 'magic_wood'],
    mining: ['stone', 'copper', 'iron_ore', 'gold_ore'],
    fishing: ['fish_small', 'fish_carp', 'fish_salmon', 'fish_shark'],
    blacksmithing: ['stone_brick', 'copper_ingot', 'iron_ingot', 'gold_ingot']
};

// State
let GameState = {
    lastSaveTime: null,
    resources: { gold: 1000 },
    skills: {
        logging: { level: 1, exp: 0, maxExp: 100 },
        mining: { level: 1, exp: 0, maxExp: 100 },
        fishing: { level: 1, exp: 0, maxExp: 100 },
        blacksmithing: { level: 1, exp: 0, maxExp: 100 }
    },
    buildings: { sawmill: { level: 0 }, quarry: { level: 0 }, fishing_hut: { level: 0 }, forge: { level: 0 } },
    currentAction: null,
    specialDeals: [], dealTimerSeconds: 0,
    gear: { logging: null, mining: null, fishing: null, blacksmithing: null },
    gear_stock: {
        axe: { stone: 0, copper: 0, iron: 0, gold: 0 },
        pickaxe: { stone: 0, copper: 0, iron: 0, gold: 0 },
        rod: { stone: 0, copper: 0, iron: 0, gold: 0 },
        hammer: { stone: 0, copper: 0, iron: 0, gold: 0 }
    }
};

// UI Cache
const UI = {};
function initUI() {
    UI.goldAmount = document.getElementById('gold-amount');
    ['logging', 'mining', 'fishing', 'blacksmithing'].forEach(s => {
        UI[`${s}Level`] = document.getElementById(`${s}-level`); UI[`${s}Exp`] = document.getElementById(`${s}-exp`);
        UI[`${s}MaxExp`] = document.getElementById(`${s}-max-exp`); UI[`${s}Target`] = document.getElementById(`${s}-target`);
        UI[`${s}TargetInfo`] = document.getElementById(`${s}-target-info`); UI[`${s}Progress`] = document.getElementById(`${s}-progress`);
        const btnId = `btn-${s === 'blacksmithing' ? 'blacksmith' : (s === 'logging' ? 'chop-wood' : (s === 'mining' ? 'mine-stone' : 'fish'))}`;
        UI[`btn${s.charAt(0).toUpperCase() + s.slice(1)}`] = document.getElementById(btnId);
    });

    UI.inventoryGrid = document.getElementById('inventory-grid'); UI.inventoryDetailPanel = document.getElementById('inventory-detail-panel');
    UI.invDetailIcon = document.getElementById('inv-detail-icon'); UI.invDetailName = document.getElementById('inv-detail-name');
    UI.invDetailPrice = document.getElementById('inv-detail-price'); UI.invDetailAmount = document.getElementById('inv-detail-amount');
    UI.invSellInput = document.getElementById('inv-sell-input'); UI.btnSellCustom = document.getElementById('btn-sell-custom');
    UI.btnSellAll = document.getElementById('btn-sell-all');
    UI.marketSpecialBuyGrid = document.getElementById('market-special-buy-grid');
    UI.marketSpecialSellGrid = document.getElementById('market-special-sell-grid');
    UI.marketBuyGrid = document.getElementById('market-buy-grid');
    UI.specialDealTimer = document.getElementById('special-deal-timer'); UI.buildingsGrid = document.getElementById('buildings-grid');
    
    UI.equippedPanels = document.getElementById('equipped-panels');
    UI.eqCraftTierSelect = document.getElementById('eq-craft-tier-select');
    UI.eqCraftCostInfo = document.getElementById('eq-craft-cost-info');
    UI.eqStockGrid = document.getElementById('eq-stock-grid');
    
    UI.offlineModal = document.getElementById('offline-modal');
    UI.offlineTimeText = document.getElementById('offline-time-text');
    UI.offlineResultsContent = document.getElementById('offline-results-content');
}

window.closeOfflineModal = function() {
    UI.offlineModal.style.display = 'none';
    if (GameState.currentAction) {
        GameState.currentAction.startTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
};

function saveGame() { 
    GameState.lastSaveTime = Date.now();
    localStorage.setItem('melvorlike_save_v4', JSON.stringify(GameState)); 
}
function loadGame() {
    const saved = localStorage.getItem('melvorlike_save_v4') || localStorage.getItem('melvorlike_save_v3');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            GameState.resources = { ...GameState.resources, ...parsed.resources };
            GameState.skills = { ...GameState.skills, ...parsed.skills };
            GameState.buildings = { ...GameState.buildings, ...parsed.buildings };
            GameState.specialDeals = parsed.specialDeals || [];
            GameState.dealTimerSeconds = parsed.dealTimerSeconds || 0;
            if (parsed.gear) GameState.gear = parsed.gear;
            if (parsed.gear_stock) GameState.gear_stock = parsed.gear_stock;
            if (parsed.currentAction) GameState.currentAction = parsed.currentAction;
            
            if (parsed.lastSaveTime) {
                let offlineMs = Date.now() - parsed.lastSaveTime;
                if (offlineMs > 60000) { // Only process if > 1 minute
                    processOfflineProgress(offlineMs);
                } else if (GameState.currentAction) {
                    GameState.currentAction.startTime = performance.now();
                    requestAnimationFrame(gameLoop);
                }
            } else if (GameState.currentAction) {
                GameState.currentAction.startTime = performance.now();
                requestAnimationFrame(gameLoop);
            }
        } catch (e) { console.error('Load failed', e); }
    }
}
setInterval(saveGame, 10000);

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message;
    container.appendChild(toast); setTimeout(() => { if(container.contains(toast)) container.removeChild(toast); }, 3000);
}

// Navigation
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const targetId = e.target.getAttribute('data-target'); document.getElementById(targetId).classList.add('active');
        if(targetId === 'inventory-view') renderInventory();
        if(targetId === 'guild-view') renderMarket();
        if(targetId === 'estate-view') renderBuildings();
        if(targetId === 'equipment-view') renderEquipment();
    });
});

window.applyCheat = function() {
    GameState.resources.gold = 10000000;
    Object.keys(ResourceDB).forEach(key => GameState.resources[key] = 100000);
    ['logging', 'mining', 'fishing', 'blacksmithing'].forEach(skill => {
        GameState.skills[skill].level = 99; GameState.skills[skill].exp = 0; GameState.skills[skill].maxExp = 999999999;
    });
    Object.keys(GameState.gear_stock).forEach(type => {
        Object.keys(EquipmentTiers).forEach(tier => { GameState.gear_stock[type][tier] = 1000; });
    });
    showToast("테스트용 치트(만렙/자원 MAX)가 적용되었습니다.");
    updateUI(); updateDropdowns(); updateEqCraftTierSelect();
    if(document.getElementById('inventory-view').classList.contains('active')) renderInventory();
    if(document.getElementById('guild-view').classList.contains('active')) renderMarket();
    if(document.getElementById('estate-view').classList.contains('active')) renderBuildings();
    if(document.getElementById('equipment-view').classList.contains('active')) renderEquipment();
    saveGame();
}

function getEquippedGear(skillName) { return GameState.gear[skillName]; }

function addExp(skillName, amount) {
    const skill = GameState.skills[skillName];
    const eq = getEquippedGear(skillName);
    if (eq) {
        const tierObj = EquipmentTiers[eq.tier];
        let bonus = tierObj.baseMult;
        if (eq.grade === 4) bonus *= 2; 
        amount *= (1 + bonus);
        if (eq.grade === 4 && eq.legOpt === 'opt_exp') {
            amount *= (1 + LegendaryOptions.opt_exp.calc(tierObj.legPower, eq.optLevel)/100);
        }
    }
    skill.exp += amount;
    if (skill.exp >= skill.maxExp) {
        skill.level++; skill.exp -= skill.maxExp; skill.maxExp = Math.floor(skill.maxExp * 1.5);
        showToast(`${skillName} 레벨업! Lv.${skill.level}`);
        updateDropdowns(); updateEqCraftTierSelect();
    }
}

// V8: Asymptotic Speed Formula
function getSpeedBonus(skillName) {
    let speedBonus = 0; // 0 = 0%, 1 = 100%
    let buildingId = Object.keys(BuildingDB).find(k => BuildingDB[k].skill === skillName);
    if (buildingId) {
        speedBonus += GameState.buildings[buildingId].level * 0.05;
    }
    
    const eq = getEquippedGear(skillName);
    if (eq) {
        const tierObj = EquipmentTiers[eq.tier];
        let gearBase = tierObj.baseMult;
        if (eq.grade === 4) gearBase *= 2;
        speedBonus += gearBase; 
        
        if (eq.grade === 4 && eq.legOpt === 'opt_speed') {
            speedBonus += (LegendaryOptions.opt_speed.calc(tierObj.legPower, eq.optLevel) / 100);
        }
    }
    return speedBonus;
}

function getActualDuration(skillName, baseDuration) {
    const speedBonus = getSpeedBonus(skillName);
    const actualDuration = baseDuration / (1 + speedBonus);
    return Math.max(100, actualDuration); // Hardcap at 100ms
}

function stopAction() {
    if (!GameState.currentAction) return;
    const type = GameState.currentAction.type;
    UI[`${type}Progress`].style.width = '0%'; GameState.currentAction = null; updateUI();
}

function startAction(type, targetId) {
    const targetInfo = ResourceDB[targetId];
    if (!targetInfo) return;
    if (GameState.currentAction) {
        if (GameState.currentAction.type === type && GameState.currentAction.targetId === targetId) { stopAction(); return; }
        else stopAction();
    }
    if (targetInfo.recipe) {
        for (let mat in targetInfo.recipe) {
            if ((GameState.resources[mat] || 0) < targetInfo.recipe[mat]) {
                showToast(`재료 부족! 필요: ${ResourceDB[mat].name} ${targetInfo.recipe[mat]}개`); return;
            }
        }
    }
    
    GameState.currentAction = { type: type, targetId: targetId, startTime: performance.now(), duration: getActualDuration(type, targetInfo.baseDuration) };
    updateUI(); requestAnimationFrame(gameLoop);
}

function applyLegendaryOptions(actionType, targetId) {
    const eq = getEquippedGear(actionType);
    if (!eq || eq.grade !== 4) return;
    const res = ResourceDB[targetId];
    const tierObj = EquipmentTiers[eq.tier];

    const subResChance = LegendaryOptions.opt_sub_res.calc(tierObj.legPower, eq.optLevel);
    if (eq.legOpt === 'opt_sub_res' && (Math.random() * 100) < subResChance) {
        let subItem = { logging: 'wood', mining: 'stone', fishing: 'fish_small' }[actionType];
        if(subItem) { GameState.resources[subItem] = (GameState.resources[subItem] || 0) + 1; }
    }
    
    const cashbackChance = LegendaryOptions.opt_cashback.calc(tierObj.legPower, eq.optLevel);
    if (eq.legOpt === 'opt_cashback' && (Math.random() * 100) < cashbackChance) {
        GameState.resources.gold += Math.max(1, Math.floor(res.sell * 0.5));
    }
}

function finishAction() {
    const action = GameState.currentAction;
    const targetInfo = ResourceDB[action.targetId];
    const eq = getEquippedGear(action.type);
    let tierObj = eq ? EquipmentTiers[eq.tier] : null;

    if (targetInfo.recipe) {
        let noConsumeProc = false;
        if (eq && eq.grade === 4 && eq.legOpt === 'opt_save_mat') {
            const saveChance = LegendaryOptions.opt_save_mat.calc(tierObj.legPower, eq.optLevel);
            if ((Math.random() * 100) < saveChance) noConsumeProc = true;
        }

        let hasMats = true;
        for (let mat in targetInfo.recipe) { if ((GameState.resources[mat] || 0) < targetInfo.recipe[mat]) hasMats = false; }
        if (!hasMats) { stopAction(); showToast("재료가 소진되어 작업을 중지합니다."); return; }
        if (!noConsumeProc) { for (let mat in targetInfo.recipe) GameState.resources[mat] -= targetInfo.recipe[mat]; }
    }

    let yieldAmount = 1;
    if (eq && eq.grade === 4 && eq.legOpt === 'opt_double') {
        const doubleChance = LegendaryOptions.opt_double.calc(tierObj.legPower, eq.optLevel);
        if ((Math.random() * 100) < doubleChance) yieldAmount = 2;
    }

    GameState.resources[action.targetId] = (GameState.resources[action.targetId] || 0) + yieldAmount;
    addExp(action.type, targetInfo.exp); applyLegendaryOptions(action.type, action.targetId);

    action.startTime = performance.now(); 
    action.duration = getActualDuration(action.type, targetInfo.baseDuration);
    updateUI(); if(document.getElementById('inventory-view').classList.contains('active')) renderInventory(true);
}

function processOfflineProgress(offlineMs) {
    const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000; // 24 hours
    if (offlineMs > MAX_OFFLINE_MS) offlineMs = MAX_OFFLINE_MS;
    
    // Update market timer
    GameState.dealTimerSeconds -= Math.floor(offlineMs / 1000);
    while (GameState.dealTimerSeconds <= 0) {
        generateSpecialDeals(); // Will reset dealTimerSeconds to 14400
    }
    
    if (!GameState.currentAction) {
        // Just show time passed without actions
        const totalSecs = Math.floor(offlineMs / 1000);
        UI.offlineTimeText.innerHTML = `당신이 자리를 비운 <b style="color:white;">${Math.floor(totalSecs/3600)}시간 ${Math.floor((totalSecs%3600)/60)}분</b> 동안 왕국은 평화로웠습니다. (작업 없음)`;
        UI.offlineResultsContent.innerHTML = `<p style="color:var(--text-secondary);">실행 중이던 작업이 없었습니다.</p>`;
        UI.offlineModal.style.display = 'flex';
        return;
    }

    const action = GameState.currentAction;
    const targetInfo = ResourceDB[action.targetId];
    const eq = getEquippedGear(action.type);
    let tierObj = eq ? EquipmentTiers[eq.tier] : null;

    let timeRemaining = offlineMs;
    let actionsDone = 0;
    let expGained = 0;
    let itemsGained = {};
    let itemsLost = {};
    let goldGained = 0;

    while (timeRemaining > 0) {
        let currentDuration = getActualDuration(action.type, targetInfo.baseDuration);
        if (timeRemaining < currentDuration) break;

        let noConsumeProc = false;
        if (targetInfo.recipe) {
            if (eq && eq.grade === 4 && eq.legOpt === 'opt_save_mat') {
                const saveChance = Math.min(100, LegendaryOptions.opt_save_mat.calc(tierObj.legPower, eq.optLevel));
                if ((Math.random() * 100) < saveChance) noConsumeProc = true;
            }

            let hasMats = true;
            for (let mat in targetInfo.recipe) {
                if ((GameState.resources[mat] || 0) < targetInfo.recipe[mat]) hasMats = false;
            }
            if (!hasMats) {
                // Out of materials, stop offline simulation
                GameState.currentAction = null; 
                break;
            }
            
            if (!noConsumeProc) {
                for (let mat in targetInfo.recipe) {
                    GameState.resources[mat] -= targetInfo.recipe[mat];
                    itemsLost[mat] = (itemsLost[mat] || 0) + targetInfo.recipe[mat];
                }
            }
        }

        // Action successful
        timeRemaining -= currentDuration;
        actionsDone++;

        let yieldAmount = 1;
        if (eq && eq.grade === 4 && eq.legOpt === 'opt_double') {
            const doubleChance = Math.min(100, LegendaryOptions.opt_double.calc(tierObj.legPower, eq.optLevel));
            if ((Math.random() * 100) < doubleChance) yieldAmount = 2;
        }

        GameState.resources[action.targetId] = (GameState.resources[action.targetId] || 0) + yieldAmount;
        itemsGained[action.targetId] = (itemsGained[action.targetId] || 0) + yieldAmount;

        // Apply EXP
        let expBonus = 1;
        if (eq) {
            let bonus = tierObj.baseMult;
            if (eq.grade === 4) bonus *= 2; 
            expBonus += bonus;
            if (eq.grade === 4 && eq.legOpt === 'opt_exp') {
                expBonus += (LegendaryOptions.opt_exp.calc(tierObj.legPower, eq.optLevel)/100);
            }
        }
        expGained += (targetInfo.exp * expBonus);
        addExp(action.type, targetInfo.exp); // Use addExp directly to handle level ups natively!

        // Apply Leg Options
        if (eq && eq.grade === 4) {
            const subResChance = LegendaryOptions.opt_sub_res.calc(tierObj.legPower, eq.optLevel);
            if (eq.legOpt === 'opt_sub_res' && (Math.random() * 100) < subResChance) {
                let subItem = { logging: 'wood', mining: 'stone', fishing: 'fish_small' }[action.type];
                if (subItem) {
                    GameState.resources[subItem] = (GameState.resources[subItem] || 0) + 1;
                    itemsGained[subItem] = (itemsGained[subItem] || 0) + 1;
                }
            }
            const cashbackChance = LegendaryOptions.opt_cashback.calc(tierObj.legPower, eq.optLevel);
            if (eq.legOpt === 'opt_cashback' && (Math.random() * 100) < cashbackChance) {
                let cash = Math.max(1, Math.floor(ResourceDB[action.targetId].sell * 0.5));
                GameState.resources.gold += cash;
                goldGained += cash;
            }
        }
    }

    if (GameState.currentAction) {
        GameState.currentAction.startTime = performance.now();
    }

    // Render Modal
    const totalSecs = Math.floor(offlineMs / 1000);
    UI.offlineTimeText.innerHTML = `당신이 자리를 비운 <b style="color:white;">${Math.floor(totalSecs/3600)}시간 ${Math.floor((totalSecs%3600)/60)}분</b> 동안 왕국은 계속 일했습니다.`;
    
    let resultHtml = `<h3 style="margin-top:0; margin-bottom:10px; color:#3b82f6;">작업 보고서: ${targetInfo.name}</h3>`;
    resultHtml += `<p>총 <b>${actionsDone.toLocaleString()}번</b>의 작업을 완료했습니다. ${GameState.currentAction ? '' : '<span style="color:#ef4444;">(재료가 소진되어 중단됨)</span>'}</p>`;
    
    resultHtml += `<div style="display:flex; gap:20px; margin-top:15px;">`;
    
    // Gained
    resultHtml += `<div style="flex:1;"><h4 style="color:var(--accent-color); margin:0 0 5px 0;">[ 획득 ]</h4><ul style="padding-left:20px; margin:0;">`;
    for(let k in itemsGained) {
        resultHtml += `<li>${ResourceDB[k].icon} ${ResourceDB[k].name}: +${itemsGained[k].toLocaleString()}</li>`;
    }
    if(goldGained > 0) resultHtml += `<li>🪙 골드: +${goldGained.toLocaleString()}</li>`;
    resultHtml += `<li>✨ 경험치: +${Math.floor(expGained).toLocaleString()}</li>`;
    resultHtml += `</ul></div>`;
    
    // Lost
    if (Object.keys(itemsLost).length > 0) {
        resultHtml += `<div style="flex:1;"><h4 style="color:#ef4444; margin:0 0 5px 0;">[ 소모 ]</h4><ul style="padding-left:20px; margin:0;">`;
        for(let k in itemsLost) {
            resultHtml += `<li>${ResourceDB[k].icon} ${ResourceDB[k].name}: -${itemsLost[k].toLocaleString()}</li>`;
        }
        resultHtml += `</ul></div>`;
    }
    
    resultHtml += `</div>`;
    UI.offlineResultsContent.innerHTML = resultHtml;
    
    updateUI(); updateDropdowns(); updateEqCraftTierSelect();
    UI.offlineModal.style.display = 'flex';
}

function gameLoop(currentTime) {
    if (!GameState.currentAction) return;
    const { type, startTime, duration } = GameState.currentAction;
    const elapsed = currentTime - startTime; let progress = (elapsed / duration) * 100;
    if (progress >= 100) { finishAction(); progress = 0; }
    if(GameState.currentAction) { UI[`${type}Progress`].style.width = `${progress}%`; requestAnimationFrame(gameLoop); }
}

// Timers
setInterval(() => {
    GameState.dealTimerSeconds--;
    if (GameState.dealTimerSeconds <= 0) generateSpecialDeals();
    const h = Math.floor(GameState.dealTimerSeconds / 3600); const m = Math.floor((GameState.dealTimerSeconds % 3600) / 60); const s = GameState.dealTimerSeconds % 60;
    if(UI.specialDealTimer) UI.specialDealTimer.textContent = `갱신까지: ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}, 1000);

window.generateSpecialDeals = function() {
    GameState.dealTimerSeconds = 14400; GameState.specialDeals = [];
    const keys = Object.keys(ResourceDB);
    // V8: 7 buy, 7 sell exactly
    let types = Array(7).fill('buy').concat(Array(7).fill('sell'));
    types.sort(() => Math.random() - 0.5);
    for(let i=0; i<14; i++) {
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        const multiplier = (Math.random() * 1.75 + 0.25).toFixed(2);
        GameState.specialDeals.push({ key: randKey, type: types[i], multiplier: parseFloat(multiplier) });
    }
    if(document.getElementById('guild-view').classList.contains('active')) renderMarket();
};

function updateTargetInfo(skill) {
    const selectEl = UI[`${skill}Target`]; const infoEl = UI[`${skill}TargetInfo`]; const selectedKey = selectEl.value;
    if (!selectedKey) return; const res = ResourceDB[selectedKey];
    const actualDuration = getActualDuration(skill, res.baseDuration) / 1000;
    let recipeStr = '';
    if (res.recipe) {
        recipeStr = '<br>필요 재료: ';
        for(let r in res.recipe) recipeStr += `<span style="color:#ef4444;">${ResourceDB[r].name} x${res.recipe[r]}</span> `;
    }
    infoEl.innerHTML = `소요 시간: <b style="color:var(--text-primary);">${actualDuration.toFixed(2)}초</b><br>획득량: <b style="color:var(--accent-color);">1개</b><br>경험치: <b style="color:#a855f7;">+${res.exp}</b>${recipeStr}`;
}

function updateDropdowns() {
    const skills = ['logging', 'mining', 'fishing', 'blacksmithing'];
    skills.forEach(skill => {
        const selectEl = UI[`${skill}Target`]; const currentVal = selectEl.value; const currentLevel = GameState.skills[skill].level;
        selectEl.innerHTML = '';
        Object.keys(ResourceDB).forEach(key => {
            const res = ResourceDB[key];
            if (res.skill === skill && currentLevel >= res.reqLevel) {
                const opt = document.createElement('option'); opt.value = key; opt.textContent = `${res.name} (Lv ${res.reqLevel})`; selectEl.appendChild(opt);
            }
        });
        if ([...selectEl.options].some(o => o.value === currentVal)) selectEl.value = currentVal;
        updateTargetInfo(skill);
    });
}

function updateUI() {
    UI.goldAmount.textContent = GameState.resources.gold.toLocaleString();
    const skills = ['logging', 'mining', 'fishing', 'blacksmithing'];
    skills.forEach(skill => {
        UI[`${skill}Level`].textContent = GameState.skills[skill].level;
        UI[`${skill}Exp`].textContent = Math.floor(GameState.skills[skill].exp);
        UI[`${skill}MaxExp`].textContent = GameState.skills[skill].maxExp;
        const btn = UI[`btn${skill.charAt(0).toUpperCase() + skill.slice(1)}`];
        if (btn) {
            const isRunning = (GameState.currentAction && GameState.currentAction.type === skill);
            let actName = { logging: '벌목', mining: '채광', fishing: '낚시', blacksmithing: '가공' }[skill];
            btn.textContent = isRunning ? `${actName} 중지` : `${actName} 시작`;
        }
        if (document.getElementById(`${skill}-view`).classList.contains('active')) updateTargetInfo(skill);
    });
}

// EQUIPMENT MASTERY LOGIC
function updateEqCraftTierSelect() {
    const currentLv = GameState.skills.blacksmithing.level;
    const currentVal = UI.eqCraftTierSelect.value;
    UI.eqCraftTierSelect.innerHTML = '';
    Object.values(EquipmentTiers).forEach(tier => {
        if (currentLv >= tier.reqLevel) {
            const opt = document.createElement('option'); opt.value = tier.id; opt.textContent = `${tier.name} 재질 (Lv ${tier.reqLevel})`; UI.eqCraftTierSelect.appendChild(opt);
        }
    });
    if ([...UI.eqCraftTierSelect.options].some(o => o.value === currentVal)) UI.eqCraftTierSelect.value = currentVal;
    updateEqCraftCostInfo();
}
function updateEqCraftCostInfo() {
    const tierId = UI.eqCraftTierSelect.value;
    if(!tierId) return; const tier = EquipmentTiers[tierId]; const itemName = ResourceDB[tier.costItem].name;
    UI.eqCraftCostInfo.innerHTML = `제작 비용: <b>${tier.costGold.toLocaleString()} 골드</b> + <b>${itemName} ${tier.costAmt}개</b>`;
}

window.craftBaseEquip = function(type) {
    const tierId = UI.eqCraftTierSelect.value; const tier = EquipmentTiers[tierId];
    if (GameState.resources.gold >= tier.costGold && (GameState.resources[tier.costItem] || 0) >= tier.costAmt) {
        GameState.resources.gold -= tier.costGold; GameState.resources[tier.costItem] -= tier.costAmt;
        GameState.gear_stock[type][tierId]++;
        showToast(`${tier.name} ${EquipmentDB[type].name}를 제작했습니다.`);
        updateUI(); renderEquipment();
    } else showToast("재료가 부족합니다.");
};

function getFeedCost(level) {
    return Math.floor(Math.pow(1.5, level));
}

function renderEquipment() {
    UI.equippedPanels.innerHTML = '';
    const skills = ['logging', 'mining', 'fishing', 'blacksmithing'];
    
    skills.forEach(skill => {
        const gear = GameState.gear[skill];
        const panel = document.createElement('div');
        panel.style = 'background:var(--card-bg); padding:15px; border-radius:8px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:10px;';
        
        let actName = { logging: '벌목', mining: '채광', fishing: '낚시', blacksmithing: '가공' }[skill];
        let eqTypeMap = { logging: 'axe', mining: 'pickaxe', fishing: 'rod', blacksmithing: 'hammer' }[skill];
        
        if (!gear) {
            panel.innerHTML = `<h3 style="margin-bottom:5px;">${actName} 장비</h3><p style="color:var(--text-secondary); font-size:13px; margin-bottom:10px;">장착된 장비가 없습니다.</p>`;
            let stockHtml = '';
            Object.keys(EquipmentTiers).forEach(t => {
                if (GameState.gear_stock[eqTypeMap][t] > 0) {
                    stockHtml += `<button class="action-btn" style="font-size:12px; padding:5px 10px; margin-right:5px;" onclick="equipNewGear('${skill}', '${eqTypeMap}', '${t}')">${EquipmentTiers[t].name} 장비 장착 (보유: ${GameState.gear_stock[eqTypeMap][t]})</button>`;
                }
            });
            if(stockHtml === '') stockHtml = '<span style="font-size:12px; color:#ef4444;">보유 중인 기본 장비가 없습니다. 우측에서 제작하세요.</span>';
            panel.innerHTML += `<div>${stockHtml}</div>`;
        } else {
            const dbInfo = EquipmentDB[gear.type];
            const tierInfo = EquipmentTiers[gear.tier];
            const gColor = gear.grade === 4 ? '#f59e0b' : '#a0a0a0';
            const gName = gear.grade === 4 ? '전설' : '일반';
            let baseBonus = tierInfo.baseMult * (gear.grade === 4 ? 2 : 1) * 100;
            
            let header = `<div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:30px;">${dbInfo.icon}</span>
                    <div><h3 style="color:${gColor}; margin:0;">${tierInfo.name} ${dbInfo.name} <span style="font-size:12px; color:var(--text-secondary);">(${gName})</span></h3>
                    <div style="font-size:12px; color:var(--text-secondary);">기본 속도/경험치 +${baseBonus.toFixed(0)}%</div></div>
                </div>
                <button class="action-btn" style="background:#ef4444; font-size:12px; padding:5px;" onclick="dismantleCurrentGear('${skill}')">장착 해제 및 버리기</button>
            </div>`;

            let body = '';
            if (gear.grade === 1) {
                // V8 UI UX Improvement
                let optSelect = `<select id="leg-sel-${skill}" style="background:var(--bg-color); color:white; border:1px solid var(--border-color); padding:5px; margin-right:10px; width:250px;">`;
                Object.keys(LegendaryOptions).forEach(k => {
                    const desc = getLegDesc(k, tierInfo.legPower, 1);
                    optSelect += `<option value="${k}">${LegendaryOptions[k].name} - ${desc}</option>`;
                });
                optSelect += `</select>`;
                
                body = `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px; margin-top:10px;">
                    <p style="font-size:13px; margin-bottom:10px;">원하는 전설 옵션을 확정으로 부여합니다.<br><span style="color:var(--accent-color);">비용: ${tierInfo.legGold.toLocaleString()} 골드 + ${ResourceDB[tierInfo.legItem].name} ${tierInfo.legAmt}개</span></p>
                    <div style="display:flex; align-items:center;">
                        ${optSelect}
                        <button class="action-btn" style="background:#f59e0b; padding:5px 15px; font-size:13px;" onclick="upgradeDeterministic('${skill}')">확정 승급</button>
                    </div>
                </div>`;
            } else {
                const costAmt = getFeedCost(gear.optLevel);
                const currentStock = GameState.gear_stock[gear.type][gear.tier];
                const canFeed = currentStock >= costAmt;
                const btnColor = canFeed ? '#3b82f6' : '#6b7280';
                
                body = `<div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); padding:10px; border-radius:4px; margin-top:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="color:#f59e0b; font-weight:bold; font-size:14px;">${LegendaryOptions[gear.legOpt].name} (Lv.${gear.optLevel})</span>
                        <button class="action-btn" style="background:${btnColor}; padding:5px 10px; font-size:12px;" onclick="feedGear('${skill}')" ${canFeed ? '' : 'disabled'}>강화 (비용: ${tierInfo.name} ${dbInfo.name} ${costAmt}개)</button>
                    </div>
                    <p style="font-size:13px; color:var(--text-secondary); margin:0;">${getLegDesc(gear.legOpt, tierInfo.legPower, gear.optLevel)}</p>
                    <p style="font-size:11px; color:#ef4444; margin-top:5px; ${canFeed ? 'display:none;' : ''}">제물용 기본 장비가 부족합니다. (현재 보유: ${currentStock}개)</p>
                </div>`;
            }
            panel.innerHTML = header + body;
        }
        UI.equippedPanels.appendChild(panel);
    });

    UI.eqStockGrid.innerHTML = '';
    const stockTypes = ['axe', 'pickaxe', 'rod', 'hammer'];
    stockTypes.forEach(type => {
        const dbInfo = EquipmentDB[type];
        Object.keys(EquipmentTiers).forEach(tier => {
            const count = GameState.gear_stock[type][tier];
            if (count > 0) {
                const div = document.createElement('div');
                div.style = 'display:flex; justify-content:space-between; padding:5px; background:rgba(255,255,255,0.05); border-radius:4px;';
                div.innerHTML = `<span>${dbInfo.icon} ${EquipmentTiers[tier].name} ${dbInfo.name}</span> <span style="color:var(--accent-color); font-weight:bold;">${count}개</span>`;
                UI.eqStockGrid.appendChild(div);
            }
        });
    });
    if (UI.eqStockGrid.innerHTML === '') UI.eqStockGrid.innerHTML = '<p style="color:var(--text-secondary);">보유 중인 기본 장비가 없습니다.</p>';
}

window.equipNewGear = function(skill, type, tier) {
    if (GameState.gear_stock[type][tier] > 0) {
        GameState.gear_stock[type][tier]--;
        GameState.gear[skill] = { type: type, tier: tier, grade: 1, legOpt: null, optLevel: 1 };
        showToast("장비를 장착했습니다."); updateUI(); renderEquipment();
    }
};

window.dismantleCurrentGear = function(skill) {
    if(confirm("정말 장착 중인 장비를 버리시겠습니까? (복구할 수 없습니다)")) {
        GameState.gear[skill] = null;
        showToast("장비를 버렸습니다."); updateUI(); renderEquipment();
    }
};

window.upgradeDeterministic = function(skill) {
    const gear = GameState.gear[skill];
    const tierInfo = EquipmentTiers[gear.tier];
    const selectEl = document.getElementById(`leg-sel-${skill}`);
    const chosenOpt = selectEl.value;

    if(GameState.resources.gold >= tierInfo.legGold && (GameState.resources[tierInfo.legItem] || 0) >= tierInfo.legAmt) {
        GameState.resources.gold -= tierInfo.legGold; GameState.resources[tierInfo.legItem] -= tierInfo.legAmt;
        gear.grade = 4; gear.legOpt = chosenOpt; gear.optLevel = 1;
        showToast(`[전설 확정 승급] ${LegendaryOptions[chosenOpt].name} 옵션 부여 완료!`);
        updateUI(); renderEquipment();
    } else showToast("재료가 부족합니다.");
};

window.feedGear = function(skill) {
    const gear = GameState.gear[skill];
    const costAmt = getFeedCost(gear.optLevel);
    if (GameState.gear_stock[gear.type][gear.tier] >= costAmt) {
        GameState.gear_stock[gear.type][gear.tier] -= costAmt;
        gear.optLevel++;
        showToast(`[강화 성공] 옵션 레벨이 ${gear.optLevel}(으)로 상승했습니다!`);
        updateUI(); renderEquipment();
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    
    UI.btnSellCustom.addEventListener('click', () => {
        if(!selectedInventoryItem) return;
        sellInvItem(selectedInventoryItem, parseInt(UI.invSellInput.value));
    });
    UI.btnSellAll.addEventListener('click', () => {
        if(!selectedInventoryItem) return;
        sellInvItem(selectedInventoryItem, GameState.resources[selectedInventoryItem] || 0);
    });
    function sellInvItem(key, qty) {
        if(qty <= 0 || isNaN(qty)) return;
        if ((GameState.resources[key] || 0) >= qty) {
            GameState.resources[key] -= qty;
            const goldEarned = ResourceDB[key].sell * qty;
            GameState.resources.gold += goldEarned;
            showToast(`${ResourceDB[key].name} ${qty}개 판매! (+${goldEarned.toLocaleString()} 골드)`);
            updateUI(); updateInventoryDetail(); renderInventory(true);
        } else showToast("수량이 부족합니다.");
    }

    window.buyMarketItem = function(key, cost) {
        if (GameState.resources.gold >= cost) {
            GameState.resources.gold -= cost; GameState.resources[key] = (GameState.resources[key] || 0) + 1;
            showToast(`${ResourceDB[key].name} 구매 완료!`); updateUI(); renderMarket();
        } else showToast("골드가 부족합니다.");
    };
    window.sellMarketSpecial = function(key, price) {
        if (GameState.resources[key] > 0) {
            GameState.resources[key]--; GameState.resources.gold += price;
            showToast(`특가 판매 완료! (+${price.toLocaleString()} 골드)`); updateUI(); renderMarket();
        } else showToast(`판매할 아이템 부족.`);
    };

    ['Logging', 'Mining', 'Fishing', 'Blacksmithing'].forEach(s => {
        const skill = s.toLowerCase();
        UI[`btn${s}`].addEventListener('click', () => startAction(skill, UI[`${skill}Target`].value));
        UI[`${skill}Target`].addEventListener('change', () => updateTargetInfo(skill));
    });

    window.upgradeBuilding = function(key) {
        const b = BuildingDB[key]; const state = GameState.buildings[key];
        const costGold = Math.floor(b.baseCostGold * Math.pow(1.3, state.level));
        
        const tierIndex = Math.min(3, Math.floor(state.level / 10));
        const costItemKey = EstateTiers[b.skill][tierIndex];
        const costItemAmt = Math.floor(b.baseCostAmt * Math.pow(1.5, state.level % 10));
        
        if (GameState.resources.gold >= costGold && (GameState.resources[costItemKey] || 0) >= costItemAmt) {
            GameState.resources.gold -= costGold;
            GameState.resources[costItemKey] -= costItemAmt;
            state.level++; showToast(`${b.name} 업그레이드 완료!`);
            if (GameState.currentAction && GameState.currentAction.type === b.skill) {
                GameState.currentAction.duration = getActualDuration(b.skill, ResourceDB[GameState.currentAction.targetId].baseDuration);
            }
            updateUI(); renderBuildings();
        } else showToast("재료나 골드가 부족합니다.");
    };

    UI.eqCraftTierSelect.addEventListener('change', updateEqCraftCostInfo);

    loadGame();
    if (GameState.specialDeals.length === 0) generateSpecialDeals();
    updateDropdowns(); updateUI(); updateEqCraftTierSelect();
    setInterval(saveGame, 30000);
});

let selectedInventoryItem = null;
function renderInventory(soft = false) {
    if(!soft) UI.inventoryGrid.innerHTML = ''; let hasItems = false;
    Object.keys(ResourceDB).forEach(key => {
        const amount = GameState.resources[key] || 0;
        if (amount > 0) {
            hasItems = true;
            if (soft) {
                const el = document.getElementById(`inv-item-${key}`);
                if(el) el.querySelector('.item-amount').textContent = amount;
                return;
            }
            const div = document.createElement('div'); div.className = `inventory-item ${selectedInventoryItem === key ? 'selected' : ''}`;
            div.id = `inv-item-${key}`; div.innerHTML = `<span class="item-icon">${ResourceDB[key].icon}</span><span class="item-amount" style="font-size:16px;">${amount}</span>`;
            div.onclick = () => selectInventoryItem(key); UI.inventoryGrid.appendChild(div);
        }
    });
    if (!soft && !hasItems) UI.inventoryGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">가진 자원이 없습니다.</p>';
    if(selectedInventoryItem) updateInventoryDetail();
}

function selectInventoryItem(key) {
    document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById(`inv-item-${key}`); if(el) el.classList.add('selected');
    selectedInventoryItem = key; UI.inventoryDetailPanel.style.display = 'flex'; updateInventoryDetail();
}

function updateInventoryDetail() {
    if(!selectedInventoryItem) return;
    const res = ResourceDB[selectedInventoryItem]; const amount = GameState.resources[selectedInventoryItem] || 0;
    if (amount <= 0) { UI.inventoryDetailPanel.style.display = 'none'; selectedInventoryItem = null; renderInventory(); return; }
    UI.invDetailIcon.textContent = res.icon; UI.invDetailName.textContent = res.name;
    UI.invDetailPrice.textContent = res.sell.toLocaleString(); UI.invDetailAmount.textContent = amount;
    UI.invSellInput.max = amount; if(parseInt(UI.invSellInput.value) > amount) UI.invSellInput.value = amount;
}

function renderMarket() {
    UI.marketSpecialBuyGrid.innerHTML = ''; UI.marketSpecialSellGrid.innerHTML = ''; UI.marketBuyGrid.innerHTML = '';
    
    GameState.specialDeals.forEach(deal => {
        const res = ResourceDB[deal.key]; const basePrice = deal.type === 'buy' ? res.buy : res.sell;
        const specialPrice = Math.floor(basePrice * deal.multiplier);
        const div = document.createElement('div'); div.className = 'market-item inventory-item'; div.style.cursor = 'default'; div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.alignItems = 'center'; div.style.padding = '10px';
        
        if (deal.type === 'buy') {
            div.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><span class="item-icon" style="margin:0;">${res.icon}</span><span class="item-name">${res.name}</span> <span style="color:gold;">-${specialPrice.toLocaleString()} G</span></div>
                <button class="action-btn" style="font-size:12px; padding:5px 10px;" onclick="buyMarketItem('${deal.key}', ${specialPrice})">구매 (${deal.multiplier}x)</button>`;
            UI.marketSpecialBuyGrid.appendChild(div);
        } else {
            const stock = GameState.resources[deal.key] || 0;
            div.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><span class="item-icon" style="margin:0;">${res.icon}</span><span class="item-name">${res.name} (보유: ${stock})</span> <span style="color:gold;">+${specialPrice.toLocaleString()} G</span></div>
                <button class="action-btn" style="font-size:12px; padding:5px 10px; background:#ef4444;" onclick="sellMarketSpecial('${deal.key}', ${specialPrice})">판매 (${deal.multiplier}x)</button>`;
            UI.marketSpecialSellGrid.appendChild(div);
        }
    });
    
    Object.keys(ResourceDB).forEach(key => {
        const res = ResourceDB[key];
        if (GameState.skills[res.skill].level >= res.reqLevel) {
            const bDiv = document.createElement('div'); bDiv.className = 'market-item inventory-item'; bDiv.style.cursor = 'default';
            bDiv.innerHTML = `<span class="item-icon">${res.icon}</span><span class="item-name">${res.name}</span>
                <span style="color: gold; margin-bottom: 10px;">-${res.buy.toLocaleString()} 골드</span>
                <button class="action-btn" style="font-size: 12px; padding: 5px 10px;" onclick="buyMarketItem('${key}', ${res.buy})">구매</button>`;
            UI.marketBuyGrid.appendChild(bDiv);
        }
    });
}

function renderBuildings() {
    UI.buildingsGrid.innerHTML = '';
    Object.keys(BuildingDB).forEach(key => {
        const b = BuildingDB[key]; const state = GameState.buildings[key];
        const costGold = Math.floor(b.baseCostGold * Math.pow(1.3, state.level));
        
        const tierIndex = Math.min(3, Math.floor(state.level / 10));
        const costItemKey = EstateTiers[b.skill][tierIndex];
        const costItemAmt = Math.floor(b.baseCostAmt * Math.pow(1.5, state.level % 10));
        const itemName = ResourceDB[costItemKey].name;
        
        const div = document.createElement('div'); div.className = 'inventory-item building-item'; div.style.alignItems = 'flex-start'; div.style.padding = '20px'; div.style.cursor = 'default';
        div.innerHTML = `<div style="display: flex; align-items: center; margin-bottom: 10px;"><span class="item-icon" style="margin: 0; margin-right: 10px;">${b.icon}</span>
                <div><h3 style="margin-bottom: 5px;">${b.name} <span style="color: var(--accent-color);">Lv.${state.level}</span></h3><p style="font-size: 12px; color: var(--text-secondary);">${b.desc}</p></div></div>
            <p style="font-size: 13px; margin-bottom: 15px; color:#a855f7; font-weight:bold;">현재 효율: +${state.level * 5}% 속도 상승</p>
            <p style="font-size: 12px; color:var(--text-secondary); margin-bottom:5px;">요구 재료: <span style="color:#ef4444;">${itemName} ${costItemAmt}개</span></p>
            <button class="action-btn" style="width: 100%;" onclick="upgradeBuilding('${key}')">업그레이드 (${costGold.toLocaleString()} 골드)</button>`;
        UI.buildingsGrid.appendChild(div);
    });
}
