import os
import sys
import re
import json
import time
import uuid
import random
import mimetypes
import urllib.parse
import urllib.request
import threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import base64
import hashlib
import struct
import socket

# ========================================================
# WebSocket Real-Time Relay (RFC 6455, stdlib-only)
# --------------------------------------------------------
# Endpoint: ws://host[:port]/ws  (also /bo1z/ws)
# Protocol messages (JSON text frames):
#   up:   {t:'join', room, pid, name, isHost}
#         {t:'s', s:{...player state, zb:[zombie snapshot]}}
#         {t:'ping', ts}
#   down: {t:'hello', pid} | {t:'s', p, s} | {t:'gone', p, n} | {t:'pong', ts}
# Every state message is relayed to the sender's roommates at once —
# real-time push instead of HTTP polling.
# ========================================================
WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
WS_CLIENTS = {}          # room_id -> [client, ...]
WS_LOCK = threading.Lock()
WS_MAX_FRAME = 1 << 20   # 1 MiB guard


class WsClient:
    __slots__ = ('conn', 'room', 'pid', 'name', 'is_host', 'seat', 'send_lock')

    def __init__(self, conn):
        self.conn = conn
        self.room = None
        self.pid = None
        self.name = ''
        self.is_host = False
        self.seat = 0            # 0 = host, 1..3 = clients (loopback seats)
        self.send_lock = threading.Lock()

    def send_text(self, text):
        try:
            with self.send_lock:
                ws_send_frame(self.conn, text.encode('utf-8'), opcode=1)
            return True
        except Exception:
            return False

    def send_binary(self, data):
        try:
            with self.send_lock:
                ws_send_frame(self.conn, bytes(data), opcode=2)
            return True
        except Exception:
            return False


