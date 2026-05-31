// ============================================================
// post-processing.js — Bloom, vignette, color grading
// Phase 5: Post-processing pipeline for atmosphere
// Uses Three.js EffectComposer with custom passes
// ============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { getRenderer, getCamera, getScene } from './renderer.js';
import { GAME_W, GAME_H } from './config.js';

// ============================================================
// VIGNETTE SHADER — Darkens screen edges, intensifies at low HP
// ============================================================

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignetteStrength: { value: 0.4 },   // 0 = no vignette, 1 = heavy
    uVignetteRadius: { value: 0.5 },     // 0 = center only, 1 = full screen
    uHPLowTint: { value: 0.0 },          // 0 = normal, 1 = full red tint
    uTime: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignetteStrength;
    uniform float uVignetteRadius;
    uniform float uHPLowTint;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Vignette — darkens edges
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(uVignetteRadius, uVignetteRadius - 0.3, dist);
      color.rgb *= mix(1.0, vignette, uVignetteStrength);

      // Low HP red tint — pulsing red overlay
      if (uHPLowTint > 0.0) {
        float pulse = sin(uTime * 3.0) * 0.3 + 0.7;
        float tintStrength = uHPLowTint * pulse * 0.3;
        color.r = mix(color.r, color.r + 0.3, tintStrength);
        color.g = mix(color.g, color.g * 0.7, tintStrength);
        color.b = mix(color.b, color.b * 0.6, tintStrength);
      }

      gl_FragColor = color;
    }
  `,
};

// ============================================================
// COLOR GRADING SHADER — Per-stage color palette adjustment
// ============================================================

const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1.0 },      // 0 = grayscale, 1 = normal, 2 = vivid
    uContrast: { value: 1.0 },        // 0.5 = flat, 1 = normal, 1.5 = harsh
    uBrightness: { value: 0.0 },      // -0.5 to 0.5
    uTint: { value: new THREE.Color(0, 0, 0) }, // Color tint overlay
    uTintStrength: { value: 0.0 },     // 0 = no tint, 1 = full tint
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uBrightness;
    uniform vec3 uTint;
    uniform float uTintStrength;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Brightness
      color.rgb += uBrightness;

      // Contrast
      color.rgb = (color.rgb - 0.5) * uContrast + 0.5;

      // Saturation (luminance-based)
      float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = mix(vec3(luminance), color.rgb, uSaturation);

      // Tint overlay
      color.rgb = mix(color.rgb, uTint * color.rgb, uTintStrength);

      gl_FragColor = clamp(color, 0.0, 1.0);
    }
  `,
};

// ============================================================
// COLOR GRADING PRESETS PER STAGE
// ============================================================

const COLOR_GRADE_PRESETS = {
  0: { // Borobudur — warm, slightly desaturated, ancient feel
    saturation: 0.85,
    contrast: 1.1,
    brightness: -0.02,
    tint: new THREE.Color(0.15, 0.08, 0.0), // Warm brown tint
    tintStrength: 0.08,
  },
  1: { // Hutan Borneo — vivid greens, natural contrast
    saturation: 1.15,
    contrast: 1.0,
    brightness: -0.03,
    tint: new THREE.Color(0.0, 0.08, 0.02), // Green tint
    tintStrength: 0.05,
  },
  2: { // Gunung Bromo — hot, aggressive, high contrast
    saturation: 1.1,
    contrast: 1.2,
    brightness: 0.02,
    tint: new THREE.Color(0.15, 0.03, 0.0), // Red/orange tint
    tintStrength: 0.1,
  },
  3: { // Laut Bali — cool, blue-shifted, ethereal
    saturation: 0.9,
    contrast: 0.95,
    brightness: -0.05,
    tint: new THREE.Color(0.0, 0.05, 0.15), // Blue tint
    tintStrength: 0.08,
  },
  4: { // Prambanan — golden, divine, warm highlights
    saturation: 1.05,
    contrast: 1.15,
    brightness: 0.0,
    tint: new THREE.Color(0.12, 0.08, 0.0), // Golden tint
    tintStrength: 0.06,
  },
};

// ============================================================
// COMPOSER STATE
// ============================================================

let composer = null;
let bloomPass = null;
let vignettePass = null;
let colorGradePass = null;
let isInitialized = false;
let currentStageId = -1;

// Real-time tunable values
let hpRatio = 1.0;        // 1.0 = full HP, 0.0 = dead
let artifactGlow = 0.0;   // 0 = no glow, 1 = full bloom
let gameTimeSeconds = 0;

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize the post-processing pipeline.
 * Must be called AFTER renderer is set up.
 */
export function initPostProcessing() {
  const renderer = getRenderer();
  const scene = getScene();
  const camera = getCamera();

  if (!renderer || !scene || !camera) {
    console.warn('[PostProcess] Cannot init — missing renderer/scene/camera');
    return;
  }

  try {
    // Create EffectComposer
    composer = new EffectComposer(renderer);

    // Render pass — renders the scene
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom pass — glow effect for artifacts, embers, etc.
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(GAME_W, GAME_H),
      0.3,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    composer.addPass(bloomPass);

    // Vignette pass — darkened edges, intensifies at low HP
    vignettePass = new ShaderPass(VignetteShader);
    composer.addPass(vignettePass);

    // Color grading pass — per-stage color palette
    colorGradePass = new ShaderPass(ColorGradingShader);
    composer.addPass(colorGradePass);

    isInitialized = true;
    console.log('[PostProcess] Initialized — Bloom + Vignette + Color Grading');
  } catch (err) {
    console.warn('[PostProcess] Failed to init, falling back to direct render:', err);
    isInitialized = false;
  }
}

