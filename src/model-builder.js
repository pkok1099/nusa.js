// ============================================================
// model-builder.js — Procedural 3D model builder
// Phase 4: Generates Three.js Groups for all entity types
// using Box/Cylinder/Sphere geometry with Indonesian theme
// ============================================================

import * as THREE from 'three';
import { registerBaseModel, MATERIALS } from './asset-manager.js';

// ---- Geometry cache (shared geometries) ----
const geoCache = new Map();

function getBoxGeo(w, h, d) {
  const key = `box_${w}_${h}_${d}`;
  if (!geoCache.has(key)) {
    geoCache.set(key, new THREE.BoxGeometry(w, h, d));
  }
  return geoCache.get(key);
}

function getCylGeo(rTop, rBot, h, seg = 8) {
  const key = `cyl_${rTop}_${rBot}_${h}_${seg}`;
  if (!geoCache.has(key)) {
    geoCache.set(key, new THREE.CylinderGeometry(rTop, rBot, h, seg));
  }
  return geoCache.get(key);
}

function getSphereGeo(r, wSeg = 8, hSeg = 6) {
  const key = `sphere_${r}_${wSeg}_${hSeg}`;
  if (!geoCache.has(key)) {
    geoCache.set(key, new THREE.SphereGeometry(r, wSeg, hSeg));
  }
  return geoCache.get(key);
}

// ---- Helper: create a mesh with name ----
function mesh(name, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(pos[0], pos[1], pos[2]);
  if (rot[0] || rot[1] || rot[2]) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ============================================================
// PLAYER MODEL — Humanoid warrior with weapon slot
// ============================================================

function buildPlayerModel() {
  const group = new THREE.Group();
  group.name = 'player_model';

  // Scale: player game size = 24x36 pixels → 3D scale ~1.5 unit wide, ~2.25 tall
  const S = 0.09; // Pixel to 3D unit scale

  // ---- Root body hierarchy ----
  // Torso
  const torso = mesh('torso', getBoxGeo(1.8, 1.4, 0.8), MATERIALS.skin(), [0, 0.6, 0]);
  group.add(torso);

  // Head
  const head = mesh('head', getBoxGeo(1.2, 1.0, 1.0), MATERIALS.skin(), [0, 1.8, 0]);
  group.add(head);

  // Headband
  const headband = mesh('headband', getBoxGeo(1.3, 0.25, 1.05), MATERIALS.headband(), [0, 2.1, 0]);
  group.add(headband);

  // Hair (back of head)
  const hair = mesh('hair', getBoxGeo(1.1, 0.5, 0.6), MATERIALS.hair(), [0, 2.0, -0.3]);
  group.add(hair);

  // Eyes (small dark cubes)
  const eyeL = mesh('eye_l', getBoxGeo(0.2, 0.15, 0.1), MATERIALS.eyeWhite(), [-0.3, 1.85, 0.5]);
  const eyeR = mesh('eye_r', getBoxGeo(0.2, 0.15, 0.1), MATERIALS.eyeWhite(), [0.3, 1.85, 0.5]);
  group.add(eyeL, eyeR);

  // Cloth wrap (around torso)
  const cloth = mesh('cloth', getBoxGeo(2.0, 0.6, 0.9), MATERIALS.clothBrown(), [0, -0.1, 0]);
  cloth.name = 'cloth';
  group.add(cloth);

  // Left arm
  const armL = mesh('arm_l', getBoxGeo(0.4, 1.2, 0.4), MATERIALS.skin(), [-1.2, 0.5, 0]);
  group.add(armL);

  // Right arm (weapon arm)
  const armR = mesh('arm_r', getBoxGeo(0.4, 1.2, 0.4), MATERIALS.skin(), [1.2, 0.5, 0]);
  group.add(armR);

  // Left leg
  const legL = mesh('leg_l', getBoxGeo(0.5, 1.1, 0.5), MATERIALS.skin(), [-0.45, -1.0, 0]);
  group.add(legL);

  // Right leg
  const legR = mesh('leg_r', getBoxGeo(0.5, 1.1, 0.5), MATERIALS.skin(), [0.45, -1.0, 0]);
  group.add(legR);

  // Weapon (default keris — replaced dynamically based on equipment)
  const weapon = mesh('weapon', getBoxGeo(0.15, 1.2, 0.1), MATERIALS.keris(), [1.3, 0.8, 0.3]);
  group.add(weapon);

  // Weapon guard
  const guard = mesh('weapon_guard', getBoxGeo(0.5, 0.12, 0.15), MATERIALS.swordGuard(), [1.3, 0.3, 0.3]);
  group.add(guard);

  // Shadow disc
  const shadow = mesh('shadow', getCylGeo(0.8, 0.8, 0.05, 8), 
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }), [0, -1.55, 0]);
  shadow.name = 'shadow';
  group.add(shadow);

  return group;
}

