// coopnet.js — Co-op v4: native engine netcode bridge
// ------------------------------------------------------------
// Reverse-engineered from KisakBlack-web.wasm (name section, WAT decode):
//
//   NET_GetLoopPacket(netsrc_t, netadr_t*, msg_t*)   func[4026]
//   Netchan_Transmit(netchan_t*, int, char*, bool)   func[5811]
//   NET_OutOfBandPrint(netsrc_t, netadr_t, char*)    func[825]
//
// The engine ships the complete T5 client+server netcode, but its only
// transport is an in-memory loopback packet queue (no socket imports at all):
//
//   queue[i] @ LOOP_BASE + i*20360
//     16 slots x 1272 bytes:
//       slot+0    : packet bytes (max 1264)
//       slot+1264 : u32 cursize
//       slot+1268 : u32 loopback port (low 16 bits used by netadr)
//     queue+20352 : u32 atomic "get"  (read cursor)
//     queue+20356 : u32 atomic "send" (write cursor)
//
//   - the local client reads queue[0] (Com_ClientPacketEvent -> NET_GetLoopPacket(0))
//   - the local server reads queue[1] (Com_ServerPacketEvent  -> NET_GetLoopPacket(1))
//   - client-socket sends (sock==0, both Netchan and OOB) are always
//     enqueued into queue[1] with slot port = 0
//   - server-socket sends (sock==1) are enqueued into queue[dst.port & 0xffff]
//     (NET_StringToAdr resolves ONLY "localhost" -> NA_LOOPBACK; "loopback"
//     is NOT resolvable and makes CL_Connect_f Com_Error 'Bad server address')
//
// This bridge moves those native packets between two browser tabs over the
// room's WebSocket hub (server.py), so the REAL T5 co-op protocol runs:
// gamestate, snapshots, entities, remote 3D player models, zombies, rounds —
// all handled by the engine itself. JS only relays bytes.
//
//   CLIENT tab                         HOST tab
//   CL sends   -> queue[1] --WS-->     queue[1] slot.port=SEAT -> SV reads
//   CL reads   <- queue[0] <--WS--     queue[SEAT] drained by bridge
//
// The client boots without +devmap (native main menu) and runs
// `connect localhost` once the host reports its server is ready.
// (v4.2 fix: `connect loopback` was rejected by NET_StringToAdr ->
//  Com_ERROR "Bad server address" killed the member engine.)
// ------------------------------------------------------------

const LOOP_BASE = 135783616;   // &queue[0]
const Q_STRIDE = 20360;        // per-queue stride (16*1272 + 2 counters)
const SLOT = 1272;             // per-slot stride
const SLOT_DATA = 1264;        // max packet bytes per slot
const OFF_SIZE = 1264;         // slot: u32 cursize
const OFF_PORT = 1268;         // slot: u32 loopback port
const OFF_GET = 20352;         // queue: u32 get counter (engine read cursor)
const OFF_SEND = 20356;        // queue: u32 send counter (engine write cursor)

export const Q_CL_IN = 0;      // queue[0]: packets addressed to the local client
export const Q_SV_IN = 1;      // queue[1]: packets addressed to the local server

// v5: seat ports are no longer hard-coded. The host mallocs a queue block at
// runtime (createGuestQueues) and derives loopback ports so that
// base + port*STRIDE lands inside that malloc'd block — the server writes its
// replies to queue[port] WITHOUT a bounds check, so those addresses must be
// real allocations. The guest keeps its client qport in the seat's range.
export const GUEST_QPORT_BASE = 1000; // guest qport = 1000 + 10000*(seat-1) + rand(1..9999)
export const MAX_SEATS = 4;
export const HOST_QPORT = 7;          // the host's own client (engine.js: +setqport 7)

