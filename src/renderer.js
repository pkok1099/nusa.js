// ============================================================
// renderer.js — Three.js scene, camera, renderer, mesh pool
// Phase 5: Post-processing integration, shadow mapping enabled
// Phase 4: 3D models, depth tiles, enhanced lighting
// Phase 3: PerspectiveCamera, world-space rendering, lock-on
// ============================================================

import * as THREE from 'three';
import { GAME_W, GAME_H, TILE, C } from './config.js';
import { initCamera3D, getCamera3D, resizeCamera, setCameraShake } from './camera.js';
import { cloneModel, hasModel } from './asset-manager.js';

// ---- Three.js core objects ----
let scene, renderer;
let canvas;
let cam3D = null;

// ---- Mesh pool for retained-mode rendering ----
const meshPool = new Map();   // key → THREE.Mesh or THREE.Group
let activeKeys = new Set();   // Keys touched this frame (for GC)

// ---- Background gradient mesh ----
let bgMesh = null;

// ---- Tile InstancedMesh ----
let tileInstancedMesh = null;
const MAX_TILES = 20000;
let tileCount = 0;
let tileColors = [];

// ---- Particle Points system ----
let particlePoints = null;
const MAX_PARTICLES = 500;

// ---- Phase 5: Post-processing flag ----
let usePostProcessing = false;

// ============================================================
// INITIALIZATION
// ============================================================

export function initRenderer(canvasElement) {
  canvas = canvasElement;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0A0A);

  // Phase 3: PerspectiveCamera from camera.js
  cam3D = initCamera3D();
  cam3D.position.set(GAME_W / 2, -(GAME_H / 2), 480);
  cam3D.lookAt(GAME_W / 2, -GAME_H / 2, 0);

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: false, // Pixel art style
    alpha: false,
  });
  renderer.setSize(GAME_W, GAME_H, false);
  renderer.setPixelRatio(1);
  renderer.sortObjects = true;
  // Phase 5: Shadow mapping enabled for depth and atmosphere
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Phase 4: Enhanced lighting for 3D models
  const ambient = new THREE.AmbientLight(0xE8D5A3, 0.6); // Warm ambient (Indonesian temple)
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xFFF5E0, 0.8); // Main sun
  mainLight.position.set(200, -300, 400);
  mainLight.castShadow = true; // Phase 5: Shadows enabled
  mainLight.shadow.mapSize.set(1024, 1024);
  mainLight.shadow.camera.near = 1;
  mainLight.shadow.camera.far = 2000;
  mainLight.shadow.camera.left = -600;
  mainLight.shadow.camera.right = 600;
  mainLight.shadow.camera.top = 400;
  mainLight.shadow.camera.bottom = -400;
  mainLight.shadow.bias = -0.001;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x8899BB, 0.3); // Cool fill
  fillLight.position.set(-100, 50, 200);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xD4AF37, 0.15); // Gold rim (Nusantara theme)
  rimLight.position.set(0, 0, -100);
  scene.add(rimLight);

  // Background gradient plane (fills visible area, positioned relative to camera)
  createBackgroundGradient();

  return renderer;
}

// ============================================================
// BACKGROUND GRADIENT
// ============================================================

function createBackgroundGradient() {
  const geo = new THREE.PlaneGeometry(GAME_W * 3, GAME_H * 3);
  const gradCanvas = document.createElement('canvas');
  gradCanvas.width = 2;
  gradCanvas.height = GAME_H;
  const gradCtx = gradCanvas.getContext('2d');
  const grad = gradCtx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, '#0D0A1A');
  grad.addColorStop(0.5, '#1A0A2E');
  grad.addColorStop(1, '#0A0A0A');
  gradCtx.fillStyle = grad;
  gradCtx.fillRect(0, 0, 2, GAME_H);

  const tex = new THREE.CanvasTexture(gradCanvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.MeshBasicMaterial({ map: tex, depthWrite: false });
  bgMesh = new THREE.Mesh(geo, mat);
  bgMesh.renderOrder = -1000;
  scene.add(bgMesh);
}

