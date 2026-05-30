// ============================================================
// enemy.js — Enemy update logic (telegraph, stagger, patrol, special abilities)
// ============================================================

import { GRAVITY, MAX_FALL, HIT_STOP_FRAMES, C } from './config.js';
import { playSound } from './audio.js';
import { tileCollision } from './physics.js';
import { spawnParticle, spawnFloatingText, particles as particlesList } from './particles.js';
import { damagePlayer } from './player.js';

export function updateEnemies(entities, hitStopTimer, player) {
  if (hitStopTimer > 0) return;

  entities.forEach(e => {
    if (e.type !== 'enemy' || !e.alive) return;
    if (e.hurtTimer > 0) e.hurtTimer--;

    // Staggered
    if (e.staggered) {
      e.staggerTimer--;
      if (e.staggerTimer <= 0) e.staggered = false;
      return;
    }

    // Poison damage over time (applied by ular)
    if (e.poisonTimer > 0) {
      e.poisonTimer--;
      if (e.poisonTimer % 20 === 0) {
        e.hp -= 2;
        spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.green + '80', 2, 1, 15);
        if (e.hp <= 0) {
          e.alive = false;
          spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.stone, 15, 4, 40);
        }
      }
    }

    // Stun timer (from ubur_ubur)
    if (e.stunTimer > 0) {
      e.stunTimer--;
      return;
    }

    e.prevY = e.y;
    e.vy += GRAVITY;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;

    // Dispatch by enemy type
    switch (e.enemyType) {
      case 'batu_kecil': updateBatuKecil(e, player); break;
      case 'patung': updatePatung(e, player); break;
      case 'harimau': updateHarimau(e, player); break;
      case 'ular': updateUlar(e, player); break;
      case 'iblis_kecil': updateIblisKecil(e, player); break;
      case 'golem_api': updateGolemApi(e, player); break;
      case 'ikan_pedang': updateIkanPedang(e, player); break;
      case 'ubur_ubur': updateUburUbur(e, player); break;
      case 'prajurit_jahat': updatePrajuritJahat(e, player); break;
      case 'raksasa_kecil': updateRaksasaKecil(e, player); break;
      default: updateBatuKecil(e, player); break;
    }

    // Collision X
    const colsX = tileCollision(e.x, e.y, e.w, e.h, e.prevY);
    colsX.forEach(c => {
      if (c.oneway) return;
      if (e.vx > 0) e.x = c.x - e.w;
      else if (e.vx < 0) e.x = c.x + c.w;
      e.vx = -e.vx;
      e.facing = e.vx > 0 ? 1 : -1;
    });

    // Move Y
    e.y += e.vy;
    e.grounded = false;
    const colsY = tileCollision(e.x, e.y, e.w, e.h, e.prevY);
    colsY.forEach(c => {
      if (e.vy > 0) { e.y = c.y - e.h; e.vy = 0; e.grounded = true; }
      else if (e.vy < 0 && !c.oneway) { e.y = c.y + c.h; e.vy = 0; }
    });

    e.animTimer++;
    if (e.animTimer > 10) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
  });
}

// ---- Shared helpers ----
const checkOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function patrolEnemy(e) {
  e.x += e.vx;
  if (e.x <= e.patrol.left || e.x + e.w >= e.patrol.right) {
    e.vx = -e.vx;
    e.facing = e.vx > 0 ? 1 : -1;
  }
}

function facePlayer(e, player) {
  const dx = player.x - e.x;
  e.facing = dx > 0 ? 1 : -1;
}

function distToPlayer(e, player) {
  return Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
}

function tryMeleeAttack(e, player, range) {
  if (e.attackCooldown > 0) { e.attackCooldown--; return; }
  const dist = distToPlayer(e, player);
  if (dist < (range || 60)) {
    e.isTelegraphing = true;
    e.telegraphTimer = 15;
    facePlayer(e, player);
  }
}

function executeMeleeHit(e, player, damage) {
  if (checkOverlap(player, e) && player.invincible <= 0) {
    damagePlayer(damage || e.damage);
  }
}

