// ============================================================
// puzzle.js — Puzzle minigame state and logic
// ============================================================

import { GAME_W, GAME_H, C } from './config.js';
import { playSound } from './audio.js';

export let puzzleState = null;

export function initPuzzle() {
  puzzleState = {
    symbols: ['🌤', '💧', '🔥', '🌪️', '✨'],
    sequence: [2, 0, 4, 1, 3],
    playerSeq: [],
    showingSequence: true,
    showIndex: 0,
    showTimer: 0,
    solved: false,
    failed: false,
    failTimer: 0,
    buttons: [],
    highlight: -1,
    highlightTimer: 0,
  };
  const bw = 70, bh = 70, gap = 15;
  const startX = GAME_W / 2 - (5 * bw + 4 * gap) / 2;
  for (let i = 0; i < 5; i++) {
    puzzleState.buttons.push({
      x: startX + i * (bw + gap), y: GAME_H / 2 - 20,
      w: bw, h: bh, symbol: puzzleState.symbols[i], index: i,
    });
  }
}

export function getPuzzleState() { return puzzleState; }
export function resetPuzzle() { puzzleState = null; }
