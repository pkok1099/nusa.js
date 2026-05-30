// ============================================================
// save.js — Save/load game progress to localStorage
// ============================================================

const SAVE_KEY = 'nusantara_save';

// Save game progress to localStorage
export function saveGame(player, inventory, unlockedStages, deathCount, currentStageId) {
  try {
    const data = {
      player: {
        hp: player.hp,
        level: player.level,
        exp: player.exp,
        expNext: player.expNext,
        rupiah: player.rupiah,
        artifacts: player.artifacts,
        keys: player.keys,
        currentStageId: player.currentStageId,
        checkpoint: { ...player.checkpoint },
        // Souls-like v0.7.0: Save estus and bloodstain data
        estus: player.estus,
        estusMax: player.estusMax,
        bloodstain: player.bloodstain ? { ...player.bloodstain } : null,
        lostRupiah: player.lostRupiah,
      },
      inventory: {
        items: inventory.items.map(item => ({ ...item })),
        equipment: { ...inventory.equipment },
        activeBuffs: inventory.activeBuffs.map(b => ({ ...b })),
        skillPoints: inventory.skillPoints,
        allocatedStats: { ...inventory.allocatedStats },
      },
      unlockedStages: [...unlockedStages],
      deathCount: deathCount,
      currentStageId: currentStageId,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Gagal menyimpan game:', e);
    return false;
  }
}

// Load from localStorage
// Return null if no save or corrupted
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.player || !data.inventory) return null;
    return data;
  } catch (e) {
    console.warn('Gagal memuat save:', e);
    return null;
  }
}

// Return true if save exists
export function hasSaveGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return !!(data && data.player && data.inventory);
  } catch (e) {
    return false;
  }
}

// Remove save from localStorage
export function deleteSaveGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('Gagal menghapus save:', e);
  }
}
