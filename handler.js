import { isOwnerJid } from './config.js';
import { sharedRateLimiter } from './lib/security/rate-limit.js';
import { decodeJid, serializeMessage } from './lib/whatsapp/simple.js';

export function parsePrefixedCommand(rawText, prefixes = ['.']) {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) {
    return { isCommand: false, prefix: '', command: '', args: '' };
  }

  for (const prefix of prefixes) {
    if (!prefix) continue;
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length).trim();
      if (!rest) return { isCommand: false, prefix: '', command: '', args: '' };
      const firstSpace = rest.search(/\s/);
      if (firstSpace === -1) {
        return { isCommand: true, prefix, command: rest.toLowerCase(), args: '' };
      }
      return {
        isCommand: true,
        prefix,
        command: rest.slice(0, firstSpace).toLowerCase(),
        args: rest.slice(firstSpace + 1).trim(),
      };
    }
  }

  return { isCommand: false, prefix: '', command: '', args: '' };
}

export class NexoraMessageHandler {
  constructor({
    config,
    repos,
    router,
    modules = null,
    pluginManager = null,
    sender,
    logger = null,
    healthService = null,
    whatsappManager = null,
  }) {
    this.config = config;
    this.repos = repos;
    this.router = router;
    this.modules = modules;
    this.pluginManager = pluginManager;
    this.sender = sender;
    this.logger = logger;
    this.healthService = healthService;
    this.whatsappManager = whatsappManager;
    this.recentInboundIds = new Set();
    this.groupMetadataCache = new Map();
  }

  setRuntimeRefs({ healthService, whatsappManager }) {
    if (healthService) this.healthService = healthService;
    if (whatsappManager) this.whatsappManager = whatsappManager;
  }

  _trackInboundId(id) {
    if (!id) return false;
    if (this.recentInboundIds.has(id)) return true;
    this.recentInboundIds.add(id);
    if (this.recentInboundIds.size > 500) {
      const oldest = this.recentInboundIds.values().next().value;
      this.recentInboundIds.delete(oldest);
    }
    return false;
  }

  async _resolveGroupRoles(sock, m) {
    if (!m.isGroup || !sock?.groupMetadata) {
      return { isAdmin: false, isBotAdmin: false, groupSubject: '' };
    }

    const cached = this.groupMetadataCache.get(m.chat);
    let metadata = null;
    if (cached && Date.now() - cached.fetchedAt < 60_000) {
      metadata = cached.data;
    } else {
      try {
        metadata = await sock.groupMetadata(m.chat);
        this.groupMetadataCache.set(m.chat, { fetchedAt: Date.now(), data: metadata });
      } catch {
        return { isAdmin: false, isBotAdmin: false, groupSubject: '' };
      }
    }

    const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
    const senderNorm = decodeJid(m.sender);
    const botNorm = decodeJid(m.botJid);
    let isAdmin = false;
    let isBotAdmin = false;

    for (const p of participants) {
      const pJid = decodeJid(p.id || p.jid || '');
      const hasAdminRole = p.admin === 'admin' || p.admin === 'superadmin';
      if (hasAdminRole && pJid === senderNorm) isAdmin = true;
      if (hasAdminRole && botNorm && pJid === botNorm) isBotAdmin = true;
    }

    return {
      isAdmin,
      isBotAdmin,
      groupSubject: metadata?.subject || '',
    };
  }

