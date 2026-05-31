// ============================================================
// draw-game.js — Three.js scene graph synchronization
// Maps game state → Three.js meshes each frame
// Phase 4: 3D models, animation controller, entity rendering
// ============================================================

import { C, GAME_W, GAME_H, TILE, STAGES, HOLLOWING_MAX_LEVEL } from './config.js';
import {
  updateBackground, updateParallaxBackground, updateParticles,
  drawRect, drawBar, drawOutline,
} from './renderer.js';
import { camera, lockOn } from './camera.js';
import { player } from './player.js';
import { spawnParticle } from './particles.js';
import { spawnParticle3D, buildParticlesPoints, initStageParticles as initStageParticles3D } from './particles3d.js';
import { getScene } from './renderer.js';
import { justPressed, mouse } from './input.js';
import { playSound } from './audio.js';
import { getCurrentDialog } from './dialog.js';
import { inventory, getComputedStats, getEquippedWeapon, getEquippedArmor, getEquippedAccessory, countHealthPotions, getPotionCounts } from './inventory.js';
import { shopItems, shopState, TAB_NAMES, buyItem, sellItem, getCurrentTabItems, resetShopState } from './shop.js';
import { WEAPONS, ARMORS, ACCESSORIES, POTIONS } from './config.js';
import { hasSaveGame } from './save.js';
import { MAP_REGISTRY, isBossDefeated, isDoorOpen } from './map-manager.js';
import { getNearbyInteractable } from './player.js';
import { drawModel3D, getOrCreateModel3D, positionModel3D, rebuildTiles3D } from './renderer.js';
import { updatePlayerAnimation, updateEnemyAnimation, updateBossAnimation, updateNPCAnimation, updateItemAnimation } from './animation-controller.js';

let gameTime = 0;
let currentStageId = 0;
export function setGameTime(t) { gameTime = t; }
export function setCurrentStageId(id) { currentStageId = id; }

// Save indicator state
let saveIndicatorTimer = 0;
export function showSaveIndicator() { saveIndicatorTimer = 180; }

// ---- HUD DOM references ----
let hudEl, hpFill, hpText, staminaFill, staminaText, poiseFill;
let energyFill, energyText, estusCountEl, levelEl, artifactEl;
let bossHpEl, bossNameEl, bossHpFill, bossPostureFill;
let dialogBox, dialogSpeaker, dialogText;
let interactionLabelEl, saveIndicatorEl;

/** Initialize HUD DOM references */
function initHUDRefs() {
  hudEl = document.getElementById('hud');
  hpFill = document.querySelector('#hp-bar .bar-fill');
  hpText = document.getElementById('hp-text');
  staminaFill = document.querySelector('#stamina-bar .bar-fill');
  staminaText = document.getElementById('stamina-text');
  poiseFill = document.querySelector('#poise-bar .bar-fill');
  energyFill = document.querySelector('#energy-bar .bar-fill');
  energyText = document.getElementById('energy-text');
  estusCountEl = document.getElementById('estus-count');
  levelEl = document.getElementById('player-level');
  artifactEl = document.getElementById('artifact-count');
  bossHpEl = document.getElementById('boss-hp');
  bossNameEl = document.getElementById('boss-name');
  bossHpFill = document.querySelector('#boss-hp .boss-bar-fill');
  bossPostureFill = document.querySelector('#boss-hp .boss-posture-fill');
  dialogBox = document.getElementById('dialog-box');
  dialogSpeaker = document.getElementById('dialog-speaker');
  dialogText = document.getElementById('dialog-text');
  interactionLabelEl = document.getElementById('interaction-label');
  saveIndicatorEl = document.getElementById('save-indicator');
}

// ---- BACKWARD COMPAT: old draw-game exports used by game.js ----
// These are now handled by the Three.js render pipeline + HUD DOM
// We export stub functions that game.js calls, but the actual
// rendering is done through the mesh pool system.

// ============================================================
// MAIN DRAW FUNCTIONS — called from game.js each frame
// ============================================================

export function drawBackground() {
  const stage = STAGES[currentStageId] || STAGES[0];
  updateBackground(stage.bg1, stage.bg2);
  updateParallaxBackground(currentStageId, camera.x, camera.y, gameTime);
}