// ============================================================
// ENEMY MODELS — 10 types with unique silhouettes
// ============================================================

function buildBatuKecil() {
  const g = new THREE.Group();
  g.name = 'batu_kecil_model';
  // Small stone creature
  g.add(mesh('body', getBoxGeo(1.2, 1.0, 0.8), MATERIALS.stone(), [0, 0.3, 0]));
  g.add(mesh('head', getBoxGeo(1.4, 0.6, 0.9), MATERIALS.stoneDark(), [0, 1.1, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.12), MATERIALS.eyeRed(), [-0.35, 1.15, 0.4]));
  g.add(mesh('eye_r', getSphereGeo(0.12), MATERIALS.eyeRed(), [0.35, 1.15, 0.4]));
  g.add(mesh('arm_l', getBoxGeo(0.3, 0.6, 0.3), MATERIALS.stone(), [-0.85, 0.2, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.3, 0.6, 0.3), MATERIALS.stone(), [0.85, 0.2, 0]));
  g.add(mesh('shadow', getCylGeo(0.6, 0.6, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }), [0, -0.5, 0]));
  return g;
}

function buildPatung() {
  const g = new THREE.Group();
  g.name = 'patung_model';
  // Stone statue enemy
  g.add(mesh('body', getBoxGeo(1.6, 1.6, 0.9), MATERIALS.stone(), [0, 0.5, 0]));
  g.add(mesh('head', getBoxGeo(1.8, 0.9, 1.0), MATERIALS.stoneDark(), [0, 1.7, 0]));
  g.add(mesh('face', getBoxGeo(1.4, 0.7, 0.3), MATERIALS.stoneLight(), [0, 1.65, 0.45]));
  g.add(mesh('eye_l', getBoxGeo(0.25, 0.2, 0.1), MATERIALS.eyeRed(), [-0.35, 1.75, 0.55]));
  g.add(mesh('eye_r', getBoxGeo(0.25, 0.2, 0.1), MATERIALS.eyeRed(), [0.35, 1.75, 0.55]));
  g.add(mesh('arm_l', getBoxGeo(0.4, 1.2, 0.4), MATERIALS.stone(), [-1.1, 0.5, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.4, 1.2, 0.4), MATERIALS.stone(), [1.1, 0.5, 0]));
  g.add(mesh('shadow', getCylGeo(0.8, 0.8, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }), [0, -0.5, 0]));
  return g;
}

function buildHarimau() {
  const g = new THREE.Group();
  g.name = 'harimau_model';
  // Tiger — low, long body
  g.add(mesh('body', getBoxGeo(2.0, 0.9, 0.8), MATERIALS.tiger(), [0, 0.4, 0]));
  g.add(mesh('head', getBoxGeo(1.0, 0.7, 0.8), MATERIALS.tigerDark(), [1.2, 0.6, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.1), MATERIALS.eyeGold(), [1.45, 0.75, 0.35]));
  g.add(mesh('eye_r', getSphereGeo(0.1), MATERIALS.eyeGold(), [1.45, 0.75, -0.35]));
  // Stripes
  g.add(mesh('stripe1', getBoxGeo(0.1, 0.7, 0.85), MATERIALS.tigerDark(), [-0.3, 0.45, 0]));
  g.add(mesh('stripe2', getBoxGeo(0.1, 0.7, 0.85), MATERIALS.tigerDark(), [0.2, 0.45, 0]));
  g.add(mesh('stripe3', getBoxGeo(0.1, 0.7, 0.85), MATERIALS.tigerDark(), [0.7, 0.45, 0]));
  // Legs
  g.add(mesh('leg_fl', getBoxGeo(0.25, 0.6, 0.25), MATERIALS.tiger(), [0.8, -0.2, 0.25]));
  g.add(mesh('leg_fr', getBoxGeo(0.25, 0.6, 0.25), MATERIALS.tiger(), [0.8, -0.2, -0.25]));
  g.add(mesh('leg_bl', getBoxGeo(0.25, 0.6, 0.25), MATERIALS.tiger(), [-0.7, -0.2, 0.25]));
  g.add(mesh('leg_br', getBoxGeo(0.25, 0.6, 0.25), MATERIALS.tiger(), [-0.7, -0.2, -0.25]));
  // Tail
  g.add(mesh('tail', getBoxGeo(0.6, 0.15, 0.15), MATERIALS.tigerDark(), [-1.5, 0.6, 0], [0, 0, 0.3]));
  g.add(mesh('shadow', getCylGeo(0.9, 0.9, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }), [0, -0.5, 0]));
  return g;
}

