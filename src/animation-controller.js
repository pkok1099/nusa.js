// ============================================================
// animation-controller.js — Procedural animation state machine
// Phase 4: Manages per-entity 3D model animations
// No AnimationMixer needed — all animations are procedural
// (sine-based oscillations, keyframe interpolations)
// ============================================================

import * as THREE from 'three';

// ============================================================
// ANIMATION STATE DEFINITIONS
// ============================================================

/**
 * Animation states map to player.state values:
 * 'idle', 'run', 'jump', 'fall', 'attack', 'heavyAttack',
 * 'dodge', 'parry', 'hurt', 'heal'
 */

// Procedural animation parameters per state
const ANIM_PARAMS = {
  idle: {
    bodyBob: 0.02,     // Subtle vertical bob amplitude
    bodyBobSpeed: 0.03, // Bob frequency
    armSwing: 0.0,
    legSwing: 0.0,
    weaponBob: 0.03,
    weaponBobSpeed: 0.04,
    lean: 0,
    breathe: 0.01,
  },
  run: {
    bodyBob: 0.08,
    bodyBobSpeed: 0.15,
    armSwing: 0.6,
    legSwing: 0.8,
    weaponBob: 0.05,
    weaponBobSpeed: 0.15,
    lean: 0.1,      // Forward lean
    breathe: 0,
  },
  jump: {
    bodyBob: 0,
    armSwing: -0.4,  // Arms up
    legSwing: 0.3,
    weaponBob: 0,
    weaponBobSpeed: 0,
    lean: -0.05,
    breathe: 0,
  },
  fall: {
    bodyBob: 0,
    armSwing: 0.3,
    legSwing: 0.2,
    weaponBob: 0,
    weaponBobSpeed: 0,
    lean: 0.05,
    breathe: 0,
  },
  attack: {
    bodyBob: 0.02,
    bodyBobSpeed: 0.2,
    armSwing: 0.9,   // Right arm forward swing
    legSwing: 0.2,
    weaponBob: 0,
    weaponBobSpeed: 0.3,
    lean: 0.2,       // Forward lunge
    breathe: 0,
  },
  heavyAttack: {
    bodyBob: 0.04,
    bodyBobSpeed: 0.15,
    armSwing: 1.2,   // Big windup swing
    legSwing: 0.3,
    weaponBob: 0,
    weaponBobSpeed: 0.2,
    lean: 0.3,
    breathe: 0,
  },
  dodge: {
    bodyBob: 0.1,
    bodyBobSpeed: 0.25,
    armSwing: 0.4,
    legSwing: 1.0,   // Legs tuck
    weaponBob: 0,
    weaponBobSpeed: 0,
    lean: 0.4,       // Lean into dodge
    breathe: 0,
  },
  parry: {
    bodyBob: 0.01,
    bodyBobSpeed: 0.1,
    armSwing: -0.5,  // Arms up defensive
    legSwing: 0.1,
    weaponBob: 0.1,
    weaponBobSpeed: 0.1,
    lean: -0.05,
    breathe: 0,
  },
  hurt: {
    bodyBob: 0.05,
    bodyBobSpeed: 0.2,
    armSwing: -0.3,
    legSwing: 0.1,
    weaponBob: 0,
    weaponBobSpeed: 0,
    lean: -0.2,      // Stagger backward
    breathe: 0,
  },
  heal: {
    bodyBob: 0.01,
    bodyBobSpeed: 0.05,
    armSwing: -0.6,  // Arms raised
    legSwing: 0,
    weaponBob: 0,
    weaponBobSpeed: 0,
    lean: 0,
    breathe: 0.03,
  },
};