export function drawLevel(tileMap) {
  if (!tileMap || tileMap.length === 0) return;
  rebuildTiles3D(tileMap, currentStageId, camera.x, camera.y, gameTime);
  // 3D tiles handle checkpoint glows, puzzle doors, exit doors, and altar visuals
}

export function drawPlayer(parryFlashTimer) {
  const f = player.facing;

  // Invincibility flicker
  if (player.invincible > 0 && Math.floor(player.invincible / 3) % 2 === 0) return;

  // 3D model rendering
  const model = getOrCreateModel3D('player', 'player');
  positionModel3D(model, player.x, player.y, player.w, player.h, f, 2);
  updatePlayerAnimation(model, player.state, f, 1, {
    hurtTimer: player.hurtTimer,
    dodging: player.dodging,
    poisonTimer: player.poisonTimer,
    healing: player.healing,
    parryTimer: player.parryTimer,
    parryWindow: player.parryWindow,
  });

  // Parry flash (camera-relative full screen)
  if (parryFlashTimer > 0) {
    const flashAlpha = (parryFlashTimer / 15 * 0.3).toFixed(2);
    const fsx = camera.focusX - GAME_W / 2;
    const fsy = camera.focusY - GAME_H / 2;
    drawRect('parry_flash', fsx, fsy, GAME_W, GAME_H,
      `rgba(255, 215, 0, ${flashAlpha})`);
  }

  // ---- Lock-on indicator ----
  if (lockOn.active && lockOn.target && lockOn.target.alive) {
    const t = lockOn.target;
    const pulse = Math.sin(gameTime * 0.1) * 0.2 + 0.8;
    // Diamond-shaped targeting reticle
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const halfW = t.w / 2 + 6;
    const halfH = t.h / 2 + 6;
    // Top
    drawRect('lock_top', cx - 3, cy - halfH - 4, 6, 8, `rgba(255, 215, 0, ${pulse.toFixed(2)})`);
    // Bottom
    drawRect('lock_bot', cx - 3, cy + halfH - 4, 6, 8, `rgba(255, 215, 0, ${pulse.toFixed(2)})`);
    // Left
    drawRect('lock_left', cx - halfW - 4, cy - 3, 8, 6, `rgba(255, 215, 0, ${pulse.toFixed(2)})`);
    // Right
    drawRect('lock_right', cx + halfW - 4, cy - 3, 8, 6, `rgba(255, 215, 0, ${pulse.toFixed(2)})`);
  }
}

export function drawEnemies(entities) {
  entities.forEach((e, idx) => {
    if (e.type !== 'enemy' || !e.alive) return;

    // 3D model rendering — map enemyType to model key
    const key = `enemy_${idx}`;
    const model = getOrCreateModel3D(key, e.enemyType);
    positionModel3D(model, e.x, e.y, e.w, e.h, e.facing, 1);
    updateEnemyAnimation(model, e.enemyType, e, 1);

    // Health bar above enemy — world space
    if (e.hp < e.maxHp) {
      drawBar(`enemy_hp_${idx}`, e.x, e.y - 8, e.w, 4, e.hp / e.maxHp, '#333', C.red, 2);
    }
  });
}

export function drawBoss(boss, bossActive) {
  if (!boss || !boss.alive || !bossActive) return;

  // 3D model rendering — map stageId to boss model key
  const bossModelKeys = ['penjaga_batu', 'raja_hutan', 'naga_api', 'raksasa_laut', 'raksasa_terakhir'];
  const bossModelKey = bossModelKeys[boss.stageId || 0] || bossModelKeys[0];
  const model = getOrCreateModel3D('boss', bossModelKey);
  positionModel3D(model, boss.x, boss.y, boss.w, boss.h, boss.facing, 3);
  updateBossAnimation(model, boss.stageId || 0, boss, 1);
}

export function drawItems(entities) {
  entities.forEach((e, idx) => {
    if (e.type !== 'item' || e.collected) return;
    const key = `item_${idx}`;

    // Map itemType to 3D model key
    const itemModelKey = e.itemType === 'potion' ? 'potion' :
      e.itemType === 'kristal' ? 'kristal' :
      e.itemType === 'kunci' ? 'kunci' :
      e.itemType === 'rupiah' ? 'rupiah' : 'potion'; // equipment uses potion as placeholder

    const model = getOrCreateModel3D(key, itemModelKey);
    const iy = e.y + Math.sin(gameTime * 0.05 + e.bobOffset) * 4;
    positionModel3D(model, e.x, iy, e.w, e.h, 1, 0);
    updateItemAnimation(model, itemModelKey, e, 1);
  });
}

