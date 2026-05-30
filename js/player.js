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
} from './config.js';
import { playSound } from './audio.js';
import { justPressed } from './input.js';
import { tileCollision } from './physics.js';
import { spawnParticle, spawnFloatingText } from './particles.js';

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
  potions: 3, keys: 0,
};

// Shared mutable state references (set from game.js)
let gameStateRef = { value: 'menu' };
let hitStopRef = { value: 0 };
let shakeRef = { timer: 0, intensity: 0 };
let parryFlashRef = { timer: 0 };
let deathCountRef = { value: 0 };

export function setStateRefs(gs, hs, sh, pf, dc) {
  gameStateRef = gs; hitStopRef = hs; shakeRef = sh;
  parryFlashRef = pf; deathCountRef = dc;
}

export function updatePlayer(keys, entities, boss, bossActive, puzzleState, tileMap, startDialog, initPuzzle) {
  if (hitStopRef.value > 0) return;

  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.invincible > 0) player.invincible--;
  if (player.skillCooldown > 0) player.skillCooldown--;
  player.prevY = player.y;

  // ---- HEALING ----
  if (player.healing) {
    player.healingTimer++;
    if (player.healingTimer % Math.floor(HEAL_ANIMATION_DURATION / HEAL_TICKS) === 0 && player.healTicksRemaining > 0) {
      player.hp = Math.min(player.maxHp, player.hp + player.healPerTick);
      player.healTicksRemaining--;
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.green, 2, 1, 15);
    }
    if (player.healingTimer >= HEAL_ANIMATION_DURATION) player.healing = false;
    player.vx = 0;
    applyGravityAndCollision(tileMap);
    return;
  }

  // ---- STAMINA REGEN ----
  const isExerting = player.dodging || player.attacking || player.heavyAttacking || player.parryTimer > 0;
  if (!isExerting && player.stamina < player.maxStamina) {
    player.stamina = Math.min(player.maxStamina, player.stamina + STAMINA_REGEN);
  }

  // ---- COYOTE TIME ----
  if (player.grounded) player.coyoteTimer = COYOTE_TIME;
  else if (player.coyoteTimer > 0) player.coyoteTimer--;

  // ---- JUMP BUFFER ----
  if (justPressed('ArrowUp') || justPressed('KeyW')) player.jumpBufferTimer = JUMP_BUFFER_TIME;
  else if (player.jumpBufferTimer > 0) player.jumpBufferTimer--;

  // ---- PARRY ----
  if (player.parryTimer > 0) {
    player.parryTimer--;
    player.parryWindow = player.parryTimer > (PARRY_DURATION - PARRY_WINDOW)
      ? player.parryTimer - (PARRY_DURATION - PARRY_WINDOW) : 0;
    player.vx = 0;
    applyGravityAndCollision(tileMap);
    return;
  } else {
    player.parryWindow = 0;
  }

  // ---- DODGE ----
  if (player.dodging) {
    player.dodgeTimer--;
    player.vx = player.dodgeDir * DODGE_SPEED;
    player.invincible = 3;
    if (player.dodgeTimer <= 0) player.dodging = false;
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
      entities.forEach(e => {
        if (e.type === 'enemy' && e.alive && rectsOverlapAtk(atkBox, e))
          damageEnemy(e, HEAVY_ATTACK_DAMAGE + player.level * 3, entities);
      });
      if (bossActive && boss && boss.alive && rectsOverlapAtk(atkBox, boss))
        damageBoss(boss, HEAVY_ATTACK_DAMAGE + player.level * 4);
      spawnParticle(player.x + player.w / 2 + player.facing * 30, player.y + player.h / 2, C.gold, 12, 5, 25);
      shakeRef.timer = 5; shakeRef.intensity = 4;
    }
    if (player.heavyAttackTimer <= 0) player.heavyAttacking = false;
  }
  // ---- COMBO WINDOW ----
  else if (player.comboWindow > 0) {
    player.comboWindow--;
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { player.vx = -PLAYER_SPEED; player.facing = -1; }
    if (keys['ArrowRight'] || keys['KeyD']) { player.vx = PLAYER_SPEED; player.facing = 1; }
  }
  // ---- NORMAL ----
  else {
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) { player.vx = -PLAYER_SPEED; player.facing = -1; }
    if (keys['ArrowRight'] || keys['KeyD']) { player.vx = PLAYER_SPEED; player.facing = 1; }
  }

  // ==== JUMP (outside else blocks) ====
  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0 && !player.healing) {
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

  // ==== LIGHT ATTACK (SPACE) ====
  if (justPressed('Space') && !player.dodging && !player.heavyAttacking && !player.healing && player.parryTimer <= 0) {
    if (player.stamina >= STAMINA_LIGHT_COST) {
      player.stamina -= STAMINA_LIGHT_COST;
      player.attacking = true;
      player.attackHit = false;
      player.comboWindow = 0;
      let dmg, dur;
      if (player.attackCombo === 0) { dmg = COMBO_1_DAMAGE + player.level * 2; dur = COMBO_1_DURATION; }
      else if (player.attackCombo === 1) { dmg = COMBO_2_DAMAGE + player.level * 2; dur = COMBO_2_DURATION; }
      else { dmg = COMBO_3_DAMAGE + player.level * 3; dur = COMBO_3_DURATION; }
      player.attackTimer = dur;
      playSound('attack');
      const atkBox = {
        x: player.facing > 0 ? player.x + player.w : player.x - ATTACK_RANGE,
        y: player.y - 5, w: ATTACK_RANGE, h: player.h + 10,
      };
      entities.forEach(e => {
        if (e.type === 'enemy' && e.alive && rectsOverlapAtk(atkBox, e)) {
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
    } else { playSound('noStamina'); }
  }

  // ==== HEAVY ATTACK (F) ====
  if (justPressed('KeyF') && !player.dodging && !player.attacking && !player.heavyAttacking && !player.healing && player.parryTimer <= 0) {
    if (player.stamina >= STAMINA_HEAVY_COST && player.energy >= HEAVY_ATTACK_ENERGY) {
      player.stamina -= STAMINA_HEAVY_COST;
      player.energy -= HEAVY_ATTACK_ENERGY;
      player.heavyAttacking = true;
      player.heavyAttackTimer = HEAVY_ATTACK_DURATION;
      player.heavyAttackHit = false;
      player.comboWindow = 0;
      player.attackCombo = 0;
      playSound('heavyAttack');
    } else { playSound('noStamina'); }
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
    if (!player.dodging && player.stamina >= STAMINA_DODGE_COST) {
      player.stamina -= STAMINA_DODGE_COST;
      player.attacking = false; player.heavyAttacking = false;
      player.comboWindow = 0; player.parryTimer = 0; player.attackCombo = 0;
      player.dodging = true;
      player.dodgeTimer = DODGE_DURATION;
      player.dodgeDir = player.facing;
      playSound('dodge');
    } else if (!player.dodging) { playSound('noStamina'); }
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
        let finalDmg = SKILL_DAMAGE + player.level * 5;
        if (e.staggered) finalDmg = Math.floor(finalDmg * STAGGER_DAMAGE_MULT);
        damageEnemy(e, finalDmg, entities);
      }
    });
    if (bossActive && boss && boss.alive && rectsOverlapAtk(skillBox, boss)) {
      let finalDmg = SKILL_DAMAGE + player.level * 3;
      if (boss.staggered) finalDmg = Math.floor(finalDmg * STAGGER_DAMAGE_MULT);
      damageBoss(boss, finalDmg);
    }
  }

  // ==== E KEY: NPC/Puzzle/Healing ====
  if (justPressed('KeyE')) {
    let interacted = false;
    entities.forEach(e => {
      if (interacted) return;
      if (e.type === 'npc') {
        const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
        if (dist < 60) { startDialog(e.name, e.dialog); interacted = true; }
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
    if (!interacted && player.potions > 0 && player.hp < player.maxHp && !player.dodging && !player.attacking && !player.heavyAttacking && player.parryTimer <= 0) {
      player.potions--;
      player.healing = true;
      player.healingTimer = 0;
      player.healTicksRemaining = HEAL_TICKS;
      player.healPerTick = HEAL_AMOUNT / HEAL_TICKS;
      player.attacking = false; player.heavyAttacking = false;
      player.comboWindow = 0; player.parryTimer = 0; player.attackCombo = 0;
      playSound('heal');
      interacted = true;
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
        case 'potion': player.potions++; spawnFloatingText(e.x, e.y - 10, '+Ramuan', C.green); break;
        case 'kristal': player.energy = Math.min(player.maxEnergy, player.energy + 50); spawnFloatingText(e.x, e.y - 10, '+Energi', C.cyan); break;
        case 'kunci': player.keys++; spawnFloatingText(e.x, e.y - 10, '+Kunci', C.gold); break;
        case 'rupiah': player.rupiah += 25; spawnFloatingText(e.x, e.y - 10, '+25 Rupiah', C.goldLight); break;
      }
    }
  });

  // Checkpoint
  const ptx = Math.floor((player.x + player.w / 2) / 32);
  const pty = Math.floor((player.y + player.h) / 32);
  if (tileMap && pty >= 0 && pty < tileMap.length && ptx >= 0 && ptx < tileMap[0].length) {
    if (tileMap[pty][ptx] === 9) {
      player.checkpoint = { x: player.x, y: player.y };
      tileMap[pty][ptx] = 0;
      spawnFloatingText(player.x, player.y - 30, 'Checkpoint!', C.gold);
      spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.gold, 15, 3, 40);
      playSound('checkpoint');
    }
  }

  // Fall death
  if (tileMap && player.y > tileMap.length * 32 + 100) playerDie();

  // Energy regen
  if (player.energy < player.maxEnergy) player.energy += 0.05;

  // Animation
  player.animTimer++;
  if (player.animTimer > 8) { player.animTimer = 0; player.animFrame = (player.animFrame + 1) % 4; }

  // State
  if (player.healing) player.state = 'heal';
  else if (player.dodging) player.state = 'dodge';
  else if (player.heavyAttacking) player.state = 'heavyAttack';
  else if (player.attacking) player.state = 'attack';
  else if (player.parryTimer > 0) player.state = 'parry';
  else if (player.hurtTimer > 0) player.state = 'hurt';
  else if (!player.grounded && player.vy < 0) player.state = 'jump';
  else if (!player.grounded) player.state = 'fall';
  else if (Math.abs(player.vx) > 0.5) player.state = 'run';
  else player.state = 'idle';

  // Boss trigger
  if (player.x > 68 * 32 && puzzleState && puzzleState.solved && !bossActive && boss && boss.alive) {
    return 'triggerBoss';
  }
  return null;
}