// Enemy animation params (simpler)
const ENEMY_ANIM_PARAMS = {
  idle: { bodyBob: 0.02, bodyBobSpeed: 0.03, armSwing: 0.1, legSwing: 0 },
  patrol: { bodyBob: 0.04, bodyBobSpeed: 0.08, armSwing: 0.3, legSwing: 0.4 },
  attack: { bodyBob: 0.03, bodyBobSpeed: 0.15, armSwing: 0.8, legSwing: 0.2 },
  hurt: { bodyBob: 0.05, bodyBobSpeed: 0.15, armSwing: -0.2, legSwing: 0.1 },
  stagger: { bodyBob: 0.03, bodyBobSpeed: 0.1, armSwing: -0.3, legSwing: 0.05 },
  telegraph: { bodyBob: 0.04, bodyBobSpeed: 0.12, armSwing: 0.6, legSwing: 0.1 },
};

// Boss animation params
const BOSS_ANIM_PARAMS = {
  idle: { bodyBob: 0.03, bodyBobSpeed: 0.02, armSwing: 0.05, legSwing: 0 },
  patrol: { bodyBob: 0.05, bodyBobSpeed: 0.06, armSwing: 0.2, legSwing: 0.3 },
  attack: { bodyBob: 0.04, bodyBobSpeed: 0.1, armSwing: 0.9, legSwing: 0.2 },
  hurt: { bodyBob: 0.06, bodyBobSpeed: 0.12, armSwing: -0.2, legSwing: 0.1 },
  stagger: { bodyBob: 0.04, bodyBobSpeed: 0.08, armSwing: -0.4, legSwing: 0.05 },
  telegraph: { bodyBob: 0.05, bodyBobSpeed: 0.1, armSwing: 0.7, legSwing: 0.15 },
  phase2: { bodyBob: 0.05, bodyBobSpeed: 0.08, armSwing: 0.3, legSwing: 0.2 },
  phase3: { bodyBob: 0.06, bodyBobSpeed: 0.12, armSwing: 0.4, legSwing: 0.3 },
};

// ============================================================
// PER-ENTITY ANIMATION STATE
// ============================================================

const entityAnims = new Map(); // entityKey → { time, prevState, blendFactor }

function getAnimState(key) {
  if (!entityAnims.has(key)) {
    entityAnims.set(key, { time: 0, prevState: 'idle', blendFactor: 0 });
  }
  return entityAnims.get(key);
}

export function resetAnimState(key) {
  entityAnims.delete(key);
}

export function resetAllAnimStates() {
  entityAnims.clear();
}

// ============================================================
// PLAYER ANIMATION — Apply procedural animation to player model
// ============================================================

/**
 * Update player model animation.
 * @param {THREE.Group} model — The player 3D model group
 * @param {string} state — Player state ('idle', 'run', 'attack', etc.)
 * @param {number} facing — 1 (right) or -1 (left)
 * @param {number} dt — Delta time (frames)
 * @param {Object} playerState — Additional player state for effects
 */