export function drawNPCs(entities) {
  entities.forEach((e, idx) => {
    if (e.type !== 'npc') return;
    const key = `npc_${idx}`;
    const model = getOrCreateModel3D(key, 'npc');
    const bob = Math.sin(gameTime * 0.03 + e.bobOffset) * 2;
    positionModel3D(model, e.x, e.y + bob, e.w, e.h, 1, 1);
    updateNPCAnimation(model, e.npcType || 'pedagang', e, 1);
  });
}

export function drawPuzzleTriggers(entities) {
  entities.forEach((e, idx) => {
    if (e.type !== 'puzzleTrigger') return;
    // Phase 3: world-space positioning
    const key = `pzl_${idx}`;

    drawRect(`${key}_bg`, e.x, e.y, e.w, e.h, e.activated ? C.gold + '40' : C.gold + '15');
    drawOutline(`${key}_border`, e.x, e.y, e.w, e.h, e.activated ? C.gold + '80' : C.gold + '30', 2);
    if (!e.activated) {
      drawRect(`${key}_icon`, e.x + 12, e.y + 16, 8, 8, C.gold);
    }
  });
}

export function drawParticles(particles, floatingTexts) {
  updateParticles(particles, camera.x, camera.y);

  // Phase 5: Also render 3D ambient + combat particles
  const points3D = buildParticlesPoints();
  if (points3D) {
    const scene = getScene();
    if (scene) scene.add(points3D);
  }
  // Floating texts rendered via HTML overlay in updateHUD()
}

export function drawBloodstain() {
  if (!player.bloodstain) return;
  // Phase 3: world-space positioning
  drawRect('bloodstain', player.bloodstain.x - 8, player.bloodstain.y - 4, 24, 12, C.red + '40');
  drawRect('bloodstain_core', player.bloodstain.x - 4, player.bloodstain.y - 2, 16, 8, C.red + '60');
}

export function drawMiniMap(tileMap, entities, boss, bossActive) {
  // Minimap is rendered via the 2D canvas element in HTML overlay
  const minimapCanvas = document.getElementById('minimap');
  if (!minimapCanvas) return;
  const mctx = minimapCanvas.getContext('2d');
  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;
  mctx.clearRect(0, 0, mw, mh);

  if (!tileMap || tileMap.length === 0) return;
  const H = tileMap.length, W = tileMap[0].length;
  const scaleX = mw / (W * TILE);
  const scaleY = mh / (H * TILE);

  // Tiles
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const tile = tileMap[ty][tx];
      if (tile === 0) continue;
      mctx.fillStyle = tile === 3 ? '#CC3300' : tile === 4 ? '#1E5A8E' : tile === 9 ? '#D4AF37' : '#444';
      mctx.fillRect(tx * TILE * scaleX, ty * TILE * scaleY, TILE * scaleX + 1, TILE * scaleY + 1);
    }
  }

  // Entities
  if (entities) {
    entities.forEach(e => {
      if (e.type === 'enemy' && e.alive) {
        mctx.fillStyle = '#FF4444';
        mctx.fillRect(e.x * scaleX, e.y * scaleY, 3, 3);
      } else if (e.type === 'item' && !e.collected) {
        mctx.fillStyle = '#D4AF37';
        mctx.fillRect(e.x * scaleX, e.y * scaleY, 2, 2);
      }
    });
  }

  // Boss
  if (boss && boss.alive && bossActive) {
    mctx.fillStyle = '#FF0000';
    mctx.fillRect(boss.x * scaleX - 1, boss.y * scaleY - 1, 5, 5);
  }

  // Player
  mctx.fillStyle = '#44FF44';
  mctx.fillRect(player.x * scaleX - 1, player.y * scaleY - 1, 4, 4);
}

export function drawInteractionLabels(tileMap) {
  // Rendered via HTML overlay — see updateHUD()
}

// ============================================================
// HUD UPDATE — HTML/CSS overlay
// ============================================================