// ---- batu_kecil: simple patrol + attack (existing) ----
function updateBatuKecil(e, player) {
  if (e.isTelegraphing) {
    e.telegraphTimer--;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.isAttacking = true;
      e.attackAnimTimer = 10;
      e.attackCooldown = 60 + Math.floor(Math.random() * 30);
    }
  } else if (e.isAttacking) {
    e.attackAnimTimer--;
    if (e.attackAnimTimer === 5) executeMeleeHit(e, player, e.damage);
    if (e.attackAnimTimer <= 0) e.isAttacking = false;
  } else {
    patrolEnemy(e);
    tryMeleeAttack(e, player, 60);
  }
}

// ---- patung: slow patrol + telegraph attack (existing) ----
function updatePatung(e, player) {
  if (e.isTelegraphing) {
    e.telegraphTimer--;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.isAttacking = true;
      e.attackAnimTimer = 12;
      e.attackCooldown = 80 + Math.floor(Math.random() * 30);
    }
  } else if (e.isAttacking) {
    e.attackAnimTimer--;
    if (e.attackAnimTimer === 6) executeMeleeHit(e, player, e.damage);
    if (e.attackAnimTimer <= 0) e.isAttacking = false;
  } else {
    patrolEnemy(e);
    tryMeleeAttack(e, player, 55);
  }
}

// ---- harimau: fast, pounces from distance, low HP ----
function updateHarimau(e, player) {
  const dist = distToPlayer(e, player);
  facePlayer(e, player);

  if (e.isTelegraphing) {
    e.telegraphTimer--;
    e.vx = 0;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.isAttacking = true;
      e.attackAnimTimer = 15;
      e.attackCooldown = 50 + Math.floor(Math.random() * 20);
      // Pounce!
      e.vx = e.facing * 6;
    }
  } else if (e.isAttacking) {
    e.attackAnimTimer--;
    e.x += e.vx;
    e.vx *= 0.92;
    if (e.attackAnimTimer === 8) executeMeleeHit(e, player, e.damage);
    if (e.attackAnimTimer <= 0) {
      e.isAttacking = false;
      e.vx = e.facing * Math.abs(e.vx > 0 ? 1 : -1) * 2.5;
    }
  } else {
    // Fast patrol / chase
    if (dist < 200 && dist > 50) {
      e.vx = e.facing * 2.5;
      e.x += e.vx;
    } else if (dist <= 50) {
      e.isTelegraphing = true;
      e.telegraphTimer = 10;
    } else {
      patrolEnemy(e);
    }
  }
}

// ---- ular: slow, attacks apply "poison" (damage over time) ----
function updateUlar(e, player) {
  if (e.isTelegraphing) {
    e.telegraphTimer--;
    e.vx = 0;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.isAttacking = true;
      e.attackAnimTimer = 10;
      e.attackCooldown = 70 + Math.floor(Math.random() * 30);
    }
  } else if (e.isAttacking) {
    e.attackAnimTimer--;
    if (e.attackAnimTimer === 5) {
      if (checkOverlap(player, e) && player.invincible <= 0) {
        damagePlayer(e.damage);
        // Apply poison to player (tracked in player state)
        if (player.poisonTimer !== undefined) {
          player.poisonTimer = 180; // 3 seconds at 60fps
        }
        spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.green, 5, 2, 30);
        spawnFloatingText(player.x, player.y - 20, 'Racun!', C.green);
      }
    }
    if (e.attackAnimTimer <= 0) e.isAttacking = false;
  } else {
    patrolEnemy(e);
    tryMeleeAttack(e, player, 50);
  }
}