/** Update background gradient colors per stage */
export function updateBackground(bg1, bg2) {
  if (!bgMesh) return;
  const gradCanvas = document.createElement('canvas');
  gradCanvas.width = 2;
  gradCanvas.height = GAME_H;
  const gradCtx = gradCanvas.getContext('2d');
  const grad = gradCtx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, bg1);
  grad.addColorStop(0.5, bg2);
  grad.addColorStop(1, '#0A0A0A');
  gradCtx.fillStyle = grad;
  gradCtx.fillRect(0, 0, 2, GAME_H);

  bgMesh.material.map.dispose();
  bgMesh.material.map = new THREE.CanvasTexture(gradCanvas);
  bgMesh.material.map.minFilter = THREE.LinearFilter;
  bgMesh.material.needsUpdate = true;
}

// ============================================================
// MESH POOL — Begin/End frame pattern
// ============================================================

/** Call at the start of each render frame. Marks all meshes as stale. */
export function beginFrame() {
  activeKeys = new Set();
}

/** Call at the end of each render frame. Removes stale meshes. */
export function endFrame() {
  for (const [key, obj] of meshPool) {
    if (!activeKeys.has(key)) {
      scene.remove(obj);
      disposeObject(obj);
      meshPool.delete(key);
    }
  }
}

/** Dispose a mesh or group and its children */
function disposeObject(obj) {
  if (obj.children) {
    for (const child of obj.children) {
      disposeObject(child);
    }
  }
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => m.dispose());
    } else {
      obj.material.dispose();
    }
  }
}

// ============================================================
// COORDINATE CONVERSION — World-space (Phase 3)
// ============================================================

/** Convert game Y coordinate to Three.js Y coordinate (Y-down → Y-up) */
function gameToThreeY(y) {
  return -y;
}

/** Convert game position to Three.js position (center of rect) — WORLD SPACE */
function gameToThree(x, y, w, h) {
  return {
    x: x + w / 2,
    y: -(y + h / 2),
  };
}

// ============================================================
// MESH HELPERS — World-space colored rectangles
// ============================================================

/** Get or create a colored rectangle mesh positioned in WORLD SPACE */
export function drawRect(key, x, y, w, h, color, radius = 0) {
  activeKeys.add(key);
  let mesh = meshPool.get(key);

  const pos = gameToThree(x, y, w, h);
  const threeColor = new THREE.Color(color);

  if (!mesh) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: threeColor,
      depthWrite: false,
      transparent: true,
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 0;
    scene.add(mesh);
    meshPool.set(key, mesh);
  }

  mesh.position.set(pos.x, pos.y, 0);
  mesh.material.color.copy(threeColor);
  mesh.visible = true;

  return mesh;
}

/** Get or create a bar (two overlapping rectangles) — WORLD SPACE */
export function drawBar(key, x, y, w, h, pct, bgColor, fillColor, radius = 4) {
  activeKeys.add(key + '_bg');
  activeKeys.add(key + '_fill');

  const pos = gameToThree(x, y, w, h);

  // Background
  let bgMesh = meshPool.get(key + '_bg');
  if (!bgMesh) {
    bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(bgColor), depthWrite: false, transparent: true })
    );
    bgMesh.renderOrder = 0;
    scene.add(bgMesh);
    meshPool.set(key + '_bg', bgMesh);
  }
  bgMesh.position.set(pos.x, pos.y, 0.1);
  bgMesh.material.color.set(bgColor);

  // Fill
  const fillW = Math.max(1, w * pct);
  const fillX = x;
  const fillPos = gameToThree(fillX, y, fillW, h);

  let fillMesh = meshPool.get(key + '_fill');
  if (!fillMesh) {
    fillMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(fillW, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(fillColor), depthWrite: false, transparent: true })
    );
    fillMesh.renderOrder = 0;
    scene.add(fillMesh);
    meshPool.set(key + '_fill', fillMesh);
  }

  fillMesh.position.set(fillPos.x, fillPos.y, 0.2);
  fillMesh.material.color.set(fillColor);
  fillMesh.geometry.dispose();
  fillMesh.geometry = new THREE.PlaneGeometry(fillW, h);
}

