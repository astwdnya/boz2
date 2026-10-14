// ============================================================
// coop3d.js — True 3D Co-op Teammate Renderer
// ------------------------------------------------------------
// Renders remote co-op players as a REAL articulated 3D soldier
// inside the game's camera. The engine camera (vieworg + viewaxis
// + tanHalfFov) is read from KisakBlack WASM memory every frame by
// modmenu.js and passed here, so the soldier is projected with the
// exact same perspective the engine renders the world with — it
// walks, aims, crouches and dies in true 3D instead of the old
// flat 2D canvas drawing.
//
// Public API:
//   import { CoopSoldier3D } from './coop3d.js';
//   const r3d = new CoopSoldier3D();          // attaches lazily
//   r3d.update(teammates, camera, gameRect);  // every frame
//   r3d.dispose();
// ============================================================

const VERT = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uView;
uniform mat4 uProj;
uniform mat4 uModel;
varying vec3 vColor;
varying float vLight;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  gl_Position = uProj * uView * world;
  // Fixed directional light (sun from up-left-front) + ambient.
  vec3 n = normalize(mat3(uModel) * aNormal);
  vLight = clamp(0.42 + 0.58 * max(dot(n, normalize(vec3(-0.35, 0.75, 0.55))), 0.0), 0.0, 1.0);
  vColor = aColor;
}`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vLight;
uniform float uAlpha;
void main() {
  gl_FragColor = vec4(vColor * vLight, uAlpha);
}`;

