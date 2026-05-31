// ============================================================
// game.js — Main game state machine, initialization, and loop
// Phase 3: Three.js renderer + 3D camera + lock-on
// Phase 2: Fixed timestep + Rapier combat physics
// ============================================================

import { GAME_W, GAME_H, WEAPONS, ARMORS, ACCESSORIES, POTIONS, C,
         MAP_LOAD_DURATION, BOSS_SUMMON_DURATION, DOOR_INTERACT_RANGE, ALTAR_INTERACT_RANGE,
         LOCKON_KEY, LOCKON_SWITCH_KEY } from './config.js';
import { MAP_REGISTRY, loadMap, summonBoss, isBossDefeated, isDoorOpen, getMapData,
         currentMapId, clearedMaps, unlockedMaps, solvedPuzzles,
         markBossDefeated, markPuzzleSolved, isPuzzleSolved,
         getBossAltarPosition, getExitDoorPosition, resetProgress } from './map-manager.js';
import { initAudio, playSound } from './audio.js';
import { keys, savePrevKeys, setupInput, justPressed, mouse } from './input.js';
import { setTileMap } from './physics.js';
import { camera, updateCamera, toggleLockOn, switchLockOnTarget, releaseLockOn, resetCamera, lockOn } from './camera.js';
import { particles, floatingTexts, updateParticles, clearParticles, spawnFloatingText, setDamageCallbacks } from './particles.js';
import { initRenderer, beginFrame, endFrame, render, resizeRenderer, setShakeOffset } from './renderer.js';
import { player, updatePlayer, damagePlayer, damageEnemy, damageBoss, gainExp, resetPlayer, respawnPlayer, setStateRefs, bossDropQueue } from './player.js';
import { createEnemy } from './entities.js';
import { updateEnemies, setEnemyShakeRef } from './enemy.js';
import { updateBoss } from './boss.js';
import { bossSummonQueue } from './boss.js';
import { initPuzzle, getPuzzleState, resetPuzzle } from './puzzle.js';
import { startDialog, updateDialog } from './dialog.js';
import { inventory, getComputedStats, equipItem, unequipSlot, usePotion, allocateStat, updateBuffs, resetInventory, addItem } from './inventory.js';
import { resetShopState, buyItem, sellItem } from './shop.js';
import {
  drawBackground, drawLevel, drawPlayer, drawEnemies, drawBoss,
  drawItems, drawNPCs, drawPuzzleTriggers, drawParticles, drawHUD,
  drawDialog, drawMenu, drawPuzzle, drawBossIntro, drawGameOver, drawVictory,
  drawInventory, drawShop, drawMapSelect, drawLoadingScreen, drawBossSummonEffect,
  drawInteractionLabels, drawLevelUp, drawPauseMenu,
  setGameTime, resetBossIntroTimer, resetGameOverTimer, setCurrentStageId, setInvTab,
  showSaveIndicator, drawMiniMap, drawBloodstain,
} from './draw-game.js';
import { saveGame, loadGame, hasSaveGame, deleteSaveGame } from './save.js';
import {
  registerPlayer, onMapLoad, onMapUnload,
  updateCombatPhysics, shutdownCombatPhysics,
  FIXED_DT, MAX_ACCUMULATOR,
} from './combat-physics.js';
import { isRapierReady } from './rapier-world.js';
import { applyStageLighting, updateStageLighting, updateShadowCamera, resetStageLighting } from './stage-lighting.js';
import { transitionToStage, stopAllAudio, resumeAudioContext, isSpatialAudioReady, playPositionalSound as spatialPlayPositionalSound } from './spatial-audio.js';
import { initStageParticles, clearAllParticles3D } from './particles3d.js';
import { initPostProcessing, applyStagePostProcessing, updatePostProcessing, renderWithPostProcessing, isPostProcessingActive, flashBloom, screenFlash } from './post-processing.js';
import { setUsePostProcessing } from './renderer.js';

// ---- Shared mutable state ----
const gameState = { value: 'menu' };
const hitStop = { value: 0 };
const shake = { timer: 0, intensity: 0 };
const parryFlash = { timer: 0 };
const deathCount = { value: 0 };

