#!/usr/bin/env node
// generate-docs.js — Generate comprehensive documentation for NUSANTARA: Warisan Terakhir
import { Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, PageBreak, TableOfContents,
  NumberFormat } from 'docx';
import { writeFileSync } from 'fs';

// ── Palette ──
const P = {
  primary: '0A1628',
  body: '1A2B40',
  secondary: '6878A0',
  accent: 'D4AF37',
  surface: 'F4F8FC',
};
const c = (hex) => hex.replace('#', '');

// ── Table Borders ──
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D0D0D0' };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const headerBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: P.accent },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: P.accent },
  left: noBorder, right: noBorder,
  insideHorizontal: noBorder, insideVertical: noBorder,
};
const bodyBorders = {
  top: noBorder, bottom: thinBorder,
  left: noBorder, right: noBorder,
  insideHorizontal: thinBorder, insideVertical: noBorder,
};

// ── Helpers ──
function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: P.body, font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 22, color: P.body, font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })],
  });
}

function bodyBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, color: P.body, font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } }),
      new TextRun({ text, size: 22, color: P.body, font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 40 },
    indent: { left: 480 + level * 360 },
    children: [new TextRun({ text: `\u2022 ${text}`, size: 22, color: P.body, font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })],
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { line: 260, before: 60, after: 60 },
    indent: { left: 480 },
    shading: { type: ShadingType.CLEAR, fill: 'F0F4F8' },
    children: [new TextRun({ text, size: 18, color: '2A4A6A', font: 'Consolas' })],
  });
}

function makeHeaderRow(cells) {
  return new TableRow({
    tableHeader: true,
    children: cells.map(text => new TableCell({
      borders: headerBorders,
      shading: { type: ShadingType.CLEAR, fill: P.surface },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20, color: P.primary, font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
      })],
    })),
  });
}

function makeRow(cells, idx) {
  return new TableRow({
    children: cells.map(text => new TableCell({
      borders: bodyBorders,
      shading: idx % 2 === 0 ? { type: ShadingType.CLEAR, fill: 'FFFFFF' } : { type: ShadingType.CLEAR, fill: P.surface },
      margins: { top: 40, bottom: 40, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text, size: 20, color: P.body, font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })],
      })],
    })),
  });
}

function simpleTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      makeHeaderRow(headers),
      ...rows.map((r, i) => makeRow(r, i)),
    ],
  });
}

// ── COVER (R1 style, dark background) ──
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function buildCover() {
  const title = 'NUSANTARA: Warisan Terakhir';
  const subtitle = 'Dokumentasi Pengembangan Game Lengkap';
  const metaLines = [
    'Versi 0.7.4',
    'Platform: Browser (HTML5 Canvas)',
    'Teknologi: Vanilla JavaScript (ES Modules)',
    'Resolusi: 960 x 540',
  ];

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: allNoBorders,
      rows: [new TableRow({
        height: { value: 16838, rule: 'exact' },
        children: [new TableCell({
          borders: allNoBorders,
          shading: { type: ShadingType.CLEAR, fill: '0A1628' },
          verticalAlign: 'top',
          children: [
            new Paragraph({ spacing: { before: 4800 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 1200 },
              spacing: { line: 1200 },
              children: [new TextRun({ text: title, bold: true, size: 52, color: 'D4AF37', font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
            }),
            new Paragraph({ spacing: { before: 200 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 1200 },
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'D4AF37', space: 12 } },
              children: [],
            }),
            new Paragraph({ spacing: { before: 200 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 1200 },
              children: [new TextRun({ text: subtitle, size: 28, color: 'B0B8C0', font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })],
            }),
            ...metaLines.map(line => new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 1200 },
              spacing: { before: 80 },
              children: [new TextRun({ text: line, size: 20, color: '6878A0', font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })],
            })),
            new Paragraph({ spacing: { before: 2400 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 1200 },
              children: [new TextRun({ text: 'GitHub: https://github.com/pkok1099/nusa.js', size: 18, color: '529286', font: 'Consolas' })],
            }),
          ],
        })],
      })],
    }),
  ];
}

// ── CONTENT ──
const content = [];

// ---- 1. Project Overview ----
content.push(heading1('1. Gambaran Proyek'));
content.push(body('NUSANTARA: Warisan Terakhir adalah game browser-based Souls-like RPG bertema mitologi Nusantara (Indonesia). Game ini dibangun sepenuhnya dengan vanilla JavaScript menggunakan ES Modules, tanpa framework atau library runtime. Rendering dilakukan melalui HTML5 Canvas dengan resolusi 960x540 piksel. Game menampilkan sistem pertarungan Souls-like yang dalam, termasuk stamina management, parry, dodge dengan i-frames, Estus Flask, bloodstain recovery, rally system, hollowing, visceral attack, weapon arts, dan two-handing. Pemain berperan sebagai Arjuna yang harus mengumpulkan lima artefak dari lima stage yang terinspirasi dari lokasi mitologis Indonesia untuk mengalahkan Raksasa Terakhir di Candi Prambanan.'));
content.push(body('Versi saat ini adalah 0.7.4, yang menambahkan berbagai sistem Souls-like secara bertahap sejak versi 0.7.0. Game ini dirancang untuk desktop browser dan tidak mendukung platform mobile. Arsitektur kode mengikuti pola module-per-system di mana setiap sistem game ditempatkan dalam file JavaScript terpisah, memudahkan pemeliharaan dan pengembangan lebih lanjut.'));

content.push(heading2('1.1 Informasi Teknis'));
content.push(simpleTable(
  ['Properti', 'Nilai'],
  [
    ['Versi', '0.7.4'],
    ['Platform', 'Browser (Desktop)'],
    ['Bahasa Pemrograman', 'JavaScript (ES Modules)'],
    ['Rendering', 'HTML5 Canvas 960x540'],
    ['Build Tool', 'Rollup (IIFE bundle untuk produksi)'],
    ['Dev Server', 'npx serve / python3 http.server'],
    ['Runtime Dependencies', 'Tidak ada (vanilla JS)'],
    ['Dev Dependencies', 'rollup, @rollup/plugin-node-resolve'],
    ['Lisensi', 'MIT'],
    ['Repository', 'https://github.com/pkok1099/nusa.js'],
  ]
));

content.push(heading2('1.2 Versi dan Changelog'));
content.push(simpleTable(
  ['Versi', 'Tanggal', 'Perubahan Utama'],
  [
    ['0.7.0', '-', 'Souls-like: Estus Flask, Bloodstain, Bonfire, Stamina regen delay, Dodge i-frames, Parry timing, Backstab, Poise/stagger'],
    ['0.7.1', '-', 'Rally system, Hollowing, Visceral Attack, Weapon Arts, Two-handing, Stamina exhaustion, Player poise'],
    ['0.7.2', '-', 'Bug fix: Stage select forEach -> for-loop, klik stage tidak terdaftar'],
    ['0.7.3', '-', 'Bug fix: Stage 2 level redesign, lava/rock di y=H-4 blocking player, hapus touch.js'],
    ['0.7.4', '-', 'Pause menu (ESC), boss grinding fix, save persistence fix, rules.md, dokumentasi lengkap'],
  ]
));

// ---- 2. Architecture ----
content.push(heading1('2. Arsitektur dan Struktur Kode'));
content.push(body('Game ini menggunakan arsitektur module-per-system di mana setiap fitur utama diimplementasikan dalam file JavaScript terpisah. Semua modul menggunakan ES Modules (import/export) yang didukung native oleh browser modern, sehingga tidak memerlukan bundler saat development. Untuk produksi, Rollup digunakan untuk menggabungkan semua modul menjadi satu file IIFE yang bisa dijalankan langsung dari file:// tanpa HTTP server.'));

