# NUSANTARA: Warisan Terakhir — Migrasi 2.5D Agent Prompt

> **Gunakan dokumen ini sebagai prompt/konteks untuk setiap sesi pengembangan NUSANTARA 2.5D.**
> Salin seluruh isi dokumen ini ke awal percakapan dengan AI agent.

---

## 1. IDENTITAS PROJECT

| Field | Value |
|---|---|
| **Nama Game** | NUSANTARA: Warisan Terakhir |
| **Genre** | Souls-like 2D Side-scroll Platformer |
| **Repo** | `https://github.com/pkok1099/nusa.js` |
| **PAT** | *(Disediakan di awal sesi — JANGAN hardcode di repo)* |
| **Git Author** | `pkok1099 <pkok1099@users.noreply.github.com>` |
| **Branch Asal** | `main` (Canvas 2D, v0.9.0) |
| **Branch Tujuan** | `2.5D` (Phaser 3 + Matter.js, migrasi baru) |
| **Resolusi** | 960×540 (16:9) |
| **Target** | Browser (HTML5) |
| **Bahasa UI** | Bahasa Indonesia |

### Cara Kerja Git
```bash
git clone https://pkok1099:<PAT>@github.com/pkok1099/nusa.js.git   # Ganti <PAT> dengan token dari user
cd nusa.js
git checkout -b 2.5D origin/main   # Fork dari main
# Setelah selesai:
git add . && git commit -m "feat: ..."
git push origin 2.5D
```

### Versi
- VERSION didefinisikan di `src/config.js` → `export const VERSION = '1.0.0-alpha'`
- Versi dimulai dari `1.0.0-alpha` untuk branch 2.5D (karena rewrite total)
- Gunakan semantic versioning: `MAJOR.MINOR.PATCH-prerelease`

---

## 2. STACK TEKNOLOGI

```
🎮 NUSANTARA 2.5D Stack
├── Vite 5+             → Build tool, dev server, HMR
├── Phaser 3.80+        → Game engine (rendering, scene, camera, tilemap, particles, audio, input, lighting)
├── Matter.js            → 2D physics (built-in di Phaser sebagai Phaser.Physics.Matter)
├── Tiled Map Editor     → Visual map design (.tmx/.json export)
├── Light2D Pipeline     → Dynamic 2D lighting (built-in di Phaser WebGL)
└── Vanilla TypeScript   → Game logic (ES modules via Vite)
```

### Kenapa Stack Ini
1. **Phaser 3 + Matter.js**: Integrasi native, tidak perlu bridge manual. `this.matter.add.sprite()`, collision callback built-in, one-way platform via collision categories.
2. **Vite**: HMR untuk game development, build cepat, TypeScript support native.
3. **Tiled**: Desain map visual (drag & drop tile), export JSON, Phaser load langsung.
4. **Light2D**: Dynamic lighting membuat 2D terasa 2.5D — bonfire menerangi dinding, lorong gelap, boss arena red pulse.

### Kenapa BUKAN Three.js + Rapier2D
- Mismatch koordinat (3D vs 2D), Z-fighting pada sprite, bundle size besar (~2.6MB), overkill untuk side-scroll gameplay.
- Three.js cocok untuk full 3D, bukan 2D yang terasa dalam.

### Kenapa BUKAN Planck.js
- Planck.js (Box2D) lebih presisi untuk simulasi fisika kompleks, tapi tidak ada integrasi Phaser — harus tulis bridge manual.
- Matter.js sudah built-in Phaser, hemat ratusan jam development, dan cukup presisi untuk platformer.

---

## 3. ARSITEKTUR PROJECT

### Struktur Folder