export function updatePlayerAnimation(model, state, facing, dt, playerState = {}) {
  if (!model) return;

  const anim = getAnimState('player');
  anim.time += dt;

  const params = ANIM_PARAMS[state] || ANIM_PARAMS.idle;
  const t = anim.time;

  // ---- Body bob ----
  const bodyBob = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.bodyBob;
  model.position.y += bodyBob;

  // ---- Breathe (subtle chest expansion) ----
  if (params.breathe) {
    const breatheVal = Math.sin(t * 0.02 * Math.PI * 2) * params.breathe;
    const torso = model.getObjectByName('torso');
    if (torso) {
      torso.scale.z = 1 + breatheVal;
    }
  }

  // ---- Forward lean ----
  if (params.lean) {
    model.rotation.x = -params.lean * facing;
  } else {
    model.rotation.x = 0;
  }

  // ---- Arm swing ----
  const armL = model.getObjectByName('arm_l');
  const armR = model.getObjectByName('arm_r');
  if (armL) {
    const swing = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.armSwing;
    armL.rotation.x = -swing;
  }
  if (armR) {
    const swing = Math.sin(t * params.bodyBobSpeed * Math.PI * 2 + Math.PI) * params.armSwing;
    armR.rotation.x = -swing;
  }

  // ---- Leg swing ----
  const legL = model.getObjectByName('leg_l');
  const legR = model.getObjectByName('leg_r');
  if (legL) {
    const swing = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.legSwing;
    legL.rotation.x = swing;
  }
  if (legR) {
    const swing = Math.sin(t * params.bodyBobSpeed * Math.PI * 2 + Math.PI) * params.legSwing;
    legR.rotation.x = swing;
  }

  // ---- Weapon bob ----
  const weapon = model.getObjectByName('weapon');
  if (weapon && params.weaponBob) {
    const wBob = Math.sin(t * params.weaponBobSpeed * Math.PI * 2) * params.weaponBob;
    weapon.position.y += wBob;
  }

  // ---- Head slight look direction ----
  const head = model.getObjectByName('head');
  if (head) {
    head.rotation.y = facing > 0 ? 0 : Math.PI;
  }

  // ---- Effect overlays ----
  // Hurt flash — tint all meshes red
  if (playerState.hurtTimer > 0) {
    const flashIntensity = playerState.hurtTimer / 20;
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow' && child.name !== 'aura' && child.name !== 'divine') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(flashIntensity, 0, 0);
          child.material.emissiveIntensity = flashIntensity * 0.5;
        }
      }
    });
  } else {
    // Reset emissive
    model.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissiveIntensity = 0;
      }
    });
  }

  // Dodge ghost — reduce opacity
  if (playerState.dodging) {
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      }
    });
  }

  // Poison — green tint
  if (playerState.poisonTimer > 0) {
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(0, 0.15, 0);
          child.material.emissiveIntensity = 0.3;
        }
      }
    });
  }

  // Healing — golden glow
  if (playerState.healing) {
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(0.2, 0.15, 0);
          child.material.emissiveIntensity = 0.3;
        }
      }
    });
  }

  // Parry ring — scale up right arm
  if (playerState.parryTimer > 0 && playerState.parryWindow > 0) {
    const armR = model.getObjectByName('arm_r');
    if (armR) {
      armR.scale.set(1.3, 1.3, 1.3);
    }
  }
}

// ============================================================
// ENEMY ANIMATION — Apply procedural animation to enemy model
// ============================================================

/**
 * Update enemy model animation.
 * @param {THREE.Group} model — The enemy 3D model group
 * @param {string} enemyType — Enemy type key
 * @param {Object} enemy — Enemy state object
 * @param {number} dt — Delta time (frames)
 */
export function updateEnemyAnimation(model, enemyType, enemy, dt) {
  if (!model) return;

  const key = `enemy_${enemyType}_${enemy.x}_${enemy.y}`;
  const anim = getAnimState(key);
  anim.time += dt;

  // Determine enemy animation state
  let animState = 'idle';
  if (enemy.staggered) animState = 'stagger';
  else if (enemy.hurtTimer > 0) animState = 'hurt';
  else if (enemy.isTelegraphing) animState = 'telegraph';
  else if (enemy.isAttacking) animState = 'attack';
  else if (Math.abs(enemy.vx) > 0.1) animState = 'patrol';

  const params = ENEMY_ANIM_PARAMS[animState] || ENEMY_ANIM_PARAMS.idle;
  const t = anim.time;

  // Body bob
  const bodyBob = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.bodyBob;
  model.position.y += bodyBob;

  // Arm swing
  const armL = model.getObjectByName('arm_l');
  const armR = model.getObjectByName('arm_r');
  if (armL) {
    armL.rotation.x = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.armSwing;
  }
  if (armR) {
    armR.rotation.x = Math.sin(t * params.bodyBobSpeed * Math.PI * 2 + Math.PI) * params.armSwing;
  }

  // Leg swing (for humanoid enemies)
  const legL = model.getObjectByName('leg_l');
  const legR = model.getObjectByName('leg_r');
  if (legL) {
    legL.rotation.x = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.legSwing;
  }
  if (legR) {
    legR.rotation.x = Math.sin(t * params.bodyBobSpeed * Math.PI * 2 + Math.PI) * params.legSwing;
  }

  // Hurt flash
  if (enemy.hurtTimer > 0) {
    const flashIntensity = enemy.hurtTimer / 15;
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow' && child.name !== 'aura') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(flashIntensity, 0, 0);
          child.material.emissiveIntensity = flashIntensity * 0.5;
        }
      }
    });
  } else if (enemy.staggered) {
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(0.3, 0.25, 0);
          child.material.emissiveIntensity = 0.4;
        }
      }
    });
  } else {
    // Reset
    model.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        child.material.emissiveIntensity = 0;
      }
    });
  }

  // Telegraph glow (pulsing red)
  if (enemy.isTelegraphing) {
    const pulse = Math.sin(t * 0.3) * 0.3 + 0.5;
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(pulse, 0, 0);
          child.material.emissiveIntensity = pulse * 0.4;
        }
      }
    });
  }
}

