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
 * =========================================================
 * NOIR DETECTIVE PROCEDURAL BACKGROUND MUSIC ENGINE
 * =========================================================
 * Moody 60 BPM ambient jazz / Disco Elysium style soundtrack:
 * - Warm Rhodes / electric piano chord voicing
 * - Upright sub-bass walks
 * - Melancholic lead motif with analog delay
 * - Atmospheric midnight vinyl & rain texture
 * - Dynamic filtering responsive to Ground |0⟩ vs Excited |1⟩ reality
 */

let musicPlaying = false;
let musicSchedulerTimer: number | null = null;
let musicMasterGain: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let vinylSource: AudioBufferSourceNode | null = null;

// Sequencer state
const BEAT_DURATION = 1.0; // 60 BPM -> 1 beat = 1.0s, 1 bar = 4.0s
let nextBarTime = 0;
let currentBarIndex = 0;
let currentMusicDim = 0;

// 4-Bar Noir Progression: Dm9 -> Bbmaj7(#11) -> Gm9 -> A7(b9)
const NOIR_CHORDS = [
  {
    name: 'Dm9',
    bass: 73.42, // D2
    sub: 36.71,  // D1
    notes: [174.61, 220.00, 261.63, 329.63] // F3, A3, C4, E4
  },
  {
    name: 'Bbmaj7(#11)',
    bass: 58.27, // Bb1
    sub: 29.14,  // Bb0
    notes: [174.61, 220.00, 293.66, 329.63] // F3, A3, D4, E4
  },
  {
    name: 'Gm9',
    bass: 49.00, // G1
    sub: 24.50,  // G0
    notes: [174.61, 233.08, 293.66, 440.00] // F3, Bb3, D4, A4
  },
  {
    name: 'A7(b9)',
    bass: 55.00, // A1
    sub: 27.50,  // A0
    notes: [164.81, 196.00, 233.08, 277.18] // E3, G3, Bb3, C#4
  }
];

// Lead melody notes corresponding to the 4 bars
const LEAD_MOTIFS: (number[] | null)[] = [
  [329.63, 293.66],         // E4 -> D4
  [440.00, 329.63],         // A4 -> E4
  [392.00, 349.23, 293.66], // G4 -> F4 -> D4
  [277.18, 293.66]          // C#4 -> D4
];

function scheduleRhodesChord(ac: AudioContext, chord: typeof NOIR_CHORDS[0], time: number) {
  const targetFilter = musicFilter;
  if (!targetFilter) return;

  chord.notes.forEach((freq, idx) => {
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const noteGain = ac.createGain();
    const noteFilter = ac.createBiquadFilter();

    // Warm Rhodes bell-like timbre
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.002, time); // slight chorus detune

    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(950, time);
    noteFilter.frequency.exponentialRampToValueAtTime(320, time + 3.4);

    // Stagger note velocities slightly for human pianist feel
    const strumOffset = idx * 0.035;
    const startTime = time + strumOffset;

    noteGain.gain.setValueAtTime(0.001, startTime);
    noteGain.gain.linearRampToValueAtTime(0.12, startTime + 0.12);
    noteGain.gain.exponentialRampToValueAtTime(0.0005, startTime + 3.7);

    osc1.connect(noteFilter);
    osc2.connect(noteFilter);
    noteFilter.connect(noteGain);
    noteGain.connect(targetFilter);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + 3.8);
    osc2.stop(startTime + 3.8);
  });
}