/** Get or create an outline rectangle — WORLD SPACE */
export function drawOutline(key, x, y, w, h, color, lineWidth = 2, radius = 0) {
  activeKeys.add(key);
  let mesh = meshPool.get(key);

  const pos = gameToThree(x, y, w, h);

  if (!mesh) {
    const shapeGeo = new THREE.PlaneGeometry(w, h);
    const edges = new THREE.EdgesGeometry(shapeGeo);
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color) });
    mesh = new THREE.LineSegments(edges, mat);
    mesh.renderOrder = 1;
    scene.add(mesh);
    meshPool.set(key, mesh);
    shapeGeo.dispose();
  }

  mesh.position.set(pos.x, pos.y, 0.3);
  mesh.material.color.set(color);
}

// ============================================================
// ENTITY GROUP HELPERS — World-space positioning
// ============================================================

/** Get or create a THREE.Group for an entity */
export function getEntityGroup(key) {
  activeKeys.add(key);
  let group = meshPool.get(key);
  if (!group) {
    group = new THREE.Group();
    scene.add(group);
    meshPool.set(key, group);
  }
  return group;
}

/** Add a colored rectangle child to a group. Local coords (0,0 = top-left of entity) */
export function addRectToGroup(group, childKey, localX, localY, w, h, color) {
  const childName = '__rect_' + childKey;
  let mesh = group.getObjectByName(childName);

  const threeColor = new THREE.Color(color);
  const pos = gameToThree(localX, localY, w, h);

  if (!mesh) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({ color: threeColor, depthWrite: false, transparent: true });
    mesh = new THREE.Mesh(geo, mat);
    mesh.name = childName;
    mesh.renderOrder = 0;
    group.add(mesh);
  }

  mesh.position.set(pos.x - group.userData.width / 2, pos.y + group.userData.height / 2, 0);
  mesh.material.color.copy(threeColor);
  mesh.visible = true;

  return mesh;
}

/** Remove a child rectangle from a group by key */
export function removeRectFromGroup(group, childKey) {
  const childName = '__rect_' + childKey;
  const mesh = group.getObjectByName(childName);
  if (mesh) {
    group.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }
}

/** Clear all children from a group */
export function clearGroup(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(child);
  }
}

/**
 * Set group position in WORLD SPACE (no camera offset).
 * This is the Phase 3 version — objects live in world coordinates.
 */
export function setGroupWorldPos(group, gameX, gameY, cameraX, cameraY) {
  // Phase 3: cameraX/cameraY are ignored — objects are in world space
  // The PerspectiveCamera handles the view transformation
  const pos = gameToThree(gameX, gameY, 0, 0);
  group.position.set(pos.x, pos.y, 0);
}

/** Set group facing direction (1 = right, -1 = left) */
export function setGroupFacing(group, facing) {
  group.scale.x = facing;
}

// ============================================================
// CAMERA UPDATE — Position background relative to camera
// ============================================================

/** Update background mesh to follow camera position */
export function updateCameraPosition(cameraX, cameraY) {
  if (!cam3D) return;

  // Position background mesh relative to camera
  if (bgMesh) {
    // Background follows the camera's look-at point
    bgMesh.position.set(cam3D.position.x, cam3D.position.y, -10);
  }
}

/** Set screen shake offset — delegates to camera.js */
export function setShakeOffset(x, y) {
  setCameraShake(x, y);
}

// ============================================================
// TILE RENDERING (InstancedMesh for performance)
// ============================================================

