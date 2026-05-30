// ============================================================
// input.js — Keyboard, mouse, and touch input handling
// ============================================================

export const keys = {};
export const prevKeys = {};
export const mouse = { x: 0, y: 0, clicked: false };

import { initAudio } from './audio.js';
import { GAME_W, GAME_H } from './config.js';

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
  ];

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (preventCodes.includes(e.code)) e.preventDefault();
  });

  window.addEventListener('keyup', e => { keys[e.code] = false; });

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (GAME_W / r.width);
    mouse.y = (e.clientY - r.top) * (GAME_H / r.height);
  });

  canvas.addEventListener('click', () => {
    mouse.clicked = true;
    initAudio();
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    mouse.x = (t.clientX - r.left) * (GAME_W / r.width);
    mouse.y = (t.clientY - r.top) * (GAME_H / r.height);
    mouse.clicked = true;
    initAudio();
    keys['Space'] = true;
    setTimeout(() => { keys['Space'] = false; }, 100);
  });
}
