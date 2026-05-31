// ============================================================
// player.js — Player entity, update logic, damage, respawn
// ============================================================

import {
  GRAVITY, MAX_FALL, PLAYER_SPEED, JUMP_FORCE,
  DODGE_SPEED, DODGE_DURATION, ATTACK_RANGE,
  COMBO_WINDOW, COMBO_1_DAMAGE, COMBO_2_DAMAGE, COMBO_3_DAMAGE,
  COMBO_1_DURATION, COMBO_2_DURATION, COMBO_3_DURATION,
  HEAVY_ATTACK_DAMAGE, HEAVY_ATTACK_WINDUP, HEAVY_ATTACK_DURATION,
  HEAVY_ATTACK_ENERGY, PARRY_WINDOW, PARRY_DURATION,
  STAGGER_DAMAGE_MULT, STAGGER_DURATION,
  COYOTE_TIME, JUMP_BUFFER_TIME,
  MAX_STAMINA, STAMINA_REGEN, STAMINA_DODGE_COST, STAMINA_LIGHT_COST,
  STAMINA_HEAVY_COST, STAMINA_PARRY_COST,
  HEAL_ANIMATION_DURATION, HEAL_TICKS, HEAL_AMOUNT,
  HIT_STOP_FRAMES, SKILL_DAMAGE, INV_FRAMES, GROUND_Y, C,
  SKILL_POINTS_PER_LEVEL, ARROW_SPEED, ARROW_DAMAGE, ARROW_RANGE, ARROW_COST,
  WATER_GRAVITY, SWIM_FORCE, WATER_SPEED_MULT,
  // Souls-like system v0.7.0
  ESTUS_MAX, ESTUS_HEAL_AMOUNT,
  DEATH_RUPIAH_LOSS_PCT, DEATH_RUPIAH_RECOVERY,
  STAMINA_REGEN_DELAY, STAMINA_REGEN_RATE, STAMINA_REGEN_RATE_FAST, STAMINA_JUMP_COST,
  DODGE_I_FRAMES, DODGE_I_FRAME_START,
  PARRY_ACTIVE_WINDOW, PARRY_RECOVERY, PARRY_STAMINA_REFUND,
  BACKSTAB_DAMAGE_MULT, POSTURE_BREAK_DAMAGE_MULT,
  HIT_STOP_HEAVY, HIT_STOP_PARRY, SCREEN_SHAKE_LIGHT, SCREEN_SHAKE_HEAVY, SCREEN_SHAKE_CRIT,
  // Souls-like system v0.7.1
  RALLY_DURATION, RALLY_RECOVERY_PCT,
  PLAYER_MAX_POISE, PLAYER_POISE_REGEN, PLAYER_POISE_REGEN_COMBAT, PLAYER_STAGGER_DURATION,
  STAMINA_EXHAUST_DURATION,
  WEAPON_ART_STAMINA_COST, WEAPON_ART_ENERGY_COST, WEAPON_ART_COOLDOWN, WEAPON_ARTS,
  // Souls-like system v0.7.1 (hollowing, visceral, two-handing)
  HOLLOWING_HP_PENALTY, HOLLOWING_MAX_LEVEL, HOLLOWING_MIN_HP_PCT,
  VISCERAL_WINDOW, VISCERAL_DAMAGE_MULT, VISCERAL_RANGE, VISCERAL_DURATION,
  TWO_HAND_DAMAGE_MULT, TWO_HAND_STAMINA_PENALTY,
} from './config.js';
import { TILE_BOSS_ALTAR, TILE_EXIT_DOOR, TILE_PUZZLE_DOOR, ALTAR_INTERACT_RANGE, DOOR_INTERACT_RANGE } from './config.js';
import { playSound } from './audio.js';
import { justPressed, keys as inputKeys } from './input.js';
import { tileCollision, getTileType, setDropThrough } from './physics.js';
import { spawnParticle, spawnFloatingText, particles } from './particles.js';
import { inventory, getComputedStats, useHealthPotion, updateBuffs, countHealthPotions, addItem } from './inventory.js';
import { WEAPONS, ARMORS, ACCESSORIES, POTIONS } from './config.js';
import { getEquipmentDropRate, getRandomEquipmentDropForStage, getBossDrop } from './entities.js';
import { invalidateTile3DCache } from './renderer.js';

// Helper to get raw weapon id string (no object creation)
function getEquippedWeaponRaw() {
  return inventory.equipment.weapon || 'keris';
}

// Boss drop queue (consumed by game.js)
export const bossDropQueue = [];

export const player = {
  x: 80, y: GROUND_Y - 36, w: 24, h: 36,
  prevY: GROUND_Y - 36,
  vx: 0, vy: 0,
  hp: 100, maxHp: 100,
  level: 1, exp: 0, expNext: 50,
  facing: 1, grounded: false,
  coyoteTimer: 0, jumpBufferTimer: 0,
  attacking: false, attackTimer: 0, attackCombo: 0,
  comboWindow: 0, attackHit: false,
  heavyAttacking: false, heavyAttackTimer: 0, heavyAttackHit: false,
  parryTimer: 0, parryWindow: 0,
  dodging: false, dodgeTimer: 0, dodgeDir: 1,
  invincible: 0,
  skillCooldown: 0, skillMaxCooldown: 180,
  energy: 100, maxEnergy: 100,
  stamina: MAX_STAMINA, maxStamina: MAX_STAMINA,
  healing: false, healingTimer: 0, healTicksRemaining: 0, healPerTick: 0,
  artifacts: 0, rupiah: 0,
  animFrame: 0, animTimer: 0,
  state: 'idle', hurtTimer: 0,
  checkpoint: { x: 80, y: GROUND_Y - 36 },
  potions: 0, keys: 0,
  // New status effects
  poisonTimer: 0,
  stunTimer: 0,
  slowTimer: 0,
  lavaDamageTimer: 0,
  // Current stage
  currentStageId: 0,
  // Last death penalty
  lastLostRupiah: 0,
  // Drop-through platform timer
  dropThrough: 0,
  // Water swimming state
  inWater: false,
  // Souls-like: Estus Flask (healing charges that refill at checkpoints)
  estus: ESTUS_MAX,
  estusMax: ESTUS_MAX,
  // Souls-like: Bloodstain (recover lost Rupiah by reaching death location)
  bloodstain: null, // { x, y, rupiah } or null
  lostRupiah: 0,
  // Souls-like v0.7.1: Hollowing (consecutive deaths reduce max HP)
  hollowing: 0,
  // Souls-like v0.7.1: Visceral Attack (critical after parry)
  visceralActive: false, visceralTimer: 0, visceralWindow: 0,
  // Souls-like v0.7.1: Two-handing toggle
  twoHanding: false,
  // Souls-like: Stamina regeneration delay
  staminaRegenDelay: 0,
  // Souls-like: Dodge i-frame counter
  dodgeIFrame: 0,
  // Souls-like: In-combat flag (affects stamina regen speed)
  inCombat: false,
  combatTimer: 0,
  // Bonfire healing state
  bonfireHealing: false,
  bonfireHealTimer: 0,
  // Souls-like v0.7.1: Rally system (Bloodborne-style HP recovery)
  rallyHp: 0,           // Amount of HP that can be rallied back
  rallyTimer: 0,        // Frames remaining to rally
  // Souls-like v0.7.1: Player poise (can be staggered like enemies)
  poise: PLAYER_MAX_POISE,
  maxPoise: PLAYER_MAX_POISE,
  poiseStaggerTimer: 0, // Frames remaining in poise stagger
  // Souls-like v0.7.1: Stamina exhaustion
  exhausted: false,
  exhaustTimer: 0,
  // Souls-like v0.7.1: Weapon Art
  weaponArtActive: false,
  weaponArtTimer: 0,
  weaponArtCooldown: 0,
  weaponArtType: null,
};

// Shared mutable state references (set from game.js)
let gameStateRef = { value: 'menu' };
let hitStopRef = { value: 0 };
let shakeRef = { timer: 0, intensity: 0 };
let parryFlashRef = { timer: 0 };
let deathCountRef = { value: 0 };
let onCheckpointCallback = null;

export function setStateRefs(gs, hs, sh, pf, dc) {
  gameStateRef = gs; hitStopRef = hs; shakeRef = sh;
  parryFlashRef = pf; deathCountRef = dc;
}

