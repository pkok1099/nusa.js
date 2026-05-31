# NUSANTARA: Warisan Terakhir

> Browser-based Souls-like RPG bertema mitologi Nusantara

**Versi:** 0.7.4 | **Platform:** Browser Desktop | **Teknologi:** Vanilla JavaScript (ES Modules) + HTML5 Canvas

---

## Deskripsi

NUSANTARA: Warisan Terakhir adalah game Souls-like RPG yang berlatar di dunia mitologi Nusantara (Indonesia). Pemain berperan sebagai Arjuna yang harus mengumpulkan lima artefak dari lima stage legendaris untuk mengalahkan Raksasa Terakhir di Candi Prambanan.

Game ini menampilkan sistem pertarungan Souls-like yang dalam:
- **Stamina Management** — Setiap aksi mengkonsumsi stamina, regen dengan delay
- **Estus Flask** — Healing terbatas yang refill di checkpoint
- **Bloodstain Recovery** — Recover Rupiah yang hilang di lokasi kematian
- **Dodge i-Frames** — 15 frame invincibility saat dodge roll
- **Parry & Visceral Attack** — Timing ketat, 4x damage pada visceral
- **Rally System** — Recover HP dengan menyerang setelah terkena damage
- **Weapon Arts** — Skill unik per senjata
- **Two-Handing** — +30% damage, +15% stamina cost
- **Hollowing** — Kematian berturut mengurangi max HP

## 5 Stage

| Stage | Nama | Boss | Tema |
|-------|------|------|------|
| 0 | Candi Borobudur | Penjaga Batu | Batu kuno, candi gelap |
| 1 | Hutan Borneo | Raja Hutan | Hutan rimba, harimau & ular |
| 2 | Gunung Bromo | Naga Api | Lava, api, golem |
| 3 | Laut Bali | Raksasa Laut | Air, es, ikan pedang |
| 4 | Candi Prambanan | Raksasa Terakhir | Kuil akhir, semua serangan |

## Quick Start

```bash
# Clone
git clone https://github.com/pkok1099/nusa.js.git
cd nusa.js

# Install dependencies
npm install

# Development (HTTP server diperlukan untuk ES Modules)
npm run dev

# Build produksi (single HTML file, bisa di file://)
npm run build

# Production serve
npm start
```

Buka `http://localhost:8000` di browser desktop.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Movement |
| Space | Light Attack (combo 1-2-3) |
| F | Heavy Attack |
| R | Parry |
| Shift | Dodge Roll |
| E | Interact / Estus Flask |
| Q | Skill (AOE) |
| G | Weapon Art |
| H | Toggle Two-Handing |
| TAB / I | Inventory |
| L | Level Up (if skill points) |
| ESC | Pause Menu |

## Dokumentasi

- 📄 **[docs/NUSANTARA_Dokumentasi_v0.7.4.docx](./docs/NUSANTARA_Dokumentasi_v0.7.4.docx)** — Dokumentasi lengkap (17 bab, cover, TOC, API reference)
- 📋 **[rules.md](./rules.md)** — Development rules dan guidelines
- 📁 **[docs/](./docs/)** — Folder dokumentasi

## Arsitektur

```
index.html          — Entry point, cache-busting, error handling
js/
  game.js           — Main game loop, state machine
  draw-game.js      — Semua rendering
  player.js         — Player, movement, combat
  boss.js           — Boss AI, attacks, phases
  enemy.js          — Enemy AI untuk 10 tipe
  entities.js       — Entity factory
  level.js          — Level generation per stage
  physics.js        — Collision detection
  camera.js         — Camera follow system
  config.js         — Constants, equipment, stages
  input.js          — Keyboard/mouse input
  inventory.js      — Inventory, equipment, buffs
  save.js           — Save/load localStorage
  shop.js           — Shop system
  puzzle.js         — Puzzle minigame
  dialog.js         — Dialog system
  particles.js      — Particles, floating text
  renderer.js       — Drawing primitives
  audio.js          — Web Audio sound effects
```

## Build

```bash
# Rollup bundle ke IIFE
npm run build
# Output: dist/index.html (single file, bisa buka langsung)
```

## License

MIT
