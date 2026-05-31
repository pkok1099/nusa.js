// ============================================================
// puzzle.js — Enhanced puzzle system with multiple types
// ============================================================

import { GAME_W, GAME_H, C, STAGES } from './config.js';
import { playSound } from './audio.js';

// Per-map puzzle configurations
const PUZZLE_CONFIGS = [
  // Map 0: Candi Borobudur — Kawi Number Decipher
  {
    type: 'kawi_decipher',
    title: 'KAWI DECODING',
    instructions: 'Tentukan angka yang hilang! Angka Kawi kuno menggunakan pola matematika.',
    // 3 rounds of number puzzles
    rounds: [
      { sequence: [2, 4, 6, 8, '?'], answer: 10, hint: 'Selisih tetap +2' },
      { sequence: [1, 1, 2, 3, 5, '?'], answer: 8, hint: 'Fibonacci: jumlah 2 sebelumnya' },
      { sequence: [3, 9, 27, '?'], answer: 81, hint: 'Kelipatan ×3' },
    ],
    reward: { exp: 50, description: '+50 EXP & Ramuan Kesehatan' },
  },
  // Map 1: Hutan Borneo — Batik Pattern Completion
  {
    type: 'batik_pattern',
    title: 'POLA BATIK',
    instructions: 'Lengkapi pola batik! Pilih tile yang benar untuk baris kosong.',
    // 4x4 grid pattern — player must find the missing tile
    patterns: [
      {
        grid: [
          [1, 2, 1, 2],
          [2, 1, 2, 1],
          [1, 2, 1, 2],
          [2, 1, 2, '?'],
        ],
        answer: 1,
        options: [1, 2, 3, 4],
        symbols: ['◆', '◇', '▲', '△'],
      },
      {
        grid: [
          [1, 2, 3, 1],
          [2, 3, 1, 2],
          [3, 1, 2, 3],
          [1, 2, 3, '?'],
        ],
        answer: 1,
        options: [1, 2, 3, 4],
        symbols: ['●', '◆', '▲', '■'],
      },
    ],
    reward: { exp: 75, description: '+75 EXP & Ramuan Stamina' },
  },
  // Map 2: Gunung Bromo — Gamelan Gong Sequence
  {
    type: 'gamelan_sequence',
    title: 'RITME GAMELAN',
    instructions: 'Ulangi urutan gong yang dimainkan!',
    symbols: ['🎵', '🎶', '🎼', '🥁', '🔔'],
    sequences: [
      [0, 2, 4, 1, 3],
      [2, 0, 4, 3, 1, 2],
      [1, 3, 0, 4, 2, 1, 3],
    ],
    reward: { exp: 100, description: '+100 EXP & 120 Rupiah' },
  },
  // Map 3: Laut Bali — Water Channel Routing
  {
    type: 'water_channels',
    title: 'SALURAN AIR',
    instructions: 'Putar ubin saluran untuk mengalirkan air suci ke kuil!',
    // Grid of pipe tiles — player rotates them to connect source to destination
    gridSize: 4,
    reward: { exp: 125, description: '+125 EXP & Ramuan Pertahanan' },
  },
  // Map 4: Candi Prambanan — Dewata Riddle
  {
    type: 'dewata_riddle',
    title: 'TEKA-TEKI DEWATA',
    instructions: 'Jawab teka-teki dewata untuk membuka berkah!',
    riddles: [
      { question: 'Aku punya kota tapi tidak punya rumah, hutan tapi tidak punya pohon, air tapi tidak punya ikan. Apa aku?', answer: 'PETA', hint: 'Digunakan untuk navigasi', options: ['PETA', 'DUNIA', 'MIMPI', 'LAUT'] },
      { question: 'Semakin kau ambil, semakin aku bertambah. Apa aku?', answer: 'LUBANG', hint: 'Dibuat oleh penggali', options: ['LUBANG', 'ILMU', 'UANG', 'CAKRAM'] },
      { question: 'Aku lahir dari api, hidup di udara, mati di air. Apa aku?', answer: 'API', hint: 'Elemental', options: ['API', 'ANGIN', 'ASAP', 'ABU'] },
    ],
    reward: { exp: 150, description: '+150 EXP & Poin Keahlian +2' },
  },
];