function buildUlar() {
  const g = new THREE.Group();
  g.name = 'ular_model';
  // Snake — long, low, sinuous
  const bodySegments = 5;
  for (let i = 0; i < bodySegments; i++) {
    const x = (i - 2) * 0.6;
    const width = i === bodySegments - 1 ? 0.6 : 0.5;
    g.add(mesh(`seg_${i}`, getBoxGeo(width, 0.35, 0.5), 
      i === bodySegments - 1 ? MATERIALS.snakeLight() : MATERIALS.snake(), [x, 0.2, 0]));
  }
  // Head
  g.add(mesh('head', getBoxGeo(0.5, 0.4, 0.55), MATERIALS.snakeLight(), [1.8, 0.25, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.08), MATERIALS.eyeRed(), [2.0, 0.35, 0.2]));
  g.add(mesh('eye_r', getSphereGeo(0.08), MATERIALS.eyeRed(), [2.0, 0.35, -0.2]));
  // Tongue
  g.add(mesh('tongue', getBoxGeo(0.3, 0.05, 0.05), MATERIALS.fire(), [2.2, 0.25, 0]));
  g.add(mesh('shadow', getCylGeo(1.0, 1.0, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }), [0, -0.15, 0]));
  return g;
}

function buildIblisKecil() {
  const g = new THREE.Group();
  g.name = 'iblis_kecil_model';
  // Small demon with horns
  g.add(mesh('body', getBoxGeo(1.0, 1.0, 0.7), MATERIALS.demonRed(), [0, 0.3, 0]));
  g.add(mesh('head', getBoxGeo(1.2, 0.7, 0.8), MATERIALS.demonDark(), [0, 1.1, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.12), MATERIALS.eyeOrange(), [-0.3, 1.2, 0.35]));
  g.add(mesh('eye_r', getSphereGeo(0.12), MATERIALS.eyeOrange(), [0.3, 1.2, 0.35]));
  // Horns
  g.add(mesh('horn_l', getCylGeo(0.05, 0.12, 0.5, 6), MATERIALS.demonRed(), [-0.4, 1.65, 0]));
  g.add(mesh('horn_r', getCylGeo(0.05, 0.12, 0.5, 6), MATERIALS.demonRed(), [0.4, 1.65, 0]));
  // Arms
  g.add(mesh('arm_l', getBoxGeo(0.3, 0.8, 0.3), MATERIALS.demonRed(), [-0.75, 0.3, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.3, 0.8, 0.3), MATERIALS.demonRed(), [0.75, 0.3, 0]));
  g.add(mesh('shadow', getCylGeo(0.5, 0.5, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }), [0, -0.5, 0]));
  return g;
}

function buildGolemApi() {
  const g = new THREE.Group();
  g.name = 'golem_api_model';
  // Large fire golem
  g.add(mesh('body', getBoxGeo(2.0, 1.6, 1.2), MATERIALS.giant(), [0, 0.5, 0]));
  g.add(mesh('head', getBoxGeo(2.2, 0.9, 1.3), MATERIALS.giantDark(), [0, 1.7, 0]));
  g.add(mesh('eye_l', getBoxGeo(0.3, 0.25, 0.15), MATERIALS.eyeOrange(), [-0.5, 1.85, 0.6]));
  g.add(mesh('eye_r', getBoxGeo(0.3, 0.25, 0.15), MATERIALS.eyeOrange(), [0.5, 1.85, 0.6]));
  g.add(mesh('mouth', getBoxGeo(0.6, 0.2, 0.2), MATERIALS.stoneDark(), [0, 1.45, 0.6]));
  // Lava cracks
  g.add(mesh('lava_l', getBoxGeo(0.4, 0.2, 0.1), MATERIALS.lava(), [-0.5, 0.4, 0.65]));
  g.add(mesh('lava_r', getBoxGeo(0.4, 0.2, 0.1), MATERIALS.lava(), [0.5, 0.4, 0.65]));
  // Arms
  g.add(mesh('arm_l', getBoxGeo(0.6, 1.4, 0.6), MATERIALS.giant(), [-1.5, 0.3, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.6, 1.4, 0.6), MATERIALS.giant(), [1.5, 0.3, 0]));
  g.add(mesh('shadow', getCylGeo(1.0, 1.0, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }), [0, -0.5, 0]));
  return g;
}