content.push(heading2('2.1 Struktur File'));
content.push(simpleTable(
  ['File', 'Deskripsi', 'Baris'],
  [
    ['index.html', 'Entry point, cache-busting, error handling, loading screen', '151'],
    ['js/game.js', 'Main game loop, state machine, initialization, event routing', '581'],
    ['js/draw-game.js', 'Semua fungsi rendering (menu, HUD, level, entities, dll)', '1772'],
    ['js/player.js', 'Player state, movement, combat, damage, respawn', '1277'],
    ['js/boss.js', 'Boss AI, attacks, phases, posture/stagger', '618'],
    ['js/enemy.js', 'Enemy AI untuk 10 tipe musuh', '508'],
    ['js/entities.js', 'Entity factory (enemies, items, NPCs, puzzle triggers, boss)', '339'],
    ['js/level.js', 'Level generation (tile map per stage)', '373'],
    ['js/physics.js', 'Collision detection, tile physics, one-way platforms', '68'],
    ['js/camera.js', 'Camera system, smooth follow, clamping', '18'],
    ['js/config.js', 'Constants, colors, equipment, stage definitions, Souls-like tuning', '282'],
    ['js/input.js', 'Keyboard/mouse input handling', '45'],
    ['js/inventory.js', 'Inventory, equipment, buffs, stat allocation', '302'],
    ['js/save.js', 'Save/load ke localStorage', '89'],
    ['js/shop.js', 'Shop system (buy/sell)', '132'],
    ['js/puzzle.js', 'Puzzle minigame (symbol sequence memory)', '75'],
    ['js/dialog.js', 'Typewriter-style dialog system', '49'],
    ['js/particles.js', 'Particle effects, floating text, projectile collision', '109'],
    ['js/renderer.js', 'Canvas drawing primitives (drawText, drawRect, drawBar, drawOutline)', '47'],
    ['js/audio.js', 'Web Audio API sound effects (15 tipe suara)', '113'],
    ['build.js', 'Rollup build script untuk produksi', '78'],
    ['rollup.config.js', 'Rollup configuration (IIFE output)', '16'],
    ['serve.json', 'Cache-Control headers untuk dev server', '32'],
    ['rules.md', 'Development rules dan guidelines', '167'],
  ]
));

content.push(heading2('2.2 State Machine'));
content.push(body('Game menggunakan state machine sederhana yang mengontrol alur permainan. State utama disimpan dalam variabel gameState.value yang diakses oleh game loop utama. Setiap state memiliki logic update dan rendering tersendiri. Berikut adalah diagram transisi state:'));

content.push(codeBlock('menu -> stageSelect -> playing <-> dialog'));
content.push(codeBlock('                      |            |'));
content.push(codeBlock('                      v            v'));
content.push(codeBlock('                    shop        puzzle'));
content.push(codeBlock('                      |            |'));
content.push(codeBlock('                      v            v'));
content.push(codeBlock('                   playing    playing -> bossIntro -> playing'));
content.push(codeBlock('                                            |'));
content.push(codeBlock('                                  gameOver -> playing (respawn)'));
content.push(codeBlock('                                  victory -> stageSelect'));
content.push(codeBlock('                                  paused -> playing / menu'));
content.push(codeBlock('                                  inventory -> playing'));
content.push(codeBlock('                                  levelUp -> playing'));

content.push(simpleTable(
  ['State', 'Deskripsi', 'Trigger Masuk', 'Trigger Keluar'],
  [
    ['menu', 'Menu utama (Mulai Baru, Lanjutkan, Kontrol)', 'Game start, victory->menu, paused->menu', 'startGame / continueGame'],
    ['stageSelect', 'Pilih stage atau buka shop', 'menu->stageSelect, victory, continueGame', 'select stage / shop / menu'],
    ['playing', 'Gameplay utama', 'stageSelect, dialog, puzzle, paused, inventory, levelUp', 'ESC, TAB, boss trigger, death, dialog, puzzle'],
    ['paused', 'Pause menu (Lanjutkan, Kontrol, Menu Utama)', 'ESC saat playing', 'resume / mainMenu'],
    ['dialog', 'Dialog NPC/intro', 'NPC interact, stage intro', 'E/Space selesai dialog'],
    ['puzzle', 'Puzzle minigame', 'E di puzzle trigger', 'Puzzle selesai'],
    ['bossIntro', 'Boss appearance animation', 'Player mencapai trigger area', 'Animasi selesai'],
    ['gameOver', 'Layar kematian', 'Player HP <= 0', 'Respawn / menu'],
    ['victory', 'Boss defeated', 'Boss HP <= 0', 'stageSelect / menu'],
    ['inventory', 'Inventory/equipment screen', 'TAB/I saat playing', 'Close / equip / unequip / use'],
    ['shop', 'Buy/sell items', 'NPC pedagang, stageSelect', 'Close / buy / sell'],
    ['levelUp', 'Stat allocation', 'L saat skillPoints > 0', 'Close / allocate'],
  ]
));

content.push(heading2('2.3 Module Dependencies'));
content.push(body('Modul-modul saling terhubung melalui import/export. game.js berfungsi sebagai orchestrator utama yang mengimpor hampir semua modul lain dan mengelola state machine. Beberapa modul memiliki circular dependency yang diatasi melalui callback function atau shared mutable state reference. Sebagai contoh, player.js menerima reference ke gameState, hitStop, shake, dan deathCount dari game.js melalui fungsi setStateRefs(). particles.js menerima callback damage dari game.js melalui setDamageCallbacks() agar projectile bisa mengenai enemy dan boss.'));

// ---- 3. Core Systems ----
content.push(heading1('3. Sistem Inti Game'));

content.push(heading2('3.1 Game Loop'));
content.push(body('Game loop berjalan menggunakan requestAnimationFrame dengan target 60 FPS. Setiap frame, game loop menjalankan langkah-langkah berikut secara berurutan: (1) Increment gameTime dan set ke renderer, (2) Decrement hitStop counter jika aktif, (3) Decrement parryFlash timer, (4) Process frame-based victory timer, (5) Process screen shake, (6) Dispatch ke state handler sesuai gameState.value, (7) Restore ctx transformasi, (8) savePrevKeys() untuk input buffering, (9) Reset mouse.clicked. Hit-stop system memungkinkan freeze frame sesaat saat terjadi hit untuk memberikan dramatic effect, sementara screen shake memberikan feedback visual pada serangan berat.'));

content.push(heading2('3.2 Input System'));
content.push(body('Input system menangani keyboard dan mouse. Keyboard menggunakan object keys yang menyimpan status keydown, dan prevKeys untuk mendeteksi justPressed (tekan baru saja, hanya aktif 1 frame). Mouse tracking dilakukan dengan konversi koordinat dari canvas bounding rect ke game coordinates (960x540). Event yang di-prevent default termasuk Space, Arrow keys, WASD, E, Q, F, R, Shift, Tab, Escape, dan Enter untuk menghindari scroll atau behavior browser yang tidak diinginkan.'));

content.push(simpleTable(
  ['Tombol', 'Aksi', 'Catatan'],
  [
    ['W / ArrowUp', 'Jump', 'Costs 8 stamina'],
    ['A / ArrowLeft', 'Move left', '-'],
    ['S / ArrowDown', 'Drop through platform / Bow aim down', '-'],
    ['D / ArrowRight', 'Move right', '-'],
    ['Space', 'Light attack (combo 1-2-3)', 'Costs 10 stamina (15 if two-handing)'],
    ['F', 'Heavy attack', 'Costs 25 stamina + 25 energy'],
    ['R', 'Parry', 'Costs 15 stamina, 6-frame active window'],
    ['Shift', 'Dodge roll', 'Costs 25 stamina, 15 i-frames'],
    ['Q', 'Skill (AOE)', 'Costs 30 energy, 180-frame cooldown'],
    ['E', 'Interact / Estus Flask', 'NPC, puzzle trigger, heal'],
    ['G', 'Weapon Art', 'Costs 30 stamina + 20 energy, 180-frame cooldown'],
    ['H', 'Toggle two-handing', '+30% damage, +15% stamina cost'],
    ['TAB / I', 'Open inventory', '-'],
    ['L', 'Open level up (if skill points available)', '-'],
    ['ESC', 'Pause menu', '-'],
  ]
));

