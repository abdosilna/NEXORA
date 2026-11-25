import { normalizeCommandText } from '../utils/text.js';
import { buildInteractiveListPayload, buildMainMenuButtons, buildMainMenuText } from './menu.js';
import { buildHelpResponse } from './help.js';
import { ProfileAndSettingsHandler } from './profile.js';

const WEB_INTENT_PATTERN = /^(ابحث|بحث\s+|مصادر\s+|https?:\/\/)/i;

export class BotRouter {
  constructor({ config, repos, modules }) {
    this.config = config;
    this.repos = repos;
    this.modules = modules;
    this.profileHandler = new ProfileAndSettingsHandler({ repos });
  }

  async route({ user, text, selectedId = null }) {
    const maintenance = this.repos.admin.getSetting('maintenance_mode', false);
    if (maintenance) {
      return {
        text: `🛠️ *${this.config.botName} في وضع الصيانة المؤقتة*\nنعمل على تحسين النظام، يرجى المحاولة بعد قليل.`,
      };
    }

    const rawId = selectedId ? String(selectedId).trim() : '';
    const rawInput = rawId || String(text || '');
    const norm = normalizeCommandText(rawInput);
    const prefix = this.config?.botPrefix || '.';

    if (
      !norm ||
      rawId === 'nav:home' ||
      ['home', 'menu', 'start', '0', 'رئيسيه', 'الرئيسيه', 'قائمه', 'القائمه', 'ابدأ', 'ابدا', 'مرحبا', 'السلام عليكم', 'اهلا'].includes(norm)
    ) {
      return this._renderMainMenu(user);
    }

    if (rawId === 'nav:help' || rawId === 'help_settings:guide' || ['help', 'مساعده', '؟', '?'].includes(norm)) {
      return buildHelpResponse(this.config.botName, prefix);
    }

    if (rawId === 'nav:cancel' || ['cancel', 'الغاء', 'إلغاء', 'خروج'].includes(norm)) {
      this.repos.users.setState(user.id, { menu: 'home', data: {} });
      return {
        text: `❎ تم إلغاء العملية الحالية.\n\n${buildMainMenuText(this.config.botName, user, this.repos.admin.getSetting('welcome_banner_ar', ''), prefix)}`,
        interactiveList: buildInteractiveListPayload(this.config.botName, user),
        buttons: buildMainMenuButtons(),
      };
    }

    const currentState = this.repos.users.getState(user.id);

    if (rawId === 'nav:back' || ['back', 'رجوع', 'عوده'].includes(norm)) {
      return this._handleBack(user, currentState);
    }

    // Direct interactive callback namespace routing (works from any screen, even earlier messages)
    if (rawId) {
      const callbackHandled = await this._routeInteractiveCallback({ user, selectedId: rawId, currentState });
      if (callbackHandled) return callbackHandled;
    }

    const targetMenu = this._matchMenuTarget(norm, currentState);
    if (targetMenu) {
      return this._openMenu(targetMenu, user);
    }

    switch (currentState.menu) {
      case 'tutor':
        return this.modules.tutor.handleInput({ user, text: rawInput, selectedId: rawId || null, state: currentState });
      case 'languages':
        return this.modules.languages.handleInput({ user, text: rawInput, selectedId: rawId || null, state: currentState });
      case 'programming':
        return this.modules.programming.handleInput({ user, text: rawInput, selectedId: rawId || null, state: currentState });
      case 'research':
        return this.modules.research.handleInput({ user, text: rawInput, selectedId: rawId || null });
      case 'audio':
        return this.modules.audio.handleMenuAction({ user, text: rawInput, selectedId: rawId || null, repos: this.repos });
      case 'creative':
        return this.modules.creative
          ? this.modules.creative.handleInput({ user, text: rawInput, selectedId: rawId || null, state: currentState })
          : this._renderMainMenu(user);
      case 'library':
        return this.modules.library.handleInput({ user, text: rawInput, selectedId: rawId || null, state: currentState });
      case 'support':
        return this.modules.support.handleInput({ user, text: rawInput, selectedId: rawId || null, state: currentState });
      case 'help_settings':
        return this._handleHelpSettingsInput({ user, text: rawInput, selectedId: rawId || null, state: currentState });
      case 'settings':
        return this.profileHandler.handleSettingsInput({ user, text: rawInput, selectedId: rawId || null, state: currentState });
      case 'progress':
        return this.profileHandler.openProgress(user);
      default: {
        // Bare invalid numeric selection at home menu
        if (/^\d+$/.test(norm)) {
          return {
            text: `⚠️ الخيار *${norm}* غير موجود في القائمة الرئيسية.\nأرسل رقماً من *1* إلى *9*، أو أرسل *رئيسية* لعرض القائمة التفاعلية.`,
            buttons: [
              { id: 'nav:home', title: '🏠 الرئيسية' },
              { id: 'nav:help', title: '❓ مساعدة' },
            ],
          };
        }
        // Explicit web search / URL intent from home goes directly to Research Engine
        if (WEB_INTENT_PATTERN.test(rawInput.trim())) {
          this.repos.users.setState(user.id, { menu: 'research', data: { mode: 'await_query' } });
          return this.modules.research.handleInput({ user, text: rawInput, forceWebSearch: true });
        }
        // Natural questions/prompts from home go straight to Conversational AI Assistant
        if (rawInput.trim().length >= 4) {
          this.repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });
          return this.modules.tutor.handleInput({
            user,
            text: rawInput,
            state: { menu: 'tutor', data: { mode: 'chat' } },
          });
        }
        return this._renderMainMenu(user);
      }
    }
  }

  async _routeInteractiveCallback({ user, selectedId, currentState }) {
    if (selectedId.startsWith('menu:')) {
      return this._openMenu(selectedId.slice(5), user);
    }
    if (selectedId.startsWith('tutor:')) {
      const state = currentState.menu === 'tutor' ? currentState : { menu: 'tutor', data: { mode: 'chat' } };
      return this.modules.tutor.handleInput({ user, text: selectedId, selectedId, state });
    }
    if (selectedId.startsWith('lang:')) {
      const state = currentState.menu === 'languages' ? currentState : { menu: 'languages', data: { step: 'select_language' } };
      return this.modules.languages.handleInput({ user, text: selectedId, selectedId, state });
    }
    if (selectedId.startsWith('prog:')) {
      const state = currentState.menu === 'programming' ? currentState : { menu: 'programming', data: { step: 'select_track' } };
      return this.modules.programming.handleInput({ user, text: selectedId, selectedId, state });
    }
    if (selectedId.startsWith('research:')) {
      return this.modules.research.handleInput({ user, text: selectedId, selectedId });
    }
    if (selectedId.startsWith('voice:')) {
      this.repos.users.setState(user.id, { menu: 'audio', data: {} });
      return this.modules.audio.handleMenuAction({ user, text: selectedId, selectedId, repos: this.repos });
    }
    if (selectedId.startsWith('creative:') && this.modules.creative) {
      const state = currentState.menu === 'creative' ? currentState : { menu: 'creative', data: { step: 'await_prompt', aspectRatio: '1:1' } };
      return this.modules.creative.handleInput({ user, text: selectedId, selectedId, state });
    }
    if (selectedId.startsWith('library:')) {
      const state = currentState.menu === 'library' ? currentState : { menu: 'library', data: { kind: 'hub', page: 1 } };
      return this.modules.library.handleInput({ user, text: selectedId, selectedId, state });
    }
    if (selectedId.startsWith('settings:')) {
      const state = currentState.menu === 'settings' ? currentState : { menu: 'settings', data: { step: 'menu' } };
      return this.profileHandler.handleSettingsInput({ user, text: selectedId, selectedId, state });
    }
    if (selectedId === 'support:open') {
      return this.modules.support.openHome(user);
    }
    return null;
  }

  async _handleHelpSettingsInput({ user, text, selectedId, state }) {
    const raw = String(selectedId || text || '').trim();
    const norm = normalizeCommandText(raw);
    if (norm === '1' || raw === 'settings:open') {
      return this.profileHandler.openSettings(user);
    }
    if (norm === '2' || raw === 'help_settings:guide') {
      return buildHelpResponse(this.config.botName, this.config?.botPrefix || '.');
    }
    if (norm === '3' || raw === 'support:open') {
      return this.modules.support.openHome(user);
    }
    if (norm === '4' || raw === 'settings:export') {
      return this.profileHandler.handleSettingsInput({
        user,
        text: '3',
        selectedId: 'settings:export',
        state: { menu: 'settings', data: { step: 'menu' } },
      });
    }
    return this.profileHandler.openHelpAndSettingsHub(user);
  }

  _matchMenuTarget(norm, currentState) {
    if (norm.startsWith('menu:')) {
      return norm.slice(5);
    }
    if (currentState.menu === 'home') {
      const map = {
        '1': 'tutor',
        '2': 'languages',
        '3': 'programming',
        '4': 'research',
        '5': 'audio',
        '6': 'creative',
        '7': 'library_hub',
        '8': 'progress',
        '9': 'help_settings',
      };
      if (map[norm]) return map[norm];
    }

    if (norm === 'معلم' || norm === 'tutor') return 'tutor';
    if (norm === 'لغات' || norm === 'languages') return 'languages';
    if (norm === 'برمجه' || norm === 'programming') return 'programming';
    if (norm === 'بحث' || norm === 'research') return 'research';
    if (norm === 'صوت' || norm === 'audio') return 'audio';
    if (norm === 'استوديو' || norm === 'تصميم' || norm === 'creative' || norm === 'studio') return 'creative';
    if (norm === 'مكتبه' || norm === 'library') return 'knowledge';
    if (norm === 'انمي' || norm === 'anime') return 'anime';
    if (norm === 'تقدم' || norm === 'progress') return 'progress';
    if (norm === 'اعدادات' || norm === 'settings') return 'settings';
    if (norm === 'دعم' || norm === 'support') return 'support';

    return null;
  }

  async _openMenu(target, user) {
    switch (target) {
      case 'tutor':
        return this.modules.tutor.openHome(user);
      case 'languages':
        return this.modules.languages.openHome(user);
      case 'programming':
        return this.modules.programming.openHome(user);
      case 'research':
        return this.modules.research.openHome(user);
      case 'audio':
        this.repos.users.setState(user.id, { menu: 'audio', data: {} });
        return this.modules.audio.handleMenuAction({ user, text: '', repos: this.repos });
      case 'creative':
        return this.modules.creative ? this.modules.creative.openHome(user) : this._renderMainMenu(user);
      case 'library_hub':
        return this.modules.library.openHub(user);
      case 'knowledge':
        return this.modules.library.openKnowledge(user);
      case 'anime':
        return this.modules.library.openAnime(user);
      case 'progress':
        return this.profileHandler.openProgress(user);
      case 'help_settings':
        return this.profileHandler.openHelpAndSettingsHub(user);
      case 'settings':
        return this.profileHandler.openSettings(user);
      case 'support':
        return this.modules.support.openHome(user);
      case 'help':
        return buildHelpResponse(this.config.botName, this.config?.botPrefix || '.');
      default:
        return this._renderMainMenu(user);
    }
  }

  async _handleBack(user, currentState) {
    const data = currentState?.data || {};
    if (currentState.menu === 'languages') {
      if (typeof this.modules.languages.handleBack === 'function') {
        return this.modules.languages.handleBack(user, data);
      }
      if (data.step && data.step !== 'select_language') {
        return this.modules.languages.openHome(user);
      }
    }
    if (currentState.menu === 'programming') {
      if (typeof this.modules.programming.handleBack === 'function') {
        return this.modules.programming.handleBack(user, data);
      }
      if (data.step && data.step !== 'select_track') {
        return this.modules.programming.openHome(user);
      }
    }
    if (currentState.menu === 'tutor' && data.activeQuiz) {
      return this.modules.tutor.openHome(user);
    }
    if (currentState.menu === 'library' && data.kind && data.kind !== 'hub') {
      return this.modules.library.openHub(user);
    }
    if (currentState.menu === 'settings') {
      if (data.step && data.step !== 'menu') {
        return this.profileHandler.openSettings(user);
      }
      return this.profileHandler.openHelpAndSettingsHub(user);
    }
    return this._renderMainMenu(user);
  }

  _renderMainMenu(user) {
    this.repos.users.setState(user.id, { menu: 'home', data: {} });
    const banner = this.repos.admin.getSetting('welcome_banner_ar', '');
    const prefix = this.config?.botPrefix || '.';
    return {
      text: buildMainMenuText(this.config.botName, user, banner, prefix),
      interactiveList: buildInteractiveListPayload(this.config.botName, user),
      buttons: buildMainMenuButtons(),
    };
  }
}