export function drawHUD(boss, bossActive, deathCount) {
  if (!hudEl) {
    initHUDRefs();
  }

  const stats = getComputedStats(player.level);

  // HP bar
  const hpPct = Math.max(0, Math.min(1, player.hp / stats.maxHp));
  hpFill.style.width = (hpPct * 100) + '%';
  hpText.textContent = `${Math.ceil(player.hp)}/${stats.maxHp}`;

  // Stamina bar
  const stamPct = Math.max(0, Math.min(1, player.stamina / stats.maxStamina));
  staminaFill.style.width = (stamPct * 100) + '%';
  staminaFill.style.background = player.stamina < 20 ? C.red : C.stamina;
  staminaText.textContent = Math.ceil(player.stamina);

  // Poise bar
  const poisePct = Math.max(0, Math.min(1, player.poise / player.maxPoise));
  poiseFill.style.width = (poisePct * 100) + '%';

  // Energy bar
  const enPct = Math.max(0, Math.min(1, player.energy / stats.maxEnergy));
  energyFill.style.width = (enPct * 100) + '%';
  energyText.textContent = `${Math.ceil(player.energy)}/${stats.maxEnergy}`;

  // Estus count
  let statusHTML = `<span class="estus">Estus: ${player.estus}</span>`;
  if (lockOn.active) {
    statusHTML += ` <span class="lockon" style="color:#FFD700">LOCK-ON</span>`;
  }
  if (player.hollowing > 0) {
    statusHTML += ` <span class="hollowing">Hollow: ${player.hollowing}/${HOLLOWING_MAX_LEVEL}</span>`;
  }
  if (player.twoHanding) {
    statusHTML += ` <span class="twohand">2TANGAN</span>`;
  }
  if (player.exhausted) {
    statusHTML += ` <span class="exhausted">LELAH!</span>`;
  }
  estusCountEl.innerHTML = statusHTML;

  // Level
  levelEl.textContent = `Lv.${player.level}`;
  artifactEl.textContent = `${player.artifacts || 0}/5`;

  // Boss HP
  if (boss && boss.alive && bossActive) {
    bossHpEl.style.display = 'block';
    const stage = STAGES[boss.stageId] || STAGES[0];
    bossNameEl.textContent = stage.bossName + (boss.phase >= 2 ? ' ★' : '') + (boss.phase >= 3 ? '★' : '');
    const bossHpPct = Math.max(0, boss.hp / boss.maxHp);
    bossHpFill.style.width = (bossHpPct * 100) + '%';
    const bossPosturePct = Math.max(0, Math.min(1, boss.posture / boss.maxPosture));
    bossPostureFill.style.width = (bossPosturePct * 100) + '%';
  } else {
    bossHpEl.style.display = 'none';
  }

  // Save indicator
  if (saveIndicatorTimer > 0) {
    saveIndicatorTimer--;
    saveIndicatorEl.style.display = 'block';
    saveIndicatorEl.style.opacity = Math.min(1, saveIndicatorTimer / 30);
  } else {
    saveIndicatorEl.style.display = 'none';
  }
}

// ============================================================
// FULL-SCREEN OVERLAYS (Menu, GameOver, etc.)
// These render via the 2D canvas on the fullscreen overlay div
// For Phase 1, we use a simpler approach: render to an offscreen
// canvas and display as background-image
// ============================================================

let overlayCanvas = null;
let overlayCtx = null;

function getOverlayCanvas() {
  if (!overlayCanvas) {
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = GAME_W;
    overlayCanvas.height = GAME_H;
    overlayCtx = overlayCanvas.getContext('2d');
  }
  return { canvas: overlayCanvas, ctx: overlayCtx };
}

function showOverlay() {
  const el = document.getElementById('fullscreen-overlay');
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.flexDirection = 'column';
  el.style.background = '#000';
  return el;
}

function hideOverlay() {
  const el = document.getElementById('fullscreen-overlay');
  el.style.display = 'none';
  el.innerHTML = '';
}

function renderOverlayToScreen() {
  const el = document.getElementById('fullscreen-overlay');
  el.style.backgroundImage = `url(${overlayCanvas.toDataURL()})`;
  el.style.backgroundSize = 'contain';
  el.style.backgroundPosition = 'center';
  el.style.backgroundRepeat = 'no-repeat';
}