content.push(heading2('3.3 Physics & Collision'));
content.push(body('Sistem fisika menggunakan gravity-based movement dengan tile-based collision detection. Gravity diterapkan setiap frame (0.55 per frame, max fall 12). Collision detection memeriksa overlap antara entity hitbox dan tile map menggunakan koordinat pixel yang dikonversi ke koordinat tile. Tile system menggunakan 9 tipe tile yang dibagi menjadi tiga kategori berdasarkan behavior collision-nya.'));

content.push(simpleTable(
  ['Tile ID', 'Nama', 'Tipe', 'Deskripsi'],
  [
    ['0', 'Air', 'Non-solid', 'Tidak ada collision, player bisa lewat'],
    ['1', 'Stone', 'Solid', 'Tembok/lantai batu, player tidak bisa lewat'],
    ['2', 'Platform', 'One-way', 'Player bisa berdiri di atas, bisa drop-through'],
    ['3', 'Lava', 'Solid + Damage', 'Tembok/lantai lava, damage 8 HP tiap 30 frame'],
    ['4', 'Water', 'Non-solid', 'Swimming area, gravity berkurang, swim force'],
    ['5', 'Tree', 'Solid', 'Batang pohon, player tidak bisa lewat'],
    ['6', 'Vine', 'One-way', 'Platform vine, bisa drop-through'],
    ['7', 'Wall', 'Solid', 'Dinding pembatas, player tidak bisa lewat'],
    ['8', 'Decoration', 'Non-solid', 'Dekorasi visual, tidak ada collision'],
    ['9', 'Checkpoint', 'Non-solid', 'Bonfire checkpoint, auto-save dan full heal'],
  ]
));

content.push(body('PENTING: Hitbox player adalah 36px tinggi (lebih besar dari 1 tile = 32px), sehingga tile solid di baris y = H-4 (satu baris di atas tanah) akan bersentuhan dengan hitbox player dan menciptakan tembok yang tidak bisa dilewati. Lava dan obstacle di ground level (y = H-3) harus maksimal 2-3 tile lebar agar bisa dilompati. One-way platforms (tile 2 dan 6) hanya aktif ketika entity sebelumnya berada di atas platform (previousY + height <= platformTop + 4). Drop-through platform didukung melalui S + Jump yang mengaktifkan dropThrough flag selama 8 frame.'));

content.push(heading2('3.4 Camera System'));
content.push(body('Camera mengikuti player dengan smooth interpolation (lerp factor 0.08). Posisi camera di-clamping agar tidak keluar dari batas tile map. Kalkulasi: targetX = player.x + player.w/2 - GAME_W/2, targetY = player.y + player.h/2 - GAME_H/2. Camera memastikan bahwa hanya area yang valid dari level yang terlihat, dan transisi antar area terasa smooth berkat interpolasi.'));

// ---- 4. Player System ----
content.push(heading1('4. Sistem Player'));
content.push(body('Player adalah entity utama yang dikendalikan oleh pemain. Player memiliki hitbox 24x36 piksel dan spawn di posisi (80, groundY - 36). Sistem player mencakup movement, combat, damage, respawn, dan berbagai mekanisme Souls-like yang memberikan kedalaman gameplay.'));

content.push(heading2('4.1 Player Properties'));
content.push(simpleTable(
  ['Property', 'Default', 'Deskripsi'],
  [
    ['hp', '100', 'Health points, base 100 + 10/level'],
    ['stamina', '100', 'Combat stamina, regen dengan delay'],
    ['energy', '100', 'Skill resource, regen 0.05/frame'],
    ['artifacts', '0', 'Collected artifacts (0-5)'],
    ['rupiah', '0', 'Currency, lost 30% on death'],
    ['keys', '0', 'Key items collected'],
    ['estus / estusMax', '5 / 5', 'Estus Flask charges, refill at bonfire'],
    ['hollowing', '0', 'Consecutive death penalty, -5% max HP per level'],
    ['poise', '50', 'Stagger resistance, regen 0.3/frame'],
    ['twoHanding', 'false', 'Toggle: +30% damage, +15% stamina cost'],
    ['bloodstain', 'null', 'Lost Rupiah recovery point'],
    ['rallyHp / rallyTimer', '0 / 0', 'Rally system (recover HP by attacking)'],
  ]
));

content.push(heading2('4.2 Combat System'));
content.push(heading3('4.2.1 Light Attack Combo'));
content.push(body('Light attack menggunakan sistem combo 3-hit dengan timing window. Setiap hit dalam combo memiliki damage dan duration yang meningkat: Hit 1 (15 base + level*2 + attack, 12 frames), Hit 2 (18 base + level*2 + attack, 14 frames), Hit 3 (25 base + level*3 + attack, 18 frames). Combo window memberikan 15 frame untuk menekan tombol lagi sebelum combo reset. Stamina cost: 10 per hit (15 jika two-handing). Jika stamina tidak cukup, player akan mengalami exhaustion stagger selama 20 frame.'));

content.push(heading3('4.2.2 Heavy Attack'));
content.push(body('Heavy attack memiliki windup frame (20 frames) sebelum impact, total duration 30 frames. Damage: 40 base + level*3 + attack stat. Heavy attack mengkonsumsi 25 stamina dan 25 energy. Saat impact, efek visual termasuk gold particle burst, screen shake (intensity 5), dan hit-stop selama 8 frame. Two-handing bonus: +30% damage, +15% stamina cost.'));

content.push(heading3('4.2.3 Parry System'));
content.push(body('Parry menggunakan timing window yang ketat namun rewarding. Duration total: 12 frame, dengan active parry window 6 frame di awal animasi. Stamina cost: 15. Jika parry berhasil, enemy/boss akan stagger selama 30 frame dan player mendapat 10 stamina refund. Setelah parry berhasil, player memiliki 30 frame (visceral window) untuk menekan Space dan melakukan visceral attack dengan 4x damage multiplier.'));

content.push(heading3('4.2.4 Dodge Roll'));
content.push(body('Dodge roll memberikan 15 frame invincibility (i-frames) dimulai dari frame ke-2. Duration: 12 frame, speed: 8 pixels/frame. Stamina cost: 25 (28 jika two-handing). Selama dodge, player bergerak dalam arah facing dan tidak bisa diserang. Dodge membatalkan semua aksi yang sedang berjalan (attack, parry, combo).'));

content.push(heading3('4.2.5 Weapon Arts'));
content.push(body('Setiap senjata memiliki Weapon Art unik yang diaktifkan dengan tombol G. Cost: 30 stamina + 20 energy, cooldown: 180 frame (3 detik). Damage dihitung sebagai (attack + level*3) * damageMult. Berikut adalah daftar Weapon Arts:'));

content.push(simpleTable(
  ['Senjata', 'Nama Art', 'Tipe', 'Damage Mult', 'Range', 'Duration'],
  [
    ['Keris', 'Tusukan Maut', 'Thrust', '2.5x', '70', '18'],
    ['Pedang Besi', 'Putaran Baja', 'Spin', '2.0x', '90', '22'],
    ['Tombak Naga', 'Sapuan Naga', 'Sweep', '2.2x', '100', '20'],
    ['Keris Emas', 'Sinar Pusaka', 'Beam', '3.0x', '200', '25'],
    ['Panah Api', 'Hujan Api', 'Rain', '1.8x', '150', '30'],
    ['Trisula Dewa', 'Trisula Dewa', 'Divine', '3.5x', '120', '28'],
  ]
));