// Wire up state refs for player module
setStateRefs(gameState, hitStop, shake, parryFlash, deathCount);
setEnemyShakeRef(shake);
import { setOnCheckpoint } from './player.js';
setOnCheckpoint(() => { autoSave(); });

// Phase 5: Wire up spatial audio bridge
import { registerPositionalSound } from './audio.js';
registerPositionalSound(spatialPlayPositionalSound);

// Wire up particle damage callbacks
setDamageCallbacks(
  damageEnemy,
  damageBoss,
  () => entities,
  () => boss,
  () => bossActive
);

// ---- Game-level variables ----
let gameTime = 0;
let entities = [];
let tileMap = [];
let boss = null;
let bossActive = false;
let puzzleSolved = false;
let shopFromStage = false;

// Map system variables
let loadingTargetMap = 0;
let loadingTimer = 0;
let bossSummonTimer = 0;

// ---- Fixed timestep variables (Phase 2) ----
let lastFrameTime = 0;
let physicsAccumulator = 0;
let physicsStepCount = 0;

// ---- THREE.JS SETUP (replaces Canvas 2D setup) ----
// Create a canvas element for Three.js WebGLRenderer
const gameCanvas = document.createElement('canvas');
gameCanvas.id = 'gameCanvas';
gameCanvas.style.display = 'block';
document.getElementById('gameContainer').insertBefore(gameCanvas, document.getElementById('hud'));

// Initialize Three.js renderer
initRenderer(gameCanvas);
setupInput(gameCanvas);

const loadingEl = document.getElementById('loading');

function resize() {
  resizeRenderer();
}
window.addEventListener('resize', resize);
resize();

// Show HUD overlay
const hudEl = document.getElementById('hud');

// ---- Map start function ----
function startMap(mapId) {
  const mapData = getMapData(mapId);

  const loaded = loadMap(mapId);
  tileMap = loaded.tileMap;
  entities = loaded.entities;
  boss = loaded.boss;
  bossActive = false;
  bossSummonTimer = 0;

  resetPuzzle();
  puzzleSolved = false;

  const stats = getComputedStats(player.level);
  player.currentStageId = mapId;
  setCurrentStageId(mapId);
  player.x = mapData.playerStartX * 32;
  player.y = mapData.playerStartY * 32 - player.h;
  player.prevY = player.y;
  player.checkpoint = { x: player.x, y: player.y };
  player.vx = 0;
  player.vy = 0;
  player.invincible = 60;
  player.hp = stats.maxHp;
  player.stamina = stats.maxStamina;
  player.energy = stats.maxEnergy;
  player.estus = player.estusMax;
  player.poisonTimer = 0;
  player.stunTimer = 0;
  player.slowTimer = 0;
  player.combatTimer = 0;
  player.inCombat = false;
  player.staminaRegenDelay = 0;

  camera.x = 0; camera.y = 0;
  resetCamera(player.x + player.w / 2, player.y + player.h / 2);
  clearParticles();
  hitStop.value = 0;
  parryFlash.timer = 0;

  // Phase 2: Register combat physics for new map
  if (isRapierReady()) {
    onMapUnload(); // Clean previous map
    onMapLoad(tileMap);
    registerPlayer();
  }

  // Phase 5: Apply stage atmosphere (lighting, fog, particles, audio)
  applyStageLighting(mapId);
  applyStagePostProcessing(mapId);
  initStageParticles(mapId);
  if (isSpatialAudioReady()) {
    transitionToStage(mapId);
  }

  // Show HUD during gameplay
  hudEl.style.display = 'block';

  gameState.value = 'playing';

  const speaker = mapId === 0 ? 'Candra Kirana' :
    mapId === 1 ? 'Penjaga Hutan' :
    mapId === 2 ? 'Pendeta Api' :
    mapId === 3 ? 'Nyi Roro Kidul' : 'Resi Wisrawa';
  doStartDialog(speaker, mapData.introDialog);
}

function startGame() {
  resetPlayer();
  resetInventory();
  resetProgress();
  deathCount.value = 0;
  deleteSaveGame();
  gameState.value = 'mapSelect';
}

