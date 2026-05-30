// ============================================================
// touch.js — On-screen touch controls for mobile play
// ============================================================

import { keys } from './input.js';
import { initAudio } from './audio.js';

// Track which touch IDs are assigned to which controls
const touchMap = new Map(); // touchId -> controlName

// Control layout configuration (positions are in viewport %)
const CONTROLS = {
  // D-pad (left side)
  left:  { x: 6,  y: 68, w: 10, h: 14, key: 'ArrowLeft',  label: '◀' },
  right: { x: 22, y: 68, w: 10, h: 14, key: 'ArrowRight', label: '▶' },
  // Action buttons (right side)
  jump:   { x: 72, y: 64, w: 12, h: 14, key: 'ArrowUp',    label: '↑' },
  attack: { x: 86, y: 74, w: 12, h: 14, key: 'Space',      label: '⚔' },
  dodge:  { x: 72, y: 80, w: 12, h: 14, key: 'ShiftLeft',  label: '↷' },
};

let touchControlsEnabled = false;
let isMobileDevice = false;

// Detect mobile device
function detectMobile() {
  return ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0) ||
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Create DOM elements for touch controls
function createTouchOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'touchOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 1000; user-select: none;
    -webkit-user-select: none; touch-action: none;
  `;

  for (const [name, ctrl] of Object.entries(CONTROLS)) {
    const btn = document.createElement('div');
    btn.id = `touch-${name}`;
    btn.dataset.control = name;
    btn.textContent = ctrl.label;
    btn.style.cssText = `
      position: absolute;
      left: ${ctrl.x}%; top: ${ctrl.y}%;
      width: ${ctrl.w}%; height: ${ctrl.h}%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(212, 175, 55, 0.15);
      border: 2px solid rgba(212, 175, 55, 0.3);
      border-radius: 12px;
      color: rgba(212, 175, 55, 0.6);
      font-size: 24px;
      font-weight: bold;
      pointer-events: auto;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      transition: background 0.1s;
    `;
    overlay.appendChild(btn);
  }

  document.body.appendChild(overlay);
  return overlay;
}

// Hit test: check if a touch position is within a control button
function hitTestControl(clientX, clientY) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  for (const [name, ctrl] of Object.entries(CONTROLS)) {
    const left = ctrl.x / 100 * vw;
    const top = ctrl.y / 100 * vh;
    const width = ctrl.w / 100 * vw;
    const height = ctrl.h / 100 * vh;

    if (clientX >= left && clientX <= left + width &&
        clientY >= top && clientY <= top + height) {
      return { name, key: ctrl.key };
    }
  }
  return null;
}

// Highlight a button visually
function highlightButton(name, active) {
  const btn = document.getElementById(`touch-${name}`);
  if (!btn) return;
  if (active) {
    btn.style.background = 'rgba(212, 175, 55, 0.4)';
    btn.style.borderColor = 'rgba(212, 175, 55, 0.7)';
    btn.style.color = 'rgba(212, 175, 55, 0.9)';
  } else {
    btn.style.background = 'rgba(212, 175, 55, 0.15)';
    btn.style.borderColor = 'rgba(212, 175, 55, 0.3)';
    btn.style.color = 'rgba(212, 175, 55, 0.6)';
  }
}

// Handle touch start
function onTouchStart(e) {
  e.preventDefault();
  initAudio();

  for (const touch of e.changedTouches) {
    const hit = hitTestControl(touch.clientX, touch.clientY);
    if (hit) {
      touchMap.set(touch.identifier, hit.name);
      keys[hit.key] = true;
      highlightButton(hit.name, true);
    }
  }
}

// Handle touch move (finger might slide to different button)
function onTouchMove(e) {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const currentControl = touchMap.get(touch.identifier);
    const hit = hitTestControl(touch.clientX, touch.clientY);

    if (hit) {
      if (currentControl !== hit.name) {
        // Release previous control
        if (currentControl) {
          const prevCtrl = CONTROLS[currentControl];
          keys[prevCtrl.key] = false;
          highlightButton(currentControl, false);
        }
        // Activate new control
        touchMap.set(touch.identifier, hit.name);
        keys[hit.key] = true;
        highlightButton(hit.name, true);
      }
    } else if (currentControl) {
      // Finger moved off all buttons
      const prevCtrl = CONTROLS[currentControl];
      keys[prevCtrl.key] = false;
      highlightButton(currentControl, false);
      touchMap.delete(touch.identifier);
    }
  }
}

// Handle touch end
function onTouchEnd(e) {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const controlName = touchMap.get(touch.identifier);
    if (controlName) {
      const ctrl = CONTROLS[controlName];
      keys[ctrl.key] = false;
      highlightButton(controlName, false);
      touchMap.delete(touch.identifier);
    }
  }
}

// Handle touch cancel
function onTouchCancel(e) {
  onTouchEnd(e);
}

// Initialize touch controls
export function initTouchControls() {
  isMobileDevice = detectMobile();

  // Only show touch controls on mobile/touch devices
  if (!isMobileDevice) return;

  touchControlsEnabled = true;
  const overlay = createTouchOverlay();

  // Attach listeners to the overlay
  overlay.addEventListener('touchstart', onTouchStart, { passive: false });
  overlay.addEventListener('touchmove', onTouchMove, { passive: false });
  overlay.addEventListener('touchend', onTouchEnd, { passive: false });
  overlay.addEventListener('touchcancel', onTouchCancel, { passive: false });
}

// Show/hide touch controls (for menu states)
export function setTouchControlsVisible(visible) {
  const overlay = document.getElementById('touchOverlay');
  if (overlay) {
    overlay.style.display = visible ? 'block' : 'none';
  }
}

// Check if touch controls are active
export function isTouchActive() {
  return touchControlsEnabled;
}
