/**
 * Web Audio API Sound Synthesizer
 * Generates crisp, futuristic sound effects dynamically without external audio assets.
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3; // Default 30% volume
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.initialized = true;
            }
        } catch (e) {
            console.warn("Web Audio API not supported or blocked", e);
        }
    }

    ensureContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.enabled = !muted;
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
    }

    /**
     * Play click sound (Crisp energetic quantum pulse)
     */
    playClick() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Frequency sweep for laser click
        const baseFreq = 440 + Math.random() * 80;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.5, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    /**
     * Play building purchase sound
     */
    playBuy() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.04); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.08); // G5

        gain.gain.setValueAtTime(this.volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    /**
     * Play bulk purchase sound
     */
    playBulkBuy() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [392.00, 523.25, 659.25, 1046.50]; // G4, C5, E5, C6
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.03);

            gain.gain.setValueAtTime(this.volume * 0.2, now + idx * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.03);
            osc.stop(now + idx * 0.03 + 0.2);
        });
    }

    /**
     * Play milestone level up sound (25, 50, 100 levels)
     */
    playMilestone() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // Major triad ascending
        
        chords.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(this.volume * 0.25, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.35);
        });
    }

    /**
     * Play upgrade purchase sound
     */
    playUpgrade() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

        // Lowpass filter for smooth tech sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);

        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
    }

    /**
     * Play achievement unlocked fanfare
     */
    playAchievement() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const melody = [
            { f: 587.33, t: 0 },    // D5
            { f: 739.99, t: 0.08 }, // F#5
            { f: 880.00, t: 0.16 }, // A5
            { f: 1174.66, t: 0.24 } // D6
        ];

        melody.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.f, now + note.t);

            gain.gain.setValueAtTime(this.volume * 0.3, now + note.t);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + note.t);
            osc.stop(now + note.t + 0.4);
        });
    }

    /**
     * Play prestige singularity collapse sound
     */
    playPrestige() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Sub-bass rumble
        const bass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(150, now);
        bass.frequency.exponentialRampToValueAtTime(30, now + 1.2);

        bassGain.gain.setValueAtTime(this.volume * 0.6, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        bass.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bass.start(now);
        bass.stop(now + 1.2);

        // Rising cosmic chime
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(200, now + 0.3);
        chime.frequency.exponentialRampToValueAtTime(1800, now + 1.2);

        chimeGain.gain.setValueAtTime(0.001, now + 0.3);
        chimeGain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.8);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        chime.connect(chimeGain);
        chimeGain.connect(this.ctx.destination);
        chime.start(now + 0.3);
        chime.stop(now + 1.4);
    }
}

if (typeof window !== 'undefined') {
    window.SoundSystem = SoundSystem;
}