function buildIkanPedang() {
  const g = new THREE.Group();
  g.name = 'ikan_pedang_model';
  // Swordfish — streamlined with nose spike
  g.add(mesh('body', getBoxGeo(1.6, 0.6, 0.5), MATERIALS.fishBlue(), [0, 0.3, 0]));
  g.add(mesh('head', getBoxGeo(0.6, 0.5, 0.5), MATERIALS.fishBlue(), [1.1, 0.3, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.08), MATERIALS.eyeCyan(), [1.2, 0.4, 0.2]));
  g.add(mesh('eye_r', getSphereGeo(0.08), MATERIALS.eyeCyan(), [1.2, 0.4, -0.2]));
  // Sword nose
  g.add(mesh('nose', getBoxGeo(0.8, 0.12, 0.08), MATERIALS.silver(), [1.8, 0.3, 0]));
  // Fin
  g.add(mesh('fin', getBoxGeo(0.6, 0.5, 0.06), MATERIALS.fishBlue(), [-0.3, 0.75, 0]));
  // Tail
  g.add(mesh('tail', getBoxGeo(0.3, 0.5, 0.06), MATERIALS.fishBlue(), [-1.1, 0.3, 0], [0, 0, 0.3]));
  g.add(mesh('shadow', getCylGeo(0.7, 0.7, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }), [0, -0.15, 0]));
  return g;
}

function buildUburUbur() {
  const g = new THREE.Group();
  g.name = 'ubur_ubur_model';
  // Jellyfish — bulbous top, dangling tentacles
  g.add(mesh('bell', getCylGeo(0.7, 0.4, 0.8, 10), MATERIALS.jellyfish(), [0, 0.6, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.12), MATERIALS.eyeCyan(), [-0.25, 0.5, 0.5]));
  g.add(mesh('eye_r', getSphereGeo(0.12), MATERIALS.eyeCyan(), [0.25, 0.5, 0.5]));
  // Tentacles
  g.add(mesh('tent_l', getBoxGeo(0.1, 0.8, 0.1), MATERIALS.jellyfish(), [-0.35, -0.1, 0]));
  g.add(mesh('tent_m', getBoxGeo(0.1, 1.0, 0.1), MATERIALS.jellyfish(), [0, -0.2, 0]));
  g.add(mesh('tent_r', getBoxGeo(0.1, 0.8, 0.1), MATERIALS.jellyfish(), [0.35, -0.1, 0]));
  // Electric aura
  g.add(mesh('aura', getCylGeo(1.0, 1.0, 1.6, 10), 
    new THREE.MeshBasicMaterial({ color: 0x00CED1, transparent: true, opacity: 0.1 }), [0, 0.3, 0]));
  g.add(mesh('shadow', getCylGeo(0.5, 0.5, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 }), [0, -0.9, 0]));
  return g;
}

function buildPrajuritJahat() {
  const g = new THREE.Group();
  g.name = 'prajurit_jahat_model';
  // Evil soldier with armor and shield
  g.add(mesh('body', getBoxGeo(1.2, 1.2, 0.7), MATERIALS.soldier(), [0, 0.4, 0]));
  g.add(mesh('head', getBoxGeo(1.0, 0.7, 0.8), MATERIALS.soldierDark(), [0, 1.3, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.1), MATERIALS.eyeRed(), [-0.25, 1.4, 0.35]));
  g.add(mesh('eye_r', getSphereGeo(0.1), MATERIALS.eyeRed(), [0.25, 1.4, 0.35]));
  // Helmet
  g.add(mesh('helmet', getBoxGeo(1.1, 0.3, 0.9), MATERIALS.iron(), [0, 1.7, 0]));
  // Sword
  g.add(mesh('sword', getBoxGeo(0.12, 1.2, 0.08), MATERIALS.steel(), [0.85, 0.7, 0.3]));
  g.add(mesh('sword_guard', getBoxGeo(0.35, 0.1, 0.12), MATERIALS.gold(), [0.85, 0.2, 0.3]));
  // Shield (on left arm)
  g.add(mesh('shield', getBoxGeo(0.6, 0.9, 0.1), MATERIALS.iron(), [-0.9, 0.5, 0.3]));
  // Legs
  g.add(mesh('leg_l', getBoxGeo(0.35, 0.9, 0.35), MATERIALS.soldierDark(), [-0.3, -0.7, 0]));
  g.add(mesh('leg_r', getBoxGeo(0.35, 0.9, 0.35), MATERIALS.soldierDark(), [0.3, -0.7, 0]));
  g.add(mesh('shadow', getCylGeo(0.7, 0.7, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }), [0, -1.15, 0]));
  return g;
}

