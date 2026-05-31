# NUSANTARA: Warisan Terakhir — Development Rules

## Project Overview

Game browser-based Souls-like RPG bertema mitologi Nusantara. Dibangun dengan vanilla JavaScript (ES Modules), HTML5 Canvas (960x540), tanpa framework/build tool untuk runtime.

---

## Architecture

### Module System
- **ES Modules** (`import`/`export`) — browser native, tidak menggunakan bundler saat development
- **Build tool** hanya Rollup untuk produksi (`npm run build`)
- Setiap sistem di file terpisah (`js/*.js`) — jangan gabungkan logic yang berbeda di satu file

### File Structure
```
index.html          — Entry point, cache-busting, error handling
js/
  game.js           — Main game loop, state machine, initialization
  draw-game.js      — All rendering functions (menu, HUD, level, entities, etc.)
  player.js         — Player state, movement, combat, damage
  boss.js           — Boss AI, attacks, phases
  enemy.js          — Enemy AI, movement, attacks
  entities.js       — Entity spawning (enemies, items, NPCs, puzzle triggers)
  level.js          — Level generation (tile maps per stage)
  physics.js        — Collision detection, tile physics
  camera.js         — Camera following player
  config.js         — Constants, colors, equipment, stage definitions
  input.js          — Keyboard/mouse input handling
  inventory.js      — Inventory, equipment, buffs, stat allocation
  save.js           — Save/load to localStorage
  shop.js           — Shop system
  puzzle.js         — Puzzle mini-game
  dialog.js         — Dialog system
  particles.js      — Particle effects, floating text
  renderer.js       — Canvas drawing primitives (drawText, drawRect, drawBar, etc.)
  audio.js          — Sound effects
```

### Game State Machine
```
menu → stageSelect → playing ⇄ dialog
                    ↓         ↓
                  shop      puzzle
                    ↓         ↓
                  playing  playing → bossIntro → playing
                                       ↓
                              gameOver → playing (respawn)
                              victory → stageSelect
                              paused → playing/menu
                              inventory → playing
                              levelUp → playing
```

---

## Code Rules

### 1. Git Commits
- **Author**: SELALU `pkok1099 <pkok1099@users.noreply.github.com>`
- **Format**: `vX.Y.Z: Deskripsi singkat` di baris pertama
- **Detail**: Jelaskan APA yang diubah dan MENGAPA di body commit
- **Language**: Commit message dalam Bahasa Inggris, komentar kode boleh campur

### 2. Version Numbering (SemVer)
- **Major (X.0.0)**: Breaking changes, sistem baru besar
- **Minor (0.X.0)**: Fitur baru, perbaikan signifikan
- **Patch (0.0.X)**: Bug fixes, perbaikan kecil
- Update version di 3 tempat: `package.json`, `index.html` (__nusaVersion + src param), `draw-game.js` (menu version text)

### 3. Cache Busting
- Semua JS module di-load dengan `?v=X.Y.Z`
- `window.fetch` interceptor otomatis menambahkan versi ke URL
- Saat update versi, PASTIKAN 3 tempat di-update (lihat poin 2)

### 4. Collision System
- **Solid tiles**: 1 (stone), 3 (lava), 5 (tree trunk), 7 (wall) — player TIDAK bisa lewat
- **One-way platforms**: 2, 6 (vine) — player bisa drop-through
- **Non-solid**: 0 (air), 4 (water), 8 (decoration), 9 (checkpoint) — player bisa lewat
- **CRITICAL**: Jangan tempatkan solid tiles di `y = H-4` (satu baris di atas tanah) karena hitbox player (36px) melebihi 1 tile (32px) dan akan menyentuh baris tersebut, menciptakan tembok yang tidak bisa dilewati
- Lava dan obstacle di ground level (`y = H-3`) WAJIB lebar maksimal 2-3 tile agar bisa dilompati

### 5. forEach vs for-loop
- **JANGAN gunakan `forEach`** jika perlu `return`, `break`, atau `continue` dari outer function
- `return` di dalam `forEach` callback hanya exit callback, BUKAN outer function
- Gunakan `for` loop sebagai gantinya
- Contoh bug v0.7.2: `drawStageSelect()` menggunakan `forEach` sehingga klik stage tidak terdaftar