// ============================================================
// BOSS ANIMATION — Apply procedural animation to boss model
// ============================================================

/**
 * Update boss model animation.
 * @param {THREE.Group} model — The boss 3D model group
 * @param {number} stageId — Boss stage ID
 * @param {Object} boss — Boss state object
 * @param {number} dt — Delta time (frames)
 */
export function updateBossAnimation(model, stageId, boss, dt) {
  if (!model) return;

  const key = `boss_${stageId}`;
  const anim = getAnimState(key);
  anim.time += dt;

  // Determine boss animation state
  let animState = 'idle';
  if (boss.staggered) animState = 'stagger';
  else if (boss.hurtTimer > 0) animState = 'hurt';
  else if (boss.isTelegraphing) animState = 'telegraph';
  else if (boss.attackTimer > 0) animState = 'attack';
  else if (Math.abs(boss.vx) > 0.1) animState = 'patrol';
  else if (boss.phase >= 3) animState = 'phase3';
  else if (boss.phase >= 2) animState = 'phase2';

  const params = BOSS_ANIM_PARAMS[animState] || BOSS_ANIM_PARAMS.idle;
  const t = anim.time;

  // Body bob
  const bodyBob = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.bodyBob;
  model.position.y += bodyBob;

  // Arm swing (bosses have massive arms)
  const armL = model.getObjectByName('arm_l');
  const armR = model.getObjectByName('arm_r');
  if (armL) {
    const swing = Math.sin(t * params.bodyBobSpeed * Math.PI * 2) * params.armSwing;
    armL.rotation.x = swing;
    // Telegraph: alternate arm swing
    if (boss.isTelegraphing) {
      armL.rotation.x += Math.sin(t * 0.5) * 0.3;
    }
  }
  if (armR) {
    const swing = Math.sin(t * params.bodyBobSpeed * Math.PI * 2 + Math.PI) * params.armSwing;
    armR.rotation.x = swing;
    if (boss.isTelegraphing) {
      armR.rotation.x -= Math.sin(t * 0.5) * 0.3;
    }
  }

  // Tentacle animation for sea boss
  const tent_l1 = model.getObjectByName('tent_l1');
  const tent_r1 = model.getObjectByName('tent_r1');
  const tent_l2 = model.getObjectByName('tent_l2');
  const tent_r2 = model.getObjectByName('tent_r2');
  if (tent_l1) tent_l1.rotation.x = Math.sin(t * 0.08) * 0.4;
  if (tent_r1) tent_r1.rotation.x = Math.sin(t * 0.08 + 1) * 0.4;
  if (tent_l2) tent_l2.rotation.x = Math.sin(t * 0.08 + 2) * 0.3;
  if (tent_r2) tent_r2.rotation.x = Math.sin(t * 0.08 + 3) * 0.3;

  // Dragon wing flap
  const wingL = model.getObjectByName('wing_l');
  const wingR = model.getObjectByName('wing_r');
  if (wingL) wingL.rotation.z = 0.3 + Math.sin(t * 0.06) * 0.2;
  if (wingR) wingR.rotation.z = -0.3 - Math.sin(t * 0.06) * 0.2;

  // Tail sway
  const tail = model.getObjectByName('tail');
  if (tail) tail.rotation.y = Math.sin(t * 0.05) * 0.3;

  // Phase-based effects
  if (boss.phase >= 2) {
    // Lava/fire phase aura
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          const phaseGlow = Math.sin(t * 0.1) * 0.1 + 0.15;
          child.material.emissive.setRGB(phaseGlow, phaseGlow * 0.3, 0);
          child.material.emissiveIntensity = 0.2;
        }
      }
    });
  }

  if (boss.phase >= 3) {
    // Final phase — intense pulsing
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          const p3Glow = Math.sin(t * 0.15) * 0.2 + 0.3;
          child.material.emissive.setRGB(p3Glow, p3Glow * 0.2, 0);
          child.material.emissiveIntensity = 0.3;
        }
      }
    });
    // Crown glow
    const crown = model.getObjectByName('crown');
    if (crown && crown.material) {
      crown.material.emissiveIntensity = Math.sin(t * 0.1) * 0.3 + 0.5;
    }
  }

  // Hurt flash
  if (boss.hurtTimer > 0) {
    const flashIntensity = boss.hurtTimer / 20;
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(flashIntensity, 0, 0);
          child.material.emissiveIntensity = flashIntensity * 0.6;
        }
      }
    });
  }

  // Stagger
  if (boss.staggered) {
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(0.3, 0.25, 0);
          child.material.emissiveIntensity = 0.5;
        }
      }
    });
  }

  // Phase 2 transition
  if (boss.phase2Transitioned && boss.recoveryTimer > 30) {
    const transPulse = Math.sin(t * 0.2) * 0.3 + 0.5;
    model.traverse((child) => {
      if (child.isMesh && child.name !== 'shadow') {
        if (child.material && child.material.emissive) {
          child.material.emissive.setRGB(transPulse, transPulse * 0.3, 0);
          child.material.emissiveIntensity = transPulse * 0.4;
        }
      }
    });
  }
}