function buildRaksasaKecil() {
  const g = new THREE.Group();
  g.name = 'raksasa_kecil_model';
  // Small giant — stocky, heavy
  g.add(mesh('body', getBoxGeo(1.6, 1.4, 0.9), MATERIALS.giant(), [0, 0.5, 0]));
  g.add(mesh('head', getBoxGeo(1.8, 0.8, 1.0), MATERIALS.giantDark(), [0, 1.6, 0]));
  g.add(mesh('eye_l', getBoxGeo(0.25, 0.2, 0.1), MATERIALS.eyeRed(), [-0.4, 1.7, 0.5]));
  g.add(mesh('eye_r', getBoxGeo(0.25, 0.2, 0.1), MATERIALS.eyeRed(), [0.4, 1.7, 0.5]));
  // Thick arms
  g.add(mesh('arm_l', getBoxGeo(0.5, 1.2, 0.5), MATERIALS.giant(), [-1.2, 0.3, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.5, 1.2, 0.5), MATERIALS.giant(), [1.2, 0.3, 0]));
  // Legs
  g.add(mesh('leg_l', getBoxGeo(0.45, 0.9, 0.45), MATERIALS.giantDark(), [-0.4, -0.7, 0]));
  g.add(mesh('leg_r', getBoxGeo(0.45, 0.9, 0.45), MATERIALS.giantDark(), [0.4, -0.7, 0]));
  g.add(mesh('shadow', getCylGeo(0.9, 0.9, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }), [0, -1.15, 0]));
  return g;
}

// ============================================================
// BOSS MODELS — 5 unique bosses with distinctive silhouettes
// ============================================================

function buildPenjagaBatu() {
  const g = new THREE.Group();
  g.name = 'penjaga_batu_model';
  // Massive stone guardian
  g.add(mesh('body', getBoxGeo(3.0, 2.8, 1.5), MATERIALS.stone(), [0, 0.8, 0]));
  g.add(mesh('head', getBoxGeo(3.5, 1.0, 1.6), MATERIALS.stoneDark(), [0, 2.8, 0]));
  g.add(mesh('face', getBoxGeo(2.5, 0.8, 0.4), MATERIALS.stoneLight(), [0, 2.7, 0.7]));
  g.add(mesh('eye_l', getBoxGeo(0.4, 0.25, 0.15), MATERIALS.eyeRed(), [-0.7, 2.85, 0.85]));
  g.add(mesh('eye_r', getBoxGeo(0.4, 0.25, 0.15), MATERIALS.eyeRed(), [0.7, 2.85, 0.85]));
  // Massive arms
  g.add(mesh('arm_l', getBoxGeo(0.8, 2.0, 0.8), MATERIALS.stone(), [-2.1, 0.3, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.8, 2.0, 0.8), MATERIALS.stone(), [2.1, 0.3, 0]));
  // Gold ornamentation
  g.add(mesh('gold1', getBoxGeo(1.2, 0.2, 0.1), MATERIALS.gold(), [0, 1.2, 0.78]));
  g.add(mesh('gold2', getBoxGeo(0.6, 0.2, 0.1), MATERIALS.gold(), [0, 0.7, 0.78]));
  // Legs
  g.add(mesh('leg_l', getBoxGeo(0.7, 1.0, 0.7), MATERIALS.stoneDark(), [-0.8, -1.0, 0]));
  g.add(mesh('leg_r', getBoxGeo(0.7, 1.0, 0.7), MATERIALS.stoneDark(), [0.8, -1.0, 0]));
  g.add(mesh('shadow', getCylGeo(1.5, 1.5, 0.05, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }), [0, -1.5, 0]));
  return g;
}