```
nusa.js/                          ← Repo yang sama, branch 2.5D
├── index.html                    ← Entry point
├── package.json
├── vite.config.js                ← Vite config untuk Phaser
├── public/
│   ├── assets/
│   │   ├── maps/                 ← Tiled JSON export
│   │   │   ├── candi-borobudur.json
│   │   │   ├── hutan-borneo.json
│   │   │   ├── gunung-bromo.json
│   │   │   ├── laut-bali.json
│   │   │   └── candi-prambanan.json
│   │   ├── tilesets/             ← Tile spritesheet images
│   │   │   ├── stone-tiles.png
│   │   │   ├── forest-tiles.png
│   │   │   ├── volcano-tiles.png
│   │   │   ├── ocean-tiles.png
│   │   │   └── temple-tiles.png
│   │   ├── sprites/              ← Character/enemy/boss sprite sheets
│   │   │   ├── player/
│   │   │   │   ├── player-idle.png
│   │   │   │   ├── player-run.png
│   │   │   │   ├── player-jump.png
│   │   │   │   ├── player-attack.png
│   │   │   │   ├── player-dodge.png
│   │   │   │   └── player-hurt.png
│   │   │   ├── enemies/
│   │   │   └── bosses/
│   │   ├── ui/                   ← HUD elements, menu backgrounds
│   │   ├── effects/              ← Particle textures, light masks
│   │   └── audio/                ← SFX & BGM (if using audio files)
│   └── serve.json                ← Cache-busting headers
├── src/
│   ├── main.js                   ← Phaser game config + boot
│   ├── config.js                 ← All game constants, VERSION
│   ├── scenes/
│   │   ├── BootScene.js          ← Asset preloading
│   │   ├── MenuScene.js          ← Title screen
│   │   ├── GameScene.js          ← Main gameplay (world, combat, map)
│   │   └── UIScene.js            ← HUD overlay (runs parallel to GameScene)
│   ├── entities/
│   │   ├── Player.js             ← Player class (Phaser.Physics.Matter.Sprite)
│   │   ├── Enemy.js              ← Enemy factory + base AI
│   │   ├── Boss.js               ← Boss classes (5 bosses)
│   │   ├── NPC.js                ← NPC class
│   │   └── Item.js               ← Collectible items
│   ├── systems/
│   │   ├── CombatSystem.js       ← Attack combo, parry, dodge, visceral, backstab
│   │   ├── StaminaSystem.js      ← Stamina regen, exhaustion, costs
│   │   ├── SoulsSystem.js        ← Estus, bloodstain, hollowing, bonfire, rally
│   │   ├── PoiseSystem.js        ← Player & boss poise/stagger
│   │   ├── InventorySystem.js    ← Items, equipment, buffs, stat computation
│   │   ├── DialogSystem.js       ← Typewriter dialog, chaining, callbacks
│   │   ├── PuzzleSystem.js       ← 5 puzzle types
│   │   ├── SaveSystem.js         ← localStorage save/load
│   │   ├── ShopSystem.js         ← Buy/sell, tabs
│   │   ├── LightingSystem.js     ← Dynamic light management (bonfire, torch, lava)
│   │   ├── ParallaxSystem.js     ← Multi-layer parallax background
│   │   └── CameraSystem.js       ← Camera follow, shake, deadzone, bounds
│   ├── data/
│   │   ├── weapons.js            ← Weapon definitions
│   │   ├── armors.js             ← Armor definitions
│   │   ├── accessories.js        ← Accessory definitions
│   │   ├── potions.js            ← Potion definitions
│   │   ├── enemies.js            ← Enemy stat tables
│   │   ├── bosses.js             ← Boss stat tables + AI patterns
│   │   └── maps.js               ← Map metadata, spawn tables, dialogs
│   └── utils/
│       ├── math.js               ← Helper math functions
│       └── constants.js          ← Color palette, tile IDs, string literals
```

---

## 4. GAME DESIGN — SEMUA FITUR YANG HARUS DIMIGRASI

### 4.1 Peta Dunia (5 Map Interkoneksi)

| Map ID | Nama | Subtitle | Ukuran | Boss | Boss HP | Musuh | Puzzle |
|---|---|---|---|---|---|---|---|
| 0 | Candi Borobudur | Bangkit dari Debu Waktu | 80×20 | Penjaga Batu | 350 | batu_kecil, patung | Kawi Decipher |
| 1 | Hutan Borneo | Rimba Kehilangan | 90×22 | Raja Hutan | 500 | harimau, ular | Batik Pattern |
| 2 | Gunung Bromo | Neraka Api | 100×24 | Naga Api | 700 | iblis_kecil, golem_api | Gamelan Sequence |
| 3 | Laut Bali | Kedalaman Tanpa Dasar | 110×26 | Raksasa Laut | 900 | ikan_pedang, ubur_ubur | Water Channels |
| 4 | Candi Prambanan | Akhir Segala Awal | 120×28 | Raksasa Terakhir | 1200 | prajurit_jahat, raksasa_kecil | Dewata Riddle |

Setiap map punya 5 bagian: Entrance → Interior → Puzzle Door → Passage → Boss Arena.
Map terakhir (4) tidak punya exit door.
Per map: 2-3 bonfire checkpoint.

### 4.2 Tile Types

| ID | Nama | Solid | Keterangan |
|---|---|---|---|
| 0 | Air | ❌ | Kosong |
| 1 | Batu/Tanah | ✅ | Dinding & lantai, warna beda per map |
| 2 | Platform Satu Arah | ✅ (top only) | Bisa drop-through (↓+Lompat) |
| 3 | Lava | ✅ | Damage 2/frame saat kontak |
| 4 | Air | ❌ | Swim mode, gravity reduced |
| 5 | Batang Pohon | ✅ | Solid dekorasi |
| 6 | Platform Sulur | ✅ (top only) | Platform satu arah, visual sulur |
| 7 | Dinding | ✅ | Dinding solid |
| 8 | Dekorasi | ❌ | Visual only |
| 9 | Bonfire/Checkpoint | ❌ | Tekan E untuk aktifkan + heal + travel |
| 10 | Pintu Puzzle | ❌ | Tekan E untuk mulai puzzle |
| 11 | Pintu Exit | ❌ | Terbuka setelah boss dikalahkan, E untuk transit |
| 12 | Altar Boss | ❌ | E untuk summon boss |

