class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.3;
        this.musicNode = null;
        this.isMuted = false;

        // Unlock audio context on first user interaction
        window.addEventListener('click', () => {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }, { once: true });
        this.lastShootTime = 0;
    }

    playShoot(type) {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;
        // Throttle rapid fire sounds (prevents distortion & lag)
        if (t - this.lastShootTime < 0.08) return;
        this.lastShootTime = t;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'heavy') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.2); // deep punch
            gain.gain.setValueAtTime(0.4 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
        } else {
            // Punchier default "pew" (rapid pitch drop = kick drum like transient)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        }
    }

    playHit() {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;

        // Satisfying "ding" hit marker
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, t);
        osc1.frequency.exponentialRampToValueAtTime(800, t + 0.1);
        gain1.gain.setValueAtTime(0.3 * this.masterVolume, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.1);

        // Crunch sound
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(200, t);
        osc2.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        gain2.gain.setValueAtTime(0.2 * this.masterVolume, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.15);
    }

    playKill() {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;
        // Heavy bass-boosted boom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.4); // Huge pitch drop

        gain.gain.setValueAtTime(0.6 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    playComboSound(comboCount) {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;

        // Base note goes higher with combo count
        const notes = [261.6, 329.6, 392.0, 523.2, 659.2, 783.9, 1046.5];
        if (comboCount < 2) comboCount = 2; // prevent negative index just in case
        const idx = Math.min(comboCount - 2, notes.length - 1);
        const baseFreq = notes[idx] || 1046.5;

        // Play an arpeggio chord
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'square';
            const freq = baseFreq * (i === 0 ? 1 : i === 1 ? 1.25 : 1.5);
            osc.frequency.setValueAtTime(freq, t + i * 0.08);

            gain.gain.setValueAtTime(0, t);
            gain.gain.setValueAtTime(0.15 * this.masterVolume, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.3);

            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.3);
        }
    }

    playPowerup() {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(554, t + 0.1); // C#
        osc.frequency.setValueAtTime(659, t + 0.2); // E

        gain.gain.setValueAtTime(0.1 * this.masterVolume, t);
        gain.gain.linearRampToValueAtTime(0.1 * this.masterVolume, t + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    playDeath() {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.5);

        gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc.start(t);
        osc.stop(t + 0.5);
    }

    startMusic() {
        if (this.musicNode || this.isMuted) return;

        // Ethereal wind/drone (Pink Noise approximation using multiple oscillators)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Low rumbles
        osc1.type = 'triangle';
        osc1.frequency.value = 40;

        // Slight detune for texture
        osc2.type = 'sine';
        osc2.frequency.value = 42;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 120; // Muffied sound

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        // Much quieter
        gain.gain.value = 0.02 * this.masterVolume;

        osc1.start();
        osc2.start();

        this.musicNode = { stop: () => { osc1.stop(); osc2.stop(); } };
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.musicNode) {
            this.musicNode.stop();
            this.musicNode = null;
        } else if (!this.isMuted) {
            this.startMusic();
        }
        return this.isMuted;
    }
}

window.audioManager = new AudioManager();
