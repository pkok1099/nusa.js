// ============================================================
// shop.js — Shop system with buy/sell functionality
// ============================================================

import { WEAPONS, ARMORS, ACCESSORIES, POTIONS } from './config.js';
import { addItem, removeItem, inventory } from './inventory.js';
import { playSound } from './audio.js';

// Shop items organized by category
export const shopItems = {
  weapons: Object.entries(WEAPONS).filter(([k, v]) => v.price > 0).map(([id, data]) => ({ id, category: 'weapon', ...data })),
  armors: Object.entries(ARMORS).filter(([k, v]) => v.price > 0).map(([id, data]) => ({ id, category: 'armor', ...data })),
  accessories: Object.entries(ACCESSORIES).map(([id, data]) => ({ id, category: 'accessory', ...data })),
  potions: Object.entries(POTIONS).map(([id, data]) => ({ id, category: 'potion', type: 'potion', ...data })),
};

// Shop state
export let shopState = {
  open: false,
  tab: 0,            // 0=weapons, 1=armors, 2=accessories, 3=potions
  scroll: 0,
  message: '',
  messageTimer: 0,
};

export function resetShopState() {
  shopState.open = false;
  shopState.tab = 0;
  shopState.scroll = 0;
  shopState.message = '';
  shopState.messageTimer = 0;
}

const TAB_NAMES = ['Senjata', 'Baju Besi', 'Aksesoris', 'Ramuan'];
export { TAB_NAMES };

// Buy an item from the shop
// playerRupiah is passed in to avoid circular dependency
export function buyItem(category, itemId, playerRupiah) {
  let itemData = null;
  let shopCategory = null;

  if (category === 'weapon' && WEAPONS[itemId]) {
    itemData = WEAPONS[itemId];
    shopCategory = 'weapon';
  } else if (category === 'armor' && ARMORS[itemId]) {
    itemData = ARMORS[itemId];
    shopCategory = 'armor';
  } else if (category === 'accessory' && ACCESSORIES[itemId]) {
    itemData = ACCESSORIES[itemId];
    shopCategory = 'accessory';
  } else if (category === 'potion' && POTIONS[itemId]) {
    itemData = POTIONS[itemId];
    shopCategory = 'potion';
  }

  if (!itemData || !shopCategory) {
    shopState.message = 'Item tidak ditemukan!';
    shopState.messageTimer = 90;
    return false;
  }

  const price = itemData.price || 0;
  if (playerRupiah < price) {
    shopState.message = 'Rupiah tidak cukup!';
    shopState.messageTimer = 90;
    playSound('noStamina');
    return false;
  }

  const item = {
    id: itemId,
    type: shopCategory === 'potion' ? 'potion' : 'equipment',
    category: shopCategory,
    name: itemData.name,
    desc: itemData.desc,
    price: itemData.price,
  };

  // Copy relevant fields
  if (itemData.attack !== undefined) item.attack = itemData.attack;
  if (itemData.speed !== undefined) item.speed = itemData.speed;
  if (itemData.defense !== undefined) item.defense = itemData.defense;
  if (itemData.effect !== undefined) item.effect = itemData.effect;
  if (itemData.value !== undefined) item.value = itemData.value;
  if (itemData.buffType !== undefined) item.buffType = itemData.buffType;
  if (itemData.duration !== undefined) item.duration = itemData.duration;

  if (!addItem(item)) {
    shopState.message = 'Inventori penuh!';
    shopState.messageTimer = 90;
    playSound('noStamina');
    return false;
  }

  shopState.message = `Membeli ${itemData.name}! (-${price} Rupiah)`;
  shopState.messageTimer = 90;
  playSound('pickup');
  return true;
}

// Sell an item from inventory
export function sellItem(inventoryIndex) {
  const item = inventory.items[inventoryIndex];
  if (!item) return 0;

  const sellPrice = getSellPrice(item);
  if (sellPrice <= 0) {
    shopState.message = 'Tidak bisa dijual!';
    shopState.messageTimer = 90;
    return 0;
  }

  removeItem(inventoryIndex);
  shopState.message = `Menjual ${item.name}! (+${sellPrice} Rupiah)`;
  shopState.messageTimer = 90;
  playSound('pickup');
  return sellPrice;
}

// Get sell price (50% of buy price)
export function getSellPrice(item) {
  if (!item || !item.price) return 0;
  return Math.floor(item.price * 0.5);
}

// Get current tab items
export function getCurrentTabItems() {
  const tabs = ['weapons', 'armors', 'accessories', 'potions'];
  return shopItems[tabs[shopState.tab]] || [];
}