/** Rebuild tile instances from tileMap data — WORLD SPACE */
export function rebuildTiles(tileMap, stageId, cameraX, cameraY, gameTime) {
  if (!tileMap || tileMap.length === 0) return;

  // Remove old tile mesh
  if (tileInstancedMesh) {
    scene.remove(tileInstancedMesh);
    tileInstancedMesh.geometry.dispose();
    tileInstancedMesh.material.dispose();
    tileInstancedMesh = null;
  }

  const H = tileMap.length;
  const W = tileMap[0].length;

  // Phase 3: Render all tiles in world space
  // For performance, we still do visibility culling using the camera position
  const vFov = 60 * Math.PI / 180; // CAMERA_FOV
  const visibleH = 2 * 480 * Math.tan(vFov / 2); // Approximate
  const visibleW = visibleH * (GAME_W / GAME_H);
  const camCenterX = cameraX + visibleW / 2;
  const camCenterY = cameraY + visibleH / 2;

  const startTX = Math.max(0, Math.floor((camCenterX - visibleW / 2 - TILE) / TILE));
  const endTX = Math.min(W, Math.ceil((camCenterX + visibleW / 2 + TILE) / TILE));
  const startTY = Math.max(0, Math.floor((camCenterY - visibleH / 2 - TILE) / TILE));
  const endTY = Math.min(H, Math.ceil((camCenterY + visibleH / 2 + TILE) / TILE));

  // Count visible tiles
  tileCount = 0;
  tileColors = [];
  const positions = [];

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = tileMap[ty][tx];
      if (tile === 0) continue;
      if (tileCount >= MAX_TILES) break;

      // Phase 3: World-space positioning (no camera offset subtraction)
      const wx = tx * TILE;
      const wy = ty * TILE;

      positions.push({ wx, wy, tile, tx, ty });
      tileCount++;

      const color = getTileColor(tile, stageId);
      tileColors.push(color);
    }
  }

  if (tileCount === 0) return;

  // Create InstancedMesh
  const geo = new THREE.PlaneGeometry(TILE, TILE);
  const mat = new THREE.MeshBasicMaterial({ depthWrite: false, transparent: true });
  tileInstancedMesh = new THREE.InstancedMesh(geo, mat, tileCount);
  tileInstancedMesh.renderOrder = -100;

  const dummy = new THREE.Object3D();
  const colorObj = new THREE.Color();

  for (let i = 0; i < tileCount; i++) {
    const p = positions[i];
    const pos = gameToThree(p.wx, p.wy, TILE, TILE);
    dummy.position.set(pos.x, pos.y, -5);
    dummy.updateMatrix();
    tileInstancedMesh.setMatrixAt(i, dummy.matrix);
    colorObj.set(tileColors[i]);
    tileInstancedMesh.setColorAt(i, colorObj);
  }

  tileInstancedMesh.instanceMatrix.needsUpdate = true;
  tileInstancedMesh.instanceColor.needsUpdate = true;
  scene.add(tileInstancedMesh);
}

/** Get tile color based on tile type and stage */
function getTileColor(tile, stageId) {
  switch (tile) {
    case 1: return stageId === 1 ? '#2D5A1E' : stageId === 2 ? '#5A2D1E' : stageId === 3 ? '#1E3A5A' : stageId === 4 ? '#5A4A1E' : '#8B8682';
    case 2: return '#8B8682';
    case 3: return '#CC3300';
    case 4: return '#1E5A8E';
    case 5: return '#6B4226';
    case 6: return '#2D5A1E';
    case 7: return '#6B6662';
    case 8: return stageId === 3 ? '#2A5A8A' : '#D4AF3720';
    case 9: return '#D4AF37';
    case 10: return '#D4AF3730';
    case 11: return '#D4AF37';
    case 12: return '#D4AF37';
    default: return '#333333';
  }
}

// ============================================================
// PARTICLE RENDERING (THREE.Points) — World space
// ============================================================

let particleGeometry = null;
let particleMaterial = null;

