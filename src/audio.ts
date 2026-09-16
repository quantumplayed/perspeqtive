/**
 * Audio Engine & Game-Feel Juice for Perspeqtive
 * Pure procedural Web Audio API synthesis - zero external audio assets required.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

// Ensure context activates on first interaction
['keydown', 'pointerdown', 'wheel'].forEach(evt => {
  window.addEventListener(evt, () => getAudioContext(), { once: true });
});

/**
 * Footstep click on apartment floor
 */
export function playFootstep() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();

  const freq = 90 + Math.random() * 40;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(350, now);

  gain.gain.setValueAtTime(0.08 + Math.random() * 0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.06);
}

/**
 * Dimensional Perspective Shift (Warp & Resonant Filter Sweep)
 */
export function playShift(targetDim: number) {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  // Sub bass warp
  const osc1 = ac.createOscillator();
  const gain1 = ac.createGain();
  osc1.type = 'sine';

  const startF = targetDim === 1 ? 95 : 180;
  const endF = targetDim === 1 ? 210 : 85;
  osc1.frequency.setValueAtTime(startF, now);
  osc1.frequency.exponentialRampToValueAtTime(endF, now + 0.22);

  gain1.gain.setValueAtTime(0.28, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc1.connect(gain1);
  gain1.connect(masterGain);

  osc1.start(now);
  osc1.stop(now + 0.26);

  // Ethereal phase chime
  const osc2 = ac.createOscillator();
  const gain2 = ac.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(targetDim === 1 ? 587.33 : 440, now);
  osc2.frequency.exponentialRampToValueAtTime(targetDim === 1 ? 880 : 330, now + 0.2);

  gain2.gain.setValueAtTime(0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc2.connect(gain2);
  gain2.connect(masterGain);

  osc2.start(now);
  osc2.stop(now + 0.23);
}

/**
 * Crate pickup ratchet/thud
 */
export function playGrab() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(700, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Heavy wooden crate impact thud
 */
export function playDrop() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  // Low impact thump
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.16);
}

/**
 * Heavy pressure plate / relay activation latch & electromagnetic surge
 */
export function playPlateActivate() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  // Metallic snap
  const osc1 = ac.createOscillator();
  const gain1 = ac.createGain();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(480, now);
  osc1.frequency.exponentialRampToValueAtTime(120, now + 0.06);

  gain1.gain.setValueAtTime(0.2, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.08);

  // Power surge chords
  [523.25, 659.25, 783.99].forEach((freq, idx) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.03);

    gain.gain.setValueAtTime(0.12, now + idx * 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + idx * 0.03);

    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(now + idx * 0.03);
    osc.stop(now + 0.38 + idx * 0.03);
  });
}

/**
 * Bedroom / Quantum Door pneumatic unlock and slide
 */
export function playDoorOpen() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  // Mechanical unlatch click
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.09);

  // Hydraulic slide tone
  const slideOsc = ac.createOscillator();
  const slideGain = ac.createGain();
  slideOsc.type = 'sine';
  slideOsc.frequency.setValueAtTime(190, now + 0.05);
  slideOsc.frequency.linearRampToValueAtTime(320, now + 0.35);

  slideGain.gain.setValueAtTime(0.001, now);
  slideGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
  slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  slideOsc.connect(slideGain);
  slideGain.connect(masterGain);
  slideOsc.start(now + 0.05);
  slideOsc.stop(now + 0.42);
}

/**
 * Bedroom / Quantum Door heavy lock slam
 */
export function playDoorClose() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.22);
}

/**
 * Urgent decoherence countdown radar ping
 */
export function playDecoherenceTick(remaining: number) {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';

  // Pitch rises as time runs out
  const baseFreq = remaining < 2.0 ? 1174.66 : 880;
  osc.frequency.setValueAtTime(baseFreq, now);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Decoherence collapse implosion
 */
export function playDecoherenceCollapse() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.32);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + 0.32);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.36);
}

/**
 * Convergence Victory Fanfare Chimes
 */
export function playVictory() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  const chord = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25];
  chord.forEach((freq, idx) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.09);

    gain.gain.setValueAtTime(0.16, now + idx * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7 + idx * 0.09);

    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(now + idx * 0.09);
    osc.stop(now + 0.75 + idx * 0.09);
  });
}

/**
 * Laplace companion affectionate chirp
 */
export function playPetChirp() {
  const ac = getAudioContext();
  if (!ac || !masterGain) return;
  const now = ac.currentTime;

  [580, 740].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.07);

    gain.gain.setValueAtTime(0.1, now + i * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06 + i * 0.07);

    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(now + i * 0.07);
    osc.stop(now + 0.08 + i * 0.07);
  });
}

/**
 * Screen shake impulse for heavy events
 */
export function triggerScreenShake(intensity = 4, durationMs = 140) {
  const target = document.querySelector('.iso-container') as HTMLElement;
  if (!target) return;

  const startTime = performance.now();
  function shake(now: number) {
    const elapsed = now - startTime;
    if (elapsed < durationMs) {
      const progress = 1 - (elapsed / durationMs);
      const currentIntensity = intensity * progress;
      const offsetX = (Math.random() * 2 - 1) * currentIntensity;
      const offsetY = (Math.random() * 2 - 1) * currentIntensity;
      target.style.transform = `translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px)`;
      requestAnimationFrame(shake);
    } else {
      target.style.transform = '';
    }
  }
  requestAnimationFrame(shake);
}

/**
 * Tactical floating combat/puzzle popup feedback
 */
export function showFloatingText(text: string, x: number, y: number, color = '#f59e0b') {
  const container = document.querySelector('.iso-container') as HTMLElement;
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'floating-feedback-text';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  container.appendChild(el);

  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 950);
}


/**
 * Ambient Noir Detective Apartment Room Drone & Vinyl Texture
 */
let ambientStarted = false;
let ambientGain: GainNode | null = null;

export function ensureAmbientSound() {
  const ac = getAudioContext();
  if (!ac || ambientStarted) return;
  ambientStarted = true;

  try {
    ambientGain = ac.createGain();
    ambientGain.gain.setValueAtTime(0.001, ac.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.045, ac.currentTime + 2.5);
    ambientGain.connect(ac.destination);

    // 1. Low 44Hz electric apartment hum
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(44.0, ac.currentTime);
    osc2.frequency.setValueAtTime(45.2, ac.currentTime);

    const droneGain = ac.createGain();
    droneGain.gain.setValueAtTime(0.22, ac.currentTime);
    osc1.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(ambientGain);

    osc1.start();
    osc2.start();

    // 2. Vinyl Noir Warmth / gentle room rain air
    const bufferSize = Math.floor(ac.sampleRate * 2.5);
    const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      const crackle = Math.random() < 0.0004 ? (Math.random() * 0.35 - 0.17) : 0;
      output[i] = lastOut * 0.12 + crackle;
    }

    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(750, ac.currentTime);
    noiseFilter.Q.setValueAtTime(0.8, ac.currentTime);

    noise.connect(noiseFilter);
    noiseFilter.connect(ambientGain);
    noise.start();
  } catch (e) {
    console.warn('Ambient audio could not be initialized:', e);
  }
}