// ---- iblis_kecil: keeps distance, throws fireballs (projectiles) ----
function updateIblisKecil(e, player) {
  const dist = distToPlayer(e, player);
  facePlayer(e, player);

  if (e.isTelegraphing) {
    e.telegraphTimer--;
    e.vx = 0;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.attackCooldown = 60 + Math.floor(Math.random() * 30);
      // Shoot fireball
      const angle = Math.atan2(
        (player.y + player.h / 2) - (e.y + e.h / 2),
        (player.x + player.w / 2) - (e.x + e.w / 2)
      );
      particlesList.push({
        x: e.x + e.w / 2, y: e.y + e.h / 2,
        vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
        life: 80, maxLife: 80, color: C.orange, size: 6,
        isProjectile: true, damage: e.damage,
      });
      spawnParticle(e.x + e.w / 2, e.y + e.h / 2, C.orange, 3, 2, 15);
      playSound('heavyAttack');
    }
  } else {
    // Keep distance from player
    if (dist < 80) {
      e.vx = -e.facing * 1.5;  // back away
      e.x += e.vx;
    } else if (dist > 180) {
      e.vx = e.facing * 1.5;  // move closer
      e.x += e.vx;
    } else {
      e.vx = 0;
    }

    if (e.attackCooldown > 0) {
      e.attackCooldown--;
    } else if (dist < 200) {
      e.isTelegraphing = true;
      e.telegraphTimer = 20;
    }
  }
}

// ---- golem_api: slow, tanky, ground pound AOE ----
function updateGolemApi(e, player) {
  const dist = distToPlayer(e, player);

  if (e.isTelegraphing) {
    e.telegraphTimer--;
    e.vx = 0;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.isAttacking = true;
      e.attackAnimTimer = 15;
      e.attackCooldown = 90 + Math.floor(Math.random() * 30);
      // Ground pound AOE
      if (dist < 100 && player.invincible <= 0) {
        damagePlayer(e.damage);
        shakeRef.timer = 5; shakeRef.intensity = 3;
      }
      spawnParticle(e.x + e.w / 2, e.y + e.h, C.orange, 15, 5, 40);
      spawnParticle(e.x + e.w / 2 - 40, e.y + e.h, C.lava, 6, 3, 30);
      spawnParticle(e.x + e.w / 2 + 40, e.y + e.h, C.lava, 6, 3, 30);
      playSound('heavyAttack');
    }
  } else if (e.isAttacking) {
    e.attackAnimTimer--;
    if (e.attackAnimTimer <= 0) e.isAttacking = false;
  } else {
    // Slow patrol
    e.vx = e.facing * 0.6;
    e.x += e.vx;
    if (e.x <= e.patrol.left || e.x + e.w >= e.patrol.right) {
      e.vx = -e.vx;
      e.facing = e.vx > 0 ? 1 : -1;
    }
    if (e.attackCooldown > 0) e.attackCooldown--;
    else if (dist < 90) {
      e.isTelegraphing = true;
      e.telegraphTimer = 30;
      facePlayer(e, player);
    }
  }
}

// ---- ikan_pedang: fast swimmer, dash attack ----
function updateIkanPedang(e, player) {
  const dist = distToPlayer(e, player);
  facePlayer(e, player);

  if (e.isTelegraphing) {
    e.telegraphTimer--;
    e.vx = 0;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.isAttacking = true;
      e.attackAnimTimer = 12;
      e.attackCooldown = 40 + Math.floor(Math.random() * 20);
      // Dash attack
      e.vx = e.facing * 8;
    }
  } else if (e.isAttacking) {
    e.attackAnimTimer--;
    e.x += e.vx;
    e.vx *= 0.88;
    if (e.attackAnimTimer === 6) executeMeleeHit(e, player, e.damage);
    if (e.attackAnimTimer <= 0) {
      e.isAttacking = false;
      e.vx = e.facing * 3;
    }
  } else {
    // Fast patrol / chase
    if (dist < 150) {
      e.vx = e.facing * 3;
      e.x += e.vx;
    } else {
      patrolEnemy(e);
    }
    if (e.attackCooldown > 0) e.attackCooldown--;
    else if (dist < 70) {
      e.isTelegraphing = true;
      e.telegraphTimer = 8;
    }
  }
}

