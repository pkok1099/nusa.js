// ============================================================
// spatial-audio.js — PositionalAudio, BGM, ambient sound system
// Phase 5: Directional enemy sounds + stage-themed BGM
// Uses Three.js AudioListener + PositionalAudio for 3D audio
// Web Audio API for procedural BGM (gamelan, forest, etc.)
// ============================================================

import * as THREE from 'three';
import { getCamera } from './renderer.js';

// ============================================================
// AUDIO CONTEXT & LISTENER
// ============================================================

let audioCtx = null;
let listener = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let ambientGain = null;

// State
let currentBGM = null;
let currentBGMNodes = [];
let currentAmbient = null;
let currentAmbientNodes = [];
let isInitialized = false;
let currentStageId = -1;

// ============================================================
// BGM PRESETS — Procedural music per stage
// Each stage has unique musical character reflecting Indonesian culture
// ============================================================

const BGM_PRESETS = {
  // Candi Borobudur — Gamelan-inspired pentatonic, meditative
  0: {
    name: 'Gamelan Borobudur',
    baseFreq: 220,    // A3
    scale: [1, 1.125, 1.25, 1.5, 1.667], // Slendro pentatonic
    tempo: 0.002,     // Slow, meditative
    voices: 3,
    waveType: 'triangle',
    filterFreq: 800,
    volume: 0.06,
    drone: true,
    droneFreq: 110,
  },

  // Hutan Borneo — Forest ambience, wind through canopy
  1: {
    name: 'Rimba Borneo',
    baseFreq: 196,    // G3
    scale: [1, 1.2, 1.333, 1.5, 1.8],
    tempo: 0.0015,
    voices: 2,
    waveType: 'sine',
    filterFreq: 600,
    volume: 0.04,
    drone: true,
    droneFreq: 98,
  },

  // Gunung Bromo — Deep volcanic rumble, aggressive
  2: {
    name: 'Neraka Bromo',
    baseFreq: 146.83, // D3
    scale: [1, 1.067, 1.25, 1.333, 1.5], // Phrygian-ish
    tempo: 0.003,
    voices: 4,
    waveType: 'sawtooth',
    filterFreq: 400,
    volume: 0.05,
    drone: true,
    droneFreq: 73.42,
  },

  // Laut Bali — Flowing, liquid, ethereal
  3: {
    name: 'Kedalaman Bali',
    baseFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.5, 1.875], // Pelog-inspired
    tempo: 0.001,
    voices: 2,
    waveType: 'sine',
    filterFreq: 1200,
    volume: 0.04,
    drone: true,
    droneFreq: 130.81,
  },

  // Candi Prambanan — Grand, divine, triumphant
  4: {
    name: 'Prambanan Agung',
    baseFreq: 261.63, // C4
    scale: [1, 1.125, 1.25, 1.5, 1.667, 1.875], // Extended scale
    tempo: 0.0025,
    voices: 5,
    waveType: 'triangle',
    filterFreq: 1000,
    volume: 0.06,
    drone: true,
    droneFreq: 130.81,
  },
};

// ============================================================
// AMBIENT SOUND PRESETS — Continuous environmental sounds
// ============================================================

const AMBIENT_PRESETS = {
  0: { // Borobudur — wind in stone corridors, distant echoes
    type: 'wind',
    filterFreq: 300,
    volume: 0.03,
    lfoSpeed: 0.0005,
    lfoDepth: 200,
  },
  1: { // Hutan — crickets, rustling leaves, water drip
    type: 'forest',
    filterFreq: 2500,
    volume: 0.04,
    lfoSpeed: 0.001,
    lfoDepth: 500,
  },
  2: { // Bromo — rumbling volcano, crackling fire
    type: 'volcanic',
    filterFreq: 200,
    volume: 0.05,
    lfoSpeed: 0.0003,
    lfoDepth: 100,
  },
  3: { // Laut — underwater bubbles, whale-like sounds
    type: 'underwater',
    filterFreq: 800,
    volume: 0.03,
    lfoSpeed: 0.0008,
    lfoDepth: 400,
  },
  4: { // Prambanan — echoing halls, distant chanting
    type: 'temple',
    filterFreq: 500,
    volume: 0.04,
    lfoSpeed: 0.0004,
    lfoDepth: 250,
  },
};

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize the spatial audio system.
 * Must be called AFTER Three.js renderer is set up.
 */