### 4.3 Sistem Kombat

#### Serangan Ringan (Space) — 3-Hit Combo
| Hit | Damage | Durasi (frame) | Stamina |
|---|---|---|---|
| 1 | 15 + level×2 + ATK stat | 12 | 10 |
| 2 | 18 + level×2 + ATK stat | 14 | 10 |
| 3 | 25 + level×3 + ATK stat | 18 | 15 |

- Combo window: 15 frame antar hit
- Movement diperbolehkan saat combo window
- Attack range: 50px

#### Serangan Berat (F)
- Damage: 40 + level×3 + ATK stat
- Windup: 20 frame
- Duration: 30 frame
- Stamina: 25
- Two-handing: +30% damage, +15% stamina

#### Parry (R)
- Total duration: 12 frame
- Active window: 6 frame pertama
- Stamina cost: 15
- Success: refund 10 stamina, enemy stagger, buka visceral window
- Parry active window: 8 frame (extended)
- Parry recovery: 10 frame
- Boss parry: mengurangi posture, bukan stagger langsung

#### Visceral Attack (Space setelah parry sukses)
- Window: 30 frame
- Damage: 4× base attack
- Range: 60px
- Animation: 20 frame lunge
- Trigger rally recovery

#### Dodge (Shift)
- Speed: 8
- Duration: 12 frame
- I-frames: frame 2-15 (15 total)
- Stamina: 25
- Membatalkan attack/parry

#### Backstab
- Damage: 3× base
- Kondisi: posisi di belakang musuh (angle check)

#### Two-Handing (H toggle)
- +30% damage semua serangan
- +15% stamina cost
- Tidak bisa pakai estus saat aktif

#### Weapon Art (G)
- Stamina: 30, Energy: 20
- Cooldown: 180 frame
- 6 jenis unik per senjata

| Senjata | Nama Art | Tipe | Damage Mult | Range | Durasi |
|---|---|---|---|---|---|
| Keris | Tusukan Maut | thrust | 2.5× | 70 | 18 |
| Pedang | Putaran Baja | spin | 2.0× | 90 | 22 |
| Tombak | Sapuan Naga | sweep | 2.2× | 100 | 20 |
| Keris Emas | Sinar Pusaka | beam | 3.0× | 200 | 25 |
| Panah Api | Hujan Api | rain | 1.8× | 150 | 30 |
| Trisula | Trisula Dewa | divine | 3.5× | 120 | 28 |

#### Bow Attack (Panah Api + Space)
- Ranged projectile, speed 8, range 400
- Damage: 15 + level×2
- Energy cost: 15

#### Skill (Q)
- AOE 120px range
- Damage: 40 + level×5
- Cooldown: 180 frame
- Energy: 30

### 4.4 Sistem Stamina
- Max: 100 (base)
- Regen: 0.8/frame (normal), 1.2/frame (fast, saat non-combat)
- Regen delay: 30 frame setelah aksi terakhir
- Combat timer: 300 frame (5 detik sejak aksi terakhir)
- Exhaustion: 20 frame lockout saat stamina = 0
- Costs: dodge=25, light=10, heavy=25, parry=15, jump=8

### 4.5 Sistem Estus Flask
- Max: 5 uses (upgrade possible)
- Heal: 50 HP (base)
- Duration: 30 frame
- Ticks: 20 (2.5 HP per tick)
- Refill di bonfire
- Tidak bisa dipakai saat two-handing

### 4.6 Sistem Kematian & Bloodstain
- Saat mati: kehilangan 30% Rupiah
- Bloodstain muncul di lokasi kematian
- Kembali ke bloodstain: recover 50% Rupiah yang hilang
- Respawn di bonfire terakhir
- Death count di-track

### 4.7 Sistem Hollowing
- Setiap kematian: +1 hollowing level (max 10)
- Efek: -5% max HP per level (min 50% HP)
- Disembuhkan saat berinteraksi dengan bonfire
- Visual: desaturation overlay semakin pekat

### 4.8 Sistem Rally
- Window: 300 frame (5 detik) setelah terkena damage
- Recovery: 60% dari damage terakhir jika menyerang musuh dalam window
- Rally HP ditampilkan sebagai bar kuning di HP bar
- Mekanik kunci: reward aggressive play (seperti Bloodborne)

