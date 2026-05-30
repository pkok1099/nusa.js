// ============================================================
// draw-game.js — All game rendering functions
// ============================================================

import { C, GAME_W, GAME_H, TILE, PARRY_DURATION, PARRY_WINDOW, HEAVY_ATTACK_WINDUP, HEAVY_ATTACK_DURATION, COMBO_1_DURATION, COMBO_2_DURATION, COMBO_3_DURATION, BOSS_RECOVERY_FRAMES, STAGES, STAT_NAMES, STAT_LABELS, STAT_PER_POINT, HOLLOWING_MAX_LEVEL, VISCERAL_DURATION } from './config.js';
import { drawText, drawRect, drawBar, drawOutline, getCtx } from './renderer.js';
import { camera } from './camera.js';
import { player } from './player.js';
import { spawnParticle } from './particles.js';
import { justPressed, mouse } from './input.js';
import { playSound } from './audio.js';
import { getCurrentDialog } from './dialog.js';
import { inventory, getComputedStats, getEquippedWeapon, getEquippedArmor, getEquippedAccessory, countHealthPotions, getPotionCounts } from './inventory.js';
import { shopItems, shopState, TAB_NAMES, buyItem, sellItem, getCurrentTabItems, resetShopState } from './shop.js';
import { WEAPONS, ARMORS, ACCESSORIES, POTIONS } from './config.js';
import { hasSaveGame } from './save.js';

let gameTime = 0;
let currentStageId = 0;
export function setGameTime(t) { gameTime = t; }
export function setCurrentStageId(id) { currentStageId = id; }

// Save indicator state
let saveIndicatorTimer = 0;
export function showSaveIndicator() { saveIndicatorTimer = 180; } // 3 seconds at 60fps

// ---- BACKGROUND ----
export function drawBackground() {
  const ctx = getCtx();
  const stage = STAGES[currentStageId] || STAGES[0];
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, stage.bg1);
  grad.addColorStop(0.5, stage.bg2);
  grad.addColorStop(1, '#0A0A0A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Stars
  ctx.fillStyle = '#FFFFFF15';
  for (let i = 0; i < 40; i++) {
    const x = (i * 137 + gameTime * 0.02) % GAME_W;
    const y = (i * 97) % (GAME_H * 0.6);
    const s = (Math.sin(gameTime * 0.03 + i) + 1) * 1.5;
    ctx.fillRect(x, y, s, s);
  }

  // Far background - different per stage
  if (currentStageId === 1) {
    // Forest background - trees
    ctx.fillStyle = '#0A150D';
    ctx.beginPath(); ctx.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += 30) {
      const h = Math.sin((x + camera.x * 0.1) * 0.02) * 80 + 60;
      ctx.lineTo(x, GAME_H - h);
    }
    ctx.lineTo(GAME_W, GAME_H); ctx.fill();
  } else if (currentStageId === 2) {
    // Mountain/volcano background
    ctx.fillStyle = '#1A0808';
    ctx.beginPath(); ctx.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += 60) {
      const h = Math.sin((x + camera.x * 0.1) * 0.01) * 100 + 120;
      ctx.lineTo(x, GAME_H - h);
      ctx.lineTo(x + 30, GAME_H - h + 30);
    }
    ctx.lineTo(GAME_W, GAME_H); ctx.fill();
  } else if (currentStageId === 3) {
    // Ocean waves background
    ctx.fillStyle = '#050A1A';
    ctx.beginPath(); ctx.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += 40) {
      const h = Math.sin((x + camera.x * 0.15 + gameTime * 0.5) * 0.02) * 40 + 80;
      ctx.lineTo(x, GAME_H - h);
    }
    ctx.lineTo(GAME_W, GAME_H); ctx.fill();
  } else if (currentStageId === 4) {
    // Grand temple background
    ctx.fillStyle = '#1A1A08';
    for (let i = 0; i < 4; i++) {
      const bx = 100 - camera.x * 0.15 + i * 200;
      const bh = 80 + i * 20;
      ctx.beginPath();
      ctx.moveTo(bx, GAME_H - 40);
      ctx.lineTo(bx + 40, GAME_H - 40 - bh);
      ctx.lineTo(bx + 50, GAME_H - 40 - bh - 25);
      ctx.lineTo(bx + 60, GAME_H - 40 - bh);
      ctx.lineTo(bx + 100, GAME_H - 40);
      ctx.fill();
    }
  } else {
    // Default Candi Borobudur background
    ctx.fillStyle = '#1A1020';
    ctx.beginPath(); ctx.moveTo(0, GAME_H);
    for (let x = 0; x <= GAME_W; x += 40) {
      const h = Math.sin((x + camera.x * 0.1) * 0.01) * 60 + Math.sin((x + camera.x * 0.1) * 0.025) * 30;
      ctx.lineTo(x, GAME_H - 120 + h);
    }
    ctx.lineTo(GAME_W, GAME_H); ctx.fill();

    ctx.fillStyle = '#120A18';
    const candiX = 200 - camera.x * 0.15;
    for (let i = 0; i < 3; i++) {
      const bx = candiX + i * 120;
      const bh = 60 + i * 15;
      ctx.beginPath();
      ctx.moveTo(bx, GAME_H - 60);
      ctx.lineTo(bx + 30, GAME_H - 60 - bh);
      ctx.lineTo(bx + 40, GAME_H - 60 - bh - 15);
      ctx.lineTo(bx + 50, GAME_H - 60 - bh);
      ctx.lineTo(bx + 80, GAME_H - 60);
      ctx.fill();
    }
  }

  // Near background
  ctx.fillStyle = currentStageId === 1 ? '#081008' : currentStageId === 3 ? '#030818' : '#0F0818';
  ctx.beginPath(); ctx.moveTo(0, GAME_H);
  for (let x = 0; x <= GAME_W; x += 30) {
    const h = Math.sin((x + camera.x * 0.3) * 0.015) * 40 + Math.sin((x + camera.x * 0.3) * 0.04) * 20;
    ctx.lineTo(x, GAME_H - 60 + h);
  }
  ctx.lineTo(GAME_W, GAME_H); ctx.fill();
}

