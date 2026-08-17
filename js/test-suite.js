/**
 * Automated QA Test Suite
 * Validates all Acceptance Criteria from Technical Specification Section 7:
 * 1. Bulk Buy analytical cost precision (error < 0.0001%)
 * 2. Prestige math & reset matrix verification
 * 3. Offline progress formulas and 2-hour cap enforcement
 * 4. BigNumber stability above 1.0e308 and notation consistency
 */

class GameTestSuite {
    static runAllTests() {
        const results = [];
        results.push(this.testBulkBuyPrecision());
        results.push(this.testPrestigeFormula());
        results.push(this.testOfflineCalculation());
        results.push(this.testBigNumbersBeyond308());
        return results;
    }

    /**
     * Criterion 1: Bulk Buy analytical formula exact match with sequential summation
     */
    static testBulkBuyPrecision() {
        const testCases = [
            { baseCost: 15, currentLevel: 0, k: 10, mult: 1.15 },
            { baseCost: 15, currentLevel: 0, k: 100, mult: 1.15 },
            { baseCost: 1100, currentLevel: 25, k: 10, mult: 1.15 },
            { baseCost: 1100, currentLevel: 25, k: 100, mult: 1.15 },
            { baseCost: 130000, currentLevel: 75, k: 10, mult: 1.15 },
            { baseCost: 130000, currentLevel: 75, k: 100, mult: 1.15 }
        ];

        let maxErrorPercent = 0;
        let allPassed = true;

        testCases.forEach(tc => {
            // 1. Analytical formula: Cost(n, k) = b * m^n * (m^k - 1) / (m - 1)
            const analyticalCost = GameFormulas.calculatePackageCost(
                new BigNum(tc.baseCost),
                tc.currentLevel,
                tc.k,
                tc.mult
            );

            // 2. Sequential summation: sum(b * m^(n + i)) for i in 0..k-1
            let sequentialCost = new BigNum(0);
            for (let i = 0; i < tc.k; i++) {
                const single = GameFormulas.calculateSingleCost(
                    new BigNum(tc.baseCost),
                    tc.currentLevel + i,
                    tc.mult
                );
                sequentialCost = sequentialCost.add(single);
            }

            // Difference and relative error
            const diff = analyticalCost.sub(sequentialCost).abs ? analyticalCost.sub(sequentialCost) : new BigNum(Math.abs(analyticalCost.toNumber() - sequentialCost.toNumber()));
            const errorFraction = Math.abs((analyticalCost.toNumber() - sequentialCost.toNumber()) / sequentialCost.toNumber());
            const errorPercent = errorFraction * 100;

            if (errorPercent > maxErrorPercent) maxErrorPercent = errorPercent;

            // Section 7.1 Acceptance criteria: error <= 0.0001%
            if (errorPercent > 0.0001) {
                allPassed = false;
            }
        });

        return {
            id: 'criterion_1_bulk_buy',
            name: 'Критерий 1: Точность формулы стоимости Bulk Buy (< 0.0001%)',
            passed: allPassed,
            maxError: maxErrorPercent.toFixed(8) + '%',
            details: `Максимальная погрешность между аналитической формулой и циклом составила ${maxErrorPercent.toFixed(8)}% (норма: <= 0.0001%).`
        };
    }

    /**
     * Criterion 2: Prestige Math & Soft Reset verification
     */
    static testPrestigeFormula() {
        // P_earned = floor( 150 * sqrt(E_total / 10^9) ) - spentAndHeld
        // Test case 1: E_total = 1.0e9 => sqrt(1) = 1 => 150 * 1 = 150
        const p1 = GameFormulas.calculatePrestigeEarned(new BigNum(1, 9), 0, 150, new BigNum(1, 9));
        const pass1 = p1.eq(150);

        // Test case 2: E_total = 4.0e9 => sqrt(4) = 2 => 150 * 2 = 300 (spent 150 => net 150)
        const p2 = GameFormulas.calculatePrestigeEarned(new BigNum(4, 9), 150, 150, new BigNum(1, 9));
        const pass2 = p2.eq(150);

        // Test case 3: E_total = 0.5e9 (below threshold) => 0
        const p3 = GameFormulas.calculatePrestigeEarned(new BigNum(5, 8), 0, 150, new BigNum(1, 9));
        const pass3 = p3.eq(0);

        // Global multiplier check: Mult = 1 + (P_held * 0.02)
        const multCheck = GameFormulas.calculateGlobalPrestigeMultiplier(new BigNum(100), 0.02);
        // 1 + 100 * 0.02 = 1 + 2 = 3.0
        const pass4 = Math.abs(multCheck.toNumber() - 3.0) < 1e-6;

        const allPassed = pass1 && pass2 && pass3 && pass4;

        return {
            id: 'criterion_2_prestige',
            name: 'Критерий 2: Корректность формулы Престижа и баффа',
            passed: allPassed,
            details: `Порог 1.0e9 (1 млрд): ${p1.toNumber()} осколков. Прогрессия 4.0e9: ${p2.toNumber()} осколков. Множитель 100 осколков: x${multCheck.toNumber()}.`
        };
    }

