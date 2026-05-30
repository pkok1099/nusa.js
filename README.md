# NUSANTARA: Warisan Terakhir

> Souls-like Adventure RPG + Puzzle bertema mitologi Nusantara

![HTML5](https://img.shields.io/badge/HTML5-Game-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![Platform](https://img.shields.io/badge/Platform-Web%20Browser-blue)

## Tentang Game

**NUSANTARA: Warisan Terakhir** adalah game 2D side-scrolling dengan mekanik combat souls-like yang terinspirasi dari mitologi dan budaya Indonesia. Pemain mengontrol **Arjuna**, seorang pemuda desa yang ditakdirkan untuk mengumpulkan kembali lima artefak suci penjaga keseimbangan dunia.

### Fitur Utama

- **Combat Souls-like**: Combo 3-hit, heavy attack, parry, dodge roll, stamina system
- **Boss Fight**: Penjaga Batu dengan 3 fase, posture system, dan stagger mechanic
- **Puzzle Kuno**: Teka-teki berbasis elemen Nusantara
- **RPG Progression**: Level up, EXP, stat upgrades
- **Exploration**: Platformer dengan checkpoint system
- **Nusantara Theme**: Mitologi Indonesia, seni batik, candi, dan budaya lokal

## Kontrol

| Tombol | Fungsi |
|--------|--------|
| `W` / `↑` | Lompat |
| `A` `D` / `←` `→` | Bergerak kiri/kanan |
| `SPACE` | Serang Ringan (Combo 3x) |
| `F` | Serang Berat |
| `R` | Parry / Menangkis |
| `SHIFT` | Dodge / Berguling |
| `Q` | Skill Spesial |
| `E` | Interaksi / Minum Ramuan |

## Cara Menjalankan

1. Clone repo ini
2. Buka `index.html` di browser modern (Chrome, Firefox, Edge)
3. Atau gunakan local server:
   ```bash
   # Menggunakan Python
   python -m http.server 8000

   # Menggunakan Node.js
   npx serve .
   ```

## Struktur Proyek

```
nusa.js/
├── index.html          # Entry point HTML
├── js/
│   ├── game.js         # Main game loop & state machine
│   ├── config.js       # Konstanta & konfigurasi game
│   ├── player.js       # Logika pemain
│   ├── boss.js         # AI & serangan boss
│   ├── enemy.js        # Logika musuh
│   ├── entities.js     # Factory entity (musuh, item, NPC)
│   ├── physics.js      # Collision detection
│   ├── particles.js    # Sistem partikel
│   ├── audio.js        # Web Audio API sound system
│   ├── input.js        # Keyboard & touch input
│   ├── camera.js       # Camera follow system
│   ├── renderer.js     # Drawing primitives
│   ├── draw-game.js    # Semua fungsi rendering game
│   ├── level.js        # Level generation & tile map
│   ├── puzzle.js       # Puzzle minigame
│   └── dialog.js       # Dialog system
├── README.md
└── package.json
```

## Teknologi

- **HTML5 Canvas** - Rendering
- **ES6 Modules** - Modular code architecture
- **Web Audio API** - Sound effects (procedural)
- **Pure JavaScript** - Zero dependencies

## Konsep Game

Game ini dibuat sebagai proyek UTS **Konsep Game Digital** — Semester Genap 2025/2026, STMIK AMIKOM Surakarta.

## Lisensi

MIT License