### 6. Save System
- Save ke `localStorage` dengan key `nusantara_save`
- Auto-save saat: checkpoint activated, boss defeated, death, return to menu
- Save data HARUS backward-compatible — tambahkan field baru dengan default value saat load
- **Selalu tambahkan field baru ke save.js DAN continueGame() di game.js**

### 7. Boss Grinding
- Boss HARUS selalu bisa dilawan ulang (grinding untuk EXP/Rupiah)
- `clearedStages` array melacak stage yang sudah dikalahkan — artifact hanya diberikan sekali
- `startStage()` selalu membuat boss baru, tidak peduli status cleared
- `damageBoss()` mengecek `clearedStages` sebelum increment artifact

### 8. Stage Design Rules
- Setiap stage memiliki 5 section: entrance, main area, special mechanic, puzzle area, boss arena
- Boss arena WAJIB punya dinding pembatas kiri-kanan (1 tile thick)
- Checkpoint ditempatkan di antara section (posisi `H-4`)
- Stage dimensions: semakin besar stageId, semakin lebar dan tinggi map
- Enemy types harus sesuai tema stage (lihat `config.js` STAGES array)

### 9. Souls-like Design Philosophy
- Stamina management: setiap aksi pakai stamina, regen delay setelah combat
- Death penalty: kehilangan 30% Rupiah, bisa recover 50% di bloodstain
- Estus Flask: healing terbatas, refill di checkpoint
- Dodge i-frames: 15 frame invincibility saat dodge roll
- Parry: timing ketat tapi rewarding (stagger + visceral attack)
- Rally system: recover HP dengan menyerang setelah terkena damage
- Hollowing: kematian berturut-turut mengurangi max HP
- Boss Phase 2: boss lebih agresif saat HP di bawah 50%

### 10. UI/UX Rules
- Semua teks UI dalam **Bahasa Indonesia**
- HUD: HP bar, stamina bar, energy bar, poise bar di kiri atas
- Bottom HUD: estus, kunci, rupiah, death count, combat state
- Mini-map di kanan bawah saat bermain
- Pause menu (ESC): Lanjutkan, Kontrol, Menu Utama
- Inventory (TAB/I): equipment, items, stat allocation

### 11. Performance
- Canvas rendering: hanya draw tiles yang visible (camera culling)
- Particles: batasi jumlah, recycle saat life habis
- Hit-stop: gunakan untuk dramatic effect (boss death, parry)
- Screen shake: jangan berlebihan, reset timer setelah selesai

### 12. Color Palette
- Emas (gold) sebagai warna utama — `#D4AF37`
- Gelap sebagai background — `#0A0A0A` hingga `#1A0A2E`
- Merah untuk damage/danger — `#FF4444`
- Cyan untuk energy/water — `#00CED1`
- Hijau untuk healing — `#44FF44`
- Setiap stage punya warna tema berbeda (lihat `config.js` STAGES bg1/bg2)

---

## Testing Checklist

Sebelum commit, pastikan:
- [ ] Game bisa di-load tanpa error di Console (F12)
- [ ] Main menu berfungsi: Mulai Baru, Lanjutkan, Kontrol
- [ ] Stage select: semua unlocked stage bisa diklik
- [ ] Movement: WASD/Arrow keys berfungsi
- [ ] Combat: light attack (SPACE), heavy (F), parry (R), dodge (SHIFT)
- [ ] Boss muncul saat player mencapai trigger area
- [ ] Boss bisa dilawan ulang setelah stage selesai (grinding)
- [ ] Save/load berfungsi: progress tidak hilang saat refresh
- [ ] Pause menu (ESC): resume, kontrol, menu utama
- [ ] Inventory (TAB): equip, unequip, use potion
- [ ] Estus (E) berfungsi dan refill di checkpoint
- [ ] Tidak ada collision bug (player stuck di tile)

---

## Known Issues

- Cloudflared quick tunnels sementara (URL berubah setiap restart)
- Background processes di environment development mati setelah ~20 detik
- Water swimming di Stage 3 perlu fine-tuning
- Lava damage di Stage 2 perlu visual feedback lebih baik