content.push(heading2('4.3 Souls-like Systems'));

content.push(heading3('4.3.1 Stamina Management'));
content.push(body('Stamina adalah resource utama dalam combat. Setiap aksi combat mengkonsumsi stamina: light attack (10), heavy attack (25), parry (15), dodge (25), jump (8), weapon art (30). Stamina tidak langsung regenerate setelah aksi combat; ada delay 30 frame sebelum regen dimulai. Kecepatan regen berbeda: 0.6/frame saat in-combat, 1.2/frame saat out-of-combat. Jika stamina habis (0), player mengalami exhaustion stagger selama 20 frame dan tidak bisa melakukan aksi apapun.'));

content.push(heading3('4.3.2 Estus Flask'));
content.push(body('Estus Flask adalah mekanisme healing utama yang terinspirasi dari Dark Souls. Player memiliki 5 charge estus (default) yang bisa digunakan dengan menekan E. Setiap penggunaan menyembuhkan 50 HP selama 30 frame (heal animation). Estus charge di-refill saat: (1) Menyentuh checkpoint/bonfire, (2) Memulai stage baru. Estus tidak bisa digunakan saat two-handing aktif.'));

content.push(heading3('4.3.3 Bloodstain System'));
content.push(body('Saat player mati, 30% Rupiah hilang dan bloodstain ditempatkan di lokasi kematian. Player bisa recover 50% dari Rupiah yang hilang dengan mendekati bloodstain (jarak < 40px). Jika player mati lagi sebelum mencapai bloodstain, bloodstain lama hilang dan diganti dengan yang baru. Bloodstain juga bisa di-recover saat menyentuh bonfire (jarak < 100px).'));

content.push(heading3('4.3.4 Rally System'));
content.push(body('Terinspirasi dari Bloodborne, rally system memungkinkan player recover HP yang baru saja hilang dengan menyerang musuh. Setelah terkena damage, player memiliki 300 frame (5 detik) untuk menyerang dan recover 60% dari damage yang baru saja diterima. Rally HP ditampilkan sebagai bar kuning di HP bar. Jika timer habis, rally HP hilang.'));

content.push(heading3('4.3.5 Hollowing'));
content.push(body('Kematian berturut-turut meningkatkan hollowing level, yang mengurangi max HP sebesar 5% per level (max 10 level, minimum 50% base HP). Hollowing di-reset ke 0 saat menyentuh bonfire/checkpoint. Sistem ini mendorong player untuk bermain lebih hati-hati dan menggunakan bonfire secara strategis.'));

content.push(heading3('4.3.6 Visceral Attack'));
content.push(body('Setelah parry berhasil, player memiliki 30 frame untuk melakukan visceral attack (tekan Space). Visceral attack memberikan 4x damage multiplier dengan range 60px dan animasi lunge selama 20 frame. Visceral attack juga memicu rally recovery jika player memiliki rally HP aktif. Efek visual termasuk gold particle burst, screen shake (intensity 8), dan hit-stop 12 frame.'));

content.push(heading3('4.3.7 Two-Handing'));
content.push(body('Toggle dengan H, two-handing memberikan +30% damage bonus pada semua serangan (light, heavy, weapon art) dengan trade-off +15% stamina cost. Estus tidak bisa digunakan saat two-handing aktif. Two-handing cocok untuk playstyle agresif yang mengorbankan survivability untuk damage.'));

content.push(heading3('4.3.8 Poise & Stagger'));
content.push(body('Player memiliki poise (base 50) yang menentukan resistance terhadap stagger. Serangan musuh mengurangi poise, dan jika poise mencapai 0, player stagger selama 30 frame. Poise regenerate 0.3/frame saat out-of-combat dan 0.05/frame saat in-combat. Stagger menyebabkan player tidak bisa bergerak atau menyerang.'));

// ---- 5. Stage System ----
content.push(heading1('5. Sistem Stage'));
content.push(body('Game memiliki 5 stage yang terinspirasi dari lokasi mitologis Indonesia, masing-masing dengan tema, musuh, boss, dan level layout yang unik. Setiap stage semakin sulit dengan dimensi map yang lebih besar, boss HP lebih tinggi, dan musuh yang lebih agresif.'));

content.push(simpleTable(
  ['ID', 'Nama', 'Subjudul', 'Boss', 'Boss HP', 'Dimensi', 'Musuh'],
  [
    ['0', 'Candi Borobudur', 'Bangkit dari Debu Waktu', 'Penjaga Batu', '350', '80x20', 'batu_kecil, patung'],
    ['1', 'Hutan Borneo', 'Rimba Kehilangan', 'Raja Hutan', '500', '90x22', 'harimau, ular'],
    ['2', 'Gunung Bromo', 'Neraka Api', 'Naga Api', '700', '100x24', 'iblis_kecil, golem_api'],
    ['3', 'Laut Bali', 'Kedalaman Tanpa Dasar', 'Raksasa Laut', '900', '110x26', 'ikan_pedang, ubur_ubur'],
    ['4', 'Candi Prambanan', 'Akhir Segala Awal', 'Raksasa Terakhir', '1200', '120x28', 'prajurit_jahat, raksasa_kecil'],
  ]
));

content.push(heading2('5.1 Level Design Rules'));
content.push(bullet('Setiap stage memiliki 5 section: entrance, main area, special mechanic, puzzle area, boss arena'));
content.push(bullet('Boss arena WAJIB punya dinding pembatas kiri-kanan (1 tile thick) untuk mencegah boss keluar arena'));
content.push(bullet('Checkpoint ditempatkan di antara section (posisi y = H-4)'));
content.push(bullet('Stage dimensions: semakin besar stageId, semakin lebar dan tinggi map'));
content.push(bullet('Lava (tile 3) HANYA boleh di ground level (y = H-3), maksimal 2-3 tile lebar agar bisa dilompati'));
content.push(bullet('Tile solid di y = H-4 DILARANG karena hitbox player (36px) melebihi 1 tile (32px)'));
content.push(bullet('Enemy types harus sesuai tema stage'));

content.push(heading2('5.2 Unlock Progression'));
content.push(body('Stage 0 (Candi Borobudur) terbuka secara default. Stage berikutnya terbuka secara berurutan setelah boss stage sebelumnya dikalahkan. Saat boss dikalahkan, flag clearedStages[stageId] di-set true dan unlockedStages[stageId+1] di-set true. Boss tetap bisa dilawan ulang untuk grinding meskipun stage sudah cleared, tetapi artefak hanya diberikan sekali. Data ini disimpan dalam save system untuk persistensi antar sesi.'));

// ---- 6. Enemy System ----
content.push(heading1('6. Sistem Musuh'));

content.push(heading2('6.1 Enemy Types'));
content.push(simpleTable(
  ['Tipe', 'HP', 'Speed', 'Damage', 'Contact', 'EXP', 'Rupiah', 'Aggro', 'Special'],
  [
    ['batu_kecil', '20', '1.0', '10', '5', '10', '10', '150', 'Patrol + melee'],
    ['patung', '35', '1.5', '15', '8', '20', '15', '120', 'Slow patrol + telegraph'],
    ['harimau', '25', '2.5', '18', '10', '15', '15', '250', 'Fast pounce'],
    ['ular', '18', '0.8', '12', '5', '12', '10', '100', 'Poison (3s)'],
    ['iblis_kecil', '22', '1.2', '14', '5', '18', '20', '200', 'Ranged fireball'],
    ['golem_api', '60', '0.6', '20', '12', '25', '25', '130', 'AOE ground pound'],
    ['ikan_pedang', '20', '3.0', '16', '8', '14', '12', '180', 'Fast dash attack'],
    ['ubur_ubur', '15', '0.3', '10', '6', '10', '8', '60', 'Electric stun'],
    ['prajurit_jahat', '40', '1.8', '20', '10', '22', '20', '200', 'Sword combo + block'],
    ['raksasa_kecil', '50', '1.0', '22', '12', '20', '25', '220', 'Ranged rock throw'],
  ]
));

