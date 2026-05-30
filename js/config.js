// ============================================================
// config.js — Game constants and color palette
// ============================================================

// Core game dimensions
export const GAME_W = 960;
export const GAME_H = 540;
export const TILE = 32;
export const LEVEL_H = 20;

// Physics
export const GRAVITY = 0.55;
export const MAX_FALL = 12;

// Player movement
export const PLAYER_SPEED = 3.2;
export const JUMP_FORCE = -10.5;
export const DODGE_SPEED = 8;
export const DODGE_DURATION = 12;

// Light attack combo system
export const ATTACK_DURATION = 12;
export const ATTACK_RANGE = 50;
export const COMBO_WINDOW = 15;
export const COMBO_1_DAMAGE = 15;
export const COMBO_2_DAMAGE = 18;
export const COMBO_3_DAMAGE = 25;
export const COMBO_1_DURATION = 12;
export const COMBO_2_DURATION = 14;
export const COMBO_3_DURATION = 18;

// Heavy attack
export const HEAVY_ATTACK_DAMAGE = 40;
export const HEAVY_ATTACK_WINDUP = 20;
export const HEAVY_ATTACK_DURATION = 30;
export const HEAVY_ATTACK_ENERGY = 25;

// Parry
export const PARRY_WINDOW = 6;
export const PARRY_DURATION = 12;
export const PARRY_ENERGY = 15;
export const STAGGER_DURATION = 30;
export const STAGGER_DAMAGE_MULT = 1.5;

// Boss stagger / posture
export const BOSS_STAGGER_DURATION = 60;
export const BOSS_MAX_POSTURE = 100;
export const BOSS_POSTURE_RECOVERY = 0.3;

// Jump improvements
export const COYOTE_TIME = 6;
export const JUMP_BUFFER_TIME = 8;

// Stamina system
export const MAX_STAMINA = 100;
export const STAMINA_REGEN = 0.8;
export const STAMINA_DODGE_COST = 25;
export const STAMINA_LIGHT_COST = 10;
export const STAMINA_HEAVY_COST = 25;
export const STAMINA_PARRY_COST = 15;

// Healing (estus-style)
export const HEAL_ANIMATION_DURATION = 30;
export const HEAL_TICKS = 20;
export const HEAL_AMOUNT = 40;

// Hit-stop / juice
export const HIT_STOP_FRAMES = 3;

// Boss telegraph
export const BOSS_RECOVERY_FRAMES = 40;

// Skill & misc
export const SKILL_DAMAGE = 40;
export const INV_FRAMES = 30;

// Derived
export const GROUND_Y = (LEVEL_H - 3) * TILE;

// ---- COLORS ----
export const C = {
  bg: '#0A0A0A', gold: '#D4AF37', goldLight: '#F5E6A3', goldDark: '#8B6914',
  text: '#E8D5A3', textDim: '#E8D5A366', red: '#FF4444', redDark: '#8B0000',
  green: '#44FF44', blue: '#4488FF', cyan: '#00CED1', orange: '#FF6600',
  stone: '#8B8682', stoneLight: '#A09A94', stoneDark: '#6B6662',
  grass: '#2D5A1E', grassLight: '#3D7A2E', water: '#1E5A8E',
  lava: '#CC3300', wood: '#6B4226', sky: '#1A0A2E',
  stamina: '#CCAA00', staminaDark: '#554400',
  parryGold: '#FFD700',
};