def ws_recv_exact(conn, n):
    buf = b''
    while len(buf) < n:
        chunk = conn.recv(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def ws_read_frame(conn):
    """Return (opcode, payload bytes) or None on disconnect/protocol error."""
    try:
        hdr = ws_recv_exact(conn, 2)
        if hdr is None:
            return None
        b1, b2 = hdr[0], hdr[1]
        opcode = b1 & 0x0F
        masked = b2 & 0x80
        ln = b2 & 0x7F
        if ln == 126:
            ext = ws_recv_exact(conn, 2)
            if ext is None:
                return None
            ln = struct.unpack('>H', ext)[0]
        elif ln == 127:
            ext = ws_recv_exact(conn, 8)
            if ext is None:
                return None
            ln = struct.unpack('>Q', ext)[0]
        if ln > WS_MAX_FRAME:
            return None
        mask = ws_recv_exact(conn, 4) if masked else None
        payload = ws_recv_exact(conn, ln) if ln else b''
        if payload is None:
            return None
        if mask:
            payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        return opcode, payload
    except Exception:
        return None


def ws_send_frame(conn, payload, opcode=1):
    ln = len(payload)
    hdr = bytearray()
    hdr.append(0x80 | opcode)
    if ln < 126:
        hdr.append(ln)
    elif ln < 65536:
        hdr.append(126)
        hdr += struct.pack('>H', ln)
    else:
        hdr.append(127)
        hdr += struct.pack('>Q', ln)
    conn.sendall(bytes(hdr) + payload)


def ws_roommates(room_id, exclude=None):
    """Snapshot of the other clients in a room (under the lock)."""
    with WS_LOCK:
        return [c for c in list(WS_CLIENTS.get(room_id, [])) if c is not exclude]


def ws_broadcast(room_id, data, exclude=None):
    with WS_LOCK:
        clients = list(WS_CLIENTS.get(room_id, []))
    dead = []
    for c in clients:
        if exclude is not None and c is exclude:
            continue
        if not c.send_text(data):
            dead.append(c)
    if dead:
        with WS_LOCK:
            lst = WS_CLIENTS.get(room_id, [])
            for c in dead:
                if c in lst:
                    lst.remove(c)


def ws_client_thread(conn, addr):
    """Per-connection relay loop (runs on the handler's request thread)."""
    client = WsClient(conn)
    try:
        while True:
            frame = ws_read_frame(conn)
            if frame is None:
                break
            opcode, payload = frame
            if opcode == 8:          # close
                break
            if opcode == 9:          # ping -> pong
                ws_send_frame(conn, payload, opcode=10)
                continue
            if opcode == 10:         # pong
                continue
            if opcode == 2:          # Co-op v4: native loopback packet relay
                if not client.room or not client.pid:
                    continue
                if client.is_host:
                    # Host -> client: payload = [seat byte][raw packet]
                    if not payload:
                        continue
                    dest_seat = payload[0]
                    for c in ws_roommates(client.room, exclude=client):
                        if not c.is_host and c.seat == dest_seat:
                            c.send_binary(payload[1:])
                            break
                else:
                    # Client -> host: raw packet, tagged with the sender seat
                    for c in ws_roommates(client.room, exclude=client):
                        if c.is_host:
                            c.send_binary(bytes([client.seat & 0xff]) + payload)
                            break
                continue
            if opcode != 1:          # only text frames carry JSON
                continue
            try:
                msg = json.loads(payload.decode('utf-8'))
            except Exception:
                continue
            mtype = msg.get('t')
            if mtype == 'join':
                room = str(msg.get('room') or '')[:32]
                client.room = room
                client.pid = str(msg.get('pid') or '')[:48]
                client.name = str(msg.get('name') or 'Player')[:24]
                client.is_host = bool(msg.get('isHost'))
                with WS_LOCK:
                    lst = WS_CLIENTS.setdefault(room, [])
                    # Hosts keep seat 0; clients claim the next free seat 1..255.
                    if client.is_host:
                        client.seat = 0
                    else:
                        taken = {c.seat for c in lst}
                        seat = 1
                        while seat in taken and seat < 256:
                            seat += 1
                        client.seat = seat
                    lst.append(client)
                client.send_text(json.dumps({'t': 'hello', 'pid': client.pid,
                                             'seat': client.seat}))
            elif mtype == 'ping':
                client.send_text(json.dumps({'t': 'pong', 'ts': msg.get('ts', 0)}))
            elif mtype == 'srvready' and client.room and client.is_host:
                # Host announces its native server is running; clients may connect.
                out = json.dumps({'t': 'srvready', 'p': client.pid},
                                 separators=(',', ':'))
                ws_broadcast(client.room, out, exclude=client)
            elif mtype == 'ctl' and client.room:
                # Co-op v5: control messages between host and one guest
                # (guest join phases, host join-turn grants). Routed like the
                # binary relay: host -> a specific seat, guest -> the host.
                m = msg.get('m') or {}
                out = json.dumps({'t': 'ctl', 'p': client.pid, 'seat': client.seat,
                                  'm': m}, separators=(',', ':'))
                to = msg.get('to')
                if client.is_host and to is not None:
                    for c in ws_roommates(client.room, exclude=client):
                        if not c.is_host and c.seat == to:
                            c.send_text(out)
                            break
                elif not client.is_host:
                    for c in ws_roommates(client.room, exclude=client):
                        if c.is_host:
                            c.send_text(out)
                            break
            elif mtype == 's' and client.room:
                out = json.dumps({'t': 's', 'p': client.pid, 's': msg.get('s', {})},
                                 separators=(',', ':'))
                ws_broadcast(client.room, out, exclude=client)
    except Exception:
        pass
    finally:
        room, pid, name = client.room, client.pid, client.name
        if room:
            with WS_LOCK:
                lst = WS_CLIENTS.get(room, [])
                if client in lst:
                    lst.remove(client)
                if lst is not None and room in WS_CLIENTS and not WS_CLIENTS[room]:
                    WS_CLIENTS.pop(room, None)
            ws_broadcast(room, json.dumps({'t': 'gone', 'p': pid, 'n': name,
                                           'seat': client.seat,
                                           'isHost': client.is_host}))
        try:
            conn.close()
        except Exception:
            pass


def ws_try_upgrade(handler):
    """Handle a WebSocket upgrade request; returns True if hijacked."""
    if (handler.headers.get('Upgrade', '').lower() != 'websocket'
            or handler.command != 'GET'):
        return False
    parsed = urllib.parse.urlparse(handler.path)
    path = parsed.path
    if path.startswith('/bo1z/'):
        path = path[len('/bo1z'):]
    if path.rstrip('/') != '/ws':
        return False

    key = handler.headers.get('Sec-WebSocket-Key')
    if not key:
        return False
    accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
    CRLF = chr(13) + chr(10)
    response = (
        'HTTP/1.1 101 Switching Protocols' + CRLF
        + 'Upgrade: websocket' + CRLF
        + 'Connection: Upgrade' + CRLF
        + 'Sec-WebSocket-Accept: ' + accept + CRLF
        + CRLF
    )
    try:
        handler.connection.sendall(response.encode())
    except Exception:
        return False
    ws_client_thread(handler.connection, handler.client_address)
    return True

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REMOTE_BASE = 'https://vel.gg/bo1z/'

mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('video/webm', '.webm')
mimetypes.add_type('application/json', '.json')

# ========================================================
# Multiplayer Real-Time Room & Party State
# ========================================================
ROOMS = {}
ROOMS_LOCK = threading.Lock()
ROOM_PLAYERS_SYNC = {}
ROOM_SYNC_LOCK = threading.Lock()


def get_time_str():
    return time.strftime("%H:%M:%S", time.localtime())

def cleanup_stale_rooms():
    now = time.time()
    with ROOMS_LOCK:
        dead_keys = []
        for rid, r in list(ROOMS.items()):
            active_players = [p for p in r['players'] if now - p.get('lastSeen', 0) < 40]
            if not active_players and (now - r.get('createdAt', 0) > 45):
                dead_keys.append(rid)
            else:
                if active_players and not any(p['id'] == r['hostId'] for p in active_players):
                    active_players[0]['isHost'] = True
                    r['hostId'] = active_players[0]['id']
                r['players'] = active_players

            if now - r.get('createdAt', 0) > 7200:
                dead_keys.append(rid)

        for rid in set(dead_keys):
            if rid in ROOMS:
                del ROOMS[rid]

def serialize_room(r):
    return {
        'id': r['id'],
        'name': r['name'],
        'mapId': r['mapId'],
        'mapName': r.get('mapName', r['mapId']),
        'hasPassword': bool(r.get('password')),
        'maxPlayers': r['maxPlayers'],
        'hostId': r['hostId'],
        'hostName': r.get('hostName', 'Host'),
        'playerCount': len(r['players']),
        'players': r['players'],
        'status': r['status'],
        'createdAt': r['createdAt'],
        'startedAt': r.get('startedAt', 0),
        'messages': r.get('messages', [])[-30:],
    }

class GameServerHandler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'  # keep-alive: huge win for the polling fallback
    def send_cors_and_security_headers(self, content_type='text/html; charset=utf-8', content_length=None):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        if content_type:
            self.send_header('Content-Type', content_type)
        if content_length is not None:
            self.send_header('Content-Length', str(content_length))

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_cors_and_security_headers(content_type='application/json; charset=utf-8', content_length=len(body))
        self.end_headers()
        self.wfile.write(body)

    # ---- keep-alive framing hygiene --------------------------------------
    # protocol_version is HTTP/1.1 (persistent connections). Every request
    # body MUST be drained before responding, or the leftover bytes are
    # parsed as the next request line -> "400 Bad request syntax" and a dead
    # connection. Field evidence: Cloudflare RUM beacons (POST /cdn-cgi/rum)
    # poisoned reused connections exactly this way in the Railway log.
    def _drain_body(self):
        """Read and return the request body (Content-Length based). For
        unframeable encodings (chunked) give up on this connection instead of
        corrupting the next keep-alive request."""
        te = (self.headers.get('Transfer-Encoding') or '').lower()
        if 'chunked' in te:
            self.close_connection = True
            return ''
        try:
            n = int(self.headers.get('Content-Length') or 0)
        except (TypeError, ValueError):
            n = 0
        if n <= 0:
            return ''
        if n > 10 * 1024 * 1024:  # absurd for this app: drop, don't read
            self.close_connection = True
            return ''
        try:
            return self.rfile.read(n).decode('utf-8', errors='ignore')
        except Exception:
            self.close_connection = True
            return ''

    def log_message(self, fmt, *args):
        # Access logs belong on stdout: Railway tags stderr lines as [err],
        # which made every request look like a failure in the deploy log.
        # stderr stays reserved for real problems (log_error still uses it).
        try:
            msg = fmt % args
        except Exception:
            msg = repr((fmt, args))
        try:
            sys.stdout.write('%s - - [%s] %s\n' %
                             (self.address_string(), self.log_date_time_string(), msg))
            sys.stdout.flush()
        except Exception:
            pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_and_security_headers()
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path.startswith('/bo1z/'):
            path = path[len('/bo1z'):]

        # Drain the body FIRST for every path (keep-alive hygiene; see
        # _drain_body). API branches below reuse the drained body.
        post_body = self._drain_body()

        # API: Multiplayer Online Room endpoints
        if path.startswith('/api/rooms'):
            try:
                data = json.loads(post_body) if post_body.strip() else {}
            except Exception:
                data = {}

            cleanup_stale_rooms()

            # 1. Create Room
            if path in ('/api/rooms/create', '/api/rooms/create/'):
                room_name = (data.get('name') or '').strip() or f"Room #{random.randint(100, 999)}"
                password = (data.get('password') or '').strip()
                max_players = max(2, min(4, int(data.get('maxPlayers') or 4)))
                map_id = (data.get('mapId') or 'nacht').strip()
                map_name = (data.get('mapName') or map_id).strip()
                host_name = (data.get('playerName') or 'Player').strip() or 'Player 1'

                room_id = f"R-{random.randint(1000, 9999)}"
                host_id = f"p-{uuid.uuid4().hex[:6]}"
                now = time.time()

                with ROOMS_LOCK:
                    ROOMS[room_id] = {
                        'id': room_id,
                        'name': room_name,
                        'password': password,
                        'maxPlayers': max_players,
                        'mapId': map_id,
                        'mapName': map_name,
                        'hostId': host_id,
                        'hostName': host_name,
                        'players': [{
                            'id': host_id,
                            'name': host_name,
                            'isHost': True,
                            'joinedAt': now,
                            'lastSeen': now
                        }],
                        'status': 'waiting',
                        'createdAt': now,
                        'startedAt': 0,
                        'messages': [{
                            'time': get_time_str(),
                            'sender': 'System',
                            'text': f"اتاق توسط {host_name} ساخته شد."
                        }]
                    }
                    room_data = serialize_room(ROOMS[room_id])

                self.send_json({
                    'success': True,
                    'room': room_data,
                    'playerId': host_id,
                    'isHost': True
                })
                return

            # 2. Join Room
            elif path in ('/api/rooms/join', '/api/rooms/join/'):
                room_id = (data.get('roomId') or '').strip()
                password = (data.get('password') or '').strip()
                player_name = (data.get('playerName') or 'Player').strip() or 'Player'

                with ROOMS_LOCK:
                    room = ROOMS.get(room_id)
                    if not room:
                        self.send_json({'success': False, 'error': 'اتاقی با این مشخصات یافت نشد.'}, status=404)
                        return
                    if room['status'] != 'waiting':
                        self.send_json({'success': False, 'error': 'بازی در این اتاق قبلاً آغاز شده است.'}, status=400)
                        return
                    if len(room['players']) >= room['maxPlayers']:
                        self.send_json({'success': False, 'error': 'ظرفیت اتاق تکمیل است.'}, status=400)
                        return
                    if room.get('password') and room['password'] != password:
                        self.send_json({'success': False, 'error': 'رمز عبور اتاق اشتباه است.'}, status=403)
                        return

                    player_id = f"p-{uuid.uuid4().hex[:6]}"
                    now = time.time()
                    room['players'].append({
                        'id': player_id,
                        'name': player_name,
                        'isHost': False,
                        'joinedAt': now,
                        'lastSeen': now
                    })
                    room['messages'].append({
                        'time': get_time_str(),
                        'sender': 'System',
                        'text': f"{player_name} به اتاق پیوست."
                    })
                    room_data = serialize_room(room)

                self.send_json({
                    'success': True,
                    'room': room_data,
                    'playerId': player_id,
                    'isHost': False
                })
                return

            # 3. Start Game (Host only)
            elif path in ('/api/rooms/start', '/api/rooms/start/'):
                room_id = (data.get('roomId') or '').strip()
                player_id = (data.get('playerId') or '').strip()

                with ROOMS_LOCK:
                    room = ROOMS.get(room_id)
                    if not room:
                        self.send_json({'success': False, 'error': 'اتاق یافت نشد.'}, status=404)
                        return
                    if room['hostId'] != player_id:
                        self.send_json({'success': False, 'error': 'تنها میزبان اتاق می‌تواند بازی را آغاز کند.'}, status=403)
                        return

                    now = time.time()
                    room['status'] = 'starting'
                    room['startedAt'] = now
                    room['messages'].append({
                        'time': get_time_str(),
                        'sender': 'System',
                        'text': 'میزبان بازی را آغاز کرد! همه بازیکنان در حال ورود به مپ هستند...'
                    })
                    room_data = serialize_room(room)

                self.send_json({
                    'success': True,
                    'room': room_data,
                    'mapId': room['mapId'],
                    'mapName': room['mapName']
                })
                return

            # 4. Leave Room
            elif path in ('/api/rooms/leave', '/api/rooms/leave/'):
                room_id = (data.get('roomId') or '').strip()
                player_id = (data.get('playerId') or '').strip()

                with ROOMS_LOCK:
                    room = ROOMS.get(room_id)
                    if room:
                        leaving = [p for p in room['players'] if p['id'] == player_id]
                        pname = leaving[0]['name'] if leaving else 'یک بازیکن'
                        room['players'] = [p for p in room['players'] if p['id'] != player_id]
                        if not room['players']:
                            del ROOMS[room_id]
                        else:
                            if room['hostId'] == player_id:
                                room['players'][0]['isHost'] = True
                                room['hostId'] = room['players'][0]['id']
                            room['messages'].append({
                                'time': get_time_str(),
                                'sender': 'System',
                                'text': f"{pname} اتاق را ترک کرد."
                            })

                self.send_json({'success': True})
                return

            # 5. Room Chat
            elif path in ('/api/rooms/chat', '/api/rooms/chat/'):
                room_id = (data.get('roomId') or '').strip()
                player_id = (data.get('playerId') or '').strip()
                text = (data.get('text') or '').strip()

                if text and room_id:
                    with ROOMS_LOCK:
                        room = ROOMS.get(room_id)
                        if room:
                            sender = next((p['name'] for p in room['players'] if p['id'] == player_id), 'Player')
                            room['messages'].append({
                                'time': get_time_str(),
                                'sender': sender,
                                'text': text[:140]
                            })
                            self.send_json({'success': True})
                            return

            # 6. Real-time In-Game Player State Sync
            elif path in ('/api/rooms/sync', '/api/rooms/sync/'):
                room_id = (data.get('roomId') or '').strip()
                player_id = (data.get('playerId') or '').strip()
                player_state = data.get('state') or {}

                if not room_id or not player_id:
                    self.send_json({'success': False, 'error': 'Missing roomId or playerId'}, status=400)
                    return

                now = time.time()
                with ROOM_SYNC_LOCK:
                    if room_id not in ROOM_PLAYERS_SYNC:
                        ROOM_PLAYERS_SYNC[room_id] = {}

                    player_state['playerId'] = player_id
                    player_state['updatedAt'] = now
                    ROOM_PLAYERS_SYNC[room_id][player_id] = player_state

                    # Collect other active players in this room
                    others = []
                    stale = []
                    for pid, pdata in list(ROOM_PLAYERS_SYNC[room_id].items()):
                        if now - pdata.get('updatedAt', 0) > 8.0:
                            stale.append(pid)
                        elif pid != player_id:
                            others.append(pdata)

                    for pid in stale:
                        ROOM_PLAYERS_SYNC[room_id].pop(pid, None)

                self.send_json({'success': True, 'others': others})
                return

                self.send_json({'success': False}, status=400)
                return


        # Gracefully handle Cloudflare RUM / local telemetry
        self.send_response(204)
        self.send_cors_and_security_headers()
        self.end_headers()

    def do_HEAD(self):
        self.handle_request(send_body=False)

    def do_GET(self):
        # WebSocket relay endpoint (hijacks this request's thread for the connection lifetime)
        if ws_try_upgrade(self):
            self.close_connection = True
            return
        self.handle_request(send_body=True)

    def handle_request(self, send_body=True):
        # GET/HEAD with a body is unusual, but beacons do it; drain so the
        # keep-alive framing stays intact (the body content is ignored here).
        self._drain_body()
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Normalization: handle /bo1z/ prefix or direct root
        if path.startswith('/bo1z/'):
            clean_path = path[len('/bo1z/'):]
        elif path == '/bo1z':
            clean_path = ''
        elif path.startswith('/'):
            clean_path = path[1:]
        else:
            clean_path = path

        clean_path = urllib.parse.unquote(clean_path)

        # ---------------- Multiplayer API Endpoints ----------------
        if clean_path.startswith('api/rooms'):
            cleanup_stale_rooms()

            # Real-time state sync poll via GET
            if clean_path in ('api/rooms/sync', 'api/rooms/sync/'):
                room_id = query.get('roomId', [''])[0].strip()
                player_id = query.get('playerId', [''])[0].strip()
                now = time.time()
                others = []
                with ROOM_SYNC_LOCK:
                    if room_id in ROOM_PLAYERS_SYNC:
                        for pid, pdata in list(ROOM_PLAYERS_SYNC[room_id].items()):
                            if pid != player_id and now - pdata.get('updatedAt', 0) <= 8.0:
                                others.append(pdata)
                self.send_json({'success': True, 'others': others})
                return

            # Poll specific room status
            if clean_path in ('api/rooms/poll', 'api/rooms/poll/'):
                room_id = query.get('roomId', [''])[0].strip()
                player_id = query.get('playerId', [''])[0].strip()

                with ROOMS_LOCK:
                    room = ROOMS.get(room_id)
                    if not room:
                        self.send_json({'success': False, 'error': 'اتاق یافت نشد.'}, status=404)
                        return

                    now = time.time()
                    for p in room['players']:
                        if p['id'] == player_id:
                            p['lastSeen'] = now
                            break

                    room_data = serialize_room(room)

                self.send_json({
                    'success': True,
                    'room': room_data,
                    'isHost': (room_data['hostId'] == player_id)
                })
                return

            # List active rooms
            filter_map = query.get('map', [None])[0]
            with ROOMS_LOCK:
                room_list = []
                for r in ROOMS.values():
                    if filter_map and r['mapId'] != filter_map:
                        continue
                    room_list.append({
                        'id': r['id'],
                        'name': r['name'],
                        'mapId': r['mapId'],
                        'mapName': r.get('mapName', r['mapId']),
                        'hasPassword': bool(r.get('password')),
                        'maxPlayers': r['maxPlayers'],
                        'playerCount': len(r['players']),
                        'status': r['status'],
                        'createdAt': r['createdAt']
                    })

            self.send_json({'success': True, 'rooms': room_list})
            return

        # ---------------- Static Web Assets Serving ----------------
        part = query.get('part', [None])[0]

        # Resolution for main index / landing
        if clean_path in ('', 'index.html'):
            target_file = os.path.join(BASE_DIR, 'index.html')
        elif clean_path in ('nacht', 'nacht.html'):
            target_file = os.path.join(BASE_DIR, 'nacht.html')
        else:
            # Map page shorthand (e.g. kino -> kino.html)
            potential_html = os.path.join(BASE_DIR, f"{clean_path}.html")
            if os.path.isfile(potential_html):
                target_file = potential_html
            else:
                if part is not None:
                    target_file = os.path.join(BASE_DIR, f"{clean_path}.part{part}")
                else:
                    target_file = os.path.join(BASE_DIR, clean_path.replace('/', os.sep))

        # 1. If file exists locally -> Serve with range request support
        if os.path.isfile(target_file):
            self.serve_local_file(target_file, send_body)
            return

        # 2. If file missing locally -> UNIVERSAL UPSTREAM AUTO-CACHE & DOWNLOAD
        self.fetch_and_cache_upstream(clean_path, part, send_body)

    def serve_local_file(self, target_file, send_body):
        ctype, _ = mimetypes.guess_type(target_file)
        ctype = ctype or 'application/octet-stream'
        file_size = os.path.getsize(target_file)

        range_header = self.headers.get('Range')
        if range_header:
            match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else file_size - 1
                if start < file_size:
                    end = min(end, file_size - 1)
                    length = end - start + 1
                    self.send_response(206)
                    self.send_cors_and_security_headers(content_type=ctype, content_length=length)
                    self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                    self.end_headers()
                    if send_body:
                        with open(target_file, 'rb') as f:
                            f.seek(start)
                            self.wfile.write(f.read(length))
                    return

        self.send_response(200)
        self.send_cors_and_security_headers(content_type=ctype, content_length=file_size)
        self.end_headers()
        if send_body:
            with open(target_file, 'rb') as f:
                self.wfile.write(f.read())

    def fetch_and_cache_upstream(self, clean_path, part, send_body):
        # Build upstream URL
        if part is not None:
            remote_url = f"{REMOTE_BASE}{clean_path}?part={part}"
            save_path = os.path.join(BASE_DIR, f"{clean_path}.part{part}")
        else:
            remote_url = f"{REMOTE_BASE}{clean_path}"
            # Check if it's a map route like 'kino'
            if not os.path.splitext(clean_path)[1]:
                save_path = os.path.join(BASE_DIR, f"{clean_path}.html")
            else:
                save_path = os.path.join(BASE_DIR, clean_path.replace('/', os.sep))

        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        try:
            req = urllib.request.Request(remote_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()

                # If this is an HTML map page, automatically inject Mod Menu scripts & CSS
                if save_path.endswith('.html') or 'text/html' in resp.headers.get('Content-Type', ''):
                    html_text = data.decode('utf-8', errors='ignore')
                    if 'modmenu.js' not in html_text:
                        injected = '<link rel="stylesheet" href="modmenu.css">\n<script type="module" src="modmenu.js"></script>\n</head>'
                        html_text = html_text.replace('</head>', injected)
                        data = html_text.encode('utf-8')

                with open(save_path, 'wb') as out:
                    out.write(data)

                ctype, _ = mimetypes.guess_type(save_path)
                ctype = ctype or 'application/octet-stream'

                self.send_response(200)
                self.send_cors_and_security_headers(content_type=ctype, content_length=len(data))
                self.end_headers()
                if send_body:
                    self.wfile.write(data)
                print(f"[AUTO-DOWNLOADED] {clean_path} -> Cached ({len(data)} bytes)")
        except Exception as e:
            body = f"404 Not Found (Auto-download failed: {e})".encode('utf-8')
            self.send_response(404)
            self.send_cors_and_security_headers(content_type='text/plain', content_length=len(body))
            self.end_headers()
            if send_body:
                self.wfile.write(body)

def run_server(host='0.0.0.0', port=8080):
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, GameServerHandler)
    print("=" * 65)
    print(f" BO1 Zombies Server (Multiplayer & Cloud-Ready)")
    print(f" Host: {host} | Port: {port}")
    print(f" URL: http://localhost:{port}/bo1z/")
    print(f" WebSocket Relay: ws://<host>:{port}/ws (real-time co-op sync)")
    print(f" Auto-Download Engine: Active (Proxies missing assets)")
    print(f" Ready for Railway & Cloud deployment")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else 8080))
    run_server(host, port)
