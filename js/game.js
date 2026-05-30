// ============================================================
// game.js — Main game state machine, initialization, and loop
// ============================================================

import { GAME_W, GAME_H } from './config.js';
import { initAudio, playSound } from './audio.js';
import { keys, savePrevKeys, setupInput } from './input.js';
import { setTileMap } from './physics.js';
import { camera, updateCamera } from './camera.js';
import { particles, floatingTexts, updateParticles, clearParticles } from './particles.js';
import { initRenderer } from './renderer.js';
import { generateLevel1 } from './level.js';
import { spawnEntities, createBoss } from './entities.js';
import { player, updatePlayer, damagePlayer, gainExp, resetPlayer, respawnPlayer, setStateRefs } from './player.js';
import { updateEnemies } from './enemy.js';
import { updateBoss } from './boss.js';
import { initPuzzle, getPuzzleState, resetPuzzle } from './puzzle.js';
import { startDialog, updateDialog } from './dialog.js';
import {
  drawBackground, drawLevel, drawPlayer, drawEnemies, drawBoss,
  drawItems, drawNPCs, drawPuzzleTriggers, drawParticles, drawHUD,
  drawDialog, drawMenu, drawPuzzle, drawBossIntro, drawGameOver, drawVictory,
  setGameTime, resetBossIntroTimer, resetGameOverTimer,
} from './draw-game.js';

// ---- Shared mutable state ----
const gameState = { value: 'menu' };
const hitStop = { value: 0 };
const shake = { timer: 0, intensity: 0 };
const parryFlash = { timer: 0 };
const deathCount = { value: 0 };

// Wire up state refs for player module
setStateRefs(gameState, hitStop, shake, parryFlash, deathCount);

// ---- Game-level variables ----
let gameTime = 0;
let entities = [];
let tileMap = [];
let boss = null;
let bossActive = false;
let puzzleSolved = false;

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
function startGame() {
  initAudio();
  gameState.value = 'playing';
  tileMap = generateLevel1();
  setTileMap(tileMap);
  entities = spawnEntities();
  boss = createBoss(73, 18 - 6);
  bossActive = false;
  resetPuzzle();
  puzzleSolved = false;
  resetPlayer();
  camera.x = 0; camera.y = 0;
  clearParticles();
  hitStop.value = 0;
  parryFlash.timer = 0;

  // Intro dialog
  doStartDialog('Candra Kirana', [
    'Arjuna... kamu telah memilih untuk memulai perjalanan ini.',
    'Candi Borobudur adalah tempat pertamamu.',
    'Artefak Tanah tersembunyi di dalam candi ini, dijaga oleh Penjaga Batu.',
    'Gunakan kerisku untuk melawan, dan cari jalan melalui puzzle kuno.',
    'Semoga leluhur membimbingmu, Anak Jawa.',
  ]);
}

function doStartDialog(speaker, lines) {
  startDialog(speaker, lines);
  gameState.value = 'dialog';
}

function initPuzzleInternal() {
  initPuzzle();
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

      const ps = getPuzzleState();
      if (ps && ps.solved) puzzleSolved = true;
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
        respawnPlayer();
        entities = spawnEntities();
        boss = createBoss(73, 18 - 6);
        bossActive = false;
        resetGameOverTimer();
      }
      if (goResult === 'menu') gameState.value = 'menu';
      break;
    }

    case 'victory': {
      const vicResult = drawVictory(deathCount.value);
      if (vicResult === 'menu') gameState.value = 'menu';
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
