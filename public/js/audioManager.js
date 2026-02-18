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
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
            gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        } else {
            // Default "pew"
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
            gain.gain.setValueAtTime(0.2 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        }
    }

    playHit() {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.start(t);
        osc.stop(t + 0.1);
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
