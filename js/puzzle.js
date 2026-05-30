// ============================================================
// puzzle.js — Puzzle minigame state and logic (per-stage variations)
// ============================================================

import { GAME_W, GAME_H, C, STAGES } from './config.js';
import { playSound } from './audio.js';

// Per-stage puzzle configurations
const PUZZLE_CONFIGS = [
  { // Stage 0: Candi Borobudur — elemental symbols, 5-step sequence
    symbols: ['🌤', '💧', '🔥', '🌪️', '✨'],
    sequence: [2, 0, 4, 1, 3],
  },
  { // Stage 1: Hutan Borneo — nature symbols, 6-step sequence
    symbols: ['🌿', '🐅', '🐍', '🍃', '🌙', '🦅'],
    sequence: [1, 3, 0, 5, 2, 4],
  },
  { // Stage 2: Gunung Bromo — fire/volcano symbols, 6-step sequence
    symbols: ['🌋', '🔥', '💀', '⚡', '🌑', '👹'],
    sequence: [0, 2, 4, 1, 5, 3],
  },
  { // Stage 3: Laut Bali — ocean symbols, 7-step sequence
    symbols: ['🌊', '🐙', '🐚', '🌙', '⚓', '🦈', '❄️'],
    sequence: [3, 0, 5, 2, 6, 1, 4],
  },
  { // Stage 4: Candi Prambanan — divine symbols, 8-step sequence
    symbols: ['🗡', '🛡', '⚡', '👁', '🕉', '🔱', '💎', '⚔️'],
    sequence: [4, 7, 1, 5, 0, 3, 6, 2],
  },
];

export let puzzleState = null;

export function initPuzzle(stageId) {
  const sid = stageId || 0;
  const cfg = PUZZLE_CONFIGS[sid] || PUZZLE_CONFIGS[0];
  const numSymbols = cfg.symbols.length;

  puzzleState = {
    symbols: cfg.symbols,
    sequence: cfg.sequence,
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
    stageId: sid,
  };

  // Layout buttons based on number of symbols
  const bw = Math.min(70, (GAME_W - 80 - (numSymbols - 1) * 12) / numSymbols);
  const bh = bw;
  const gap = 12;
  const totalW = numSymbols * bw + (numSymbols - 1) * gap;
  const startX = GAME_W / 2 - totalW / 2;

  for (let i = 0; i < numSymbols; i++) {
    puzzleState.buttons.push({
      x: startX + i * (bw + gap),
      y: GAME_H / 2 - 20,
      w: bw, h: bh,
      symbol: cfg.symbols[i],
      index: i,
    });
  }
}

export function getPuzzleState() { return puzzleState; }
export function resetPuzzle() { puzzleState = null; }