### 4.9 Sistem Poise
- Player: max 50, regen 0.3/frame (non-combat) / 0.05/frame (combat)
- Stagger: 30 frame saat poise ≤ 0
- Boss: max 100, regen 0.3/frame, stagger 60 frame saat posture penuh
- Posture damage: parry=25, visceral=40, heavy attack=20

### 4.10 Bonfire System
- Tekan E di tile 9 untuk aktifkan
- Bonfire belum dinyalakan: gelap, bara redup
- Bonfire dinyalakan: api animasi, glow, heal, refill estus, cure hollowing
- Bonfire travel: fast travel ke bonfire lain yang sudah dinyalakan
- Auto-save saat berinteraksi

### 4.11 Sistem Musuh

| Tipe | HP | Speed | Dmg | Contact | EXP | Rupiah | Aggro | Drop |
|---|---|---|---|---|---|---|---|---|
| batu_kecil | 20 | 1.0 | 10 | 5 | 10 | 10 | 150 | 5% equip |
| patung | 35 | 1.5 | 15 | 8 | 20 | 15 | 120 | 15% equip |
| harimau | 25 | 2.5 | 18 | 10 | 15 | 15 | 250 | 5% equip |
| ular | 18 | 0.8 | 12 | 5 | 12 | 10 | 100 | 5% equip + poison 3s |
| iblis_kecil | 22 | 1.2 | 14 | 5 | 18 | 20 | 200 | 5% equip + ranged |
| golem_api | 60 | 0.6 | 20 | 12 | 25 | 25 | 130 | 15% equip + AOE |
| ikan_pedang | 20 | 3.0 | 16 | 8 | 14 | 12 | 180 | 5% equip + dash |
| ubur_ubur | 15 | 0.3 | 10 | 6 | 10 | 8 | 60 | 5% equip + stun field |
| prajurit_jahat | 40 | 1.8 | 20 | 10 | 22 | 20 | 200 | 15% equip + block |
| raksasa_kecil | 50 | 1.0 | 22 | 12 | 20 | 25 | 220 | 15% equip + throw |

Perilaku umum: patrol zone ±3 tile → telegraph → attack → cooldown → patrol. Stagger saat parry. Aggro radius.

#### Perilaku Spesifik:
- **batu_kecil**: Patrol sederhana + melee telegraph
- **patung**: Slow patrol + telegraph attack (elite)
- **harimau**: Fast chase, pounce (vx×6)
- **ular**: Melee + poison (2 dmg/20 frame selama 3 detik)
- **iblis_kecil**: Jaga jarak, tembak projectile (speed 4)
- **golem_api**: Tanky, ground pound AOE (100px)
- **ikan_pedang**: Fast dash attack (vx×8)
- **ubur_ubur**: Stationary, electric field (50px), stun 30 frame
- **prajurit_jahat**: Sword combo 3-hit, 25% chance block (80% reduction)
- **raksasa_kecil**: Lempar batu (speed 3.5, aimed projectile)

### 4.12 Sistem Boss (5 Boss, 3 Phase)

**Mekanik Umum Boss**:
- 3 phase: HP>66% (P1), HP>33% (P2), HP≤33% (P3)
- Posture system: max 100, regen 0.3/frame, stagger 60 frame saat penuh
- Phase 2 transition: burst visual, recover 10% HP
- Phase scaling: chase speed ×1.25 (P2), ×1.5 (P3); attack threshold ×0.75 (P2), ×0.55 (P3); damage ×1.2 (P2), ×1.5 (P3)
- Telegraph system: visual pulse + timer → attack execution → cooldown → pilih attack baru

#### Boss 0: Penjaga Batu (HP: 350, Speed: 1.5, Size: 48×56)
- P1: armSwipe, groundPound
- P2: + throwRocks (3 projectile), + charge (150px)
- P3: + throwRocks5 (5 projectile), + aoeStomp (150px)

#### Boss 1: Raja Hutan (HP: 500, Speed: 2.0, Size: 52×60)
- P1: pounce (120px), clawCombo (3-hit)
- P2: + summonMinions (2 enemy), + roar (130px stun)
- P3: + groundPound

#### Boss 2: Naga Api (HP: 700, Speed: 2.5, Size: 56×64)
- P1: fireBreath (7-projectile cone), tailSwipe, fireCharge (180px)
- P2: + meteorRain (5 from above)
- P3: meteorRain faster, fireCharge more frequent

#### Boss 3: Raksasa Laut (HP: 900, Speed: 1.8, Size: 60×70)
- P1: tentacleSlam, frostBreath (5 projectile + slow 120 frame), tidalWave (8-projectile fan)
- P2: + whirlpool (pull + damage)
- P3: All attacks more frequent

