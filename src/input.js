// ============================================================
// input.js — Keyboard and mouse input handling (desktop only)
// ============================================================

export const keys = {};
export const prevKeys = {};
export const mouse = { x: 0, y: 0, clicked: false };

import { initAudio } from './audio.js';
import { GAME_W, GAME_H } from './config.js';

function updateMouseFromPointer(canvas, e) {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (GAME_W / r.width);
  mouse.y = (e.clientY - r.top) * (GAME_H / r.height);
}

export function justPressed(code) {
  return keys[code] && !prevKeys[code];
}

export function savePrevKeys() {
  for (const k in keys) prevKeys[k] = keys[k];
}

export function setupInput(canvas) {
  const preventCodes = [
    'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyF', 'KeyR',
    'ShiftLeft', 'ShiftRight', 'Tab', 'Escape', 'Enter',
    'KeyT', 'KeyY', 'KeyG', 'KeyH', 'KeyI', 'KeyL',
  ];

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (preventCodes.includes(e.code)) {
      e.preventDefault();
    }
    console.log(`[INPUT] KeyDown: ${e.code}`);
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    console.log(`[INPUT] KeyUp: ${e.code}`);
  });

  // Phase 5: Use window instead of canvas to avoid overlay blocking
  // Use pointer events for better compatibility
  window.addEventListener('pointermove', e => {
    updateMouseFromPointer(canvas, e);
  });

  window.addEventListener('pointerdown', e => {
    updateMouseFromPointer(canvas, e);
    mouse.clicked = true;
    console.log(`[INPUT] PointerDown at screen(${e.clientX}, ${e.clientY}) -> game(${Math.round(mouse.x)}, ${Math.round(mouse.y)})`);
    initAudio();
  });
}