function buildRajaHutan() {
  const g = new THREE.Group();
  g.name = 'raja_hutan_model';
  // Giant tiger king
  g.add(mesh('body', getBoxGeo(3.0, 1.5, 1.2), MATERIALS.tiger(), [0, 0.6, 0]));
  g.add(mesh('head', getBoxGeo(1.5, 1.0, 1.2), MATERIALS.tigerDark(), [1.8, 0.9, 0]));
  g.add(mesh('eye_l', getSphereGeo(0.15), MATERIALS.eyeGold(), [2.2, 1.1, 0.45]));
  g.add(mesh('eye_r', getSphereGeo(0.15), MATERIALS.eyeGold(), [2.2, 1.1, -0.45]));
  // Stripes
  g.add(mesh('stripe1', getBoxGeo(0.12, 1.2, 1.25), MATERIALS.tigerDark(), [-0.5, 0.65, 0]));
  g.add(mesh('stripe2', getBoxGeo(0.12, 1.2, 1.25), MATERIALS.tigerDark(), [0.4, 0.65, 0]));
  g.add(mesh('stripe3', getBoxGeo(0.12, 1.2, 1.25), MATERIALS.tigerDark(), [1.3, 0.65, 0]));
  // Clawed arms
  g.add(mesh('arm_l', getBoxGeo(0.5, 1.4, 0.5), MATERIALS.tiger(), [-1.7, 0.3, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.5, 1.4, 0.5), MATERIALS.tiger(), [1.0, 0.3, 0]));
  // Legs
  g.add(mesh('leg_fl', getBoxGeo(0.35, 0.8, 0.35), MATERIALS.tigerDark(), [1.2, -0.4, 0.35]));
  g.add(mesh('leg_fr', getBoxGeo(0.35, 0.8, 0.35), MATERIALS.tigerDark(), [1.2, -0.4, -0.35]));
  g.add(mesh('leg_bl', getBoxGeo(0.35, 0.8, 0.35), MATERIALS.tigerDark(), [-1.2, -0.4, 0.35]));
  g.add(mesh('leg_br', getBoxGeo(0.35, 0.8, 0.35), MATERIALS.tigerDark(), [-1.2, -0.4, -0.35]));
  // Tail
  g.add(mesh('tail', getBoxGeo(1.0, 0.2, 0.2), MATERIALS.tigerDark(), [-2.2, 0.8, 0], [0, 0, 0.4]));
  g.add(mesh('shadow', getCylGeo(1.5, 1.5, 0.05, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }), [0, -1.0, 0]));
  return g;
}

function buildNagaApi() {
  const g = new THREE.Group();
  g.name = 'naga_api_model';
  // Fire dragon — tall, horned
  g.add(mesh('body', getBoxGeo(3.2, 2.5, 1.4), MATERIALS.demonRed(), [0, 0.8, 0]));
  g.add(mesh('head', getBoxGeo(2.5, 1.0, 1.5), MATERIALS.demonDark(), [0, 2.5, 0]));
  g.add(mesh('snout', getBoxGeo(1.2, 0.5, 0.8), MATERIALS.demonDark(), [1.2, 2.2, 0]));
  g.add(mesh('eye_l', getBoxGeo(0.3, 0.25, 0.15), MATERIALS.eyeOrange(), [-0.4, 2.7, 0.7]));
  g.add(mesh('eye_r', getBoxGeo(0.3, 0.25, 0.15), MATERIALS.eyeOrange(), [0.4, 2.7, 0.7]));
  // Horns
  g.add(mesh('horn_l', getCylGeo(0.08, 0.18, 0.8, 6), MATERIALS.demonDark(), [-0.8, 3.4, 0]));
  g.add(mesh('horn_r', getCylGeo(0.08, 0.18, 0.8, 6), MATERIALS.demonDark(), [0.8, 3.4, 0]));
  // Wings (flat planes)
  g.add(mesh('wing_l', getBoxGeo(0.1, 1.5, 1.5), MATERIALS.demonRed(), [-1.8, 1.5, -0.5], [0, 0, 0.3]));
  g.add(mesh('wing_r', getBoxGeo(0.1, 1.5, 1.5), MATERIALS.demonRed(), [1.8, 1.5, -0.5], [0, 0, -0.3]));
  // Tail
  g.add(mesh('tail', getBoxGeo(1.2, 0.3, 0.3), MATERIALS.demonDark(), [-2.3, 0.5, 0], [0, 0, 0.5]));
  // Fire belly
  g.add(mesh('fire_belly', getBoxGeo(1.5, 1.0, 0.2), MATERIALS.lava(), [0, 0.5, 0.72]));
  g.add(mesh('shadow', getCylGeo(1.8, 1.8, 0.05, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }), [0, -1.0, 0]));
  return g;
}