#### Boss 4: Raksasa Terakhir (HP: 1200, Speed: 2.8, Size: 64×72)
- P1: divineStrike, shieldBash (140px + stun), armSwipe, charge
- P2: + earthquake (180px AOE), + fireBreath, + summonPhase (3 enemy)
- P3: ALL previous boss attacks combined

### 4.13 Sistem Puzzle (5 Tipe)

| Map | Tipe | Deskripsi | Batas Gagal |
|---|---|---|---|
| 0 | kawi_decipher | Deret angka (aritmatika, fibonacci, geometri). 3 ronde. | 3 salah |
| 1 | batik_pattern | Pattern completion grid 4×4. Pilih dari 4 opsi. 2 pattern. | 3 salah |
| 2 | gamelan_sequence | Rhythm memory. Simbol muncul berurutan, ulangi. 3 ronde makin panjang. | Salah tombol = gagal |
| 3 | water_channels | Pipe routing grid 4×4. Rotasi pipa, BFS validasi dari (0,0) ke (3,3). 7 tipe pipa. | 5 salah cek |
| 4 | dewata_riddle | Tebak-tebakan pilihan ganda. 3 teka-teki, opsi hint. | 3 salah |

Reward per puzzle: EXP (50/75/100/125/150) + item spesifik per map.

### 4.14 Sistem Inventori
- 30 slot
- 3 equipment slot: weapon, armor, accessory
- Max 3 active buffs
- Skill points per level-up: 2
- Stats: hp(+15), stamina(+8), energy(+5), attack(+3), defense(+3), speed(+0.15)

#### Senjata
| ID | Nama | ATK | Speed | Price |
|---|---|---|---|---|
| keris | Keris | 5 | 0 | 0 |
| pedang | Pedang Besi | 12 | -0.2 | 150 |
| tombak | Tombak Naga | 18 | -0.5 | 350 |
| keris_emas | Keris Emas | 25 | +0.3 | 600 |
| panah_api | Panah Api | 20 | +0.5 | 500 |
| trisula | Trisula Dewa | 35 | 0 | 1000 |

#### Armor
| ID | Nama | DEF | Price |
|---|---|---|---|
| kain | Kain Biasa | 0 | 0 |
| kulit | Baju Kulit | 5 | 120 |
| besi | Besi Tempa | 12 | 300 |
| perak | Baju Perak | 18 | 550 |
| emas | Baju Emas | 25 | 900 |
| naga | Baju Naga | 35 | 1500 |

#### Aksesoris
| ID | Nama | Efek | Nilai | Price |
|---|---|---|---|---|
| cincin_besi | Cincin Besi | hp | +20 | 100 |
| kalung_batu | Kalung Batu | stamina | +15 | 100 |
| gelang_emas | Gelang Emas | energy | +10 | 150 |
| cincin_naga | Cincin Naga | attack | +8 | 400 |
| kalung_dewa | Kalung Dewa | defense | +10 | 400 |
| gelang_angin | Gelang Angin | speed | +0.5 | 350 |

#### Ramuan
| ID | Nama | Tipe | Nilai | Durasi | Price |
|---|---|---|---|---|---|
| health | Ramuan Kesehatan | heal | 40 | — | 30 |
| stamina | Ramuan Stamina | stamina | 50 | — | 25 |
| strength | Ramuan Kekuatan | buff(ATK) | +10 | 600 frame | 80 |
| defense | Ramuan Pertahanan | buff(DEF) | +10 | 600 frame | 80 |
| speed | Ramuan Kecepatan | buff(SPD) | +1 | 480 frame | 60 |

### 4.15 Sistem Toko (Shop)
- 4 tab: Senjata, Armor, Aksesoris, Ramuan
- Beli dengan Rupiah
- Jual dengan harga 50%
- Akses via NPC pedagang (tekan E)

### 4.16 Sistem Save
- Storage: localStorage, key `nusantara_save`
- Auto-save: saat bonfire, saat kematian, saat kembali ke menu
- Data tersimpan: player stats, inventory, progress map, bonfire aktif, bloodstain, death count
- Backward compatibility untuk field lama

### 4.17 Sistem Dialog
- Typewriter effect (1 karakter per 2 frame)
- E/Space untuk advance
- Chaining: dialog berantai dengan callback
- Tipe: normal, bossDefeat, unlock (dengan warna berbeda)
- Speaker name + lines

### 4.18 Game States (State Machine)

| State | Deskripsi |
|---|---|
| `menu` | Layar judul |
| `loading` | Loading screen |
| `bossSummon` | Animasi summon boss |
| `playing` | Gameplay utama |
| `paused` | Menu jeda (Lanjutkan/Respawn/Kontrol/Menu Utama) |
| `dialog` | Dialog typewriter |
| `puzzle` | Mini-game puzzle |
| `bossIntro` | Intro boss (nama + judul) |
| `gameOver` | Layar kematian (Bangkit Kembali/Menu Utama) |
| `victory` | Layar kemenangan |
| `inventory` | Overlay inventori |
| `shop` | Overlay toko |
| `levelUp` | Alokasi stat |
| `bonfireTravel` | Fast travel dari bonfire |