content.push(heading2('6.2 Enemy AI Behavior'));
content.push(body('Setiap musuh memiliki sistem AI yang terdiri dari beberapa state: Patrol (berjalan bolak-balik dalam area), Aggro (mendekati player saat dalam radius), Telegraph (persiapan serangan, terlihat dari animasi), Attack (eksekusi serangan), dan Recovery (cooldown setelah serangan). Musuh menggunakan aggro radius untuk mendeteksi player, dan setelah ter-aggro, mereka akan mengejar dan menyerang player. Musuh juga memiliki stagger system di mana posture yang terkumpul dari serangan player bisa menyebabkan stagger, memberikan kesempatan untuk serangan bonus.'));

content.push(heading2('6.3 Drop System'));
content.push(body('Musuh memiliki chance untuk menjatuhkan equipment saat dikalahkan. Common enemies (batu_kecil, harimau, ular, iblis_kecil, ikan_pedang, ubur_ubur) memiliki 5% drop rate. Elite enemies (patung, golem_api, prajurit_jahat, raksasa_kecil) memiliki 15% drop rate. Boss memiliki 100% drop rate dengan guaranteed equipment drop per stage. Drop table bervariasi per stage, dengan equipment yang lebih kuat tersedia di stage yang lebih tinggi.'));

// ---- 7. Boss System ----
content.push(heading1('7. Sistem Boss'));

content.push(heading2('7.1 Boss Mechanics'));
content.push(body('Setiap boss memiliki 3 phase yang ditentukan oleh persentase HP: Phase 1 (>66% HP), Phase 2 (33-66% HP), dan Phase 3 (<33% HP). Saat transisi ke Phase 2, boss mengalami dramatic pause selama 60 frame dengan particle burst dan screen shake. Setiap phase meningkatkan kecepatan gerak dan mengurangi waktu antar serangan. Boss memiliki posture system (max 100) yang bisa di-break untuk menyebabkan stagger selama 60 frame, memberikan kesempatan untuk serangan besar.'));

content.push(heading2('7.2 Boss Attacks'));

content.push(heading3('7.2.1 Penjaga Batu (Stage 0)'));
content.push(simpleTable(
  ['Attack', 'Phase', 'Range', 'Damage', 'Telegraph'],
  [
    ['Arm Swipe', '1-3', '110px', '15x mult', '30/20/15 frame'],
    ['Ground Pound', '1', '120px AOE', '22x mult', '40 frame'],
    ['Throw Rocks', '2-3', 'Ranged', '12x mult (3-5 projectiles)', '25/18 frame'],
    ['Charge', '2-3', '150px dash', '20x mult', '45/30 frame'],
    ['AOE Stomp', '3', '150px AOE', '25x mult', '35 frame'],
  ]
));

content.push(heading3('7.2.2 Raja Hutan (Stage 1)'));
content.push(simpleTable(
  ['Attack', 'Phase', 'Range', 'Damage', 'Telegraph'],
  [
    ['Pounce', '1-3', '120px dash', '20x mult', '25/18/12 frame'],
    ['Claw Combo', '1-3', 'Melee', '15x mult (3-hit combo)', '20/15/10 frame'],
    ['Summon Minions', '2-3', 'N/A', 'N/A (2-3 minions)', '30/20 frame'],
    ['Roar (Stun)', '2-3', '130px', '10x mult + 45f stun', '25/15 frame'],
    ['Ground Pound', '3', '120px AOE', '22x mult', '30 frame'],
  ]
));

content.push(heading3('7.2.3 Naga Api (Stage 2)'));
content.push(simpleTable(
  ['Attack', 'Phase', 'Range', 'Damage', 'Telegraph'],
  [
    ['Fire Breath', '1-3', 'Cone', '12x mult (7 projectiles)', '30/20/15 frame'],
    ['Tail Swipe', '1-3', '100px', '18x mult', '20/15/10 frame'],
    ['Meteor Rain', '2-3', '300px AOE', '15x mult (5 meteors)', '30/20/15 frame'],
    ['Fire Charge', '1-3', '180px dash', '25x mult', '40/25/18 frame'],
  ]
));

content.push(heading3('7.2.4 Raksasa Laut (Stage 3)'));
content.push(simpleTable(
  ['Attack', 'Phase', 'Range', 'Damage', 'Telegraph'],
  [
    ['Tentacle Slam', '1-3', '130px', '22x mult', '25/18/12 frame'],
    ['Frost Breath', '1-3', '100px cone', '10x mult + slow', '30/22/15 frame'],
    ['Tidal Wave', '1-3', 'Wide cone', '10x mult (8 projectiles)', '35/25/18 frame'],
    ['Whirlpool', '2-3', '60px pull', '15x mult + pull', '35/25 frame'],
    ['AOE Stomp', '3', '150px', '25x mult', '30 frame'],
  ]
));

content.push(heading3('7.2.5 Raksasa Terakhir (Stage 4)'));
content.push(body('Raksasa Terakhir menggunakan kombinasi serangan dari semua boss sebelumnya, menjadikannya boss yang paling menantang. Serangan termasuk Divine Strike, Shield Bash (stun), Earthquake (AOE), Summon Phase, Fire Breath, Meteor Rain, Tidal Wave, AOE Stomp, dan Charge. Phase 3 sangat agresif dengan telegraph time yang sangat pendek (10-20 frame) dan damage multiplier 1.5x.'));

// ---- 8. Equipment System ----
content.push(heading1('8. Sistem Equipment & Inventory'));

content.push(heading2('8.1 Weapons'));
content.push(simpleTable(
  ['ID', 'Nama', 'Attack', 'Speed', 'Harga', 'Deskripsi'],
  [
    ['keris', 'Keris', '+5', '+0.0', '0', 'Keris sederhana (starter)'],
    ['pedang', 'Pedang Besi', '+12', '-0.2', '150', 'Pedang besi yang tajam'],
    ['tombak', 'Tombak Naga', '+18', '-0.5', '350', 'Tombak bertuliskan naga kuno'],
    ['keris_emas', 'Keris Emas', '+25', '+0.3', '600', 'Keris pusaka kerajaan'],
    ['panah_api', 'Panah Api', '+20', '+0.5', '500', 'Panah berbakar bara api (ranged)'],
    ['trisula', 'Trisula Dewa', '+35', '+0.0', '1000', 'Senjata dewa pencipta'],
  ]
));

content.push(heading2('8.2 Armors'));
content.push(simpleTable(
  ['ID', 'Nama', 'Defense', 'Harga', 'Deskripsi'],
  [
    ['kain', 'Kain Biasa', '+0', '0', 'Kain penutup tubuh (starter)'],
    ['kulit', 'Baju Kulit', '+5', '120', 'Baju dari kulit binatang'],
    ['besi', 'Besi Tempa', '+12', '300', 'Baju besi pandai besi'],
    ['perak', 'Baju Perak', '+18', '550', 'Baju perak bangsawan'],
    ['emas', 'Baju Emas', '+25', '900', 'Baju emas kerajaan'],
    ['naga', 'Baju Naga', '+35', '1500', 'Baja legendaris sisik naga'],
  ]
));