export function drawMenu() {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  // Dark background
  c.fillStyle = '#0A0A0A';
  c.fillRect(0, 0, GAME_W, GAME_H);

  // Title
  c.fillStyle = C.gold;
  c.font = 'bold 48px serif';
  c.textAlign = 'center';
  c.fillText('NUSANTARA', GAME_W / 2, 160);
  c.font = '24px serif';
  c.fillStyle = C.goldLight;
  c.fillText('Warisan Terakhir', GAME_W / 2, 200);

  // Subtitle
  c.font = '12px sans-serif';
  c.fillStyle = C.textDim;
  c.fillText('Three.js Phase 4 Build', GAME_W / 2, 230);

  // Menu options
  const hasSave = hasSaveGame();
  c.font = '18px sans-serif';
  c.fillStyle = C.gold;
  c.fillText('[ENTER] Mulai Baru', GAME_W / 2, 320);
  if (hasSave) {
    c.fillStyle = C.goldLight;
    c.fillText('[C] Lanjutkan', GAME_W / 2, 360);
  }

  // Controls
  c.font = '11px sans-serif';
  c.fillStyle = C.textDim;
  c.fillText('WASD: Gerak | Space: Serang | F: Heavy | R: Parry | Shift: Dodge | E: Interact', GAME_W / 2, 440);
  c.fillText('Q: Skill | G: Weapon Art | H: Two-Hand | T: Lock-On | Y: Switch Target', GAME_W / 2, 455);
  c.fillText('Tab: Inventory | L: Level Up', GAME_W / 2, 470);

  // Check input
  if (justPressed('Enter') || justPressed('Space')) {
    hideOverlay();
    return 'startGame';
  }
  if (hasSave && justPressed('KeyC')) {
    hideOverlay();
    return 'continueGame';
  }

  renderOverlayToScreen();
  return null;
}

export function drawMapSelect(unlockedMaps, clearedMaps) {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = '#0A0A0A';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.gold;
  c.font = 'bold 28px serif';
  c.textAlign = 'center';
  c.fillText('PILIH CANDI', GAME_W / 2, 60);

  const stagePositions = [
    { x: 160, y: 180 }, { x: 380, y: 150 }, { x: 600, y: 160 },
    { x: 250, y: 340 }, { x: 520, y: 330 },
  ];

  STAGES.forEach((stage, i) => {
    const pos = stagePositions[i];
    const unlocked = unlockedMaps[i];
    const cleared = clearedMaps[i];
    const hovering = mouse.x >= pos.x - 50 && mouse.x <= pos.x + 50 &&
                     mouse.y >= pos.y - 30 && mouse.y <= pos.y + 30;

    // Stage block
    c.fillStyle = cleared ? C.gold + '30' : unlocked ? C.gold + '20' : '#1A1A1A';
    c.fillRect(pos.x - 50, pos.y - 30, 100, 60);

    c.strokeStyle = hovering && unlocked ? C.goldLight : unlocked ? C.gold + '60' : '#333';
    c.lineWidth = hovering ? 2 : 1;
    c.strokeRect(pos.x - 50, pos.y - 30, 100, 60);

    c.fillStyle = unlocked ? C.goldLight : C.textDim;
    c.font = '12px sans-serif';
    c.fillText(stage.name, pos.x, pos.y);

    if (cleared) {
      c.fillStyle = C.green;
      c.font = '10px sans-serif';
      c.fillText('✓ Selesai', pos.x, pos.y + 18);
    } else if (!unlocked) {
      c.fillStyle = C.textDim;
      c.font = '10px sans-serif';
      c.fillText('Terkunci', pos.x, pos.y + 18);
    }
  });

  // Shop button
  c.fillStyle = C.gold + '20';
  c.fillRect(GAME_W / 2 - 60, 440, 120, 30);
  c.strokeStyle = C.gold + '60';
  c.strokeRect(GAME_W / 2 - 60, 440, 120, 30);
  c.fillStyle = C.goldLight;
  c.font = '12px sans-serif';
  c.fillText('Toko [T]', GAME_W / 2, 460);

  // Check click on stage
  if (mouse.clicked) {
    for (let i = 0; i < 5; i++) {
      const pos = stagePositions[i];
      if (unlockedMaps[i] && mouse.x >= pos.x - 50 && mouse.x <= pos.x + 50 &&
          mouse.y >= pos.y - 30 && mouse.y <= pos.y + 30) {
        hideOverlay();
        return { action: 'select', mapId: i };
      }
    }
    // Shop
    if (mouse.x >= GAME_W / 2 - 60 && mouse.x <= GAME_W / 2 + 60 &&
        mouse.y >= 440 && mouse.y <= 470) {
      hideOverlay();
      return { action: 'shop' };
    }
  }

  // ESC to menu
  if (justPressed('Escape')) {
    hideOverlay();
    return { action: 'menu' };
  }

  renderOverlayToScreen();
  return null;
}