// Reference to cleared stages array from game.js — for artifact tracking
let clearedStagesRef = [false, false, false, false, false];
export function setClearedStagesRef(ref) { clearedStagesRef = ref; }

export function setOnCheckpoint(cb) {
  onCheckpointCallback = cb;
}

// Get computed effective stats from inventory
function getStats() {
  return getComputedStats(player.level);
}

export function updatePlayer(keys, entities, boss, bossActive, puzzleState, tileMap, startDialog, initPuzzle) {
  // ---- ALWAYS process input buffering, even during hitstop/stun ----
  // This fixes the critical bug where jump input was lost during hitstop
  // because justPressed() only returns true for 1 frame and savePrevKeys()
  // is called at the end of the game loop regardless of early returns.
  if (justPressed('ArrowUp') || justPressed('KeyW')) player.jumpBufferTimer = JUMP_BUFFER_TIME;
  else if (player.jumpBufferTimer > 0) player.jumpBufferTimer--;

  // Drop-through: Down+Jump on one-way platforms
  if ((justPressed('ArrowDown') || justPressed('KeyS')) && player.grounded) {
    player.dropThrough = 8; // 8 frames of dropping through
    setDropThrough(true);
  }
  if (player.dropThrough > 0) {
    player.dropThrough--;
    if (player.dropThrough <= 0) setDropThrough(false);
  }

  if (hitStopRef.value > 0) {
    // BUG FIX v0.6.2: During hitstop, still process buffered jump
    // if coyote timer is valid. Previously, the jump at the bottom
    // was unreachable during hitstop, causing intermittent jump failure.
    if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0 && !player.healing && !player.dodging) {
      player.vy = JUMP_FORCE;
      player.grounded = false;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;
      player.attacking = false;
      player.heavyAttacking = false;
      player.comboWindow = 0;
      player.parryTimer = 0;
      playSound('jump');
    }
    return;
  }

  // Update buffs
  updateBuffs();

  // Update status effects
  if (player.poisonTimer > 0) {
    player.poisonTimer--;
    if (player.poisonTimer % 30 === 0 && player.poisonTimer > 0) {
      player.hp -= 3;
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.green + '80', 3, 1, 15);
      if (player.hp <= 0) { player.hp = 0; playerDie(); }
    }
  }
  // Souls-like v0.7.1: Poise stagger (separate from stun — caused by poise break)
  if (player.poiseStaggerTimer > 0) {
    player.poiseStaggerTimer--;
    player.vx = 0;
    player.prevY = player.y;
    applyGravityAndCollision(tileMap);
    return;
  }
  // Souls-like v0.7.1: Stamina exhaustion — can't act briefly when stamina hits 0
  if (player.exhausted) {
    player.exhaustTimer--;
    if (player.exhaustTimer <= 0) player.exhausted = false;
    player.vx = 0;
    player.prevY = player.y;
    applyGravityAndCollision(tileMap);
    return;
  }
  if (player.stunTimer > 0) {
    player.stunTimer--;
    player.vx = 0;
    // BUG FIX v0.6.2: Set prevY before gravity/collision during stun,
    // otherwise one-way platforms don't work correctly
    player.prevY = player.y;
    applyGravityAndCollision(tileMap);
    return;
  }
  if (player.slowTimer > 0) player.slowTimer--;

  // Lava damage
  if (player.lavaDamageTimer > 0) player.lavaDamageTimer--;
  const ptx = Math.floor((player.x + player.w / 2) / 32);
  const pty = Math.floor((player.y + player.h - 2) / 32);
  const tileT = getTileType(ptx, pty);
  if (tileT === 3 && player.lavaDamageTimer <= 0) {
    player.lavaDamageTimer = 30; // damage every 0.5s
    damagePlayer(8);
    spawnParticle(player.x + player.w / 2, player.y + player.h, C.lava, 5, 3, 20);
  }

  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.invincible > 0) player.invincible--;
  if (player.skillCooldown > 0) player.skillCooldown--;
  player.prevY = player.y;

  // Get computed stats for this frame
  const stats = getStats();

  // Apply max stats from equipment/buffs
  // Souls-like v0.7.1: Hollowing reduces effective max HP
  let effectiveMaxHp = Math.floor(stats.maxHp * Math.max(HOLLOWING_MIN_HP_PCT, 1 - player.hollowing * HOLLOWING_HP_PENALTY));
  const effectiveMaxStamina = stats.maxStamina;
  const effectiveMaxEnergy = stats.maxEnergy;

  // ---- RALLY SYSTEM v0.7.1 ----
  // Rally timer counts down — if it expires, lost rally HP is gone
  if (player.rallyTimer > 0) {
    player.rallyTimer--;
    if (player.rallyTimer <= 0) player.rallyHp = 0;
  }

  // ---- POISE REGEN v0.7.1 ----
  if (!player.inCombat && player.poise < player.maxPoise) {
    player.poise = Math.min(player.maxPoise, player.poise + PLAYER_POISE_REGEN);
  } else if (player.inCombat && player.poise < player.maxPoise) {
    player.poise = Math.min(player.maxPoise, player.poise + PLAYER_POISE_REGEN_COMBAT);
  }

  // ---- WEAPON ART COOLDOWN v0.7.1 ----
  if (player.weaponArtCooldown > 0) player.weaponArtCooldown--;

  // ---- VISCERAL WINDOW COUNTDOWN v0.7.1 ----
  if (player.visceralWindow > 0) player.visceralWindow--;

  // ---- VISCERAL ATTACK ANIMATION v0.7.1 ----
  if (player.visceralActive) {
    player.visceralTimer--;
    player.vx = player.facing * 3; // Lunge forward
    if (player.visceralTimer <= 0) {
      player.visceralActive = false;
    }
    player.prevY = player.y;
    applyGravityAndCollision(tileMap);
    return;
  }

  // ---- WEAPON ART EXECUTION v0.7.1 ----
  if (player.weaponArtActive) {
    player.weaponArtTimer--;
    const art = WEAPON_ARTS[player.weaponArtType] || WEAPON_ARTS.keris;
    // Execute weapon art hit at the right frame
    if (player.weaponArtTimer === Math.floor(art.duration * 0.5)) {
      executeWeaponArtHit(art, entities, boss, bossActive, stats);
    }
    player.vx = player.facing * 2; // Slight forward movement during art
    if (player.weaponArtTimer <= 0) {
      player.weaponArtActive = false;
      player.weaponArtType = null;
    }
    player.prevY = player.y;
    applyGravityAndCollision(tileMap);
    return;
  }

  // Clamp current values to max
  player.hp = Math.min(player.hp, effectiveMaxHp);
  player.stamina = Math.min(player.stamina, effectiveMaxStamina);
  player.energy = Math.min(player.energy, effectiveMaxEnergy);

  // ---- HEALING ----
  if (player.healing) {
    player.healingTimer++;
    if (player.healingTimer % Math.floor(HEAL_ANIMATION_DURATION / HEAL_TICKS) === 0 && player.healTicksRemaining > 0) {
      player.hp = Math.min(effectiveMaxHp, player.hp + player.healPerTick);
      player.healTicksRemaining--;
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.green, 2, 1, 15);
    }
    if (player.healingTimer >= HEAL_ANIMATION_DURATION) player.healing = false;
    player.vx = 0;
    // BUG FIX v0.6.2: Set prevY before gravity/collision during healing
    player.prevY = player.y;
    applyGravityAndCollision(tileMap);
    return;
  }

  // ---- STAMINA REGEN (Souls-like v0.7.0) ----
  // Stamina doesn't regenerate instantly after actions — there's a delay
  const isExerting = player.dodging || player.attacking || player.heavyAttacking || player.parryTimer > 0;
  if (isExerting) {
    player.staminaRegenDelay = STAMINA_REGEN_DELAY;
  } else if (player.staminaRegenDelay > 0) {
    player.staminaRegenDelay--;
  }

  // Combat timer — if player recently took/dealt damage, they're "in combat"
  if (player.combatTimer > 0) player.combatTimer--;
  player.inCombat = player.combatTimer > 0;

  // Regenerate stamina with delay and combat speed difference
  if (!isExerting && player.staminaRegenDelay <= 0 && player.stamina < effectiveMaxStamina) {
    const regenRate = player.inCombat ? STAMINA_REGEN_RATE : STAMINA_REGEN_RATE_FAST;
    player.stamina = Math.min(effectiveMaxStamina, player.stamina + regenRate);
  }

  // ---- COYOTE TIME ----
  if (player.grounded) player.coyoteTimer = COYOTE_TIME;
  else if (player.coyoteTimer > 0) player.coyoteTimer--;

  // ---- PARRY ----
  if (player.parryTimer > 0) {
    player.parryTimer--;
    player.parryWindow = player.parryTimer > (PARRY_DURATION - PARRY_WINDOW)
      ? player.parryTimer - (PARRY_DURATION - PARRY_WINDOW) : 0;
    player.vx = 0;
    // BUG FIX v0.6.2: Set prevY before gravity/collision during parry
    player.prevY = player.y;
    applyGravityAndCollision(tileMap);
    return;
  } else {
    player.parryWindow = 0;
  }

  // Effective speed (from equipment + buffs + slow + water)
  const effectiveSpeed = stats.speed * (player.slowTimer > 0 ? 0.5 : 1.0) * (player.inWater ? WATER_SPEED_MULT : 1.0);

  // ---- DODGE (Souls-like v0.7.0: generous i-frames) ----
  if (player.dodging) {
    player.dodgeTimer--;
    // Track dodge i-frames for precise invincibility
    player.dodgeIFrame++;
    if (player.dodgeIFrame >= DODGE_I_FRAME_START && player.dodgeIFrame <= DODGE_I_FRAMES) {
      player.invincible = 3; // Keep refreshing invincibility during active i-frames
    }
    player.vx = player.dodgeDir * DODGE_SPEED;
    if (player.dodgeTimer <= 0) {
      player.dodging = false;
      player.dodgeIFrame = 0;
    }
  }
  // ---- LIGHT ATTACK ----
  else if (player.attacking) {
    player.attackTimer--;
    player.vx *= 0.7;
    if (player.attackTimer <= 0) { player.attacking = false; player.comboWindow = COMBO_WINDOW; }
  }
  // ---- HEAVY ATTACK ----
  else if (player.heavyAttacking) {
    player.heavyAttackTimer--;
    player.vx *= 0.5;
    if (player.heavyAttackTimer === HEAVY_ATTACK_DURATION - HEAVY_ATTACK_WINDUP && !player.heavyAttackHit) {
      player.heavyAttackHit = true;
      const atkBox = {
        x: player.facing > 0 ? player.x + player.w : player.x - ATTACK_RANGE - 10,
        y: player.y - 10, w: ATTACK_RANGE + 10, h: player.h + 20,
      };
      playSound('heavyAttack');
      let totalDmg = HEAVY_ATTACK_DAMAGE + player.level * 3 + stats.attack;
      // Souls-like v0.7.1: Two-handing damage bonus
      if (player.twoHanding) totalDmg = Math.floor(totalDmg * TWO_HAND_DAMAGE_MULT);
      entities.forEach(e => {
        if (e.type === 'enemy' && e.alive && rectsOverlapAtk(atkBox, e))
          damageEnemy(e, totalDmg, entities);
      });
      if (bossActive && boss && boss.alive && rectsOverlapAtk(atkBox, boss))
        // BUG FIX v0.6.2: Use same level scaling as enemies (level*3)
        // Previously used level*4 for bosses which was inconsistent
        damageBoss(boss, HEAVY_ATTACK_DAMAGE + player.level * 3 + stats.attack);
      spawnParticle(player.x + player.w / 2 + player.facing * 30, player.y + player.h / 2, C.gold, 15, 6, 30);
      shakeRef.timer = 5; shakeRef.intensity = SCREEN_SHAKE_HEAVY;
      hitStopRef.value = HIT_STOP_HEAVY;
    }
    if (player.heavyAttackTimer <= 0) player.heavyAttacking = false;
  }
  // ---- COMBO WINDOW ----
  else if (player.comboWindow > 0) {
    player.comboWindow--;
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { player.vx = -effectiveSpeed; player.facing = -1; }
    if (keys['ArrowRight'] || keys['KeyD']) { player.vx = effectiveSpeed; player.facing = 1; }
  }
  // ---- NORMAL ----
  else {
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { player.vx = -effectiveSpeed; player.facing = -1; }
    if (keys['ArrowRight'] || keys['KeyD']) { player.vx = effectiveSpeed; player.facing = 1; }
  }

  // ==== JUMP (outside else blocks) — Souls-like: costs stamina ====
  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0 && !player.healing && !player.dodging && player.parryTimer <= 0 && player.dropThrough <= 0) {
    // Souls-like v0.7.0: Jumping costs stamina (prevents infinite jumping away from enemies)
    if (player.stamina >= STAMINA_JUMP_COST) {
      player.stamina -= STAMINA_JUMP_COST;
      player.vy = JUMP_FORCE;
      player.grounded = false;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;
      player.attacking = false;
      player.heavyAttacking = false;
      player.comboWindow = 0;
      player.parryTimer = 0;
      playSound('jump');
    }
  }

  // ==== TWO-HANDING TOGGLE v0.7.1 (H) ====
  if (justPressed('KeyH') && !player.dodging && !player.attacking && !player.heavyAttacking && !player.healing && !player.weaponArtActive) {
    player.twoHanding = !player.twoHanding;
    spawnFloatingText(player.x + player.w / 2, player.y - 30,
      player.twoHanding ? 'Dua Tangan!' : 'Satu Tangan',
      player.twoHanding ? C.parryGold : C.textDim);
    playSound('parry');
  }

  // ==== LIGHT ATTACK (SPACE) ====
  if (justPressed('Space') && !player.dodging && !player.heavyAttacking && !player.healing && player.parryTimer <= 0) {
    // Souls-like v0.7.1: Visceral Attack after parry
    if (player.visceralWindow > 0 && !player.dodging && !player.heavyAttacking && !player.healing && player.parryTimer <= 0) {
      const stats = getStats();
      const visceralDmg = (stats.attack + player.level * 5) * VISCERAL_DAMAGE_MULT;
      const atkBox = {
        x: player.facing > 0 ? player.x + player.w : player.x - VISCERAL_RANGE,
        y: player.y - 10, w: VISCERAL_RANGE, h: player.h + 20,
      };
      player.visceralActive = true;
      player.visceralTimer = VISCERAL_DURATION;
      player.visceralWindow = 0;
      player.attacking = false;
      player.comboWindow = 0;
      player.attackCombo = 0;
      playSound('heavyAttack');
      spawnFloatingText(player.x + player.w / 2, player.y - 40, 'VISCERAL!', C.parryGold);
      spawnParticle(player.x + player.w / 2 + player.facing * 20, player.y + player.h / 2, C.parryGold, 25, 8, 35);
      shakeRef.timer = 8; shakeRef.intensity = SCREEN_SHAKE_CRIT;
      hitStopRef.value = HIT_STOP_PARRY;
      entities.forEach(e => {
        if (e.type === 'enemy' && e.alive && rectsOverlapAtk(atkBox, e)) {
          let dmg = e.staggered ? Math.floor(visceralDmg * POSTURE_BREAK_DAMAGE_MULT) : Math.floor(visceralDmg);
          damageEnemy(e, dmg, entities);
        }
      });
      if (bossActive && boss && boss.alive && rectsOverlapAtk(atkBox, boss)) {
        damageBoss(boss, Math.floor(visceralDmg));
      }
      // Rally recovery
      if (player.rallyHp > 0) {
        const rallyRecovery = Math.floor(player.rallyHp * RALLY_RECOVERY_PCT);
        player.hp = Math.min(player.hp + rallyRecovery, getStats().maxHp);
        player.rallyHp = 0;
        player.rallyTimer = 0;
        spawnFloatingText(player.x, player.y - 50, `+${rallyRecovery} HP (Rally!)`, C.goldLight);
      }
    } else {
    const weapon = getEquippedWeaponRaw();
    // Bow attack: SPACE + holding ArrowDown
    if (weapon === 'panah_api' && keys['ArrowDown']) {
      // Fire arrow projectile
      if (player.energy >= ARROW_COST) {
        player.energy -= ARROW_COST;
        player.attacking = true;
        player.attackTimer = 8;
        player.attackHit = false;
        player.comboWindow = 0;
        player.attackCombo = 0;
        playSound('attack');
        const stats = getStats();
        const arrowDmg = ARROW_DAMAGE + stats.attack;
        // Spawn arrow as a particle projectile
        const startX = player.x + player.w / 2 + player.facing * 12;
        const startY = player.y + player.h / 2 - 4;
        spawnParticle(startX, startY, C.gold + 'CC', 1, 0, Math.floor(ARROW_RANGE / ARROW_SPEED));
        const p = particles[particles.length - 1];
        p.vx = player.facing * ARROW_SPEED;
        p.vy = 0;
        p.size = 6;
        p.isProjectile = true;
        p.isPlayerArrow = true;
        p.damage = arrowDmg;
        p.facing = player.facing;
        spawnParticle(startX, startY - 2, C.orange + '80', 1, 0, Math.floor(ARROW_RANGE / ARROW_SPEED));
        const trail = particles[particles.length - 1];
        trail.vx = player.facing * ARROW_SPEED * 0.9;
        trail.vy = 0;
        trail.size = 3;
        trail.isProjectile = true;
        trail.isPlayerArrow = true;
        trail.damage = 0; // trail does no damage, just visual
        trail.facing = player.facing;
      } else { playSound('noStamina'); }
    } else if (player.stamina >= (player.twoHanding ? Math.floor(STAMINA_LIGHT_COST * (1 + TWO_HAND_STAMINA_PENALTY)) : STAMINA_LIGHT_COST)) {
      const lightCost = player.twoHanding ? Math.floor(STAMINA_LIGHT_COST * (1 + TWO_HAND_STAMINA_PENALTY)) : STAMINA_LIGHT_COST;
      player.stamina -= lightCost;
      player.attacking = true;
      player.attackHit = false;
      player.comboWindow = 0;
      let dmg, dur;
      if (player.attackCombo === 0) { dmg = COMBO_1_DAMAGE + player.level * 2 + stats.attack; dur = COMBO_1_DURATION; }
      else if (player.attackCombo === 1) { dmg = COMBO_2_DAMAGE + player.level * 2 + stats.attack; dur = COMBO_2_DURATION; }
      else { dmg = COMBO_3_DAMAGE + player.level * 3 + stats.attack; dur = COMBO_3_DURATION; }
      // Souls-like v0.7.1: Two-handing damage bonus
      if (player.twoHanding) dmg = Math.floor(dmg * TWO_HAND_DAMAGE_MULT);
      player.attackTimer = dur;
      playSound('attack');
      const atkBox = {
        x: player.facing > 0 ? player.x + player.w : player.x - ATTACK_RANGE,
        y: player.y - 5, w: ATTACK_RANGE, h: player.h + 10,
      };
      entities.forEach(e => {
        if (e.type === 'enemy' && e.alive && rectsOverlapAtk(atkBox, e)) {
          // Check if prajurit_jahat is blocking
          if (e.enemyType === 'prajurit_jahat' && e.blockTimer > 0) {
            dmg = Math.floor(dmg * 0.2);
            spawnFloatingText(e.x + e.w / 2, e.y - 10, 'Diblokir!', C.cyan);
          }
          let finalDmg = e.staggered ? Math.floor(dmg * STAGGER_DAMAGE_MULT) : dmg;
          damageEnemy(e, finalDmg, entities);
          player.attackHit = true;
        }
      });
      if (bossActive && boss && boss.alive && rectsOverlapAtk(atkBox, boss)) {
        let finalDmg = boss.staggered ? Math.floor(dmg * STAGGER_DAMAGE_MULT) : dmg;
        damageBoss(boss, finalDmg);
        player.attackHit = true;
      }
      player.attackCombo = (player.attackCombo + 1) % 3;
    } else { playSound('noStamina');
      // Souls-like v0.7.1: Stamina exhaustion — if stamina hits 0, brief stagger
      if (player.stamina <= 0 && !player.exhausted) {
        player.exhausted = true;
        player.exhaustTimer = STAMINA_EXHAUST_DURATION;
        spawnFloatingText(player.x + player.w / 2, player.y - 30, 'LELAH!', C.staminaDark);
      }
    }
    } // end else (non-visceral light attack)
  }

  // ==== HEAVY ATTACK (F) ====
  if (justPressed('KeyF') && !player.dodging && !player.attacking && !player.heavyAttacking && !player.healing && player.parryTimer <= 0) {
    const heavyStaminaCost = player.twoHanding ? Math.floor(STAMINA_HEAVY_COST * (1 + TWO_HAND_STAMINA_PENALTY)) : STAMINA_HEAVY_COST;
    if (player.stamina >= heavyStaminaCost && player.energy >= HEAVY_ATTACK_ENERGY) {
      player.stamina -= heavyStaminaCost;
      player.energy -= HEAVY_ATTACK_ENERGY;
      player.heavyAttacking = true;
      player.heavyAttackTimer = HEAVY_ATTACK_DURATION;
      player.heavyAttackHit = false;
      player.comboWindow = 0;
      player.attackCombo = 0;
      playSound('heavyAttack');
    } else { playSound('noStamina');
      // Souls-like v0.7.1: Stamina exhaustion on heavy attack
      if (player.stamina < STAMINA_HEAVY_COST && !player.exhausted) {
        player.exhausted = true;
        player.exhaustTimer = STAMINA_EXHAUST_DURATION;
        spawnFloatingText(player.x + player.w / 2, player.y - 30, 'LELAH!', C.staminaDark);
      }
    }
  }

  // ==== PARRY (R) ====
  if (justPressed('KeyR') && !player.dodging && !player.attacking && !player.heavyAttacking && !player.healing && player.parryTimer <= 0) {
    if (player.stamina >= STAMINA_PARRY_COST) {
      player.stamina -= STAMINA_PARRY_COST;
      player.parryTimer = PARRY_DURATION;
      player.parryWindow = PARRY_WINDOW;
      player.comboWindow = 0;
      player.attackCombo = 0;
      playSound('parry');
    } else { playSound('noStamina'); }
  }

  // ==== DODGE ====
  if ((justPressed('ShiftLeft') || justPressed('ShiftRight')) && !player.healing) {
    const dodgeStaminaCost = player.twoHanding ? Math.floor(STAMINA_DODGE_COST * (1 + TWO_HAND_STAMINA_PENALTY)) : STAMINA_DODGE_COST;
    if (!player.dodging && player.stamina >= dodgeStaminaCost) {
      player.stamina -= dodgeStaminaCost;
      player.attacking = false; player.heavyAttacking = false;
      player.comboWindow = 0; player.parryTimer = 0; player.attackCombo = 0;
      player.dodging = true;
      player.dodgeTimer = DODGE_DURATION;
      player.dodgeDir = player.facing;
      playSound('dodge');
    } else if (!player.dodging) { playSound('noStamina');
      // Souls-like v0.7.1: Stamina exhaustion on dodge
      if (player.stamina < dodgeStaminaCost && !player.exhausted) {
        player.exhausted = true;
        player.exhaustTimer = STAMINA_EXHAUST_DURATION;
        spawnFloatingText(player.x + player.w / 2, player.y - 30, 'LELAH!', C.staminaDark);
      }
    }
  }

  // ==== WEAPON ART (G) v0.7.1 ====
  if (justPressed('KeyG') && !player.dodging && !player.attacking && !player.heavyAttacking && !player.healing && !player.weaponArtActive && player.parryTimer <= 0 && player.weaponArtCooldown <= 0) {
    const waStaminaCost = player.twoHanding ? Math.floor(WEAPON_ART_STAMINA_COST * (1 + TWO_HAND_STAMINA_PENALTY)) : WEAPON_ART_STAMINA_COST;
    if (player.stamina >= waStaminaCost && player.energy >= WEAPON_ART_ENERGY_COST) {
      player.stamina -= waStaminaCost;
      player.energy -= WEAPON_ART_ENERGY_COST;
      player.weaponArtActive = true;
      const weapon = getEquippedWeaponRaw();
      const art = WEAPON_ARTS[weapon] || WEAPON_ARTS.keris;
      player.weaponArtType = weapon;
      player.weaponArtTimer = art.duration;
      player.weaponArtCooldown = WEAPON_ART_COOLDOWN;
      player.attacking = false; player.heavyAttacking = false;
      player.comboWindow = 0; player.parryTimer = 0; player.attackCombo = 0;
      playSound('skill');
      spawnFloatingText(player.x + player.w / 2, player.y - 40, art.name + '!', C.parryGold);
      spawnParticle(player.x + player.w / 2 + player.facing * 20, player.y + player.h / 2, C.gold, 15, 5, 30);
    } else { playSound('noStamina'); }
  }

  // ==== SKILL (Q) ====
  if (justPressed('KeyQ') && player.skillCooldown <= 0 && player.energy >= 30 && !player.dodging && !player.healing && player.parryTimer <= 0) {
    player.skillCooldown = player.skillMaxCooldown;
    player.energy -= 30;
    player.attacking = false; player.heavyAttacking = false; player.comboWindow = 0;
    playSound('skill');
    const skillBox = { x: player.x - 60, y: player.y - 20, w: 120 + player.w, h: player.h + 40 };
    spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.gold, 20, 5, 40);
    entities.forEach(e => {
      if (e.type === 'enemy' && e.alive && rectsOverlapAtk(skillBox, e)) {
        let finalDmg = SKILL_DAMAGE + player.level * 5 + stats.attack;
        if (e.staggered) finalDmg = Math.floor(finalDmg * STAGGER_DAMAGE_MULT);
        damageEnemy(e, finalDmg, entities);
      }
    });
    if (bossActive && boss && boss.alive && rectsOverlapAtk(skillBox, boss)) {
      let finalDmg = SKILL_DAMAGE + player.level * 3 + stats.attack;
      if (boss.staggered) finalDmg = Math.floor(finalDmg * STAGGER_DAMAGE_MULT);
      damageBoss(boss, finalDmg);
    }
  }

  // ==== E KEY: NPC/Puzzle/Heal ====
  if (justPressed('KeyE')) {
    let interacted = false;
    entities.forEach(e => {
      if (interacted) return;
      if (e.type === 'npc') {
        const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
        if (dist < 60) {
          if (e.npcType === 'pedagang') {
            // Open shop instead of dialog
            gameStateRef.value = 'shop';
            interacted = true;
          } else {
            startDialog(e.name, e.dialog);
            interacted = true;
          }
        }
      }
    });
    if (!interacted) {
      entities.forEach(e => {
        if (interacted) return;
        if (e.type === 'puzzleTrigger' && !e.activated) {
          const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
          if (dist < 50) { e.activated = true; initPuzzle(); interacted = true; }
        }
      });
    }

    // ---- BOSS ALTAR INTERACTION ----
    // Check if player is standing on or near a boss altar tile
    if (!interacted) {
      const altarTx = Math.floor((player.x + player.w / 2) / 32);
      const altarTy = Math.floor((player.y + player.h) / 32);
      // Check current tile and nearby tiles for boss altar
      for (let dy = -1; dy <= 0; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = altarTx + dx;
          const ty = altarTy + dy;
          if (tileMap && ty >= 0 && ty < tileMap.length && tx >= 0 && tx < tileMap[0].length) {
            if (tileMap[ty][tx] === TILE_BOSS_ALTAR) {
              const altarPx = tx * 32;
              const altarPy = ty * 32;
              const dist = Math.abs((player.x + player.w / 2) - (altarPx + 16));
              if (dist < ALTAR_INTERACT_RANGE && justPressed('KeyE')) {
                interacted = true;
                return 'interactAltar';
              }
            }
          }
        }
      }
    }

    // ---- EXIT DOOR INTERACTION ----
    if (!interacted) {
      const doorTx = Math.floor((player.x + player.w / 2) / 32);
      const doorTy = Math.floor((player.y + player.h) / 32);
      for (let dy = -1; dy <= 0; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = doorTx + dx;
          const ty = doorTy + dy;
          if (tileMap && ty >= 0 && ty < tileMap.length && tx >= 0 && tx < tileMap[0].length) {
            if (tileMap[ty][tx] === TILE_EXIT_DOOR) {
              const doorPx = tx * 32;
              const doorPy = ty * 32;
              const dist = Math.abs((player.x + player.w / 2) - (doorPx + 16));
              if (dist < DOOR_INTERACT_RANGE && justPressed('KeyE')) {
                interacted = true;
                return 'interactExitDoor';
              }
            }
          }
        }
      }
    }

    // ---- PUZZLE DOOR INTERACTION ----
    if (!interacted) {
      const pTx = Math.floor((player.x + player.w / 2) / 32);
      const pTy = Math.floor((player.y + player.h) / 32);
      for (let dy = -1; dy <= 0; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = pTx + dx;
          const ty = pTy + dy;
          if (tileMap && ty >= 0 && ty < tileMap.length && tx >= 0 && tx < tileMap[0].length) {
            if (tileMap[ty][tx] === TILE_PUZZLE_DOOR) {
              const doorPx = tx * 32;
              const dist = Math.abs((player.x + player.w / 2) - (doorPx + 16));
              if (dist < DOOR_INTERACT_RANGE && justPressed('KeyE')) {
                interacted = true;
                return 'interactPuzzleDoor';
              }
            }
          }
        }
      }
    }

    if (!interacted && !player.dodging && !player.attacking && !player.heavyAttacking && player.parryTimer <= 0) {
      // Souls-like v0.7.1: Two-handing prevents Estus use
      if (player.twoHanding) {
        spawnFloatingText(player.x + player.w / 2, player.y - 30, 'Lepaskan dua tangan dulu!', C.red + '80');
      } else if (player.hp < effectiveMaxHp && player.estus > 0) {
        player.estus--;
        player.healing = true;
        player.healingTimer = 0;
        player.healTicksRemaining = HEAL_TICKS;
        player.healPerTick = ESTUS_HEAL_AMOUNT / HEAL_TICKS;
        player.attacking = false; player.heavyAttacking = false;
        player.comboWindow = 0; player.parryTimer = 0; player.attackCombo = 0;
        playSound('heal');
        spawnFloatingText(player.x + player.w / 2, player.y - 30, `Estus (${player.estus}/${player.estusMax})`, C.green);
        interacted = true;
      }
    }
  }

  // Physics
  applyGravityAndCollision(tileMap);

  // Item pickup
  entities.forEach(e => {
    if (e.type === 'item' && !e.collected && rectsOverlapAtk(player, e)) {
      e.collected = true;
      playSound('pickup');
      switch (e.itemType) {
        case 'potion': {
          // Add potion to inventory
          const potionId = e.subType || 'health';
          if (POTIONS[potionId]) {
            addItem({ id: potionId, type: 'potion', category: 'potion', ...POTIONS[potionId] });
            spawnFloatingText(e.x, e.y - 10, `+${POTIONS[potionId].name}`, C.green);
          } else {
            addItem({ id: 'health', type: 'potion', category: 'potion', ...POTIONS.health });
            spawnFloatingText(e.x, e.y - 10, '+Ramuan Kesehatan', C.green);
          }
          break;
        }
        case 'kristal': player.energy = Math.min(effectiveMaxEnergy, player.energy + 50); spawnFloatingText(e.x, e.y - 10, '+Energi', C.cyan); break;
        case 'kunci': player.keys++; spawnFloatingText(e.x, e.y - 10, '+Kunci', C.gold); break;
        case 'rupiah': player.rupiah += 25; spawnFloatingText(e.x, e.y - 10, '+25 Rupiah', C.goldLight); break;
        case 'equipment': {
          // Parse equipment from subType like "weapon_pedang" or "armor_kulit"
          const parts = (e.subType || '').split('_');
          const cat = parts[0]; // weapon, armor, accessory
          const equipId = parts.slice(1).join('_'); // pedang, kulit, kalung_batu
          let equipData = null;
          if (cat === 'weapon' && WEAPONS[equipId]) equipData = { id: equipId, type: 'equipment', category: 'weapon', ...WEAPONS[equipId] };
          else if (cat === 'armor' && ARMORS[equipId]) equipData = { id: equipId, type: 'equipment', category: 'armor', ...ARMORS[equipId] };
          else if (cat === 'accessory' && ACCESSORIES[equipId]) equipData = { id: equipId, type: 'equipment', category: 'accessory', ...ACCESSORIES[equipId] };
          if (equipData) {
            addItem(equipData);
            spawnFloatingText(e.x, e.y - 10, `+${equipData.name}`, C.gold);
          }
          break;
        }
      }
    }
  });

  // Checkpoint — Souls-like: acts as a bonfire (refills estus, heals, auto-saves)
  const cptx = Math.floor((player.x + player.w / 2) / 32);
  const cpty = Math.floor((player.y + player.h) / 32);
  if (tileMap && cpty >= 0 && cpty < tileMap.length && cptx >= 0 && cptx < tileMap[0].length) {
    if (tileMap[cpty][cptx] === 9) {
      player.checkpoint = { x: player.x, y: player.y };
      tileMap[cpty][cptx] = 0;
      invalidateTile3DCache();
      // Souls-like v0.7.0: Bonfire checkpoint — refill estus and fully heal
      // Souls-like v0.7.1: Cure hollowing at bonfire
      player.hollowing = 0;
      player.hp = effectiveMaxHp;
      player.stamina = effectiveMaxStamina;
      player.energy = effectiveMaxEnergy;
      player.estus = player.estusMax;
      // Clear status effects
      player.poisonTimer = 0;
      player.stunTimer = 0;
      player.slowTimer = 0;
      spawnFloatingText(player.x, player.y - 30, 'Bonfire! Estus Dipulihkan', C.gold);
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.gold, 25, 5, 50);
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.green, 15, 3, 40);
      playSound('checkpoint');

      // Check bloodstain — recover lost Rupiah
      if (player.bloodstain) {
        const bDist = Math.abs(player.x - player.bloodstain.x) + Math.abs(player.y - player.bloodstain.y);
        if (bDist < 100) {
          player.rupiah += player.bloodstain.rupiah;
          spawnFloatingText(player.x, player.y - 50, `+${player.bloodstain.rupiah} Rupiah (Dipulihkan)`, C.goldLight);
          spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.goldLight, 20, 4, 40);
          player.bloodstain = null;
          player.lostRupiah = 0;
        }
      }

      // Auto-save on checkpoint
      if (onCheckpointCallback) onCheckpointCallback();
    }
  }

  // Fall death
  if (tileMap && player.y > tileMap.length * 32 + 100) playerDie();

  // Souls-like v0.7.0: Bloodstain proximity recovery
  // If player walks near their bloodstain, recover lost Rupiah
  if (player.bloodstain) {
    const bDist = Math.abs(player.x - player.bloodstain.x) + Math.abs(player.y - player.bloodstain.y);
    if (bDist < 40) {
      player.rupiah += player.bloodstain.rupiah;
      spawnFloatingText(player.x, player.y - 40, `+${player.bloodstain.rupiah} Rupiah!`, C.goldLight);
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.goldLight, 20, 4, 40);
      playSound('pickup');
      player.bloodstain = null;
      player.lostRupiah = 0;
    }
  }

  // Energy regen
  if (player.energy < effectiveMaxEnergy) player.energy += 0.05;

  // Animation
  player.animTimer++;
  if (player.animTimer > 8) { player.animTimer = 0; player.animFrame = (player.animFrame + 1) % 4; }

  // State
  if (player.healing) player.state = 'heal';
  else if (player.visceralActive) player.state = 'heavyAttack'; // Reuse heavy attack visual
  else if (player.weaponArtActive) player.state = 'heavyAttack';
  else if (player.dodging) player.state = 'dodge';
  else if (player.poiseStaggerTimer > 0) player.state = 'hurt';
  else if (player.exhausted) player.state = 'hurt';
  else if (player.heavyAttacking) player.state = 'heavyAttack';
  else if (player.attacking) player.state = 'attack';
  else if (player.parryTimer > 0) player.state = 'parry';
  else if (player.hurtTimer > 0) player.state = 'hurt';
  else if (player.stunTimer > 0) player.state = 'hurt';
  else if (!player.grounded && player.vy < 0) player.state = 'jump';
  else if (!player.grounded) player.state = 'fall';
  else if (Math.abs(player.vx) > 0.5) player.state = 'run';
  else player.state = 'idle';

  // Boss is no longer auto-triggered by position.
  // Instead, player must interact with boss altar (E key) to summon.
  // Boss trigger is handled by 'interactAltar' return value.
  return null;
}