// ============================================================
// NPC ANIMATION — Gentle idle animation
// ============================================================

export function updateNPCAnimation(model, npc, dt) {
  if (!model) return;

  const key = `npc_${npc.x}_${npc.y}`;
  const anim = getAnimState(key);
  anim.time += dt;

  // Gentle idle bob
  const bob = Math.sin(anim.time * 0.03 * Math.PI * 2) * 0.03;
  model.position.y += bob;

  // Subtle arm sway
  const armL = model.getObjectByName('arm_l');
  const armR = model.getObjectByName('arm_r');
  if (armL) armL.rotation.x = Math.sin(anim.time * 0.02) * 0.1;
  if (armR) armR.rotation.x = Math.sin(anim.time * 0.02 + Math.PI) * 0.1;
}

// ============================================================
// ITEM ANIMATION — Floating, spinning
// ============================================================

export function updateItemAnimation(model, item, dt, gameTime) {
  if (!model) return;

  // Float up and down
  const bob = Math.sin(gameTime * 0.05 + (item.bobOffset || 0)) * 0.15;
  model.position.y += bob;

  // Slow rotation
  model.rotation.y += dt * 0.02;

  // Glow pulse
  model.traverse((child) => {
    if (child.isMesh && child.material && child.material.emissive) {
      const pulse = Math.sin(gameTime * 0.08) * 0.1 + 0.2;
      child.material.emissiveIntensity = pulse;
    }
  });
}