export function updateParticles(particles, cameraX, cameraY) {
  if (particlePoints) {
    scene.remove(particlePoints);
  }

  if (!particles || particles.length === 0) return;

  const count = Math.min(particles.length, MAX_PARTICLES);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = particles[i];
    // Phase 3: World-space positioning (no camera offset subtraction)
    const pos = gameToThree(p.x, p.y, 0, 0);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = 1;

    const c = new THREE.Color(p.color);
    const alpha = p.life / p.maxLife;
    colors[i * 3] = c.r * alpha;
    colors[i * 3 + 1] = c.g * alpha;
    colors[i * 3 + 2] = c.b * alpha;

    sizes[i] = p.size * 4;
  }

  if (!particleGeometry) {
    particleGeometry = new THREE.BufferGeometry();
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  if (!particleMaterial) {
    particleMaterial = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: false,
    });
  }

  particlePoints = new THREE.Points(particleGeometry, particleMaterial);
  particlePoints.renderOrder = 100;
  scene.add(particlePoints);
}

// ============================================================
// PARALLAX BACKGROUND LAYERS — Positioned relative to camera
// ============================================================

let parallaxMeshes = [];

/** Create/update parallax background layers — camera-relative */
export function updateParallaxBackground(stageId, cameraX, cameraY, gameTime) {
  parallaxMeshes.forEach(m => {
    scene.remove(m);
    disposeObject(m);
  });
  parallaxMeshes = [];

  // Near background silhouette — positioned relative to camera
  const nearGeo = createSilhouetteShape(stageId, cameraX, gameTime, 0.3);
  if (nearGeo) {
    const nearMat = new THREE.MeshBasicMaterial({
      color: stageId === 1 ? 0x081008 : stageId === 3 ? 0x030818 : 0x0F0818,
      depthWrite: false,
      transparent: true,
    });
    const nearMesh = new THREE.Mesh(nearGeo, nearMat);
    // Position relative to camera's current focus point
    const camFocusX = cameraX + GAME_W / 2;
    const camFocusY = cameraY + GAME_H / 2;
    const focusThree = gameToThree(camFocusX, camFocusY, 0, 0);
    nearMesh.position.set(focusThree.x, focusThree.y, -8);
    nearMesh.renderOrder = -200;
    scene.add(nearMesh);
    parallaxMeshes.push(nearMesh);
  }

  // Far background silhouette
  const farGeo = createSilhouetteShape(stageId, cameraX, gameTime, 0.15);
  if (farGeo) {
    const farMat = new THREE.MeshBasicMaterial({
      color: stageId === 1 ? 0x0A150D : stageId === 2 ? 0x1A0808 : stageId === 3 ? 0x050A1A : stageId === 4 ? 0x1A1A08 : 0x1A1020,
      depthWrite: false,
      transparent: true,
    });
    const farMesh = new THREE.Mesh(farGeo, farMat);
    const camFocusX = cameraX + GAME_W / 2;
    const camFocusY = cameraY + GAME_H / 2;
    const focusThree = gameToThree(camFocusX, camFocusY, 0, 0);
    farMesh.position.set(focusThree.x, focusThree.y, -9);
    farMesh.renderOrder = -300;
    scene.add(farMesh);
    parallaxMeshes.push(farMesh);
  }
}

/** Create a Shape geometry for background silhouette */
function createSilhouetteShape(stageId, cameraX, gameTime, parallaxFactor) {
  const shape = new THREE.Shape();
  shape.moveTo(-GAME_W / 2, -GAME_H / 2);

  for (let x = 0; x <= GAME_W; x += 30) {
    const h = Math.sin((x + cameraX * parallaxFactor) * 0.015) * 40 +
              Math.sin((x + cameraX * parallaxFactor) * 0.04) * 20;
    shape.lineTo(x - GAME_W / 2, -GAME_H / 2 + GAME_H - 60 + h);
  }

  shape.lineTo(GAME_W / 2, -GAME_H / 2 + GAME_H);
  shape.lineTo(-GAME_W / 2, -GAME_H / 2 + GAME_H);
  shape.closePath();

  return new THREE.ShapeGeometry(shape);
}

