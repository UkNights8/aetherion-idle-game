/**
 * Core Game Engine, State Management & Reactive UI Loop
 * Complies strictly with all sections of the Technical Specification.
 */

class IdleGame {
    constructor() {
        this.sound = new SoundSystem();
        this.visuals = new VisualFX();
        this.formulas = GameFormulas;

        // Active game state
        this.state = this.getInitialState();

        // Cached runtime stats
        this.currentCPS = new BigNum(0);
        this.clickValue = new BigNum(1);
        this.activeTab = 'generators';
        this.lastSaveTime = Date.now();
        this.lastFrameTime = performance.now();
        this.autoBuyerTimer = 0;

        // Offline modal data
        this.offlinePending = null;
    }

    getInitialState() {
        const buildingsState = {};
        GameData.BUILDINGS.forEach(b => {
            buildingsState[b.id] = { level: 0 };
        });

        const prestigeUpgradesState = {};
        GameData.PRESTIGE_UPGRADES.forEach(u => {
            prestigeUpgradesState[u.id] = 0;
        });

        return {
            coins: GameData.INITIAL_COINS.clone(),
            totalClicks: 0,
            currentRunEarned: new BigNum(0),
            allTimeEarned: new BigNum(0),
            prestigeShards: GameData.INITIAL_PRESTIGE_SHARDS.clone(),
            totalPrestigeSpentAndHeld: new BigNum(0),
            prestigeCount: 0,
            buildings: buildingsState,
            purchasedUpgrades: {},
            prestigeUpgrades: prestigeUpgradesState,
            achievements: {},
            lastTimestamp: Date.now(),
            runStartTime: Date.now(),
            totalPlayTime: 0,
            highestCPS: new BigNum(0),
            settings: {
                notation: 'standard', // 'standard' | 'scientific' | 'engineering'
                bulkMode: '1',         // '1' | '10' | '100' | 'MAX'
                soundEnabled: true,
                volume: 0.35,
                lowFX: false
            }
        };
    }

    init() {
        this.loadSave();
        this.sound.init();
        this.sound.setVolume(this.state.settings.volume);
        this.sound.setMuted(!this.state.settings.soundEnabled);
        this.visuals.lowPerformanceMode = this.state.settings.lowFX;
        this.visuals.init();

        this.checkOfflineProgress();
        this.initUI();
        this.initEventListeners();
        this.recalculateProduction();

        // Start main loop
        requestAnimationFrame((t) => this.gameLoop(t));

        // Auto save timer
        setInterval(() => this.saveGame(), 10000);
    }

    // --- MATHEMATICAL EVALUATORS ---

    getBuildingMultiplier(buildingId) {
        let baseM = 1.15;
        const discountRank = this.state.prestigeUpgrades['meta_cost_discount'] || 0;
        const discountVal = discountRank * 0.01;
        return Math.max(1.05, baseM - discountVal);
    }

    getOfflineTimeLimit() {
        let limit = this.formulas.BASE_OFFLINE_TIME_LIMIT; // 7200s (2h)
        const rank = this.state.prestigeUpgrades['meta_offline_time'] || 0;
        limit += rank * 7200; // +2 hours per rank
        return limit;
    }

    getOfflineEfficiency() {
        let eff = this.formulas.BASE_OFFLINE_EFFICIENCY; // 50%
        const rank = this.state.prestigeUpgrades['meta_offline_eff'] || 0;
        eff += rank * 0.10; // +10% per rank
        return Math.min(1.0, eff);
    }

    getPrestigeBonusPerUnit() {
        let bonus = this.formulas.PRESTIGE_BASE_BONUS_PER_UNIT; // 0.02
        const rank = this.state.prestigeUpgrades['meta_bonus_per_shard'] || 0;
        bonus += rank * 0.005; // +0.5% per rank
        return bonus;
    }

    getGlobalPrestigeMultiplier() {
        const bonusPerUnit = this.getPrestigeBonusPerUnit();
        return this.formulas.calculateGlobalPrestigeMultiplier(this.state.prestigeShards, bonusPerUnit);
    }

    getAchievementMultiplier() {
        const count = Object.keys(this.state.achievements).length;
        // Each achievement grants +2% additive bonus to production
        return 1 + count * 0.02;
    }