function buildRaksasaLaut() {
  const g = new THREE.Group();
  g.name = 'raksasa_laut_model';
  // Sea giant with tentacles
  g.add(mesh('body', getBoxGeo(3.5, 2.8, 1.5), MATERIALS.fishBlue(), [0, 0.8, 0]));
  g.add(mesh('head', getBoxGeo(3.0, 1.0, 1.6), MATERIALS.stoneDark(), [0, 2.7, 0]));
  g.add(mesh('crown', getBoxGeo(2.2, 0.4, 1.2), MATERIALS.water(), [0, 3.4, 0]));
  g.add(mesh('eye_l', getBoxGeo(0.35, 0.3, 0.15), MATERIALS.eyeBlue(), [-0.7, 2.85, 0.75]));
  g.add(mesh('eye_r', getBoxGeo(0.35, 0.3, 0.15), MATERIALS.eyeBlue(), [0.7, 2.85, 0.75]));
  // Tentacles instead of arms
  g.add(mesh('tent_l1', getBoxGeo(0.5, 2.0, 0.5), MATERIALS.fishBlue(), [-2.2, 0.5, 0]));
  g.add(mesh('tent_r1', getBoxGeo(0.5, 2.0, 0.5), MATERIALS.fishBlue(), [2.2, 0.5, 0]));
  g.add(mesh('tent_l2', getBoxGeo(0.35, 1.4, 0.35), MATERIALS.stoneDark(), [-1.8, -0.5, 0.3]));
  g.add(mesh('tent_r2', getBoxGeo(0.35, 1.4, 0.35), MATERIALS.stoneDark(), [1.8, -0.5, 0.3]));
  // Water aura
  g.add(mesh('water_aura', getCylGeo(2.2, 2.2, 3.5, 10), 
    new THREE.MeshBasicMaterial({ color: 0x1E5A8E, transparent: true, opacity: 0.08 }), [0, 1.0, 0]));
  g.add(mesh('shadow', getCylGeo(1.8, 1.8, 0.05, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }), [0, -1.2, 0]));
  return g;
}

function buildRaksasaTerakhir() {
  const g = new THREE.Group();
  g.name = 'raksasa_terakhir_model';
  // Final boss — towering, crowned, divine
  g.add(mesh('body', getBoxGeo(3.8, 2.8, 1.6), MATERIALS.giant(), [0, 0.8, 0]));
  g.add(mesh('head', getBoxGeo(3.2, 1.0, 1.7), MATERIALS.giantDark(), [0, 2.7, 0]));
  // Crown
  g.add(mesh('crown', getBoxGeo(2.4, 0.5, 1.4), MATERIALS.crown(), [0, 3.5, 0]));
  g.add(mesh('crown_l', getBoxGeo(0.35, 0.5, 0.35), MATERIALS.crown(), [-0.9, 4.0, 0]));
  g.add(mesh('crown_m', getBoxGeo(0.35, 0.5, 0.35), MATERIALS.crown(), [0, 4.0, 0]));
  g.add(mesh('crown_r', getBoxGeo(0.35, 0.5, 0.35), MATERIALS.crown(), [0.9, 4.0, 0]));
  // Eyes
  g.add(mesh('eye_l', getBoxGeo(0.4, 0.3, 0.15), MATERIALS.eyeGold(), [-0.7, 2.85, 0.82]));
  g.add(mesh('eye_r', getBoxGeo(0.4, 0.3, 0.15), MATERIALS.eyeGold(), [0.7, 2.85, 0.82]));
  // Arms with gold armor
  g.add(mesh('arm_l', getBoxGeo(0.7, 2.0, 0.7), MATERIALS.giantDark(), [-2.5, 0.5, 0]));
  g.add(mesh('arm_r', getBoxGeo(0.7, 2.0, 0.7), MATERIALS.giantDark(), [2.5, 0.5, 0]));
  // Gold armor plates
  g.add(mesh('armor1', getBoxGeo(2.8, 0.2, 0.1), MATERIALS.gold(), [0, 1.3, 0.82]));
  g.add(mesh('armor2', getBoxGeo(2.2, 0.2, 0.1), MATERIALS.gold(), [0, 0.7, 0.82]));
  // Shield on left arm
  g.add(mesh('shield', getBoxGeo(0.8, 1.2, 0.12), MATERIALS.crown(), [-2.7, 0.8, 0.3]));
  // Legs
  g.add(mesh('leg_l', getBoxGeo(0.6, 1.2, 0.6), MATERIALS.giantDark(), [-0.9, -1.0, 0]));
  g.add(mesh('leg_r', getBoxGeo(0.6, 1.2, 0.6), MATERIALS.giantDark(), [0.9, -1.0, 0]));
  // Divine aura
  g.add(mesh('divine', getCylGeo(2.5, 2.5, 4.5, 10), 
    new THREE.MeshBasicMaterial({ color: 0xD4AF37, transparent: true, opacity: 0.05 }), [0, 1.5, 0]));
  g.add(mesh('shadow', getCylGeo(2.0, 2.0, 0.05, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }), [0, -1.6, 0]));
  return g;
}

// ============================================================
// NPC MODEL
// ============================================================