function applyGravityAndCollision(tileMap) {
  // Check if player is in water (tile type 4)
  const wtx = Math.floor((player.x + player.w / 2) / 32);
  const wty = Math.floor((player.y + player.h / 2) / 32);
  const waterTile = getTileType(wtx, wty);
  player.inWater = waterTile === 4;

  if (player.inWater) {
    // Water swimming: reduced gravity, swim-up with jump
    player.vy += WATER_GRAVITY;
    if (player.vy > MAX_FALL * 0.4) player.vy = MAX_FALL * 0.4; // slower sink
    // Swim up when pressing jump
    if (inputKeys['ArrowUp'] || inputKeys['KeyW']) {
      player.vy += SWIM_FORCE * 0.15; // gradual swim-up
    }
  } else {
    player.vy += GRAVITY;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;
  }

  player.x += player.vx;
  const colsX = tileCollision(player.x, player.y, player.w, player.h, player.prevY);
  colsX.forEach(c => {
    if (c.oneway) return;
    if (player.vx > 0) player.x = c.x - player.w;
    else if (player.vx < 0) player.x = c.x + c.w;
  });
  player.y += player.vy;
  player.grounded = false;
  const colsY = tileCollision(player.x, player.y, player.w, player.h, player.prevY);
  colsY.forEach(c => {
    if (player.vy > 0) { player.y = c.y - player.h; player.vy = 0; player.grounded = true; }
    else if (player.vy < 0 && !c.oneway) { player.y = c.y + c.h; player.vy = 0; }
  });
}