    getBuildingProduction(buildingId) {
        const bDef = GameData.BUILDINGS.find(b => b.id === buildingId);
        if (!bDef) return new BigNum(0);

        const bState = this.state.buildings[buildingId] || { level: 0 };
        const n = bState.level;
        if (n <= 0) return new BigNum(0);

        const baseProd = bDef.baseProduction;
        const globalPrestigeMult = this.getGlobalPrestigeMultiplier();
        const milestoneMult = this.formulas.calculateMilestoneMultiplier(n);
        const achMult = this.getAchievementMultiplier();

        // Local building upgrades
        let upgradeMult = 1.0;
        GameData.UPGRADES.forEach(u => {
            if (u.type === 'building' && u.targetBuilding === buildingId && this.state.purchasedUpgrades[u.id]) {
                upgradeMult *= (u.multiplier || 1.0);
            }
        });

        // Global upgrades
        let globalUpgradeMult = 1.0;
        GameData.UPGRADES.forEach(u => {
            if (u.type === 'global' && this.state.purchasedUpgrades[u.id]) {
                globalUpgradeMult *= (u.multiplier || 1.0);
            }
        });

        // Production = Base * n * Mult_global * Mult_milestone * Mult_upgrades * Mult_ach
        return baseProd
            .mul(n)
            .mul(globalPrestigeMult)
            .mul(milestoneMult)
            .mul(upgradeMult)
            .mul(globalUpgradeMult)
            .mul(achMult);
    }

    recalculateProduction() {
        let total = new BigNum(0);
        GameData.BUILDINGS.forEach(b => {
            const bProd = this.getBuildingProduction(b.id);
            total = total.add(bProd);
        });

        this.currentCPS = total;
        if (this.currentCPS.gt(this.state.highestCPS)) {
            this.state.highestCPS = this.currentCPS.clone();
        }

        // Calculate click power
        let baseClick = new BigNum(1);
        let clickMult = 1;
        let cpsPercent = 0;

        GameData.UPGRADES.forEach(u => {
            if (this.state.purchasedUpgrades[u.id]) {
                if (u.type === 'click') clickMult *= (u.multiplier || 1);
                if (u.type === 'click_cps') cpsPercent += (u.percentCPS || 0);
            }
        });

        // Prestige click pulse rank
        const clickRank = this.state.prestigeUpgrades['meta_click_power'] || 0;
        cpsPercent += clickRank * 0.01;

        let totalClickVal = baseClick.mul(clickMult).mul(this.getAchievementMultiplier());
        if (cpsPercent > 0 && this.currentCPS.gt(0)) {
            totalClickVal = totalClickVal.add(this.currentCPS.mul(cpsPercent));
        }

        this.clickValue = totalClickVal;
    }

    // --- GAME ACTIONS ---

    clickCore(event) {
        this.sound.playClick();
        this.state.totalClicks++;

        const earned = this.clickValue.clone();
        this.addCoins(earned);

        // Visual click FX
        const x = event ? event.clientX : window.innerWidth / 2;
        const y = event ? event.clientY : window.innerHeight / 2;
        const formatted = earned.format(this.state.settings.notation, 1);
        this.visuals.triggerClickFX(x, y, formatted);

        this.checkAchievements();
        this.updateUIQuick();
    }

    buyBuilding(buildingId) {
        const bDef = GameData.BUILDINGS.find(b => b.id === buildingId);
        if (!bDef) return;

        const bState = this.state.buildings[buildingId];
        const multiplier = this.getBuildingMultiplier(buildingId);
        const mode = this.state.settings.bulkMode;

        const buildingObj = {
            baseCost: bDef.baseCost,
            currentLevel: bState.level,
            multiplier: multiplier
        };

        const result = this.formulas.calculateBulkBuy(buildingObj, this.state.coins, mode);

        if (result.levelsToBuy > 0 && this.state.coins.gte(result.totalCost)) {
            this.state.coins = this.state.coins.sub(result.totalCost);
            const oldLevel = bState.level;
            bState.level += result.levelsToBuy;

            // Audio & Milestone celebrations
            if (result.levelsToBuy > 1) {
                this.sound.playBulkBuy();
            } else {
                this.sound.playBuy();
            }

            // Check if passed a milestone (25, 50, 100, 200...)
            const oldMilestone = this.formulas.calculateMilestoneMultiplier(oldLevel);
            const newMilestone = this.formulas.calculateMilestoneMultiplier(bState.level);
            if (newMilestone > oldMilestone) {
                this.sound.playMilestone();
                this.visuals.triggerMilestoneBurst(window.innerWidth * 0.7, window.innerHeight * 0.4);
                this.visuals.showToast(
                    'Milestone Reached!',
                    `${bDef.nameRu}: уровень ${bState.level} достигнут! Умножение доходности!`,
                    bDef.icon
                );
            }

            this.recalculateProduction();
            this.checkAchievements();
            this.renderBuildings();
            this.updateUIQuick();
        }
    }