### 4.19 Audio
Semua suara menggunakan Web Audio API oscillator (no audio files). 17 tipe suara:
hit, attack, heavyAttack, parry, parrySuccess, stagger, jump, dodge, pickup, puzzle, damage, boss, skill, dialog, checkpoint, noStamina, heal

### 4.20 Particle System
- Max 500 particles
- Floating damage text
- Projectile collision detection
- Spawn effects: bonfire ember, combat sparks, healing aura, poison cloud

---

## 5. FITUR 2.5D — PENAMBAHAN BARU

### 5.1 Dynamic Lighting (Light2D Pipeline)
Ini adalah **fitur paling penting** untuk membuat 2D terasa 2.5D.

| Sumber Cahaya | Warna | Radius | Intensitas | Perilaku |
|---|---|---|---|---|
| Bonfire (lit) | Oranye #FF8C00 | 200 | 1.0 | Flickering (sinusoidal), warm glow |
| Obor dinding | Oranye #CC6600 | 150 | 0.7 | Subtle flicker |
| Lava | Merah-oranye #FF4500 | 120 | 0.5 | Pulse per tile |
| Boss altar | Merah #FF0000 | 180 | 0.6 | Pulse saat aktivasi |
| Estus heal | Hijau #44FF44 | 100 | 0.5 | Fade in/out selama heal |
| Player aura | Emas #D4AF37 | 80 | 0.3 | Subtle, makin terang saat rally active |
| Skill effect | Putih #FFFFFF | 150 | 0.8 | Flash saat aktif |
| Parry success | Emas terang #FFE44D | 200 | 1.2 | Bright flash, fade cepat |
| Visceral | Merah emas #FFD700 | 180 | 1.0 | Burst saat visceral hit |

Ambient light per map:
- Candi Borobudur: 0.15 (gelap, mistis)
- Hutan Borneo: 0.25 (rimba, bercahaya redup)
- Gunung Bromo: 0.10 (sangat gelap, api sebagai sumber utama)
- Laut Bali: 0.08 (gelap banget, bioluminescence)
- Candi Prambanan: 0.12 (gelap megah)

### 5.2 Multi-Layer Parallax

| Layer | Scroll Factor | Konten |
|---|---|---|
| Sky / Langit | 0.05 | Bintang, bulan, awan |
| Far BG | 0.1 | Candi/hutan/gunung siluet jauh |
| Mid BG | 0.3 | Pohon/batu siluet menengah |
| Near BG | 0.6 | Dekorasi dekat (daun, kabut) |
| Gameplay | 1.0 | Tile map, player, enemy, boss, items |
| Foreground | 1.2 | Partikel depan, efek cuaca |
| Overlay | Fixed | HUD, UI |

### 5.3 Depth Particles
- **Candi**: Debu batu melayang, kunang-kunang emas
- **Hutan**: Daun jatuh, serbuk sari, kunang-kunang hijau
- **Gunung**: Abu vulkanik, bara api, asap
- **Laut**: Gelembung, plankton bercahaya, kabut laut
- **Kuil**: Debu emas, partikel spiritual, cahaya suci

### 5.4 Atmospheric Effects
- **Vignette**: Gelap di tepi layar (intensitas per map)
- **Fog of War**: Area gelap di luar radius cahaya player (dungeon)
- **Screen-space effects**: Rain (hutan), ash (gunung), bubbles (laut)
- **Post-processing**: Bloom pada sumber cahaya, color grading per map

---

## 6. ROADMAP PENGEMBANGAN

### Fase 1: Foundation (3-4 hari)
**Tujuan**: Game bisa jalan — player bisa gerak, lompat, dan kamera mengikuti.

- [ ] Setup project: `npm init`, install Phaser 3, setup Vite
- [ ] Buat `main.js` dengan Phaser config (960×540, Matter physics, WebGL)
- [ ] Buat `BootScene.js` — load minimal assets
- [ ] Buat `MenuScene.js` — title screen (placeholder)
- [ ] Buat `GameScene.js` — scene utama
- [ ] Buat `Player.js` — Matter sprite dengan movement, jump, gravity
- [ ] Implementasi camera follow + deadzone
- [ ] Load tilemap sederhana dari Tiled JSON
- [ ] Implementasi collision dari Tiled object layers
- [ ] Test: player bisa berjalan, lompat, dan kamera mengikuti di map test

**Commit**: `feat(fase1): project foundation — Phaser 3 + Matter.js + Vite`