// ---- ubur_ubur: stationary, creates electric field, stuns on contact ----
function updateUburUbur(e, player) {
  e.vx = 0; // stationary

  // Small bob movement
  e.x += Math.sin(e.animTimer * 0.05) * 0.3;

  // Electric field damage + stun
  const dist = distToPlayer(e, player);
  if (dist < 50 && player.invincible <= 0 && e.attackCooldown <= 0) {
    damagePlayer(e.damage);
    if (player.stunTimer !== undefined) {
      player.stunTimer = 30; // brief stun
    }
    spawnParticle(player.x + player.w / 2, player.y + player.h / 2, C.cyan, 8, 3, 20);
    spawnFloatingText(player.x, player.y - 20, 'Stun!', C.cyan);
    e.attackCooldown = 60;
    playSound('damage');
  }
  if (e.attackCooldown > 0) e.attackCooldown--;
}

// ---- prajurit_jahat: sword combo (like player), blocks sometimes ----
function updatePrajuritJahat(e, player) {
  const dist = distToPlayer(e, player);

  if (e.blockTimer > 0) {
    e.blockTimer--;
    e.vx = 0;
    // While blocking, reduce incoming damage (handled in damageEnemy)
    return;
  }

  if (e.isTelegraphing) {
    e.telegraphTimer--;
    e.vx = 0;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.isAttacking = true;
      e.attackAnimTimer = 18;  // combo: 3 hits
      e.attackCooldown = 70 + Math.floor(Math.random() * 20);
    }
  } else if (e.isAttacking) {
    e.attackAnimTimer--;
    // Combo hits at frames 12, 8, 4
    if (e.attackAnimTimer === 12 || e.attackAnimTimer === 8 || e.attackAnimTimer === 4) {
      if (checkOverlap(player, e) && player.invincible <= 0) {
        damagePlayer(e.damage);
      }
    }
    if (e.attackAnimTimer <= 0) e.isAttacking = false;
  } else {
    // Patrol / chase
    if (dist < 120) {
      e.vx = e.facing * 1.8;
      e.x += e.vx;
    } else {
      patrolEnemy(e);
    }

    if (e.attackCooldown > 0) {
      e.attackCooldown--;
    } else if (dist < 55) {
      // Random chance to block instead of attack
      if (Math.random() < 0.25) {
        e.blockTimer = 40;
        facePlayer(e, player);
      } else {
        e.isTelegraphing = true;
        e.telegraphTimer = 12;
        facePlayer(e, player);
      }
    }
  }
}

// ---- raksasa_kecil: throws rocks from distance ----
function updateRaksasaKecil(e, player) {
  const dist = distToPlayer(e, player);
  facePlayer(e, player);

  if (e.isTelegraphing) {
    e.telegraphTimer--;
    e.vx = 0;
    if (e.telegraphTimer <= 0) {
      e.isTelegraphing = false;
      e.attackCooldown = 80 + Math.floor(Math.random() * 30);
      // Throw rock
      const angle = Math.atan2(
        (player.y + player.h / 2) - (e.y + e.h / 2),
        (player.x + player.w / 2) - (e.x + e.w / 2)
      );
      particlesList.push({
        x: e.x + e.w / 2, y: e.y + e.h / 4,
        vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5 - 2,
        life: 90, maxLife: 90, color: C.stoneDark, size: 8,
        isProjectile: true, damage: e.damage,
      });
      spawnParticle(e.x + e.w / 2, e.y + e.h / 4, C.stone, 4, 2, 15);
      playSound('heavyAttack');
    }
  } else {
    // Slow patrol
    e.vx = e.facing * 1.0;
    e.x += e.vx;
    if (e.x <= e.patrol.left || e.x + e.w >= e.patrol.right) {
      e.vx = -e.vx;
      e.facing = e.vx > 0 ? 1 : -1;
    }

    if (e.attackCooldown > 0) e.attackCooldown--;
    else if (dist < 180) {
      e.isTelegraphing = true;
      e.telegraphTimer = 25;
      facePlayer(e, player);
    }
  }
}

// Shared shake reference (set from player.js)
let shakeRef = { timer: 0, intensity: 0 };
export function setEnemyShakeRef(sh) { shakeRef = sh; }