// ---- Pipe type definitions for Water Channels puzzle ----
// Each pipe type defines which sides are open: top, right, bottom, left
// Rotation rotates these openings clockwise
export const PIPE_CONNECTIONS = {
  0: [],                          // empty — no connections
  1: [false, true, false, true],  // horizontal (left-right)
  2: [true, false, true, false],  // vertical (top-bottom)
  3: [true, true, false, false],  // corner: top-right
  4: [false, true, true, false],  // corner: right-bottom
  5: [false, false, true, true],  // corner: bottom-left
  6: [true, false, false, true],  // corner: top-left
  7: [true, true, true, true],    // cross: all sides
};

/**
 * Rotate a connection array clockwise by `rot` steps (each step = 90°)
 * e.g. [T, R, B, L] rotated once → [L, T, R, B]
 */
function rotateConnections(base, rot) {
  const r = ((rot % 4) + 4) % 4;
  const c = [...base];
  for (let i = 0; i < r; i++) {
    const last = c.pop();
    c.unshift(last);
  }
  return c;
}

/**
 * Get the actual connections for a pipe tile considering its rotation
 */
function getPipeConnections(tile) {
  const base = PIPE_CONNECTIONS[tile.type];
  if (!base) return [false, false, false, false];
  return rotateConnections(base, tile.rotation);
}

/**
 * Check if two adjacent tiles connect properly
 * tileA at (ax, ay) and tileB at (bx, by)
 */
function tilesConnect(tileA, tileB, dx, dy) {
  const connA = getPipeConnections(tileA);
  const connB = getPipeConnections(tileB);

  if (dx === 1 && dy === 0)  return connA[1] && connB[3]; // A→right, B→left
  if (dx === -1 && dy === 0) return connA[3] && connB[1]; // A→left, B→right
  if (dx === 0 && dy === 1)  return connA[2] && connB[0]; // A→bottom, B→top
  if (dx === 0 && dy === -1) return connA[0] && connB[2]; // A→top, B→bottom
  return false;
}

/**
 * Generate a solvable water channel puzzle by creating a valid path
 * and then randomizing rotations
 */
function generateWaterChannelGrid(size) {
  const grid = [];

  // Create a valid path from top-left to bottom-right
  // First, fill with empty tiles
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      grid[y][x] = { type: 0, rotation: 0, onPath: false };
    }
  }

  // Generate a random path from (0,0) to (size-1, size-1)
  const path = [];
  const visited = new Set();
  let cx = 0, cy = 0;
  path.push({ x: cx, y: cy });
  visited.add(`${cx},${cy}`);

  while (cx !== size - 1 || cy !== size - 1) {
    const moves = [];
    // Prefer moving right and down
    if (cx < size - 1 && !visited.has(`${cx + 1},${cy}`)) moves.push({ x: cx + 1, y: cy });
    if (cy < size - 1 && !visited.has(`${cx},${cy + 1}`)) moves.push({ x: cx, y: cy + 1 });
    // Allow some left/up for more interesting paths
    if (cx > 0 && !visited.has(`${cx - 1},${cy}`) && Math.random() < 0.2) moves.push({ x: cx - 1, y: cy });
    if (cy > 0 && !visited.has(`${cx},${cy - 1}`) && Math.random() < 0.2) moves.push({ x: cx, y: cy - 1 });

    if (moves.length === 0) {
      // Force move toward goal
      if (cx < size - 1) moves.push({ x: cx + 1, y: cy });
      else moves.push({ x: cx, y: cy + 1 });
    }

    // Pick a move, biased toward goal
    let next;
    const goalMoves = moves.filter(m => m.x >= cx && m.y >= cy);
    if (goalMoves.length > 0 && Math.random() < 0.7) {
      next = goalMoves[Math.floor(Math.random() * goalMoves.length)];
    } else {
      next = moves[Math.floor(Math.random() * moves.length)];
    }

    cx = next.x;
    cy = next.y;
    path.push({ x: cx, y: cy });
    visited.add(`${cx},${cy}`);
  }

  // Determine pipe types for path tiles based on connections
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const prev = i > 0 ? path[i - 1] : null;
    const next = i < path.length - 1 ? path[i + 1] : null;

    // Determine which directions connect
    const top = prev && prev.x === p.x && prev.y === p.y - 1;
    const bottom = next && next.x === p.x && next.y === p.y + 1;
    const bottomAlt = prev && prev.x === p.x && prev.y === p.y + 1;
    const topAlt = next && next.x === p.x && next.y === p.y - 1;
    const left = prev && prev.y === p.y && prev.x === p.x - 1;
    const right = next && next.y === p.y && next.x === p.x + 1;
    const rightAlt = prev && prev.y === p.y && prev.x === p.x + 1;
    const leftAlt = next && next.y === p.y && next.x === p.x - 1;

    const connTop = top || topAlt;
    const connRight = right || rightAlt;
    const connBottom = bottom || bottomAlt;
    const connLeft = left || leftAlt;

    // Find matching pipe type (rotation 0)
    let pipeType = 7; // cross fallback
    let pipeRot = 0;

    // Find the pipe type and rotation that matches the connections
    const targetConn = [connTop, connRight, connBottom, connLeft];
    const numConn = targetConn.filter(Boolean).length;

    if (numConn === 2) {
      // Check straight and corner types
      for (const [typeStr, baseConn] of Object.entries(PIPE_CONNECTIONS)) {
        const type = parseInt(typeStr);
        if (baseConn.filter(Boolean).length !== 2) continue;
        for (let rot = 0; rot < 4; rot++) {
          const rotated = rotateConnections(baseConn, rot);
          if (rotated[0] === targetConn[0] && rotated[1] === targetConn[1] &&
              rotated[2] === targetConn[2] && rotated[3] === targetConn[3]) {
            pipeType = type;
            pipeRot = rot;
          }
        }
      }
    } else if (numConn === 4) {
      pipeType = 7;
      pipeRot = 0;
    } else if (numConn === 1 || numConn === 3) {
      // For simplicity, use cross for 3, or handle 1 as dead-end-ish
      pipeType = 7;
      pipeRot = 0;
    } else if (numConn === 0) {
      pipeType = 0;
      pipeRot = 0;
    }

    grid[p.y][p.x] = { type: pipeType, correctRotation: pipeRot, rotation: pipeRot, onPath: true };
  }

  // Fill non-path tiles with random pipe types
  const pipeTypes = [1, 2, 3, 4, 5, 6, 7];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x].onPath) {
        grid[y][x] = {
          type: pipeTypes[Math.floor(Math.random() * pipeTypes.length)],
          rotation: Math.floor(Math.random() * 4),
          onPath: false,
        };
      }
    }
  }

  // Now randomize ALL rotations (including path tiles) so player must solve
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type !== 0) {
        // Add random rotation offset (1-3) to scramble, but keep it solvable
        const scramble = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
        grid[y][x].rotation = (grid[y][x].rotation + scramble) % 4;
      }
    }
  }

  return grid;
}

