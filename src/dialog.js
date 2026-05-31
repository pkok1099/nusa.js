// ============================================================
// dialog.js — Enhanced dialog system with callbacks and types
// ============================================================

import { playSound } from './audio.js';
import { justPressed } from './input.js';

let currentDialog = null;
let dialogCallback = null;
let nextDialog = null; // chained dialog

// Start a dialog sequence
// speaker: string, lines: string[], callback: function, dialogType: 'normal'|'bossDefeat'|'unlock', speakerColor: string
export function startDialog(speaker, lines, callback, dialogType, speakerColor) {
  currentDialog = {
    speaker,
    lines,
    lineIndex: 0,
    charIndex: 0,
    timer: 0,
    done: false,
    dialogType: dialogType || 'normal',
    speakerColor: speakerColor || null,
  };
  dialogCallback = callback || null;
  playSound('dialog');
  return 'dialog'; // signal to switch gameState
}

// Chain another dialog to play after the current one finishes
export function chainDialog(speaker, lines, callback, dialogType, speakerColor) {
  nextDialog = { speaker, lines, callback, dialogType: dialogType || 'normal', speakerColor: speakerColor || null };
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

        // Check for chained dialog
        if (nextDialog) {
          const nd = nextDialog;
          nextDialog = null;
          startDialog(nd.speaker, nd.lines, nd.callback, nd.dialogType, nd.speakerColor);
          return { done: false, callback: cb, chained: true };
        }

        return { done: true, callback: cb };
      } else {
        playSound('dialog');
      }
    }
  }
  return { done: false };
}

// Check if a dialog is currently active
export function isDialogActive() {
  return currentDialog !== null;
}