// ============================================================
// 3D MODEL PLACEMENT (Phase 4)
// ============================================================

/** Scale factor: game pixels → 3D units */
const MODEL_SCALE = 0.09;

/**
 * Place a 3D model clone in the scene at a game-world position.
 * Uses the mesh pool for lifecycle management.
 * @param {string} key — Unique entity key (for pool tracking)
 * @param {string} modelKey — Base model key (e.g., 'player', 'batu_kecil')
 * @param {number} gameX — Entity X in game coords (top-left)
 * @param {number} gameY — Entity Y in game coords (top-left)
 * @param {number} gameW — Entity width in game pixels
 * @param {number} gameH — Entity height in game pixels
 * @param {number} facing — 1 (right) or -1 (left)
 * @param {number} zOffset — Additional Z offset for depth sorting
 * @returns {THREE.Group|null} — The model group (or null if model not found)
 */
export function drawModel3D(key, modelKey, gameX, gameY, gameW, gameH, facing, zOffset = 0) {
  activeKeys.add(key);

  let model = meshPool.get(key);

  if (!model) {
    // Clone from base model
    if (!hasModel(modelKey)) {
      // Fallback: no model registered, skip
      return null;
    }
    model = cloneModel(modelKey);
    if (!model) return null;

    // Store model key for reference
    model.userData.modelKey = modelKey;
    model.userData.gameW = gameW;
    model.userData.gameH = gameH;

    scene.add(model);
    meshPool.set(key, model);
  }

  // Position: game coords → Three.js world coords
  // Center the model on the entity's center point
  const centerX = gameX + gameW / 2;
  const centerY = gameY + gameH / 2;
  const threePos = gameToThree(centerX, centerY, 0, 0);

  // Scale model to match entity game size
  // Base models are built at unit scale; we scale them to match game pixel dimensions
  const scaleX = (gameW * MODEL_SCALE) * facing; // Flip for facing direction
  const scaleY = gameH * MODEL_SCALE;
  const scaleZ = Math.min(gameW, gameH) * MODEL_SCALE; // Depth proportional to smaller dimension

  model.position.set(threePos.x, threePos.y, zOffset);
  model.scale.set(Math.abs(scaleX), scaleY, scaleZ);

  // Rotation: flip facing direction via scale.x sign
  if (facing < 0) {
    model.scale.x = -model.scale.x;
  }

  model.visible = true;
  return model;
}

/**
 * Get or create a 3D model for an entity without positioning it.
 * Useful when animation controller handles positioning.
 * @param {string} key — Unique entity key
 * @param {string} modelKey — Base model key
 * @returns {THREE.Group|null}
 */
export function getOrCreateModel3D(key, modelKey) {
  activeKeys.add(key);
  let model = meshPool.get(key);

  if (!model) {
    if (!hasModel(modelKey)) return null;
    model = cloneModel(modelKey);
    if (!model) return null;
    model.userData.modelKey = modelKey;
    scene.add(model);
    meshPool.set(key, model);
  }

  model.visible = true;
  return model;
}

/**
 * Position an existing 3D model in world space.
 * @param {THREE.Group} model — The model group
 * @param {number} gameX — Entity X in game coords
 * @param {number} gameY — Entity Y in game coords
 * @param {number} gameW — Entity width
 * @param {number} gameH — Entity height
 * @param {number} facing — 1 or -1
 * @param {number} zOffset — Z depth offset
 */
export function positionModel3D(model, gameX, gameY, gameW, gameH, facing, zOffset = 0) {
  if (!model) return;

  const centerX = gameX + gameW / 2;
  const centerY = gameY + gameH / 2;
  const threePos = gameToThree(centerX, centerY, 0, 0);

  const scaleX = (gameW * MODEL_SCALE);
  const scaleY = gameH * MODEL_SCALE;
  const scaleZ = Math.min(gameW, gameH) * MODEL_SCALE;

  model.position.set(threePos.x, threePos.y, zOffset);
  model.scale.set(facing < 0 ? -scaleX : scaleX, scaleY, scaleZ);
  model.visible = true;
}