function rectsOverlapAtk(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- WEAPON ART HIT EXECUTION v0.7.1 ----
function executeWeaponArtHit(art, entities, boss, bossActive, stats) {
  let baseDmg = (stats.attack + player.level * 3) * art.damageMult;
  // Souls-like v0.7.1: Two-handing damage bonus
  if (player.twoHanding) baseDmg = Math.floor(baseDmg * TWO_HAND_DAMAGE_MULT);
  const atkBox = {
    x: player.facing > 0 ? player.x + player.w : player.x - art.range,
    y: player.y - 15, w: art.range, h: player.h + 30,
  };

  playSound('heavyAttack');

  let hitCount = 0;
  // Enemy hits
  entities.forEach(e => {
    if (e.type === 'enemy' && e.alive && rectsOverlapAtk(atkBox, e)) {
      let dmg = e.staggered ? Math.floor(baseDmg * POSTURE_BREAK_DAMAGE_MULT) : Math.floor(baseDmg);
      damageEnemy(e, dmg, entities);
      hitCount++;
    }
  });
  // Boss hit
  if (bossActive && boss && boss.alive && rectsOverlapAtk(atkBox, boss)) {
    damageBoss(boss, Math.floor(baseDmg));
    hitCount++;
  }

  // Visual effects based on weapon art type
  const cx = player.x + player.w / 2 + player.facing * 30;
  const cy = player.y + player.h / 2;
  switch (art.type) {
    case 'thrust':
      spawnParticle(cx, cy, C.gold, 20, 8, 25);
      shakeRef.timer = 6; shakeRef.intensity = SCREEN_SHAKE_HEAVY;
      hitStopRef.value = HIT_STOP_HEAVY;
      break;
    case 'spin':
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        spawnParticle(cx + Math.cos(angle) * 20, cy + Math.sin(angle) * 20, C.gold, 5, 3, 20);
      }
      shakeRef.timer = 8; shakeRef.intensity = SCREEN_SHAKE_HEAVY;
      hitStopRef.value = HIT_STOP_HEAVY;
      break;
    case 'sweep':
      for (let i = 0; i < 12; i++) {
        spawnParticle(cx + player.facing * i * 8, cy - 10 + Math.sin(i * 0.5) * 15, C.goldLight, 5, 3, 25);
      }
      shakeRef.timer = 6; shakeRef.intensity = SCREEN_SHAKE_HEAVY;
      hitStopRef.value = HIT_STOP_HEAVY;
      break;
    case 'beam':
      for (let i = 0; i < 15; i++) {
        spawnParticle(cx + player.facing * i * 12, cy, C.goldLight, 4, 2, 30);
      }
      shakeRef.timer = 10; shakeRef.intensity = SCREEN_SHAKE_CRIT;
      hitStopRef.value = HIT_STOP_PARRY;
      break;
    case 'rain':
      for (let i = 0; i < 8; i++) {
        const rx = player.x + (Math.random() - 0.5) * art.range;
        particles.push({
          x: rx, y: player.y - 200, vx: 0, vy: 6,
          life: 40, maxLife: 40, color: C.orange, size: 5,
          isProjectile: true, damage: Math.floor(baseDmg / 8),
        });
      }
      shakeRef.timer = 8; shakeRef.intensity = SCREEN_SHAKE_HEAVY;
      break;
    case 'divine':
      spawnParticle(cx, cy, C.goldLight, 30, 8, 50);
      spawnParticle(cx, cy - 30, C.parryGold, 20, 6, 40);
      shakeRef.timer = 12; shakeRef.intensity = SCREEN_SHAKE_CRIT;
      hitStopRef.value = HIT_STOP_PARRY;
      break;
  }

  // Rally recovery from weapon art hits
  if (hitCount > 0 && player.rallyHp > 0) {
    const rallyRecovery = Math.floor(player.rallyHp * RALLY_RECOVERY_PCT);
    player.hp = Math.min(player.hp + rallyRecovery, getStats().maxHp);
    player.rallyHp = 0;
    player.rallyTimer = 0;
    spawnFloatingText(player.x, player.y - 50, `+${rallyRecovery} HP (Rally!)`, C.goldLight);
  }
}

