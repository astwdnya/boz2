// coop-patch.js — Co-op v5: binary engine patches for the native co-op bridge
// ---------------------------------------------------------------------------
// KisakBlack-web.wasm ships the complete T5 client+server netcode, but its only
// transport is the in-memory loopback queue pair (queue[0] client, queue[1]
// server). Online co-op needs four abilities the engine does not expose:
//
//   1. PARK the local server  — a guest that booted its own map (devmap) has a
//      running listen server which consumes queue[1]. Every packet the guest's
//      client sends to the HOST's server would be eaten by the guest's own
//      server first (the guest would simply re-connect to itself and sit
//      paused forever — the field bug "member stuck on click to resume").
//      Fix: a freeze mailbox; the patched SV_Frame spins on it and skips the
//      whole frame while it is set.
//   2. COMMAND mailbox — hand console commands to the SERVER thread safely
//      (Cbuf_AddText from the page races the engine's own threads).
//   3. EXTRA inbound queue — the host's server must read guest packets from a
//      dedicated queue instead of queue[1] (where the host's own client also
//      writes: two writers on one ring corrupt slots). Fix: the patched
//      NET_GetLoopPacket falls back to an extra queue chosen at runtime.
//   4. SURVIVE co-op — three engine behaviours that are fatal only with more
//      than one player:
//        - debug asserts that fire once other players are around (trap ->
//          "carry on" instead of unreachable);
//        - attaching a weapon/effect to a remote player whose model is not
//          streamed yet calls Com_Error (fatal) inside CachedTag_UpdateTagInternal;
//        - the "player is in a menu" usercmd flag (button_bits |= 4) makes the
//          OTHER clients draw a marker whose material zombies never loads ->
//          Material_GetTechnique crash. Keep the flag off.
//        - guests (with a live idle server of their own) report script sound
//          lengths ("sl" reliable command) although nobody acknowledges them
//          while the host waits in its lobby -> EXE_ERR_CLIENT_CMD_OVERFLOW.
//          The check tests com_sv_running == 1; compare against 2 instead.
//
// Everything below is keyed to ONE exact build (sha256 of KisakBlack-web.wasm).
// The patcher verifies every function name from the wasm name section and
// every byte pattern before touching anything; any mismatch throws and the
// caller must boot the engine UNPATCHED (co-op disabled, solo still fine).
//
// Memory map and function indices were reverse-engineered from the wasm name
// section + WAT disassembly and cross-verified against a known-good table for
// this engine family (reference: AllanLotta/bo1-zombies-coop build table).
// ---------------------------------------------------------------------------

// ---- LEB128 + tiny binary helpers -----------------------------------------

function encodeU32(value) {
  const out = [];
  let n = value >>> 0;
  do { let byte = n & 0x7f; n >>>= 7; if (n) byte |= 0x80; out.push(byte); } while (n);
  return out;
}

function encodeI32(value) {
  const out = [];
  let n = value | 0;
  for (;;) {
    const byte = n & 0x7f; n >>= 7;
    const last = (n === 0 && !(byte & 0x40)) || (n === -1 && byte & 0x40);
    out.push(last ? byte : byte | 0x80);
    if (last) return out;
  }
}

