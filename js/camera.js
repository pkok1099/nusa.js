// ============================================================
// camera.js — Camera system with smooth follow and clamping
// ============================================================

import { GAME_W, GAME_H, TILE } from './config.js';

export const camera = { x: 0, y: 0 };

export function updateCamera(player, tileMap) {
  if (!tileMap || tileMap.length === 0) return;
  const targetX = player.x + player.w / 2 - GAME_W / 2;
  const targetY = player.y + player.h / 2 - GAME_H / 2;
  camera.x += (targetX - camera.x) * 0.08;
  camera.y += (targetY - camera.y) * 0.08;
  camera.x = Math.max(0, Math.min(tileMap[0].length * TILE - GAME_W, camera.x));
  camera.y = Math.max(0, Math.min(tileMap.length * TILE - GAME_H, camera.y));
}