### Fase 2: World Building (3-4 hari)
**Tujuan**: Map bisa dimuat, parallax berjalan, bonfire berfungsi.

- [ ] Buat tileset spritesheets untuk 5 map (placeholder dulu, bisa rectangle colored)
- [ ] Desain map pertama (Candi Borobudur) di Tiled
- [ ] Implementasi parallax system (6 layer)
- [ ] Implementasi tile type system (solid, one-way, lava, water, dll)
- [ ] Implementasi bonfire checkpoint + heal + estus refill
- [ ] Implementasi map transition (exit door → loading → next map)
- [ ] Implementasi bonfire travel (fast travel antar bonfire)
- [ ] Buat map2-5 minimal (skeleton, bisa di-detail nanti)

**Commit**: `feat(fase2): world building — maps, parallax, bonfire, transitions`

### Fase 3: Combat & Souls Systems (4-5 hari)
**Tujuan**: Kombat lengkap — semua serangan, stamina, dodge, parry, rally.

- [ ] CombatSystem.js: light combo 3-hit, heavy attack, parry, dodge
- [ ] StaminaSystem.js: regen, delay, exhaustion, costs
- [ ] PoiseSystem.js: player & enemy poise, stagger
- [ ] Implementasi visceral attack (post-parry)
- [ ] Implementasi backstab
- [ ] Implementasi two-handing
- [ ] Implementasi weapon arts (6 tipe)
- [ ] Implementasi rally system
- [ ] SoulsSystem.js: estus, bloodstain, hollowing
- [ ] Implementasi death menu + respawn
- [ ] Implementasi pause menu (Lanjutkan/Respawn/Kontrol/Menu Utama)

**Commit**: `feat(fase3): combat & souls systems — full souls-like mechanics`

### Fase 4: Enemies & Bosses (4-5 hari)
**Tujuan**: Semua musuh dan boss berfungsi dengan AI.

- [ ] Enemy.js: factory + base AI (patrol, aggro, telegraph, attack)
- [ ] Implementasi 10 tipe musuh dengan perilaku unik
- [ ] Boss.js: base boss class + 3-phase system
- [ ] Implementasi 5 boss dengan attack patterns
- [ ] Boss posture + stagger system
- [ ] Boss summon sequence
- [ ] Boss intro (nama + judul)
- [ ] Enemy/boss drop system (equipment, rupiah)

**Commit**: `feat(fase4): enemies & bosses — 10 enemy types + 5 bosses`

### Fase 5: Atmosphere & 2.5D (3-4 hari)
**Tujuan**: Game terasa hidup dengan lighting, particles, dan depth.

- [ ] LightingSystem.js: Light2D pipeline setup
- [ ] Implementasi semua sumber cahaya (bonfire, lava, torch, dll)
- [ ] Ambient light per map
- [ ] Depth particles per map (debu, daun, bara, gelembung, emas)
- [ ] Vignette effect
- [ ] Hit-stop + screen shake (migrasi dari Canvas 2D)
- [ ] Particle effects untuk combat (spark, blood, heal)
- [ ] Atmospheric effects (rain, ash, bubbles)
- [ ] Post-processing: bloom, color grading

**Commit**: `feat(fase5): atmosphere & 2.5D — lighting, particles, depth`

### Fase 6: UI, Systems & Polish (4-5 hari)
**Tujuan**: Semua sistem UI dan game support berfungsi.

- [ ] UIScene.js: HUD (HP, stamina, energy, estus, level, rupiah, cooldowns)
- [ ] Boss HP + posture bar
- [ ] Mini-map
- [ ] Inventory overlay (tabbed: items, equipment, stats)
- [ ] Shop overlay
- [ ] Level-up stat allocation
- [ ] Puzzle system (5 tipe)
- [ ] Dialog system (typewriter + chaining)
- [ ] Save/load system
- [ ] Audio system (migrasi oscillator, atau gunakan Phaser audio)
- [ ] Death screen, victory screen, loading screen

**Commit**: `feat(fase6): UI & systems — all menus, puzzles, save, audio`

### Fase 7: Content & Balance (3-5 hari)
**Tujuan**: Semua konten lengkap, balance di-tune.

- [ ] Detail semua 5 map di Tiled (dekorasi, lighting placement, enemy spawn)
- [ ] Buat/procur sprite sheets untuk player, enemy, boss
- [ ] Buat tileset art yang proper (bukan placeholder)
- [ ] Balance tuning: damage, HP, speed, aggro range
- [ ] Playtest setiap map end-to-end
- [ ] Bug fix
- [ ] Performance optimization

**Commit**: `feat(fase7): content & balance — full game content, tuned`

---

## 7. KONSTANTA PENTING (Quick Reference)

