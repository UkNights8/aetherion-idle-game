/**
 * BigNumber Library for Incremental Games
 * Handles numbers with format: mantissa * 10^exponent
 * Supports numbers up to 10^(1,000,000) and higher, far exceeding IEEE 754 limit (1.79e308).
 * Complies with Technical Specification section 6.1 and 6.2.
 */

class BigNum {
    /**
     * @param {number|string|BigNum} mantissaOrValue
     * @param {number} [exponent=0]
     */
    constructor(mantissaOrValue = 0, exponent = 0) {
        if (mantissaOrValue instanceof BigNum) {
            this.m = mantissaOrValue.m;
            this.e = mantissaOrValue.e;
        } else if (typeof mantissaOrValue === 'string') {
            const parsed = BigNum.fromString(mantissaOrValue);
            this.m = parsed.m;
            this.e = parsed.e;
        } else if (typeof mantissaOrValue === 'number') {
            if (isNaN(mantissaOrValue) || !isFinite(mantissaOrValue)) {
                this.m = 0;
                this.e = 0;
            } else if (mantissaOrValue === 0) {
                this.m = 0;
                this.e = 0;
            } else {
                this.m = mantissaOrValue;
                this.e = exponent || 0;
                this.normalize();
            }
        } else {
            this.m = 0;
            this.e = 0;
        }
    }

    /**
     * Normalize so that 1.0 <= |mantissa| < 10.0 or mantissa === 0
     */
    normalize() {
        if (this.m === 0 || isNaN(this.m) || !isFinite(this.m)) {
            this.m = 0;
            this.e = 0;
            return this;
        }

        const absM = Math.abs(this.m);
        if (absM >= 1.0 && absM < 10.0) {
            return this;
        }

        const expShift = Math.floor(Math.log10(absM));
        this.m = this.m / Math.pow(10, expShift);
        this.e = this.e + expShift;

        // Double precision edge case check
        if (Math.abs(this.m) >= 10.0) {
            this.m /= 10.0;
            this.e += 1;
        } else if (Math.abs(this.m) < 1.0 && this.m !== 0) {
            this.m *= 10.0;
            this.e -= 1;
        }

        return this;
    }

    static from(val, exp = 0) {
        if (val instanceof BigNum) return new BigNum(val.m, val.e);
        return new BigNum(val, exp);
    }

    static fromString(str) {
        if (!str || typeof str !== 'string') return new BigNum(0);
        str = str.trim().toLowerCase();
        if (str === '0' || str === '') return new BigNum(0);

        if (str.includes('e')) {
            const parts = str.split('e');
            const m = parseFloat(parts[0]);
            const e = parseInt(parts[1], 10) || 0;
            return new BigNum(m, e);
        }

        const num = parseFloat(str);
        return new BigNum(num);
    }

    clone() {
        return new BigNum(this.m, this.e);
    }

    isZero() {
        return this.m === 0;
    }

    isNegative() {
        return this.m < 0;
    }

    /**
     * Convert to standard JavaScript primitive number
     * (caps at Infinity if exponent > 308)
     */
    toNumber() {
        if (this.m === 0) return 0;
        if (this.e > 308) return this.m > 0 ? Infinity : -Infinity;
        if (this.e < -308) return 0;
        return this.m * Math.pow(10, this.e);
    }

    // --- COMPARISONS ---

    cmp(other) {
        const o = BigNum.from(other);
        if (this.m === 0 && o.m === 0) return 0;
        if (this.m > 0 && o.m <= 0) return 1;
        if (this.m < 0 && o.m >= 0) return -1;
        if (this.m === 0) return o.m > 0 ? -1 : 1;

        // Both are positive
        if (this.m > 0 && o.m > 0) {
            if (this.e > o.e) return 1;
            if (this.e < o.e) return -1;
            if (Math.abs(this.m - o.m) < 1e-12) return 0;
            return this.m > o.m ? 1 : -1;
        }

        // Both are negative
        if (this.e > o.e) return -1;
        if (this.e < o.e) return 1;
        if (Math.abs(this.m - o.m) < 1e-12) return 0;
        return this.m < o.m ? 1 : -1;
    }