// Box geometry: 24 verts (per-face normals), 36 indices.
function makeBox(minX, minY, minZ, maxX, maxY, maxZ, r, g, b) {
  const x0 = minX, y0 = minY, z0 = minZ, x1 = maxX, y1 = maxY, z1 = maxZ;
  const faces = [
    // normal, quad corners (CCW seen from outside)
    [[0, 0, 1],  [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
    [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]],
    [[1, 0, 0],  [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
    [[0, 1, 0],  [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]],
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
  ];
  const verts = [], idx = [];
  for (const [n, q] of faces) {
    const base = verts.length / 6;
    for (const p of q) verts.push(p[0], p[1], p[2], n[0], n[1], n[2], r, g, b);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { verts, idx };
}

function appendGeom(dst, box, transform) {
  const baseIdx = dst.verts.length / 9;
  const m = transform || ((x, y, z) => [x, y, z]);
  for (let i = 0; i < box.verts.length; i += 9) {
    const [px, py, pz] = m(box.verts[i], box.verts[i + 1], box.verts[i + 2]);
    const nx = box.verts[i + 3], ny = box.verts[i + 4], nz = box.verts[i + 5];
    // Rotate normal by the same rotation (transform returns pos + optional normal basis)
    let rn = [nx, ny, nz];
    if (m.rot) rn = m.rot(nx, ny, nz);
    dst.verts.push(px, py, pz, rn[0], rn[1], rn[2], box.verts[i + 6], box.verts[i + 7], box.verts[i + 8]);
  }
  for (const i of box.idx) dst.idx.push(baseIdx + i);
}

// Build one full soldier rig in LOCAL space (origin at feet, +Z up, facing +X).
// Pose: walkPhase (rad), aimPitch (rad, + = aim up), crouch (0..1), dead (0..1 relax factor).
// Death pose (fall on back) is applied by the caller via the model matrix, pivoting at the feet.
function buildSoldier(pose) {
  const { walkPhase = 0, aimPitch = 0, crouch = 0, dead = 0 } = pose || {};
  const out = { verts: [], idx: [] };

  const camo = [0.30, 0.33, 0.24];     // olive drab uniform
  const camoDark = [0.20, 0.23, 0.17];
  const vest = [0.16, 0.17, 0.13];
  const skin = [0.78, 0.62, 0.45];
  const helmet = [0.27, 0.30, 0.21];
  const gun = [0.10, 0.11, 0.12];
  const boot = [0.09, 0.09, 0.09];

  // ---- Rotation helpers (local frame: +X forward, +Y left, +Z up).
  // pitchUp(a): forward (1,0,0) -> (cos a, 0, sin a).  +a raises the muzzle / tips top backward.
  const pitchUp = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    const f = (x, y, z) => [x * c - z * s, y, x * s + z * c];
    f.rot = f;
    return f;
  };
  // yawL(a): forward (1,0,0) -> (cos a, sin a, 0).
  const yawL = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    const f = (x, y, z) => [x * c - y * s, x * s + y * c, z];
    f.rot = f;
    return f;
  };
  // rollF(a): rotation around the local forward axis (X).
  const rollF = (a) => {
    const c = Math.cos(a), s = Math.sin(a);
    const f = (x, y, z) => [x, y * c - z * s, y * s + z * c];
    f.rot = f;
    return f;
  };
  const chain = (...ts) => {
    const f = (x, y, z) => { let p = [x, y, z]; for (const t of ts) p = t(p[0], p[1], p[2]); return p; };
    f.rot = (x, y, z) => { let n = [x, y, z]; for (const t of ts) { if (t.rot) n = t.rot(n[0], n[1], n[2]); } return n; };
    return f;
  };

  // ---- Pose math.
  const swing = Math.sin(walkPhase) * 0.55 * (1 - crouch * 0.4);
  const hipDrop = crouch * 20;
  const lean = 0.10 + crouch * 0.42;           // slight forward stance, more when crouched
  const hipZ = 34 - hipDrop;

  // ---- LEGS: thigh from hip downward, shin from knee, boot at ankle.
  for (const side of [-1, 1]) {
    const swingA = (side < 0 ? swing : -swing);
    const hipX = side * 3.4;
    const thighLen = 17, shinLen = 16;
    const kneeBend = Math.max(0, swingA) * 0.95 + crouch * 1.15; // heel kicks back

    const thigh = makeBox(-3.3, -4.0, -thighLen, 3.3, 4.0, 0, camo[0], camo[1], camo[2]);
    const tT = chain(yawL(side * 0.05), pitchUp(-swingA * 0.85), (x, y, z) => [x + hipX, y, z + hipZ]);
    appendGeom(out, thigh, tT);

    const knee = tT(0, 0, -thighLen);
    const shin = makeBox(-2.8, -3.4, -shinLen, 2.8, 3.4, 0, camo[0] * 0.92, camo[1] * 0.92, camo[2] * 0.92);
    const sT = chain(pitchUp(kneeBend), (x, y, z) => [x + knee[0], y + knee[1], z + knee[2]]);
    appendGeom(out, shin, sT);

    const ankle = sT(0, 0, -shinLen);
    const b2 = makeBox(-3.2, -4.6, -3.0, 3.2, 6.2, 2.4, boot[0], boot[1], boot[2]);
    const bT = chain(pitchUp(Math.max(0, swingA) * 0.35), (x, y, z) => [x + ankle[0], y + ankle[1], Math.max(2.2, z + ankle[2])]);
    appendGeom(out, b2, bT);
  }

  // ---- TORSO from hips up, pitched by stance lean.
  const torsoLen = 30;
  const tT = chain(pitchUp(-lean), (x, y, z) => [x, y, z + hipZ]);
  const torso = makeBox(-8.2, -5.4, 0, 8.2, 5.4, torsoLen, camo[0], camo[1], camo[2]);
  appendGeom(out, torso, tT);
  // Tactical chest rig / vest.
  const vestB = makeBox(-7.6, -5.9, torsoLen * 0.28, 8.4, 6.1, torsoLen * 0.80, vest[0], vest[1], vest[2]);
  appendGeom(out, vestB, tT);
  // Mag pouches on the vest front.
  for (const py of [-4.6, -0.4, 3.8]) {
    const pouch = makeBox(py, -6.5, torsoLen * 0.34, py + 3.6, -4.5, torsoLen * 0.58, camoDark[0], camoDark[1], camoDark[2]);
    appendGeom(out, pouch, tT);
  }
  // Shoulder radio.
  const radio = makeBox(-8.4, -3.0, torsoLen * 0.60, -5.6, -0.2, torsoLen * 0.86, 0.08, 0.08, 0.09);
  appendGeom(out, radio, tT);

  const shZ = hipZ + (tT.rot(0, 0, torsoLen))[2];

  // ---- HEAD + HELMET (relaxed neck when dead).
  const neckZ = torsoLen * 0.94;
  const hT = chain(pitchUp(-(lean * 0.7) * (1 - dead)), (x, y, z) => [x, y, z + hipZ]);
  const head = makeBox(-4.4, -4.0, neckZ, 4.4, 4.0, neckZ + 8.6, skin[0], skin[1], skin[2]);
  appendGeom(out, head, hT);
  const helmetB = makeBox(-5.2, -4.8, neckZ + 4.2, 5.2, 4.8, neckZ + 12.4, helmet[0], helmet[1], helmet[2]);
  appendGeom(out, helmetB, hT);
  const brim = makeBox(-5.4, -5.0, neckZ + 3.4, 5.4, 5.0, neckZ + 5.2, helmet[0] * 0.8, helmet[1] * 0.8, helmet[2] * 0.8);
  appendGeom(out, brim, hT);
  // Goggles band (subtle teal — readability of facing direction).
  const gog = makeBox(-4.6, -5.1, neckZ + 6.4, 4.6, -3.7, neckZ + 9.2, 0.05, 0.28, 0.30);
  appendGeom(out, gog, hT);

  // ---- ARMS: both hands hold the rifle; pitch follows remote aim; relaxed when dead.
  const aimA = aimPitch * (1 - dead);
  const holdA = 0.95 - dead * 0.8;
  for (const side of [-1, 1]) {
    const sx = side * 9.0;
    const sway = Math.sin(walkPhase) * 0.05;
    const upper = makeBox(-2.7, -2.7, -13.5, 2.7, 2.7, 0, camo[0], camo[1], camo[2]);
    const aT = chain(yawL(side * 0.20), pitchUp(holdA), rollF(sway), (x, y, z) => [x + sx, y, z + shZ]);
    appendGeom(out, upper, aT);
    const elbow = aT(0, 0, -13.5);
    const fore = makeBox(-2.3, -2.3, -12.5, 2.3, 2.3, 0, camo[0] * 0.94, camo[1] * 0.94, camo[2] * 0.94);
    const fT = chain(pitchUp(-0.95), (x, y, z) => [x + elbow[0], y + elbow[1], z + elbow[2]]);
    appendGeom(out, fore, fT);
    const glove = makeBox(-2.6, -2.6, -3.4, 2.6, 2.6, 3.4, 0.13, 0.13, 0.12);
    const hand = fT(0, 0, -12.5);
    appendGeom(out, glove, (x, y, z) => [x + hand[0], y + hand[1], z + hand[2]]);
  }

  // ---- RIFLE: grip at chest height, barrel pointing forward (+X), pitched with aim.
  const rifleLen = 34;
  const rT = chain(
    pitchUp(aimA),
    chain(pitchUp(-1.42), rollF(-0.10), (x, y, z) => [x + 4.6, y - 1.2, z + shZ - 7.5])
  );
  const rifle = makeBox(-2.0, -1.9, 0, 2.0, 1.9, rifleLen, gun[0], gun[1], gun[2]);
  appendGeom(out, rifle, rT);
  const stock = makeBox(-2.4, -2.4, -9.5, 2.4, 2.4, 0, 0.16, 0.12, 0.08);
  appendGeom(out, stock, rT);
  const mag = makeBox(-1.8, -4.6, 8.5, 1.8, 0.2, 14.5, camoDark[0], camoDark[1], camoDark[2]);
  appendGeom(out, mag, rT);
  const barrel = makeBox(-1.0, -1.0, rifleLen, 1.0, 1.0, rifleLen + 6.5, 0.32, 0.33, 0.35);
  appendGeom(out, barrel, rT);

  return out;
}

export class CoopSoldier3D {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.prog = null;
    this.buffers = null;
    this.meshCache = new Map();   // poseKey -> {verts, idx} built mesh data
    this.soldiers = new Map();    // pid -> runtime state (anim phase, deathT...)
    this.lastFrame = 0;
    this.frameCount = 0;
  }

  // Lazily attach the WebGL canvas exactly over the game canvas rect.
  ensureCanvas(gameRect) {
    if (!this.canvas) {
      const cv = document.createElement('canvas');
      cv.id = 'coop3d-canvas';
      Object.assign(cv.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: '99997',
        display: 'none',
      });
      document.body.appendChild(cv);
      const gl = cv.getContext('webgl', { alpha: true, antialias: true, depth: true, premultipliedAlpha: false })
        || cv.getContext('experimental-webgl', { alpha: true, antialias: true, depth: true });
      if (!gl) return false;
      this.canvas = cv; this.gl = gl;

      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn('[COOP3D] shader:', gl.getShaderInfoLog(sh)); return null; }
        return sh;
      };
      const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[COOP3D] link:', gl.getProgramInfoLog(prog)); return false; }
      gl.useProgram(prog);
      this.prog = prog;
      this.loc = {
        aPos: gl.getAttribLocation(prog, 'aPos'),
        aNormal: gl.getAttribLocation(prog, 'aNormal'),
        aColor: gl.getAttribLocation(prog, 'aColor'),
        uView: gl.getUniformLocation(prog, 'uView'),
        uProj: gl.getUniformLocation(prog, 'uProj'),
        uModel: gl.getUniformLocation(prog, 'uModel'),
        uAlpha: gl.getUniformLocation(prog, 'uAlpha'),
      };
      this.vertBuf = gl.createBuffer();
      this.idxBuf = gl.createBuffer();
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    }
    // Track the game canvas rect (letterboxed) — the 3D layer must match it pixel-perfect.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(gameRect.width * dpr));
    const h = Math.max(1, Math.round(gameRect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    Object.assign(this.canvas.style, {
      left: gameRect.left + 'px', top: gameRect.top + 'px',
      width: gameRect.width + 'px', height: gameRect.height + 'px',
      display: 'block',
    });
    return true;
  }

  hide() {
    if (this.canvas) this.canvas.style.display = 'none';
  }

  // teammates: [{pid, name, isHost, x, y, z, yaw, pitch, moving, crouch, dead, health}]
  // camera: {x,y,z,fwd,axis1,up,tanFovX,tanFovY,valid}  (from engine memory)
  // gameRect: DOMRect of #game
  update(teammates, camera, gameRect, dtMs) {
    if (!teammates || !teammates.length || !camera || !camera.valid || !gameRect) { this.hide(); return; }
    if (!this.ensureCanvas(gameRect)) return;
    const gl = this.gl;
    const dt = Math.min(0.1, (dtMs || 16.7) / 1000);
    this.frameCount++;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ---- View matrix from the engine camera (right-handed, +Z forward in view space).
    // View basis: right = -axis1 (axis1 is LEFT), up = cam.up, forward = cam.fwd.
    const R = [ -camera.axis1.x, -camera.axis1.y, -camera.axis1.z ];
    const U = [ camera.up.x, camera.up.y, camera.up.z ];
    const F = [ camera.fwd.x, camera.fwd.y, camera.fwd.z ];
    const ex = camera.x, ey = camera.y, ez = camera.z;
    // Column-major 4x4 view matrix.
    const view = new Float32Array([
      R[0], U[0], F[0], 0,
      R[1], U[1], F[1], 0,
      R[2], U[2], F[2], 0,
      -(R[0]*ex + R[1]*ey + R[2]*ez),
      -(U[0]*ex + U[1]*ey + U[2]*ez),
      -(F[0]*ex + F[1]*ey + F[2]*ez),
      1,
    ]);

    // ---- Projection from engine tanHalfFov (matches WorldPosToScreenPos func 3685):
    // screenX = w/2 * (1 - (axis1·d / tanFovX) / fwd·d)  → NDC x = R·d/(tanFovX*fwd·d), R = -axis1 (right)
    // WebGL NDC y=+1 is canvas top → screenY = h/2 * (1 - (up·d)/(tanFovY*fwd·d)) ✓ engine-equal.
    // Depth: z_clip = fwd·d - NEAR, w_clip = fwd·d → clips at fwd < NEAR (no mirror artifact), far ~ fwd→∞.
    const tX = camera.tanFovX, tY = camera.tanFovY;
    const NEAR = 8;
    const proj = new Float32Array([
      1 / tX, 0, 0, 0,
      0, 1 / tY, 0, 0,
      0, 0, 1, 1,
      0, 0, -NEAR, 0,
    ]);
    gl.uniformMatrix4fv(this.loc.uView, false, view);
    gl.uniformMatrix4fv(this.loc.uProj, false, proj);

    const farClip = 20000;
    const scaleWorld = 1.0; // soldier rig is already in engine units (~68 tall)

    for (const tm of teammates) {
      if (typeof tm.x !== 'number' || !Number.isFinite(tm.x)) continue;
      let s = this.soldiers.get(tm.pid);
      if (!s) { s = { phase: Math.random() * 6.28, deathT: 0, dead: false, lastSeen: performance.now() }; this.soldiers.set(tm.pid, s); }
      s.lastSeen = performance.now();

      // Death animation progress.
      const isDead = Boolean(tm.dead);
      if (isDead && !s.dead) s.dead = true;
      if (!isDead && s.dead) { s.dead = false; s.deathT = 0; }
      if (s.dead) s.deathT = Math.min(1, s.deathT + dt * 2.2);

      // Walk phase advances from remote velocity (moving flag + distance delta).
      if (typeof s.px === 'number' && !s.dead) {
        const dd = Math.hypot(tm.x - s.px, tm.y - s.py, tm.z - s.pz);
        s.phase += dt * Math.min(14, dd / dt / 9.0 + (tm.moving ? 6 : 0));
      } else if (tm.moving && !s.dead) {
        s.phase += dt * 7;
      }
      s.px = tm.x; s.py = tm.y; s.pz = tm.z;

      // Distance cull.
      const dist = Math.hypot(tm.x - ex, tm.y - ey, tm.z - ez);
      if (dist > farClip) continue;

      const pose = {
        walkPhase: s.phase,
        aimPitch: Math.max(-0.7, Math.min(0.7, tm.pitch || 0)),
        crouch: tm.crouch ? 1 : 0,
        dead: s.deathT,
      };
      const mesh = this.getMesh(pose);
      if (!mesh) continue;

      // Model matrix: translate to teammate, yaw around world Z (engine up),
      // plus a death fall (pitch backward around the local Y axis, pivoting at the feet).
      const yaw = tm.yaw || 0;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      let model;
      if (s.deathT > 0.001) {
        const fall = s.deathT * (Math.PI / 2) * 0.94;
        const cf = Math.cos(fall), sf = Math.sin(fall);
        // M = T * Rz(yaw) * Ry(fall)  (column-major)
        model = new Float32Array([
          cy * cf, sy * cf, sf, 0,
          -sy, cy, 0, 0,
          -cy * sf, -sy * sf, cf, 0,
          tm.x, tm.y, tm.z - 1.5 * s.deathT, 1,
        ]);
      } else {
        model = new Float32Array([
          cy, sy, 0, 0,
          -sy, cy, 0, 0,
          0, 0, 1, 0,
          tm.x, tm.y, tm.z, 1,
        ]);
      }
      gl.uniformMatrix4fv(this.loc.uModel, false, model);
      gl.uniform1f(this.loc.uAlpha, s.dead ? Math.max(0, 1 - Math.max(0, s.deathT - 0.55) * 2.4) : 1);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.verts), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.idx), gl.DYNAMIC_DRAW);

      const stride = 9 * 4;
      gl.enableVertexAttribArray(this.loc.aPos);
      gl.vertexAttribPointer(this.loc.aPos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(this.loc.aNormal);
      gl.vertexAttribPointer(this.loc.aNormal, 3, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(this.loc.aColor);
      gl.vertexAttribPointer(this.loc.aColor, 3, gl.FLOAT, false, stride, 24);

      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
    }

    // Drop soldiers not seen for 5 s.
    const now = performance.now();
    for (const [pid, s] of this.soldiers) {
      if (now - s.lastSeen > 5000) this.soldiers.delete(pid);
    }
  }

  // Build (and cache) the soldier mesh for a coarse pose key.
  getMesh(pose) {
    const phase2pi = pose.walkPhase % (Math.PI * 2);
    const key = `${Math.round(phase2pi * 2)}|${Math.round(pose.aimPitch * 8)}|${Math.round(pose.crouch)}|${Math.round(pose.dead * 20)}`;
    if (this.meshCache.has(key)) return this.meshCache.get(key);
    const data = buildSoldier(pose);
    if (data.idx.length > 65535) return null; // Uint16 safety
    const mesh = { verts: new Float32Array(data.verts), idx: new Uint16Array(data.idx) };
    this.meshCache.set(key, mesh);
    if (this.meshCache.size > 240) {
      const first = this.meshCache.keys().next().value;
      this.meshCache.delete(first);
    }
    return mesh;
  }

  dispose() {
    if (this.canvas) { this.canvas.remove(); this.canvas = null; this.gl = null; this.prog = null; }
    this.meshCache.clear(); this.soldiers.clear();
  }
}

// ---- Pure projection helper shared with the 2D overlay (single source of truth).
// Maps a world point to pixel coords INSIDE the game canvas rect (letterbox-aware).
// Returns null when behind the camera.
export function projectToGameRect(wx, wy, wz, cam, rect) {
  const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
  const fwd = dx * cam.fwd.x + dy * cam.fwd.y + dz * cam.fwd.z;
  if (fwd <= 4.0) return null;
  const a1 = dx * cam.axis1.x + dy * cam.axis1.y + dz * cam.axis1.z;
  const up = dx * cam.up.x + dy * cam.up.y + dz * cam.up.z;
  // Engine formula: screenX = w/2 * (1 - (axis1/tanFovX)/fwd), screenY = h/2 * (1 - (up/tanFovY)/fwd)
  const x = (rect.width * 0.5) * (1.0 - (a1 / (cam.tanFovX * fwd)));
  const y = (rect.height * 0.5) * (1.0 - (up / (cam.tanFovY * fwd)));
  return { x, y, distForward: fwd };
}
