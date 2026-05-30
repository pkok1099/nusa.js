// ============================================================
// game.js — Main game state machine, initialization, and loop
// ============================================================

import { GAME_W, GAME_H, STAGES, WEAPONS, ARMORS, ACCESSORIES, POTIONS } from './config.js';
import { initAudio, playSound } from './audio.js';
import { keys, savePrevKeys, setupInput, justPressed } from './input.js';
import { setTileMap } from './physics.js';
import { camera, updateCamera } from './camera.js';
import { particles, floatingTexts, updateParticles, clearParticles } from './particles.js';
import { initRenderer } from './renderer.js';
import { generateLevel } from './level.js';
import { spawnEntities, createBoss } from './entities.js';
import { player, updatePlayer, damagePlayer, gainExp, resetPlayer, respawnPlayer, setStateRefs, bossDropQueue } from './player.js';
import { updateEnemies, setEnemyShakeRef } from './enemy.js';
import { updateBoss } from './boss.js';
import { initPuzzle, getPuzzleState, resetPuzzle } from './puzzle.js';
import { startDialog, updateDialog } from './dialog.js';
import { inventory, getComputedStats, equipItem, unequipSlot, usePotion, allocateStat, updateBuffs, resetInventory, addItem } from './inventory.js';
import { resetShopState, buyItem, sellItem } from './shop.js';
import {
  drawBackground, drawLevel, drawPlayer, drawEnemies, drawBoss,
  drawItems, drawNPCs, drawPuzzleTriggers, drawParticles, drawHUD,
  drawDialog, drawMenu, drawPuzzle, drawBossIntro, drawGameOver, drawVictory,
  drawInventory, drawShop, drawStageSelect, drawLevelUp,
  setGameTime, resetBossIntroTimer, resetGameOverTimer, setCurrentStageId, setInvTab,
  showSaveIndicator, drawMiniMap,
} from './draw-game.js';
import { saveGame, loadGame, hasSaveGame, deleteSaveGame } from './save.js';

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
setOnCheckpoint(() => { autoSave(currentStageId); });

// ---- Game-level variables ----
let gameTime = 0;
let entities = [];
let tileMap = [];
let boss = null;
let bossActive = false;
let puzzleSolved = false;
let currentStageId = 0;
let shopFromStage = false; // true if shop opened from stage select, false if from level

// Game progress - which stages are unlocked
let unlockedStages = [true, false, false, false, false];

// ---- Canvas setup ----
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading');
initRenderer(ctx);
setupInput(canvas);

function resize() {
  const ratio = GAME_W / GAME_H;
  let w = window.innerWidth, h = window.innerHeight;
  if (w / h > ratio) w = h * ratio; else h = w / ratio;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = GAME_W;
  canvas.height = GAME_H;
}
window.addEventListener('resize', resize);
resize();

// ---- Game init ----
function startStage(stageId) {
  currentStageId = stageId;
  setCurrentStageId(stageId);
  player.currentStageId = stageId;

  initAudio();
  gameState.value = 'playing';
  tileMap = generateLevel(stageId);
  setTileMap(tileMap);
  entities = spawnEntities(stageId);

  const stage = STAGES[stageId];
  const bossX = [73, 80, 90, 100, 110][stageId] || 73;
  const bossY = stage.height - 6;
  boss = createBoss(bossX, bossY, stageId);
  bossActive = false;
  resetPuzzle();
  puzzleSolved = false;

  // Set player position to start of level
  const stats = getComputedStats(player.level);
  player.x = 80;
  player.y = (stage.height - 3) * 32 - player.h;
  player.prevY = player.y;
  player.checkpoint = { x: player.x, y: player.y };
  player.vx = 0;
  player.vy = 0;
  player.invincible = 60;

  camera.x = 0; camera.y = 0;
  clearParticles();
  hitStop.value = 0;
  parryFlash.timer = 0;

  // Intro dialog
  const speaker = stageId === 0 ? 'Candra Kirana' :
    stageId === 1 ? 'Penjaga Hutan' :
    stageId === 2 ? ' Pendeta Api' :
    stageId === 3 ? 'Nyi Roro Kidul' : 'Resi Wisrawa';
  doStartDialog(speaker, stage.introDialog);
}

function startGame() {
  resetPlayer();
  resetInventory();
  unlockedStages = [true, false, false, false, false];
  deathCount.value = 0;
  // Delete old save when starting new game
  deleteSaveGame();
  gameState.value = 'stageSelect';
}

function continueGame() {
  const data = loadGame();
  if (!data) {
    // No save found, start new game
    startGame();
    return;
  }
  // Restore player
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
  // Restore inventory
  if (data.inventory) {
    inventory.items = data.inventory.items || [];
    inventory.equipment = data.inventory.equipment || { weapon: null, armor: null, accessory: null };
    inventory.activeBuffs = data.inventory.activeBuffs || [];
    inventory.skillPoints = data.inventory.skillPoints || 0;
    inventory.allocatedStats = data.inventory.allocatedStats || { hp: 0, stamina: 0, energy: 0, attack: 0, defense: 0, speed: 0 };
  }
  // Restore unlocked stages
  if (data.unlockedStages) {
    unlockedStages = data.unlockedStages;
  }
  // Restore death count
  if (data.deathCount !== undefined) {
    deathCount.value = data.deathCount;
  }

  // Go to stage select
  gameState.value = 'stageSelect';
}

// Helper to auto-save
function autoSave(currentStageId) {
  saveGame(player, inventory, unlockedStages, deathCount.value, currentStageId);
  showSaveIndicator();
}