// ============================================================
// STAGE APPLICATION
// ============================================================

/**
 * Apply post-processing for a specific stage.
 * @param {number} stageId
 */
export function applyStagePostProcessing(stageId) {
  if (!isInitialized) return;

  const preset = COLOR_GRADE_PRESETS[stageId];
  if (!preset || !colorGradePass) return;

  colorGradePass.uniforms.uSaturation.value = preset.saturation;
  colorGradePass.uniforms.uContrast.value = preset.contrast;
  colorGradePass.uniforms.uBrightness.value = preset.brightness;
  colorGradePass.uniforms.uTint.value.copy(preset.tint);
  colorGradePass.uniforms.uTintStrength.value = preset.tintStrength;

  // Stage-specific bloom settings
  switch (stageId) {
    case 0: // Borobudur — subtle golden bloom
      bloomPass.strength = 0.3;
      bloomPass.threshold = 0.85;
      bloomPass.radius = 0.4;
      break;
    case 1: // Hutan — minimal bloom, natural
      bloomPass.strength = 0.2;
      bloomPass.threshold = 0.9;
      bloomPass.radius = 0.3;
      break;
    case 2: // Bromo — heavy bloom for fire/lava
      bloomPass.strength = 0.6;
      bloomPass.threshold = 0.7;
      bloomPass.radius = 0.6;
      break;
    case 3: // Laut — ethereal blue bloom
      bloomPass.strength = 0.35;
      bloomPass.threshold = 0.8;
      bloomPass.radius = 0.5;
      break;
    case 4: // Prambanan — divine golden bloom
      bloomPass.strength = 0.5;
      bloomPass.threshold = 0.75;
      bloomPass.radius = 0.5;
      break;
  }

  // Base vignette
  vignettePass.uniforms.uVignetteStrength.value = 0.3;
  vignettePass.uniforms.uVignetteRadius.value = 0.5;

  currentStageId = stageId;
  console.log(`[PostProcess] Applied color grading for stage ${stageId}`);
}

// ============================================================
// FRAME UPDATE
// ============================================================

/**
 * Update post-processing uniforms per frame.
 * Called from the render loop.
 * @param {number} playerHPRatio — Player HP ratio (0–1)
 * @param {boolean} nearArtifact — Whether player is near an artifact
 * @param {number} gameTime — Current game time (frame counter)
 */
export function updatePostProcessing(playerHPRatio, nearArtifact, gameTime) {
  if (!isInitialized) return;

  hpRatio = playerHPRatio;
  gameTimeSeconds = gameTime / 60;

  // ---- Vignette — intensify when HP is low ----
  if (vignettePass) {
    // Vignette gets stronger as HP drops below 30%
    const lowHPThreshold = 0.3;
    const hpIntensity = hpRatio < lowHPThreshold
      ? (1 - hpRatio / lowHPThreshold) * 0.6  // Up to 0.6 extra vignette
      : 0;

    vignettePass.uniforms.uVignetteStrength.value = 0.3 + hpIntensity;
    vignettePass.uniforms.uVignetteRadius.value = 0.5 - hpIntensity * 0.15;

    // Red tint when HP is very low
    const redTint = hpRatio < 0.2 ? (1 - hpRatio / 0.2) : 0;
    vignettePass.uniforms.uHPLowTint.value = redTint;
    vignettePass.uniforms.uTime.value = gameTimeSeconds;
  }

  // ---- Bloom — increase when near artifacts ----
  if (bloomPass) {
    const baseStrength = bloomPass.strength;
    const targetStrength = nearArtifact ? baseStrength + 0.3 : baseStrength;
    // Smooth lerp
    bloomPass.strength += (targetStrength - bloomPass.strength) * 0.05;
  }
}

/**
 * Render the post-processed frame.
 * Replaces renderer.render() when post-processing is active.
 */
export function renderWithPostProcessing() {
  if (!isInitialized || !composer) {
    // Fallback to direct render
    const renderer = getRenderer();
    const scene = getScene();
    const camera = getCamera();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    return;
  }

  composer.render();
}

/**
 * Resize the post-processing pipeline.
 */
export function resizePostProcessing() {
  if (!isInitialized || !composer) return;
  composer.setSize(GAME_W, GAME_H);
}

/**
 * Check if post-processing is active.
 */
export function isPostProcessingActive() {
  return isInitialized;
}

/**
 * Temporarily boost bloom (for parry, visceral attack, etc.)
 * @param {number} strength — Bloom strength boost
 * @param {number} duration — Duration in frames
 */
export function flashBloom(strength, duration) {
  if (!bloomPass) return;
  const originalStrength = bloomPass.strength;
  bloomPass.strength = strength;
  // Gradual return
  const decay = () => {
    if (duration-- > 0) {
      bloomPass.strength += (originalStrength - bloomPass.strength) * 0.1;
      requestAnimationFrame(decay);
    }
  };
  setTimeout(decay, 16);
}

/**
 * Set a temporary screen flash (damage hit, parry success)
 * @param {THREE.Color} color — Flash color
 * @param {number} intensity — Flash intensity (0–1)
 */
export function screenFlash(color, intensity) {
  if (!vignettePass) return;
  // We can repurpose the HP low tint for a brief flash
  const origTint = vignettePass.uniforms.uHPLowTint.value;
  vignettePass.uniforms.uHPLowTint.value = intensity;
  // Quick decay
  let decayFrames = 8;
  const decay = () => {
    if (decayFrames-- > 0) {
      vignettePass.uniforms.uHPLowTint.value *= 0.75;
      requestAnimationFrame(decay);
    } else {
      vignettePass.uniforms.uHPLowTint.value = origTint;
    }
  };
  setTimeout(decay, 16);
}