export function initSpatialAudio() {
  if (isInitialized) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain node
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);

    // Sub-channels
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.5;
    bgmGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);

    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0.4;
    ambientGain.connect(masterGain);

    // Three.js AudioListener for positional audio
    const cam = getCamera();
    if (cam) {
      listener = new THREE.AudioListener();
      cam.add(listener);
    }

    isInitialized = true;
    console.log('[SpatialAudio] Initialized — PositionalAudio + BGM system ready');
  } catch (err) {
    console.warn('[SpatialAudio] Failed to initialize:', err);
  }
}

/**
 * Resume audio context (required after user interaction).
 */
export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// ============================================================
// BGM — Background Music per Stage
// ============================================================

/**
 * Start BGM for a specific stage.
 * Uses procedural Web Audio synthesis to create gamelan-inspired music.
 * @param {number} stageId — Stage ID (0–4)
 */
export function startStageBGM(stageId) {
  if (!isInitialized || !audioCtx) return;

  // Stop existing BGM
  stopBGM();

  const preset = BGM_PRESETS[stageId];
  if (!preset) return;

  currentStageId = stageId;
  currentBGMNodes = [];

  const t = audioCtx.currentTime;

  // ---- Drone (sustained bass note) ----
  if (preset.drone) {
    const droneOsc = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    const droneFilter = audioCtx.createBiquadFilter();

    droneOsc.type = 'sine';
    droneOsc.frequency.value = preset.droneFreq;
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = preset.filterFreq * 0.5;
    droneGain.gain.setValueAtTime(0, t);
    droneGain.gain.linearRampToValueAtTime(preset.volume * 0.7, t + 3); // Fade in

    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(bgmGain);
    droneOsc.start(t);

    currentBGMNodes.push(droneOsc, droneGain, droneFilter);
  }

  // ---- Melodic voices (pentatonic arpeggiation) ----
  for (let v = 0; v < preset.voices; v++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = preset.waveType;
    filter.type = 'lowpass';
    filter.frequency.value = preset.filterFreq;
    filter.Q.value = 2;

    // Start silent
    gain.gain.setValueAtTime(0, t);

    // Schedule pentatonic notes in a loop pattern
    schedulePentatonicLoop(osc, gain, filter, preset, v, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain);
    osc.start(t);

    currentBGMNodes.push(osc, gain, filter);
  }

  // ---- Sub-bass rumble (for volcanic/heavy stages) ----
  if (stageId === 2) {
    const rumbleOsc = audioCtx.createOscillator();
    const rumbleGain = audioCtx.createGain();
    const rumbleFilter = audioCtx.createBiquadFilter();

    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.value = 40;
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 80;
    rumbleGain.gain.setValueAtTime(0, t);
    rumbleGain.gain.linearRampToValueAtTime(preset.volume * 0.3, t + 5);

    rumbleOsc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(bgmGain);
    rumbleOsc.start(t);

    currentBGMNodes.push(rumbleOsc, rumbleGain, rumbleFilter);
  }

  currentBGM = preset.name;
  console.log(`[SpatialAudio] BGM started: ${preset.name}`);
}

/**
 * Schedule a pentatonic arpeggiation loop for a voice.
 * This creates an infinitely repeating pattern using the stage's scale.
 */