  async handleUpsert({ sock, messages, type }) {
    if (type !== 'notify' && type !== 'append') return;

    for (const rawMsg of messages || []) {
      try {
        if (!rawMsg?.key) continue;

        const m = await serializeMessage(sock, rawMsg, { senderHelper: this.sender });
        if (!m || !m.chat || !m.sender) continue;

        // Loop & broadcast protection
        if (m.fromMe || m.isBroadcast) continue;
        if (m.isBaileys && this.sender?.hasRecentlySent?.(m.id)) continue;
        if (this.sender?.hasRecentlySent?.(m.id)) continue;
        if (m.id && this._trackInboundId(m.id)) continue;

        // Audio PTT note in private chat
        if (m.kind === 'audio' && !m.isGroup) {
          await this.sender.sendResponse(sock, m.chat, {
            text: '🎙️ استلمت رسالة صوتية! حالياً أفهم الرسائل النصية وأزرار القوائم. يمكنك إرسال سؤالك نصياً أو إرسال *5* لفتح قسم الصوت والنطق.',
          }, { quoted: rawMsg });
          continue;
        }

        if (!m.text && !m.selectedId) continue;

        const prefixes = this.config?.prefixes || ['.'];
        const parsed = parsePrefixedCommand(m.text, prefixes);

        // In group chats, respond ONLY to prefixed commands or direct @bot mentions (ignore casual chatter)
        if (m.isGroup && !parsed.isCommand && !m.isBotMentioned && !m.selectedId) {
          continue;
        }

        const rate = sharedRateLimiter.check(`wa:${m.sender}`, { limit: 25, windowMs: 60_000 });
        if (!rate.allowed) {
          await this.sender.sendResponse(sock, m.chat, {
            text: `⏳ أرسلت عدة رسائل متتالية بسرعة. انتظر ${Math.ceil(rate.retryAfterMs / 1000)} ثوانٍ ثم حاول مجدداً.`,
          }, { quoted: rawMsg });
          continue;
        }

        const { user, isNew } = this.repos.users.registerOrTouch({
          whatsappJid: m.sender,
          displayName: m.pushName || '',
        });

        const { isAdmin, isBotAdmin, groupSubject } = await this._resolveGroupRoles(sock, m);
        const isOwner = isOwnerJid(m.sender, this.config);

        const strippedMentionText = m.isBotMentioned && !parsed.isCommand
          ? m.text.replace(/@\d+/g, '').trim()
          : m.text;

        const ctx = {
          m,
          sock,
          user,
          isNew,
          isGroup: m.isGroup,
          groupSubject,
          isAdmin,
          isBotAdmin,
          isOwner,
          prefix: parsed.prefix || this.config?.botPrefix || '.',
          command: parsed.command,
          args: parsed.args,
          text: strippedMentionText,
          config: this.config,
          repos: this.repos,
          modules: this.modules,
          router: this.router,
          pluginManager: this.pluginManager,
          healthService: this.healthService,
          whatsappManager: this.whatsappManager,
        };

        const activeMenu = this.repos.users.getState(user.id)?.menu || 'home';
        this.repos.conversations.append({
          userId: user.id,
          role: 'user',
          module: activeMenu,
          messageText: m.selectedId || m.text,
          metadata: { isGroup: m.isGroup, command: parsed.command || null },
        });

        let response = null;

        // 1. Plugin `all` and `before` hooks
        if (this.pluginManager) {
          await this.pluginManager.runHook('all', m, ctx);
          const beforeResult = await this.pluginManager.runHook('before', m, ctx);
          if (beforeResult.stopped) {
            continue;
          }
        }

        // 2. Prefixed plugin command dispatch (works in both private and group chats)
        const matchedPlugin =
          parsed.isCommand && this.pluginManager
            ? this.pluginManager.findCommandPlugin(parsed.command)
            : null;

        if (matchedPlugin) {
          const maintenance = this.repos.admin.getSetting('maintenance_mode', false);
          if (maintenance && !isOwner) {
            response = {
              text: `🛠️ *${this.config.botName} في وضع الصيانة المؤقتة*\nنعمل على تحسين النظام، يرجى المحاولة بعد قليل.`,
            };
          } else if (matchedPlugin.owner && !isOwner) {
            response = { text: '🔒 هذا الأمر مخصص لمالك النظام فقط.' };
          } else if (matchedPlugin.group && !m.isGroup) {
            response = { text: '👥 هذا الأمر مخصص للمجموعات فقط.' };
          } else if (matchedPlugin.private && m.isGroup) {
            response = { text: '💬 هذا الأمر متاح في المحادثة الخاصة فقط.' };
          } else if (matchedPlugin.admin && m.isGroup && !isAdmin && !isOwner) {
            response = { text: '🛡️ هذا الأمر مخصص لمشرفي المجموعة فقط.' };
          } else {
            response = await this.pluginManager.executePlugin(matchedPlugin, m, ctx);
          }
        } else if (m.isGroup) {
          // Group mention or unknown command inside group -> helpful Arabic menu/tutor fallback
          if (m.isBotMentioned && strippedMentionText) {
            response = await this.modules?.tutor?.handleInput({
              user,
              text: strippedMentionText,
              state: { menu: 'tutor', data: { mode: 'chat' } },
            });
          } else {
            response = await this.router.route({
              user,
              text: 'help',
              selectedId: null,
            });
          }
        } else {
          // 3. Private stateful Arabic menu & multi-step lessons/quizzes
          response = await this.router.route({
            user,
            text: isNew && !m.selectedId ? 'home' : m.text,
            selectedId: m.selectedId,
          });
        }

        if (response?.text) {
          const nextMenu = this.repos.users.getState(user.id)?.menu || 'home';
          this.repos.conversations.append({
            userId: user.id,
            role: 'assistant',
            module: nextMenu,
            messageText: response.text,
          });
        }

        if (response) {
          await this.sender.sendResponse(sock, m.chat, response, { quoted: rawMsg });
        }

        // 4. Plugin `after` hooks
        if (this.pluginManager) {
          await this.pluginManager.runHook('after', m, { ...ctx, response });
        }
      } catch (err) {
        this.logger?.error?.('whatsapp-message', 'Failed processing incoming message', err);
      }
    }
  }

  async handleGroupParticipantsUpdate({ action, id, participants }) {
    this.groupMetadataCache.delete(id);
    this.logger?.debug?.('whatsapp-group', `Group participants update (${action}) in ${id}`, {
      count: Array.isArray(participants) ? participants.length : 0,
    });
  }

  async handleGroupsUpdate(updates) {
    for (const u of updates || []) {
      if (u?.id) this.groupMetadataCache.delete(u.id);
    }
  }
}

export function createMessageHandler(deps) {
  return new NexoraMessageHandler(deps);
}