// ============================================================
// 3D TILE RENDERING — Depth blocks with stage-themed materials
// ============================================================

// Tile depth cache (InstancedMesh groups per tile type)
let tile3DGroups = new Map(); // tileType → THREE.Group

/** Stage-themed tile materials */
function getTileMaterial(tileType, stageId) {
  const colors = {
    1: stageId === 1 ? 0x2D5A1E : stageId === 2 ? 0x5A2D1E : stageId === 3 ? 0x1E3A5A : stageId === 4 ? 0x5A4A1E : 0x8B8682,
    2: 0x8B8682,
    3: 0xCC3300,
    4: 0x1E5A8E,
    5: 0x6B4226,
    6: 0x2D5A1E,
    7: 0x6B6662,
    8: stageId === 3 ? 0x2A5A8A : 0xD4AF37,
    9: 0xD4AF37,
    10: 0xD4AF37,
    11: 0xD4AF37,
    12: 0xD4AF37,
  };
  const color = colors[tileType] || 0x333333;

  // Different roughness/metalness per tile type
  const isSpecial = tileType >= 9;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: isSpecial ? 0.4 : 0.85,
    metalness: isSpecial ? 0.4 : 0.05,
    transparent: tileType === 8 || tileType === 10,
    opacity: tileType === 10 ? 0.3 : tileType === 8 ? (stageId === 3 ? 0.6 : 0.12) : 1.0,
    flatShading: true,
  });
}

/** Get tile depth (3D thickness) based on type */
function getTileDepth(tileType) {
  switch (tileType) {
    case 1: return 4;    // Solid ground — thick
    case 2: return 3;    // Stone — medium
    case 3: return 2;    // Lava — thin (glow handled separately)
    case 4: return 1;    // Water — very thin (transparent)
    case 5: return 3;    // Wood — medium
    case 6: return 2;    // Grass — thin
    case 7: return 3;    // Dark stone — medium
    case 8: return 1;    // Decoration — very thin
    case 9: return 2;    // Checkpoint — medium (special object)
    case 10: return 1;   // Puzzle door — thin
    case 11: return 3;   // Exit door — medium
    case 12: return 2;   // Boss altar — medium
    default: return 2;
  }
}