function buildNPCModel() {
  const g = new THREE.Group();
  g.name = 'npc_model';
  // Merchant/sage NPC
  g.add(mesh('body', getBoxGeo(1.2, 1.0, 0.7), MATERIALS.clothBrown(), [0, 0.3, 0]));
  g.add(mesh('head', getBoxGeo(0.9, 0.8, 0.8), MATERIALS.skin(), [0, 1.2, 0]));
  g.add(mesh('wrap', getBoxGeo(1.1, 0.5, 0.85), MATERIALS.clothGreen(), [0, 1.5, 0]));
  g.add(mesh('eye_l', getBoxGeo(0.12, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x000000 }), [-0.2, 1.25, 0.38]));
  g.add(mesh('eye_r', getBoxGeo(0.12, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x000000 }), [0.2, 1.25, 0.38]));
  g.add(mesh('headband', getBoxGeo(1.0, 0.2, 0.85), MATERIALS.headband(), [0, 1.55, 0]));
  // Legs
  g.add(mesh('leg_l', getBoxGeo(0.35, 0.7, 0.35), MATERIALS.clothBrown(), [-0.3, -0.6, 0]));
  g.add(mesh('leg_r', getBoxGeo(0.35, 0.7, 0.35), MATERIALS.clothBrown(), [0.3, -0.6, 0]));
  g.add(mesh('shadow', getCylGeo(0.6, 0.6, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }), [0, -0.95, 0]));
  return g;
}

// ============================================================
// ITEM MODELS
// ============================================================

function buildPotionModel() {
  const g = new THREE.Group();
  g.name = 'potion_model';
  g.add(mesh('bottle', getCylGeo(0.2, 0.25, 0.5, 8), MATERIALS.heal(), [0, 0.25, 0]));
  g.add(mesh('cap', getCylGeo(0.12, 0.12, 0.12, 6), MATERIALS.clothGreen(), [0, 0.55, 0]));
  return g;
}

function buildKristalModel() {
  const g = new THREE.Group();
  g.name = 'kristal_model';
  g.add(mesh('gem', getCylGeo(0, 0.3, 0.5, 6), MATERIALS.eyeCyan(), [0, 0.25, 0]));
  g.add(mesh('glow', getSphereGeo(0.4), 
    new THREE.MeshBasicMaterial({ color: 0x00CED1, transparent: true, opacity: 0.15 }), [0, 0.25, 0]));
  return g;
}

function buildKunciModel() {
  const g = new THREE.Group();
  g.name = 'kunci_model';
  g.add(mesh('head', getCylGeo(0.2, 0.2, 0.08, 10), MATERIALS.gold(), [0, 0.2, 0]));
  g.add(mesh('shaft', getBoxGeo(0.06, 0.4, 0.06), MATERIALS.gold(), [0, -0.1, 0]));
  return g;
}

function buildRupiahModel() {
  const g = new THREE.Group();
  g.name = 'rupiah_model';
  g.add(mesh('coin', getCylGeo(0.25, 0.25, 0.06, 10), MATERIALS.gold(), [0, 0.15, 0], [Math.PI / 2, 0, 0]));
  return g;
}

// ============================================================
// REGISTRATION — Called once at startup
// ============================================================

/**
 * Build and register all procedural models.
 * Called from main.js during initialization.
 */
export function buildAllModels() {
  // Player
  registerBaseModel('player', buildPlayerModel());

  // Enemies (10 types)
  registerBaseModel('batu_kecil', buildBatuKecil());
  registerBaseModel('patung', buildPatung());
  registerBaseModel('harimau', buildHarimau());
  registerBaseModel('ular', buildUlar());
  registerBaseModel('iblis_kecil', buildIblisKecil());
  registerBaseModel('golem_api', buildGolemApi());
  registerBaseModel('ikan_pedang', buildIkanPedang());
  registerBaseModel('ubur_ubur', buildUburUbur());
  registerBaseModel('prajurit_jahat', buildPrajuritJahat());
  registerBaseModel('raksasa_kecil', buildRaksasaKecil());

  // Bosses (5)
  registerBaseModel('penjaga_batu', buildPenjagaBatu());
  registerBaseModel('raja_hutan', buildRajaHutan());
  registerBaseModel('naga_api', buildNagaApi());
  registerBaseModel('raksasa_laut', buildRaksasaLaut());
  registerBaseModel('raksasa_terakhir', buildRaksasaTerakhir());

  // NPCs
  registerBaseModel('npc', buildNPCModel());

  // Items
  registerBaseModel('potion', buildPotionModel());
  registerBaseModel('kristal', buildKristalModel());
  registerBaseModel('kunci', buildKunciModel());
  registerBaseModel('rupiah', buildRupiahModel());

  console.log('[ModelBuilder] All procedural models registered');
}