export function drawLoadingScreen(timer) {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = '#0A0A0A';
  c.fillRect(0, 0, GAME_W, GAME_H);

  const pct = timer / 90;
  c.fillStyle = C.gold;
  c.font = '18px sans-serif';
  c.textAlign = 'center';
  c.fillText('MEMUAT...', GAME_W / 2, GAME_H / 2 - 20);

  // Progress bar
  c.fillStyle = '#333';
  c.fillRect(GAME_W / 2 - 100, GAME_H / 2, 200, 8);
  c.fillStyle = C.gold;
  c.fillRect(GAME_W / 2 - 100, GAME_H / 2, 200 * pct, 8);

  renderOverlayToScreen();
}

export function drawBossSummonEffect(timer, boss) {
  // Camera-relative full-screen red pulsing overlay
  const pct = timer / 120;
  const alpha = Math.sin(timer * 0.15) * 0.2 + 0.2;
  const fsx = camera.focusX - GAME_W / 2;
  const fsy = camera.focusY - GAME_H / 2;
  drawRect('boss_summon_fx', fsx, fsy, GAME_W, GAME_H, `rgba(255, 0, 0, ${alpha.toFixed(2)})`);
}

export function drawBossIntro(tileMap) {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();

  // Game world is rendered behind this
  const stage = STAGES[currentStageId] || STAGES[0];

  c.clearRect(0, 0, GAME_W, GAME_H);

  // Dark overlay
  c.fillStyle = 'rgba(0, 0, 0, 0.7)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  // Boss name
  c.fillStyle = C.gold;
  c.font = 'bold 32px serif';
  c.textAlign = 'center';
  c.fillText(stage.bossName, GAME_W / 2, GAME_H / 2 - 20);

  // Stage name
  c.fillStyle = C.goldLight;
  c.font = '16px sans-serif';
  c.fillText(stage.name, GAME_W / 2, GAME_H / 2 + 20);

  renderOverlayToScreen();

  // Auto-dismiss after ~90 frames
  if (!drawBossIntro._timer) drawBossIntro._timer = 0;
  drawBossIntro._timer++;
  if (drawBossIntro._timer >= 90 || justPressed('Space') || justPressed('Enter')) {
    drawBossIntro._timer = 0;
    hideOverlay();
    return 'finish';
  }
  return null;
}
export function resetBossIntroTimer() { drawBossIntro._timer = 0; }

export function drawGameOver(deathCount) {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = 'rgba(30, 0, 0, 0.9)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.red;
  c.font = 'bold 36px serif';
  c.textAlign = 'center';
  c.fillText('ANDA MATI', GAME_W / 2, 200);

  c.fillStyle = C.textDim;
  c.font = '14px sans-serif';
  c.fillText(`Kematian: ${deathCount}`, GAME_W / 2, 250);
  c.fillText(`Rupiah hilang: ${player.lostRupiah}`, GAME_W / 2, 275);

  c.fillStyle = C.gold;
  c.font = '16px sans-serif';
  c.fillText('[E] Bangkit di Checkpoint', GAME_W / 2, 340);
  c.fillText('[Q] Menu Utama', GAME_W / 2, 370);

  if (justPressed('KeyE')) {
    hideOverlay();
    return 'respawn';
  }
  if (justPressed('KeyQ')) {
    hideOverlay();
    return 'menu';
  }

  renderOverlayToScreen();
  return null;
}
export function resetGameOverTimer() {}