function doStartDialog(speaker, lines) {
  startDialog(speaker, lines);
  gameState.value = 'dialog';
}

function initPuzzleInternal() {
  initPuzzle(currentStageId);
  gameState.value = 'puzzle';
}

function showBossIntro() {
  gameState.value = 'bossIntro';
  resetBossIntroTimer();
}

// ---- MAIN GAME LOOP ----
function gameLoop() {
  gameTime++;
  setGameTime(gameTime);

  if (hitStop.value > 0) hitStop.value--;
  if (parryFlash.timer > 0) parryFlash.timer--;

  let shakeX = 0, shakeY = 0;
  if (shake.timer > 0) {
    shake.timer--;
    shakeX = (Math.random() - 0.5) * shake.intensity * 2;
    shakeY = (Math.random() - 0.5) * shake.intensity * 2;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  switch (gameState.value) {
    case 'menu': {
      const result = drawMenu();
      if (result === 'startGame') startGame();
      else if (result === 'continueGame') continueGame();
      break;
    }

    case 'stageSelect': {
      const result = drawStageSelect(unlockedStages);
      if (result) {
        if (result.action === 'select') {
          startStage(result.stageId);
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

    case 'playing': {
      const triggerBoss = updatePlayer(keys, entities, boss, bossActive, getPuzzleState(), tileMap, doStartDialog, initPuzzleInternal);
      if (triggerBoss === 'triggerBoss') {
        bossActive = true;
        playSound('boss');
        showBossIntro();
      }
      updateEnemies(entities, hitStop.value, player);
      updateBoss(boss, bossActive, hitStop.value, player);
      updateParticles(hitStop.value, player, damagePlayer);
      updateCamera(player, tileMap);

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
      drawMiniMap(tileMap, entities, boss, bossActive);

      const ps = getPuzzleState();
      if (ps && ps.solved) puzzleSolved = true;

      // Process boss drop queue
      while (bossDropQueue.length > 0) {
        const drop = bossDropQueue.shift();
        entities.push({
          type: 'item', itemType: drop.type, subType: drop.subType,
          x: boss.x, y: boss.y, w: 16, h: 16, collected: false, bobOffset: Math.random() * Math.PI * 2,
        });
      }

      // Toggle inventory with TAB or I
      if (justPressed('Tab') || justPressed('KeyI')) {
        gameState.value = 'inventory';
        setInvTab(0);
      }

      // Level up screen when skill points available
      if (inventory.skillPoints > 0 && justPressed('KeyL')) {
        gameState.value = 'levelUp';
      }
      break;
    }

    case 'dialog': {
      const result = updateDialog();
      if (result && result.done) {
        gameState.value = 'playing';
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
      }
      break;
    }

    case 'bossIntro': {
      const introResult = drawBossIntro(tileMap);
      if (introResult === 'finish') gameState.value = 'playing';
      break;
    }

    case 'gameOver': {
      drawBackground();
      drawLevel(tileMap);
      const goResult = drawGameOver(deathCount.value);
      if (goResult === 'respawn') {
        // Auto-save on death (souls-like: progress saved, rupiah lost)
        autoSave(currentStageId);
        respawnPlayer();
        entities = spawnEntities(currentStageId);
        const bossX = [73, 80, 90, 100, 110][currentStageId] || 73;
        const stage = STAGES[currentStageId];
        boss = createBoss(bossX, stage.height - 6, currentStageId);
        bossActive = false;
        resetGameOverTimer();
      }
      if (goResult === 'menu') gameState.value = 'menu';
      break;
    }

    case 'victory': {
      const vicResult = drawVictory(deathCount.value);
      if (vicResult === 'menu') gameState.value = 'menu';
      else if (vicResult === 'stageSelect') {
        // Unlock next stage
        if (currentStageId < 4) {
          unlockedStages[currentStageId + 1] = true;
        }
        // Auto-save on victory (boss defeated)
        autoSave(currentStageId);
        gameState.value = 'stageSelect';
      }
      break;
    }

    case 'inventory': {
      // Draw game world paused
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

      // Draw inventory overlay
      const invResult = drawInventory();
      if (invResult) {
        if (invResult.action === 'close') {
          gameState.value = 'playing';
        } else if (invResult.action === 'save') {
          autoSave(currentStageId);
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
            // Buff potions are handled inside usePotion
          }
        } else if (invResult.action === 'allocate') {
          allocateStat(invResult.stat);
          // Update player max stats after allocation
          const stats = getComputedStats(player.level);
          if (invResult.stat === 'hp') player.hp = Math.min(player.hp + 15, stats.maxHp);
          if (invResult.stat === 'stamina') player.stamina = Math.min(player.stamina + 8, stats.maxStamina);
          if (invResult.stat === 'energy') player.energy = Math.min(player.energy + 5, stats.maxEnergy);
        }
      }
      break;
    }

    case 'shop': {
      // Draw shop overlay
      const shopResult = drawShop();
      if (shopResult) {
        if (shopResult.action === 'close') {
          gameState.value = shopFromStage ? 'stageSelect' : 'playing';
          shopFromStage = false;
          resetShopState();
        } else if (shopResult.action === 'buy') {
          // Find item price
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
      // Draw game world paused
      drawBackground();
      drawLevel(tileMap);
      drawPlayer(parryFlash.timer);
      drawHUD(boss, bossActive, deathCount.value);

      // Draw level up overlay
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

  ctx.restore();
  savePrevKeys();
  requestAnimationFrame(gameLoop);
}

// ---- START ----
loading.style.display = 'none';
gameLoop();
