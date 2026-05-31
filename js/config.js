// ============================================================
// config.js — Game constants and color palette
// ============================================================

// ⚠️ SINGLE SOURCE OF TRUTH for version — update ONLY here
// package.json version should match this value
export const VERSION = '0.8.2';

// Core game dimensions
export const GAME_W = 960;
export const GAME_H = 540;
export const TILE = 32;
export const LEVEL_H = 20;

// New tile types for map system v0.8.0
export const TILE_PUZZLE_DOOR = 10;  // Door to puzzle room
export const TILE_EXIT_DOOR = 11;    // Exit door to next map
export const TILE_BOSS_ALTAR = 12;   // Boss summon altar

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

// ---- EQUIPMENT TYPES ----
export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory'];

// Weapon definitions
export const WEAPONS = {
  keris:      { name: 'Keris', attack: 5, speed: 0, desc: 'Keris sederhana', price: 0 },
  pedang:     { name: 'Pedang Besi', attack: 12, speed: -0.2, desc: 'Pedang besi yang tajam', price: 150 },
  tombak:     { name: 'Tombak Naga', attack: 18, speed: -0.5, desc: 'Tombak bertuliskan naga kuno', price: 350 },
  keris_emas: { name: 'Keris Emas', attack: 25, speed: 0.3, desc: 'Keris pusaka kerajaan', price: 600 },
  panah_api:  { name: 'Panah Api', attack: 20, speed: 0.5, desc: 'Panah berbakar bara api', price: 500 },
  trisula:    { name: 'Trisula Dewa', attack: 35, speed: 0, desc: 'Senjata dewa pencipta', price: 1000 },
};

// Armor definitions
export const ARMORS = {
  kain:       { name: 'Kain Biasa', defense: 0, desc: 'Kain penutup tubuh', price: 0 },
  kulit:      { name: 'Baju Kulit', defense: 5, desc: 'Baju dari kulit binatang', price: 120 },
  besi:       { name: 'Besi Tempa', defense: 12, desc: 'Baju besi pandai besi', price: 300 },
  perak:      { name: 'Baju Perak', defense: 18, desc: 'Baju perak bangsawan', price: 550 },
  emas:       { name: 'Baju Emas', defense: 25, desc: 'Baju emas kerajaan', price: 900 },
  naga:       { name: 'Baju Naga', defense: 35, desc: 'Baja legendaris sisik naga', price: 1500 },
};

// Accessory definitions
export const ACCESSORIES = {
  cincin_besi:    { name: 'Cincin Besi', effect: 'hp', value: 20, desc: '+20 HP Maks', price: 100 },
  kalung_batu:    { name: 'Kalung Batu', effect: 'stamina', value: 15, desc: '+15 Stamina Maks', price: 100 },
  gelang_emas:    { name: 'Gelang Emas', effect: 'energy', value: 10, desc: '+10 Energi Maks', price: 150 },
  cincin_naga:    { name: 'Cincin Naga', effect: 'attack', value: 8, desc: '+8 Serangan', price: 400 },
  kalung_dewa:    { name: 'Kalung Dewa', effect: 'defense', value: 10, desc: '+10 Pertahanan', price: 400 },
  gelang_angin:   { name: 'Gelang Angin', effect: 'speed', value: 0.5, desc: '+0.5 Kecepatan', price: 350 },
};

// Potion types
export const POTIONS = {
  health:      { name: 'Ramuan Kesehatan', type: 'health', value: 40, desc: 'Pulihkan 40 HP', price: 30 },
  stamina:     { name: 'Ramuan Stamina', type: 'stamina', value: 50, desc: 'Pulihkan 50 Stamina', price: 25 },
  strength:    { name: 'Ramuan Kekuatan', type: 'buff', buffType: 'attack', value: 10, duration: 600, desc: '+10 Serangan (10s)', price: 80 },
  defense:     { name: 'Ramuan Pertahanan', type: 'buff', buffType: 'defense', value: 10, duration: 600, desc: '+10 Pertahanan (10s)', price: 80 },
  speed:       { name: 'Ramuan Kecepatan', type: 'buff', buffType: 'speed', value: 1, duration: 480, desc: '+1 Kecepatan (8s)', price: 60 },
};