    setBulkMode(mode) {
        this.state.settings.bulkMode = mode;
        document.querySelectorAll('.bulk-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        this.renderBuildings();
    }

    buyUpgrade(upgradeId) {
        const upg = GameData.UPGRADES.find(u => u.id === upgradeId);
        if (!upg || this.state.purchasedUpgrades[upgradeId]) return;

        if (this.state.coins.gte(upg.cost)) {
            this.state.coins = this.state.coins.sub(upg.cost);
            this.state.purchasedUpgrades[upgradeId] = true;

            this.sound.playUpgrade();
            this.visuals.showToast('Технология исследована!', upg.nameRu, upg.icon);

            this.recalculateProduction();
            this.checkAchievements();
            this.renderUpgrades();
            this.updateUIQuick();
        }
    }

    buyPrestigeUpgrade(metaId) {
        const pDef = GameData.PRESTIGE_UPGRADES.find(p => p.id === metaId);
        if (!pDef) return;

        const currentRank = this.state.prestigeUpgrades[metaId] || 0;
        if (currentRank >= pDef.maxLevel) return;

        const cost = pDef.baseCost.mul(Math.pow(pDef.costMultiplier, currentRank));

        if (this.state.prestigeShards.gte(cost)) {
            this.state.prestigeShards = this.state.prestigeShards.sub(cost);
            this.state.prestigeUpgrades[metaId] = currentRank + 1;

            this.sound.playUpgrade();
            this.recalculateProduction();
            this.renderPrestigeTree();
            this.updateUIQuick();
        }
    }

    performPrestige() {
        const spentAndHeld = this.state.totalPrestigeSpentAndHeld;
        const pEarned = this.formulas.calculatePrestigeEarned(this.state.currentRunEarned, spentAndHeld);

        if (pEarned.lte(0)) {
            alert("Вам необходимо накопить больше ресурсов для совершения Престижа!");
            return;
        }

        const confirmed = confirm(
            `Вы уверены, что хотите войти в Сингулярность?\n\n` +
            `Вы получите: +${pEarned.format(this.state.settings.notation, 0)} Осколков Престижа.\n\n` +
            `Локальная валюта, здания и локальные улучшения будут сброшены.\n` +
            `Мета-улучшения, статистика и достижения сохранятся.`
        );

        if (!confirmed) return;

        // Reset Matrix (Section 4.3)
        this.state.coins = GameData.INITIAL_COINS.clone();
        this.state.currentRunEarned = new BigNum(0);

        // Reset buildings to level 0
        Object.keys(this.state.buildings).forEach(bId => {
            this.state.buildings[bId].level = 0;
        });

        // Reset local upgrades
        this.state.purchasedUpgrades = {};

        // Award prestige shards
        this.state.prestigeShards = this.state.prestigeShards.add(pEarned);
        this.state.totalPrestigeSpentAndHeld = this.state.totalPrestigeSpentAndHeld.add(pEarned);
        this.state.prestigeCount++;

        this.sound.playPrestige();
        this.visuals.triggerMilestoneBurst(window.innerWidth / 2, window.innerHeight / 2, '#ec4899');
        this.visuals.showToast(
            'Сингулярность активирована!',
            `Получено +${pEarned.format(this.state.settings.notation, 0)} Осколков Престижа!`,
            '🌌'
        );

        this.recalculateProduction();
        this.checkAchievements();
        this.renderAll();
        this.saveGame();
    }

    // --- RECURSIVE & AUTOMATION TICK ---

    addCoins(amount) {
        const val = BigNum.from(amount);
        this.state.coins = this.state.coins.add(val);
        this.state.currentRunEarned = this.state.currentRunEarned.add(val);
        this.state.allTimeEarned = this.state.allTimeEarned.add(val);
    }

    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 1.0);
        this.lastFrameTime = timestamp;

        this.state.totalPlayTime += dt;

        // Generate passive income
        if (this.currentCPS.gt(0)) {
            const incomeThisFrame = this.currentCPS.mul(dt);
            this.addCoins(incomeThisFrame);
        }

        // Auto Buyer handling (Prestige Meta rank)
        const autoBuyerRank = this.state.prestigeUpgrades['meta_auto_buyer'] || 0;
        if (autoBuyerRank > 0) {
            this.autoBuyerTimer += dt;
            const interval = autoBuyerRank === 3 ? 0.25 : (autoBuyerRank === 2 ? 0.5 : 1.0);
            if (this.autoBuyerTimer >= interval) {
                this.autoBuyerTimer = 0;
                this.processAutoBuyers();
            }
        }

        this.checkAchievements();
        this.updateUIRealtime();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    processAutoBuyers() {
        // Buy 1 level of the highest affordable building
        for (let i = GameData.BUILDINGS.length - 1; i >= 0; i--) {
            const b = GameData.BUILDINGS[i];
            const cost = this.formulas.calculateSingleCost(b.baseCost, this.state.buildings[b.id].level, this.getBuildingMultiplier(b.id));
            if (this.state.coins.gte(cost)) {
                this.state.coins = this.state.coins.sub(cost);
                this.state.buildings[b.id].level++;
                this.recalculateProduction();
                this.renderBuildings();
                break;
            }
        }
    }