function continueGame() {
  const data = loadGame();
  if (!data) {
    startGame();
    return;
  }
  player.hp = data.player.hp;
  player.level = data.player.level;
  player.exp = data.player.exp;
  player.expNext = data.player.expNext;
  player.rupiah = data.player.rupiah;
  player.artifacts = data.player.artifacts;
  player.keys = data.player.keys;
  player.currentStageId = data.player.currentStageId;
  if (data.player.checkpoint) {
    player.checkpoint = data.player.checkpoint;
  }
  player.estus = data.player.estus !== undefined ? data.player.estus : 5;
  player.estusMax = data.player.estusMax !== undefined ? data.player.estusMax : 5;
  player.bloodstain = data.player.bloodstain || null;
  player.lostRupiah = data.player.lostRupiah || 0;
  player.rallyHp = data.player.rallyHp || 0;
  player.rallyTimer = data.player.rallyTimer || 0;
  player.poise = data.player.poise !== undefined ? data.player.poise : player.maxPoise;
  player.hollowing = data.player.hollowing || 0;
  if (data.inventory) {
    inventory.items = data.inventory.items || [];
    inventory.equipment = data.inventory.equipment || { weapon: null, armor: null, accessory: null };
    inventory.activeBuffs = data.inventory.activeBuffs || [];
    inventory.skillPoints = data.inventory.skillPoints || 0;
    inventory.allocatedStats = data.inventory.allocatedStats || { hp: 0, stamina: 0, energy: 0, attack: 0, defense: 0, speed: 0 };
  }
  if (data.clearedMaps) clearedMaps.splice(0, 5, ...data.clearedMaps);
  if (data.unlockedMaps) unlockedMaps.splice(0, 5, ...data.unlockedMaps);
  if (data.solvedPuzzles) {
    solvedPuzzles.clear();
    data.solvedPuzzles.forEach(id => solvedPuzzles.add(id));
  }
  if (data.deathCount !== undefined) {
    deathCount.value = data.deathCount;
  }

  gameState.value = 'mapSelect';
}

function autoSave() {
  saveGame(player, inventory, deathCount.value, currentMapId, clearedMaps, unlockedMaps, solvedPuzzles);
  showSaveIndicator();
}

function doStartDialog(speaker, lines) {
  startDialog(speaker, lines);
  gameState.value = 'dialog';
}

function initPuzzleInternal() {
  initPuzzle(currentMapId);
  gameState.value = 'puzzle';
}

function showBossIntro() {
  gameState.value = 'bossIntro';
  resetBossIntroTimer();
}

// ============================================================
// MAIN GAME LOOP — Fixed timestep + Three.js render (Phase 2)
// ============================================================

/**
 * Fixed-step game logic update.
 * Called at 60Hz by the accumulator loop.
 * All deterministic game logic (movement, combat, AI) runs here.
 */