export function damagePlayer(amount) {
  if (player.invincible > 0 || player.dodging) return;
  // Souls-like v0.7.0: Check parry active window
  if (player.parryWindow > 0) {
    parryFlashRef.timer = 15;
    player.invincible = 20;
    // Souls-like v0.7.1: Open visceral attack window after parry
    player.visceralWindow = VISCERAL_WINDOW;
    // Souls-like: Parry refunds stamina
    player.stamina = Math.min(player.stamina + PARRY_STAMINA_REFUND, getStats().maxStamina);
    playSound('parrySuccess');
    spawnParticle(player.x + player.w / 2 + player.facing * 15, player.y + player.h / 2, C.parryGold, 20, 6, 35);
    spawnFloatingText(player.x, player.y - 30, 'PARRY!', C.parryGold);
    shakeRef.timer = 3; shakeRef.intensity = SCREEN_SHAKE_LIGHT;
    hitStopRef.value = HIT_STOP_PARRY;
    // Set combat timer
    player.combatTimer = 120;
    return;
  }
  if (player.healing) player.healing = false;

  // Apply defense from equipment
  const stats = getStats();
  const defense = stats.defense || 0;
  const reducedDamage = Math.max(1, amount - defense);

  // Souls-like v0.7.1: Rally system — store recently lost HP for recovery
  player.rallyHp += reducedDamage;
  player.rallyTimer = RALLY_DURATION;

  player.hp -= reducedDamage;
  player.invincible = INV_FRAMES;
  player.hurtTimer = 15;
  // Souls-like v0.7.0: Taking damage triggers combat state
  player.combatTimer = 180; // 3 seconds in combat after taking damage

  // Souls-like v0.7.1: Poise damage — reduce poise, stagger on break
  player.poise -= reducedDamage * 0.5;
  if (player.poise <= 0 && player.poiseStaggerTimer <= 0) {
    player.poise = 0;
    player.poiseStaggerTimer = PLAYER_STAGGER_DURATION;
    spawnFloatingText(player.x, player.y - 40, 'POISE BREAK!', C.red);
    shakeRef.timer = 10; shakeRef.intensity = SCREEN_SHAKE_CRIT;
    hitStopRef.value = HIT_STOP_PARRY;
  }

  playSound('damage');
  spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.red, 12, 4);
  spawnFloatingText(player.x + player.w / 2, player.y - 30, `-${reducedDamage}`, C.red);
  shakeRef.timer = 8; shakeRef.intensity = SCREEN_SHAKE_HEAVY;
  hitStopRef.value = HIT_STOP_FRAMES;
  if (player.hp <= 0) { player.hp = 0; playerDie(); }
}