function scheduleNoirBass(ac: AudioContext, chord: typeof NOIR_CHORDS[0], time: number) {
  const targetFilter = musicFilter;
  if (!targetFilter) return;

  // Plucked upright bass on Beat 1 and Beat 3
  [0, 2.0].forEach((offset, idx) => {
    const beatTime = time + offset;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();

    osc.type = 'triangle';
    const noteFreq = idx === 0 ? chord.bass : (chord.bass * (idx === 1 ? 1.5 : 1.0)); // root then fifth
    osc.frequency.setValueAtTime(noteFreq, beatTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, beatTime);
    filter.frequency.exponentialRampToValueAtTime(80, beatTime + 1.6);

    gain.gain.setValueAtTime(0.001, beatTime);
    gain.gain.linearRampToValueAtTime(0.24, beatTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(targetFilter);

    osc.start(beatTime);
    osc.stop(beatTime + 1.85);
  });
}

function scheduleLeadMotif(ac: AudioContext, motif: number[] | null, time: number) {
  const targetFilter = musicFilter;
  if (!motif || !targetFilter) return;

  motif.forEach((freq, idx) => {
    const noteTime = time + 1.2 + idx * 0.9;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();

    // Muted trumpet / analog noir lead tone
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, noteTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.8, noteTime);
    filter.Q.setValueAtTime(2.2, noteTime);

    gain.gain.setValueAtTime(0.001, noteTime);
    gain.gain.linearRampToValueAtTime(0.065, noteTime + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(targetFilter);

    osc.start(noteTime);
    osc.stop(noteTime + 1.45);
  });
}

function musicScheduler() {
  const ac = getAudioContext();
  if (!ac || !musicPlaying) return;

  // Lookahead window: schedule 0.5s into the future
  while (nextBarTime < ac.currentTime + 0.5) {
    const chord = NOIR_CHORDS[currentBarIndex % NOIR_CHORDS.length];
    const motif = LEAD_MOTIFS[currentBarIndex % LEAD_MOTIFS.length];

    scheduleRhodesChord(ac, chord, nextBarTime);
    scheduleNoirBass(ac, chord, nextBarTime);
    if (Math.random() < 0.85) {
      scheduleLeadMotif(ac, motif, nextBarTime);
    }

    currentBarIndex++;
    nextBarTime += BEAT_DURATION * 4; // 4 beats per bar
  }
}

/**
 * Start the atmospheric background music
 */
export function startBackgroundMusic() {
  const ac = getAudioContext();
  if (!ac) return;

  if (ac.state === 'suspended') {
    ac.resume();
  }

  if (musicPlaying) return;
  musicPlaying = true;

  try {
    // 1. Music Master Bus
    musicMasterGain = ac.createGain();
    musicMasterGain.gain.setValueAtTime(0.001, ac.currentTime);
    musicMasterGain.gain.linearRampToValueAtTime(0.48, ac.currentTime + 1.5);
    musicMasterGain.connect(ac.destination);

    // 2. Dynamic Reality Filter (|0⟩ warm lowpass vs |1⟩ celestial open high shimmer)
    musicFilter = ac.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.setValueAtTime(currentMusicDim === 1 ? 3200 : 1500, ac.currentTime);
    musicFilter.Q.setValueAtTime(1.0, ac.currentTime);
    musicFilter.connect(musicMasterGain);

    // 3. Gentle Vinyl & Midnight Rain Atmosphere
    const bufferSize = Math.floor(ac.sampleRate * 2.0);
    const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      const pop = Math.random() < 0.0006 ? (Math.random() * 0.3 - 0.15) : 0;
      output[i] = last * 0.14 + pop;
    }

    vinylSource = ac.createBufferSource();
    vinylSource.buffer = noiseBuffer;
    vinylSource.loop = true;

    const vinylFilter = ac.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.setValueAtTime(680, ac.currentTime);
    vinylFilter.Q.setValueAtTime(0.9, ac.currentTime);

    const vinylGain = ac.createGain();
    vinylGain.gain.setValueAtTime(0.16, ac.currentTime);

    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(musicMasterGain);
    vinylSource.start();

    // 4. Start scheduler loop
    nextBarTime = ac.currentTime + 0.1;
    currentBarIndex = 0;
    musicScheduler();

    if (musicSchedulerTimer) clearInterval(musicSchedulerTimer);
    musicSchedulerTimer = window.setInterval(musicScheduler, 120);

    console.log('[Audio] Noir detective procedural soundtrack started.');
  } catch (err) {
    console.warn('[Audio] Could not start background music:', err);
  }
}

/**
 * Stop background music
 */
export function stopBackgroundMusic() {
  musicPlaying = false;
  if (musicSchedulerTimer) {
    clearInterval(musicSchedulerTimer);
    musicSchedulerTimer = null;
  }
  const ac = getAudioContext();
  if (ac && musicMasterGain) {
    musicMasterGain.gain.linearRampToValueAtTime(0.001, ac.currentTime + 0.5);
    setTimeout(() => {
      if (vinylSource) {
        try { vinylSource.stop(); } catch (_) {}
        vinylSource = null;
      }
    }, 550);
  }
}

/**
 * Toggle background music on/off
 */
export function toggleBackgroundMusic(): boolean {
  if (musicPlaying) {
    stopBackgroundMusic();
    return false;
  } else {
    startBackgroundMusic();
    return true;
  }
}

/**
 * Check if music is currently playing
 */
export function isMusicPlaying(): boolean {
  return musicPlaying;
}

/**
 * Update the background music tone based on quantum dimension
 */
export function setMusicDimension(dim: number) {
  currentMusicDim = dim;
  const ac = getAudioContext();
  if (ac && musicFilter) {
    const targetFreq = dim === 1 ? 3400 : 1500;
    musicFilter.frequency.setTargetAtTime(targetFreq, ac.currentTime, 0.35);
  }
}

/**
 * Legacy compatibility alias
 */
export function ensureAmbientSound() {
  startBackgroundMusic();
}