function readU32(bytes, at) {
  let value = 0, shift = 0, byte;
  do { byte = bytes[at++]; value |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
  return [value >>> 0, at];
}

function readI32(bytes, at) {
  let value = 0, shift = 0, byte;
  do { byte = bytes[at++]; value |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
  if (shift < 32 && byte & 0x40) value |= -1 << shift;
  return [value, at];
}

// ---- opcodes ---------------------------------------------------------------

export const op = {
  unreachable: 0x00,
  if: [0x04, 0x40],
  end: 0x0b,
  return: 0x0f,
  drop: 0x1a,
  i32Eq: 0x46,
  i32GeU: 0x4f,
  i32Add: 0x6a,
  i32Sub: 0x6b,
  globalGet: 0x23,
  globalSet: 0x24,
  i32Load: [0x28, 2, 0],
  atomicLoad: [0xfe, 0x10, 2, 0],
  atomicExchange: [0xfe, 0x41, 2, 0],
  i32: (value) => [0x41, ...encodeI32(value)],
  call: (index) => [0x10, ...encodeU32(index)],
  get: (local) => [0x20, ...encodeU32(local)],
  set: (local) => [0x21, ...encodeU32(local)],
  tee: (local) => [0x22, ...encodeU32(local)],
};

const SECTION = { import: 2, code: 10 };

// ---- module reading --------------------------------------------------------

function countFunctionImports(bytes, at) {
  let [count, p] = readU32(bytes, at);
  let functions = 0;
  const skipName = () => { const [length, next] = readU32(bytes, p); p = next + length; };
  const skipLimits = () => {
    const flags = bytes[p++];
    p = readU32(bytes, p)[1];
    if (flags & 1) p = readU32(bytes, p)[1];
  };
  for (let i = 0; i < count; i++) {
    skipName(); skipName(); // module, field
    const kind = bytes[p++];
    if (kind === 0) { functions += 1; p = readU32(bytes, p)[1]; }
    else if (kind === 1) { p += 1; skipLimits(); }
    else if (kind === 2) { skipLimits(); }
    else if (kind === 3) { p += 2; }
    else if (kind === 4) { p += 1; p = readU32(bytes, p)[1]; }
    else throw new Error(`unknown import kind ${kind}`);
  }
  return functions;
}

export function readModule(bytes) {
  if (bytes[0] !== 0 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) throw new Error('not a wasm module');
  const sections = [];
  let importedFunctions = 0;
  let names = null;
  for (let at = 8; at < bytes.length;) {
    const id = bytes[at];
    const [size, body] = readU32(bytes, at + 1);
    const section = { id, start: at, body, end: body + size };
    sections.push(section);
    if (id === SECTION.import) importedFunctions = countFunctionImports(bytes, body);
    if (id === 0) { // custom
      const [length, nameAt] = readU32(bytes, body);
      if (new TextDecoder().decode(bytes.subarray(nameAt, nameAt + length)) === 'name') {
        names = { at: nameAt + length, end: section.end };
      }
    }
    at = section.end;
  }
  const code = sections.find(s => s.id === SECTION.code);
  if (!code) throw new Error('no code section');
  return { sections, code, importedFunctions, names };
}

export function functionNames(bytes, module, wanted) {
  const result = new Map();
  if (!module.names) return result;
  const want = new Set(wanted);
  for (let at = module.names.at; at < module.names.end;) {
    const kind = bytes[at++];
    const [size, body] = readU32(bytes, at);
    if (kind === 1) {
      let [count, p] = readU32(bytes, body);
      for (let i = 0; i < count && result.size < want.size; i++) {
        let index, length;
        [index, p] = readU32(bytes, p);
        [length, p] = readU32(bytes, p);
        if (want.has(index)) result.set(index, new TextDecoder().decode(bytes.subarray(p, p + length)));
        p += length;
      }
    }
    at = body + size;
  }
  return result;
}

export function localsEnd(body, params, index) {
  let [groups, p] = readU32(body, 0);
  let next = params;
  let type = null;
  for (let g = 0; g < groups; g++) {
    let count;
    [count, p] = readU32(body, p);
    if (index >= next && index < next + count) type = body[p];
    next += count;
    p += 1;
  }
  return { at: p, type };
}

export function rewriteFunctions(bytes, module, edits) {
  const { code } = module;
  let [count, at] = readU32(bytes, code.body);
  const parts = [Uint8Array.from(encodeU32(count))];
  let applied = 0;
  for (let i = 0; i < count; i++) {
    const [size, start] = readU32(bytes, at);
    const end = start + size;
    const edit = edits.get(i);
    if (edit) {
      const body = edit(bytes.subarray(start, end));
      parts.push(Uint8Array.from(encodeU32(body.length)), body);
      applied += 1;
    } else {
      parts.push(bytes.subarray(at, end));
    }
    at = end;
  }
  if (applied !== edits.size) throw new Error(`patched ${applied} of ${edits.size} functions`);
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const header = Uint8Array.from([SECTION.code, ...encodeU32(length)]);
  const out = new Uint8Array(code.start + header.length + length + (bytes.length - code.end));
  out.set(bytes.subarray(0, code.start), 0);
  let o = code.start;
  out.set(header, o); o += header.length;
  for (const part of parts) { out.set(part, o); o += part.length; }
  out.set(bytes.subarray(code.end), o);
  return out;
}

export const hex = (text) => text.trim().split(/\s+/).map(b => parseInt(b, 16));

// ---- this build's memory map (verified against our wasm) --------------------

export const COOP_BUILD = {
  // Functions the patcher edits or calls (indices include imports).
  functions: {
    svFrame: [3646, '__wrap__Z8SV_Frameii'],
    netGetLoopPacket: [4026, 'NET_GetLoopPacket(netsrc_t, netadr_t*, msg_t*)'],
    cbufAddText: [291, 'Cbuf_AddText(int, char const*)'],
    svWaitServer: [1391, 'SV_WaitServer()'],
    assertHandler: [170, 'Assert_MyHandler(char const*, int, int, char const*, ...)'],
    cachedTagUpdate: [4317, 'CachedTag_UpdateTagInternal(centity_s const*, cached_client_tag_t*, unsigned int, int, bool)'],
    comError: [179, 'Com_Error(errorParm_t, char const*, ...)'],
    clCreateCmd: [6552, 'CL_CreateCmd(usercmd_s*, int)'],
    cgScriptSndLengthNotify: [6587, 'CG_ScriptSndLengthNotify(int, int)'],
  },

  // Same-length byte edits, each required to match exactly once in its function.
  bytePatches: [
    {
      // "player is in a menu" marker: button_bits[1] |= 4 -> |= 0
      fn: 'clCreateCmd',
      find: '10 dc 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 04 72 36 02 04',
      replace: '10 dc 06 41 07 46 0d 00 20 05 20 05 28 02 04 41 00 72 36 02 04',
    },
    {
      // guest-only: script sound length report guard com_sv_running==1 -> ==2
      fn: 'cgScriptSndLengthNotify',
      role: 'guest',
      find: '41 c8 f8 a9 c0 00 28 02 00 2d 00 18 41 01 46 04 40',
      replace: '41 c8 f8 a9 c0 00 28 02 00 2d 00 18 41 02 46 04 40',
    },
  ],

  // Loopback queues: queue P lives at base + P*stride; 16 slots of
  // {data[1264], len@1264, port@1268} + atomic get/send counters.
  loopback: { base: 135783616, stride: 20360, slots: 16, slotSize: 1272, dataMax: 1264, offLen: 1264, offPort: 1268, offGet: 20352, offSend: 20356 },
  // 0/1 are the engine's own queues; 1773 is treated specially by this build.
  reservedPorts: [0, 1, 1773],

  mailbox: { command: 148263172, freeze: 148263176, inboundRing: 148263180 },

  server: {
    allowNetPackets: 142494258, // u8: server thread reads its inbound queue only while 1
    clientsPtr: 142360860,      // i32: client_t* svs.clients
    clientStride: 544120,
    clientState: 0,             // i32: 0 free, 1 zombie, 2 reconnecting, 3 connected, 4 loading, 5 active
    clientAddrType: 32,         // i32 netadr_t.type
    clientAddrPort: 40,         // u16 netadr_t.port
  },
  client: {
    connectionState: 13391960,  // i32: 4 connecting, 5 challenging, 6 connected, 8 loading, 9 primed, 10 active
    clcPtr: 43783020,           // i32: clientConnection_t*
    serverAddressPort: 24,      // u16 inside clientConnection_t (netadr_t.port)
    lastPacketTime: 12,         // i32 inside clientConnection_t; 0 disables the timeout check
  },
  // Each entry is the static storage of a dvar_t*; the value sits at +dvarValue.
  dvars: { comSvRunning: 134904904, svPaused: 134904892, clPaused: 134904896, comMaxClients: 134904752 },
  dvarValue: 24,
  loopbackAddressType: 2, // NA_LOOPBACK

  hostQport: 7, // the host's own client; guests pick 1000 + 10000*(seat-1) + rand
};

// ---- body transforms --------------------------------------------------------

function serverFrameHook(build, scratch) {
  const { mailbox, functions } = build;
  return [
    ...op.i32(mailbox.command), ...op.i32(0), ...op.atomicExchange, ...op.tee(scratch),
    ...op.if, ...op.i32(0), ...op.get(scratch), ...op.call(functions.cbufAddText[0]), op.end,
    ...op.i32(0), ...op.set(scratch),
    ...op.i32(mailbox.freeze), ...op.atomicLoad,
    ...op.if, ...op.call(functions.svWaitServer[0]), ...op.get(0), op.return, op.end,
  ];
}

function loopPacketHook(build, scratch) {
  const { mailbox, loopback } = build;
  const serverQueue = loopback.base + loopback.stride;
  return [
    ...op.get(0), ...op.i32(1), op.i32Eq,
    ...op.if,
    ...op.i32(mailbox.inboundRing), ...op.atomicLoad, ...op.tee(scratch),
    ...op.if,
    ...op.i32(serverQueue + loopback.offGet), ...op.i32Load,
    ...op.i32(serverQueue + loopback.offSend), ...op.i32Load,
    op.i32GeU,
    ...op.if, ...op.get(scratch), ...op.set(0), op.end,
    op.end,
    ...op.i32(0), ...op.set(scratch),
    op.end,
  ];
}

const prepend = (code, params, scratch) => (body) => {
  const { at, type } = localsEnd(body, params, scratch);
  if (type !== 0x7f) throw new Error(`local ${scratch} is not an i32`);
  const out = new Uint8Array(body.length + code.length);
  out.set(body.subarray(0, at), 0);
  out.set(code, at);
  out.set(body.subarray(at), at + code.length);
  return out;
};

// Debug asserts: print + unreachable -> restore stack pointer, return 1 (carry on).
const assertsContinue = (params) => (body) => {
  let [groups, p] = readU32(body, 0);
  for (let g = 0; g < groups; g++) p = readU32(body, p)[1] + 1;
  const expect = (ok, what) => { if (!ok) throw new Error(`assert handler: ${what}`); };
  expect(body[p] === op.globalGet, 'no stack frame');
  const [stackPointer, a] = readU32(body, p + 1);
  expect(body[a] === 0x41, 'no frame size');
  const [frameSize, b] = readI32(body, a + 1);
  expect(body[b] === op.i32Sub && body[b + 1] === 0x22, 'unexpected prologue');
  const [frameLocal, c] = readU32(body, b + 2);
  expect(frameLocal >= params && body[c] === op.globalSet && readU32(body, c + 1)[0] === stackPointer, 'unexpected prologue');
  const end = body.length;
  expect(body[end - 1] === op.end && body[end - 2] === op.unreachable, 'does not end in unreachable');
  const epilogue = [...op.get(frameLocal), ...op.i32(frameSize), op.i32Add, op.globalSet, ...encodeU32(stackPointer), ...op.i32(1), op.return, op.end];
  const out = new Uint8Array(end - 2 + epilogue.length);
  out.set(body.subarray(0, end - 2), 0);
  out.set(epilogue, end - 2);
  return out;
};

// Replace every `call <callee>` with as many drops as the call has arguments.
const dropCalls = (callee, args, expected) => (body) => {
  const call = op.call(callee);
  if (call.length !== args) throw new Error('call and drops differ in size');
  const out = Uint8Array.from(body);
  let found = 0;
  for (let i = 0; i + call.length <= out.length; i++) {
    if (call.every((byte, k) => out[i + k] === byte)) {
      out.fill(op.drop, i, i + call.length);
      found += 1;
      i += call.length - 1;
    }
  }
  if (found !== expected) throw new Error(`found ${found} calls to replace, expected ${expected}`);
  return out;
};

const replaceOnce = ({ fn, find, replace }) => (body) => {
  const from = hex(find);
  const to = hex(replace);
  if (from.length !== to.length) throw new Error(`${fn}: replacement changes the length`);
  let at = -1;
  let found = 0;
  for (let i = 0; i + from.length <= body.length; i++) {
    if (from.every((byte, k) => body[i + k] === byte)) { at = i; found += 1; }
  }
  if (found !== 1) throw new Error(`${fn}: pattern found ${found} times, expected once`);
  const out = Uint8Array.from(body);
  out.set(to, at);
  return out;
};

/**
 * Returns the patched module bytes for a role ('host' | 'guest' | null).
 * Throws when anything does not match this build exactly — the caller must
 * then boot UNPATCHED (co-op off, solo unaffected).
 */
export function patchEngine(input, build = COOP_BUILD, role = null) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const module = readModule(bytes);
  const { functions } = build;

  const wanted = Object.values(functions).map(([index]) => index);
  const names = functionNames(bytes, module, wanted);
  for (const [index, name] of Object.values(functions)) {
    if (names.get(index) !== name) throw new Error(`function ${index} is ${names.get(index)}, expected ${name}`);
  }

  const slot = (key) => functions[key][0] - module.importedFunctions;
  const edits = new Map([
    // command mailbox + freeze switch at the top of the server frame
    [slot('svFrame'), prepend(serverFrameHook(build, 1), 1, 1)],
    // extra inbound queue for the server when its own queue is empty
    [slot('netGetLoopPacket'), prepend(loopPacketHook(build, 4), 3, 4)],
    // harmless asserts keep going instead of trapping
    [slot('assertHandler'), assertsContinue(4)],
    // missing remote-player attachments must not kill the game
    [slot('cachedTagUpdate'), dropCalls(functions.comError[0], 3, 2)],
  ]);
  for (const patch of build.bytePatches) {
    if (!patch.role || patch.role === role) edits.set(slot(patch.fn), replaceOnce(patch));
  }
  return rewriteFunctions(bytes, module, edits);
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
