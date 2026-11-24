import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
} from '@whiskeysockets/baileys';
import { useAtomicMultiFileAuthState } from './auth-state.js';
import { bindWhatsAppEvents } from './events.js';
import { PairingManager } from './pairing.js';

export function calculateReconnectDelay(attempt, { baseMs = 2000, maxMs = 60_000 } = {}) {
  const safeAttempt = Math.max(0, Number(attempt) || 0);
  const exp = Math.min(maxMs, baseMs * 2 ** Math.min(safeAttempt, 6));
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(maxMs, exp + jitter);
}

export function classifyDisconnectStatus(statusCode) {
  if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
    return {
      action: 'stop_logged_out',
      reason: 'loggedOut (401)',
      userActionRequired:
        'WhatsApp session was logged out (401). Stop reconnects, remove the old auth folder (data/auth), and pair again. User database data is preserved.',
    };
  }
  if (statusCode === DisconnectReason.badSession || statusCode === 500) {
    return {
      action: 'stop_bad_session',
      reason: 'badSession (500)',
      userActionRequired:
        'WhatsApp auth session is corrupted (500). Remove data/auth and pair again. User database data is preserved.',
    };
  }
  if (statusCode === DisconnectReason.forbidden || statusCode === 403) {
    return {
      action: 'stop_forbidden',
      reason: 'forbidden (403)',
      userActionRequired:
        'WhatsApp rejected the session (403). Check account standing before re-pairing.',
    };
  }
  if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
    return {
      action: 'stop_replaced',
      reason: 'connectionReplaced (440)',
      userActionRequired:
        'Another session replaced this connection (440). Ensure no duplicate bot instance is running.',
    };
  }
  if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
    return { action: 'reconnect_fast', reason: 'restartRequired (515)', userActionRequired: null };
  }
  if (statusCode === DisconnectReason.connectionClosed || statusCode === 428) {
    return { action: 'reconnect_backoff', reason: 'connectionClosed (428)', userActionRequired: null };
  }
  return {
    action: 'reconnect_backoff',
    reason: `disconnect (${statusCode ?? 'unknown'})`,
    userActionRequired: null,
  };
}

export class WhatsAppConnectionManager {
  constructor({ config, messageHandler, logger, socketFactory = makeWASocket }) {
    this.config = config;
    this.messageHandler = messageHandler;
    this.logger = logger;
    this.socketFactory = socketFactory;

    this.pairing = new PairingManager({
      phoneNumber: config.whatsapp.number,
      logger,
    });

    this.activeSocket = null;
    this.connectingPromise = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.isShuttingDown = false;

    this.status = {
      state: 'idle', // 'idle' | 'connecting' | 'pairing_pending' | 'open' | 'reconnecting' | 'logged_out' | 'stopped'
      connected: false,
      needsRepairing: false,
      lastDisconnectReason: null,
      lastError: null,
      lastConnectedAt: null,
      reconnectAttempts: 0,
    };
  }

  getStatus() {
    return {
      ...this.status,
      phoneConfigured: Boolean(this.config.whatsapp.number),
      authDirConfigured: Boolean(this.config.whatsapp.authDir),
    };
  }

  async start() {
    if (this.isShuttingDown) return null;
    if (!this.config.whatsapp.autoConnect) {
      this.status.state = 'stopped';
      this.logger?.info?.('whatsapp', 'WHATSAPP_AUTO_CONNECT=false; skipping WhatsApp socket startup');
      return null;
    }
    if (!this.config.whatsapp.number) {
      this.status.state = 'idle';
      this.logger?.warn?.('whatsapp', 'WHATSAPP_NUMBER is empty; WhatsApp connection paused until configured');
      return null;
    }
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = this._connectInternal().finally(() => {
      this.connectingPromise = null;
    });
    return this.connectingPromise;
  }

