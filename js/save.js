// ============================================================
// save.js — Save/load game progress to localStorage
// ============================================================

const SAVE_KEY = 'nusantara_save';

// Default values for the new map system fields
const DEFAULT_MAP_COUNT = 5;
const DEFAULT_CLEARED_MAPS = () => Array(DEFAULT_MAP_COUNT).fill(false);
const DEFAULT_UNLOCKED_MAPS = () => {
  const arr = Array(DEFAULT_MAP_COUNT).fill(false);
  arr[0] = true;
  return arr;
};
const DEFAULT_CURRENT_MAP_ID = 0;
const DEFAULT_SOLVED_PUZZLES = () => [];

// Derive unlockedMaps from clearedMaps: if map i is cleared, map i+1 is unlocked
function deriveUnlockedMaps(clearedMaps) {
  const unlocked = Array(clearedMaps.length).fill(false);
  unlocked[0] = true; // First map is always accessible
  for (let i = 0; i < clearedMaps.length; i++) {
    if (clearedMaps[i] && i + 1 < unlocked.length) {
      unlocked[i + 1] = true;
    }
  }
  return unlocked;
}

// Convert solvedPuzzles Set to array for serialization
function solvedPuzzlesToArray(solvedPuzzles) {
  if (solvedPuzzles instanceof Set) {
    return [...solvedPuzzles];
  }
  if (Array.isArray(solvedPuzzles)) {
    return [...solvedPuzzles];
  }
  return [];
}

// Save game progress to localStorage
export function saveGame(player, inventory, deathCount, currentMapId, clearedMaps, unlockedMaps, solvedPuzzles) {
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
        // Souls-like v0.7.1: Rally and poise
        rallyHp: player.rallyHp,
        rallyTimer: player.rallyTimer,
        poise: player.poise,
        // Souls-like v0.7.1: Hollowing
        hollowing: player.hollowing,
        // v0.9.0: Activated bonfires (convert Set to array for JSON)
        activatedBonfires: player.activatedBonfires ? [...player.activatedBonfires] : [],
      },
      inventory: {
        items: inventory.items.map(item => ({ ...item })),
        equipment: { ...inventory.equipment },
        activeBuffs: inventory.activeBuffs.map(b => ({ ...b })),
        skillPoints: inventory.skillPoints,
        allocatedStats: { ...inventory.allocatedStats },
      },
      deathCount: deathCount,
      // Map system fields
      currentMapId: currentMapId,
      clearedMaps: [...clearedMaps],
      unlockedMaps: [...unlockedMaps],
      solvedPuzzles: solvedPuzzlesToArray(solvedPuzzles),
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
// Provides backward-compatible defaults for new map system fields
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.player || !data.inventory) return null;

    // Backward compatibility: ensure new map system fields exist
    if (data.currentMapId === undefined) {
      // Try to derive from old currentStageId if available
      data.currentMapId = (typeof data.currentStageId === 'number') ? data.currentStageId : DEFAULT_CURRENT_MAP_ID;
    }

    if (!data.clearedMaps) {
      // Try to derive from old clearedStages if available
      if (Array.isArray(data.clearedStages)) {
        data.clearedMaps = [...data.clearedStages];
        // Extend or trim to match expected map count
        while (data.clearedMaps.length < DEFAULT_MAP_COUNT) data.clearedMaps.push(false);
        data.clearedMaps = data.clearedMaps.slice(0, DEFAULT_MAP_COUNT);
      } else {
        data.clearedMaps = DEFAULT_CLEARED_MAPS();
      }
    }

    if (!data.unlockedMaps) {
      // Try to derive from old unlockedStages if available
      if (Array.isArray(data.unlockedStages)) {
        data.unlockedMaps = [...data.unlockedStages];
        while (data.unlockedMaps.length < DEFAULT_MAP_COUNT) data.unlockedMaps.push(false);
        data.unlockedMaps = data.unlockedMaps.slice(0, DEFAULT_MAP_COUNT);
      } else if (data.clearedMaps.some(c => c)) {
        // Derive from clearedMaps if any map is cleared
        data.unlockedMaps = deriveUnlockedMaps(data.clearedMaps);
      } else {
        data.unlockedMaps = DEFAULT_UNLOCKED_MAPS();
      }
    }

    if (!data.solvedPuzzles) {
      data.solvedPuzzles = DEFAULT_SOLVED_PUZZLES();
    }

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