content.push(heading2('8.3 Accessories'));
content.push(simpleTable(
  ['ID', 'Nama', 'Effect', 'Value', 'Harga', 'Deskripsi'],
  [
    ['cincin_besi', 'Cincin Besi', '+HP', '20', '100', '+20 HP Maks'],
    ['kalung_batu', 'Kalung Batu', '+Stamina', '15', '100', '+15 Stamina Maks'],
    ['gelang_emas', 'Gelang Emas', '+Energi', '10', '150', '+10 Energi Maks'],
    ['cincin_naga', 'Cincin Naga', '+Attack', '8', '400', '+8 Serangan'],
    ['kalung_dewa', 'Kalung Dewa', '+Defense', '10', '400', '+10 Pertahanan'],
    ['gelang_angin', 'Gelang Angin', '+Speed', '0.5', '350', '+0.5 Kecepatan'],
  ]
));

content.push(heading2('8.4 Potions'));
content.push(simpleTable(
  ['ID', 'Nama', 'Tipe', 'Value', 'Durasi', 'Harga'],
  [
    ['health', 'Ramuan Kesehatan', 'Heal', '40 HP', '-', '30'],
    ['stamina', 'Ramuan Stamina', 'Restore', '50 Stamina', '-', '25'],
    ['strength', 'Ramuan Kekuatan', 'Buff', '+10 Attack', '600 frame (10s)', '80'],
    ['defense', 'Ramuan Pertahanan', 'Buff', '+10 Defense', '600 frame (10s)', '80'],
    ['speed', 'Ramuan Kecepatan', 'Buff', '+1 Speed', '480 frame (8s)', '60'],
  ]
));

content.push(heading2('8.5 Stat Allocation'));
content.push(body('Player mendapat 2 skill points per level up yang bisa dialokasikan ke 6 stat: HP (+15 per point), Stamina (+8), Energy (+5), Attack (+3), Defense (+3), Speed (+0.15). Stat yang dialokasikan langsung mempengaruhi computed stats bersama equipment bonuses dan active buffs. Level up screen bisa diakses dengan L saat skill points tersedia.'));

// ---- 9. Save System ----
content.push(heading1('9. Sistem Save'));
content.push(body('Game menggunakan localStorage dengan key "nusantara_save" untuk menyimpan progress. Save system bersifat backward-compatible, artinya field baru ditambahkan dengan default value saat load sehingga save lama tetap bisa dimuat tanpa error. Auto-save terjadi pada momen-momen penting: checkpoint activated, boss defeated, death, dan return to menu.'));

content.push(heading2('9.1 Saved Data Structure'));
content.push(codeBlock('{'));
content.push(codeBlock('  player: {'));
content.push(codeBlock('    hp, level, exp, expNext, rupiah, artifacts, keys,'));
content.push(codeBlock('    currentStageId, checkpoint,'));
content.push(codeBlock('    estus, estusMax, bloodstain, lostRupiah,'));
content.push(codeBlock('    rallyHp, rallyTimer, poise, hollowing'));
content.push(codeBlock('  },'));
content.push(codeBlock('  inventory: {'));
content.push(codeBlock('    items: [...], equipment: {weapon, armor, accessory},'));
content.push(codeBlock('    activeBuffs: [...], skillPoints, allocatedStats'));
content.push(codeBlock('  },'));
content.push(codeBlock('  unlockedStages: [true, false, ...],'));
content.push(codeBlock('  clearedStages: [false, false, ...],'));
content.push(codeBlock('  deathCount: number,'));
content.push(codeBlock('  currentStageId: number,'));
content.push(codeBlock('  savedAt: timestamp'));
content.push(codeBlock('}'));

content.push(heading2('9.2 Save/Load API'));
content.push(simpleTable(
  ['Fungsi', 'Deskripsi', 'Return'],
  [
    ['saveGame(player, inventory, unlockedStages, deathCount, stageId, clearedStages)', 'Simpan progress ke localStorage', 'true/false'],
    ['loadGame()', 'Muat save dari localStorage', 'data object / null'],
    ['hasSaveGame()', 'Cek apakah save ada', 'true/false'],
    ['deleteSaveGame()', 'Hapus save (new game)', 'void'],
  ]
));

content.push(body('PENTING: Saat menambahkan field baru ke player state, WAJIB menambahkan field tersebut ke saveGame() di save.js DAN continueGame() di game.js dengan default value untuk backward compatibility. Tanpa ini, save lama akan crash saat dimuat.'));

// ---- 10. Audio System ----
content.push(heading1('10. Sistem Audio'));
content.push(body('Audio system menggunakan Web Audio API untuk menghasilkan sound effects secara prosedural (tanpa file audio). AudioContext diinisialisasi saat pertama kali player berinteraksi (klik canvas) untuk mematuhi browser autoplay policy. Setiap suara dihasilkan menggunakan oscillator dengan parameter berbeda (type, frequency, gain envelope).'));

content.push(simpleTable(
  ['Tipe Suara', 'Oscillator', 'Freq Range', 'Duration', 'Volume'],
  [
    ['hit', 'Sawtooth', '200->80 Hz', '0.15s', '0.15'],
    ['attack', 'Square', '300->150 Hz', '0.10s', '0.10'],
    ['heavyAttack', 'Sawtooth', '150->80 Hz', '0.25s', '0.18'],
    ['parry', 'Triangle', '800->1200 Hz', '0.20s', '0.15'],
    ['parrySuccess', 'Sine', '600->1200 Hz', '0.30s', '0.20'],
    ['stagger', 'Square', '100->50 Hz', '0.40s', '0.15'],
    ['jump', 'Sine', '250->500 Hz', '0.15s', '0.08'],
    ['dodge', 'Sine', '400->200 Hz', '0.12s', '0.06'],
    ['pickup', 'Sine', '523->784 Hz', '0.30s', '0.12'],
    ['boss', 'Sawtooth', '80->40 Hz', '0.60s', '0.15'],
    ['skill', 'Triangle', '600->1200 Hz', '0.30s', '0.12'],
    ['heal', 'Sine', '400->600 Hz', '0.30s', '0.08'],
    ['checkpoint', 'Sine', '440->880 Hz', '0.40s', '0.10'],
    ['noStamina', 'Square', '100->80 Hz', '0.10s', '0.08'],
    ['damage', 'Sawtooth', '150->50 Hz', '0.25s', '0.20'],
  ]
));

// ---- 11. Particle System ----
content.push(heading1('11. Sistem Partikel'));
content.push(body('Particle system menangani efek visual dan projectile collision. Partikel dibuat dengan spawnParticle() yang menerima posisi, warna, jumlah, kecepatan, dan lifetime. Floating text (damage numbers, status text) menggunakan sistem terpisah yang bergerak ke atas dan fade out. Projectiles (fireball, arrow, meteor) menggunakan particle dengan flag isProjectile dan damage value. Collision check dilakukan antara projectile hitbox dan entity hitbox setiap frame.'));

content.push(body('Performance safeguard: Jika total partikel melebihi 500, count untuk spawn baru dibatasi ke minimum 1 untuk mencegah lag. Partikel di-filter setiap frame berdasarkan lifetime, dan yang sudah habis dihapus dari array.'));

// ---- 12. Dialog & Puzzle ----
content.push(heading1('12. Dialog dan Puzzle'));

content.push(heading2('12.1 Dialog System'));
content.push(body('Dialog system menggunakan typewriter effect yang menampilkan karakter satu per satu (1 karakter tiap 2 frame). Player bisa menekan E atau Space untuk skip ke akhir baris atau lanjut ke baris berikutnya. Setiap dialog memiliki speaker name dan array of lines. Dialog di-trigger saat: (1) Stage intro, (2) NPC interaction, (3) Boss intro. Setelah dialog selesai, game kembali ke state playing.'));

content.push(heading2('12.2 Puzzle System'));
content.push(body('Puzzle menggunakan symbol sequence memory game. Player harus mengulang urutan simbol yang ditampilkan. Setiap stage memiliki konfigurasi puzzle yang berbeda dengan jumlah simbol dan panjang sequence yang meningkat:'));

