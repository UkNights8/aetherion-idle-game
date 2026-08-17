/**
 * Game Formulas & Analytical Solvers
 * Implements strict mathematical models from Technical Specification sections 2, 3, 4, and 5.
 */

const GameFormulas = {
    // Standard recommended multiplier for core buildings (Section 2.1)
    DEFAULT_MULTIPLIER: 1.15,

    // Prestige defaults (Section 4.1 & 4.2)
    PRESTIGE_SCALE_A: 150.0,
    PRESTIGE_THRESHOLD_B: new BigNum(1, 15), // 1.0e15
    PRESTIGE_BASE_BONUS_PER_UNIT: 0.02, // +2% per held prestige currency

    // Offline defaults (Section 5.2)
    BASE_OFFLINE_TIME_LIMIT: 7200, // 2 hours in seconds
    BASE_OFFLINE_EFFICIENCY: 0.5,  // 50%

    /**
     * Section 2.1: Price of the n-th single building level (0-indexed current level)
     * Price(n) = BaseCost * Multiplier^n
     * @param {BigNum} baseCost 
     * @param {number} currentLevel 
     * @param {number} multiplier 
     * @returns {BigNum}
     */
    calculateSingleCost(baseCost, currentLevel, multiplier = 1.15) {
        const b = BigNum.from(baseCost);
        const m = multiplier;
        const multPow = new BigNum(m).pow(currentLevel);
        return b.mul(multPow);
    },

    /**
     * Section 3.1: Bulk Buy Cost for k levels from current level n
     * Cost(n, k) = BaseCost * (Multiplier^n * (Multiplier^k - 1)) / (Multiplier - 1)
     * @param {BigNum} baseCost 
     * @param {number} currentLevel 
     * @param {number} countToBuy 
     * @param {number} multiplier 
     * @returns {BigNum}
     */
    calculatePackageCost(baseCost, currentLevel, countToBuy, multiplier = 1.15) {
        if (countToBuy <= 0) return new BigNum(0);
        if (countToBuy === 1) return this.calculateSingleCost(baseCost, currentLevel, multiplier);

        const b = BigNum.from(baseCost);
        const m = multiplier;
        const n = currentLevel;
        const k = countToBuy;

        // Multiplier^n
        const mPowN = new BigNum(m).pow(n);
        // Multiplier^k - 1
        const mPowK = new BigNum(m).pow(k);
        const mPowKMinus1 = mPowK.sub(1);
        // Multiplier - 1
        const denom = m - 1;

        // Cost = b * m^n * (m^k - 1) / (m - 1)
        return b.mul(mPowN).mul(mPowKMinus1).div(denom);
    },

    /**
     * Section 3.2: Analytical formula for MAX levels purchasable
     * k_max = floor( log_m( (c * (m - 1)) / (BaseCost * m^n) + 1 ) )
     * @param {BigNum} baseCost 
     * @param {number} currentLevel 
     * @param {BigNum} playerBalance 
     * @param {number} multiplier 
     * @returns {number}
     */
    calculateMaxLevels(baseCost, currentLevel, playerBalance, multiplier = 1.15) {
        const c = BigNum.from(playerBalance);
        if (c.lte(0)) return 0;

        const b = BigNum.from(baseCost);
        const m = multiplier;
        const n = currentLevel;

        // BaseCost * m^n (cost of next level)
        const nextLevelCost = b.mul(new BigNum(m).pow(n));
        if (c.lt(nextLevelCost)) return 0;

        // Inner term: (c * (m - 1)) / (BaseCost * m^n) + 1
        const term = c.mul(m - 1).div(nextLevelCost).add(1);
        if (term.lte(0)) return 0;

        // log_m(term) = ln(term) / ln(m)
        const logVal = term.log(m);
        if (isNaN(logVal) || !isFinite(logVal) || logVal < 0) return 0;

        let k = Math.floor(logVal);
        if (k < 0) k = 0;

        // Precision adjustment check against analytical package cost
        let testCost = this.calculatePackageCost(b, n, k, m);
        if (testCost.gt(c)) {
            // If floating point overshot by 1 due to log precision
            while (k > 0 && testCost.gt(c)) {
                k--;
                testCost = this.calculatePackageCost(b, n, k, m);
            }
        } else {
            // Check if we can afford k + 1
            const nextTestCost = this.calculatePackageCost(b, n, k + 1, m);
            if (nextTestCost.lte(c)) {
                k++;
            }
        }

        return k;
    },

    /**
     * Section 3.3: High-level bulk buy handler
     * @param {Object} building - { baseCost, currentLevel, multiplier }
     * @param {BigNum} playerBalance 
     * @param {'1' | '10' | '100' | 'MAX'} mode 
     * @returns {{ levelsToBuy: number, totalCost: BigNum, canAfford: boolean }}
     */
    calculateBulkBuy(building, playerBalance, mode = '1') {
        const n = building.currentLevel || 0;
        const b = BigNum.from(building.baseCost);
        const m = building.multiplier || this.DEFAULT_MULTIPLIER;
        const bal = BigNum.from(playerBalance);

        if (mode === 'MAX') {
            const kMax = this.calculateMaxLevels(b, n, bal, m);
            if (kMax <= 0) {
                const singleCost = this.calculateSingleCost(b, n, m);
                return {
                    levelsToBuy: 0,
                    totalCost: singleCost,
                    canAfford: false
                };
            }
            const totalCost = this.calculatePackageCost(b, n, kMax, m);
            return {
                levelsToBuy: kMax,
                totalCost: totalCost,
                canAfford: true
            };
        }

        let k = 1;
        if (mode === '10') k = 10;
        else if (mode === '100') k = 100;

        const totalCost = this.calculatePackageCost(b, n, k, m);
        const canAfford = bal.gte(totalCost);

        return {
            levelsToBuy: k,
            totalCost: totalCost,
            canAfford: canAfford
        };
    },

    /**
     * Section 2.3: Milestone Multipliers
     * - Level 25: x2
     * - Level 50: x4
     * - Level 100: x8
     * - Every subsequent +100 levels: x4
     * - Level 1000: x10
     * @param {number} level 
     * @returns {number}
     */
    calculateMilestoneMultiplier(level) {
        if (level < 25) return 1;

        let mult = 1;
        if (level >= 25 && level < 50) {
            mult = 2;
        } else if (level >= 50 && level < 100) {
            mult = 4;
        } else if (level >= 100) {
            // Level 100 gives x8
            // Each additional 100 levels (200, 300, etc.) multiplies by 4
            const hundredsAbove100 = Math.floor((level - 100) / 100);
            mult = 8 * Math.pow(4, hundredsAbove100);
        }

        if (level >= 1000) {
            mult *= 10;
        }

        return mult;
    },

    /**
     * Get next milestone info for UI progress display
     * @param {number} level 
     * @returns {{ current: number, target: number, prevTarget: number, nextMultiplierBonus: number, percent: number }}
     */
    getNextMilestone(level) {
        let prevTarget = 0;
        let target = 25;
        let nextMultiplierBonus = 2;

        if (level < 25) {
            target = 25;
            prevTarget = 0;
            nextMultiplierBonus = 2;
        } else if (level < 50) {
            target = 50;
            prevTarget = 25;
            nextMultiplierBonus = 2; // from 2x to 4x (2x relative)
        } else if (level < 100) {
            target = 100;
            prevTarget = 50;
            nextMultiplierBonus = 2; // from 4x to 8x (2x relative)
        } else if (level < 1000) {
            const nextHundred = (Math.floor(level / 100) + 1) * 100;
            target = nextHundred;
            prevTarget = target - 100;
            nextMultiplierBonus = 4;
        } else {
            const nextHundred = (Math.floor(level / 100) + 1) * 100;
            target = nextHundred;
            prevTarget = target - 100;
            nextMultiplierBonus = 4;
        }

        const range = target - prevTarget;
        const progress = Math.max(0, Math.min(range, level - prevTarget));
        const percent = Math.min(100, Math.max(0, (progress / range) * 100));

        return {
            current: level,
            target: target,
            prevTarget: prevTarget,
            nextMultiplierBonus: nextMultiplierBonus,
            percent: percent
        };
    },

    /**
     * Section 4.1: Prestige Currency Earned
     * P_earned = max(0, floor( a * sqrt(E_total / b) ) - P_current_spent_and_held)
     * @param {BigNum} totalEarnedCurrentRound 
     * @param {BigNum} currentSpentAndHeld 
     * @param {number} [scaleA=150.0] 
     * @param {BigNum} [thresholdB] 
     * @returns {BigNum}
     */
    calculatePrestigeEarned(totalEarnedCurrentRound, currentSpentAndHeld = 0, scaleA = 150.0, thresholdB = null) {
        const eTotal = BigNum.from(totalEarnedCurrentRound);
        const threshold = thresholdB || this.PRESTIGE_THRESHOLD_B;
        const spentAndHeld = BigNum.from(currentSpentAndHeld);

        if (eTotal.lt(threshold)) {
            return new BigNum(0);
        }

        // eTotal / threshold
        const ratio = eTotal.div(threshold);
        // sqrt(ratio)
        const sqrtRatio = ratio.sqrt();
        // a * sqrt(ratio)
        const totalP = sqrtRatio.mul(scaleA).floor();

        // subtract already earned/spent
        const netP = totalP.sub(spentAndHeld);
        return netP.gt(0) ? netP : new BigNum(0);
    },

    /**
     * Section 4.2: Global production buff from held prestige currency
     * Mult_global = 1 + (P_held * BonusPerUnit)
     * @param {BigNum} prestigeHeld 
     * @param {number} bonusPerUnit 
     * @returns {BigNum}
     */
    calculateGlobalPrestigeMultiplier(prestigeHeld, bonusPerUnit = 0.02) {
        const pHeld = BigNum.from(prestigeHeld);
        if (pHeld.lte(0)) return new BigNum(1);
        return pHeld.mul(bonusPerUnit).add(1);
    },

    /**
     * Section 5.2: Offline Earnings
     * OfflineEarnings = min(delta_t, TimeLimit_offline) * Production_total * Efficiency_offline
     * @param {number} deltaSeconds 
     * @param {BigNum} totalProductionPerSec 
     * @param {number} timeLimitSeconds 
     * @param {number} efficiency 
     * @returns {{ earnings: BigNum, effectiveTime: number, capped: boolean }}
     */
    calculateOfflineEarnings(deltaSeconds, totalProductionPerSec, timeLimitSeconds = 7200, efficiency = 0.5) {
        if (deltaSeconds < 10) {
            return {
                earnings: new BigNum(0),
                effectiveTime: 0,
                capped: false
            };
        }

        const effectiveTime = Math.min(deltaSeconds, timeLimitSeconds);
        const capped = deltaSeconds > timeLimitSeconds;
        const prod = BigNum.from(totalProductionPerSec);

        // effectiveTime * prod * efficiency
        const earnings = prod.mul(effectiveTime * efficiency);

        return {
            earnings: earnings,
            effectiveTime: effectiveTime,
            capped: capped
        };
    }
};

if (typeof window !== 'undefined') {
    window.GameFormulas = GameFormulas;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameFormulas;
}
