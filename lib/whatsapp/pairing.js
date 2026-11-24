import { formatPairingCode, validateInternationalPhone } from '../utils/phone.js';

export class PairingManager {
  constructor({ phoneNumber, logger = null, printToConsole = (line) => console.log(line) }) {
    this.phoneNumber = phoneNumber || '';
    this.logger = logger;
    this.printToConsole = printToConsole;
    this.requestedForSession = false;
    this.inFlight = false;
    this.lastRequestedAt = 0;
    this.lastError = null;
  }

  resetForNewAuthSession() {
    this.requestedForSession = false;
    this.inFlight = false;
    this.lastError = null;
  }

  canRequest(sock) {
    if (!sock || sock.authState?.creds?.registered) {
      return { ok: false, reason: 'already_registered' };
    }
    if (this.inFlight) {
      return { ok: false, reason: 'pairing_in_flight' };
    }
    if (this.requestedForSession) {
      return { ok: false, reason: 'already_requested' };
    }
    if (Date.now() - this.lastRequestedAt < 30_000) {
      return { ok: false, reason: 'cooldown_active' };
    }
    const validation = validateInternationalPhone(this.phoneNumber);
    if (!validation.valid) {
      return { ok: false, reason: validation.reason || 'invalid_phone' };
    }
    return { ok: true, digits: validation.digits };
  }

  async requestOnce(sock) {
    const check = this.canRequest(sock);
    if (!check.ok) {
      if (
        check.reason !== 'already_registered' &&
        check.reason !== 'already_requested' &&
        check.reason !== 'pairing_in_flight'
      ) {
        this.lastError = check.reason;
      }
      return { requested: false, reason: check.reason };
    }

    this.inFlight = true;
    this.lastRequestedAt = Date.now();

    try {
      const code = await sock.requestPairingCode(check.digits);
      this.requestedForSession = true;
      this.lastError = null;
      const formatted = formatPairingCode(code);

      this.printToConsole('\n============================================================');
      this.printToConsole('  NEXORA BOT — WHATSAPP MULTI-DEVICE PAIRING CODE');
      this.printToConsole(`  Phone Number : +${check.digits}`);
      this.printToConsole(`  Pairing Code : ${formatted}`);
      this.printToConsole('  Open WhatsApp -> Linked Devices -> Link with phone number');
      this.printToConsole('============================================================\n');

      this.logger?.info?.('whatsapp-pairing', 'Pairing code generated and printed to private server console');
      return { requested: true };
    } catch (err) {
      this.requestedForSession = false;
      this.lastError = err.message;
      this.logger?.error?.('whatsapp-pairing', 'Failed to request pairing code', err);
      return { requested: false, reason: err.message };
    } finally {
      this.inFlight = false;
    }
  }
}