// Stage definitions (5 stages)
export const STAGES = [
  {
    id: 0, name: 'Candi Borobudur', subtitle: 'Bangkit dari Debu Waktu',
    artifact: 'Artefak Tanah', bg1: '#0D0A1A', bg2: '#1A0A2E',
    bossName: 'Penjaga Batu', bossHp: 350, bossSpeed: 1.5, bossW: 48, bossH: 56,
    unlocked: true, width: 80, height: 20,
    enemyTypes: ['batu_kecil', 'patung'],
    introDialog: ['Arjuna... kamu telah memilih untuk memulai perjalanan ini.', 'Candi Borobudur adalah tempat pertamamu.', 'Artefak Tanah tersembunyi di dalam candi ini, dijaga oleh Penjaga Batu.', 'Gunakan kerisku untuk melawan, dan cari jalan melalui puzzle kuno.', 'Semoga leluhur membimbingmu, Anak Jawa.'],
  },
  {
    id: 1, name: 'Hutan Borneo', subtitle: 'Rimba Kehilangan',
    artifact: 'Artefak Kayu', bg1: '#0A1A0D', bg2: '#0A2E15',
    bossName: 'Raja Hutan', bossHp: 500, bossSpeed: 2.0, bossW: 52, bossH: 60,
    unlocked: false, width: 90, height: 22,
    enemyTypes: ['harimau', 'ular'],
    introDialog: ['Hutan Borneo menyimpan rahasia kuno...', 'Raja Hutan menjaga Artefak Kayu.', 'Waspadai serangan cepat dari bayangan pohon.', 'Artefak Kayu adalah kunci kekuatan alam.'],
  },
  {
    id: 2, name: 'Gunung Bromo', subtitle: 'Neraka Api',
    artifact: 'Artefak Api', bg1: '#1A0A0A', bg2: '#2E150A',
    bossName: 'Naga Api', bossHp: 700, bossSpeed: 2.5, bossW: 56, bossH: 64,
    unlocked: false, width: 100, height: 24,
    enemyTypes: ['iblis_kecil', 'golem_api'],
    introDialog: ['Gunung Bromo... gerbang dunia bawah.', 'Naga Api bangkit dari kawah.', 'Api membakar segalanya — kecuali yang paling kuat.', 'Artefak Api tersembunyi di puncak kawah.'],
  },
  {
    id: 3, name: 'Laut Bali', subtitle: 'Kedalaman Tanpa Dasar',
    artifact: 'Artefak Air', bg1: '#0A0A1A', bg2: '#0A152E',
    bossName: 'Raksasa Laut', bossHp: 900, bossSpeed: 1.8, bossW: 60, bossH: 70,
    unlocked: false, width: 110, height: 26,
    enemyTypes: ['ikan_pedang', 'ubur_ubur'],
    introDialog: ['Laut Bali menyimpan misteri purba.', 'Raksasa Laut terbangun dari tidurnya.', 'Jangan biarkan ombak menelanmu.', 'Artefak Air ada di dasar lautan.'],
  },
  {
    id: 4, name: 'Candi Prambanan', subtitle: 'Akhir Segala Awal',
    artifact: 'Artefak Langit', bg1: '#1A1A0A', bg2: '#2E2E0A',
    bossName: 'Raksasa Terakhir', bossHp: 1200, bossSpeed: 2.8, bossW: 64, bossH: 72,
    unlocked: false, width: 120, height: 28,
    enemyTypes: ['prajurit_jahat', 'raksasa_kecil'],
    introDialog: ['Candi Prambanan... tempat terakhir.', 'Raksasa Terakhir menunggu di puncak.', 'Semua artefak harus dikumpulkan.', 'Ini akhir dari segala awal, Arjuna.'],
  },
];

// Skill point system
export const STAT_NAMES = ['hp', 'stamina', 'energy', 'attack', 'defense', 'speed'];
export const STAT_LABELS = { hp: 'HP', stamina: 'Stamina', energy: 'Energi', attack: 'Serangan', defense: 'Pertahanan', speed: 'Kecepatan' };
export const STAT_PER_POINT = { hp: 15, stamina: 8, energy: 5, attack: 3, defense: 3, speed: 0.15 };
export const SKILL_POINTS_PER_LEVEL = 2;

// Bow / Arrow system (Panah Api weapon)
export const ARROW_SPEED = 8;
export const ARROW_DAMAGE = 15;
export const ARROW_RANGE = 400;
export const ARROW_COST = 15; // energy

// Water swimming (Stage 3: Laut Bali)
export const WATER_GRAVITY = 0.15;
export const SWIM_FORCE = -3.5;
export const WATER_SPEED_MULT = 0.6;

// Buff system
export const MAX_ACTIVE_BUFFS = 3;

// Map transition system v0.8.0
export const MAP_LOAD_DURATION = 90;      // Frames for loading screen (1.5s)
export const BOSS_SUMMON_DURATION = 120;  // Frames for boss summon animation (2s)
export const DOOR_INTERACT_RANGE = 60;    // Pixel distance to interact with doors
export const ALTAR_INTERACT_RANGE = 60;   // Pixel distance to interact with boss altar

// ---- SOULS-LIKE SYSTEM v0.7.0 ----
// Estus Flask (healing item that refills at checkpoints)
export const ESTUS_MAX = 5;           // Max estus charges
export const ESTUS_HEAL_AMOUNT = 50;  // HP healed per estus use

// Bonfire/Checkpoint healing
export const BONFIRE_HEAL_DURATION = 40; // frames for bonfire heal animation

// Death penalty (souls-like: lose currency on death)
export const DEATH_RUPIAH_LOSS_PCT = 0.30; // Lose 30% of Rupiah
export const DEATH_RUPIAH_RECOVERY = 0.50;  // Can recover 50% of lost Rupiah if reaching bloodstain

