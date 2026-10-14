// ========================================================
// BO1 Zombies - Real-Time Multiplayer Party & Lobby System
// ========================================================

class LobbyManager {
  constructor() {
    this.currentMap = null;
    this.onOfflineStart = null;
    this.currentRoom = null;
    this.playerId = null;
    this.isHost = false;
    this.pollTimer = null;
    this.playerName = localStorage.getItem('bo1z-player-name') || 'Player 1';
    this.apiBase = '/api/rooms';
  }

  init() {
    if (document.getElementById('lobby-overlay')) return;

    // 1. Modal Overlay Container
    const overlay = document.createElement('div');
    overlay.id = 'lobby-overlay';
    document.body.appendChild(overlay);

    // 2. Countdown Overlay Container
    const countdown = document.createElement('div');
    countdown.id = 'lobby-countdown-overlay';
    countdown.innerHTML = `
      <div class="lob-countdown-num" id="lob-countdown-val">3</div>
      <div class="lob-countdown-sub" id="lob-countdown-text">همگام‌سازی و ورود به مپ...</div>
    `;
    document.body.appendChild(countdown);

    // Close on overlay backdrop click if not in active party
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !this.currentRoom) {
        this.closeModal();
      }
    });

    // Handle URL ?room=R-xxxx query param for instant friend invite
    const params = new URLSearchParams(window.location.search);
    const inviteRoom = params.get('room');
    if (inviteRoom) {
      setTimeout(() => this.openDirectInvite(inviteRoom), 400);
    }
  }

  // --- Main Entry: When user clicks any map row ---
  openMapModal(mapEntry, onOfflineStart) {
    this.currentMap = mapEntry;
    this.onOfflineStart = onOfflineStart;
    this.showModeSelection();
  }

  closeModal() {
    const overlay = document.getElementById('lobby-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.innerHTML = '';
    }
  }

  // ---------------- STEP 1: 3-Choice Selection Modal ----------------
  showModeSelection() {
    const overlay = document.getElementById('lobby-overlay');
    if (!overlay) return;

    const map = this.currentMap;
    const panelImg = map.id ? `art/mapselect-panel-${map.id}.webp` : 'art/og-mapselect.png';

    overlay.innerHTML = `
      <div class="lob-modal">
        <div class="lob-header">
          <div class="lob-header-left">
            <span class="lob-logo">🌸</span>
            <div class="lob-title-box">
              <h3>انتخاب نحوه اجرای بازی</h3>
              <p>${map.label} // Black Ops Zombies</p>
            </div>
          </div>
          <button class="lob-close-btn" onclick="window.__lobbyManager.closeModal()">✕</button>
        </div>

        <div class="lob-body">
          <div class="lob-map-banner">
            <img src="${panelImg}" class="lob-map-thumb" alt="${map.label}" onerror="this.src='art/og-mapselect.png'" />
            <div class="lob-map-meta">
              <h4>${map.label}</h4>
              <span>${map.description || 'زامبی کوآپ هیجان‌انگیز'}</span>
            </div>
          </div>

          <div class="lob-modes-grid">
            <!-- 1. Offline Mode -->
            <div class="lob-mode-card" onclick="window.__lobbyManager.startOffline()">
              <div class="lob-mode-icon">🕹️</div>
              <div class="lob-mode-title">آفلاین (Offline)</div>
              <div class="lob-mode-desc">شروع فوری بازی تک‌نفره بدون نیاز به سرور و اینترنت</div>
            </div>

            <!-- 2. Create Online Room -->
            <div class="lob-mode-card primary" onclick="window.__lobbyManager.showCreateRoom()">
              <span class="lob-mode-badge">HOST</span>
              <div class="lob-mode-icon">🌐</div>
              <div class="lob-mode-title">ساخت اتاق (Create)</div>
              <div class="lob-mode-desc">ایجاد روم اختصاصی آنلاین و انتظار برای ورود دوستان</div>
            </div>

            <!-- 3. Join Online Room -->
            <div class="lob-mode-card" onclick="window.__lobbyManager.showJoinRooms()">
              <span class="lob-mode-badge">PARTY</span>
              <div class="lob-mode-icon">👥</div>
              <div class="lob-mode-title">پیوستن (Join)</div>
              <div class="lob-mode-desc">مشاهده اتاق‌های فعال مپ یا اتصال مستقیم با کد روم</div>
            </div>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add('active');
  }

  startOffline() {
    this.closeModal();
    if (typeof this.onOfflineStart === 'function') {
      this.onOfflineStart();
    }
  }

  // ---------------- STEP 2: Create Room Form ----------------
  showCreateRoom() {
    const overlay = document.getElementById('lobby-overlay');
    if (!overlay) return;

    const map = this.currentMap;
    const defaultRoomName = `${map.label} Squad`;

    overlay.innerHTML = `
      <div class="lob-modal">
        <div class="lob-header">
          <div class="lob-header-left">
            <span class="lob-logo">🌐</span>
            <div class="lob-title-box">
              <h3>ساخت اتاق آنلاین (Host Party)</h3>
              <p>مپ انتخابی: ${map.label}</p>
            </div>
          </div>
          <button class="lob-close-btn" onclick="window.__lobbyManager.showModeSelection()">✕</button>
        </div>

        <div class="lob-body">
          <div class="lob-form-group">
            <label class="lob-label">نام کاربری شما (Nickname)</label>
            <input type="text" id="lob-create-player-name" class="lob-input" value="${this.playerName}" placeholder="مثلاً: Killer99" />
          </div>

          <div class="lob-form-group">
            <label class="lob-label">نام اتاق (Room Name)</label>
            <input type="text" id="lob-create-room-name" class="lob-input" value="${defaultRoomName}" placeholder="نام روم را وارد کنید" />
          </div>

          <div class="lob-form-group">
            <label class="lob-label">رمز عبور اتاق (اختیاری - برای بازی خصوصی)</label>
            <input type="password" id="lob-create-password" class="lob-input" placeholder="خالی بگذارید تا روم عمومی باشد" />
          </div>

          <div class="lob-form-group">
            <label class="lob-label">حداکثر ظرفیت بازیکنان (Max Players)</label>
            <div class="lob-pills-row">
              <button class="lob-pill-btn active" data-slots="2" onclick="window.__lobbyManager.selectSlots(this, 2)">۲ بازیکن</button>
              <button class="lob-pill-btn" data-slots="3" onclick="window.__lobbyManager.selectSlots(this, 3)">۳ بازیکن</button>
              <button class="lob-pill-btn" data-slots="4" onclick="window.__lobbyManager.selectSlots(this, 4)">۴ بازیکن</button>
            </div>
          </div>

          <div class="lob-actions-row">
            <button class="lob-btn" onclick="window.__lobbyManager.showModeSelection()">بازگشت</button>
            <button class="lob-btn primary" onclick="window.__lobbyManager.submitCreateRoom()">
              <span>ایجاد روم و ورود به لابی 🚀</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  selectSlots(btn, slots) {
    document.querySelectorAll('.lob-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    btn.dataset.selectedSlots = slots;
  }

  async submitCreateRoom() {
    const pNameInput = document.getElementById('lob-create-player-name');
    const rNameInput = document.getElementById('lob-create-room-name');
    const passInput = document.getElementById('lob-create-password');
    const activePill = document.querySelector('.lob-pill-btn.active');

    const playerName = (pNameInput?.value || '').trim() || 'Player 1';
    const roomName = (rNameInput?.value || '').trim() || `${this.currentMap.label} Squad`;
    const password = (passInput?.value || '').trim();
    const maxPlayers = activePill ? Number(activePill.dataset.slots) || 2 : 2;

    this.playerName = playerName;
    try { localStorage.setItem('bo1z-player-name', playerName); } catch (e) {}

    try {
      const resp = await fetch(`${this.apiBase}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          password: password,
          maxPlayers: maxPlayers,
          mapId: this.currentMap.id,
          mapName: this.currentMap.label,
          playerName: playerName
        })
      });

      const res = await resp.json();
      if (!res.success) {
        alert(res.error || 'خطا در ایجاد اتاق');
        return;
      }

      this.currentRoom = res.room;
      this.playerId = res.playerId;
      this.isHost = true;

      this.renderPartyScreen();
      this.startPolling();
    } catch (err) {
      alert('خطا در اتصال به سرور آنلاین: ' + err.message);
    }
  }

  // ---------------- STEP 3: Join Room Browser & Direct Code ----------------
  async showJoinRooms() {
    const overlay = document.getElementById('lobby-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="lob-modal">
        <div class="lob-header">
          <div class="lob-header-left">
            <span class="lob-logo">👥</span>
            <div class="lob-title-box">
              <h3>پیوستن به اتاق آنلاین (Join Room)</h3>
              <p>اتاق‌های فعال مپ ${this.currentMap.label}</p>
            </div>
          </div>
          <button class="lob-close-btn" onclick="window.__lobbyManager.showModeSelection()">✕</button>
        </div>

        <div class="lob-body">
          <div class="lob-form-group">
            <label class="lob-label">نام کاربری شما (Nickname)</label>
            <input type="text" id="lob-join-player-name" class="lob-input" value="${this.playerName}" placeholder="نام خود را بنویسید" />
          </div>

          <!-- Direct Code Join Form -->
          <div style="background: var(--lob-surface); padding: 14px; border-radius: 16px; border: 1px solid var(--lob-border); display: flex; gap: 8px; align-items: center;">
            <input type="text" id="lob-direct-code" class="lob-input" style="flex: 1;" placeholder="کد اتاق (مثلاً: R-1234)" />
            <input type="password" id="lob-direct-pass" class="lob-input" style="width: 140px;" placeholder="رمز عبور (اگر دارد)" />
            <button class="lob-btn primary" onclick="window.__lobbyManager.submitDirectJoin()">ورود با کد</button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span style="font-size: 13px; font-weight: 700; color: #ffffff;">اتاق‌های فعال عمومی</span>
            <button class="lob-copy-btn" onclick="window.__lobbyManager.refreshRoomsList()">بروزرسانی 🔄</button>
          </div>

          <div class="lob-rooms-list" id="lob-rooms-container">
            <div class="lob-empty-state">در حال بارگذاری لیست اتاق‌ها...</div>
          </div>

          <div class="lob-actions-row">
            <button class="lob-btn" onclick="window.__lobbyManager.showModeSelection()">بازگشت</button>
          </div>
        </div>
      </div>
    `;

    this.refreshRoomsList();
  }

  async refreshRoomsList() {
    const container = document.getElementById('lob-rooms-container');
    if (!container) return;

    try {
      const resp = await fetch(`${this.apiBase}?map=${this.currentMap.id}`);
      const data = await resp.json();

      if (!data.rooms || data.rooms.length === 0) {
        container.innerHTML = '<div class="lob-empty-state">اتاق فعالی برای این مپ پیدا نشد. می‌توانید خودتان یک اتاق بسازید!</div>';
        return;
      }

      container.innerHTML = data.rooms.map(r => `
        <div class="lob-room-item">
          <div class="lob-room-item-left">
            <span style="font-size: 20px;">${r.hasPassword ? '🔒' : '🌐'}</span>
            <div class="lob-room-item-info">
              <h5>${r.name}</h5>
              <span>کد: ${r.id} // مپ: ${r.mapName}</span>
            </div>
          </div>
          <div class="lob-room-item-right">
            <span class="lob-players-count">${r.playerCount} / ${r.maxPlayers}</span>
            <button class="lob-btn primary" style="padding: 6px 16px; font-size: 12px;" onclick="window.__lobbyManager.promptJoinRoom('${r.id}', ${r.hasPassword})">
              ورود
            </button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = '<div class="lob-empty-state">خطا در دریافت لیست اتاق‌ها از سرور</div>';
    }
  }

  promptJoinRoom(roomId, hasPassword) {
    let password = '';
    if (hasPassword) {
      password = prompt('این اتاق دارای رمز عبور است. لطفاً رمز را وارد کنید:');
      if (password === null) return;
    }
    this.executeJoin(roomId, password);
  }

  submitDirectJoin() {
    const codeInput = document.getElementById('lob-direct-code');
    const passInput = document.getElementById('lob-direct-pass');
    const roomId = (codeInput?.value || '').trim();
    const password = (passInput?.value || '').trim();

    if (!roomId) {
      alert('لطفاً کد اتاق را وارد کنید.');
      return;
    }
    this.executeJoin(roomId, password);
  }

  async executeJoin(roomId, password) {
    const pNameInput = document.getElementById('lob-join-player-name');
    const playerName = (pNameInput?.value || '').trim() || this.playerName || 'Player 2';
    this.playerName = playerName;
    try { localStorage.setItem('bo1z-player-name', playerName); } catch (e) {}

    try {
      const resp = await fetch(`${this.apiBase}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: roomId,
          password: password,
          playerName: playerName
        })
      });

      const res = await resp.json();
      if (!res.success) {
        alert(res.error || 'خطا در ورود به اتاق');
        return;
      }

      this.currentRoom = res.room;
      this.playerId = res.playerId;
      this.isHost = res.isHost;

      // Update current map from joined room
      this.currentMap = { id: res.room.mapId, label: res.room.mapName };

      this.renderPartyScreen();
      this.startPolling();
    } catch (err) {
      alert('خطا در اتصال به اتاق: ' + err.message);
    }
  }

  openDirectInvite(roomId) {
    this.init();
    this.currentMap = { id: 'nacht', label: 'Nacht der Untoten' };
    this.showJoinRooms();
    const directInput = document.getElementById('lob-direct-code');
    if (directInput) directInput.value = roomId;
  }

  // ---------------- STEP 4: Real-Time Party Waiting Room Screen ----------------
  renderPartyScreen() {
    const overlay = document.getElementById('lobby-overlay');
    if (!overlay || !this.currentRoom) return;

    const room = this.currentRoom;
    const max = room.maxPlayers || 2;
    const players = room.players || [];
    const shareUrl = `${window.location.origin}/bo1z/?room=${room.id}`;

    // Render Slots (Up to maxPlayers)
    let slotsHtml = '';
    for (let i = 0; i < max; i++) {
      const p = players[i];
      if (p) {
        slotsHtml += `
          <div class="lob-player-slot occupied">
            <div class="lob-slot-avatar">${p.isHost ? '👑' : '🧟'}</div>
            <div class="lob-slot-info">
              <div class="lob-slot-name">
                <span>${p.name}</span>
                ${p.isHost ? '<span class="lob-host-crown" title="میزبان">👑 HOST</span>' : ''}
              </div>
              <div class="lob-slot-status">
                <span class="lob-status-dot"></span>
                <span>آماده در لابی (Ready)</span>
              </div>
            </div>
          </div>
        `;
      } else {
        slotsHtml += `
          <div class="lob-player-slot empty">
            <div class="lob-slot-avatar">⏳</div>
            <div class="lob-slot-info">
              <div class="lob-slot-name" style="color: #6b7280;">جایگاه خالی</div>
              <div class="lob-slot-status" style="color: #6b7280;">در انتظار ورود بازیکن...</div>
            </div>
          </div>
        `;
      }
    }

    // Render Chat Messages
    const msgsHtml = (room.messages || []).map(m => `
      <div class="lob-chat-msg">
        <span class="lob-chat-time">[${m.time || ''}]</span>
        <span class="lob-chat-sender">${m.sender}:</span>
        <span class="lob-chat-text">${m.text}</span>
      </div>
    `).join('');

    // Host vs Client Action Button
    let actionControls = '';
    if (this.isHost) {
      actionControls = `
        <button class="lob-btn success" style="flex: 1; padding: 14px;" onclick="window.__lobbyManager.startPartyGame()">
          <span style="font-size: 16px;">🚀</span>
          <span>شروع بازی برای همه بازیکنان (START GAME)</span>
        </button>
      `;
    } else {
      actionControls = `
        <div class="lob-waiting-banner" style="flex: 1;">
          <div class="lob-spinner"></div>
          <span>در انتظار شروع بازی توسط میزبان (${room.hostName || 'Host'})...</span>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="lob-modal" style="width: 740px;">
        <div class="lob-header">
          <div class="lob-header-left">
            <span class="lob-logo">🌸</span>
            <div class="lob-title-box">
              <h3>لابی اتاق: ${room.name}</h3>
              <p>مپ: ${room.mapName} // ظرفیت: ${players.length} از ${max} نفر</p>
            </div>
          </div>
          <button class="lob-close-btn" onclick="window.__lobbyManager.leaveParty()">✕</button>
        </div>

        <div class="lob-body">
          <!-- Room Info & Invite Code Bar -->
          <div class="lob-party-header">
            <div class="lob-party-code-wrap">
              <span style="font-size: 12.5px; color: #9ca3af;">کد اتاق برای اشتراک:</span>
              <span class="lob-code-pill">${room.id}</span>
              <button class="lob-copy-btn" onclick="window.__lobbyManager.copyShareLink('${room.id}')">📋 کپی کد</button>
            </div>
            <span style="font-size: 11.5px; color: #c084fc;">وضعیت: آنلاین 🟢</span>
          </div>

          <!-- Slots Grid -->
          <div class="lob-party-slots">
            ${slotsHtml}
          </div>

          <!-- Mini Chat & Event Log -->
          <div class="lob-chat-box" id="lob-chat-box">
            ${msgsHtml}
          </div>

          <!-- Chat Input -->
          <div class="lob-chat-input-row">
            <input type="text" id="lob-chat-input" class="lob-chat-input" placeholder="پیام یا چت سریع در اتاق..." onkeydown="if(event.key==='Enter')window.__lobbyManager.sendChat()" />
            <button class="lob-btn" style="padding: 8px 16px;" onclick="window.__lobbyManager.sendChat()">ارسال</button>
          </div>

          <!-- Actions -->
          <div class="lob-actions-row">
            <button class="lob-btn danger" onclick="window.__lobbyManager.leaveParty()">خروج از اتاق</button>
            ${actionControls}
          </div>
        </div>
      </div>
    `;

    // Scroll chat to bottom
    const chatBox = document.getElementById('lob-chat-box');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  }

  // ---------------- STEP 5: Real-Time Heartbeat & Synchronized Start ----------------
  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);

    this.pollTimer = setInterval(async () => {
      if (!this.currentRoom || !this.playerId) return;

      try {
        const resp = await fetch(`${this.apiBase}/poll?roomId=${this.currentRoom.id}&playerId=${this.playerId}`);
        const data = await resp.json();

        if (!data.success) {
          clearInterval(this.pollTimer);
          alert(data.error || 'ارتباط با اتاق قطع شد.');
          this.currentRoom = null;
          this.showModeSelection();
          return;
        }

        const room = data.room;
        this.currentRoom = room;
        this.isHost = data.isHost;

        // Check if game was started by Host!
        if (room.status === 'starting') {
          clearInterval(this.pollTimer);
          this.triggerLaunchCountdown(room);
          return;
        }

        // Re-render party slots and chat if modal is open
        const overlay = document.getElementById('lobby-overlay');
        if (overlay && overlay.classList.contains('active')) {
          this.renderPartyScreen();
        }
      } catch (e) {
        console.warn('[LOBBY] Poll error:', e);
      }
    }, 1000);
  }

  async startPartyGame() {
    if (!this.currentRoom || !this.isHost) return;

    try {
      const resp = await fetch(`${this.apiBase}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id,
          playerId: this.playerId
        })
      });

      const res = await resp.json();
      if (!res.success) {
        alert(res.error || 'خطا در استارت بازی');
        return;
      }
    } catch (e) {
      alert('خطا در ارسال دستور شروع بازی: ' + e.message);
    }
  }

  triggerLaunchCountdown(room) {
    const cdOverlay = document.getElementById('lobby-countdown-overlay');
    const cdVal = document.getElementById('lob-countdown-val');
    const cdText = document.getElementById('lob-countdown-text');

    if (!cdOverlay) return;
    cdOverlay.classList.add('active');

    let count = 3;
    cdVal.textContent = count;
    cdText.textContent = `همگام‌سازی بازیکنان و ورود به مپ ${room.mapName || ''}...`;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        cdVal.textContent = count;
      } else {
        clearInterval(timer);
        cdVal.textContent = '🚀';
        cdText.textContent = 'ورود به بازی...';

        setTimeout(() => {
          cdOverlay.classList.remove('active');
          this.closeModal();

          // Save party state for in-game squad HUD
          sessionStorage.setItem('bo1z-online-party', JSON.stringify({
            room: room,
            playerId: this.playerId,
            isHost: this.isHost
          }));

          // coop4: clients boot to the native main menu and connect to the
          // host's live server over the relay (no local devmap). engine.js
          // consumes this flag once at boot.
          try {
            if (this.isHost) sessionStorage.removeItem('bo1z-coop-join');
            else sessionStorage.setItem('bo1z-coop-join', '1');
          } catch (e) {}

          // Trigger map pick for all players using the room's mapId!
          const targetMapId = room.mapId || (this.currentMap && this.currentMap.id) || 'nacht';
          console.log(`[LOBBY] Launching synchronized co-op game for map: ${targetMapId}`);

          if (typeof window.pickMap === 'function') {
            window.pickMap(targetMapId);
          } else {
            const link = document.querySelector(`a[data-pick="${targetMapId}"]`);
            if (link) {
              window.__lobbyBypassModal = true;
              link.click();
            } else {
              window.location.assign(`/bo1z/${targetMapId}`);
            }
          }
        }, 600);
      }
    }, 900);
  }

  async leaveParty() {
    if (this.pollTimer) clearInterval(this.pollTimer);

    if (this.currentRoom && this.playerId) {
      try {
        await fetch(`${this.apiBase}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.currentRoom.id,
            playerId: this.playerId
          })
        });
      } catch (e) {}
    }

    this.currentRoom = null;
    this.playerId = null;
    this.isHost = false;
    this.showModeSelection();
  }

  async sendChat() {
    const input = document.getElementById('lob-chat-input');
    if (!input || !input.value.trim() || !this.currentRoom) return;

    const text = input.value.trim();
    input.value = '';

    try {
      await fetch(`${this.apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id,
          playerId: this.playerId,
          text: text
        })
      });
    } catch (e) {}
  }

  copyShareLink(code) {
    const link = `${window.location.origin}/bo1z/?room=${code}`;
    navigator.clipboard.writeText(code).then(() => {
      alert(`کد اتاق (${code}) با موفقیت در کلیپ‌بورد کپی شد!\nمی‌توانید آن را برای دوستان خود بفرستید.`);
    }).catch(() => {
      prompt('کد اتاق:', code);
    });
  }
}

// Global Singleton Instance
window.__lobbyManager = new LobbyManager();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.__lobbyManager.init());
} else {
  window.__lobbyManager.init();
}