export function playerDie() {
  // Souls-like v0.7.0: Death penalty — lose Rupiah, create bloodstain for recovery
  const lostRupiah = Math.floor(player.rupiah * DEATH_RUPIAH_LOSS_PCT);
  player.rupiah = Math.max(0, player.rupiah - lostRupiah);
  if (lostRupiah > 0) {
    spawnFloatingText(player.x + player.w / 2, player.y - 30, `-${lostRupiah} Rupiah`, C.red);
    // Create bloodstain at death location for Rupiah recovery
    const recoverableRupiah = Math.floor(lostRupiah * DEATH_RUPIAH_RECOVERY);
    player.bloodstain = { x: player.x, y: player.y, rupiah: recoverableRupiah };
    player.lostRupiah = recoverableRupiah;
  }
  // Store last lost rupiah for death screen display
  player.lastLostRupiah = lostRupiah;

  // Souls-like v0.7.1: Hollowing — consecutive deaths reduce max HP
  player.hollowing = Math.min(HOLLOWING_MAX_LEVEL, player.hollowing + 1);

  gameStateRef.value = 'gameOver';
  deathCountRef.value++;
  spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.red, 40, 6, 60);
  // Blood particles — more dramatic death
  for (let i = 0; i < 8; i++) {
    spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.redDark + 'AA', 5, 4, 50);
  }
}