  async _connectInternal() {
    if (this.isShuttingDown) return null;

    this._clearReconnectTimer();
    this._teardownActiveSocket();

    this.status.state = 'connecting';
    this.status.connected = false;

    const { state, saveCreds } = await useAtomicMultiFileAuthState(this.config.whatsapp.authDir);
    let version;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
    } catch {
      version = undefined;
    }

    const baileysLogger = this.logger?.child?.({ module: 'baileys' }) || this.logger?.pino;
    const sock = this.socketFactory({
      version,
      logger: baileysLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    this.activeSocket = sock;

    bindWhatsAppEvents({
      sock,
      saveCreds,
      logger: this.logger,
      onConnectionUpdate: async (update) => {
        if (this.activeSocket !== sock) return;
        await this.handleConnectionUpdate(sock, update);
      },
      onMessagesUpsert: async (event) => {
        if (this.activeSocket !== sock) return;
        await this.messageHandler.handleUpsert({ sock, ...event });
      },
    });

    return sock;
  }

  async handleConnectionUpdate(sock, update) {
    const { connection, lastDisconnect, qr } = update || {};

    // Never display QR codes; when WhatsApp signals unregistered device (qr or connecting), request 8-digit pairing code ONCE
    if ((qr || connection === 'connecting') && !sock.authState?.creds?.registered) {
      this.status.state = 'pairing_pending';
      await this.pairing.requestOnce(sock);
    }

    if (connection === 'open') {
      this.reconnectAttempts = 0;
      this.status.state = 'open';
      this.status.connected = true;
      this.status.needsRepairing = false;
      this.status.lastDisconnectReason = null;
      this.status.lastError = null;
      this.status.reconnectAttempts = 0;
      this.status.lastConnectedAt = new Date().toISOString();
      this.logger?.info?.('whatsapp', 'WhatsApp multi-device connection opened');
      return;
    }

    if (connection === 'close') {
      this.status.connected = false;
      if (this.isShuttingDown) {
        this.status.state = 'stopped';
        return;
      }

      const statusCode = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.statusCode;
      const decision = classifyDisconnectStatus(statusCode);
      this.status.lastDisconnectReason = decision.reason;

      if (decision.action.startsWith('stop_')) {
        this.status.state = 'logged_out';
        this.status.needsRepairing = true;
        this.status.lastError = decision.userActionRequired;
        this._teardownActiveSocket();
        this.logger?.warn?.('whatsapp', decision.userActionRequired);
        return;
      }

      const delayMs =
        decision.action === 'reconnect_fast'
          ? 1200
          : calculateReconnectDelay(this.reconnectAttempts);

      this.reconnectAttempts += 1;
      this.status.state = 'reconnecting';
      this.status.reconnectAttempts = this.reconnectAttempts;
      this.logger?.info?.(
        'whatsapp',
        `Connection closed (${decision.reason}); scheduling reconnect attempt #${this.reconnectAttempts} in ${delayMs}ms`
      );

      this._clearReconnectTimer();
      this.reconnectTimer = setTimeout(() => {
        if (!this.isShuttingDown) {
          void this.start().catch((err) => {
            this.logger?.error?.('whatsapp', 'Reconnect attempt failed', err);
          });
        }
      }, delayMs);
      if (typeof this.reconnectTimer.unref === 'function') {
        this.reconnectTimer.unref();
      }
    }
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _teardownActiveSocket() {
    if (!this.activeSocket) return;
    try {
      this.activeSocket.ev?.removeAllListeners?.('creds.update');
      this.activeSocket.ev?.removeAllListeners?.('connection.update');
      this.activeSocket.ev?.removeAllListeners?.('messages.upsert');
      this.activeSocket.ws?.close?.();
    } catch {
      // Ignore cleanup errors on closing socket
    }
    this.activeSocket = null;
  }

  async shutdown() {
    this.isShuttingDown = true;
    this._clearReconnectTimer();
    this._teardownActiveSocket();
    this.status.connected = false;
    this.status.state = 'stopped';
  }
}
