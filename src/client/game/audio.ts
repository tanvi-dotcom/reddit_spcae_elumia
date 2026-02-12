// --- Audio System ---
let actx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isAudioMuted = false;
let duckingEndTime = 0;
const audioBuffers: Record<string, AudioBuffer | null> = {};

const createColoredNoiseBuffer = (sec = 8): AudioBuffer | null => {
    if (!actx) return null;
    const s = actx.sampleRate;
    const b = actx.createBuffer(2, s * sec, s);
    for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < d.length; i++) {
            const w = Math.random() * 2 - 1;
            last = (last + 0.02 * w) / 1.02;
            d[i] = last * 3.5;
        }
    }
    return b;
};

const generateThunderBuffers = () => {
    if (!actx || audioBuffers.thunder1) return;
    audioBuffers.thunder1 = createColoredNoiseBuffer(1);
    audioBuffers.thunder2 = createColoredNoiseBuffer(12);
    audioBuffers.thunder3 = createColoredNoiseBuffer(6);
    audioBuffers.thunder4 = createColoredNoiseBuffer(2);
};

export const initAudio = () => {
    if (actx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = new AC();
    masterGain = actx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(actx.destination);
    generateThunderBuffers();
};

export const resumeAudio = () => {
    if (actx && actx.state === 'suspended') actx.resume();
};

export const setMuteAudio = (mute: boolean) => {
    isAudioMuted = mute;
    if (masterGain && actx) {
        masterGain.gain.setTargetAtTime(mute ? 0 : 0.3, actx.currentTime, 0.1);
    }
};

// --- Thunder Layers ---
const thunderCrackLayer = (t: number) => {
    if (!actx || !masterGain) return;
    const buffer = audioBuffers.thunder1;
    if (!buffer) return;
    const src = actx.createBufferSource();
    src.buffer = buffer;
    const hp = actx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    src.connect(hp).connect(gain).connect(masterGain);
    src.start(t);
};

const thunderShockwave = (t: number) => {
    if (!actx || !masterGain) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(45, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 1);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 3);
};

const thunderRumble = (t: number) => {
    if (!actx || !masterGain) return;
    const buffer = audioBuffers.thunder2;
    if (!buffer) return;
    const src = actx.createBufferSource();
    src.buffer = buffer;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.7, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);

    src.connect(lp);
    if (actx.createStereoPanner) {
        const widener = actx.createStereoPanner();
        widener.pan.value = (Math.random() * 2 - 1) * 0.6;
        lp.connect(widener).connect(gain);
    } else {
        lp.connect(gain);
    }

    gain.connect(masterGain);
    src.start(t);
    src.stop(t + 4.0);
};

const thunderEcho = (t: number) => {
    if (!actx || !masterGain) return;
    const buffer = audioBuffers.thunder3;
    if (!buffer) return;
    const delay = actx.createDelay(3.0);
    delay.delayTime.value = 0.4 + Math.random() * 0.4;
    const fb = actx.createGain();
    fb.gain.value = 0.25;
    const noise = actx.createBufferSource();
    noise.buffer = buffer;
    const hp = actx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    const gain = actx.createGain();
    gain.gain.value = 0.2;
    noise.connect(hp).connect(delay).connect(fb).connect(delay);
    delay.connect(gain).connect(masterGain);
    noise.start(t + 0.4);
    noise.stop(t + 4);
};

const thunderAirWhoosh = (t: number) => {
    if (!actx || !masterGain) return;
    const buffer = audioBuffers.thunder4;
    if (!buffer) return;
    const src = actx.createBufferSource();
    src.buffer = buffer;
    const band = actx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 1;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    src.connect(band).connect(gain).connect(masterGain);
    src.start(t);
    src.stop(t + 2.0);
};

// --- Main Sound Player ---
export const playSound = (type: string) => {
    if (!actx || !masterGain || isAudioMuted) return;
    const t = actx.currentTime;

    if (duckingEndTime > t && type !== 'beam_thunder') return;

    const osc = actx.createOscillator();
    const gain = actx.createGain();
    gain.connect(masterGain);
    osc.connect(gain);

    switch (type) {
        case 'shoot':
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(110, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
            break;
        case 'enemy_shoot':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.linearRampToValueAtTime(220, t + 0.1);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
            break;
        case 'explosion':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.3);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
            break;
        case 'powerup':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, t);
            osc.frequency.linearRampToValueAtTime(1320, t + 0.1);
            osc.frequency.linearRampToValueAtTime(1760, t + 0.2);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
            break;
        case 'hit':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.1);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
            break;
        case 'warning':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.linearRampToValueAtTime(880, t + 0.25);
            osc.frequency.setValueAtTime(440, t + 0.25);
            osc.frequency.linearRampToValueAtTime(880, t + 0.5);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.5);
            osc.start(t);
            osc.stop(t + 0.5);
            break;
        case 'boss_spawn':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, t);
            osc.frequency.linearRampToValueAtTime(55, t + 1.5);
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
            osc.start(t);
            osc.stop(t + 1.5);
            break;
        case 'level_up':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.setValueAtTime(554, t + 0.1);
            osc.frequency.setValueAtTime(659, t + 0.2);
            osc.frequency.setValueAtTime(880, t + 0.4);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.8);
            osc.start(t);
            osc.stop(t + 0.8);
            break;
        case 'dash':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
            break;
        case 'missile':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(150, t + 0.4);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc.start(t);
            osc.stop(t + 0.4);
            break;
        case 'beam_charge':
            thunderAirWhoosh(t);
            thunderShockwave(t + 0.6);
            break;
        case 'beam_thunder':
            duckingEndTime = t + 3.5;
            thunderEcho(t);
            thunderShockwave(t);
            thunderRumble(t);
            thunderCrackLayer(t);
            break;
    }
};