function fixedStep() {
  gameTime++;
  setGameTime(gameTime);

  if (hitStop.value > 0) hitStop.value--;
  if (parryFlash.timer > 0) parryFlash.timer--;

  // Frame-based victory timer
  if (typeof window !== 'undefined' && window.__nusaVictoryTimer) {
    window.__nusaVictoryTimer.frames--;
    if (window.__nusaVictoryTimer.frames <= 0) {
      if (gameState.value !== 'gameOver') {
        gameState.value = 'victory';
      }
      window.__nusaVictoryTimer = null;
    }
  }

  // ---- Game state machine (logic only, no rendering) ----
  // Process timer-based logic for various states
  if (gameState.value === 'loading') {
    loadingTimer++;
    if (loadingTimer >= MAP_LOAD_DURATION) {
      startMap(loadingTargetMap);
    }
  } else if (gameState.value === 'bossSummon') {
    bossSummonTimer++;
    if (bossSummonTimer >= BOSS_SUMMON_DURATION) {
      summonBoss(boss, currentMapId);
      bossActive = true;
      bossSummonTimer = 0;
      showBossIntro();
    }
  } else if (gameState.value === 'playing') {
    if (justPressed('Escape')) {
      gameState.value = 'paused';
      return;
    }

    let triggeredBossSummon = false;
    if (justPressed('KeyE') && !bossActive && boss && !boss.alive) {
      const altarPos = getBossAltarPosition(currentMapId);
      const playerCenterX = player.x + player.w / 2;
      const playerCenterY = player.y + player.h / 2;
      const dx = Math.abs(playerCenterX - (altarPos.x + 16));
      const dy = Math.abs(playerCenterY - (altarPos.y + 16));
      if (dx < ALTAR_INTERACT_RANGE && dy < ALTAR_INTERACT_RANGE) {
        triggeredBossSummon = true;
      }
    }

    let triggeredDoorTransition = false;
    if (justPressed('KeyE') && isDoorOpen(currentMapId) && currentMapId < 4) {
      const doorPos = getExitDoorPosition(currentMapId);
      const playerCenterX = player.x + player.w / 2;
      const playerCenterY = player.y + player.h / 2;
      const dx = Math.abs(playerCenterX - (doorPos.x + 16));
      const dy = Math.abs(playerCenterY - (doorPos.y + 24));
      if (dx < DOOR_INTERACT_RANGE && dy < DOOR_INTERACT_RANGE) {
        triggeredDoorTransition = true;
      }
    }

    if (triggeredBossSummon) {
      bossSummonTimer = 0;
      gameState.value = 'bossSummon';
      playSound('boss');
      return;
    }

    if (triggeredDoorTransition) {
      loadingTargetMap = currentMapId + 1;
      loadingTimer = 0;
      gameState.value = 'loading';
      return;
    }

    const triggerBoss = updatePlayer(keys, entities, boss, bossActive, getPuzzleState(), tileMap, doStartDialog, initPuzzleInternal);
    if (triggerBoss === 'triggerBoss') {
      bossActive = true;
      playSound('boss');
      showBossIntro();
    }
    updateEnemies(entities, hitStop.value, player);
    updateBoss(boss, bossActive, hitStop.value, player);
    updateParticles(hitStop.value, player, damagePlayer);
    // Phase 3: Camera update with lock-on support
    updateCamera(player, tileMap, entities, boss, bossActive);

    // Phase 3: Lock-on targeting input
    if (justPressed(LOCKON_KEY)) {
      toggleLockOn(player, entities, boss, bossActive);
      playSound('parry'); // Reuse parry sound for lock-on toggle
    }
    if (justPressed(LOCKON_SWITCH_KEY) && lockOn.active) {
      switchLockOnTarget(player, entities, boss, bossActive, 1);
      playSound('parry');
    }
    // Release lock-on when dodging or in menu states
    if (lockOn.active && player.dodging) {
      releaseLockOn();
    }

    // Phase 2: Rapier combat physics step
    if (isRapierReady()) {
      const combatEvents = updateCombatPhysics(player, entities, boss, bossActive);
      // Process combat events (for future use — currently game logic handles
      // damage through player.js/enemy.js distance checks; Rapier provides
      // a parallel collision verification layer)
      // TODO Phase 2.1: Wire combatEvents to damage functions
    }

    const ps = getPuzzleState();
    if (ps && ps.solved) puzzleSolved = true;

    while (bossDropQueue.length > 0) {
      const drop = bossDropQueue.shift();
      entities.push({
        type: 'item', itemType: drop.type, subType: drop.subType,
        x: boss.x, y: boss.y, w: 16, h: 16, collected: false, bobOffset: Math.random() * Math.PI * 2,
      });
    }

    while (bossSummonQueue.length > 0) {
      const summon = bossSummonQueue.shift();
      const mapData = getMapData(currentMapId);
      const enemyTypes = mapData ? mapData.enemyTypes : ['batu_kecil'];
      for (let i = 0; i < summon.count; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const offsetX = (Math.random() - 0.5) * 100;
        const ety = boss ? boss.y : player.y;
        entities.push(createEnemy(
          Math.floor((boss.x + offsetX) / 32),
          Math.floor(ety / 32) - 1,
          type
        ));
      }
      spawnFloatingText(boss.x + boss.w / 2, boss.y - 40, `+${summon.count} Musuh!`, C.red);
    }

    if (justPressed('Tab') || justPressed('KeyI')) {
      gameState.value = 'inventory';
      setInvTab(0);
    }

    if (inventory.skillPoints > 0 && justPressed('KeyL')) {
      gameState.value = 'levelUp';
    }
  }
}