function applyGravityAndCollision(tileMap) {
  player.vy += GRAVITY;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;
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

export function damagePlayer(amount) {
  if (player.invincible > 0 || player.dodging) return;
  if (player.parryWindow > 0) {
    parryFlashRef.timer = 15;
    player.invincible = 20;
    playSound('parrySuccess');
    spawnParticle(player.x + player.w / 2 + player.facing * 15, player.y + player.h / 2, C.parryGold, 15, 5, 30);
    spawnFloatingText(player.x, player.y - 30, 'PARRY!', C.parryGold);
    shakeRef.timer = 3; shakeRef.intensity = 2;
    return;
  }
  if (player.healing) player.healing = false;
  player.hp -= amount;
  player.invincible = INV_FRAMES;
  player.hurtTimer = 15;
  playSound('damage');
  spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.red, 8, 3);
  shakeRef.timer = 8; shakeRef.intensity = 4;
  if (player.hp <= 0) { player.hp = 0; playerDie(); }
}

export function playerDie() {
  gameStateRef.value = 'gameOver';
  deathCountRef.value++;
  spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.red, 30, 5, 60);
}

export function damageEnemy(e, amount, entities) {
  e.hp -= amount;
  e.hurtTimer = 10;
  playSound('hit');
  spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.orange, 6, 3);
  spawnFloatingText(e.x + e.w / 2, e.y - 10, `-${amount}`, C.goldLight);
  shakeRef.timer = 3; shakeRef.intensity = 2;
  hitStopRef.value = HIT_STOP_FRAMES;
  if (e.hp <= 0) {
    e.alive = false;
    spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.stone, 15, 4, 40);
    gainExp(e.enemyType === 'patung' ? 20 : 10);
    if (Math.random() < 0.3) {
      player.rupiah += 10;
      spawnFloatingText(e.x, e.y - 20, '+10 Rupiah', C.goldLight);
    }
  }
}

