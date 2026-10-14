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

export const SEAT_PORT_BASE = 7001;   // seat 1..3 -> loopback ports 7001..7003
export const MAX_SEATS = 4;

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
    // The loopback queue region is touched by the engine as soon as the net
    // stack initializes; a sanity probe keeps us from binding to a wrong heap.
    const probe = LOOP_BASE + Q_STRIDE * (MAX_SEATS + 2);
    if (buf.byteLength < probe + 2048) return false;
    this.u8 = new Uint8Array(buf);
    this.i32 = new Int32Array(buf);
    this.atomics = this.i32; // SharedArrayBuffer-backed; Atomics.* usable
    return true;
  }

  isAttached() { return Boolean(this.module && this.u8 && this.i32); }

  detach() {
    this.stopPolling();
    this.module = null; this.u8 = null; this.i32 = null; this.atomics = null;
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

// Convenience: the client's outgoing queue is always queue[1] and the engine
// writes slot port 0 there; when relaying to the host we rewrite the port so
// the host's server sees a distinct loopback client (the seat's virtual port).
export function seatPort(seat) { return SEAT_PORT_BASE + seat - 1; }