/**
 * Check if water can flow from (0,0) to (size-1, size-1)
 * using BFS through connected pipes
 */
export function checkWaterFlow(grid, size) {
  const visited = new Set();
  const queue = [];

  // Start from top-left if it has a connection going into it from outside (top or left)
  const startConn = getPipeConnections(grid[0][0]);
  // Source enters from the top of (0,0) or left
  if (startConn[0] || startConn[3]) {
    queue.push({ x: 0, y: 0 });
    visited.add('0,0');
  }

  const dirs = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
  ];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === size - 1 && cur.y === size - 1) return true;

    const curConn = getPipeConnections(grid[cur.y][cur.x]);

    for (const dir of dirs) {
      const nx = cur.x + dir.dx;
      const ny = cur.y + dir.dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;

      if (tilesConnect(grid[cur.y][cur.x], grid[ny][nx], dir.dx, dir.dy)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}

// ---- Puzzle state ----
export let puzzleState = null;

export function initPuzzle(stageId) {
  const sid = stageId || 0;
  const cfg = PUZZLE_CONFIGS[sid] || PUZZLE_CONFIGS[0];

  puzzleState = {
    type: cfg.type,
    title: cfg.title,
    instructions: cfg.instructions,
    config: cfg,
    solved: false,
    failed: false,
    failTimer: 0,
    stageId: sid,
    // Common state
    round: 0,
    input: '',
    highlight: -1,
    highlightTimer: 0,
    showTimer: 0,
    showIndex: 0,
    showingSequence: false,
    playerSeq: [],
    // For gamelan
    buttons: [],
    // For batik
    selectedOption: -1,
    currentPattern: null,
    // For water channels
    channelGrid: null,
    waterFlowChecked: false,
    // For riddle
    selectedAnswer: -1,
    currentRiddle: 0,
    showHint: false,
    // For kawi
    inputNumber: '',
    wrongAttempts: 0,
    showRoundResult: false,
    roundResultCorrect: false,
    roundResultTimer: 0,
    // Reward display
    rewardShown: false,
    rewardTimer: 0,
  };

  // Initialize type-specific state
  switch (cfg.type) {
    case 'gamelan_sequence':
      initGamelanPuzzle(cfg);
      break;
    case 'batik_pattern':
      initBatikPuzzle(cfg);
      break;
    case 'water_channels':
      initWaterChannelsPuzzle(cfg);
      break;
    case 'dewata_riddle':
      initRiddlePuzzle(cfg);
      break;
    case 'kawi_decipher':
      initKawiPuzzle(cfg);
      break;
  }
}

// ---- Type-specific initializers ----

function initKawiPuzzle(cfg) {
  puzzleState.round = 0;
  puzzleState.inputNumber = '';
  puzzleState.wrongAttempts = 0;
  puzzleState.showRoundResult = false;
  puzzleState.roundResultCorrect = false;
  puzzleState.roundResultTimer = 0;
}

function initGamelanPuzzle(cfg) {
  const numSymbols = cfg.symbols.length;
  const bw = Math.min(70, (GAME_W - 80 - (numSymbols - 1) * 12) / numSymbols);
  const bh = bw;
  const gap = 12;
  const totalW = numSymbols * bw + (numSymbols - 1) * gap;
  const startX = GAME_W / 2 - totalW / 2;

  puzzleState.showingSequence = true;
  puzzleState.showIndex = 0;
  puzzleState.showTimer = 0;
  puzzleState.playerSeq = [];
  puzzleState.buttons = [];
  puzzleState.round = 0;

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

function initBatikPuzzle(cfg) {
  const pattern = cfg.patterns[0];
  puzzleState.selectedOption = -1;
  puzzleState.currentPattern = pattern;
  puzzleState.round = 0;
}

function initWaterChannelsPuzzle(cfg) {
  const size = cfg.gridSize;
  puzzleState.channelGrid = generateWaterChannelGrid(size);
  puzzleState.waterFlowChecked = false;
}

function initRiddlePuzzle(cfg) {
  puzzleState.selectedAnswer = -1;
  puzzleState.currentRiddle = 0;
  puzzleState.showHint = false;
}

// ---- Puzzle interaction helpers ----

/**
 * Handle kawi decipher number input
 */
export function kawiSubmitAnswer() {
  if (!puzzleState || puzzleState.type !== 'kawi_decipher') return;
  if (puzzleState.showRoundResult) return;

  const cfg = puzzleState.config;
  const currentRound = cfg.rounds[puzzleState.round];
  const playerAnswer = parseInt(puzzleState.inputNumber, 10);

  if (isNaN(playerAnswer)) return;

  if (playerAnswer === currentRound.answer) {
    puzzleState.roundResultCorrect = true;
    puzzleState.showRoundResult = true;
    puzzleState.roundResultTimer = 60;
    playSound('hit');
  } else {
    puzzleState.wrongAttempts++;
    puzzleState.roundResultCorrect = false;
    puzzleState.showRoundResult = true;
    puzzleState.roundResultTimer = 40;
    playSound('hurt');
  }
}

/**
 * Advance kawi to next round or complete
 */
export function kawiNextRound() {
  if (!puzzleState || puzzleState.type !== 'kawi_decipher') return;

  if (puzzleState.roundResultCorrect) {
    puzzleState.round++;
    puzzleState.inputNumber = '';

    if (puzzleState.round >= puzzleState.config.rounds.length) {
      puzzleState.solved = true;
      puzzleState.rewardShown = true;
      puzzleState.rewardTimer = 120;
      playSound('levelup');
    }
  } else {
    // Wrong answer — reset input, stay on same round
    puzzleState.inputNumber = '';

    if (puzzleState.wrongAttempts >= 3) {
      puzzleState.failed = true;
      puzzleState.failTimer = 90;
      playSound('hurt');
    }
  }

  puzzleState.showRoundResult = false;
}

/**
 * Handle gamelan sequence button press
 */
export function gamelanPressButton(index) {
  if (!puzzleState || puzzleState.type !== 'gamelan_sequence') return;
  if (puzzleState.showingSequence || puzzleState.solved || puzzleState.failed) return;

  const cfg = puzzleState.config;
  const currentSeq = cfg.sequences[puzzleState.round];

  puzzleState.highlight = index;
  puzzleState.highlightTimer = 15;
  puzzleState.playerSeq.push(index);
  playSound('coin');

  const pos = puzzleState.playerSeq.length - 1;

  // Check if the pressed button matches the sequence
  if (puzzleState.playerSeq[pos] !== currentSeq[pos]) {
    puzzleState.failed = true;
    puzzleState.failTimer = 90;
    playSound('hurt');
    return;
  }

  // Check if sequence is complete
  if (puzzleState.playerSeq.length === currentSeq.length) {
    puzzleState.round++;
    puzzleState.playerSeq = [];

    if (puzzleState.round >= cfg.sequences.length) {
      puzzleState.solved = true;
      puzzleState.rewardShown = true;
      puzzleState.rewardTimer = 120;
      playSound('levelup');
    } else {
      // Show next sequence
      puzzleState.showingSequence = true;
      puzzleState.showIndex = 0;
      puzzleState.showTimer = 0;
      playSound('hit');
    }
  }
}

/**
 * Handle batik pattern option selection
 */
export function batikSelectOption(optionIndex) {
  if (!puzzleState || puzzleState.type !== 'batik_pattern') return;
  if (puzzleState.solved || puzzleState.failed) return;

  const pattern = puzzleState.currentPattern;
  const selectedValue = pattern.options[optionIndex];

  if (selectedValue === pattern.answer) {
    puzzleState.selectedOption = optionIndex;
    puzzleState.round++;
    playSound('hit');

    if (puzzleState.round >= puzzleState.config.patterns.length) {
      puzzleState.solved = true;
      puzzleState.rewardShown = true;
      puzzleState.rewardTimer = 120;
      playSound('levelup');
    } else {
      // Load next pattern
      puzzleState.currentPattern = puzzleState.config.patterns[puzzleState.round];
      puzzleState.selectedOption = -1;
    }
  } else {
    puzzleState.selectedOption = optionIndex;
    puzzleState.wrongAttempts++;
    playSound('hurt');

    if (puzzleState.wrongAttempts >= 3) {
      puzzleState.failed = true;
      puzzleState.failTimer = 90;
    }
  }
}

/**
 * Rotate a water channel pipe tile
 */
export function waterRotateTile(x, y) {
  if (!puzzleState || puzzleState.type !== 'water_channels') return;
  if (puzzleState.solved || puzzleState.failed) return;

  const grid = puzzleState.channelGrid;
  const size = puzzleState.config.gridSize;

  if (x < 0 || x >= size || y < 0 || y >= size) return;

  const tile = grid[y][x];
  if (tile.type === 0) return; // Can't rotate empty

  tile.rotation = (tile.rotation + 1) % 4;
  puzzleState.waterFlowChecked = false;
  playSound('coin');
}

/**
 * Check if water channel puzzle is solved
 */
export function waterCheckFlow() {
  if (!puzzleState || puzzleState.type !== 'water_channels') return;
  if (puzzleState.solved || puzzleState.failed) return;

  const size = puzzleState.config.gridSize;
  const connected = checkWaterFlow(puzzleState.channelGrid, size);

  puzzleState.waterFlowChecked = true;

  if (connected) {
    puzzleState.solved = true;
    puzzleState.rewardShown = true;
    puzzleState.rewardTimer = 120;
    playSound('levelup');
  } else {
    puzzleState.wrongAttempts++;
    if (puzzleState.wrongAttempts >= 5) {
      puzzleState.failed = true;
      puzzleState.failTimer = 90;
      playSound('hurt');
    } else {
      playSound('hurt');
    }
  }
}

/**
 * Handle riddle answer selection
 */
export function riddleSelectAnswer(optionIndex) {
  if (!puzzleState || puzzleState.type !== 'dewata_riddle') return;
  if (puzzleState.solved || puzzleState.failed) return;

  const cfg = puzzleState.config;
  const riddle = cfg.riddles[puzzleState.currentRiddle];

  puzzleState.selectedAnswer = optionIndex;

  if (riddle.options[optionIndex] === riddle.answer) {
    puzzleState.roundResultCorrect = true;
    puzzleState.showRoundResult = true;
    puzzleState.roundResultTimer = 60;
    playSound('hit');
  } else {
    puzzleState.wrongAttempts++;
    puzzleState.roundResultCorrect = false;
    puzzleState.showRoundResult = true;
    puzzleState.roundResultTimer = 40;
    playSound('hurt');

    if (puzzleState.wrongAttempts >= 3) {
      puzzleState.failed = true;
      puzzleState.failTimer = 90;
    }
  }
}

/**
 * Advance riddle to next round or complete
 */
export function riddleNextRound() {
  if (!puzzleState || puzzleState.type !== 'dewata_riddle') return;

  if (puzzleState.roundResultCorrect) {
    puzzleState.currentRiddle++;
    puzzleState.selectedAnswer = -1;
    puzzleState.showHint = false;

    if (puzzleState.currentRiddle >= puzzleState.config.riddles.length) {
      puzzleState.solved = true;
      puzzleState.rewardShown = true;
      puzzleState.rewardTimer = 120;
      playSound('levelup');
    }
  } else {
    puzzleState.selectedAnswer = -1;
    puzzleState.showHint = true;
  }

  puzzleState.showRoundResult = false;
}

/**
 * Toggle hint display for riddle
 */
export function riddleToggleHint() {
  if (!puzzleState || puzzleState.type !== 'dewata_riddle') return;
  puzzleState.showHint = !puzzleState.showHint;
}

/**
 * Add a digit to kawi input
 */
export function kawiInputDigit(digit) {
  if (!puzzleState || puzzleState.type !== 'kawi_decipher') return;
  if (puzzleState.inputNumber.length >= 4) return; // Max 4 digits
  puzzleState.inputNumber += digit;
}

/**
 * Delete last digit from kawi input
 */
export function kawiDeleteDigit() {
  if (!puzzleState || puzzleState.type !== 'kawi_decipher') return;
  puzzleState.inputNumber = puzzleState.inputNumber.slice(0, -1);
}

// ---- Update tick (called each frame) ----

export function updatePuzzle() {
  if (!puzzleState) return;

  // Handle fail timer countdown
  if (puzzleState.failed) {
    puzzleState.failTimer--;
    if (puzzleState.failTimer <= 0) {
      resetPuzzle();
      return;
    }
  }

  // Handle reward display timer
  if (puzzleState.solved && puzzleState.rewardShown) {
    puzzleState.rewardTimer--;
    // Reward display persists; player must dismiss
  }

  // Handle highlight timer (gamelan)
  if (puzzleState.highlightTimer > 0) {
    puzzleState.highlightTimer--;
    if (puzzleState.highlightTimer <= 0) {
      puzzleState.highlight = -1;
    }
  }

  // Handle round result timer
  if (puzzleState.showRoundResult) {
    puzzleState.roundResultTimer--;
    if (puzzleState.roundResultTimer <= 0) {
      if (puzzleState.type === 'kawi_decipher') {
        kawiNextRound();
      } else if (puzzleState.type === 'dewata_riddle') {
        riddleNextRound();
      }
    }
  }

  // Handle gamelan sequence showing
  if (puzzleState.type === 'gamelan_sequence' && puzzleState.showingSequence) {
    const cfg = puzzleState.config;
    const currentSeq = cfg.sequences[puzzleState.round];

    puzzleState.showTimer++;

    // Show each symbol for ~30 frames, with ~15 frame gaps
    const showDuration = 30;
    const gapDuration = 15;
    const totalPerSymbol = showDuration + gapDuration;
    const totalDuration = currentSeq.length * totalPerSymbol;

    const currentFrame = puzzleState.showTimer - 1;
    const symbolIndex = Math.floor(currentFrame / totalPerSymbol);
    const frameInSymbol = currentFrame % totalPerSymbol;

    if (symbolIndex < currentSeq.length) {
      if (frameInSymbol < showDuration) {
        puzzleState.highlight = currentSeq[symbolIndex];
      } else {
        puzzleState.highlight = -1;
      }
      puzzleState.showIndex = symbolIndex;
    }

    if (puzzleState.showTimer >= totalDuration) {
      puzzleState.showingSequence = false;
      puzzleState.highlight = -1;
      puzzleState.playerSeq = [];
    }
  }
}

/**
 * Get the current sequence for the gamelan puzzle (convenience)
 */
export function getGamelanCurrentSequence() {
  if (!puzzleState || puzzleState.type !== 'gamelan_sequence') return [];
  return puzzleState.config.sequences[puzzleState.round] || [];
}

/**
 * Get the current round data for kawi puzzle (convenience)
 */
export function getKawiCurrentRound() {
  if (!puzzleState || puzzleState.type !== 'kawi_decipher') return null;
  return puzzleState.config.rounds[puzzleState.round] || null;
}

/**
 * Get the current riddle (convenience)
 */
export function getRiddleCurrent() {
  if (!puzzleState || puzzleState.type !== 'dewata_riddle') return null;
  return puzzleState.config.riddles[puzzleState.currentRiddle] || null;
}

/**
 * Get reward config for current puzzle
 */
export function getPuzzleReward() {
  if (!puzzleState) return null;
  return puzzleState.config.reward || null;
}

export function getPuzzleState() { return puzzleState; }
export function resetPuzzle() { puzzleState = null; }