    eq(other) { return this.cmp(other) === 0; }
    neq(other) { return this.cmp(other) !== 0; }
    gt(other) { return this.cmp(other) > 0; }
    gte(other) { return this.cmp(other) >= 0; }
    lt(other) { return this.cmp(other) < 0; }
    lte(other) { return this.cmp(other) <= 0; }

    // --- ARITHMETIC OPERATIONS ---

    add(other) {
        const o = BigNum.from(other);
        if (this.m === 0) return o.clone();
        if (o.m === 0) return this.clone();

        const diffE = this.e - o.e;
        if (diffE >= 16) return this.clone(); // other is too small to affect this
        if (diffE <= -16) return o.clone(); // this is too small to affect other

        if (diffE >= 0) {
            const newM = this.m + o.m * Math.pow(10, -diffE);
            return new BigNum(newM, this.e);
        } else {
            const newM = this.m * Math.pow(10, diffE) + o.m;
            return new BigNum(newM, o.e);
        }
    }

    sub(other) {
        const o = BigNum.from(other);
        if (o.m === 0) return this.clone();
        if (this.m === 0) return new BigNum(-o.m, o.e);

        const diffE = this.e - o.e;
        if (diffE >= 16) return this.clone();
        if (diffE <= -16) return new BigNum(-o.m, o.e);

        if (diffE >= 0) {
            const newM = this.m - o.m * Math.pow(10, -diffE);
            return new BigNum(newM, this.e);
        } else {
            const newM = this.m * Math.pow(10, diffE) - o.m;
            return new BigNum(newM, o.e);
        }
    }

    mul(other) {
        const o = BigNum.from(other);
        if (this.m === 0 || o.m === 0) return new BigNum(0);
        return new BigNum(this.m * o.m, this.e + o.e);
    }

    div(other) {
        const o = BigNum.from(other);
        if (o.m === 0) throw new Error("BigNum division by zero");
        if (this.m === 0) return new BigNum(0);
        return new BigNum(this.m / o.m, this.e - o.e);
    }

    pow(exponent) {
        if (typeof exponent === 'object' && exponent instanceof BigNum) {
            exponent = exponent.toNumber();
        }
        if (exponent === 0) return new BigNum(1);
        if (this.m === 0) return new BigNum(0);

        // (m * 10^e)^p = m^p * 10^(e*p)
        // m^p = 10^(p * log10(m))
        const totalExp = exponent * (this.e + Math.log10(Math.abs(this.m)));
        const newExp = Math.floor(totalExp);
        const newM = Math.pow(10, totalExp - newExp) * (this.m < 0 && exponent % 2 !== 0 ? -1 : 1);
        return new BigNum(newM, newExp);
    }

    sqrt() {
        if (this.m < 0) throw new Error("BigNum sqrt of negative number");
        if (this.m === 0) return new BigNum(0);

        // sqrt(m * 10^e)
        // If e is odd: sqrt(m * 10 * 10^(e-1)) = sqrt(m*10) * 10^((e-1)/2)
        // If e is even: sqrt(m) * 10^(e/2)
        if (this.e % 2 === 0) {
            return new BigNum(Math.sqrt(this.m), this.e / 2);
        } else {
            return new BigNum(Math.sqrt(this.m * 10), (this.e - 1) / 2);
        }
    }

    log10() {
        if (this.m <= 0) return -Infinity;
        return this.e + Math.log10(this.m);
    }

    log(base = Math.E) {
        if (this.m <= 0) return -Infinity;
        return (this.e * Math.LN10 + Math.log(this.m)) / Math.log(base);
    }

    floor() {
        if (this.e < 0) {
            return this.m >= 0 ? new BigNum(0) : new BigNum(-1);
        }
        if (this.e >= 16) {
            return this.clone();
        }
        const val = this.toNumber();
        return new BigNum(Math.floor(val));
    }

    static max(a, b) {
        const bA = BigNum.from(a);
        const bB = BigNum.from(b);
        return bA.gte(bB) ? bA.clone() : bB.clone();
    }