function schedulePentatonicLoop(osc, gain, filter, preset, voiceIndex, startTime) {
  if (!audioCtx || !currentBGMNodes.length) return;

  const scale = preset.scale;
  const noteDuration = 1 / preset.tempo / 60; // Seconds per note
  const beatOffset = voiceIndex * noteDuration * 0.5; // Stagger voices

  // Schedule 32 notes ahead (then reschedule)
  const notesAhead = 32;
  let t = startTime + beatOffset;

  for (let i = 0; i < notesAhead; i++) {
    const scaleIndex = Math.floor(Math.random() * scale.length);
    const octaveShift = Math.random() < 0.3 ? 2 : 1; // Occasional octave up
    const freq = preset.baseFreq * scale[scaleIndex] * octaveShift;

    const noteStart = t + i * noteDuration;
    const noteEnd = noteStart + noteDuration * 0.8;

    // Only schedule if in the future
    if (noteStart > audioCtx.currentTime) {
      osc.frequency.setValueAtTime(freq, noteStart);
      gain.gain.setValueAtTime(preset.volume * (0.5 + Math.random() * 0.5), noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      // Gentle filter sweep
      filter.frequency.setValueAtTime(
        preset.filterFreq * (0.7 + Math.random() * 0.6),
        noteStart
      );
    }
  }

  // Reschedule after notes finish
  const loopDuration = notesAhead * noteDuration * 1000;
  currentBGM = setTimeout(() => {
    schedulePentatonicLoop(osc, gain, filter, preset, voiceIndex, audioCtx.currentTime);
  }, loopDuration * 0.8);
}

/**
 * Stop all BGM.
 */
export function stopBGM() {
  if (!audioCtx) return;

  const t = audioCtx.currentTime;

  // Fade out
  currentBGMNodes.forEach(node => {
    if (node instanceof GainNode) {
      node.gain.linearRampToValueAtTime(0, t + 1);
    }
  });

  // Stop oscillators after fade
  setTimeout(() => {
    currentBGMNodes.forEach(node => {
      if (node instanceof OscillatorNode) {
        try { node.stop(); } catch (e) { /* already stopped */ }
      }
    });
    currentBGMNodes = [];
  }, 1200);

  if (currentBGM && typeof currentBGM === 'number') {
    clearTimeout(currentBGM);
  }
  currentBGM = null;
}

// ============================================================
// AMBIENT SOUNDS — Continuous environmental audio
// ============================================================

/**
 * Start ambient sound for a stage.
 * @param {number} stageId
 */
export function startStageAmbient(stageId) {
  if (!isInitialized || !audioCtx) return;

  stopAmbient();

  const preset = AMBIENT_PRESETS[stageId];
  if (!preset) return;

  currentAmbientNodes = [];
  const t = audioCtx.currentTime;

  // Noise source (white noise filtered for environment)
  const bufferSize = audioCtx.sampleRate * 4; // 4 seconds of noise
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = preset.filterFreq;

  // LFO for filter modulation (wind gusts, water movement)
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = preset.lfoSpeed * 1000;
  lfoGain.gain.value = preset.lfoDepth;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(preset.volume, t + 3); // Fade in

  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ambientGain);

  noiseSource.start(t);
  lfo.start(t);

  currentAmbientNodes.push(noiseSource, filter, gain, lfo, lfoGain);
  currentAmbient = preset.type;

  // Stage-specific additional sounds
  if (stageId === 2) {
    // Volcanic crackling — periodic noise bursts
    scheduleCrackle();
  }

  console.log(`[SpatialAudio] Ambient started: ${preset.type}`);
}

/**
 * Schedule volcanic crackle sounds (periodic noise bursts).
 */
function scheduleCrackle() {
  if (!audioCtx || currentStageId !== 2) return;

  const t = audioCtx.currentTime;
  const burstDuration = 0.05 + Math.random() * 0.1;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.value = 80 + Math.random() * 120;
  gain.gain.setValueAtTime(0.02, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + burstDuration);

  osc.connect(gain);
  gain.connect(ambientGain);
  osc.start(t);
  osc.stop(t + burstDuration + 0.01);

  // Schedule next crackle
  const nextDelay = 500 + Math.random() * 3000;
  setTimeout(scheduleCrackle, nextDelay);
}

/**
 * Stop all ambient sounds.
 */
export function stopAmbient() {
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  currentAmbientNodes.forEach(node => {
    if (node instanceof GainNode) {
      node.gain.linearRampToValueAtTime(0, t + 1);
    }
  });

  setTimeout(() => {
    currentAmbientNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
      } catch (e) { /* already stopped */ }
    });
    currentAmbientNodes = [];
  }, 1200);

  currentAmbient = null;
}

// ============================================================
// POSITIONAL AUDIO — 3D positioned sound sources
// ============================================================

// Cache of active positional audio objects
const positionalAudios = new Map(); // key → THREE.PositionalAudio