/**
 * Render frame — called at display refresh rate (variable).
 * Draws the current game state using Three.js.
 */
function renderFrame() {
  // Screen shake
  let shakeX = 0, shakeY = 0;
  if (shake.timer > 0) {
    shakeX = (Math.random() - 0.5) * shake.intensity * 2;
    shakeY = (Math.random() - 0.5) * shake.intensity * 2;
  }

  // ---- Three.js: Begin frame (mark all meshes as stale) ----
  beginFrame();
  setShakeOffset(shakeX, shakeY);

  switch (gameState.value) {
    case 'menu': {
      hudEl.style.display = 'none';
      const result = drawMenu();
      if (result === 'startGame') startGame();
      else if (result === 'continueGame') continueGame();
      break;
    }

    case 'mapSelect': {
      hudEl.style.display = 'none';
      const result = drawMapSelect(unlockedMaps, clearedMaps);
      if (result) {
        if (result.action === 'select') {
          loadingTargetMap = result.mapId;
          loadingTimer = 0;
          gameState.value = 'loading';
        } else if (result.action === 'shop') {
          gameState.value = 'shop';
          shopFromStage = true;
          resetShopState();
        } else if (result.action === 'menu') {
          gameState.value = 'menu';
        }
      }
      break;
    }

    case 'loading': {
      drawLoadingScreen(loadingTimer);
      break;
    }

    case 'bossSummon': {
      drawBackground();
      drawLevel(tileMap);
      drawItems(entities);
      drawPuzzleTriggers(entities);
      drawNPCs(entities);
      drawEnemies(entities);
      drawBoss(boss, bossActive);
      drawPlayer(parryFlash.timer);
      drawBloodstain();
      drawParticles(particles, floatingTexts);
      drawHUD(boss, bossActive, deathCount.value);
      drawMiniMap(tileMap, entities, boss, bossActive);
      drawBossSummonEffect(bossSummonTimer, boss);
      break;
    }

    case 'playing': {
      // ---- RENDER ONLY ---- (game logic runs in fixedStep())
      drawBackground();
      drawLevel(tileMap);
      drawItems(entities);
      drawPuzzleTriggers(entities);
      drawNPCs(entities);
      drawEnemies(entities);
      drawBoss(boss, bossActive);
      drawPlayer(parryFlash.timer);
      drawBloodstain();
      drawParticles(particles, floatingTexts);
      drawHUD(boss, bossActive, deathCount.value);
      drawMiniMap(tileMap, entities, boss, bossActive);
      drawInteractionLabels(tileMap);
      break;
    }

    case 'paused': {
      drawBackground();
      drawLevel(tileMap);
      drawItems(entities);
      drawPuzzleTriggers(entities);
      drawNPCs(entities);
      drawEnemies(entities);
      drawBoss(boss, bossActive);
      drawPlayer(parryFlash.timer);
      drawBloodstain();
      drawParticles(particles, floatingTexts);
      drawHUD(boss, bossActive, deathCount.value);
      drawMiniMap(tileMap, entities, boss, bossActive);

      const pauseResult = drawPauseMenu();
      if (pauseResult) {
        if (pauseResult.action === 'resume') {
          gameState.value = 'playing';
        } else if (pauseResult.action === 'mainMenu') {
          autoSave();
          gameState.value = 'menu';
        }
      }
      break;
    }

    case 'dialog': {
      const result = updateDialog();
      if (result && result.done) {
        gameState.value = 'playing';
        if (result.callback) result.callback();
      } else if (result && result.chained) {
        if (result.callback) result.callback();
      }

      drawBackground();
      drawLevel(tileMap);
      drawItems(entities);
      drawPuzzleTriggers(entities);
      drawNPCs(entities);
      drawEnemies(entities);
      drawBoss(boss, bossActive);
      drawPlayer(parryFlash.timer);
      drawHUD(boss, bossActive, deathCount.value);
      drawDialog();
      break;
    }

    case 'puzzle': {
      updateParticles(hitStop.value, player, damagePlayer);
      drawBackground();
      drawLevel(tileMap);
      drawPlayer(parryFlash.timer);
      drawHUD(boss, bossActive, deathCount.value);
      const puzzleResult = drawPuzzle(getPuzzleState(), gainExp);
      if (puzzleResult === 'continue') {
        gameState.value = 'playing';
        if (getPuzzleState()) getPuzzleState().solved = true;
        puzzleSolved = true;
        markPuzzleSolved(`${currentMapId}_main`);
      }
      break;
    }

    case 'bossIntro': {
      drawBackground();
      drawLevel(tileMap);
      drawPlayer(parryFlash.timer);
      const introResult = drawBossIntro(tileMap);
      if (introResult === 'finish') gameState.value = 'playing';
      break;
    }

    case 'gameOver': {
      drawBackground();
      drawLevel(tileMap);
      const goResult = drawGameOver(deathCount.value);
      if (goResult === 'respawn') {
        autoSave();
        respawnPlayer();
        const loaded = loadMap(currentMapId);
        entities = loaded.entities;
        boss = loaded.boss;
        bossActive = false;
        resetGameOverTimer();
      }
      if (goResult === 'menu') gameState.value = 'menu';
      break;
    }

    case 'victory': {
      const vicResult = drawVictory(deathCount.value);
      if (vicResult === 'menu') gameState.value = 'menu';
      else if (vicResult === 'continue') {
        if (!clearedMaps[currentMapId]) {
          markBossDefeated(currentMapId);
        }
        autoSave();
        const mapData = getMapData(currentMapId);
        startDialog('Arjuna', mapData.bossDefeatDialog, () => {
          if (currentMapId < 4 && mapData.unlockNextDialog) {
            startDialog('???', mapData.unlockNextDialog, null, 'unlock', '#44FF44');
          }
        }, 'bossDefeat', '#FFD700');
        gameState.value = 'dialog';
      }
      break;
    }

    case 'inventory': {
      drawBackground();
      drawLevel(tileMap);
      drawItems(entities);
      drawPuzzleTriggers(entities);
      drawNPCs(entities);
      drawEnemies(entities);
      drawBoss(boss, bossActive);
      drawPlayer(parryFlash.timer);
      drawParticles(particles, floatingTexts);
      drawHUD(boss, bossActive, deathCount.value);

      const invResult = drawInventory();
      if (invResult) {
        if (invResult.action === 'close') {
          gameState.value = 'playing';
        } else if (invResult.action === 'save') {
          autoSave();
        } else if (invResult.action === 'equip') {
          equipItem(invResult.index);
        } else if (invResult.action === 'unequip') {
          unequipSlot(invResult.slot);
        } else if (invResult.action === 'use') {
          const effect = usePotion(invResult.index);
          if (effect) {
            if (effect.type === 'health') {
              const stats = getComputedStats(player.level);
              player.healing = true;
              player.healingTimer = 0;
              player.healTicksRemaining = 20;
              player.healPerTick = effect.value / 20;
            } else if (effect.type === 'stamina') {
              const stats = getComputedStats(player.level);
              player.stamina = Math.min(stats.maxStamina, player.stamina + effect.value);
            }
          }
        } else if (invResult.action === 'allocate') {
          allocateStat(invResult.stat);
          const stats = getComputedStats(player.level);
          if (invResult.stat === 'hp') player.hp = Math.min(player.hp + 15, stats.maxHp);
          if (invResult.stat === 'stamina') player.stamina = Math.min(player.stamina + 8, stats.maxStamina);
          if (invResult.stat === 'energy') player.energy = Math.min(player.energy + 5, stats.maxEnergy);
        }
      }
      break;
    }

    case 'shop': {
      const shopResult = drawShop();
      if (shopResult) {
        if (shopResult.action === 'close') {
          gameState.value = shopFromStage ? 'mapSelect' : 'playing';
          shopFromStage = false;
          resetShopState();
        } else if (shopResult.action === 'buy') {
          let price = 0;
          if (shopResult.category === 'weapon' && WEAPONS[shopResult.itemId]) price = WEAPONS[shopResult.itemId].price;
          else if (shopResult.category === 'armor' && ARMORS[shopResult.itemId]) price = ARMORS[shopResult.itemId].price;
          else if (shopResult.category === 'accessory' && ACCESSORIES[shopResult.itemId]) price = ACCESSORIES[shopResult.itemId].price;
          else if (shopResult.category === 'potion' && POTIONS[shopResult.itemId]) price = POTIONS[shopResult.itemId].price;
          const success = buyItem(shopResult.category, shopResult.itemId, player.rupiah);
          if (success) player.rupiah -= price;
        } else if (shopResult.action === 'sell') {
          const sellPrice = sellItem(shopResult.index);
          if (sellPrice > 0) player.rupiah += sellPrice;
        }
      }
      break;
    }

    case 'levelUp': {
      drawBackground();
      drawLevel(tileMap);
      drawPlayer(parryFlash.timer);
      drawHUD(boss, bossActive, deathCount.value);

      const luResult = drawLevelUp();
      if (luResult) {
        if (luResult.action === 'close') {
          gameState.value = 'playing';
        } else if (luResult.action === 'allocate') {
          allocateStat(luResult.stat);
          const stats = getComputedStats(player.level);
          if (luResult.stat === 'hp') player.hp = Math.min(player.hp + 15, stats.maxHp);
          if (luResult.stat === 'stamina') player.stamina = Math.min(player.stamina + 8, stats.maxStamina);
          if (luResult.stat === 'energy') player.energy = Math.min(player.energy + 5, stats.maxEnergy);
        }
      }
      break;
    }
  }

  // ---- Three.js: End frame (remove stale meshes, render scene) ----
  endFrame();

  // Phase 5: Update atmosphere per frame
  updateStageLighting(gameTime, currentMapId);
  if (lockOn.active && lockOn.target) {
    updateShadowCamera(camera.focusX, camera.focusY);
  } else {
    updateShadowCamera(camera.focusX, camera.focusY);
  }

  // Phase 5: Update post-processing (vignette at low HP, etc.)
  const stats = getComputedStats(player.level);
  const hpRatio = stats.maxHp > 0 ? player.hp / stats.maxHp : 1;
  const nearArtifact = player.artifacts > 0 && player.x > 0; // Simplified check
  updatePostProcessing(hpRatio, nearArtifact, gameTime);

  // Phase 5: Render with post-processing pipeline
  if (isPostProcessingActive()) {
    renderWithPostProcessing();
  } else {
    render();
  }
}