```
GAME_W = 960, GAME_H = 540, TILE = 32
GRAVITY = 0.55, MAX_FALL = 12
PLAYER_SPEED = 3.2, JUMP_FORCE = -10.5
DODGE_SPEED = 8, DODGE_DURATION = 12
STAMINA_MAX = 100, ESTUS_MAX = 5
COMBO_1_DUR = 12, COMBO_2_DUR = 14, COMBO_3_DUR = 18
PARRY_WINDOW = 6, PARRY_DURATION = 12
BOSS_MAX_POSTURE = 100
RALLY_WINDOW = 300 (5 detik)
HOLLOWING_MAX = 10
DEATH_RUPIAH_LOSS = 30%, BLOODSTAIN_RECOVERY = 50%
```

---

## 8. PATTERNS & BEST PRACTICES UNTUK DEVELOPMENT

### Phaser 3 + Matter.js Patterns

```javascript
// Player sebagai Matter sprite
class Player extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y) {
        super(scene.matter.world, x, y, 'player', 0);
        scene.add.existing(this);
        // Set collision category
        this.setCollisionCategory(CAT_PLAYER);
        this.setCollidesWith([CAT_WALLS, CAT_ENEMIES, CAT_ITEMS]);
    }
}

// One-way platform via collision
scene.matter.world.on('collisionstart', (event) => {
    event.pairs.forEach(pair => {
        // Check if player is above platform
        if (pair.bodyA.label === 'oneway' || pair.bodyB.label === 'oneway') {
            // Disable collision if player is below
        }
    });
});

// Parallax layer
this.bgFar = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'bg-far')
    .setScrollFactor(0.05)
    .setDepth(-10);

// Dynamic light
this.lights.addLight(x, y, radius, color, intensity);
this.lights.enable();
this.lights.setAmbientColor(0x111111);
```

### Scene Communication
```javascript
// GameScene ↔ UIScene
const uiScene = this.scene.get('UIScene');
uiScene.updateHUD(playerData);

// Parallel scenes
this.scene.launch('UIScene'); // Runs alongside GameScene
```

### Tiled Map Loading
```javascript
// Load Tiled JSON + tileset
this.load.tilemapTiledJSON('map1', 'assets/maps/candi-borobudur.json');
this.load.image('stone-tiles', 'assets/tilesets/stone-tiles.png');

// Create map
const map = this.make.tilemap({ key: 'map1' });
const tileset = map.addTilesetImage('stone-tiles');
const layer = map.createLayer('Ground', tileset, 0, 0);
layer.setCollisionByProperty({ solid: true });
this.matter.world.convertTilemapLayer(layer);
```

---

## 9. PANDUAN UNTUK AI AGENT

### Saat memulai sesi baru:
1. Clone repo: `git clone https://pkok1099:...@github.com/pkok1099/nusa.js.git`
2. Checkout branch 2.5D: `git checkout 2.5D`
3. Cek `/home/z/my-project/worklog.md` untuk catatan sesi sebelumnya
4. Identifikasi fase yang sedang dikerjakan dari roadmap di atas
5. Lanjutkan dari checkpoint terakhir

### Saat menyelesaikan sesi:
1. Update `/home/z/my-project/worklog.md` dengan progress
2. Git commit + push ke branch 2.5D
3. Catat apa yang sudah selesai dan apa yang perlu dilanjutkan

### Format commit message:
```
feat(faseN): deskripsi singkat
fix(faseN): deskripsi bug fix
refactor(faseN): deskripsi refactor
docs: deskripsi dokumentasi
```

### Jangan lupa:
- Bahasa UI selalu Bahasa Indonesia
- VERSION di `src/config.js`
- Semua file disimpan di dalam repo nusa.js
- Git author: `pkok1099 <pkok1099@users.noreply.github.com>`
- Test setiap fase sebelum lanjut ke fase berikutnya
- Prioritaskan fungsi over form — placeholder graphics dulu, art nanti

---

## 10. REFERENSI

| Resource | URL |
|---|---|
| Phaser 3 Docs | https://photonstorm.github.io/phaser3-docs/ |
| Phaser 3 Examples | https://phaser.io/examples |
| Matter.js Docs | https://brm.io/matter-js/docs/ |
| Phaser Matter Physics | https://phaser.io/phaser3/examples/v3/category/physics/matterjs |
| Tiled Map Editor | https://www.mapeditor.org/ |
| Phaser Light2D | https://phaser.io/phaser3/examples/v3/category/camera/lights |
| Phaser Parallax | https://phaser.io/examples/v3/view/camera/parallax-layer |

---

*Dokumen ini dibuat sebagai master prompt untuk pengembangan NUSANTARA 2.5D.*
*Update dokumen ini setiap ada perubahan arsitektur atau keputusan design baru.*