export function damageEnemy(e, amount, entities) {
  // Souls-like v0.7.0: Backstab check — bonus damage from behind
  const isBehindEnemy = (player.facing > 0 && e.facing < 0) || (player.facing < 0 && e.facing > 0);
  if (isBehindEnemy && !e.staggered) {
    amount = Math.floor(amount * BACKSTAB_DAMAGE_MULT);
    spawnFloatingText(e.x + e.w / 2, e.y - 25, 'BACKSTAB!', C.parryGold);
  }

  // Souls-like v0.7.0: Posture break bonus — more damage on staggered enemies
  if (e.staggered) {
    amount = Math.floor(amount * POSTURE_BREAK_DAMAGE_MULT);
  }

  e.hp -= amount;
  e.hurtTimer = 10;
  player.combatTimer = 120; // Enter combat state when dealing damage
  playSound('hit');
  spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.orange, 8, 4);
  spawnFloatingText(e.x + e.w / 2, e.y - 10, `-${amount}`, C.goldLight);
  shakeRef.timer = 3; shakeRef.intensity = SCREEN_SHAKE_LIGHT;
  hitStopRef.value = HIT_STOP_FRAMES;

  // Souls-like v0.7.1: Rally recovery — recover recently lost HP by attacking
  if (player.rallyHp > 0 && player.rallyTimer > 0) {
    const rallyRecovery = Math.floor(amount * RALLY_RECOVERY_PCT);
    if (rallyRecovery > 0) {
      player.hp = Math.min(player.hp + rallyRecovery, getStats().maxHp);
      player.rallyHp = Math.max(0, player.rallyHp - rallyRecovery);
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.goldLight, 5, 2, 15);
      if (player.rallyHp <= 0) {
        player.rallyHp = 0;
        player.rallyTimer = 0;
      }
    }
  }

  if (e.hp <= 0) {
    e.alive = false;
    spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.stone, 15, 4, 40);
    const exp = e.exp || (e.enemyType === 'patung' ? 20 : 10);
    gainExp(exp);
    const rupiahDrop = e.rupiahDrop || 10;
    if (Math.random() < 0.3) {
      player.rupiah += rupiahDrop;
      spawnFloatingText(e.x, e.y - 20, `+${rupiahDrop} Rupiah`, C.goldLight);
    }
    // Random potion drop
    if (Math.random() < 0.15) {
      const potionTypes = ['health', 'stamina', 'strength', 'defense', 'speed'];
      const dropType = potionTypes[Math.floor(Math.random() * potionTypes.length)];
      entities.push({
        type: 'item', itemType: 'potion', subType: dropType,
        x: e.x, y: e.y, w: 16, h: 16, collected: false, bobOffset: Math.random() * Math.PI * 2,
      });
    }
    // Stage-appropriate equipment drop
    const dropRate = getEquipmentDropRate(e.enemyType);
    if (Math.random() < dropRate) {
      const drop = getRandomEquipmentDropForStage(player.currentStageId || 0);
      entities.push({
        type: 'item', itemType: drop.type, subType: drop.subType,
        x: e.x, y: e.y, w: 16, h: 16, collected: false, bobOffset: Math.random() * Math.PI * 2,
      });
    }
  }
}

