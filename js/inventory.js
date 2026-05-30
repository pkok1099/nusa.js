// ============================================================
// inventory.js — Inventory, equipment, and buff management
// ============================================================

import { WEAPONS, ARMORS, ACCESSORIES, POTIONS, EQUIPMENT_SLOTS, STAT_PER_POINT, MAX_ACTIVE_BUFFS, PLAYER_SPEED } from './config.js';
import { playSound } from './audio.js';

// Inventory state
export const inventory = {
  items: [],           // Array of { id, type, category, ...data }
  equipment: {
    weapon: null,      // key from WEAPONS
    armor: null,       // key from ARMORS
    accessory: null,   // key from ACCESSORIES
  },
  skillPoints: 0,
  allocatedStats: { hp: 0, stamina: 0, energy: 0, attack: 0, defense: 0, speed: 0 },
  activeBuffs: [],     // Array of { type, buffType, value, remaining }
};

// Add item to inventory
export function addItem(item) {
  if (inventory.items.length >= 30) return false;
  inventory.items.push({ ...item });
  return true;
}

// Remove item from inventory by index
export function removeItem(index) {
  if (index >= 0 && index < inventory.items.length) {
    inventory.items.splice(index, 1);
    return true;
  }
  return false;
}

// Equip item (weapon/armor/accessory) from inventory
export function equipItem(index) {
  const item = inventory.items[index];
  if (!item) return false;

  if (item.category === 'weapon') {
    // Unequip current weapon back to inventory
    if (inventory.equipment.weapon) {
      const prevWeapon = inventory.equipment.weapon;
      inventory.items.push({
        id: prevWeapon, type: 'equipment', category: 'weapon',
        ...WEAPONS[prevWeapon],
      });
    }
    inventory.equipment.weapon = item.id;
    removeItem(index);
    playSound('pickup');
  } else if (item.category === 'armor') {
    if (inventory.equipment.armor) {
      const prevArmor = inventory.equipment.armor;
      inventory.items.push({
        id: prevArmor, type: 'equipment', category: 'armor',
        ...ARMORS[prevArmor],
      });
    }
    inventory.equipment.armor = item.id;
    removeItem(index);
    playSound('pickup');
  } else if (item.category === 'accessory') {
    if (inventory.equipment.accessory) {
      const prevAcc = inventory.equipment.accessory;
      inventory.items.push({
        id: prevAcc, type: 'equipment', category: 'accessory',
        ...ACCESSORIES[prevAcc],
      });
    }
    inventory.equipment.accessory = item.id;
    removeItem(index);
    playSound('pickup');
  } else {
    return false;
  }
  return true;
}

// Unequip slot — puts item back in inventory
export function unequipSlot(slot) {
  const key = inventory.equipment[slot];
  if (!key) return false;

  let data = null;
  if (slot === 'weapon') data = WEAPONS[key];
  else if (slot === 'armor') data = ARMORS[key];
  else if (slot === 'accessory') data = ACCESSORIES[key];

  if (data && inventory.items.length < 30) {
    inventory.items.push({ id: key, type: 'equipment', category: slot, ...data });
    inventory.equipment[slot] = null;
    playSound('pickup');
    return true;
  }
  return false;
}

// Use potion from inventory by index
// Returns effect object: { type: 'health'|'stamina'|'buff', value, ... } or null
export function usePotion(index) {
  const item = inventory.items[index];
  if (!item || item.type !== 'potion') return null;

  const potionData = POTIONS[item.id];
  if (!potionData) return null;

  removeItem(index);

  if (potionData.type === 'health') {
    playSound('heal');
    return { type: 'health', value: potionData.value };
  } else if (potionData.type === 'stamina') {
    playSound('heal');
    return { type: 'stamina', value: potionData.value };
  } else if (potionData.type === 'buff') {
    applyBuff(potionData);
    return { type: 'buff', buffType: potionData.buffType, value: potionData.value, duration: potionData.duration };
  }
  return null;
}

// Find and use a health potion from inventory
// Returns effect object or null
export function useHealthPotion() {
  const idx = inventory.items.findIndex(i => i.type === 'potion' && i.id === 'health');
  if (idx >= 0) return usePotion(idx);
  return null;
}

// Allocate skill point
export function allocateStat(stat) {
  if (inventory.skillPoints <= 0) return false;
  if (!STAT_PER_POINT[stat]) return false;
  inventory.allocatedStats[stat]++;
  inventory.skillPoints--;
  playSound('pickup');
  return true;
}

// Deallocate skill point (refund)
export function deallocateStat(stat) {
  if (inventory.allocatedStats[stat] <= 0) return false;
  inventory.allocatedStats[stat]--;
  inventory.skillPoints++;
  return true;
}