content.push(simpleTable(
  ['Stage', 'Jumlah Simbol', 'Panjang Sequence', 'Tema'],
  [
    ['0 - Candi Borobudur', '5', '5', 'Elemen (matahari, air, api, angin, bintang)'],
    ['1 - Hutan Borneo', '6', '6', 'Alam (daun, harimau, ular, dll)'],
    ['2 - Gunung Bromo', '6', '6', 'Api (gunung, api, tengkorak, dll)'],
    ['3 - Laut Bali', '7', '7', 'Laut (ombak, gurita, kerang, dll)'],
    ['4 - Candi Prambanan', '8', '8', 'Ilahi (pedang, perisai, petir, dll)'],
  ]
));

// ---- 13. Build & Deployment ----
content.push(heading1('13. Build dan Deployment'));

content.push(heading2('13.1 Development Server'));
content.push(body('Untuk development, gunakan HTTP server karena ES Modules memerlukan origin yang sama. Cara yang direkomendasikan:'));
content.push(bullet('npm run dev (menggunakan npx serve di port 8000)'));
content.push(bullet('python3 -m http.server 8000'));
content.push(bullet('npx serve .'));
content.push(body('Untuk akses eksternal, gunakan cloudflared quick tunnel: npx cloudflared tunnel --url http://localhost:8000. Catatan: URL cloudflared bersifat sementara dan berubah setiap restart.'));

content.push(heading2('13.2 Production Build'));
content.push(body('Jalankan npm run build untuk membuat production build. Script build.js melakukan langkah-langkah berikut: (1) Rollup bundle semua ES modules menjadi satu IIFE, (2) Generate HTML dengan inline JavaScript, (3) Tulis ke dist/index.html. Production build tidak memerlukan HTTP server dan bisa dibuka langsung dari file://.'));

content.push(heading2('13.3 Cache Busting'));
content.push(body('Cache busting diimplementasikan di tiga level: (1) index.html menambahkan ?v=VERSION ke src game.js, (2) Fetch interceptor otomatis menambahkan ?v=VERSION ke semua import module, (3) serve.json mengatur Cache-Control: no-cache untuk .js dan .html files. Saat update versi, PASTIKAN tiga tempat di-update: package.json (version), index.html (__nusaVersion + src param), dan draw-game.js (menu version text).'));

// ---- 14. Development Guidelines ----
content.push(heading1('14. Panduan Pengembangan'));

content.push(heading2('14.1 Git Commit Rules'));
content.push(bullet('Author: SELALU pkok1099 <pkok1099@users.noreply.github.com>'));
content.push(bullet('Format: vX.Y.Z: Deskripsi singkat di baris pertama'));
content.push(bullet('Detail: Jelaskan APA yang diubah dan MENGAPA di body commit'));
content.push(bullet('Language: Commit message dalam Bahasa Inggris, komentar kode boleh campur'));

content.push(heading2('14.2 Version Numbering (SemVer)'));
content.push(bullet('Major (X.0.0): Breaking changes, sistem baru besar'));
content.push(bullet('Minor (0.X.0): Fitur baru, perbaikan signifikan'));
content.push(bullet('Patch (0.0.X): Bug fixes, perbaikan kecil'));
content.push(bullet('Update version di 3 tempat: package.json, index.html, draw-game.js'));

content.push(heading2('14.3 Common Pitfalls'));
content.push(heading3('14.3.1 forEach vs for-loop'));
content.push(body('JANGAN gunakan forEach jika perlu return, break, atau continue dari outer function. Return di dalam forEach callback hanya exit callback, BUKAN outer function. Gunakan for loop sebagai gantinya. Bug v0.7.2: drawStageSelect() menggunakan forEach sehingga klik stage tidak terdaftar.'));

content.push(heading3('14.3.2 Collision at y=H-4'));
content.push(body('Player hitbox (36px) melebihi 1 tile (32px), sehingga tile solid di y=H-4 akan menyentuh hitbox player dan menciptakan tembok. Bug v0.7.3: Stage 2 lava pools dan rock formations di y=H-4 membuat player stuck. Solusi: lava hanya di ground level (y=H-3), maksimal 2-3 tile lebar.'));

content.push(heading3('14.3.3 setTimeout in Game Loop'));
content.push(body('JANGAN gunakan setTimeout untuk game logic. setTimeout tidak sinkron dengan game loop dan bisa menyebabkan damage setelah entity mati atau state berubah. Gunakan frame-based tracking sebagai gantinya. Bug v0.6.2: boss clawCombo menggunakan setTimeout yang bisa damage setelah boss mati.'));

content.push(heading3('14.3.4 Save Backward Compatibility'));
content.push(body('Selalu tambahkan field baru ke save.js DAN continueGame() di game.js dengan default value. Tanpa ini, save lama akan crash saat dimuat.'));

content.push(heading2('14.4 Color Palette'));
content.push(simpleTable(
  ['Token', 'Hex', 'Penggunaan'],
  [
    ['Gold (utama)', '#D4AF37', 'Warna utama, judul, aksen'],
    ['Background', '#0A0A0A - #1A0A2E', 'Background gelap'],
    ['Red (damage)', '#FF4444', 'Damage, danger indicator'],
    ['Cyan (energy)', '#00CED1', 'Energy bar, water effects'],
    ['Green (heal)', '#44FF44', 'Healing, nature'],
    ['Stone', '#8B8682', 'Stone tiles, batu_kecil'],
    ['Lava', '#CC3300', 'Lava tiles, fire effects'],
    ['Stamina', '#CCAA00', 'Stamina bar'],
    ['Parry Gold', '#FFD700', 'Parry success indicator'],
  ]
));

content.push(heading2('14.5 UI/UX Rules'));
content.push(bullet('Semua teks UI dalam Bahasa Indonesia'));
content.push(bullet('HUD: HP bar, stamina bar, energy bar, poise bar di kiri atas'));
content.push(bullet('Bottom HUD: estus, kunci, rupiah, death count, combat state'));
content.push(bullet('Mini-map di kanan bawah saat bermain'));
content.push(bullet('Pause menu (ESC): Lanjutkan, Kontrol, Menu Utama'));
content.push(bullet('Inventory (TAB/I): equipment, items, stat allocation'));

content.push(heading2('14.6 Performance'));
content.push(bullet('Canvas rendering: hanya draw tiles yang visible (camera culling)'));
content.push(bullet('Particles: batasi jumlah (max 500), recycle saat life habis'));
content.push(bullet('Hit-stop: gunakan untuk dramatic effect (3-12 frame)'));
content.push(bullet('Screen shake: jangan berlebihan, reset timer setelah selesai'));

// ---- 15. Testing Checklist ----
content.push(heading1('15. Testing Checklist'));
content.push(body('Sebelum commit, pastikan semua item berikut telah diperiksa:'));

const testItems = [
  'Game bisa di-load tanpa error di Console (F12)',
  'Main menu berfungsi: Mulai Baru, Lanjutkan, Kontrol',
  'Stage select: semua unlocked stage bisa diklik',
  'Movement: WASD/Arrow keys berfungsi',
  'Combat: light attack (SPACE), heavy (F), parry (R), dodge (SHIFT)',
  'Boss muncul saat player mencapai trigger area',
  'Boss bisa dilawan ulang setelah stage selesai (grinding)',
  'Save/load berfungsi: progress tidak hilang saat refresh',
  'Pause menu (ESC): resume, kontrol, menu utama',
  'Inventory (TAB): equip, unequip, use potion',
  'Estus (E) berfungsi dan refill di checkpoint',
  'Tidak ada collision bug (player stuck di tile)',
  'Rally system: recover HP setelah terkena damage dengan menyerang',
  'Hollowing: kematian berturut mengurangi max HP, reset di bonfire',
  'Weapon Art (G): setiap senjata punya skill unik',
  'Two-handing (H): toggle berfungsi, damage naik, stamina cost naik',
  'Visceral attack: parry -> Space untuk critical hit',
  'Bloodstain: recover Rupiah di lokasi kematian',
  'Shop: buy/sell berfungsi, Rupiah berkurang/bertambah',
  'Puzzle: sequence memory game berfungsi',
  'Level up: stat allocation berfungsi saat skill points tersedia',
];