export function damageBoss(boss, amount) {
  if (!boss || boss.invincible > 0) return;
  boss.posture = Math.min(boss.maxPosture, boss.posture + amount * 0.8);
  if (boss.posture >= boss.maxPosture && !boss.staggered) {
    boss.staggered = true;
    boss.staggerTimer = 60;
    boss.isTelegraphing = false;
    boss.telegraphTimer = 0;
    boss.recoveryTimer = 0;
    playSound('stagger');
    spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.gold, 20, 5, 40);
    spawnFloatingText(boss.x + boss.w / 2, boss.y - 20, 'STAGGERED!', C.parryGold);
    shakeRef.timer = 8; shakeRef.intensity = 5;
  }
  boss.hp -= amount;
  boss.hurtTimer = 8;
  boss.invincible = 20;
  playSound('hit');
  spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.orange, 8, 4);
  spawnFloatingText(boss.x + boss.w / 2, boss.y - 10, `-${amount}`, C.goldLight);
  shakeRef.timer = 5; shakeRef.intensity = 3;
  hitStopRef.value = HIT_STOP_FRAMES;
  if (boss.hp <= 0) {
    boss.alive = false;
    spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.gold, 40, 6, 60);
    const bossExp = [100, 150, 200, 250, 400][boss.stageId || 0] || 100;
    gainExp(bossExp);
    // Only award artifact if this stage hasn't been cleared before
    // Boss can still be re-fought for grinding (EXP + Rupiah)
    const stageId = boss.stageId || 0;
    if (!clearedStagesRef[stageId]) {
      player.artifacts++;
    }
    const bossRupiah = [50, 80, 120, 160, 250][boss.stageId || 0] || 50;
    player.rupiah += bossRupiah;
    // Boss guaranteed equipment drop
    const bossDrop = getBossDrop(boss.stageId || 0);
    if (bossDrop) {
      // We need entities reference - push via a callback or use global state
      // Since damageBoss doesn't have entities, we'll add it to a drop queue
      bossDropQueue.push(bossDrop);
    }
    // BUG FIX v0.7.0: Replace setTimeout with frame-based victory timer
    // to prevent race condition if player dies within 1.5s of boss death.
    // Also added game state check to prevent victory timer from
    // overriding game over state.
    hitStopRef.value = 90; // dramatic pause
    if (typeof window !== 'undefined' && window.__nusaVictoryTimer) {
      // Clean up any previous timer (no clearInterval needed - it's a plain object)
      window.__nusaVictoryTimer = null;
    }
    window.__nusaVictoryTimer = { frames: 90 };

  }
}

export function gainExp(amount) {
  player.exp += amount;
  spawnFloatingText(player.x, player.y - 30, `+${amount} EXP`, C.cyan);
  while (player.exp >= player.expNext) {
    player.exp -= player.expNext;
    player.level++;
    player.expNext = Math.floor(player.expNext * 1.5);
    // Base stat increases
    const stats = getStats();
    player.hp = stats.maxHp;
    player.energy = stats.maxEnergy;
    player.stamina = stats.maxStamina;
    // Grant skill points
    inventory.skillPoints += SKILL_POINTS_PER_LEVEL;
    spawnFloatingText(player.x, player.y - 50, `LEVEL UP! Lv.${player.level}`, C.gold);
    spawnFloatingText(player.x, player.y - 70, `+${SKILL_POINTS_PER_LEVEL} Poin Keahlian`, C.cyan);
    spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.gold, 25, 5, 50);
    playSound('checkpoint');
  }
}

export function resetPlayer() {
  const stats = getComputedStats(1);
  const startY = GROUND_Y - 36;
  Object.assign(player, {
    x: 80, y: startY, prevY: startY, vx: 0, vy: 0,
    hp: stats.maxHp, maxHp: stats.maxHp, level: 1, exp: 0, expNext: 50,
    facing: 1, grounded: false,
    coyoteTimer: 0, jumpBufferTimer: 0,
    attacking: false, attackTimer: 0, attackCombo: 0,
    comboWindow: 0, attackHit: false,
    heavyAttacking: false, heavyAttackTimer: 0, heavyAttackHit: false,
    parryTimer: 0, parryWindow: 0,
    dodging: false, dodgeTimer: 0, dodgeDir: 1,
    invincible: 0, skillCooldown: 0, skillMaxCooldown: 180,
    energy: stats.maxEnergy, maxEnergy: stats.maxEnergy,
    stamina: stats.maxStamina, maxStamina: stats.maxStamina,
    healing: false, healingTimer: 0, healTicksRemaining: 0, healPerTick: 0,
    artifacts: 0, rupiah: 0,
    potions: 0, keys: 0, hurtTimer: 0,
    checkpoint: { x: 80, y: startY },
    poisonTimer: 0, stunTimer: 0, slowTimer: 0, lavaDamageTimer: 0,
    currentStageId: 0,
    lastLostRupiah: 0,
    dropThrough: 0, inWater: false,
    // Souls-like v0.7.0 fields
    estus: ESTUS_MAX, estusMax: ESTUS_MAX,
    bloodstain: null, lostRupiah: 0,
    staminaRegenDelay: 0, dodgeIFrame: 0,
    inCombat: false, combatTimer: 0,
    bonfireHealing: false, bonfireHealTimer: 0,
    // Souls-like v0.7.1 fields
    rallyHp: 0, rallyTimer: 0,
    poise: PLAYER_MAX_POISE, maxPoise: PLAYER_MAX_POISE, poiseStaggerTimer: 0,
    exhausted: false, exhaustTimer: 0,
    weaponArtActive: false, weaponArtTimer: 0, weaponArtCooldown: 0, weaponArtType: null,
  });
}

export function respawnPlayer() {
  const stats = getStats();
  player.x = player.checkpoint.x;
  player.y = player.checkpoint.y;
  player.prevY = player.y;
  player.hp = stats.maxHp;
  player.stamina = stats.maxStamina;
  player.energy = stats.maxEnergy;
  player.vy = 0; player.vx = 0;
  player.invincible = 60;
  player.attacking = false; player.heavyAttacking = false;
  player.dodging = false; player.healing = false;
  player.parryTimer = 0; player.comboWindow = 0;
  player.attackCombo = 0; player.hurtTimer = 0;
  player.coyoteTimer = 0; player.jumpBufferTimer = 0;
  player.poisonTimer = 0; player.stunTimer = 0; player.slowTimer = 0;
  player.lavaDamageTimer = 0;
  player.dropThrough = 0; player.inWater = false;
  // Souls-like v0.7.0: Reset combat state and stamina regen on respawn
  player.staminaRegenDelay = 0;
  player.dodgeIFrame = 0;
  player.combatTimer = 0;
  player.inCombat = false;
  player.bonfireHealing = false;
  player.bonfireHealTimer = 0;
  // Souls-like v0.7.1: Reset rally, poise, exhaustion, weapon art
  player.rallyHp = 0; player.rallyTimer = 0;
  player.poise = player.maxPoise; player.poiseStaggerTimer = 0;
  player.exhausted = false; player.exhaustTimer = 0;
  player.weaponArtActive = false; player.weaponArtTimer = 0;
  player.weaponArtCooldown = 0; player.weaponArtType = null;
  // Estus is NOT refilled on respawn (only at bonfires)
  gameStateRef.value = 'playing';
}

// Get nearby interactable info for HUD display
export function getNearbyInteractable(tileMap) {
  if (!tileMap) return null;
  const cx = Math.floor((player.x + player.w / 2) / 32);
  const cy = Math.floor((player.y + player.h) / 32);

  for (let dy = -1; dy <= 0; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      if (ty >= 0 && ty < tileMap.length && tx >= 0 && tx < tileMap[0].length) {
        const tile = tileMap[ty][tx];
        if (tile === TILE_BOSS_ALTAR) {
          return { type: 'bossAltar', x: tx * 32, y: ty * 32 };
        }
        if (tile === TILE_EXIT_DOOR) {
          return { type: 'exitDoor', x: tx * 32, y: ty * 32 };
        }
        if (tile === TILE_PUZZLE_DOOR) {
          return { type: 'puzzleDoor', x: tx * 32, y: ty * 32 };
        }
      }
    }
  }
  return null;
}