// Calculate total stats including equipment + buffs + allocated
// Takes playerLevel as parameter to avoid circular dependency
export function getComputedStats(playerLevel) {
  const lvl = playerLevel || 1;

  // Base stats from level
  const baseMaxHp = 100 + (lvl - 1) * 10;
  const baseMaxStamina = 100 + (lvl - 1) * 5;
  const baseMaxEnergy = 100 + (lvl - 1) * 5;
  const baseAttack = 0;
  const baseDefense = 0;
  const baseSpeed = PLAYER_SPEED;

  // Equipment bonuses
  let weaponAtk = 0, weaponSpd = 0;
  if (inventory.equipment.weapon && WEAPONS[inventory.equipment.weapon]) {
    weaponAtk = WEAPONS[inventory.equipment.weapon].attack || 0;
    weaponSpd = WEAPONS[inventory.equipment.weapon].speed || 0;
  }

  let armorDef = 0;
  if (inventory.equipment.armor && ARMORS[inventory.equipment.armor]) {
    armorDef = ARMORS[inventory.equipment.armor].defense || 0;
  }

  let accBonus = { hp: 0, stamina: 0, energy: 0, attack: 0, defense: 0, speed: 0 };
  if (inventory.equipment.accessory && ACCESSORIES[inventory.equipment.accessory]) {
    const acc = ACCESSORIES[inventory.equipment.accessory];
    if (acc.effect && acc.value) {
      accBonus[acc.effect] = (accBonus[acc.effect] || 0) + acc.value;
    }
  }

  // Allocated stat bonuses
  const alloc = inventory.allocatedStats;
  const allocHp = alloc.hp * STAT_PER_POINT.hp;
  const allocStamina = alloc.stamina * STAT_PER_POINT.stamina;
  const allocEnergy = alloc.energy * STAT_PER_POINT.energy;
  const allocAttack = alloc.attack * STAT_PER_POINT.attack;
  const allocDefense = alloc.defense * STAT_PER_POINT.defense;
  const allocSpeed = alloc.speed * STAT_PER_POINT.speed;

  // Buff bonuses
  let buffAttack = 0, buffDefense = 0, buffSpeed = 0;
  inventory.activeBuffs.forEach(b => {
    if (b.buffType === 'attack') buffAttack += b.value;
    else if (b.buffType === 'defense') buffDefense += b.value;
    else if (b.buffType === 'speed') buffSpeed += b.value;
  });

  return {
    maxHp: baseMaxHp + allocHp + accBonus.hp,
    maxStamina: baseMaxStamina + allocStamina + accBonus.stamina,
    maxEnergy: baseMaxEnergy + allocEnergy + accBonus.energy,
    attack: baseAttack + weaponAtk + allocAttack + accBonus.attack + buffAttack,
    defense: baseDefense + armorDef + allocDefense + accBonus.defense + buffDefense,
    speed: baseSpeed + weaponSpd + allocSpeed + accBonus.speed + buffSpeed,
  };
}

// Get equipment info for display
export function getEquippedWeapon() {
  if (inventory.equipment.weapon) return { id: inventory.equipment.weapon, ...WEAPONS[inventory.equipment.weapon] };
  return { id: 'keris', ...WEAPONS.keris };
}

export function getEquippedArmor() {
  if (inventory.equipment.armor) return { id: inventory.equipment.armor, ...ARMORS[inventory.equipment.armor] };
  return { id: 'kain', ...ARMORS.kain };
}

export function getEquippedAccessory() {
  if (inventory.equipment.accessory) return { id: inventory.equipment.accessory, ...ACCESSORIES[inventory.equipment.accessory] };
  return null;
}

// Update buffs (call each frame)
export function updateBuffs() {
  inventory.activeBuffs = inventory.activeBuffs.filter(b => {
    b.remaining--;
    return b.remaining > 0;
  });
}

// Apply buff effect
export function applyBuff(potionData) {
  // Remove oldest buff if at max
  if (inventory.activeBuffs.length >= MAX_ACTIVE_BUFFS) {
    inventory.activeBuffs.shift();
  }
  inventory.activeBuffs.push({
    type: 'buff',
    buffType: potionData.buffType,
    value: potionData.value,
    remaining: potionData.duration || 600,
  });
  playSound('skill');
}

// Check if player is on lava/water tile and return hazard info
export function checkTileHazard(tileMap, playerX, playerY, playerW, playerH) {
  if (!tileMap || tileMap.length === 0) return null;
  const cx = Math.floor((playerX + playerW / 2) / 32);
  const cy = Math.floor((playerY + playerH - 2) / 32);
  if (cy >= 0 && cy < tileMap.length && cx >= 0 && cx < tileMap[0].length) {
    const tile = tileMap[cy][cx];
    if (tile === 3) return 'lava';
    if (tile === 4) return 'water';
  }
  return null;
}

// Reset inventory (new game)
export function resetInventory() {
  inventory.items = [];
  inventory.equipment = { weapon: null, armor: null, accessory: null };
  inventory.skillPoints = 0;
  inventory.allocatedStats = { hp: 0, stamina: 0, energy: 0, attack: 0, defense: 0, speed: 0 };
  inventory.activeBuffs = [];
}

// Count health potions in inventory
export function countHealthPotions() {
  return inventory.items.filter(i => i.type === 'potion' && i.id === 'health').length;
}

// Get all potion counts for HUD display
export function getPotionCounts() {
  const counts = {};
  inventory.items.forEach(i => {
    if (i.type === 'potion') {
      counts[i.id] = (counts[i.id] || 0) + 1;
    }
  });
  return counts;
}

// Count how many of a specific item id exist in inventory
export function countItems(itemId) {
  return inventory.items.filter(i => i.id === itemId).length;
}

// Return items filtered by category
export function getItemsByCategory(category) {
  return inventory.items.filter(i => i.category === category);
}