// Stamina tuning (souls-like: stamina is crucial)
export const STAMINA_REGEN_DELAY = 30;      // Frames before stamina starts regenerating
export const STAMINA_REGEN_RATE = 0.6;      // Stamina per frame while regenerating
export const STAMINA_REGEN_RATE_FAST = 1.2; // Stamina per frame when not in combat
export const STAMINA_JUMP_COST = 8;         // Stamina cost for jumping

// Dodge i-frames (souls-like: generous i-frames during dodge roll)
export const DODGE_I_FRAMES = 15;    // Total invincibility frames during dodge
export const DODGE_I_FRAME_START = 2; // Frame of dodge when i-frames begin

// Parry timing (souls-like: strict but rewarding parry window)
export const PARRY_ACTIVE_WINDOW = 8;  // Active parry frames (generous)
export const PARRY_RECOVERY = 10;       // Recovery frames after parry (vulnerable)
export const PARRY_STAMINA_REFUND = 10; // Stamina refunded on successful parry

// Backstab bonus (souls-like: attack from behind deals massive damage)
export const BACKSTAB_ANGLE = 0.5;    // Must be behind enemy (facing away from player)
export const BACKSTAB_DAMAGE_MULT = 3.0; // 3x damage on backstab

// Posture break bonus damage
export const POSTURE_BREAK_DAMAGE_MULT = 2.0; // Damage multiplier on staggered enemies

// Combat feel
export const HIT_STOP_HEAVY = 8;    // Hit stop frames for heavy attacks
export const HIT_STOP_PARRY = 12;   // Hit stop frames for parry
export const SCREEN_SHAKE_LIGHT = 2;
export const SCREEN_SHAKE_HEAVY = 5;
export const SCREEN_SHAKE_CRIT = 8;

// ---- SOULS-LIKE SYSTEM v0.7.1 ----
// Rally system (Bloodborne-style: recover recently lost HP by attacking)
export const RALLY_DURATION = 300;     // 5 seconds to rally back HP
export const RALLY_RECOVERY_PCT = 0.6; // Recover 60% of recent damage dealt back as HP

// Player poise (like enemy stagger — player can be staggered too)
export const PLAYER_MAX_POISE = 50;
export const PLAYER_POISE_REGEN = 0.3;  // Poise regen per frame when not in combat
export const PLAYER_POISE_REGEN_COMBAT = 0.05; // Slower regen in combat
export const PLAYER_STAGGER_DURATION = 30; // Frames player is staggered when poise breaks

// Stamina exhaustion penalty
export const STAMINA_EXHAUST_DURATION = 20; // Can't act for 20 frames when stamina hits 0

// Weapon Arts (unique skill per weapon, costs stamina + energy)
export const WEAPON_ART_STAMINA_COST = 30;
export const WEAPON_ART_ENERGY_COST = 20;
export const WEAPON_ART_COOLDOWN = 180; // 3 second cooldown between weapon arts

// Hollowing system (Souls-like: consecutive deaths reduce max HP)
export const HOLLOWING_HP_PENALTY = 0.05; // 5% max HP reduction per hollowing level
export const HOLLOWING_MAX_LEVEL = 10;     // Max hollowing levels
export const HOLLOWING_MIN_HP_PCT = 0.50;  // Minimum 50% of base HP

// Visceral Attack (Souls-like: critical hit after parry, like Bloodborne)
export const VISCERAL_WINDOW = 30;       // Frames after parry to input visceral
export const VISCERAL_DAMAGE_MULT = 4.0; // 4x damage on visceral attack
export const VISCERAL_RANGE = 60;        // Range of visceral attack
export const VISCERAL_DURATION = 20;     // Animation duration

// Two-handing (Souls-like: hold weapon with both hands for damage bonus)
export const TWO_HAND_DAMAGE_MULT = 1.30;  // +30% damage when two-handing
export const TWO_HAND_STAMINA_PENALTY = 0.15; // +15% stamina cost when two-handing

// Weapon Art definitions: { name, type, damage_mult, range, duration, desc }
export const WEAPON_ARTS = {
  keris:      { name: 'Tusukan Maut', type: 'thrust', damageMult: 2.5, range: 70, duration: 18, desc: 'Tusukan cepat dengan keris' },
  pedang:     { name: 'Putaran Baja', type: 'spin', damageMult: 2.0, range: 90, duration: 22, desc: 'Putaran penuh dengan pedang' },
  tombak:     { name: 'Sapuan Naga', type: 'sweep', damageMult: 2.2, range: 100, duration: 20, desc: 'Sapuan lebar dengan tombak' },
  keris_emas: { name: 'Sinar Pusaka', type: 'beam', damageMult: 3.0, range: 200, duration: 25, desc: 'Sinar emas dari keris pusaka' },
  panah_api:  { name: 'Hujan Api', type: 'rain', damageMult: 1.8, range: 150, duration: 30, desc: 'Hujan panah api dari langit' },
  trisula:    { name: 'Trisula Dewa', type: 'divine', damageMult: 3.5, range: 120, duration: 28, desc: 'Serangan ilahi trisula dewa' },
};