    checkAchievements() {
        const stateSnapshot = {
            totalClicks: this.state.totalClicks,
            allTimeEarned: this.state.allTimeEarned,
            currentCPS: this.currentCPS,
            prestigeCount: this.state.prestigeCount,
            prestigeShards: this.state.prestigeShards,
            buildings: this.state.buildings,
            purchasedUpgrades: this.state.purchasedUpgrades
        };

        GameData.ACHIEVEMENTS.forEach(ach => {
            if (!this.state.achievements[ach.id]) {
                if (ach.check(stateSnapshot)) {
                    this.state.achievements[ach.id] = Date.now();
                    this.sound.playAchievement();
                    this.visuals.triggerMilestoneBurst(window.innerWidth * 0.5, window.innerHeight * 0.2, '#00f2fe');
                    this.visuals.showToast(
                        'Достижение разблокировано!',
                        `${ach.nameRu}: ${ach.descRu} (+2% постоянного дохода)`,
                        ach.icon
                    );
                    this.recalculateProduction();
                    this.renderAchievements();
                }
            }
        });
    }

    // --- OFFLINE PROGRESS & ANTI-CHEAT (Section 5 & 6.3) ---

    checkOfflineProgress() {
        const now = Date.now();
        const last = this.state.lastTimestamp || now;
        const deltaSeconds = (now - last) / 1000;

        // Anti-cheat: reject negative delta (clock moved back)
        if (deltaSeconds < 0) {
            console.warn("Anti-cheat: time jumped backwards. Offline progress cancelled.");
            this.state.lastTimestamp = now;
            return;
        }

        if (deltaSeconds >= 10) {
            this.recalculateProduction();
            if (this.currentCPS.gt(0)) {
                const timeLimit = this.getOfflineTimeLimit();
                const efficiency = this.getOfflineEfficiency();
                const offlineCalc = this.formulas.calculateOfflineEarnings(
                    deltaSeconds,
                    this.currentCPS,
                    timeLimit,
                    efficiency
                );

                if (offlineCalc.earnings.gt(0)) {
                    this.offlinePending = {
                        earnings: offlineCalc.earnings,
                        timeAwaySec: deltaSeconds,
                        effectiveTimeSec: offlineCalc.effectiveTime,
                        capped: offlineCalc.capped,
                        efficiency: efficiency
                    };
                    this.showOfflineModal();
                }
            }
        }

        this.state.lastTimestamp = now;
    }

    showOfflineModal() {
        if (!this.offlinePending) return;
        const modal = document.getElementById('offline-modal');
        if (!modal) return;

        const timeAwayText = this.formatDuration(this.offlinePending.timeAwaySec);
        const earnedText = this.offlinePending.earnings.format(this.state.settings.notation, 2);
        const effPercent = Math.round(this.offlinePending.efficiency * 100);

        document.getElementById('offline-time-away').textContent = timeAwayText;
        document.getElementById('offline-coins-earned').textContent = '+' + earnedText;
        document.getElementById('offline-efficiency-val').textContent = effPercent + '%';

        const capNotice = document.getElementById('offline-cap-notice');
        if (capNotice) {
            capNotice.style.display = this.offlinePending.capped ? 'block' : 'none';
        }

        modal.classList.add('modal-visible');
    }

    claimOfflineReward(multiplier = 1) {
        if (!this.offlinePending) return;
        const finalReward = this.offlinePending.earnings.mul(multiplier);
        this.addCoins(finalReward);

        this.sound.playMilestone();
        this.visuals.triggerMilestoneBurst(window.innerWidth / 2, window.innerHeight / 2);
        this.visuals.showToast(
            'Награда оффлайна получена!',
            `+${finalReward.format(this.state.settings.notation, 2)} монет зачислено на баланс.`,
            '💰'
        );

        this.offlinePending = null;
        const modal = document.getElementById('offline-modal');
        if (modal) modal.classList.remove('modal-visible');

        this.updateUIQuick();
    }

    formatDuration(seconds) {
        const s = Math.floor(seconds);
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        if (hrs > 0) return `${hrs}ч ${mins}м ${secs}с`;
        if (mins > 0) return `${mins}м ${secs}с`;
        return `${secs}с`;
    }

    // --- SAVE / LOAD & SETTINGS ---

    saveGame() {
        this.state.lastTimestamp = Date.now();
        const serialized = {
            coins: this.state.coins.toJSON(),
            totalClicks: this.state.totalClicks,
            currentRunEarned: this.state.currentRunEarned.toJSON(),
            allTimeEarned: this.state.allTimeEarned.toJSON(),
            prestigeShards: this.state.prestigeShards.toJSON(),
            totalPrestigeSpentAndHeld: this.state.totalPrestigeSpentAndHeld.toJSON(),
            prestigeCount: this.state.prestigeCount,
            buildings: this.state.buildings,
            purchasedUpgrades: this.state.purchasedUpgrades,
            prestigeUpgrades: this.state.prestigeUpgrades,
            achievements: this.state.achievements,
            lastTimestamp: this.state.lastTimestamp,
            runStartTime: this.state.runStartTime,
            totalPlayTime: this.state.totalPlayTime,
            highestCPS: this.state.highestCPS.toJSON(),
            settings: this.state.settings
        };
        try {
            localStorage.setItem('AETHERION_IDLE_SAVE_V1', JSON.stringify(serialized));
        } catch (e) {
            console.error("Save failed:", e);
        }
    }

