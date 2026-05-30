// ============================================================
// draw-game.js — All game rendering functions
// ============================================================

import { C, GAME_W, GAME_H, TILE, PARRY_DURATION, PARRY_WINDOW, HEAVY_ATTACK_WINDUP, HEAVY_ATTACK_DURATION, COMBO_1_DURATION, COMBO_2_DURATION, COMBO_3_DURATION, BOSS_RECOVERY_FRAMES } from './config.js';
import { drawText, drawRect, drawBar, drawOutline, getCtx } from './renderer.js';
import { camera } from './camera.js';
import { player } from './player.js';
import { spawnParticle } from './particles.js';
import { justPressed, mouse } from './input.js';
import { playSound } from './audio.js';
import { puzzleState } from './puzzle.js';
import { getCurrentDialog } from './dialog.js';

let gameTime = 0;
export function setGameTime(t) { gameTime = t; }

// ---- BACKGROUND ----
export function drawBackground() {
  const ctx = getCtx();
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, '#0D0A1A');
  grad.addColorStop(0.5, '#1A0A2E');
  grad.addColorStop(1, '#0A0A1A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.fillStyle = '#FFFFFF15';
  for (let i = 0; i < 40; i++) {
    const x = (i * 137 + gameTime * 0.02) % GAME_W;
    const y = (i * 97) % (GAME_H * 0.6);
    const s = (Math.sin(gameTime * 0.03 + i) + 1) * 1.5;
    ctx.fillRect(x, y, s, s);
  }

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

  ctx.fillStyle = '#0F0818';
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
        drawRect(sx, sy, TILE, TILE, C.stoneDark);
        drawRect(sx + 1, sy + 1, TILE - 2, TILE - 2, C.stone);
        ctx.fillStyle = C.stoneLight + '30';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, 2);
        ctx.fillRect(sx + 2, sy + 2, 2, TILE - 4);
        if ((tx + ty) % 4 === 0) { ctx.fillStyle = C.gold + '15'; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8); }
      } else if (tile === 2) {
        drawRect(sx, sy, TILE, TILE / 2, C.stone);
        drawRect(sx, sy, TILE, 3, C.gold + '40');
        ctx.fillStyle = C.stoneDark;
        ctx.fillRect(sx + TILE / 2 - 2, sy + TILE / 2, 4, TILE / 2);
      } else if (tile === 9) {
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
  const clothColor = player.dodging ? C.gold + '80' : '#8B4513';

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
  drawRect(18, 16, 3, 14, C.goldDark);
  drawRect(17, 14, 5, 3, C.gold);

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
    if (e.enemyType === 'batu_kecil') {
      drawRect(2, 8, 16, 16, C.stone); drawRect(0, 0, 20, 10, C.stoneDark);
      drawRect(4, 2, 4, 3, C.red + '60'); drawRect(12, 2, 4, 3, C.red + '60');
      if (e.isAttacking) drawRect(18, 6, 8, 4, C.stoneDark);
    } else if (e.enemyType === 'patung') {
      drawRect(4, 12, 20, 22, C.stone); drawRect(0, 0, 28, 14, C.stoneDark);
      drawRect(2, 2, 24, 10, C.stone); drawRect(6, 3, 5, 4, C.red + '80'); drawRect(17, 3, 5, 4, C.red + '80');
      drawRect(10, 8, 8, 2, C.stoneDark);
      ctx.fillStyle = C.gold + '30'; ctx.fillRect(6, 14, 4, 4); ctx.fillRect(18, 14, 4, 4);
      if (e.isAttacking) drawRect(26, 8, 10, 6, C.stone);
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
    ctx.strokeStyle = C.red + '80'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(15, 35); ctx.lineTo(10, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38, 18); ctx.lineTo(35, 32); ctx.lineTo(38, 48); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
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
      drawRect(ix + 2, iy, 12, 14, C.green + '80'); drawRect(ix + 4, iy - 2, 8, 4, '#44AA44'); drawRect(ix + 6, iy - 4, 4, 3, '#44AA44');
    } else if (e.itemType === 'kristal') {
      ctx.fillStyle = C.cyan + 'AA'; ctx.beginPath();
      ctx.moveTo(ix + 8, iy); ctx.lineTo(ix + 16, iy + 8); ctx.lineTo(ix + 8, iy + 16); ctx.lineTo(ix, iy + 8); ctx.fill();
    } else if (e.itemType === 'kunci') {
      drawRect(ix + 2, iy + 4, 12, 8, C.gold); drawRect(ix + 4, iy + 2, 8, 3, C.gold); drawRect(ix + 12, iy + 8, 4, 4, C.gold);
    } else if (e.itemType === 'rupiah') {
      drawRect(ix + 2, iy + 2, 12, 12, C.gold); ctx.fillStyle = C.goldDark;
      ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('R', ix + 8, iy + 10);
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
    drawRect(nx + 4, ny + 12 + bob, 16, 14, '#6B4226');
    drawRect(nx + 2, ny + 8 + bob, 20, 8, '#8B6914');
    drawRect(nx + 6, ny - 2 + bob, 12, 10, '#D4A574');
    drawRect(nx + 5, ny - 5 + bob, 14, 5, '#3D2B1F');
    ctx.fillStyle = '#000'; ctx.fillRect(nx + 9, ny + 1 + bob, 2, 2); ctx.fillRect(nx + 14, ny + 1 + bob, 2, 2);
    ctx.fillRect(nx + 10, ny + 5 + bob, 4, 1);
    drawText(e.name, nx + e.w / 2, ny - 14 + bob, 10, C.gold, 'center');
    const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
    if (dist < 60) drawText('[E] Bicara', nx + e.w / 2, ny - 26 + bob, 10, C.goldLight, 'center');
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
  drawRect(8, 8, 290, 42, '#00000080', 6);
  drawText('HP', 14, 22, 11, C.textDim, 'left');
  drawBar(30, 14, 120, 14, player.hp / player.maxHp, '#440000', C.red, 3);
  drawText(`${Math.ceil(player.hp)}/${player.maxHp}`, 90, 22, 9, '#fff', 'center');
  drawText('ST', 14, 38, 9, C.textDim, 'left');
  const staminaColor = player.stamina < 20 ? C.red : C.stamina;
  drawBar(30, 30, 120, 10, player.stamina / player.maxStamina, C.staminaDark, staminaColor, 2);
  drawText(`${Math.ceil(player.stamina)}`, 90, 36, 8, player.stamina < 20 ? C.red : '#fff', 'center');
  drawText('EN', 158, 30, 11, C.textDim, 'left');
  drawBar(174, 22, 70, 14, player.energy / player.maxEnergy, '#003344', C.cyan, 3);
  if (player.attacking || player.comboWindow > 0) {
    const comboIdx = (player.attackCombo + 2) % 3;
    drawText(`Combo: ${['1st', '2nd', '3rd'][comboIdx]}`, 158, 38, 9, comboIdx === 2 ? C.goldLight : C.gold, 'left');
  }
  drawRect(GAME_W - 200, 8, 192, 28, '#00000080', 6);
  drawText(`Lv.${player.level}`, GAME_W - 190, 22, 12, C.gold, 'left');
  drawText('EXP', GAME_W - 140, 22, 9, C.textDim, 'left');
  drawBar(GAME_W - 118, 17, 60, 8, player.exp / player.expNext, '#1A1A00', C.gold + '80', 2);
  drawText(`Artefak: ${player.artifacts}/5`, GAME_W - 50, 22, 11, C.gold, 'center');
  drawRect(8, GAME_H - 36, 360, 28, '#00000080', 6);
  drawText(`Ramuan: ${player.potions}`, 16, GAME_H - 22, 11, C.green, 'left');
  drawText(`Kunci: ${player.keys}`, 110, GAME_H - 22, 11, C.gold, 'left');
  drawText(`Rupiah: ${player.rupiah}`, 180, GAME_H - 22, 11, C.goldLight, 'left');
  drawText(`Mati: ${deathCount}`, 280, GAME_H - 22, 11, C.red + '80', 'left');
  drawRect(GAME_W / 2 - 40, GAME_H - 36, 80, 28, '#00000080', 6);
  if (player.skillCooldown > 0) {
    drawBar(GAME_W / 2 - 36, GAME_H - 32, 72, 20, 1 - player.skillCooldown / player.skillMaxCooldown, '#333', C.gold + '40', 4);
    drawText(`${Math.ceil(player.skillCooldown / 60)}s`, GAME_W / 2, GAME_H - 22, 10, C.textDim, 'center');
  } else { drawText('[Q] Skill', GAME_W / 2, GAME_H - 22, 10, C.gold, 'center'); }

  if (bossActive && boss && boss.alive) {
    const bw = 300, bx = GAME_W / 2 - bw / 2;
    drawRect(bx, 56, bw, 24, '#000000A0', 4);
    drawText('PENJAGA BATU', GAME_W / 2, 62, 9, C.red, 'center');
    drawBar(bx + 4, 70, bw - 8, 6, boss.hp / boss.maxHp, '#440000', C.red, 2);
    drawBar(bx + 4, 78, bw - 8, 3, boss.posture / boss.maxPosture, '#332200', C.gold + '80', 1);
    drawText(`Phase ${boss.phase}/3`, GAME_W / 2 + bw / 2 + 20, 70, 9, C.red + '80', 'left');
    if (boss.isTelegraphing) {
      const warningAlpha = Math.sin(gameTime * 0.4) * 0.5 + 0.5;
      drawText('!! BERSIAP !!', GAME_W / 2, 48, 14, `rgba(255, 100, 0, ${warningAlpha})`, 'center');
    }
    if (boss.staggered) drawText('STAGGERED!', GAME_W / 2, 92, 12, C.parryGold, 'center');
  }

  drawText('Candi Borobudur', GAME_W / 2, 22, 11, C.gold + '60', 'center');
  drawText('WASD:Move  SPACE:Serang  F:Heavy  R:Parry  SHIFT:Dodge  Q:Skill  E:Interact/Heal', GAME_W / 2, GAME_H - 6, 8, C.textDim, 'center');
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

// ---- MENU ----
let menuSelection = 0;
const menuItems = ['Mulai Permainan', 'Kontrol', 'Tentang'];
let menuParticles = [];
for (let i = 0; i < 30; i++) {
  menuParticles.push({ x: Math.random() * GAME_W, y: Math.random() * GAME_H, size: Math.random() * 2 + 1, speed: Math.random() * 0.5 + 0.2, alpha: Math.random() * 0.5 + 0.2 });
}
let showControls = false;
let showAbout = false;

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

  if (!showControls && !showAbout) {
    menuItems.forEach((item, i) => {
      const y = 260 + i * 50;
      const isSelected = i === menuSelection;
      const w = 220, h = 40, x = GAME_W / 2 - w / 2;
      if (isSelected) {
        drawRect(x, y, w, h, C.gold + '15', 6); drawOutline(x, y, w, h, C.gold + '60', 2, 6);
        drawText('◆', x - 20, y + h / 2, 12, C.gold, 'center');
        drawText(item, GAME_W / 2, y + h / 2, 15, C.gold, 'center');
      } else { drawText(item, GAME_W / 2, y + h / 2, 14, C.textDim, 'center'); }
    });
  }

  if (showControls) {
    drawRect(160, 60, GAME_W - 320, GAME_H - 120, '#0A0A0AE0', 8);
    drawOutline(160, 60, GAME_W - 320, GAME_H - 120, C.gold + '30', 2, 8);
    drawText('KONTROL', GAME_W / 2, 90, 20, C.gold, 'center');
    const ctrls = [['W / ↑', 'Lompat'], ['A D / ← →', 'Gerak kiri/kanan'], ['SPACE', 'Serang Ringan (Combo 3x)'], ['F', 'Serang Berat'], ['R', 'Parry / Menangkis'], ['SHIFT', 'Dodge / Berguling'], ['Q', 'Skill Spesial'], ['E', 'Interaksi / Minum Ramuan'], ['ESC', 'Kembali ke Menu']];
    ctrls.forEach((c, i) => { drawText(c[0], 220, 130 + i * 32, 13, C.gold, 'left'); drawText(c[1], 460, 130 + i * 32, 13, C.text, 'left'); });
    drawText('TIPS KOMBAT', GAME_W / 2, 435, 14, C.gold, 'center');
    drawText('Tekan SPACE berulang untuk combo 3 hit!  |  Parry tepat waktu untuk stagger musuh!', GAME_W / 2, 455, 10, C.text + '80', 'center');
    drawText('[ESC] Kembali', GAME_W / 2, 495, 12, C.textDim, 'center');
  }

  if (showAbout) {
    drawRect(180, 80, GAME_W - 360, GAME_H - 160, '#0A0A0AE0', 8);
    drawOutline(180, 80, GAME_W - 360, GAME_H - 160, C.gold + '30', 2, 8);
    drawText('TENTANG GAME', GAME_W / 2, 115, 20, C.gold, 'center');
    const lines = ['NUSANTARA: Warisan Terakhir', 'Adventure RPG + Puzzle bertema mitologi Nusantara', '', 'Konsep Game Digital — UTS Semester Genap 2025/2026', 'STMIK AMIKOM Surakarta', 'Dosen: Syams Kurniawan Hidayat, ST.,M.Kom.', '', 'Platform: HTML5 + JavaScript (Web Browser)', 'Genre: Adventure RPG + Puzzle (Souls-like Combat)'];
    lines.forEach((l, i) => drawText(l, GAME_W / 2, 155 + i * 22, i === 0 ? 14 : 12, i === 0 ? C.gold : C.text + 'AA', 'center'));
    drawText('[ESC] Kembali', GAME_W / 2, GAME_H - 110, 12, C.textDim, 'center');
  }

  drawText('v0.4 — Modular Edition', GAME_W / 2, GAME_H - 30, 9, C.textDim, 'center');

  if (justPressed('ArrowUp') || justPressed('KeyW')) menuSelection = (menuSelection - 1 + menuItems.length) % menuItems.length;
  if (justPressed('ArrowDown') || justPressed('KeyS')) menuSelection = (menuSelection + 1) % menuItems.length;
  if (justPressed('Escape')) { showControls = false; showAbout = false; }
  if (justPressed('Space') || justPressed('Enter') || mouse.clicked) {
    if (showControls || showAbout) { /* ESC handles */ }
    else if (menuSelection === 0) return 'startGame';
    else if (menuSelection === 1) showControls = true;
    else if (menuSelection === 2) showAbout = true;
    mouse.clicked = false;
  }
  return null;
}

// ---- PUZZLE ----
export function drawPuzzle(pState, gainExpFn) {
  const ctx = getCtx();
  drawRect(0, 0, GAME_W, GAME_H, '#000000CC');
  drawText('PUZZLE STUPA BOROBUDUR', GAME_W / 2, 60, 20, C.gold, 'center');
  drawText('Ulangi urutan simbol elemen!', GAME_W / 2, 85, 12, C.textDim, 'center');
  drawRect(40, 120, GAME_W - 80, 300, '#0A0A0A90', 8);
  drawOutline(40, 120, GAME_W - 80, 300, C.gold + '30', 2, 8);

  if (pState.showingSequence) {
    pState.showTimer++;
    if (pState.showTimer > 40) { pState.showTimer = 0; pState.showIndex++; if (pState.showIndex >= pState.sequence.length) pState.showingSequence = false; }
    if (pState.showIndex < pState.sequence.length) {
      drawText(pState.symbols[pState.sequence[pState.showIndex]], GAME_W / 2, 240, 60, '#fff', 'center');
      drawText(`Urutan ${pState.showIndex + 1}/5`, GAME_W / 2, 290, 14, C.textDim, 'center');
    }
  } else if (pState.solved) {
    drawText('PUZZLE SELESAI!', GAME_W / 2, 240, 28, C.green, 'center');
    drawText('[E] Lanjutkan', GAME_W / 2, 290, 14, C.gold, 'center');
    if (justPressed('KeyE') || justPressed('Space')) { playSound('pickup'); gainExpFn(30); return 'continue'; }
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
    drawText(`Urutan: ${pState.playerSeq.length}/5`, GAME_W / 2, 360, 14, C.text, 'center');
  }
  mouse.clicked = false;
  return null;
}

// ---- BOSS INTRO ----
let bossIntroTimer = 0;
export function resetBossIntroTimer() { bossIntroTimer = 0; }

export function drawBossIntro(tileMap) {
  const ctx = getCtx();
  bossIntroTimer++;
  drawBackground(); drawLevel(tileMap);
  const progress = bossIntroTimer / 120;
  drawRect(0, 0, GAME_W, GAME_H, `rgba(0,0,0,${Math.min(0.7, progress)})`);
  if (bossIntroTimer > 30) {
    const alpha = Math.min(1, (bossIntroTimer - 30) / 30);
    ctx.globalAlpha = alpha;
    drawText('PENJAGA BATU', GAME_W / 2, GAME_H / 2 - 40, 36, C.red, 'center');
    drawText('Mini-Boss Level 1 — Candi Borobudur', GAME_W / 2, GAME_H / 2, 14, C.textDim, 'center');
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
  drawRect(0, 0, GAME_W, GAME_H, '#0A0A0A');
  for (let i = 0; i < 20; i++) {
    const x = (i * 137 + gameTime * 0.5) % GAME_W;
    const y = (i * 97 + gameTime * 0.3) % GAME_H;
    ctx.fillStyle = C.gold + '40'; ctx.fillRect(x, y, 2, 2);
  }
  drawText('ARTEFAK TANAH', GAME_W / 2, 120, 28, C.gold, 'center');
  drawText('DIDAPATKAN!', GAME_W / 2, 160, 36, C.goldLight, 'center');
  drawRect(GAME_W / 2 - 30, 190, 60, 60, '#1A1A0A', 8);
  drawOutline(GAME_W / 2 - 30, 190, 60, 60, C.gold, 2, 8);
  drawText('💎', GAME_W / 2, 220, 30, '#fff', 'center');
  drawText('Penjaga Batu telah dikalahkan!', GAME_W / 2, 280, 14, C.text, 'center');
  drawText('Arjuna mendapatkan Artefak Tanah — elemen pertama', GAME_W / 2, 305, 12, C.textDim, 'center');
  drawText(`Level: ${player.level}  |  HP: ${Math.ceil(player.hp)}  |  Rupiah: ${player.rupiah}  |  Kematian: ${deathCount}`, GAME_W / 2, 370, 12, C.gold + '80', 'center');
  drawText('[SPACE] Lanjutkan Petualangan', GAME_W / 2, 420, 14, C.gold, 'center');
  drawText('[ESC] Menu Utama', GAME_W / 2, 445, 12, C.textDim, 'center');
  if (justPressed('Escape')) return 'menu';
  if (justPressed('Space')) return 'menu';
  return null;
}