    /**
     * Criterion 3: Offline calculations & 2-hour cap check
     */
    static testOfflineCalculation() {
        const cps = new BigNum(1000); // 1000 coins/sec
        const timeLimit = 7200; // 2 hours
        const eff = 0.5; // 50%

        // 10 minutes (600s): 600 * 1000 * 0.5 = 300,000
        const res10m = GameFormulas.calculateOfflineEarnings(600, cps, timeLimit, eff);
        const pass10m = res10m.earnings.eq(300000) && !res10m.capped;

        // 1 hour (3600s): 3600 * 1000 * 0.5 = 1,800,000
        const res1h = GameFormulas.calculateOfflineEarnings(3600, cps, timeLimit, eff);
        const pass1h = res1h.earnings.eq(1800000) && !res1h.capped;

        // 2 hours (7200s): 7200 * 1000 * 0.5 = 3,600,000
        const res2h = GameFormulas.calculateOfflineEarnings(7200, cps, timeLimit, eff);
        const pass2h = res2h.earnings.eq(3600000) && !res2h.capped;

        // 10 hours (36000s) -> strictly capped at 2 hours (7200s) => 3,600,000
        const res10h = GameFormulas.calculateOfflineEarnings(36000, cps, timeLimit, eff);
        const pass10h = res10h.earnings.eq(3600000) && res10h.capped;

        const allPassed = pass10m && pass1h && pass2h && pass10h;

        return {
            id: 'criterion_3_offline',
            name: 'Критерий 3: Оффлайн-доход и строгое ограничение 2 часов',
            passed: allPassed,
            details: `10 мин: ${res10m.earnings.format('standard')}, 1 час: ${res1h.earnings.format('standard')}, 2 часа: ${res2h.earnings.format('standard')}, 10 часов (с ограничением): ${res10h.earnings.format('standard')}.`
        };
    }

    /**
     * Criterion 4: Stability above 1.0e308 and formatting
     */
    static testBigNumbersBeyond308() {
        // Create numbers way above IEEE 754 limit 1.79e308
        const big1 = new BigNum(1.5, 500);
        const big2 = new BigNum(2.0, 500);
        const bigSum = big1.add(big2); // 3.5e500
        const bigMul = big1.mul(big2); // 3.0e1000

        const passMath = bigSum.e === 500 && Math.abs(bigSum.m - 3.5) < 1e-6 &&
                         bigMul.e === 1000 && Math.abs(bigMul.m - 3.0) < 1e-6;

        // Formats check
        const testNum = new BigNum(1.542, 14); // 1.542e14 = 154.2 T
        const sci = testNum.format('scientific', 2);   // "1.54e14"
        const eng = testNum.format('engineering', 2);  // "154.20e12"
        const std = testNum.format('standard', 2);     // "154.20 T"

        const passSci = sci === '1.54e14';
        const passEng = eng === '154.20e12';
        const passStd = std.includes('154.20 T');

        const allPassed = passMath && passSci && passEng && passStd;

        return {
            id: 'criterion_4_bignumber',
            name: 'Критерий 4: Поддержка больших чисел (> 10^308) и форматы UI',
            passed: allPassed,
            details: `1.5e500 + 2.0e500 = ${bigSum.format('scientific')}. Число 1.542e14 => Standard: "${std}", Scientific: "${sci}", Engineering: "${eng}".`
        };
    }
}

if (typeof window !== 'undefined') {
    window.GameTestSuite = GameTestSuite;
}