    loadSave() {
        try {
            const raw = localStorage.getItem('AETHERION_IDLE_SAVE_V1');
            if (!raw) return;
            const parsed = JSON.parse(raw);

            this.state.coins = BigNum.fromJSON(parsed.coins);
            this.state.totalClicks = parsed.totalClicks || 0;
            this.state.currentRunEarned = BigNum.fromJSON(parsed.currentRunEarned);
            this.state.allTimeEarned = BigNum.fromJSON(parsed.allTimeEarned);
            this.state.prestigeShards = BigNum.fromJSON(parsed.prestigeShards);
            this.state.totalPrestigeSpentAndHeld = BigNum.fromJSON(parsed.totalPrestigeSpentAndHeld);
            this.state.prestigeCount = parsed.prestigeCount || 0;
            this.state.buildings = parsed.buildings || this.state.buildings;
            this.state.purchasedUpgrades = parsed.purchasedUpgrades || {};
            this.state.prestigeUpgrades = parsed.prestigeUpgrades || this.state.prestigeUpgrades;
            this.state.achievements = parsed.achievements || {};
            this.state.lastTimestamp = parsed.lastTimestamp || Date.now();
            this.state.runStartTime = parsed.runStartTime || Date.now();
            this.state.totalPlayTime = parsed.totalPlayTime || 0;
            this.state.highestCPS = BigNum.fromJSON(parsed.highestCPS);
            if (parsed.settings) {
                this.state.settings = Object.assign(this.state.settings, parsed.settings);
            }
        } catch (e) {
            console.error("Load save failed, resetting to initial:", e);
            this.state = this.getInitialState();
        }
    }

    exportSaveString() {
        this.saveGame();
        const raw = localStorage.getItem('AETHERION_IDLE_SAVE_V1') || '{}';
        return btoa(unescape(encodeURIComponent(raw)));
    }

    importSaveString(b64Str) {
        try {
            const decoded = decodeURIComponent(escape(atob(b64Str.trim())));
            const parsed = JSON.parse(decoded);
            if (parsed && parsed.coins) {
                localStorage.setItem('AETHERION_IDLE_SAVE_V1', decoded);
                this.loadSave();
                this.recalculateProduction();
                this.renderAll();
                this.visuals.showToast('Успех', 'Сохранение успешно импортировано!', '📥');
                return true;
            }
        } catch (e) {
            alert("Неверный формат строки сохранения!");
            return false;
        }
        return false;
    }

    hardReset() {
        const confirm1 = confirm("ВНИМАНИЕ! Это полностью сотрет весь ваш прогресс, престиж и достижения. Вы уверены?");
        if (!confirm1) return;
        const confirm2 = confirm("ТОЧНО уверены? Действие необратимо!");
        if (!confirm2) return;

        localStorage.removeItem('AETHERION_IDLE_SAVE_V1');
        this.state = this.getInitialState();
        this.recalculateProduction();
        this.renderAll();
        this.visuals.showToast('Сброс выполнен', 'Игра начата с чистого листа', '🔄');
    }

    // --- UI CONTROLLER & RENDERING ---

    initUI() {
        this.renderBuildings();
        this.renderUpgrades();
        this.renderPrestigeTree();
        this.renderAchievements();
        this.renderStats();
        this.updateSettingsUI();
    }

    renderAll() {
        this.renderBuildings();
        this.renderUpgrades();
        this.renderPrestigeTree();
        this.renderAchievements();
        this.renderStats();
        this.updateUIQuick();
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        document.querySelectorAll('.game-tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `tab-${tabId}`);
        });