export function damageBoss(boss, amount) {
  if (!boss || boss.invincible > 0) return;
  boss.posture = Math.min(boss.maxPosture, boss.posture + amount * 0.8);
  if (boss.posture >= boss.maxPosture && !boss.staggered) {
    boss.staggered = true;
    boss.staggerTimer = 60; // BOSS_STAGGER_DURATION
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
    gainExp(100);
    player.artifacts++;
    setTimeout(() => { gameStateRef.value = 'victory'; }, 1500);
  }
}

export function gainExp(amount) {
  player.exp += amount;
  spawnFloatingText(player.x, player.y - 30, `+${amount} EXP`, C.cyan);
  while (player.exp >= player.expNext) {
    player.exp -= player.expNext;
    player.level++;
    player.expNext = Math.floor(player.expNext * 1.5);
    player.maxHp += 10; player.hp = player.maxHp;
    player.maxEnergy += 5; player.energy = player.maxEnergy;
    player.maxStamina += 5; player.stamina = player.maxStamina;
    spawnFloatingText(player.x, player.y - 50, `LEVEL UP! Lv.${player.level}`, C.gold);
    spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.gold, 25, 5, 50);
  }
}

export function resetPlayer() {
  const startY = GROUND_Y - player.h;
  Object.assign(player, {
    x: 80, y: startY, prevY: startY, vx: 0, vy: 0,
    hp: 100, maxHp: 100, level: 1, exp: 0, expNext: 50,
    facing: 1, grounded: false,
    coyoteTimer: 0, jumpBufferTimer: 0,
    attacking: false, attackTimer: 0, attackCombo: 0,
    comboWindow: 0, attackHit: false,
    heavyAttacking: false, heavyAttackTimer: 0, heavyAttackHit: false,
    parryTimer: 0, parryWindow: 0,
    dodging: false, dodgeTimer: 0, dodgeDir: 1,
    invincible: 0, skillCooldown: 0, skillMaxCooldown: 180,
    energy: 100, maxEnergy: 100,
    stamina: MAX_STAMINA, maxStamina: MAX_STAMINA,
    healing: false, healingTimer: 0, healTicksRemaining: 0, healPerTick: 0,
    artifacts: 0, rupiah: 0,
    potions: 3, keys: 0, hurtTimer: 0,
    checkpoint: { x: 80, y: startY },
  });
}

export function respawnPlayer() {
  player.x = player.checkpoint.x;
  player.y = player.checkpoint.y;
  player.prevY = player.y;
  player.hp = player.maxHp;
  player.stamina = player.maxStamina;
  player.energy = player.maxEnergy;
  player.vy = 0; player.vx = 0;
  player.invincible = 60;
  player.attacking = false; player.heavyAttacking = false;
  player.dodging = false; player.healing = false;
  player.parryTimer = 0; player.comboWindow = 0;
  player.attackCombo = 0; player.hurtTimer = 0;
  player.coyoteTimer = 0; player.jumpBufferTimer = 0;
  gameStateRef.value = 'playing';
}