    static min(a, b) {
        const bA = BigNum.from(a);
        const bB = BigNum.from(b);
        return bA.lte(bB) ? bA.clone() : bB.clone();
    }

    // --- FORMATTING (Complies with section 6.2) ---

    static STANDARD_SUFFIXES = [
        "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", 
        "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod",
        "Vg", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ocvg", "Novg",
        "Tg", "Utg", "Dtg", "Ttg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg",
        "Qag", "Uqag", "Dqag", "Tqag", "Qaqag", "Qiqag", "Sxqag", "Spqag", "Ocqag", "Noqag",
        "Qig", "Uqig", "Dqig", "Tqig", "Qaqig", "Qiqig", "Sxqig", "Spqig", "Ocqig", "Noqig",
        "Sxg", "Usxg", "Dsxg", "Tsxg", "Qasxg", "Qisxg", "Sxsxg", "Spsxg", "Ocsxg", "Nosxg",
        "Spg", "Uspg", "Dspg", "Tspg", "Qaspg", "Qispg", "Sxspg", "Spspg", "Ocspg", "Nospg",
        "Ocg", "Uocg", "Docg", "Tocg", "Qaocg", "Qiocg", "Sxocg", "Spocg", "Ococg", "Noocg",
        "Nog", "Unog", "Dnog", "Tnog", "Qanog", "Qinog", "Sxnog", "Spnog", "Ocnog", "Nonog",
        "Cent"
    ];

    /**
     * Format number for display
     * @param {'standard' | 'scientific' | 'engineering'} formatMode 
     * @param {number} precision 
     * @returns {string}
     */
    format(formatMode = 'standard', precision = 2) {
        if (this.m === 0) return "0";

        // Negative check
        const prefix = this.m < 0 ? "-" : "";
        const absNum = new BigNum(Math.abs(this.m), this.e);

        // Very small numbers
        if (absNum.e < -4) {
            return prefix + absNum.m.toFixed(precision) + "e" + absNum.e;
        }

        // Numbers strictly under 1,000,000: display in full with comma separators (Section 6.2.1)
        if (absNum.e < 6) {
            const val = absNum.toNumber();
            if (absNum.e < 3) {
                if (Number.isInteger(val)) {
                    return prefix + val.toLocaleString('en-US');
                }
                return prefix + (val >= 100 ? val.toFixed(1) : val.toFixed(precision));
            }
            return prefix + Math.floor(val).toLocaleString('en-US');
        }

        if (formatMode === 'scientific') {
            // Scientific Notation: mantissa 1.00 - 9.99 and exponent (e.g. 1.54e15)
            return prefix + absNum.m.toFixed(precision) + "e" + absNum.e;
        }

        if (formatMode === 'engineering') {
            // Engineering Notation: exponent multiple of 3, mantissa 1.00 - 999.99 (e.g. 154.20e12)
            const rem = ((absNum.e % 3) + 3) % 3;
            const engExp = absNum.e - rem;
            const engMantissa = absNum.m * Math.pow(10, rem);
            return prefix + engMantissa.toFixed(precision) + "e" + engExp;
        }

        // Standard Notation (Section 6.2.1)
        const suffixIndex = Math.floor(absNum.e / 3);
        if (suffixIndex < BigNum.STANDARD_SUFFIXES.length) {
            const rem = absNum.e % 3;
            const mantissa = absNum.m * Math.pow(10, rem);
            const suffix = BigNum.STANDARD_SUFFIXES[suffixIndex];
            return prefix + mantissa.toFixed(precision) + " " + suffix;
        }

        // Fallback to Scientific if beyond suffixes table
        return prefix + absNum.m.toFixed(precision) + "e" + absNum.e;
    }

    toString() {
        return this.format('scientific', 4);
    }

    toJSON() {
        return { m: this.m, e: this.e };
    }

    static fromJSON(obj) {
        if (!obj || typeof obj.m !== 'number' || typeof obj.e !== 'number') {
            return new BigNum(0);
        }
        return new BigNum(obj.m, obj.e);
    }
}

// Global exposure for browser scripts and testing
if (typeof window !== 'undefined') {
    window.BigNum = BigNum;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BigNum;
}