// ---- LEVEL ----
export function drawLevel(tileMap) {
  if (!tileMap || tileMap.length === 0) return;
  const ctx = getCtx();
  const H = tileMap.length, W = tileMap[0].length;
  const startTX = Math.max(0, Math.floor(camera.x / TILE));
  const endTX = Math.min(W, Math.ceil((camera.x + GAME_W) / TILE) + 1);
  const startTY = Math.max(0, Math.floor(camera.y / TILE));
  const endTY = Math.min(H, Math.ceil((camera.y + GAME_H) / TILE) + 1);

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = tileMap[ty][tx];
      const sx = tx * TILE - camera.x;
      const sy = ty * TILE - camera.y;
      if (tile === 0) continue;

      if (tile === 1) {
        // Stone/ground - different colors per stage
        const stoneColor = currentStageId === 1 ? '#2D5A1E' : currentStageId === 2 ? '#5A2D1E' : currentStageId === 3 ? '#1E3A5A' : currentStageId === 4 ? '#5A4A1E' : C.stone;
        const stoneDark = currentStageId === 1 ? '#1D3A0E' : currentStageId === 2 ? '#3A1D0E' : currentStageId === 3 ? '#0E2A3A' : currentStageId === 4 ? '#3A2A0E' : C.stoneDark;
        const stoneLight = currentStageId === 1 ? '#3D7A2E' : currentStageId === 2 ? '#7A3D2E' : currentStageId === 3 ? '#2E5A7A' : currentStageId === 4 ? '#7A6A2E' : C.stoneLight;
        drawRect(sx, sy, TILE, TILE, stoneDark);
        drawRect(sx + 1, sy + 1, TILE - 2, TILE - 2, stoneColor);
        ctx.fillStyle = stoneLight + '30';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, 2);
        ctx.fillRect(sx + 2, sy + 2, 2, TILE - 4);
        if ((tx + ty) % 4 === 0) { ctx.fillStyle = C.gold + '15'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8); }
      } else if (tile === 2) {
        // One-way platform
        drawRect(sx, sy, TILE, TILE / 2, C.stone);
        drawRect(sx, sy, TILE, 3, C.gold + '40');
        ctx.fillStyle = C.stoneDark;
        ctx.fillRect(sx + TILE / 2 - 2, sy + TILE / 2, 4, TILE / 2);
      } else if (tile === 3) {
        // Lava
        const lavaPulse = Math.sin(gameTime * 0.08 + tx * 0.5) * 0.3 + 0.7;
        drawRect(sx, sy, TILE, TILE, '#661100');
        drawRect(sx + 1, sy + 1, TILE - 2, TILE - 2, C.lava);
        ctx.fillStyle = `rgba(255, 100, 0, ${lavaPulse * 0.4})`;
        ctx.fillRect(sx, sy, TILE, TILE);
        // Glow
        if (Math.random() < 0.05) spawnParticle(sx + camera.x + Math.random() * TILE, sy + camera.y, C.orange, 1, 1, 15);
      } else if (tile === 4) {
        // Water
        const waterPulse = Math.sin(gameTime * 0.04 + tx * 0.3) * 0.15 + 0.5;
        drawRect(sx, sy, TILE, TILE, '#0A2A4A');
        ctx.fillStyle = `rgba(30, 90, 142, ${waterPulse})`;
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = C.cyan + '15';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, 2);
      } else if (tile === 5) {
        // Tree trunk
        drawRect(sx, sy, TILE, TILE, C.wood);
        drawRect(sx + 4, sy, TILE - 8, 6, C.grass);
        ctx.fillStyle = C.wood + '80';
        ctx.fillRect(sx + 8, sy + 8, 4, TILE - 12);
        ctx.fillRect(sx + 20, sy + 10, 4, TILE - 14);
      } else if (tile === 6) {
        // Vine platform
        drawRect(sx, sy, TILE, TILE / 2, C.grass);
        drawRect(sx, sy, TILE, 2, C.grassLight + '60');
        ctx.fillStyle = C.grass + '60';
        ctx.fillRect(sx + 4, sy + TILE / 2, 2, TILE / 2);
        ctx.fillRect(sx + TILE - 6, sy + TILE / 2, 2, TILE / 2);
      } else if (tile === 8) {
        // Decoration (coral, etc.)
        ctx.fillStyle = currentStageId === 3 ? '#2A5A8A' : C.gold + '20';
        ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = C.gold + '10';
        ctx.fillRect(sx + 8, sy + 8, TILE - 16, TILE - 16);
      } else if (tile === 9) {
        // Checkpoint
        const glowIntensity = Math.sin(gameTime * 0.08) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(212, 175, 55, ${glowIntensity * 0.15})`;
        ctx.fillRect(sx - 4, sy - 4, TILE + 8, TILE + 8);
        ctx.fillStyle = `rgba(212, 175, 55, ${glowIntensity * 0.25})`;
        ctx.fillRect(sx - 2, sy - 2, TILE + 4, TILE + 4);
        drawRect(sx + 4, sy + 8, TILE - 8, TILE - 8, C.goldDark);
        drawRect(sx + 6, sy + 10, TILE - 12, TILE - 12, C.gold);
        const flameH = 6 + Math.sin(gameTime * 0.15) * 3;
        ctx.fillStyle = C.goldLight + 'CC';
        ctx.beginPath(); ctx.arc(sx + TILE / 2, sy + 6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.gold + '80';
        ctx.beginPath(); ctx.arc(sx + TILE / 2, sy + 4 - flameH / 3, 3, 0, Math.PI * 2); ctx.fill();
        if (gameTime % 20 === 0) spawnParticle(sx + TILE / 2 + camera.x, sy + camera.y, C.goldLight, 1, 1, 20);
      }
    }
  }
}

// ---- PLAYER ----
export function drawPlayer(parryFlashTimer) {
  const ctx = getCtx();
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const f = player.facing;

  if (player.invincible > 0 && Math.floor(player.invincible / 3) % 2 === 0) return;

  ctx.save();
  ctx.translate(px + player.w / 2, py + player.h / 2);
  ctx.scale(f, 1);
  ctx.translate(-player.w / 2, -player.h / 2);

  const bodyColor = player.hurtTimer > 0 ? C.red : '#D4A574';
  // Armor color based on equipped armor
  const armor = getEquippedArmor();
  const clothColor = player.dodging ? C.gold + '80' :
    armor.id === 'naga' ? '#2A4A2A' :
    armor.id === 'emas' ? '#8B7514' :
    armor.id === 'perak' ? '#707080' :
    armor.id === 'besi' ? '#505050' :
    armor.id === 'kulit' ? '#6B4226' : '#8B4513';

  const legOffset = player.state === 'run' ? Math.sin(player.animFrame * 1.5) * 4 : 0;
  drawRect(4, 24, 6, 12 + legOffset, bodyColor);
  drawRect(14, 24, 6, 12 - legOffset, bodyColor);
  drawRect(2, 18, 20, 10, clothColor);
  ctx.fillStyle = C.gold + '40';
  ctx.fillRect(4, 20, 3, 2); ctx.fillRect(10, 20, 3, 2); ctx.fillRect(16, 20, 3, 2);
  drawRect(4, 8, 16, 12, bodyColor);
  drawRect(5, -2, 14, 12, bodyColor);
  drawRect(4, -4, 16, 5, '#3D2B1F');
  drawRect(8, -6, 8, 3, '#3D2B1F');
  ctx.fillStyle = '#000';
  ctx.fillRect(10, 2, 3, 2); ctx.fillRect(16, 2, 3, 2);

  // Weapon visual based on equipped weapon
  const weapon = getEquippedWeapon();
  const weaponColor = weapon.id === 'trisula' ? C.goldLight :
    weapon.id === 'keris_emas' ? C.gold :
    weapon.id === 'panah_api' ? C.orange :
    weapon.id === 'tombak' ? '#7A7A8A' :
    weapon.id === 'pedang' ? '#9A9AAA' : C.goldDark;
  drawRect(18, 16, 3, 14, weaponColor);
  drawRect(17, 14, 5, 3, C.gold);

  // Souls-like v0.7.1: Two-handing visual
  if (player.twoHanding) {
    // Second hand on weapon
    drawRect(14, 20, 6, 8, '#D4A574');
    // Weapon glow
    ctx.fillStyle = C.parryGold + '30';
    ctx.fillRect(16, 14, 8, 20);
  }

  // Accessory glow
  const acc = getEquippedAccessory();
  if (acc) {
    const accGlow = Math.sin(gameTime * 0.1) * 0.15 + 0.15;
    const accColor = acc.effect === 'attack' ? C.red : acc.effect === 'defense' ? C.cyan : acc.effect === 'speed' ? C.green : C.gold;
    ctx.fillStyle = accColor + Math.floor(accGlow * 255).toString(16).padStart(2, '0');
    ctx.fillRect(-2, -2, player.w + 4, player.h + 4);
  }

  // Buff glow effects
  inventory.activeBuffs.forEach(b => {
    const buffColor = b.buffType === 'attack' ? C.red : b.buffType === 'defense' ? C.cyan : b.buffType === 'speed' ? C.green : C.gold;
    const alpha = Math.sin(gameTime * 0.15) * 0.1 + 0.1;
    ctx.fillStyle = buffColor + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.fillRect(-4, -4, player.w + 8, player.h + 8);
  });

  // Poison overlay
  if (player.poisonTimer > 0) {
    ctx.fillStyle = C.green + '20';
    ctx.fillRect(0, 0, player.w, player.h);
  }

  // Souls-like v0.7.1: Hollowing desaturation overlay
  if (player.hollowing > 0) {
    const hollowAlpha = Math.min(0.4, player.hollowing * 0.04);
    ctx.fillStyle = `rgba(40, 30, 30, ${hollowAlpha})`;
    ctx.fillRect(0, 0, player.w, player.h);
  }

  // Stun overlay
  if (player.stunTimer > 0) {
    ctx.fillStyle = C.cyan + '30';
    ctx.fillRect(0, 0, player.w, player.h);
    drawText('*', player.w / 2, -8, 10, C.cyan, 'center');
  }

  // Slow overlay
  if (player.slowTimer > 0) {
    ctx.fillStyle = C.blue + '20';
    ctx.fillRect(0, 0, player.w, player.h);
  }

  // Healing aura
  if (player.healing) {
    const healAlpha = 0.3 + Math.sin(gameTime * 0.2) * 0.15;
    ctx.fillStyle = `rgba(68, 255, 68, ${healAlpha})`;
    ctx.fillRect(-4, -4, player.w + 8, player.h + 8);
  }

  // Light attack effect
  if (player.attacking) {
    const comboIdx = (player.attackCombo + 2) % 3;
    const atkDur = comboIdx === 0 ? COMBO_1_DURATION : (comboIdx === 1 ? COMBO_2_DURATION : COMBO_3_DURATION);
    const atkProgress = 1 - player.attackTimer / atkDur;
    if (comboIdx === 0) {
      const slashX = 18 + atkProgress * 30;
      ctx.strokeStyle = C.gold + 'AA'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(slashX, 15, 15 + atkProgress * 10, -0.8, 0.8); ctx.stroke();
      ctx.strokeStyle = C.goldLight + '44'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(slashX - 5, 15, 12 + atkProgress * 12, -0.5, 0.5); ctx.stroke();
    } else if (comboIdx === 1) {
      const slashY = 25 - atkProgress * 20;
      ctx.strokeStyle = C.gold + 'CC'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(20, slashY, 15 + atkProgress * 8, -1.2, 0.3); ctx.stroke();
    } else {
      const slashY = -5 + atkProgress * 25;
      ctx.strokeStyle = C.goldLight + 'DD'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(22, slashY, 18 + atkProgress * 12, 0.5, 1.8); ctx.stroke();
    }
  }

  // Heavy attack
  if (player.heavyAttacking) {
    const atkProgress = 1 - player.heavyAttackTimer / HEAVY_ATTACK_DURATION;
    if (player.heavyAttackTimer > HEAVY_ATTACK_DURATION - HEAVY_ATTACK_WINDUP) {
      ctx.strokeStyle = C.goldDark + '80'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(5, 10, 10 + atkProgress * 5, 0.5, 2.5); ctx.stroke();
    } else {
      const strikeProgress = (atkProgress - HEAVY_ATTACK_WINDUP / HEAVY_ATTACK_DURATION) / (1 - HEAVY_ATTACK_WINDUP / HEAVY_ATTACK_DURATION);
      const slashX = 10 + strikeProgress * 40;
      ctx.strokeStyle = C.goldLight + 'EE'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(slashX, 15, 20 + strikeProgress * 15, -1.0, 1.0); ctx.stroke();
    }
  }

  // Souls-like v0.7.1: Visceral attack visual
  if (player.visceralActive) {
    ctx.strokeStyle = C.parryGold + 'DD'; ctx.lineWidth = 4;
    const visceralProgress = player.visceralTimer / VISCERAL_DURATION;
    ctx.beginPath(); ctx.arc(player.w / 2 + 15, player.h / 2, 25 * (1 - visceralProgress) + 10, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = C.parryGold + '40';
    ctx.beginPath(); ctx.arc(player.w / 2 + 10, player.h / 2, 20, 0, Math.PI * 2); ctx.fill();
  }

  // Parry
  if (player.parryTimer > 0) {
    if (player.parryWindow > 0) {
      ctx.strokeStyle = C.parryGold + 'CC'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(player.w / 2, player.h / 2, 20 + Math.sin(gameTime * 0.5) * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = C.parryGold + '30';
      ctx.beginPath(); ctx.arc(player.w / 2, player.h / 2, 18, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = C.gold + '40'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(player.w / 2, player.h / 2, 18 * (player.parryTimer / PARRY_DURATION), 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Dodge trail
  if (player.dodging) { ctx.globalAlpha = 0.3; drawRect(-10, 0, player.w, player.h, C.gold); ctx.globalAlpha = 1; }

  // Skill effect
  if (player.skillCooldown > player.skillMaxCooldown - 20) {
    const t = (player.skillMaxCooldown - player.skillCooldown) / 20;
    ctx.globalAlpha = 1 - t; drawRect(-20, -20, player.w + 40, player.h + 40, C.gold + '40'); ctx.globalAlpha = 1;
  }

  // Stamina low
  if (player.stamina < 20 && !player.dodging) { ctx.fillStyle = C.red + '30'; ctx.fillRect(0, 0, player.w, player.h); }

  ctx.restore();

  if (parryFlashTimer > 0) {
    ctx.fillStyle = `rgba(255, 215, 0, ${parryFlashTimer / 15 * 0.3})`;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }
}

// ---- ENEMIES ----
export function drawEnemies(entities) {
  const ctx = getCtx();
  entities.forEach(e => {
    if (e.type !== 'enemy' || !e.alive) return;
    const ex = e.x - camera.x;
    const ey = e.y - camera.y;
    ctx.save();
    ctx.translate(ex + e.w / 2, ey + e.h / 2);
    ctx.scale(e.facing, 1);
    ctx.translate(-e.w / 2, -e.h / 2);
    if (e.hurtTimer > 0) ctx.globalAlpha = 0.7;
    if (e.isTelegraphing) {
      const teleAlpha = 0.3 + Math.sin(gameTime * 0.4) * 0.2;
      ctx.fillStyle = `rgba(255, 68, 68, ${teleAlpha})`;
      ctx.fillRect(-4, -4, e.w + 8, e.h + 8);
    }
    if (e.staggered) { ctx.fillStyle = C.parryGold + '40'; ctx.fillRect(-2, -2, e.w + 4, e.h + 4); }

    // Souls-like v0.7.1: Aggro indicator
    if (e.isAggroed) {
      ctx.fillStyle = C.red + '15';
      ctx.fillRect(-2, -2, e.w + 4, e.h + 4);
    } else {
      drawText('?', e.w / 2, -10, 8, C.textDim, 'center');
    }

    // Draw enemy based on type
    switch (e.enemyType) {
      case 'batu_kecil':
        drawRect(2, 8, 16, 16, C.stone); drawRect(0, 0, 20, 10, C.stoneDark);
        drawRect(4, 2, 4, 3, C.red + '60'); drawRect(12, 2, 4, 3, C.red + '60');
        if (e.isAttacking) drawRect(18, 6, 8, 4, C.stoneDark);
        break;
      case 'patung':
        drawRect(4, 12, 20, 22, C.stone); drawRect(0, 0, 28, 14, C.stoneDark);
        drawRect(2, 2, 24, 10, C.stone); drawRect(6, 3, 5, 4, C.red + '80'); drawRect(17, 3, 5, 4, C.red + '80');
        drawRect(10, 8, 8, 2, C.stoneDark);
        ctx.fillStyle = C.gold + '30'; ctx.fillRect(6, 14, 4, 4); ctx.fillRect(18, 14, 4, 4);
        if (e.isAttacking) drawRect(26, 8, 10, 6, C.stone);
        break;
      case 'harimau':
        drawRect(2, 6, 26, 14, '#CC8833'); drawRect(0, 0, 30, 8, '#AA6622');
        drawRect(4, 2, 4, 3, C.gold + 'CC'); drawRect(18, 2, 4, 3, C.gold + 'CC');
        // Stripes
        ctx.fillStyle = '#884411'; ctx.fillRect(8, 8, 2, 10); ctx.fillRect(14, 8, 2, 10); ctx.fillRect(20, 8, 2, 10);
        if (e.isAttacking) drawRect(26, 4, 8, 6, '#CC8833');
        break;
      case 'ular':
        drawRect(0, 4, 24, 12, '#2A8A2A'); drawRect(22, 2, 6, 8, '#3AAA3A');
        drawRect(24, 3, 2, 2, C.red + 'AA'); drawRect(26, 3, 2, 2, C.red + 'AA');
        ctx.fillStyle = '#1A6A1A';
        for (let i = 0; i < 4; i++) ctx.fillRect(4 + i * 5, 6, 3, 2);
        if (e.isAttacking) { drawRect(26, 0, 6, 4, '#3AAA3A'); drawRect(28, 0, 4, 2, C.red); }
        break;
      case 'iblis_kecil':
        drawRect(4, 8, 16, 16, '#8A2A2A'); drawRect(2, 0, 20, 10, '#AA3A3A');
        drawRect(6, 2, 3, 4, C.orange + 'CC'); drawRect(15, 2, 3, 4, C.orange + 'CC');
        // Horns
        drawRect(4, -4, 3, 6, '#8A2A2A'); drawRect(17, -4, 3, 6, '#8A2A2A');
        // Fire aura
        ctx.fillStyle = C.orange + '20'; ctx.fillRect(-2, -2, e.w + 4, e.h + 4);
        break;
      case 'golem_api':
        drawRect(4, 14, 28, 22, '#8A4A2A'); drawRect(0, 4, 32, 14, '#6A3A1A');
        drawRect(6, 6, 6, 5, C.orange + '80'); drawRect(20, 6, 6, 5, C.orange + '80');
        drawRect(12, 12, 8, 3, '#5A2A0A');
        ctx.fillStyle = C.lava + '40'; ctx.fillRect(8, 18, 6, 4); ctx.fillRect(20, 18, 6, 4);
        // Lava glow
        const golemGlow = Math.sin(gameTime * 0.1) * 0.2 + 0.2;
        ctx.fillStyle = `rgba(204, 51, 0, ${golemGlow})`; ctx.fillRect(-2, -2, e.w + 4, e.h + 4);
        break;
      case 'ikan_pedang':
        drawRect(0, 4, 24, 10, '#2A6A8A'); drawRect(-4, 6, 8, 6, '#4A8AAA');
        drawRect(4, 2, 3, 3, C.cyan + 'CC'); drawRect(14, 2, 3, 3, C.cyan + 'CC');
        // Sword nose
        drawRect(-8, 7, 8, 3, '#AACCEE');
        ctx.fillStyle = C.water + '20'; ctx.fillRect(-2, -2, e.w + 4, e.h + 4);
        break;
      case 'ubur_ubur':
        drawRect(4, 8, 16, 12, '#4A2A6A'); drawRect(2, 0, 20, 10, '#6A3A8A');
        // Tentacles
        drawRect(4, 20, 3, 8, '#5A2A7A'); drawRect(10, 20, 3, 10, '#5A2A7A'); drawRect(16, 20, 3, 8, '#5A2A7A');
        // Electric field
        const electricPulse = Math.sin(gameTime * 0.15) * 0.3 + 0.3;
        ctx.fillStyle = `rgba(0, 206, 209, ${electricPulse})`; ctx.fillRect(-8, -4, e.w + 16, e.h + 12);
        drawRect(6, 2, 4, 4, C.cyan + 'AA'); drawRect(14, 2, 4, 4, C.cyan + 'AA');
        break;
      case 'prajurit_jahat':
        drawRect(4, 10, 16, 14, '#4A4A5A'); drawRect(2, 2, 20, 10, '#3A3A4A');
        drawRect(6, 4, 3, 3, C.red + 'CC'); drawRect(15, 4, 3, 3, C.red + 'CC');
        // Helmet
        drawRect(3, 0, 18, 5, '#5A5A6A');
        // Sword
        drawRect(18, 10, 3, 14, '#9A9AAA'); drawRect(17, 22, 5, 3, C.goldDark);
        if (e.blockTimer > 0) {
          // Shield visual
          drawRect(-4, 8, 12, 16, '#6A6A7A');
          ctx.fillStyle = C.cyan + '30'; ctx.fillRect(-4, 8, 12, 16);
        }
        break;
      case 'raksasa_kecil':
        drawRect(4, 12, 22, 20, '#6A5A4A'); drawRect(0, 4, 28, 12, '#5A4A3A');
        drawRect(6, 6, 5, 4, C.red + '80'); drawRect(19, 6, 5, 4, C.red + '80');
        drawRect(10, 10, 8, 3, '#4A3A2A');
        // Arms
        drawRect(-4, 14, 8, 16, '#6A5A4A'); drawRect(24, 14, 8, 16, '#6A5A4A');
        break;
    }

    ctx.globalAlpha = 1; ctx.restore();
    if (e.hp < e.maxHp) drawBar(ex, ey - 8, e.w, 4, e.hp / e.maxHp, '#333', C.red);
  });
}

// ---- BOSS ----
export function drawBoss(boss, bossActive) {
  if (!boss || !boss.alive || !bossActive) return;
  const ctx = getCtx();
  const bx = boss.x - camera.x;
  const by = boss.y - camera.y;
  ctx.save();
  ctx.translate(bx + boss.w / 2, by + boss.h / 2);
  ctx.scale(boss.facing, 1);
  ctx.translate(-boss.w / 2, -boss.h / 2);
  if (boss.hurtTimer > 0) ctx.globalAlpha = 0.6;
  if (boss.isTelegraphing) {
    const teleAlpha = 0.3 + Math.sin(gameTime * 0.3) * 0.15;
    const teleColor = boss.phase === 3 ? C.red : C.orange;
    ctx.fillStyle = teleColor + Math.floor(teleAlpha * 255).toString(16).padStart(2, '0');
    ctx.fillRect(-6, -6, boss.w + 12, boss.h + 12);
  }
  if (boss.staggered) {
    const stagAlpha = Math.sin(gameTime * 0.3) * 0.3 + 0.3;
    ctx.fillStyle = `rgba(255, 215, 0, ${stagAlpha})`;
    ctx.fillRect(-4, -4, boss.w + 8, boss.h + 8);
  }

  // Souls-like v0.7.1: Phase 2 transition visual
  if (boss.phase2Transitioned && boss.recoveryTimer > 30) {
    const transAlpha = Math.sin(gameTime * 0.3) * 0.3 + 0.4;
    ctx.fillStyle = `rgba(255, 0, 0, ${transAlpha})`;
    ctx.fillRect(-10, -10, boss.w + 20, boss.h + 20);
    ctx.fillStyle = `rgba(255, 215, 0, ${transAlpha * 0.5})`;
    ctx.fillRect(-5, -5, boss.w + 10, boss.h + 10);
  }


  // Souls-like v0.7.2: Phase 3 (Rage) aura
  if (boss.phase === 3) {
    const rageAlpha = Math.floor(60 + Math.sin(gameTime * 0.4) * 30).toString(16).padStart(2, '0');
    ctx.strokeStyle = C.red + rageAlpha;
    ctx.lineWidth = 3 + Math.sin(gameTime * 0.5) * 2;
    ctx.strokeRect(-8, -8, boss.w + 16, boss.h + 16);

    // Fire particles effect
    if (gameTime % 5 === 0) {
      // Note: we don't have easy access to spawnParticle here without importing it
      // but we can draw some "embers" directly
      ctx.fillStyle = C.orange + '80';
      const ox = Math.random() * boss.w;
      const oy = Math.random() * boss.h;
      ctx.fillRect(ox, oy - gameTime % 20, 3, 3);
    }
  }

  const sid = boss.stageId || 0;
  switch (sid) {
    case 0: drawPenjagaBatu(ctx, boss); break;
    case 1: drawRajaHutan(ctx, boss); break;
    case 2: drawNagaApi(ctx, boss); break;
    case 3: drawRaksasaLaut(ctx, boss); break;
    case 4: drawRaksasaTerakhir(ctx, boss); break;
    default: drawPenjagaBatu(ctx, boss); break;
  }

  ctx.globalAlpha = 1; ctx.restore();
}

function drawPenjagaBatu(ctx, boss) {
  drawRect(4, 16, 40, 40, C.stone); drawRect(0, 8, 48, 12, C.stoneDark);
  if (boss.staggered) { drawRect(8, 6, 32, 14, C.stoneDark); drawRect(12, 8, 24, 10, C.stone); }
  else { drawRect(8, 0, 32, 14, C.stoneDark); drawRect(12, 2, 24, 10, C.stone); }
  const eyeGlow = Math.sin(gameTime * 0.1) * 0.3 + 0.7;
  ctx.fillStyle = boss.phase === 3 ? C.red : `rgba(255, 68, 68, ${eyeGlow})`;
  ctx.fillRect(16, boss.staggered ? 10 : 4, 6, 4);
  ctx.fillRect(28, boss.staggered ? 10 : 4, 6, 4);
  drawRect(18, boss.staggered ? 14 : 9, 14, 3, C.stoneDark);
  const armSwing = boss.isTelegraphing ? Math.sin(gameTime * 0.5) * 6 : 0;
  const attackSwing = boss.recoveryTimer > BOSS_RECOVERY_FRAMES - 10 ? Math.sin((BOSS_RECOVERY_FRAMES - boss.recoveryTimer) * 0.8) * 10 : 0;
  drawRect(-8, 20 + armSwing + attackSwing, 12, 24, C.stone);
  drawRect(44, 20 - armSwing - attackSwing, 12, 24, C.stone);
  ctx.fillStyle = C.gold + '30'; ctx.fillRect(16, 20, 16, 4); ctx.fillRect(20, 28, 8, 4);
  ctx.fillStyle = C.red + '50'; ctx.fillRect(12, 30, 4, 6); ctx.fillRect(32, 30, 4, 6);
  if (boss.phase >= 2) {
    ctx.fillStyle = C.red + '30'; ctx.fillRect(0, 0, 48, 56);
    ctx.strokeStyle = C.gold + '60'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, 16); ctx.lineTo(24, 30); ctx.lineTo(18, 40); ctx.stroke();
  }
  if (boss.phase === 3) {
    const auraAlpha = 0.15 + Math.sin(gameTime * 0.15) * 0.1;
    ctx.fillStyle = `rgba(255, 0, 0, ${auraAlpha})`;
    ctx.fillRect(-8, -8, boss.w + 16, boss.h + 16);
  }
}

function drawRajaHutan(ctx, boss) {
  // Tiger-like boss
  drawRect(8, 18, 40, 36, '#AA7722'); drawRect(4, 8, 48, 14, '#886611');
  drawRect(12, 0, 36, 12, '#776611');
  // Eyes
  ctx.fillStyle = boss.phase === 3 ? C.red : C.gold;
  ctx.fillRect(20, 4, 6, 4); ctx.fillRect(34, 4, 6, 4);
  // Stripes
  ctx.fillStyle = '#664400';
  ctx.fillRect(16, 22, 3, 28); ctx.fillRect(26, 22, 3, 28); ctx.fillRect(36, 22, 3, 28);
  // Claws
  const clawSwing = boss.isTelegraphing ? Math.sin(gameTime * 0.6) * 8 : 0;
  drawRect(-4, 20 + clawSwing, 12, 20, '#AA7722');
  drawRect(44, 20 - clawSwing, 12, 20, '#AA7722');
  ctx.fillStyle = C.goldDark; ctx.fillRect(-2, 38 + clawSwing, 6, 4); ctx.fillRect(48, 38 - clawSwing, 6, 4);
  if (boss.phase >= 2) {
    ctx.fillStyle = C.orange + '30'; ctx.fillRect(0, 0, boss.w, boss.h);
  }
  if (boss.phase === 3) {
    const auraAlpha = 0.2 + Math.sin(gameTime * 0.12) * 0.1;
    ctx.fillStyle = `rgba(255, 100, 0, ${auraAlpha})`;
    ctx.fillRect(-6, -6, boss.w + 12, boss.h + 12);
  }
}

function drawNagaApi(ctx, boss) {
  // Dragon-like boss
  drawRect(8, 20, 44, 38, '#8A2A1A'); drawRect(4, 10, 50, 14, '#6A1A0A');
  drawRect(10, 0, 40, 14, '#5A0A0A');
  // Dragon eyes
  ctx.fillStyle = boss.phase === 3 ? '#FF0000' : C.orange;
  ctx.fillRect(18, 4, 8, 5); ctx.fillRect(34, 4, 8, 5);
  // Horns
  drawRect(12, -8, 4, 12, '#6A1A0A'); drawRect(40, -8, 4, 12, '#6A1A0A');
  // Wings (subtle)
  ctx.fillStyle = '#4A0A0A60';
  ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-20, 10); ctx.lineTo(-10, 40); ctx.fill();
  ctx.beginPath(); ctx.moveTo(52, 20); ctx.lineTo(72, 10); ctx.lineTo(62, 40); ctx.fill();
  // Tail
  ctx.fillStyle = '#6A1A0A'; ctx.fillRect(44, 46, 16, 6);
  // Fire breath glow
  if (boss.isTelegraphing && boss.telegraphType === 'fireBreath') {
    ctx.fillStyle = C.orange + '40'; ctx.fillRect(0, 8, 60, 20);
  }
  if (boss.phase >= 2) {
    ctx.fillStyle = C.lava + '30'; ctx.fillRect(0, 0, boss.w, boss.h);
    const flamePulse = Math.sin(gameTime * 0.1) * 0.2 + 0.2;
    ctx.fillStyle = `rgba(255, 100, 0, ${flamePulse})`; ctx.fillRect(-4, -4, boss.w + 8, boss.h + 8);
  }
  if (boss.phase === 3) {
    ctx.fillStyle = `rgba(255, 0, 0, 0.2)`; ctx.fillRect(-10, -10, boss.w + 20, boss.h + 20);
  }
}

function drawRaksasaLaut(ctx, boss) {
  // Sea monster boss
  drawRect(8, 22, 48, 42, '#2A4A6A'); drawRect(4, 12, 54, 14, '#1A3A5A');
  drawRect(10, 0, 44, 16, '#0A2A4A');
  // Eyes
  ctx.fillStyle = boss.phase === 3 ? C.cyan : '#4AF';
  ctx.fillRect(20, 6, 8, 5); ctx.fillRect(38, 6, 8, 5);
  // Tentacles
  const tentSwing = Math.sin(gameTime * 0.08) * 8;
  drawRect(-12, 24 + tentSwing, 16, 30, '#2A4A6A');
  drawRect(52, 24 - tentSwing, 16, 30, '#2A4A6A');
  drawRect(-8, 40 - tentSwing, 12, 20, '#1A3A5A');
  drawRect(56, 40 + tentSwing, 12, 20, '#1A3A5A');
  // Water aura
  const waterPulse = Math.sin(gameTime * 0.06) * 0.15 + 0.15;
  ctx.fillStyle = `rgba(30, 90, 142, ${waterPulse})`; ctx.fillRect(-8, -4, boss.w + 16, boss.h + 12);
  if (boss.phase >= 2) {
    ctx.fillStyle = C.cyan + '20'; ctx.fillRect(0, 0, boss.w, boss.h);
  }
  if (boss.phase === 3) {
    ctx.fillStyle = `rgba(0, 100, 200, 0.2)`; ctx.fillRect(-10, -10, boss.w + 20, boss.h + 20);
  }
}

function drawRaksasaTerakhir(ctx, boss) {
  // Ultimate boss - grand and imposing
  drawRect(8, 24, 52, 42, '#5A4A3A'); drawRect(4, 14, 58, 14, '#4A3A2A');
  drawRect(10, 0, 48, 18, '#3A2A1A');
  // Crown
  drawRect(16, -8, 36, 10, C.gold); drawRect(20, -14, 6, 8, C.gold); drawRect(32, -14, 6, 8, C.gold); drawRect(44, -14, 6, 8, C.gold);
  // Divine eyes
  ctx.fillStyle = boss.phase === 3 ? '#FF4400' : C.goldLight;
  ctx.fillRect(22, 6, 8, 5); ctx.fillRect(40, 6, 8, 5);
  // Armor details
  ctx.fillStyle = C.gold + '40'; ctx.fillRect(12, 28, 44, 4); ctx.fillRect(16, 36, 36, 4);
  ctx.fillStyle = C.gold + '20'; ctx.fillRect(20, 44, 28, 4);
  // Arms
  const armSwing = boss.isTelegraphing ? Math.sin(gameTime * 0.4) * 8 : 0;
  drawRect(-10, 22 + armSwing, 14, 28, '#4A3A2A'); drawRect(56, 22 - armSwing, 14, 28, '#4A3A2A');
  // Shield on left arm
  drawRect(-14, 26 + armSwing, 10, 18, C.gold + '80');
  // Divine aura
  const divineAlpha = Math.sin(gameTime * 0.08) * 0.15 + 0.15;
  ctx.fillStyle = `rgba(212, 175, 55, ${divineAlpha})`; ctx.fillRect(-8, -8, boss.w + 16, boss.h + 16);
  if (boss.phase >= 2) {
    ctx.fillStyle = C.red + '20'; ctx.fillRect(0, 0, boss.w, boss.h);
    ctx.fillStyle = C.gold + '15'; ctx.fillRect(-4, -4, boss.w + 8, boss.h + 8);
  }
  if (boss.phase === 3) {
    ctx.fillStyle = `rgba(255, 50, 0, 0.25)`; ctx.fillRect(-12, -12, boss.w + 24, boss.h + 24);
    ctx.fillStyle = `rgba(212, 175, 55, 0.15)`; ctx.fillRect(-8, -8, boss.w + 16, boss.h + 16);
  }
}

// ---- ITEMS ----
export function drawItems(entities) {
  const ctx = getCtx();
  entities.forEach(e => {
    if (e.type !== 'item' || e.collected) return;
    const ix = e.x - camera.x;
    const iy = e.y - camera.y + Math.sin(gameTime * 0.05 + e.bobOffset) * 4;
    ctx.fillStyle = C.gold + '15'; ctx.fillRect(ix - 4, iy - 4, e.w + 8, e.h + 8);
    if (e.itemType === 'potion') {
      const potionColor = e.subType === 'stamina' ? C.stamina :
        e.subType === 'strength' ? C.red :
        e.subType === 'defense' ? C.cyan :
        e.subType === 'speed' ? C.green : C.green + '80';
      drawRect(ix + 2, iy, 12, 14, potionColor + '80'); drawRect(ix + 4, iy - 2, 8, 4, '#44AA44'); drawRect(ix + 6, iy - 4, 4, 3, '#44AA44');
    } else if (e.itemType === 'kristal') {
      ctx.fillStyle = C.cyan + 'AA'; ctx.beginPath();
      ctx.moveTo(ix + 8, iy); ctx.lineTo(ix + 16, iy + 8); ctx.lineTo(ix + 8, iy + 16); ctx.lineTo(ix, iy + 8); ctx.fill();
    } else if (e.itemType === 'kunci') {
      drawRect(ix + 2, iy + 4, 12, 8, C.gold); drawRect(ix + 4, iy + 2, 8, 3, C.gold); drawRect(ix + 12, iy + 8, 4, 4, C.gold);
    } else if (e.itemType === 'rupiah') {
      drawRect(ix + 2, iy + 2, 12, 12, C.gold); ctx.fillStyle = C.goldDark;
      ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('R', ix + 8, iy + 10);
    } else if (e.itemType === 'equipment') {
      const parts = (e.subType || '').split('_');
      const cat = parts[0];
      const eqColor = cat === 'weapon' ? C.gold : cat === 'armor' ? C.cyan : C.goldLight;
      drawRect(ix + 2, iy, 12, 14, eqColor + '80');
      drawRect(ix + 4, iy - 2, 8, 3, eqColor);
      ctx.fillStyle = eqColor; ctx.font = '6px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(cat === 'weapon' ? 'S' : cat === 'armor' ? 'B' : 'A', ix + 8, iy + 10);
    }
  });
}

// ---- NPC ----
export function drawNPCs(entities) {
  entities.forEach(e => {
    if (e.type !== 'npc') return;
    const ctx = getCtx();
    const nx = e.x - camera.x;
    const ny = e.y - camera.y;
    const bob = Math.sin(gameTime * 0.03 + e.bobOffset) * 2;
    ctx.fillStyle = '#00000040'; ctx.fillRect(nx - 2, ny + e.h - 2, e.w + 4, 4);
    drawRect(nx + 4, ny + 12 + bob, 16, 14, e.npcType === 'pedagang' ? '#6B4226' : '#4A6B42');
    drawRect(nx + 2, ny + 8 + bob, 20, 8, e.npcType === 'pedagang' ? '#8B6914' : '#6A8B14');
    drawRect(nx + 6, ny - 2 + bob, 12, 10, '#D4A574');
    drawRect(nx + 5, ny - 5 + bob, 14, 5, '#3D2B1F');
    ctx.fillStyle = '#000'; ctx.fillRect(nx + 9, ny + 1 + bob, 2, 2); ctx.fillRect(nx + 14, ny + 1 + bob, 2, 2);
    ctx.fillRect(nx + 10, ny + 5 + bob, 4, 1);
    drawText(e.name, nx + e.w / 2, ny - 14 + bob, 10, C.gold, 'center');
    const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
    if (dist < 60) {
      const label = e.npcType === 'pedagang' ? '[E] Toko' : '[E] Bicara';
      drawText(label, nx + e.w / 2, ny - 26 + bob, 10, C.goldLight, 'center');
    }
  });
}

// ---- PUZZLE TRIGGERS ----
export function drawPuzzleTriggers(entities) {
  entities.forEach(e => {
    if (e.type !== 'puzzleTrigger') return;
    const ctx = getCtx();
    const px = e.x - camera.x;
    const py = e.y - camera.y;
    ctx.fillStyle = e.activated ? C.gold + '40' : C.gold + '15';
    ctx.fillRect(px, py, e.w, e.h);
    drawOutline(px, py, e.w, e.h, e.activated ? C.gold + '80' : C.gold + '30', 2);
    if (!e.activated) {
      drawRect(px + 12, py + 16, 8, 8, C.gold); drawRect(px + 10, py + 12, 12, 6, C.goldDark);
      const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
      if (dist < 50) drawText('[E] Puzzle', px + e.w / 2, py - 10, 10, C.goldLight, 'center');
    } else {
      drawRect(px + 4, py + 8, 24, 36, '#000');
      ctx.fillStyle = C.goldLight + '20'; ctx.fillRect(px + 4, py + 4, 24, 40);
    }
  });
}

// ---- PARTICLES ----
export function drawParticles(particles, floatingTexts) {
  const ctx = getCtx();
  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - camera.x - p.size / 2, p.y - camera.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;
  floatingTexts.forEach(ft => {
    ctx.globalAlpha = ft.life / 60;
    drawText(ft.text, ft.x - camera.x, ft.y - camera.y, 12, ft.color, 'center');
  });
  ctx.globalAlpha = 1;
}

// ---- HUD ----
export function drawHUD(boss, bossActive, deathCount) {
  const stats = getComputedStats(player.level);
  const potionCounts = getPotionCounts();
  const healthPotions = potionCounts.health || 0;

  drawRect(8, 8, 290, 52, '#00000080', 6);
  drawText('HP', 14, 22, 11, C.textDim, 'left');
  drawBar(30, 14, 120, 14, player.hp / stats.maxHp, '#440000', C.red, 3);
  // Souls-like v0.7.1: Rally HP overlay on health bar (yellow portion)
  if (player.rallyHp > 0 && player.rallyTimer > 0) {
    const rallyPct = Math.min(player.rallyHp / stats.maxHp, 1);
    const hpPct = player.hp / stats.maxHp;
    const rallyStart = hpPct;
    const rallyEnd = Math.min(hpPct + rallyPct, 1);
    drawBar(30, 14, 120, 14, rallyEnd, '#440000', '#D4AF3766', 3); // yellow overlay
    // Rally timer indicator
    const rallyAlpha = Math.floor((player.rallyTimer / 300) * 180).toString(16).padStart(2, '0');
    drawText(`Rally: ${Math.ceil(player.rallyHp)}`, 90, 22, 7, C.goldLight + rallyAlpha, 'center');
  }
  drawText(`${Math.ceil(player.hp)}/${stats.maxHp}`, 90, 22, 9, '#fff', 'center');
  drawText('ST', 14, 38, 9, C.textDim, 'left');
  const staminaColor = player.stamina < 20 ? C.red : C.stamina;
  drawBar(30, 30, 120, 10, player.stamina / stats.maxStamina, C.staminaDark, staminaColor, 2);
  drawText(`${Math.ceil(player.stamina)}`, 90, 36, 8, player.stamina < 20 ? C.red : '#fff', 'center');
  // Souls-like v0.7.1: Poise bar below stamina
  drawText('PS', 14, 50, 7, C.textDim, 'left');
  drawBar(30, 43, 120, 6, player.poise / player.maxPoise, '#332200', '#D4AF37', 1);
  // Souls-like v0.7.1: Exhaustion indicator
  if (player.exhausted) {
    drawText('LELAH!', 160, 50, 9, C.red, 'left');
  }
  // Souls-like v0.7.1: Hollowing indicator
  if (player.hollowing > 0) {
    const hollowPct = player.hollowing / HOLLOWING_MAX_LEVEL;
    drawText(`Hollow: ${player.hollowing}/${HOLLOWING_MAX_LEVEL}`, 160, 14, 8, C.red + 'AA', 'left');
  }
  // Souls-like v0.7.1: Two-handing indicator
  if (player.twoHanding) {
    drawText('2TANGAN', 158, 50, 8, C.parryGold, 'left');
  }
  drawText('EN', 158, 30, 11, C.textDim, 'left');
  drawBar(174, 22, 70, 14, player.energy / stats.maxEnergy, '#003344', C.cyan, 3);
  if (player.attacking || player.comboWindow > 0) {
    const comboIdx = (player.attackCombo + 2) % 3;
    drawText(`Combo: ${['1st', '2nd', '3rd'][comboIdx]}`, 158, 38, 9, comboIdx === 2 ? C.goldLight : C.gold, 'left');
  }
  drawRect(GAME_W - 200, 8, 192, 28, '#00000080', 6);
  drawText(`Lv.${player.level}`, GAME_W - 190, 22, 12, C.gold, 'left');
  drawText('EXP', GAME_W - 140, 22, 9, C.textDim, 'left');
  drawBar(GAME_W - 118, 17, 60, 8, player.exp / player.expNext, '#1A1A00', C.gold + '80', 2);
  drawText(`Artefak: ${player.artifacts}/5`, GAME_W - 50, 22, 11, C.gold, 'center');

  // Bottom HUD
  drawRect(8, GAME_H - 36, 460, 28, '#00000080', 6);
  // Souls-like v0.7.0: Estus Flask instead of potion count
  const estusColor = player.estus > 0 ? C.green : C.red + '80';
  drawText(`Estus: ${player.estus}/${player.estusMax}`, 16, GAME_H - 22, 11, estusColor, 'left');
  drawText(`Kunci: ${player.keys}`, 110, GAME_H - 22, 11, C.gold, 'left');
  drawText(`Rupiah: ${player.rupiah}`, 180, GAME_H - 22, 11, C.goldLight, 'left');
  drawText(`Mati: ${deathCount}`, 280, GAME_H - 22, 11, C.red + '80', 'left');
  // Show stamina regen state
  const staminaState = player.inCombat ? '⚔' : '≋';
  drawText(`ATK:${stats.attack} DEF:${stats.defense} ${staminaState}`, 340, GAME_H - 22, 9, C.gold + '60', 'left');
  // Bloodstain indicator
  if (player.bloodstain) {
    const bloodAlpha = Math.sin(gameTime * 0.1) * 0.3 + 0.7;
    drawText(`💀 +${player.bloodstain.rupiah} Rupiah`, GAME_W / 2, GAME_H - 48, 9, C.red + Math.floor(bloodAlpha * 200).toString(16).padStart(2, '0'), 'center');
  }

  // Skill cooldown
  drawRect(GAME_W / 2 - 40, GAME_H - 36, 80, 28, '#00000080', 6);
  if (player.skillCooldown > 0) {
    drawBar(GAME_W / 2 - 36, GAME_H - 32, 72, 20, 1 - player.skillCooldown / player.skillMaxCooldown, '#333', C.gold + '40', 4);
    drawText(`${Math.ceil(player.skillCooldown / 60)}s`, GAME_W / 2, GAME_H - 22, 10, C.textDim, 'center');
  } else { drawText('[Q] Skill', GAME_W / 2, GAME_H - 22, 10, C.gold, 'center'); }

  // Souls-like v0.7.1: Weapon Art cooldown display
  drawRect(GAME_W / 2 + 48, GAME_H - 36, 80, 28, '#00000080', 6);
  if (player.weaponArtCooldown > 0) {
    drawBar(GAME_W / 2 + 52, GAME_H - 32, 72, 20, 1 - player.weaponArtCooldown / 180, '#332200', C.parryGold + '40', 4);
    drawText(`${Math.ceil(player.weaponArtCooldown / 60)}s`, GAME_W / 2 + 88, GAME_H - 22, 10, C.textDim, 'center');
  } else { drawText('[G] Seni', GAME_W / 2 + 88, GAME_H - 22, 10, C.parryGold, 'center'); }

  // Active buffs display
  let buffX = GAME_W / 2 - 60;
  inventory.activeBuffs.forEach(b => {
    const buffColor = b.buffType === 'attack' ? C.red : b.buffType === 'defense' ? C.cyan : b.buffType === 'speed' ? C.green : C.gold;
    drawRect(buffX, 52, 40, 16, '#00000080', 3);
    const buffLabel = b.buffType === 'attack' ? 'ATK' : b.buffType === 'defense' ? 'DEF' : 'SPD';
    drawText(buffLabel, buffX + 20, 60, 8, buffColor, 'center');
    const timeLeft = Math.ceil(b.remaining / 60);
    drawText(`${timeLeft}s`, buffX + 20, 68, 7, C.textDim, 'center');
    buffX += 44;
  });

  // Status effects — stack vertically to avoid overlap
  let statusY = 82;
  if (player.poisonTimer > 0) {
    drawText('RACUN', GAME_W / 2, statusY, 9, C.green, 'center');
    statusY += 14;
  }
  if (player.slowTimer > 0) {
    drawText('PELAN', GAME_W / 2, statusY, 9, C.cyan, 'center');
    statusY += 14;
  }

  // Boss HP
  if (bossActive && boss && boss.alive) {
    const bw = 300, bx = GAME_W / 2 - bw / 2;
    drawRect(bx, 56 + (inventory.activeBuffs.length > 0 ? 20 : 0), bw, 24, '#000000A0', 4);
    drawText(boss.bossName || 'PENJAGA BATU', GAME_W / 2, 62 + (inventory.activeBuffs.length > 0 ? 20 : 0), 9, C.red, 'center');
    drawBar(bx + 4, 70 + (inventory.activeBuffs.length > 0 ? 20 : 0), bw - 8, 6, boss.hp / boss.maxHp, '#440000', C.red, 2);
    drawBar(bx + 4, 78 + (inventory.activeBuffs.length > 0 ? 20 : 0), bw - 8, 3, boss.posture / boss.maxPosture, '#332200', C.gold + '80', 1);
    drawText(`Phase ${boss.phase}/3`, GAME_W / 2 + bw / 2 + 20, 70 + (inventory.activeBuffs.length > 0 ? 20 : 0), 9, C.red + '80', 'left');
    if (boss.isTelegraphing) {
      const warningAlpha = Math.sin(gameTime * 0.4) * 0.5 + 0.5;
      drawText('!! BERSIAP !!', GAME_W / 2, 48, 14, `rgba(255, 100, 0, ${warningAlpha})`, 'center');
    }
    if (boss.staggered) drawText('STAGGERED!', GAME_W / 2, 92 + (inventory.activeBuffs.length > 0 ? 20 : 0), 12, C.parryGold, 'center');
  }

  const stage = STAGES[currentStageId] || STAGES[0];
  drawText(stage.name, GAME_W / 2, 22, 11, C.gold + '60', 'center');
  drawText('WASD:Gerak SPACE:Serang F:Heavy R:Parry SHIFT:Dodge Q:Skill E:Estus G:Seni H:2Tangan TAB:Inv', GAME_W / 2, GAME_H - 6, 7, C.textDim, 'center');

  // Save indicator
  if (saveIndicatorTimer > 0) {
    saveIndicatorTimer--;
    const alpha = Math.min(1, saveIndicatorTimer / 60);
    drawText('Tersimpan', GAME_W / 2, 40, 11, C.gold + Math.floor(alpha * 200).toString(16).padStart(2, '0'), 'center');
  }
}

// ---- MINI-MAP ----
let miniMapTileMap = null;
export function setMiniMapData(tMap) { miniMapTileMap = tMap; }

// ---- BLOODSTAIN (Souls-like v0.7.0) ----
export function drawBloodstain() {
  if (!player.bloodstain) return;
  const ctx = getCtx();
  const bs = player.bloodstain;
  const bx = bs.x - camera.x;
  const by = bs.y - camera.y;
  // Pulsing blood stain on the ground
  const pulse = Math.sin(gameTime * 0.08) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(139, 0, 0, ${pulse * 0.6})`;
  ctx.beginPath();
  ctx.arc(bx + player.w / 2, by + player.h / 2, 12 + Math.sin(gameTime * 0.1) * 3, 0, Math.PI * 2);
  ctx.fill();
  // Glowing outline
  ctx.strokeStyle = `rgba(255, 68, 68, ${pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx + player.w / 2, by + player.h / 2, 16 + Math.sin(gameTime * 0.1) * 4, 0, Math.PI * 2);
  ctx.stroke();
  // Rupiah icon floating above
  const floatY = Math.sin(gameTime * 0.05) * 4;
  drawText(`${bs.rupiah}R`, bx + player.w / 2, by - 10 + floatY, 10, C.red, 'center');
}

export function drawMiniMap(tileMap, entities, boss, bossActive) {
  if (!tileMap || tileMap.length === 0) return;
  const ctx = getCtx();
  const mmW = 120, mmH = 60;
  const mmX = GAME_W - mmW - 8, mmY = 42;

  // Semi-transparent background
  drawRect(mmX, mmY, mmW, mmH, '#000000AA', 3);
  drawOutline(mmX, mmY, mmW, mmH, C.gold + '30', 1, 3);

  const mapH = tileMap.length;
  const mapW = tileMap[0] ? tileMap[0].length : 1;
  const scaleX = mmW / mapW;
  const scaleY = mmH / mapH;

  // Draw tiles (1px per tile)
  ctx.save();
  ctx.beginPath();
  ctx.rect(mmX, mmY, mmW, mmH);
  ctx.clip();
  for (let ty = 0; ty < mapH; ty++) {
    for (let tx = 0; tx < mapW; tx++) {
      const tile = tileMap[ty][tx];
      if (tile === 0) continue;
      const px = mmX + tx * scaleX;
      const py = mmY + ty * scaleY;
      let color = C.stone + '60';
      if (tile === 2) color = C.gold + '40';
      else if (tile === 3) color = C.lava + '80';
      else if (tile === 4) color = C.water + '80';
      else if (tile === 5) color = C.grass + '60';
      else if (tile === 6) color = C.grassLight + '60';
      else if (tile === 9) color = C.gold + 'AA';
      ctx.fillStyle = color;
      ctx.fillRect(px, py, Math.max(1, scaleX), Math.max(1, scaleY));
    }
  }

  // Draw enemies (orange dots)
  if (entities) {
    entities.forEach(e => {
      if (e.type === 'enemy' && e.alive) {
        const ex = mmX + (e.x / TILE) * scaleX;
        const ey = mmY + (e.y / TILE) * scaleY;
        ctx.fillStyle = C.orange;
        ctx.fillRect(ex - 1, ey - 1, 2, 2);
      }
      // NPCs (green dots)
      if (e.type === 'npc') {
        const nx = mmX + (e.x / TILE) * scaleX;
        const ny = mmY + (e.y / TILE) * scaleY;
        ctx.fillStyle = C.green;
        ctx.fillRect(nx - 1, ny - 1, 3, 3);
      }
    });
  }

  // Boss (red dot)
  if (bossActive && boss && boss.alive) {
    const bx = mmX + (boss.x / TILE) * scaleX;
    const by = mmY + (boss.y / TILE) * scaleY;
    ctx.fillStyle = C.red;
    ctx.fillRect(bx - 2, by - 2, 4, 4);
  }

  // Player (gold dot)
  const plx = mmX + (player.x / TILE) * scaleX;
  const ply = mmY + (player.y / TILE) * scaleY;
  ctx.fillStyle = C.gold;
  ctx.fillRect(plx - 2, ply - 2, 4, 4);

  ctx.restore();
}

// ---- DIALOG ----
export function drawDialog() {
  const dialog = getCurrentDialog();
  if (!dialog) return;
  const boxH = 100, boxY = GAME_H - boxH - 16;
  drawRect(16, boxY, GAME_W - 32, boxH, '#0A0A0AE0', 8);
  drawOutline(16, boxY, GAME_W - 32, boxH, C.gold + '40', 2, 8);
  drawText(dialog.speaker, 32, boxY + 16, 13, C.gold, 'left');
  const text = dialog.lines[dialog.lineIndex].substring(0, dialog.charIndex);
  drawText(text, 32, boxY + 42, 12, C.text, 'left');
  if (dialog.done) {
    const alpha = Math.sin(gameTime * 0.1) * 0.3 + 0.7;
    const ctx = getCtx(); ctx.globalAlpha = alpha;
    drawText('[E/SPACE] Lanjut', GAME_W - 40, boxY + boxH - 16, 10, C.gold + '80', 'right');
    ctx.globalAlpha = 1;
  }
}

// ---- INVENTORY SCREEN ----
let invScroll = 0;
let invTab = 0; // 0=items, 1=equipment, 2=stats
export function setInvTab(v) { invTab = v; }

export function drawInventory() {
  const ctx = getCtx();
  drawRect(0, 0, GAME_W, GAME_H, '#000000DD');

  // Title
  drawText('INVENTORI', GAME_W / 2, 30, 24, C.gold, 'center');

  // Tab buttons
  const tabNames = ['Item', 'Perlengkapan', 'Statistik'];
  tabNames.forEach((name, i) => {
    const tx = 80 + i * 180;
    const isActive = invTab === i;
    drawRect(tx, 50, 160, 30, isActive ? C.gold + '30' : '#1A1A1A', 4);
    drawOutline(tx, 50, 160, 30, isActive ? C.gold : C.gold + '30', 1, 4);
    drawText(name, tx + 80, 65, 12, isActive ? C.gold : C.textDim, 'center');
    if (mouse.clicked && mouse.x >= tx && mouse.x <= tx + 160 && mouse.y >= 50 && mouse.y <= 80) {
      invTab = i;
    }
  });

  if (invTab === 0) {
    // Items tab
    drawRect(40, 90, 500, 380, '#0A0A0A80', 6);
    drawOutline(40, 90, 500, 380, C.gold + '20', 1, 6);

    const items = inventory.items;
    if (items.length === 0) {
      drawText('Inventori kosong', 290, 250, 14, C.textDim, 'center');
    }

    const maxShow = 12;
    const startIdx = Math.min(invScroll, Math.max(0, items.length - maxShow));
    for (let i = 0; i < maxShow; i++) {
      const idx = startIdx + i;
      if (idx >= items.length) break;
      const item = items[idx];
      const iy = 100 + i * 30;
      const isHovered = mouse.x >= 50 && mouse.x <= 520 && mouse.y >= iy && mouse.y <= iy + 28;

      drawRect(50, iy, 470, 28, isHovered ? C.gold + '15' : '#1A1A0A', 3);
      const itemColor = item.type === 'potion' ? C.green : item.category === 'weapon' ? C.red : item.category === 'armor' ? C.cyan : C.goldLight;
      drawText(item.name || item.id, 60, iy + 14, 11, itemColor, 'left');
      if (item.desc) drawText(item.desc, 220, iy + 14, 9, C.textDim, 'left');

      // Action buttons
      if (isHovered) {
        const canEquip = item.category === 'weapon' || item.category === 'armor' || item.category === 'accessory';
        const canUse = item.type === 'potion';
        if (canEquip) {
          drawRect(400, iy + 2, 50, 22, C.gold + '30', 3);
          drawText('Pasang', 425, iy + 13, 9, C.gold, 'center');
          if (mouse.clicked) {
            const importIndex = idx;
            // equipItem will be called from game.js
            return { action: 'equip', index: importIndex };
          }
        }
        if (canUse) {
          drawRect(458, iy + 2, 50, 22, C.green + '30', 3);
          drawText('Pakai', 483, iy + 13, 9, C.green, 'center');
          if (mouse.clicked) {
            return { action: 'use', index: idx };
          }
        }
      }
    }
  } else if (invTab === 1) {
    // Equipment tab
    drawRect(40, 90, 500, 380, '#0A0A0A80', 6);
    drawOutline(40, 90, 500, 380, C.gold + '20', 1, 6);

    const slots = ['weapon', 'armor', 'accessory'];
    const slotLabels = ['Senjata', 'Baju Besi', 'Aksesoris'];
    slots.forEach((slot, i) => {
      const sy = 110 + i * 80;
      drawRect(60, sy, 460, 65, '#1A1A0A', 4);
      drawOutline(60, sy, 460, 65, C.gold + '20', 1, 4);
      drawText(slotLabels[i], 70, sy + 16, 12, C.gold, 'left');

      const equipped = slot === 'weapon' ? getEquippedWeapon() : slot === 'armor' ? getEquippedArmor() : getEquippedAccessory();
      if (equipped) {
        drawText(equipped.name, 70, sy + 35, 14, C.text, 'left');
        let statText = '';
        if (equipped.attack !== undefined) statText += `ATK:${equipped.attack} `;
        if (equipped.defense !== undefined) statText += `DEF:${equipped.defense} `;
        if (equipped.speed !== undefined) statText += `SPD:${equipped.speed} `;
        if (equipped.effect) statText += `${equipped.desc}`;
        drawText(statText, 70, sy + 52, 9, C.textDim, 'left');
      } else {
        drawText('Kosong', 70, sy + 35, 14, C.textDim, 'left');
      }

      // Unequip button
      if (inventory.equipment[slot]) {
        drawRect(440, sy + 15, 60, 30, C.red + '20', 3);
        drawText('Lepas', 470, sy + 30, 10, C.red + '80', 'center');
        if (mouse.clicked && mouse.x >= 440 && mouse.x <= 500 && mouse.y >= sy + 15 && mouse.y <= sy + 45) {
          return { action: 'unequip', slot };
        }
      }
    });
  } else if (invTab === 2) {
    // Stats tab
    drawRect(40, 90, 500, 380, '#0A0A0A80', 6);
    drawOutline(40, 90, 500, 380, C.gold + '20', 1, 6);

    const stats = getComputedStats(player.level);
    drawText(`Level: ${player.level}`, 60, 115, 14, C.gold, 'left');
    drawText(`Poin Keahlian: ${inventory.skillPoints}`, 250, 115, 14, inventory.skillPoints > 0 ? C.cyan : C.textDim, 'left');

    const statEntries = [
      { key: 'maxHp', label: 'HP Maks', value: stats.maxHp, base: 100 + (player.level - 1) * 10 },
      { key: 'maxStamina', label: 'Stamina Maks', value: Math.round(stats.maxStamina), base: 100 + (player.level - 1) * 5 },
      { key: 'maxEnergy', label: 'Energi Maks', value: Math.round(stats.maxEnergy), base: 100 + (player.level - 1) * 5 },
      { key: 'attack', label: 'Serangan', value: stats.attack, base: 0 },
      { key: 'defense', label: 'Pertahanan', value: stats.defense, base: 0 },
      { key: 'speed', label: 'Kecepatan', value: stats.speed.toFixed(2), base: 3.2 },
    ];

    STAT_NAMES.forEach((stat, i) => {
      const sy = 145 + i * 40;
      const entry = statEntries.find(e => e.key === (stat === 'hp' ? 'maxHp' : stat === 'stamina' ? 'maxStamina' : stat === 'energy' ? 'maxEnergy' : stat));
      drawRect(60, sy, 460, 32, '#1A1A0A', 3);
      drawText(STAT_LABELS[stat], 70, sy + 16, 12, C.gold, 'left');
      if (entry) {
        drawText(`${entry.value}`, 180, sy + 16, 12, C.text, 'left');
        drawText(`(dasar: ${entry.base})`, 280, sy + 16, 9, C.textDim, 'left');
      }
      drawText(`Dialokasi: ${inventory.allocatedStats[stat]}`, 400, sy + 16, 9, C.cyan, 'left');

      // Allocate button
      if (inventory.skillPoints > 0) {
        drawRect(480, sy + 4, 28, 24, C.gold + '30', 3);
        drawText('+', 494, sy + 16, 14, C.gold, 'center');
        if (mouse.clicked && mouse.x >= 480 && mouse.x <= 508 && mouse.y >= sy + 4 && mouse.y <= sy + 28) {
          return { action: 'allocate', stat };
        }
      }
    });
  }

  // Close button + save option
  drawText('[TAB/ESC] Tutup  |  [S] Simpan', GAME_W / 2, GAME_H - 20, 12, C.textDim, 'center');

  if (justPressed('Escape') || justPressed('Tab') || justPressed('KeyI')) {
    return { action: 'close' };
  }
  if (justPressed('KeyS')) {
    return { action: 'save' };
  }
  return null;
}

// ---- SHOP SCREEN ----
export function drawShop() {
  const ctx = getCtx();
  drawRect(0, 0, GAME_W, GAME_H, '#000000DD');

  // Title
  drawText('TOKO', GAME_W / 2, 30, 24, C.gold, 'center');
  drawText(`Rupiah: ${player.rupiah}`, GAME_W - 80, 30, 14, C.goldLight, 'right');

  // Tab buttons
  TAB_NAMES.forEach((name, i) => {
    const tx = 80 + i * 160;
    const isActive = shopState.tab === i;
    drawRect(tx, 50, 140, 28, isActive ? C.gold + '30' : '#1A1A1A', 4);
    drawOutline(tx, 50, 140, 28, isActive ? C.gold : C.gold + '30', 1, 4);
    drawText(name, tx + 70, 64, 11, isActive ? C.gold : C.textDim, 'center');
    if (mouse.clicked && mouse.x >= tx && mouse.x <= tx + 140 && mouse.y >= 50 && mouse.y <= 78) {
      shopState.tab = i;
    }
  });

  // Items for current tab
  const items = getCurrentTabItems();
  drawRect(40, 86, GAME_W - 80, 360, '#0A0A0A80', 6);
  drawOutline(40, 86, GAME_W - 80, 360, C.gold + '20', 1, 6);

  const maxShow = 6;
  for (let i = 0; i < Math.min(maxShow, items.length); i++) {
    const item = items[i];
    const iy = 96 + i * 56;
    const isHovered = mouse.x >= 50 && mouse.x <= GAME_W - 50 && mouse.y >= iy && mouse.y <= iy + 52;

    drawRect(50, iy, GAME_W - 100, 50, isHovered ? C.gold + '15' : '#1A1A0A', 3);

    drawText(item.name, 60, iy + 16, 13, C.text, 'left');
    // Stats
    let statText = '';
    if (item.attack !== undefined) statText += `ATK:${item.attack} `;
    if (item.defense !== undefined) statText += `DEF:${item.defense} `;
    if (item.speed !== undefined) statText += `SPD:${item.speed} `;
    if (item.value !== undefined && item.type === 'health') statText += `HP:+${item.value} `;
    if (item.value !== undefined && item.type === 'stamina') statText += `STA:+${item.value} `;
    if (item.value !== undefined && item.type === 'buff') statText += `${item.desc} `;
    if (item.desc && item.type !== 'buff') statText += item.desc;
    drawText(statText, 60, iy + 34, 9, C.textDim, 'left');

    // Price
    drawText(`${item.price} R`, GAME_W - 180, iy + 16, 12, C.goldLight, 'left');

    // Buy button
    if (player.rupiah >= item.price) {
      drawRect(GAME_W - 120, iy + 8, 60, 30, C.gold + '30', 3);
      drawText('Beli', GAME_W - 90, iy + 23, 11, C.gold, 'center');
    } else {
      drawRect(GAME_W - 120, iy + 8, 60, 30, '#333', 3);
      drawText('Beli', GAME_W - 90, iy + 23, 11, C.textDim, 'center');
    }

    if (isHovered && mouse.clicked && player.rupiah >= item.price) {
      return { action: 'buy', category: item.category, itemId: item.id };
    }
  }

  // Sell section - show inventory items that can be sold
  drawText('Jual Item:', 50, 456, 12, C.gold, 'left');
  const sellItems = inventory.items.filter(i => i.price && i.price > 0);
  for (let i = 0; i < Math.min(3, sellItems.length); i++) {
    const item = sellItems[i];
    const sx = 150 + i * 200;
    drawRect(sx, 448, 180, 26, '#1A1A0A', 3);
    drawText(`${item.name} (${Math.floor(item.price * 0.5)}R)`, sx + 5, 461, 9, C.text, 'left');
    if (mouse.clicked && mouse.x >= sx && mouse.x <= sx + 180 && mouse.y >= 448 && mouse.y <= 474) {
      const invIdx = inventory.items.indexOf(item);
      if (invIdx >= 0) return { action: 'sell', index: invIdx };
    }
  }

  // Message
  if (shopState.messageTimer > 0) {
    shopState.messageTimer--;
    drawText(shopState.message, GAME_W / 2, 490, 12, C.gold, 'center');
  }

  // Close
  drawText('[ESC] Tutup', GAME_W / 2, GAME_H - 15, 12, C.textDim, 'center');

  if (justPressed('Escape')) {
    return { action: 'close' };
  }
  return null;
}

// ---- STAGE SELECT ----
let stageSelectScroll = 0;

export function drawStageSelect(unlockedStages) {
  const ctx = getCtx();
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, '#0A0A0A'); grad.addColorStop(0.5, '#0D0A1A'); grad.addColorStop(1, '#0A0A0A');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Floating particles
  for (let i = 0; i < 20; i++) {
    const x = (i * 137 + gameTime * 0.3) % GAME_W;
    const y = (i * 97 + gameTime * 0.2) % GAME_H;
    ctx.fillStyle = C.gold + '30'; ctx.fillRect(x, y, 2, 2);
  }

  drawText('PILIH TAHAP', GAME_W / 2, 40, 28, C.gold, 'center');
  drawText(`Rupiah: ${player.rupiah}  |  Level: ${player.level}  |  Artefak: ${player.artifacts}/5`, GAME_W / 2, 70, 12, C.goldLight + '80', 'center');

  // Shop button
  drawRect(GAME_W - 150, 20, 120, 35, C.gold + '20', 6);
  drawOutline(GAME_W - 150, 20, 120, 35, C.gold + '60', 1, 6);
  drawText('Toko', GAME_W - 90, 37, 14, C.gold, 'center');
  if (mouse.clicked && mouse.x >= GAME_W - 150 && mouse.x <= GAME_W - 30 && mouse.y >= 20 && mouse.y <= 55) {
    return { action: 'shop' };
  }

  // Stage cards
  STAGES.forEach((stage, i) => {
    const cx = 60 + (i % 3) * 290;
    const cy = 100 + Math.floor(i / 3) * 180;
    const isUnlocked = unlockedStages[i];
    const isSelected = mouse.x >= cx && mouse.x <= cx + 270 && mouse.y >= cy && mouse.y <= cy + 160;

    drawRect(cx, cy, 270, 160, isUnlocked ? (isSelected ? stage.bg2 + 'CC' : stage.bg2 + '80') : '#1A1A1A', 8);
    drawOutline(cx, cy, 270, 160, isUnlocked ? C.gold + '40' : C.gold + '15', 2, 8);

    if (isUnlocked) {
      drawText(stage.name, cx + 135, cy + 30, 18, C.gold, 'center');
      drawText(stage.subtitle, cx + 135, cy + 52, 10, C.textDim, 'center');
      drawText(`Boss: ${stage.bossName}`, cx + 135, cy + 78, 11, C.red + '80', 'center');
      drawText(`HP Boss: ${stage.bossHp}`, cx + 135, cy + 96, 10, C.textDim, 'center');
      drawText(`Artefak: ${stage.artifact}`, cx + 135, cy + 116, 10, C.goldLight + '80', 'center');

      // Stage color accent
      ctx.fillStyle = stage.bg1 + '40';
      ctx.fillRect(cx + 4, cy + 130, 262, 26);

      if (isSelected && mouse.clicked) {
        return { action: 'select', stageId: i };
      }
    } else {
      drawText('TERKUNCI', cx + 135, cy + 60, 20, C.textDim, 'center');
      drawText('Kalahkan boss sebelumnya', cx + 135, cy + 90, 10, C.textDim, 'center');
      // Lock icon
      drawRect(cx + 125, cy + 105, 20, 20, C.stoneDark + '60');
      drawRect(cx + 128, cy + 115, 14, 10, C.stone + '40');
    }
  });

  // Back button
  drawRect(GAME_W / 2 - 60, GAME_H - 45, 120, 30, C.gold + '15', 6);
  drawOutline(GAME_W / 2 - 60, GAME_H - 45, 120, 30, C.gold + '30', 1, 6);
  drawText('[ESC] Menu', GAME_W / 2, GAME_H - 30, 11, C.gold, 'center');

  if (justPressed('Escape')) {
    return { action: 'menu' };
  }

  return null;
}

// ---- MENU ----
let menuSelection = 0;
let menuItems = ['Mulai Baru', 'Lanjutkan', 'Kontrol', 'Tentang'];
let menuParticles = [];
for (let i = 0; i < 30; i++) {
  menuParticles.push({ x: Math.random() * GAME_W, y: Math.random() * GAME_H, size: Math.random() * 2 + 1, speed: Math.random() * 0.5 + 0.2, alpha: Math.random() * 0.5 + 0.2 });
}
let showControls = false;
let showAbout = false;
let showNewGameConfirm = false;

export function drawMenu() {
  const ctx = getCtx();
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, '#0A0A0A'); grad.addColorStop(0.5, '#0D0A1A'); grad.addColorStop(1, '#0A0A0A');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, GAME_W, GAME_H);

  menuParticles.forEach(p => {
    p.y -= p.speed;
    if (p.y < -10) { p.y = GAME_H + 10; p.x = Math.random() * GAME_W; }
    ctx.fillStyle = C.gold + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  ctx.strokeStyle = C.gold + '20'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const y = GAME_H / 2 - 60 + i * 40; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke(); }

  drawText('NUSANTARA', GAME_W / 2, 120, 56, C.gold, 'center');
  drawText('WARISAN TERAKHIR', GAME_W / 2, 170, 22, C.goldLight + '80', 'center');
  drawText('Souls-like Edition', GAME_W / 2, 195, 12, C.red + '60', 'center');

  const dy = 215;
  for (let i = 0; i < 3; i++) {
    const ddx = GAME_W / 2 - 20 + i * 20;
    ctx.fillStyle = C.gold + (i === 1 ? 'CC' : '44');
    ctx.save(); ctx.translate(ddx, dy); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
  }

  // Build dynamic menu items
  const saveExists = hasSaveGame();
  const effectiveMenuItems = saveExists
    ? ['Mulai Baru', 'Lanjutkan', 'Kontrol', 'Tentang']
    : ['Mulai Baru', 'Kontrol', 'Tentang'];
  menuItems = effectiveMenuItems;

  // New game confirmation dialog
  if (showNewGameConfirm) {
    drawRect(GAME_W / 2 - 200, GAME_H / 2 - 60, 400, 120, '#0A0A0AE0', 8);
    drawOutline(GAME_W / 2 - 200, GAME_H / 2 - 60, 400, 120, C.gold + '40', 2, 8);
    drawText('Data simpanan akan hilang!', GAME_W / 2, GAME_H / 2 - 25, 14, C.text, 'center');
    drawText('Mulai permainan baru?', GAME_W / 2, GAME_H / 2, 14, C.gold, 'center');
    drawText('[SPACE] Ya  [ESC] Batal', GAME_W / 2, GAME_H / 2 + 35, 12, C.textDim, 'center');
    if (justPressed('Space')) { showNewGameConfirm = false; return 'startGame'; }
    if (justPressed('Escape')) { showNewGameConfirm = false; }
    return null;
  }

  if (!showControls && !showAbout) {
    menuItems.forEach((item, i) => {
      const y = 260 + i * 50;
      const isSelected = i === menuSelection;
      const w = 220, h = 40, x = GAME_W / 2 - w / 2;
      const isLanjutkan = item === 'Lanjutkan';
      if (isSelected) {
        drawRect(x, y, w, h, C.gold + '15', 6); drawOutline(x, y, w, h, C.gold + '60', 2, 6);
        drawText('◆', x - 20, y + h / 2, 12, C.gold, 'center');
        drawText(item, GAME_W / 2, y + h / 2, 15, C.gold, 'center');
      } else {
        drawText(item, GAME_W / 2, y + h / 2, 14, isLanjutkan ? C.textDim : C.textDim, 'center');
      }
    });
  }

  if (showControls) {
    drawRect(160, 60, GAME_W - 320, GAME_H - 120, '#0A0A0AE0', 8);
    drawOutline(160, 60, GAME_W - 320, GAME_H - 120, C.gold + '30', 2, 8);
    drawText('KONTROL', GAME_W / 2, 90, 20, C.gold, 'center');
    const ctrls = [['W / ↑', 'Lompat'], ['A D / ← →', 'Gerak kiri/kanan'], ['SPACE', 'Serang Ringan (Combo 3x)'], ['SPACE + ↓', 'Tembak Panah Api (jika terpasang)'], ['F', 'Serang Berat'], ['R', 'Parry / Menangkis'], ['SHIFT', 'Dodge / Berguling'], ['Q', 'Skill Spesial'], ['E', 'Interaksi / Minum Ramuan'], ['TAB / I', 'Buka Inventori'], ['ESC', 'Kembali / Menu']];
    ctrls.forEach((c, i) => { drawText(c[0], 220, 130 + i * 28, 12, C.gold, 'left'); drawText(c[1], 460, 130 + i * 28, 12, C.text, 'left'); });
    drawText('[ESC] Kembali', GAME_W / 2, GAME_H - 50, 12, C.textDim, 'center');
  }

  if (showAbout) {
    drawRect(180, 80, GAME_W - 360, GAME_H - 160, '#0A0A0AE0', 8);
    drawOutline(180, 80, GAME_W - 360, GAME_H - 160, C.gold + '30', 2, 8);
    drawText('TENTANG GAME', GAME_W / 2, 115, 20, C.gold, 'center');
    const lines = ['NUSANTARA: Warisan Terakhir', 'Adventure RPG + Puzzle bertema mitologi Nusantara', '', '5 Tahap: Borobudur, Borneo, Bromo, Bali, Prambanan', '5 Boss unik dengan serangan berbeda', 'Sistem perlengkapan, ramuan, dan poin keahlian', 'Simpan otomatis saat checkpoint & kalahkan boss', '', 'Platform: HTML5 + JavaScript (Web Browser)', 'Genre: Adventure RPG + Puzzle (Souls-like Combat)'];
    lines.forEach((l, i) => drawText(l, GAME_W / 2, 155 + i * 22, i === 0 ? 14 : 12, i === 0 ? C.gold : C.text + 'AA', 'center'));
    drawText('[ESC] Kembali', GAME_W / 2, GAME_H - 110, 12, C.textDim, 'center');
  }

  drawText('v0.6.2 — Bug Fix Patch', GAME_W / 2, GAME_H - 30, 9, C.textDim, 'center');

  if (justPressed('ArrowUp') || justPressed('KeyW')) menuSelection = (menuSelection - 1 + menuItems.length) % menuItems.length;
  if (justPressed('ArrowDown') || justPressed('KeyS')) menuSelection = (menuSelection + 1) % menuItems.length;
  if (justPressed('Escape')) { showControls = false; showAbout = false; showNewGameConfirm = false; }
  if (justPressed('Space') || justPressed('Enter') || mouse.clicked) {
    if (showControls || showAbout) { /* ESC handles */ }
    else {
      const selected = menuItems[menuSelection];
      if (selected === 'Mulai Baru') {
        if (saveExists) {
          showNewGameConfirm = true;
        } else {
          return 'startGame';
        }
      } else if (selected === 'Lanjutkan') {
        return 'continueGame';
      } else if (selected === 'Kontrol') {
        showControls = true;
      } else if (selected === 'Tentang') {
        showAbout = true;
      }
    }
    mouse.clicked = false;
  }
  return null;
}

// ---- PUZZLE ----
export function drawPuzzle(pState, gainExpFn) {
  const ctx = getCtx();
  drawRect(0, 0, GAME_W, GAME_H, '#000000CC');
  const stageName = STAGES[currentStageId]?.name || 'Candi Borobudur';
  drawText(`PUZZLE ${stageName.toUpperCase()}`, GAME_W / 2, 60, 20, C.gold, 'center');
  const seqLen = pState.sequence.length;
  drawText(`Ulangi urutan ${seqLen} simbol elemen!`, GAME_W / 2, 85, 12, C.textDim, 'center');
  drawRect(40, 120, GAME_W - 80, 300, '#0A0A0A90', 8);
  drawOutline(40, 120, GAME_W - 80, 300, C.gold + '30', 2, 8);

  if (pState.showingSequence) {
    pState.showTimer++;
    if (pState.showTimer > 40) { pState.showTimer = 0; pState.showIndex++; if (pState.showIndex >= pState.sequence.length) pState.showingSequence = false; }
    if (pState.showIndex < pState.sequence.length) {
      drawText(pState.symbols[pState.sequence[pState.showIndex]], GAME_W / 2, 240, 60, '#fff', 'center');
      drawText(`Urutan ${pState.showIndex + 1}/${pState.sequence.length}`, GAME_W / 2, 290, 14, C.textDim, 'center');
    }
  } else if (pState.solved) {
    drawText('PUZZLE SELESAI!', GAME_W / 2, 240, 28, C.green, 'center');
    drawText('[E] Lanjutkan', GAME_W / 2, 290, 14, C.gold, 'center');
    if (justPressed('KeyE') || justPressed('Space')) { playSound('pickup'); gainExpFn(20 + seqLen * 5); return 'continue'; }
  } else if (pState.failed) {
    drawText('GAGAL! Coba lagi...', GAME_W / 2, 240, 24, C.red, 'center');
    pState.failTimer++;
    if (pState.failTimer > 60) { pState.playerSeq = []; pState.failed = false; pState.failTimer = 0; pState.showingSequence = true; pState.showIndex = 0; pState.showTimer = 0; }
  } else {
    pState.buttons.forEach((btn, i) => {
      const isHighlighted = pState.highlight === i;
      const isHovered = mouse.x >= btn.x && mouse.x <= btn.x + btn.w && mouse.y >= btn.y && mouse.y <= btn.y + btn.h;
      drawRect(btn.x, btn.y, btn.w, btn.h, isHighlighted ? C.gold + '40' : (isHovered ? C.gold + '20' : '#1A1A0A'), 8);
      drawOutline(btn.x, btn.y, btn.w, btn.h, isHighlighted ? C.gold : C.gold + '30', 2, 8);
      drawText(btn.symbol, btn.x + btn.w / 2, btn.y + btn.h / 2 - 5, 28, '#fff', 'center');
      if ((isHovered && mouse.clicked) || justPressed(`Digit${i + 1}`)) {
        pState.highlight = i; pState.highlightTimer = 15;
        pState.playerSeq.push(i); playSound('dialog');
        const idx = pState.playerSeq.length - 1;
        if (pState.playerSeq[idx] !== pState.sequence[idx]) { pState.failed = true; pState.failTimer = 0; playSound('damage'); }
        else if (pState.playerSeq.length === pState.sequence.length) { pState.solved = true; playSound('puzzle'); }
      }
    });
    if (pState.highlightTimer > 0) { pState.highlightTimer--; if (pState.highlightTimer <= 0) pState.highlight = -1; }
    drawText(`Urutan: ${pState.playerSeq.length}/${pState.sequence.length}`, GAME_W / 2, 360, 14, C.text, 'center');
  }
  mouse.clicked = false;
  return null;
}

// ---- BOSS INTRO ----
let bossIntroTimer = 0;
export function resetBossIntroTimer() { bossIntroTimer = 0; }

export function drawBossIntro(tileMap) {
  const ctx = getCtx();
  const stage = STAGES[currentStageId] || STAGES[0];
  bossIntroTimer++;
  drawBackground(); drawLevel(tileMap);
  const progress = bossIntroTimer / 120;
  drawRect(0, 0, GAME_W, GAME_H, `rgba(0,0,0,${Math.min(0.7, progress)})`);
  if (bossIntroTimer > 30) {
    const alpha = Math.min(1, (bossIntroTimer - 30) / 30);
    ctx.globalAlpha = alpha;
    drawText(stage.bossName.toUpperCase(), GAME_W / 2, GAME_H / 2 - 40, 36, C.red, 'center');
    drawText(`Boss Tahap ${stage.id + 1} — ${stage.name}`, GAME_W / 2, GAME_H / 2, 14, C.textDim, 'center');
    drawText('Serang dengan combo untuk mengisi Posture bar!', GAME_W / 2, GAME_H / 2 + 30, 12, C.gold + '80', 'center');
    drawText('Parry serangannya untuk stagger dia! (R)', GAME_W / 2, GAME_H / 2 + 50, 12, C.gold + '60', 'center');
    ctx.globalAlpha = 1;
  }
  if (bossIntroTimer > 120) return 'finish';
  return null;
}

// ---- GAME OVER ----
let gameOverTimer = 0;
export function resetGameOverTimer() { gameOverTimer = 0; }

export function drawGameOver(deathCount) {
  const ctx = getCtx();
  gameOverTimer++;
  const fadeAlpha = Math.min(1, gameOverTimer / 60);
  drawRect(0, 0, GAME_W, GAME_H, `rgba(0,0,0,${fadeAlpha * 0.85})`);
  if (gameOverTimer > 20) {
    const textAlpha = Math.min(1, (gameOverTimer - 20) / 80);
    ctx.globalAlpha = textAlpha;
    drawText('KAMU MATI', GAME_W / 2, GAME_H / 2 - 40, 48, C.red, 'center');
    drawText(`Kematian ke-${deathCount}`, GAME_W / 2, GAME_H / 2 + 10, 14, C.textDim, 'center');
    // Death penalty display
    if (player.lastLostRupiah > 0) {
      drawText(`Rupiah hilang: -${player.lastLostRupiah}`, GAME_W / 2, GAME_H / 2 + 32, 14, C.red + 'CC', 'center');
    }
    // Souls-like v0.7.1: Hollowing warning
    if (player.hollowing > 0) {
      drawText(`Hollowing: ${player.hollowing}/${HOLLOWING_MAX_LEVEL}`, GAME_W / 2, GAME_H / 2 + 50, 12, C.textDim, 'center');
      if (player.hollowing >= 5) {
        drawText('Semakin Hollow...', GAME_W / 2, GAME_H / 2 + 68, 11, C.red + '80', 'center');
      }
    }
    // Souls-like v0.7.1: Bloodstain direction hint
    if (player.bloodstain) {
      const bsDx = player.bloodstain.x - player.checkpoint.x;
      const direction = bsDx > 50 ? '>>>' : bsDx < -50 ? '<<<' : 'dekat';
      drawText(`Darah: ${direction} (+${player.bloodstain.rupiah}R)`, GAME_W / 2, GAME_H / 2 + 85, 11, C.red + '80', 'center');
    }
    ctx.globalAlpha = 1;
  }
  if (gameOverTimer > 90) {
    const optAlpha = Math.min(1, (gameOverTimer - 90) / 30);
    ctx.globalAlpha = optAlpha;
    drawText('[SPACE] Bangkit Kembali', GAME_W / 2, GAME_H / 2 + 55, 14, C.gold, 'center');
    drawText('[ESC] Menu Utama', GAME_W / 2, GAME_H / 2 + 80, 12, C.textDim, 'center');
    ctx.globalAlpha = 1;
  }
  if (justPressed('Space') && gameOverTimer > 90) return 'respawn';
  if (justPressed('Escape') && gameOverTimer > 90) return 'menu';
  return null;
}

// ---- VICTORY ----
export function drawVictory(deathCount) {
  const ctx = getCtx();
  const stage = STAGES[currentStageId] || STAGES[0];
  drawRect(0, 0, GAME_W, GAME_H, '#0A0A0A');
  for (let i = 0; i < 20; i++) {
    const x = (i * 137 + gameTime * 0.5) % GAME_W;
    const y = (i * 97 + gameTime * 0.3) % GAME_H;
    ctx.fillStyle = C.gold + '40'; ctx.fillRect(x, y, 2, 2);
  }
  drawText(stage.artifact.toUpperCase(), GAME_W / 2, 120, 28, C.gold, 'center');
  drawText('DIDAPATKAN!', GAME_W / 2, 160, 36, C.goldLight, 'center');
  drawRect(GAME_W / 2 - 30, 190, 60, 60, '#1A1A0A', 8);
  drawOutline(GAME_W / 2 - 30, 190, 60, 60, C.gold, 2, 8);
  drawText('💎', GAME_W / 2, 220, 30, '#fff', 'center');
  drawText(`${stage.bossName} telah dikalahkan!`, GAME_W / 2, 280, 14, C.text, 'center');
  drawText(`Arjuna mendapatkan ${stage.artifact}`, GAME_W / 2, 305, 12, C.textDim, 'center');
  drawText(`Level: ${player.level}  |  HP: ${Math.ceil(player.hp)}  |  Rupiah: ${player.rupiah}  |  Kematian: ${deathCount}`, GAME_W / 2, 370, 12, C.gold + '80', 'center');

  if (currentStageId < 4) {
    drawText('Tahap berikutnya terbuka!', GAME_W / 2, 400, 14, C.green, 'center');
  } else {
    drawText('SEMUA ARTEFAK TELAH DIKUMPULKAN!', GAME_W / 2, 400, 18, C.goldLight, 'center');
    drawText('Arjuna telah menyelamatkan Nusantara!', GAME_W / 2, 425, 12, C.text, 'center');
  }

  drawText('[SPACE] Lanjutkan', GAME_W / 2, 460, 14, C.gold, 'center');
  drawText('[ESC] Menu Utama', GAME_W / 2, 485, 12, C.textDim, 'center');
  if (justPressed('Escape')) return 'menu';
  if (justPressed('Space')) return currentStageId < 4 ? 'stageSelect' : 'menu';
  return null;
}

// ---- LEVEL UP SCREEN ----
export function drawLevelUp() {
  const ctx = getCtx();
  drawRect(0, 0, GAME_W, GAME_H, '#000000CC');
  drawText('LEVEL UP!', GAME_W / 2, 60, 32, C.gold, 'center');
  drawText(`Level ${player.level}  |  Poin Keahlian: ${inventory.skillPoints}`, GAME_W / 2, 100, 16, C.cyan, 'center');

  const stats = getComputedStats(player.level);
  STAT_NAMES.forEach((stat, i) => {
    const sy = 140 + i * 50;
    drawRect(GAME_W / 2 - 200, sy, 400, 40, '#1A1A0A', 4);
    drawOutline(GAME_W / 2 - 200, sy, 400, 40, C.gold + '20', 1, 4);
    drawText(STAT_LABELS[stat], GAME_W / 2 - 180, sy + 20, 14, C.gold, 'left');
    const statKey = stat === 'hp' ? 'maxHp' : stat === 'stamina' ? 'maxStamina' : stat === 'energy' ? 'maxEnergy' : stat;
    const val = statKey === 'speed' ? stats[statKey].toFixed(2) : stats[statKey];
    drawText(`${val}`, GAME_W / 2, sy + 20, 12, C.text, 'center');

    // Souls-like v0.7.2: Show scaling bonus for Attack
    if (stat === 'attack') {
      const weapon = getEquippedWeapon();
      if (weapon && weapon.scaling) {
        drawText(`(Skala ${weapon.scaling})`, GAME_W / 2 + 35, sy + 32, 8, C.goldLight, 'center');
      }
    }

    drawText(`(+${STAT_PER_POINT[stat]} per poin)`, GAME_W / 2 + 60, sy + 20, 9, C.textDim, 'left');

    // + button
    if (inventory.skillPoints > 0) {
      drawRect(GAME_W / 2 + 150, sy + 6, 30, 28, C.gold + '30', 3);
      drawText('+', GAME_W / 2 + 165, sy + 20, 16, C.gold, 'center');
      if (mouse.clicked && mouse.x >= GAME_W / 2 + 150 && mouse.x <= GAME_W / 2 + 180 && mouse.y >= sy + 6 && mouse.y <= sy + 34) {
        return { action: 'allocate', stat };
      }
    }
  });

  drawText('[ESC/TAB] Lanjutkan', GAME_W / 2, GAME_H - 30, 12, C.textDim, 'center');

  if (justPressed('Escape') || justPressed('Tab') || justPressed('Space')) {
    return { action: 'close' };
  }
  return null;
}