export function drawVictory(deathCount) {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = 'rgba(20, 15, 0, 0.9)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.gold;
  c.font = 'bold 32px serif';
  c.textAlign = 'center';
  c.fillText('MUSUH DIKALAHKAN', GAME_W / 2, 180);

  c.fillStyle = C.goldLight;
  c.font = '14px sans-serif';
  c.fillText('Artefak diperoleh!', GAME_W / 2, 230);

  c.fillStyle = C.gold;
  c.font = '16px sans-serif';
  c.fillText('[E] Lanjutkan', GAME_W / 2, 320);
  c.fillText('[Q] Menu Utama', GAME_W / 2, 350);

  if (justPressed('KeyE')) {
    hideOverlay();
    return 'continue';
  }
  if (justPressed('KeyQ')) {
    hideOverlay();
    return 'menu';
  }

  renderOverlayToScreen();
  return null;
}

export function drawInventory() {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = 'rgba(0, 0, 0, 0.85)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.gold;
  c.font = 'bold 20px sans-serif';
  c.textAlign = 'center';
  c.fillText('INVENTARIS', GAME_W / 2, 40);

  // Equipment
  const weapon = getEquippedWeapon();
  const armor = getEquippedArmor();
  const accessory = getEquippedAccessory();

  c.textAlign = 'left';
  c.font = '12px sans-serif';
  c.fillStyle = C.goldLight;
  c.fillText(`Senjata: ${weapon.name} (+${weapon.attack})`, 60, 80);
  c.fillText(`Baju: ${armor.name} (+${armor.defense})`, 60, 100);
  c.fillText(`Aksesoris: ${accessory.name}`, 60, 120);

  // Items
  c.fillStyle = C.text;
  c.fillText('Item:', 60, 160);
  inventory.items.forEach((item, i) => {
    c.fillStyle = C.textDim;
    c.fillText(`${i + 1}. ${item.name}`, 80, 180 + i * 18);
  });

  // Stats
  const stats = getComputedStats(player.level);
  c.fillStyle = C.gold;
  c.fillText(`Rupiah: ${player.rupiah}`, 500, 80);
  c.fillText(`Level: ${player.level}`, 500, 100);
  c.fillText(`HP: ${Math.ceil(player.hp)}/${stats.maxHp}`, 500, 120);
  c.fillText(`Stamina: ${Math.ceil(player.stamina)}/${stats.maxStamina}`, 500, 140);
  c.fillText(`Energi: ${Math.ceil(player.energy)}/${stats.maxEnergy}`, 500, 160);

  c.fillStyle = C.textDim;
  c.font = '11px sans-serif';
  c.textAlign = 'center';
  c.fillText('[Tab/I] Tutup | [S] Simpan', GAME_W / 2, GAME_H - 30);

  if (justPressed('Tab') || justPressed('KeyI') || justPressed('Escape')) {
    hideOverlay();
    return { action: 'close' };
  }
  if (justPressed('KeyS')) {
    return { action: 'save' };
  }

  renderOverlayToScreen();
  return null;
}
export function setInvTab(tab) {}

export function drawShop() {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = 'rgba(0, 0, 0, 0.85)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.gold;
  c.font = 'bold 20px sans-serif';
  c.textAlign = 'center';
  c.fillText('TOKO', GAME_W / 2, 40);

  c.fillStyle = C.goldLight;
  c.font = '14px sans-serif';
  c.fillText(`Rupiah: ${player.rupiah}`, GAME_W / 2, 65);

  // Weapons
  c.textAlign = 'left';
  c.font = '12px sans-serif';
  c.fillStyle = C.gold;
  c.fillText('Senjata:', 60, 100);
  Object.entries(WEAPONS).forEach(([id, w], i) => {
    c.fillStyle = C.textDim;
    c.fillText(`${w.name} — ATK+${w.attack} — ${w.price}R`, 80, 120 + i * 18);
  });

  // Armors
  c.fillStyle = C.gold;
  c.fillText('Baju:', 60, 250);
  Object.entries(ARMORS).forEach(([id, a], i) => {
    c.fillStyle = C.textDim;
    c.fillText(`${a.name} — DEF+${a.defense} — ${a.price}R`, 80, 270 + i * 18);
  });

  c.textAlign = 'center';
  c.fillStyle = C.textDim;
  c.font = '11px sans-serif';
  c.fillText('[Escape] Tutup', GAME_W / 2, GAME_H - 30);

  if (justPressed('Escape')) {
    hideOverlay();
    return { action: 'close' };
  }

  renderOverlayToScreen();
  return null;
}