/** Rebuild 3D tile blocks — replaces flat InstancedMesh with 3D boxes */
export function rebuildTiles3D(tileMap, stageId, cameraX, cameraY, gameTime) {
  // Remove old 3D tile groups
  for (const [type, group] of tile3DGroups) {
    scene.remove(group);
    group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
  tile3DGroups.clear();

  if (!tileMap || tileMap.length === 0) return;

  const H = tileMap.length;
  const W = tileMap[0].length;

  // Visibility culling
  const vFov = 60 * Math.PI / 180;
  const visibleH = 2 * 480 * Math.tan(vFov / 2);
  const visibleW = visibleH * (GAME_W / GAME_H);
  const camCenterX = cameraX + visibleW / 2;
  const camCenterY = cameraY + visibleH / 2;

  const startTX = Math.max(0, Math.floor((camCenterX - visibleW / 2 - TILE) / TILE));
  const endTX = Math.min(W, Math.ceil((camCenterX + visibleW / 2 + TILE) / TILE));
  const startTY = Math.max(0, Math.floor((camCenterY - visibleH / 2 - TILE) / TILE));
  const endTY = Math.min(H, Math.ceil((camCenterY + visibleH / 2 + TILE) / TILE));

  // Group tiles by type for batched rendering
  const tilesByType = new Map();

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = tileMap[ty][tx];
      if (tile === 0) continue;

      if (!tilesByType.has(tile)) {
        tilesByType.set(tile, []);
      }
      tilesByType.get(tile).push({ tx, ty });
    }
  }

  const S = MODEL_SCALE;
  const dummy = new THREE.Object3D();

  // Create InstancedMesh per tile type
  for (const [tileType, positions] of tilesByType) {
    const depth = getTileDepth(tileType);
    const mat = getTileMaterial(tileType, stageId);
    const geo = new THREE.BoxGeometry(TILE, TILE, depth);
    const instMesh = new THREE.InstancedMesh(geo, mat, positions.length);
    instMesh.renderOrder = -100;

    // Emissive for special tiles
    if (tileType === 9) {
      // Checkpoint — golden glow
      mat.emissive = new THREE.Color(0xD4AF37);
      mat.emissiveIntensity = Math.sin(gameTime * 0.08) * 0.3 + 0.3;
    } else if (tileType === 3) {
      // Lava — red glow
      mat.emissive = new THREE.Color(0x661100);
      mat.emissiveIntensity = 0.5;
    } else if (tileType === 12) {
      // Boss altar — red pulse
      mat.emissive = new THREE.Color(0xCC3300);
      mat.emissiveIntensity = Math.sin(gameTime * 0.08) * 0.2 + 0.2;
    }

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const pos = gameToThree(p.tx * TILE, p.ty * TILE, TILE, TILE);
      dummy.position.set(pos.x, pos.y, -depth / 2);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }

    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.castShadow = true;
    instMesh.receiveShadow = true;
    scene.add(instMesh);
    tile3DGroups.set(tileType, instMesh);
  }
}

// ============================================================
// RENDER
// ============================================================

/** Render the Three.js scene. Phase 5: delegates to post-processing if active. */
export function render() {
  if (!renderer || !scene || !cam3D) return;
  if (usePostProcessing) {
    // Post-processing pipeline handles rendering
    // (called from post-processing.js renderWithPostProcessing)
    return;
  }
  renderer.render(scene, cam3D);
}

/** Phase 5: Enable/disable post-processing rendering path */
export function setUsePostProcessing(enabled) {
  usePostProcessing = enabled;
}

/** Phase 5: Direct render call (bypasses post-processing, used by post-processing render pass) */
export function renderDirect() {
  if (!renderer || !scene || !cam3D) return;
  renderer.render(scene, cam3D);
}

/** Resize the renderer */
export function resizeRenderer() {
  if (!renderer) return;
  const ratio = GAME_W / GAME_H;
  let w = window.innerWidth, h = window.innerHeight;
  if (w / h > ratio) w = h * ratio; else h = w / ratio;
  renderer.setSize(w, h, false);
  resizeCamera();
  // Phase 5: Resize post-processing if active (imported dynamically)
  // Note: post-processing resize is handled by game.js resize handler
}

/** Get the Three.js scene */
export function getScene() { return scene; }

/** Get the Three.js camera */
export function getCamera() { return cam3D; }

/** Get the WebGLRenderer */
export function getRenderer() { return renderer; }

// ============================================================
// UTILITY — Color manipulation
// ============================================================

/** Parse hex color with alpha (e.g., '#D4AF3740') into RGBA */
export function parseHexAlpha(hex) {
  if (!hex || typeof hex !== 'string') return { r: 1, g: 1, b: 1, a: 1 };
  let clean = hex.replace('#', '');
  if (clean.length === 8) {
    return {
      r: parseInt(clean.substring(0, 2), 16) / 255,
      g: parseInt(clean.substring(2, 4), 16) / 255,
      b: parseInt(clean.substring(4, 6), 16) / 255,
      a: parseInt(clean.substring(6, 8), 16) / 255,
    };
  }
  return { r: 1, g: 1, b: 1, a: 1 };
}

/** Create a material with hex+alpha color */
export function createColorMaterial(hexColor) {
  const parsed = parseHexAlpha(hexColor);
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(parsed.r, parsed.g, parsed.b),
    transparent: true,
    opacity: parsed.a,
    depthWrite: false,
  });
}