/**
 * Main loop with fixed timestep (Phase 2).
 *
 * Physics/game logic runs at 60Hz (FIXED_DT = 1/60).
 * Rendering runs at display refresh rate (variable).
 *
 * Pattern:
 *   1. Calculate time since last frame
 *   2. Accumulate time
 *   3. While accumulator >= FIXED_DT:
 *      a. Run fixed step (game logic + Rapier physics)
 *      b. Subtract FIXED_DT from accumulator
 *   4. Render frame (Three.js) with interpolation
 *   5. Request next animation frame
 */
function gameLoop(now) {
  // Calculate delta time (seconds)
  if (lastFrameTime === 0) lastFrameTime = now;
  const delta = Math.min((now - lastFrameTime) / 1000, MAX_ACCUMULATOR);
  lastFrameTime = now;
  physicsAccumulator += delta;

  // ---- Fixed timestep: game logic at 60Hz ----
  while (physicsAccumulator >= FIXED_DT) {
    fixedStep();
    physicsAccumulator -= FIXED_DT;
    physicsStepCount++;
    // Safety: prevent spiral of death
    if (physicsStepCount > 5) {
      physicsAccumulator = 0;
      physicsStepCount = 0;
      break;
    }
  }
  physicsStepCount = 0;

  // ---- Variable timestep: render at display rate ----
  renderFrame();

  // ---- Post-frame cleanup ----
  savePrevKeys();
  mouse.clicked = false;
  requestAnimationFrame(gameLoop);
}

// ---- START ----
loadingEl.style.display = 'none';
if (typeof window.__nusaLoaded === 'function') window.__nusaLoaded();
requestAnimationFrame(gameLoop);