export function drawLevelUp() {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = 'rgba(0, 0, 0, 0.85)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.gold;
  c.font = 'bold 20px sans-serif';
  c.textAlign = 'center';
  c.fillText('LEVEL UP', GAME_W / 2, 40);

  c.fillStyle = C.goldLight;
  c.font = '14px sans-serif';
  c.fillText(`Skill Points: ${inventory.skillPoints}`, GAME_W / 2, 65);

  c.textAlign = 'left';
  c.font = '12px sans-serif';
  const stats = getComputedStats(player.level);
  const statKeys = ['hp', 'stamina', 'energy', 'attack', 'defense', 'speed'];
  statKeys.forEach((stat, i) => {
    const allocated = inventory.allocatedStats[stat] || 0;
    c.fillStyle = C.gold;
    c.fillText(`${stat.toUpperCase()}: ${stats[stat]} (+${allocated})`, 200, 110 + i * 28);
    c.fillStyle = C.goldLight;
    c.fillText(`[${i + 1}] +1`, 500, 110 + i * 28);
  });

  c.textAlign = 'center';
  c.fillStyle = C.textDim;
  c.font = '11px sans-serif';
  c.fillText('[Escape/L] Tutup', GAME_W / 2, GAME_H - 30);

  if (justPressed('Escape') || justPressed('KeyL')) {
    hideOverlay();
    return { action: 'close' };
  }

  renderOverlayToScreen();
  return null;
}

export function drawDialog() {
  const current = getCurrentDialog();
  if (!current) {
    if (dialogBox) dialogBox.style.display = 'none';
    return;
  }

  if (!dialogBox) initHUDRefs();
  dialogBox.style.display = 'block';
  dialogSpeaker.textContent = current.speaker || '';
  dialogText.textContent = current.lines[current.lineIndex] || '';
}

export function drawPuzzle(puzzleState, gainExp) {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = 'rgba(0, 0, 0, 0.9)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.gold;
  c.font = 'bold 20px sans-serif';
  c.textAlign = 'center';
  c.fillText('PUZZLE', GAME_W / 2, 40);

  if (puzzleState && puzzleState.grid) {
    const gridSize = puzzleState.grid.length;
    const cellSize = 40;
    const offsetX = GAME_W / 2 - (gridSize * cellSize) / 2;
    const offsetY = 80;

    puzzleState.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        c.fillStyle = cell ? C.gold + '60' : '#222';
        c.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize - 2, cellSize - 2);
        if (cell) {
          c.fillStyle = C.goldLight;
          c.font = '16px sans-serif';
          c.textAlign = 'center';
          c.fillText(cell, offsetX + x * cellSize + cellSize / 2 - 1, offsetY + y * cellSize + cellSize / 2 + 5);
        }
      });
    });
  }

  c.fillStyle = C.textDim;
  c.font = '11px sans-serif';
  c.textAlign = 'center';
  c.fillText('[Escape] Kembali', GAME_W / 2, GAME_H - 30);

  if (justPressed('Escape')) {
    hideOverlay();
    return 'continue';
  }

  renderOverlayToScreen();
  return null;
}

export function drawPauseMenu() {
  const { ctx: c } = getOverlayCanvas();
  showOverlay();
  c.clearRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = 'rgba(0, 0, 0, 0.7)';
  c.fillRect(0, 0, GAME_W, GAME_H);

  c.fillStyle = C.gold;
  c.font = 'bold 24px sans-serif';
  c.textAlign = 'center';
  c.fillText('JEDA', GAME_W / 2, 200);

  c.font = '16px sans-serif';
  c.fillText('[Escape] Lanjutkan', GAME_W / 2, 280);
  c.fillText('[Q] Menu Utama', GAME_W / 2, 320);

  if (justPressed('Escape')) {
    hideOverlay();
    return { action: 'resume' };
  }
  if (justPressed('KeyQ')) {
    hideOverlay();
    return { action: 'mainMenu' };
  }

  renderOverlayToScreen();
  return null;
}