// ---- verified memory map of this build (see coop-patch.js) ------------------
export const COOP_MEM = {
  mailbox: { command: 148263172, freeze: 148263176, inboundRing: 148263180 },
  server: {
    allowNetPackets: 142494258,
    clientsPtr: 142360860, clientStride: 544120,
    clientState: 0, clientAddrType: 32, clientAddrPort: 40,
  },
  client: {
    connectionState: 13391960,
    clcPtr: 43783020, serverAddressPort: 24, lastPacketTime: 12,
  },
  dvars: { comSvRunning: 134904904, svPaused: 134904892, clPaused: 134904896, comMaxClients: 134904752 },
  dvarValue: 24,
  reservedPorts: [0, 1, 1773],
};

export const SLOT_STATE = Object.freeze({ free: 0, zombie: 1, reconnecting: 2, connected: 3, loading: 4, active: 5 });
export const CONN_STATE = Object.freeze({ disconnected: 0, connecting: 4, challenging: 5, connected: 6, loading: 8, primed: 9, active: 10 });

// The command word of a connectionless packet (0xFFFFFFFF prefix), such as
// "connect" or "getchallenge"; otherwise null. Used to find the exact moment
// a guest's client leaves its own server and starts the host handshake.
export function connectionlessCommand(bytes) {
  if (!bytes || bytes.length < 5 || bytes[0] !== 255 || bytes[1] !== 255 || bytes[2] !== 255 || bytes[3] !== 255) return null;
  let end = 4;
  while (end < bytes.length && end < 64 && bytes[end] !== 0 && bytes[end] !== 32 && bytes[end] !== 10) end += 1;
  let s = '';
  for (let i = 4; i < end; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

export function guestQport(seat) { return GUEST_QPORT_BASE + 10000 * (seat - 1) + 1 + Math.floor(Math.random() * 9999); }

const POLL_MS = 5;
const INJECT_MAX_WAIT_MS = 500;

export class CoopNativeBridge {
  constructor() {
    this.module = null;
    this.u8 = null;
    this.i32 = null;
    this.atomics = null;         // Int32Array over shared memory for Atomics
    this.pollTimer = null;
    this.cursors = new Map();    // queueIndex -> our reader cursor
    this.handlers = new Map();   // queueIndex -> (bytes, port) => void
    this.relayLog = [];          // ring of {t, dir, bytes} for diagnostics
    this.pending = [];           // packets staged before attach
    this.u16 = null;             // Uint16Array over the live buffer (netadr ports)
    this._cmdBuf = 0;            // malloc'd mailbox command buffer
  }

  // Attach to the running engine module. Returns false until the module and
  // its memory exist. Safe to call repeatedly; also re-binds the views when
  // the WASM memory has grown (a growth swaps the buffer object under us).
  attach(module) {
    const mod = module || globalThis.__kisakModule || globalThis.__kisakEngine?.getModule();
    if (!mod) return false;
    this.module = mod;
    if (!this._ensureLive()) return false;
    // Handlers registered before the engine existed start at the live edge
    // now (never replay stale slots, never read with a null view).
    for (const qi of this.handlers.keys()) {
      if (this.cursors.get(qi) == null) this.cursors.set(qi, this.qSend(qi));
    }
    this._flushStaged();
    return true;
  }

  // Bind (or re-bind) the memory views to the module's CURRENT buffer.
  _ensureLive() {
    const mod = this.module;
    if (!mod) return false;
    const buf = mod.HEAPU8?.buffer || mod.wasmMemory?.buffer || mod.HEAPF32?.buffer || mod.buffer;
    if (!buf) return false;
    if (this.u8 && this.u8.buffer === buf) return true; // still live
    this.u16 = null;
    // The loopback queue region is touched by the engine as soon as the net
    // stack initializes; a sanity probe keeps us from binding to a wrong heap.
    const probe = LOOP_BASE + Q_STRIDE * (MAX_SEATS + 2);
    if (buf.byteLength < probe + 2048) return false;
    this.u8 = new Uint8Array(buf);
    this.i32 = new Int32Array(buf);
    this.u16 = new Uint16Array(buf);
    this.atomics = this.i32; // SharedArrayBuffer-backed; Atomics.* usable
    return true;
  }

  isAttached() { return Boolean(this.module && this.u8 && this.i32); }

  detach() {
    this.stopPolling();
    this.module = null; this.u8 = null; this.i32 = null; this.u16 = null; this.atomics = null;
    this.cursors.clear(); this.handlers.clear();
    this.pending = [];
  }

  // Stage a packet that arrived before the engine memory was attachable.
  // Flushed in order on the first successful attach; capped so a broken
  // session cannot grow it without bound.
  stage(qi, bytes, port) {
    if (this.pending.length < 96) this.pending.push({ qi, bytes, port });
  }

  _flushStaged() {
    if (!this.pending.length) return;
    const list = this.pending; this.pending = [];
    for (const p of list) this.injectSync(p.qi, p.bytes, p.port);
  }

  // ---- queue primitives (exact engine contract) ----

  qBase(qi) { return LOOP_BASE + qi * Q_STRIDE; }
  // These MUST NOT throw when the engine memory is not attached yet (WS events
  // can arrive long before the watchdog attaches us — see modmenu.js). A
  // detached bridge simply reports an empty queue.
  qGet(qi) { return this.i32 ? Atomics.load(this.i32, (this.qBase(qi) + OFF_GET) >> 2) : 0; }
  qSend(qi) { return this.i32 ? Atomics.load(this.i32, (this.qBase(qi) + OFF_SEND) >> 2) : 0; }

  // Write one packet into a queue slot exactly like the engine's enqueue
  // (Netchan_Transmit / NET_OutOfBandPrint): data, port, size, then a
  // sequentially-consistent bump of the send counter.
  async inject(qi, bytes, port) {
    if (!this._ensureLive()) return false;
    const n = bytes.length | 0;
    if (n <= 0 || n > SLOT_DATA) return false;
    const base = this.qBase(qi);
    const getIdx = (base + OFF_GET) >> 2;
    const sendIdx = (base + OFF_SEND) >> 2;
    const deadline = performance.now() + INJECT_MAX_WAIT_MS;
    for (;;) {
      const send = Atomics.load(this.i32, sendIdx);
      const get = Atomics.load(this.i32, getIdx);
      if ((send - get) < 16) {
        const slot = base + (send & 15) * SLOT;
        this.u8.set(bytes, slot);
        this.i32[slot + OFF_PORT >> 2] = port & 0xffff;
        this.i32[slot + OFF_SIZE >> 2] = n;
        Atomics.add(this.i32, sendIdx, 1);
        this._log('in', qi, n, port);
        return true;
      }
      if (performance.now() > deadline) return false; // queue never drained
      await new Promise(r => setTimeout(r, 2));
    }
  }

  // Synchronous variant for callers that must not defer (frame hooks).
  injectSync(qi, bytes, port) {
    if (!this._ensureLive()) return false;
    const n = bytes.length | 0;
    if (n <= 0 || n > SLOT_DATA) return false;
    const base = this.qBase(qi);
    const getIdx = (base + OFF_GET) >> 2;
    const sendIdx = (base + OFF_SEND) >> 2;
    const send = Atomics.load(this.i32, sendIdx);
    const get = Atomics.load(this.i32, getIdx);
    if ((send - get) >= 16) return false;
    const slot = base + (send & 15) * SLOT;
    this.u8.set(bytes, slot);
    this.i32[slot + OFF_PORT >> 2] = port & 0xffff;
    this.i32[slot + OFF_SIZE >> 2] = n;
    Atomics.add(this.i32, sendIdx, 1);
    this._log('in', qi, n, port);
    return true;
  }

  // Register a consumer for packets arriving in queue[qi] that the engine
  // itself will never read (our virtual endpoints). One handler per queue.
  onQueue(qi, handler) {
    this.handlers.set(qi, handler);
    // Start at the live edge ONLY when the engine memory is already bound.
    // Before attach we have no view at all — drainOnce() initializes the
    // cursor at the live edge on the first attached drain instead. Reading a
    // cursor here would touch Atomics on null and kill the page (bug fixed).
    if (this.cursors.get(qi) == null && this.isAttached()) {
      this.cursors.set(qi, this.qSend(qi));
    }
    this.startPolling();
  }

  offQueue(qi) {
    this.handlers.delete(qi);
    this.cursors.delete(qi);
    if (!this.handlers.size) this.stopPolling();
  }

  // Read every new slot our cursor has not yet consumed.
  drainOnce() {
    if (!this._ensureLive()) return;
    for (const [qi, handler] of this.handlers) {
      const base = this.qBase(qi);
      const send = Atomics.load(this.i32, (base + OFF_SEND) >> 2);
      let cur = this.cursors.get(qi) ?? send;
      // The engine clamps lagging readers by dropping old packets
      // (get = send - 16); mirror that bound so cursors stay in range.
      if (send - cur > 16) cur = send - 16;
      // A cursor AHEAD of send means the queue's counters were reset under us
      // (createGuestQueues zeroes its malloc'd block, which can cover queues
      // we already drained; the i32 wraparound lands here too). The engine
      // treats the counters as monotonic, so this can only be a re-init:
      // re-anchor at the live edge instead of spinning toward send forever.
      if (cur > send) cur = send;
      while (cur !== send) {
        const slot = base + (cur & 15) * SLOT;
        const size = this.i32[slot + OFF_SIZE >> 2] | 0;
        const port = this.i32[slot + OFF_PORT >> 2] & 0xffff;
        if (size > 0 && size <= SLOT_DATA) {
          const bytes = this.u8.slice(slot, slot + size);
          this._log('out', qi, size, port);
          try { handler(bytes, port); } catch (err) { console.warn('[COOPNET] handler error', err); }
        }
        cur = (cur + 1) | 0;
      }
      this.cursors.set(qi, cur);
    }
  }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.drainOnce(), POLL_MS);
    // First flush right away too.
    try { this.drainOnce(); } catch (e) { /* ignore */ }
  }

  stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  // ---- v5 engine controls (require the patched binary; see coop-patch.js) ----
  // All of them are safe no-ops while detached so watchdog ticks can call them
  // freely before the engine exists.

  patched() { return globalThis.__coopPatched === true; }

  int(addr) { return this.i32 ? Atomics.load(this.i32, addr >> 2) : 0; }
  setInt(addr, v) { if (this.i32) Atomics.store(this.i32, addr >> 2, v | 0); }

  // Hand a console command to the SERVER thread through the patched SV_Frame
  // mailbox. False while the previous command has not been picked up yet.
  command(text) {
    if (!this._ensureLive()) return false;
    // Never clobber an un-consumed command: the server thread clears the
    // mailbox after taking it; a non-zero word means it has not run yet.
    if (Atomics.load(this.i32, COOP_MEM.mailbox.command >> 2) !== 0) return false;
    const bytes = new TextEncoder().encode(`${text}\n`);
    if (bytes.length >= 1024) throw new RangeError('command too long');
    if (!this._cmdBuf) this._cmdBuf = this.module._malloc(1024);
    if (!this._cmdBuf) return false;
    this.u8.set(bytes, this._cmdBuf);
    this.u8[this._cmdBuf + bytes.length] = 0;
    return Atomics.compareExchange(this.i32, COOP_MEM.mailbox.command >> 2, 0, this._cmdBuf) === 0;
  }

  // Park / unpark this engine's own server (guests park theirs while joining
  // the host; the host parks nothing except during full-room pause).
  freeze(on) { this.setInt(COOP_MEM.mailbox.freeze, on ? 1 : 0); }
  serverReadsPackets() { return this.u8 && this.u8.length > COOP_MEM.server.allowNetPackets && this.u8[COOP_MEM.server.allowNetPackets] === 1; }
  inboundRing(port) { this.setInt(COOP_MEM.mailbox.inboundRing, port | 0); }

  connectionState() { return this.int(COOP_MEM.client.connectionState); }
  clientConnection() { const p = this.int(COOP_MEM.client.clcPtr); return p || 0; }
  // Make the local client talk to loopback `port` — a guest uses 0, where the
  // relay injects the host's packets. `connect localhost` leaves the port at
  // the engine's default (524), which can never match the injected packets.
  pointClientAt(port) {
    const clc = this.clientConnection();
    if (!clc || !this.u16) return false;
    Atomics.store(this.u16, (clc + COOP_MEM.client.serverAddressPort) >> 1, port & 0xffff);
    return true;
  }
  clientServerPort() {
    const clc = this.clientConnection();
    return clc && this.u16 ? Atomics.load(this.u16, (clc + COOP_MEM.client.serverAddressPort) >> 1) : null;
  }
  // While 0, the client never declares its server timed out (a parked local
  // server and a host that is still waiting in its lobby both look dead).
  keepClientAlive() {
    const clc = this.clientConnection();
    if (clc) this.setInt(clc + COOP_MEM.client.lastPacketTime, 0);
  }

  dvar(name) {
    const store = COOP_MEM.dvars[name];
    if (store == null) return null;
    const dvar = this.int(store);
    return dvar ? this.int(dvar + COOP_MEM.dvarValue) : null;
  }
  setDvar(name, value) {
    const store = COOP_MEM.dvars[name];
    if (store == null) return false;
    const dvar = this.int(store);
    if (!dvar) return false;
    this.setInt(dvar + COOP_MEM.dvarValue, value);
    return true;
  }

  // Occupied server slots: [{ slot, state, loopback, port }] (host side).
  serverSlots() {
    if (!this.i32 || !this.u16) return [];
    const clients = this.int(COOP_MEM.server.clientsPtr);
    const out = [];
    if (!clients) return out;
    const count = Math.min(this.dvar('comMaxClients') ?? 0, 64);
    for (let slot = 0; slot < count; slot++) {
      const base = clients + slot * COOP_MEM.server.clientStride;
      const state = this.int(base + COOP_MEM.server.clientState);
      if (state === SLOT_STATE.free) continue;
      out.push({
        slot, state,
        loopback: this.int(base + COOP_MEM.server.clientAddrType) === 2,
        port: Atomics.load(this.u16, (base + COOP_MEM.server.clientAddrPort) >> 1),
      });
    }
    return out;
  }

  /**
   * Host only: malloc one block holding `guests + 2` loopback queues and pick
   * ports so base + port*stride stays inside it. Seat s sends through port
   * seats[s] (the server writes that guest's packets there) and all guests'
   * packets come in through inbound.port (the patched NET_GetLoopPacket reads
   * it while the engine's own queue is empty). The block is never freed.
   */
  createGuestQueues(guests) {
    if (!this._ensureLive() || !this.module?._malloc) return null;
    const lb = { stride: Q_STRIDE };
    for (let attempt = 0; attempt < 4; attempt++) {
      const size = (guests + 2) * lb.stride + 64;
      const block = this.module._malloc(size);
      if (!block) return null;
      this.u8.fill(0, block, block + size);
      const first = Math.ceil((block - LOOP_BASE) / lb.stride);
      const inbound = first + guests;
      const ports = Array.from({ length: guests }, (_, i) => first + i);
      const fits = (LOOP_BASE + (inbound + 1) * lb.stride) <= (block + size) &&
                   (this.u8.buffer.byteLength >= block + size);
      const clash = [...ports, inbound].some(p => COOP_MEM.reservedPorts.includes(p));
      if (first >= 2 && inbound <= 65535 && fits && !clash) {
        const seats = {};
        ports.forEach((port, i) => { seats[i + 1] = { port, base: LOOP_BASE + port * lb.stride }; });
        return { seats, inbound: { port: inbound, base: LOOP_BASE + inbound * lb.stride } };
      }
    }
    return null;
  }

  _log(dir, qi, size, port) {
    this.relayLog.push({ t: Date.now(), dir, qi, size, port });
    if (this.relayLog.length > 128) this.relayLog.shift();
  }

  stats() {
    const s = { attached: this.isAttached(), queues: [] };
    for (const qi of this.handlers.keys()) {
      s.queues.push({ qi, get: this.qGet(qi), send: this.qSend(qi), cursor: this.cursors.get(qi) });
    }
    return s;
  }
}

// v5 note: seat loopback ports now come from the host's createGuestQueues()
// at runtime (they must address a real malloc'd block — the server writes to
// queue[port] without a bounds check). Guest CLIENT qports come from
// guestQport(seat); the host's own client is pinned to HOST_QPORT at boot.