        if (tabId === 'stats') this.renderStats();
        if (tabId === 'prestige') this.renderPrestigeTree();
    }

    renderBuildings() {
        const container = document.getElementById('buildings-list');
        if (!container) return;

        const notation = this.state.settings.notation;
        const mode = this.state.settings.bulkMode;
        const totalCPS = this.currentCPS;

        container.innerHTML = '';

        GameData.BUILDINGS.forEach(b => {
            const bState = this.state.buildings[b.id] || { level: 0 };
            const multiplier = this.getBuildingMultiplier(b.id);
            const bProd = this.getBuildingProduction(b.id);

            const bulkCalc = this.formulas.calculateBulkBuy({
                baseCost: b.baseCost,
                currentLevel: bState.level,
                multiplier: multiplier
            }, this.state.coins, mode);

            const milestoneInfo = this.formulas.getNextMilestone(bState.level);

            // CPS share percentage
            let sharePercent = 0;
            if (totalCPS.gt(0) && bProd.gt(0)) {
                sharePercent = Math.min(100, Math.max(0, (bProd.div(totalCPS).toNumber()) * 100));
            }

            const card = document.createElement('div');
            card.className = `building-card ${bulkCalc.canAfford ? 'affordable' : 'locked'}`;
            card.id = `building-card-${b.id}`;

            const costFormatted = bulkCalc.totalCost.format(notation, 2);
            const prodFormatted = bProd.format(notation, 2);
            const levelLabel = bState.level;

            let buyLabel = `+${bulkCalc.levelsToBuy}`;
            if (mode === 'MAX') {
                buyLabel = bulkCalc.levelsToBuy > 0 ? `MAX (+${bulkCalc.levelsToBuy})` : `MAX (0)`;
            }

            card.innerHTML = `
                <div class="b-icon-wrap" style="border-color: ${b.accentColor}44; box-shadow: 0 0 15px ${b.accentColor}22;">
                    <span class="b-icon">${b.icon}</span>
                    <span class="b-level-badge">${levelLabel}</span>
                </div>
                <div class="b-info">
                    <div class="b-header">
                        <span class="b-name">${b.nameRu}</span>
                        <span class="b-share">${sharePercent.toFixed(1)}% CPS</span>
                    </div>
                    <div class="b-prod">
                        Доход: <strong>+${prodFormatted}</strong> /сек
                    </div>
                    <div class="b-milestone-wrap">
                        <div class="b-milestone-bar">
                            <div class="b-milestone-fill" style="width: ${milestoneInfo.percent}%; background: ${b.accentColor};"></div>
                        </div>
                        <span class="b-milestone-text">${bState.level} / ${milestoneInfo.target} (x${milestoneInfo.nextMultiplierBonus})</span>
                    </div>
                </div>
                <button class="b-buy-btn ${bulkCalc.canAfford ? 'btn-can-buy' : 'btn-disabled'}" data-building-id="${b.id}">
                    <span class="buy-qty">${buyLabel}</span>
                    <span class="buy-cost">⚡ ${costFormatted}</span>
                </button>
            `;

            const buyBtn = card.querySelector('.b-buy-btn');
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.buyBuilding(b.id);
            });

            container.appendChild(card);
        });
    }

    renderUpgrades() {
        const container = document.getElementById('upgrades-grid');
        if (!container) return;

        const notation = this.state.settings.notation;
        container.innerHTML = '';

        let visibleCount = 0;
        GameData.UPGRADES.forEach(u => {
            const purchased = !!this.state.purchasedUpgrades[u.id];

            // Check visibility requirements
            let reqMet = true;
            if (u.requirement) {
                if (u.requirement.type === 'clicks' && this.state.totalClicks < u.requirement.value) reqMet = false;
                if (u.requirement.type === 'building_count') {
                    const bLvl = this.state.buildings[u.requirement.buildingId]?.level || 0;
                    if (bLvl < u.requirement.count) reqMet = false;
                }
                if (u.requirement.type === 'total_buildings') {
                    const tot = Object.values(this.state.buildings).reduce((acc, b) => acc + b.level, 0);
                    if (tot < u.requirement.count) reqMet = false;
                }
            }

            if (!reqMet && !purchased) return;
            visibleCount++;

            const card = document.createElement('div');
            card.className = `upgrade-card ${purchased ? 'purchased' : (this.state.coins.gte(u.cost) ? 'affordable' : 'unaffordable')}`;

            card.innerHTML = `
                <div class="upg-icon">${u.icon}</div>
                <div class="upg-details">
                    <div class="upg-title">${u.nameRu}</div>
                    <div class="upg-desc">${u.descriptionRu}</div>
                    <div class="upg-footer">
                        ${purchased ? '<span class="badge-owned">ИССЛЕДОВАНО</span>' : `<span class="upg-cost">⚡ ${u.cost.format(notation, 2)}</span>`}
                    </div>
                </div>
            `;

            if (!purchased) {
                card.addEventListener('click', () => this.buyUpgrade(u.id));
            }

            container.appendChild(card);
        });

        if (visibleCount === 0) {
            container.innerHTML = `<div class="empty-placeholder">Улучшений пока нет. Развивайте производство и клики для открытия новых технологий!</div>`;
        }
    }

    renderPrestigeTree() {
        const notation = this.state.settings.notation;
        const heldShards = this.state.prestigeShards;
        const currentEarned = this.state.currentRunEarned;
        const spentAndHeld = this.state.totalPrestigeSpentAndHeld;

        // Update prestige header stats
        const pEarnable = this.formulas.calculatePrestigeEarned(currentEarned, spentAndHeld);
        const globalBonus = (this.getPrestigeBonusPerUnit() * 100).toFixed(1);
        const totalMult = this.getGlobalPrestigeMultiplier().format(notation, 2);

        const shardCountEl = document.getElementById('prestige-shards-count');
        const pEarnableEl = document.getElementById('prestige-earnable-count');
        const globalBonusEl = document.getElementById('prestige-global-multiplier');

        if (shardCountEl) shardCountEl.textContent = heldShards.format(notation, 0);
        if (pEarnableEl) pEarnableEl.textContent = '+' + pEarnable.format(notation, 0);
        if (globalBonusEl) globalBonusEl.textContent = `x${totalMult} (+${globalBonus}% за осколок)`;

        const prestigeBtn = document.getElementById('btn-activate-prestige');
        if (prestigeBtn) {
            prestigeBtn.disabled = pEarnable.lte(0);
            prestigeBtn.classList.toggle('glow-pulse', pEarnable.gt(0));
        }

        // Render meta upgrades
        const treeGrid = document.getElementById('prestige-tree-grid');
        if (!treeGrid) return;
        treeGrid.innerHTML = '';

        GameData.PRESTIGE_UPGRADES.forEach(meta => {
            const currentRank = this.state.prestigeUpgrades[meta.id] || 0;
            const isMax = currentRank >= meta.maxLevel;
            const cost = meta.baseCost.mul(Math.pow(meta.costMultiplier, currentRank));
            const canAfford = !isMax && heldShards.gte(cost);

            const card = document.createElement('div');
            card.className = `meta-card ${isMax ? 'maxed' : (canAfford ? 'affordable' : 'locked')}`;

            card.innerHTML = `
                <div class="meta-icon">${meta.icon}</div>
                <div class="meta-info">
                    <div class="meta-title">${meta.nameRu} <span class="meta-rank">${currentRank}/${meta.maxLevel}</span></div>
                    <div class="meta-desc">${meta.descriptionRu}</div>
                    <div class="meta-footer">
                        ${isMax ? '<span class="badge-max">МАКС. УРОВЕНЬ</span>' : `<span class="meta-cost">💎 ${cost.format(notation, 0)}</span>`}
                    </div>
                </div>
            `;

            if (!isMax) {
                card.addEventListener('click', () => this.buyPrestigeUpgrade(meta.id));
            }

            treeGrid.appendChild(card);
        });
    }

    renderAchievements() {
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        container.innerHTML = '';
        const unlockedCount = Object.keys(this.state.achievements).length;
        const countHeader = document.getElementById('ach-unlocked-count');
        if (countHeader) countHeader.textContent = `${unlockedCount} / ${GameData.ACHIEVEMENTS.length}`;

        GameData.ACHIEVEMENTS.forEach(ach => {
            const unlocked = !!this.state.achievements[ach.id];
            const card = document.createElement('div');
            card.className = `ach-card ${unlocked ? 'unlocked' : 'locked'}`;

            card.innerHTML = `
                <div class="ach-icon">${unlocked ? ach.icon : '🔒'}</div>
                <div class="ach-info">
                    <div class="ach-title">${ach.nameRu}</div>
                    <div class="ach-desc">${ach.descRu}</div>
                    <div class="ach-bonus">+2% к общему доходу</div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    renderStats() {
        const notation = this.state.settings.notation;
        const setVal = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setVal('stat-coins', this.state.coins.format(notation, 2));
        setVal('stat-cps', this.currentCPS.format(notation, 2));
        setVal('stat-click', this.clickValue.format(notation, 2));
        setVal('stat-clicks-total', this.state.totalClicks.toLocaleString());
        setVal('stat-run-earned', this.state.currentRunEarned.format(notation, 2));
        setVal('stat-all-earned', this.state.allTimeEarned.format(notation, 2));
        setVal('stat-highest-cps', this.state.highestCPS.format(notation, 2));
        setVal('stat-prestige-count', this.state.prestigeCount.toString());
        setVal('stat-prestige-shards', this.state.prestigeShards.format(notation, 0));
        setVal('stat-playtime', this.formatDuration(this.state.totalPlayTime));
        setVal('stat-run-time', this.formatDuration((Date.now() - this.state.runStartTime) / 1000));

        const totalB = Object.values(this.state.buildings).reduce((acc, b) => acc + b.level, 0);
        setVal('stat-total-buildings', totalB.toString());
    }

    updateUIQuick() {
        const notation = this.state.settings.notation;
        const coinsEl = document.getElementById('header-coins');
        const cpsEl = document.getElementById('header-cps');
        const clickValEl = document.getElementById('click-power-val');

        if (coinsEl) coinsEl.textContent = this.state.coins.format(notation, 2);
        if (cpsEl) cpsEl.textContent = this.currentCPS.format(notation, 2);
        if (clickValEl) clickValEl.textContent = '+' + this.clickValue.format(notation, 1);
    }

    updateUIRealtime() {
        this.updateUIQuick();

        // Update building cards buy button states dynamically without full rebuild
        if (this.activeTab === 'generators') {
            const mode = this.state.settings.bulkMode;
            const notation = this.state.settings.notation;
            GameData.BUILDINGS.forEach(b => {
                const card = document.getElementById(`building-card-${b.id}`);
                if (!card) return;

                const bState = this.state.buildings[b.id];
                const multiplier = this.getBuildingMultiplier(b.id);
                const bulkCalc = this.formulas.calculateBulkBuy({
                    baseCost: b.baseCost,
                    currentLevel: bState.level,
                    multiplier: multiplier
                }, this.state.coins, mode);

                card.classList.toggle('affordable', bulkCalc.canAfford);
                card.classList.toggle('locked', !bulkCalc.canAfford);

                const buyBtn = card.querySelector('.b-buy-btn');
                if (buyBtn) {
                    buyBtn.classList.toggle('btn-can-buy', bulkCalc.canAfford);
                    buyBtn.classList.toggle('btn-disabled', !bulkCalc.canAfford);

                    const qtySpan = buyBtn.querySelector('.buy-qty');
                    const costSpan = buyBtn.querySelector('.buy-cost');

                    let buyLabel = `+${bulkCalc.levelsToBuy}`;
                    if (mode === 'MAX') {
                        buyLabel = bulkCalc.levelsToBuy > 0 ? `MAX (+${bulkCalc.levelsToBuy})` : `MAX (0)`;
                    }

                    if (qtySpan) qtySpan.textContent = buyLabel;
                    if (costSpan) costSpan.textContent = `⚡ ${bulkCalc.totalCost.format(notation, 2)}`;
                }
            });
        }
    }

    updateSettingsUI() {
        const notationSel = document.getElementById('setting-notation');
        if (notationSel) notationSel.value = this.state.settings.notation;

        const soundToggle = document.getElementById('setting-sound');
        if (soundToggle) soundToggle.checked = this.state.settings.soundEnabled;

        const volumeSlider = document.getElementById('setting-volume');
        if (volumeSlider) volumeSlider.value = this.state.settings.volume * 100;

        const fxToggle = document.getElementById('setting-lowfx');
        if (fxToggle) fxToggle.checked = this.state.settings.lowFX;
    }

    initEventListeners() {
        // Core clicker
        const reactorEl = document.getElementById('quantum-reactor');
        if (reactorEl) {
            reactorEl.addEventListener('pointerdown', (e) => this.clickCore(e));
        }

        // Tab switches
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Bulk Buy buttons
        document.querySelectorAll('.bulk-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setBulkMode(btn.dataset.mode));
        });

        // Prestige button
        const presBtn = document.getElementById('btn-activate-prestige');
        if (presBtn) {
            presBtn.addEventListener('click', () => this.performPrestige());
        }

        // Offline claim buttons
        const claimBtn = document.getElementById('btn-claim-offline');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => this.claimOfflineReward(1));
        }
        const claim2xBtn = document.getElementById('btn-claim-offline-2x');
        if (claim2xBtn) {
            claim2xBtn.addEventListener('click', () => this.claimOfflineReward(2));
        }

        // Settings events
        const notationSel = document.getElementById('setting-notation');
        if (notationSel) {
            notationSel.addEventListener('change', (e) => {
                this.state.settings.notation = e.target.value;
                this.renderAll();
            });
        }

        const soundToggle = document.getElementById('setting-sound');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.state.settings.soundEnabled = e.target.checked;
                this.sound.setMuted(!e.target.checked);
            });
        }

        const volumeSlider = document.getElementById('setting-volume');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value) / 100;
                this.state.settings.volume = vol;
                this.sound.setVolume(vol);
            });
        }

        const fxToggle = document.getElementById('setting-lowfx');
        if (fxToggle) {
            fxToggle.addEventListener('change', (e) => {
                this.state.settings.lowFX = e.target.checked;
                this.visuals.lowPerformanceMode = e.target.checked;
                this.visuals.initStarfield();
            });
        }

        // Export/Import/Reset buttons
        const exportBtn = document.getElementById('btn-export-save');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const b64 = this.exportSaveString();
                const area = document.getElementById('save-string-area');
                if (area) {
                    area.value = b64;
                    area.select();
                    navigator.clipboard.writeText(b64).then(() => {
                        this.visuals.showToast('Скопировано!', 'Код сохранения скопирован в буфер обмена', '📋');
                    });
                }
            });
        }

        const importBtn = document.getElementById('btn-import-save');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const area = document.getElementById('save-string-area');
                if (area && area.value) {
                    this.importSaveString(area.value);
                }
            });
        }

        const hardResetBtn = document.getElementById('btn-hard-reset');
        if (hardResetBtn) {
            hardResetBtn.addEventListener('click', () => this.hardReset());
        }
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
    window.game = new IdleGame();
    window.game.init();
});