testItems.forEach(item => {
  content.push(bullet(item));
});

// ---- 16. Known Issues ----
content.push(heading1('16. Known Issues'));
content.push(bullet('Cloudflared quick tunnels sementara (URL berubah setiap restart)'));
content.push(bullet('Background processes di environment development mati setelah ~20 detik'));
content.push(bullet('Water swimming di Stage 3 perlu fine-tuning'));
content.push(bullet('Lava damage di Stage 2 perlu visual feedback lebih baik'));
content.push(bullet('Sound effects prosedural terbatas (Web Audio API oscillator), tidak se-expresif audio files'));
content.push(bullet('Tidak ada animasi sprite (hanya rect-based visual), memerlukan artist untuk sprite sheet'));

// ---- 17. API Reference ----
content.push(heading1('17. Referensi API Module'));

content.push(heading2('17.1 config.js Exports'));
content.push(simpleTable(
  ['Export', 'Tipe', 'Deskripsi'],
  [
    ['GAME_W, GAME_H', 'Number', 'Canvas dimensions (960, 540)'],
    ['TILE', 'Number', 'Tile size (32px)'],
    ['LEVEL_H', 'Number', 'Default level height (20)'],
    ['GRAVITY, MAX_FALL', 'Number', 'Physics constants (0.55, 12)'],
    ['PLAYER_SPEED, JUMP_FORCE', 'Number', 'Player movement (3.2, -10.5)'],
    ['DODGE_SPEED, DODGE_DURATION', 'Number', 'Dodge (8, 12)'],
    ['COMBO_1/2/3_DAMAGE', 'Number', 'Combo damage (15, 18, 25)'],
    ['HEAVY_ATTACK_DAMAGE', 'Number', 'Heavy attack damage (40)'],
    ['PARRY_WINDOW', 'Number', 'Parry active frames (6)'],
    ['STAMINA_*', 'Number', 'Stamina constants'],
    ['ESTUS_MAX, ESTUS_HEAL_AMOUNT', 'Number', 'Estus (5, 50)'],
    ['DEATH_RUPIAH_*', 'Number', 'Death penalty (0.30, 0.50)'],
    ['RALLY_DURATION, RALLY_RECOVERY_PCT', 'Number', 'Rally (300, 0.6)'],
    ['WEAPON_ARTS', 'Object', 'Weapon art definitions'],
    ['WEAPONS, ARMORS, ACCESSORIES', 'Object', 'Equipment definitions'],
    ['POTIONS', 'Object', 'Potion definitions'],
    ['STAGES', 'Array', 'Stage definitions (5 stages)'],
    ['C', 'Object', 'Color palette'],
    ['STAT_NAMES, STAT_PER_POINT', 'Array/Object', 'Stat allocation'],
  ]
));

content.push(heading2('17.2 Key Functions'));
content.push(simpleTable(
  ['Module', 'Fungsi', 'Deskripsi'],
  [
    ['game.js', 'startStage(stageId)', 'Inisialisasi dan mulai stage'],
    ['game.js', 'startGame()', 'Mulai game baru (reset semua)'],
    ['game.js', 'continueGame()', 'Lanjutkan dari save'],
    ['game.js', 'autoSave(stageId)', 'Auto-save progress'],
    ['player.js', 'updatePlayer(keys, entities, boss, ...)', 'Update player setiap frame'],
    ['player.js', 'damagePlayer(amount)', 'Apply damage ke player'],
    ['player.js', 'damageEnemy(enemy, amount, entities)', 'Apply damage ke enemy'],
    ['player.js', 'damageBoss(boss, amount)', 'Apply damage ke boss'],
    ['player.js', 'gainExp(amount)', 'Tambah EXP dan level up'],
    ['player.js', 'respawnPlayer()', 'Respawn di checkpoint'],
    ['enemy.js', 'updateEnemies(entities, hitStop, player)', 'Update semua enemy'],
    ['boss.js', 'updateBoss(boss, bossActive, hitStop, player)', 'Update boss AI'],
    ['boss.js', 'executeBossAttack(boss, player)', 'Eksekusi serangan boss'],
    ['entities.js', 'spawnEntities(stageId)', 'Spawn semua entity untuk stage'],
    ['entities.js', 'createBoss(x, y, stageId)', 'Buat boss instance'],
    ['entities.js', 'createEnemy(x, y, type)', 'Buat enemy instance'],
    ['level.js', 'generateLevel(stageId)', 'Generate tile map untuk stage'],
    ['physics.js', 'tileCollision(x, y, w, h, prevY)', 'Cek collision dengan tiles'],
    ['save.js', 'saveGame(...)', 'Simpan ke localStorage'],
    ['save.js', 'loadGame()', 'Muat dari localStorage'],
    ['inventory.js', 'getComputedStats(level)', 'Hitung total stats'],
    ['inventory.js', 'equipItem(index)', 'Equip item dari inventory'],
    ['inventory.js', 'unequipSlot(slot)', 'Unequip dan kembalikan ke inventory'],
    ['inventory.js', 'usePotion(index)', 'Gunakan potion'],
    ['shop.js', 'buyItem(category, itemId, rupiah)', 'Beli item dari shop'],
    ['shop.js', 'sellItem(index)', 'Jual item dari inventory'],
    ['puzzle.js', 'initPuzzle(stageId)', 'Inisialisasi puzzle'],
    ['dialog.js', 'startDialog(speaker, lines)', 'Mulai dialog'],
    ['particles.js', 'spawnParticle(x, y, color, count, speed, life)', 'Buat partikel'],
    ['particles.js', 'spawnFloatingText(x, y, text, color)', 'Buat teks mengambang'],
    ['audio.js', 'playSound(type)', 'Putar sound effect'],
    ['camera.js', 'updateCamera(player, tileMap)', 'Update posisi camera'],
  ]
));

// ---- Build Document ----
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' }, size: 22, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: { ascii: 'Calibri', eastAsia: 'SimHei' }, size: 32, bold: true, color: P.primary },
      },
      heading2: {
        run: { font: { ascii: 'Calibri', eastAsia: 'SimHei' }, size: 28, bold: true, color: P.primary },
      },
      heading3: {
        run: { font: { ascii: 'Calibri', eastAsia: 'SimHei' }, size: 24, bold: true, color: P.body },
      },
    },
  },
  sections: [
    // Cover section
    {
      properties: {
        page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCover(),
    },
    // TOC section
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'Daftar Isi', bold: true, size: 32, color: P.primary, font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
        }),
        new TableOfContents('Daftar Isi', {
          hyperlink: true,
          headingStyleRange: '1-3',
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: 'Klik kanan pada Daftar Isi, pilih "Update Field" untuk memperbarui nomor halaman.', italics: true, size: 18, color: P.secondary })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // Content section
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'NUSANTARA: Warisan Terakhir \u2014 Dokumentasi v0.7.4', size: 16, color: P.secondary, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Halaman ', size: 16, color: P.secondary }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: P.secondary }),
            ],
          })],
        }),
      },
      children: content,
    },
  ],
});

// Generate
const buffer = await Packer.toBuffer(doc);
const outPath = '/home/z/my-project/download/NUSANTARA_Dokumentasi_v0.7.4.docx';
writeFileSync(outPath, buffer);
console.log(`Documentation generated: ${outPath}`);
