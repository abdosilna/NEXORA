import { normalizeCommandText } from '../utils/text.js';
import { buildInteractiveListPayload, buildMainMenuText } from './menu.js';
import { buildHelpResponse } from './handlers/help.js';
import { ProfileAndSettingsHandler } from './handlers/profile.js';

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

    const rawInput = selectedId || text || '';
    const norm = normalizeCommandText(rawInput);

    // Global commands usable from anywhere
    if (!norm || ['home', 'menu', 'start', '0', 'رئيسيه', 'الرئيسيه', 'قائمه', 'القائمه', 'ابدأ', 'ابدا', 'مرحبا', 'السلام عليكم'].includes(norm)) {
      return this._renderMainMenu(user);
    }

    if (['help', 'مساعده', '؟', '?'].includes(norm)) {
      return buildHelpResponse(this.config.botName);
    }

    if (['cancel', 'الغاء', 'إلغاء', 'خروج'].includes(norm)) {
      this.repos.users.setState(user.id, { menu: 'home', data: {} });
      return {
        text: `❎ تم إلغاء العملية الحالية.\n${buildMainMenuText(this.config.botName, user, this.repos.admin.getSetting('welcome_banner_ar', ''))}`,
      };
    }

    const currentState = this.repos.users.getState(user.id);

    if (['back', 'رجوع', 'عوده'].includes(norm)) {
      return this._handleBack(user, currentState);
    }

    // Direct interactive menu IDs or root-level numeric menu choices
    const targetMenu = this._matchMenuTarget(norm, currentState);
    if (targetMenu) {
      return this._openMenu(targetMenu, user);
    }

    // Dispatch to currently active module state
    switch (currentState.menu) {
      case 'tutor':
        return this.modules.tutor.handleInput({ user, text: rawInput, state: currentState });
      case 'languages':
        return this.modules.languages.handleInput({ user, text: rawInput, state: currentState });
      case 'programming':
        return this.modules.programming.handleInput({ user, text: rawInput, state: currentState });
      case 'research':
        return this.modules.research.handleInput({ user, text: rawInput, state: currentState });
      case 'audio':
        return this.modules.audio.handleMenuAction({ user, text: rawInput, repos: this.repos });
      case 'library':
        return this.modules.library.handleInput({ user, text: rawInput, state: currentState });
      case 'support':
        return this.modules.support.handleInput({ user, text: rawInput, state: currentState });
      case 'settings':
        return this.profileHandler.handleSettingsInput({ user, text: rawInput, state: currentState });
      case 'progress':
        return this.profileHandler.openProgress(user);
      default:
        // If user types a free-form question right from home, show menu hint or route to AI Tutor if it's a long question
        if (rawInput.trim().length > 14 && !/^\d+$/.test(norm)) {
          return this.modules.tutor.handleInput({ user, text: rawInput, state: { menu: 'tutor', data: { mode: 'chat' } } });
        }
        return this._renderMainMenu(user);
    }
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
        '6': 'knowledge',
        '7': 'anime',
        '8': 'progress',
        '9': 'settings',
        '10': 'support',
        '11': 'help',
      };
      if (map[norm]) return map[norm];
    }

    // Named shortcuts
    if (norm === 'معلم' || norm === 'tutor') return 'tutor';
    if (norm === 'لغات' || norm === 'languages') return 'languages';
    if (norm === 'برمجه' || norm === 'programming') return 'programming';
    if (norm === 'بحث' || norm === 'research') return 'research';
    if (norm === 'صوت' || norm === 'audio') return 'audio';
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
      case 'knowledge':
        return this.modules.library.openKnowledge(user);
      case 'anime':
        return this.modules.library.openAnime(user);
      case 'progress':
        return this.profileHandler.openProgress(user);
      case 'settings':
        return this.profileHandler.openSettings(user);
      case 'support':
        return this.modules.support.openHome(user);
      case 'help':
        return buildHelpResponse(this.config.botName);
      default:
        return this._renderMainMenu(user);
    }
  }

  async _handleBack(user, currentState) {
    const data = currentState?.data || {};
    if (currentState.menu === 'languages') {
      if (data.step === 'in_lesson' || data.step === 'in_quiz' || data.step === 'select_lesson' || data.step === 'select_level') {
        return this.modules.languages.openHome(user);
      }
    }
    if (currentState.menu === 'programming') {
      if (data.step === 'in_lesson' || data.step === 'in_quiz' || data.step === 'select_lesson' || data.step === 'debug_mode') {
        return this.modules.programming.openHome(user);
      }
    }
    if (currentState.menu === 'settings' && data.step !== 'menu') {
      return this.profileHandler.openSettings(user);
    }
    return this._renderMainMenu(user);
  }

  _renderMainMenu(user) {
    this.repos.users.setState(user.id, { menu: 'home', data: {} });
    const banner = this.repos.admin.getSetting('welcome_banner_ar', '');
    return {
      text: buildMainMenuText(this.config.botName, user, banner),
      interactiveList: buildInteractiveListPayload(this.config.botName, user),
    };
  }
}
