// ============================================================
// dialog.js — Dialog system
// ============================================================

import { playSound } from './audio.js';
import { justPressed } from './input.js';

let currentDialog = null;
let dialogCallback = null;

export function startDialog(speaker, lines, callback) {
  currentDialog = { speaker, lines, lineIndex: 0, charIndex: 0, timer: 0, done: false };
  dialogCallback = callback || null;
  playSound('dialog');
  return 'dialog'; // signal to switch gameState
}

export function getCurrentDialog() { return currentDialog; }

export function updateDialog() {
  if (!currentDialog) return null;
  currentDialog.timer++;
  if (currentDialog.timer % 2 === 0 && currentDialog.charIndex < currentDialog.lines[currentDialog.lineIndex].length) {
    currentDialog.charIndex++;
  }
  if (currentDialog.charIndex >= currentDialog.lines[currentDialog.lineIndex].length) {
    currentDialog.done = true;
  }
  if (justPressed('KeyE') || justPressed('Space')) {
    if (!currentDialog.done) {
      currentDialog.charIndex = currentDialog.lines[currentDialog.lineIndex].length;
      currentDialog.done = true;
    } else {
      currentDialog.lineIndex++;
      currentDialog.charIndex = 0;
      currentDialog.done = false;
      if (currentDialog.lineIndex >= currentDialog.lines.length) {
        const cb = dialogCallback;
        currentDialog = null;
        dialogCallback = null;
        return { done: true, callback: cb };
      } else {
        playSound('dialog');
      }
    }
  }
  return { done: false };
}