/**
 * Play a positional sound at a specific world location.
 * The sound is heard directionally based on camera position.
 * @param {string} key — Unique key for this sound
 * @param {string} type — Sound type (maps to audio.js sound types)
 * @param {number} x — Game X position
 * @param {number} y — Game Y position
 * @param {number} volume — Volume 0–1
 */
export function playPositionalSound(key, type, x, y, volume = 0.5) {
  if (!isInitialized || !audioCtx || !listener) return;

  const t = audioCtx.currentTime;

  // Create a temporary positional sound using Web Audio panning
  // (PositionalAudio requires a scene object, so we use PannerNode directly)
  const panner = audioCtx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 100;
  panner.maxDistance = 1500;
  panner.rolloffFactor = 1.5;

  // Convert game coords to 3D audio coords
  const threeY = -y; // Flip Y for Three.js
  panner.positionX.setValueAtTime(x, t);
  panner.positionY.setValueAtTime(threeY, t);
  panner.positionZ.setValueAtTime(0, t);

  // Create the sound
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  configureSoundType(osc, gain, type, t);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(sfxGain);

  const duration = getSoundDuration(type);
  osc.start(t);
  osc.stop(t + duration);

  // Auto-cleanup
  setTimeout(() => {
    try { osc.disconnect(); gain.disconnect(); panner.disconnect(); } catch (e) {}
  }, duration * 1000 + 100);
}

/**
 * Configure oscillator and gain for a specific sound type.
 */
function configureSoundType(osc, gain, type, t) {
  switch (type) {
    case 'hit':
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      break;
    case 'attack':
      osc.type = 'square'; osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      break;
    case 'heavyAttack':
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      break;
    case 'boss':
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      break;
    case 'enemyAttack':
      osc.type = 'square'; osc.frequency.setValueAtTime(250, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      break;
    case 'enemyDeath':
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      break;
    default:
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  }
}

/**
 * Get sound duration in seconds for cleanup scheduling.
 */
function getSoundDuration(type) {
  switch (type) {
    case 'hit': return 0.15;
    case 'attack': return 0.1;
    case 'heavyAttack': return 0.25;
    case 'boss': return 0.6;
    case 'enemyAttack': return 0.2;
    case 'enemyDeath': return 0.5;
    default: return 0.1;
  }
}

// ============================================================
// VOLUME CONTROL
// ============================================================

/**
 * Set master volume.
 * @param {number} vol — 0 to 1
 */
export function setMasterVolume(vol) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, vol));
}

/**
 * Set BGM volume.
 * @param {number} vol — 0 to 1
 */
export function setBGMVolume(vol) {
  if (bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, vol));
}

/**
 * Set SFX volume.
 * @param {number} vol — 0 to 1
 */
export function setSFXVolume(vol) {
  if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, vol));
}

/**
 * Set ambient volume.
 * @param {number} vol — 0 to 1
 */
export function setAmbientVolume(vol) {
  if (ambientGain) ambientGain.gain.value = Math.max(0, Math.min(1, vol));
}

// ============================================================
// STAGE TRANSITION
// ============================================================

/**
 * Transition audio to a new stage.
 * Fades out old audio and starts new BGM + ambient.
 * @param {number} stageId — New stage ID
 */
export function transitionToStage(stageId) {
  if (stageId === currentStageId) return;

  // Fade out existing audio
  if (bgmGain) {
    const t = audioCtx?.currentTime || 0;
    bgmGain.gain.linearRampToValueAtTime(0, t + 2);
    ambientGain.gain.linearRampToValueAtTime(0, t + 2);
  }

  // Start new audio after fade
  setTimeout(() => {
    stopBGM();
    stopAmbient();

    if (bgmGain) bgmGain.gain.value = 0.5;
    if (ambientGain) ambientGain.gain.value = 0.4;

    startStageBGM(stageId);
    startStageAmbient(stageId);
  }, 2500);

  currentStageId = stageId;
}

/**
 * Stop all audio (for menu, game over, etc.)
 */
export function stopAllAudio() {
  stopBGM();
  stopAmbient();
  currentStageId = -1;
}

/**
 * Check if spatial audio is initialized.
 */
export function isSpatialAudioReady() {
  return isInitialized;
}
