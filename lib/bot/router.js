import { normalizeCommandText } from '../utils/text.js';
import { buildInteractiveListPayload, buildMainMenuText } from './menu.js';
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

    const rawInput = selectedId || text || '';
    const norm = normalizeCommandText(rawInput);
    const prefix = this.config?.botPrefix || '.';

    if (
      !norm ||
      ['home', 'menu', 'start', '0', 'رئيسيه', 'الرئيسيه', 'قائمه', 'القائمه', 'ابدأ', 'ابدا', 'مرحبا', 'السلام عليكم', 'اهلا'].includes(norm)
    ) {
      return this._renderMainMenu(user);
    }

    if (['help', 'مساعده', '؟', '?'].includes(norm)) {
      return buildHelpResponse(this.config.botName, prefix);
    }

    if (['cancel', 'الغاء', 'إلغاء', 'خروج'].includes(norm)) {
      this.repos.users.setState(user.id, { menu: 'home', data: {} });
      return {
        text: `❎ تم إلغاء العملية الحالية.\n\n${buildMainMenuText(this.config.botName, user, this.repos.admin.getSetting('welcome_banner_ar', ''), prefix)}`,
        interactiveList: buildInteractiveListPayload(this.config.botName, user),
      };
    }

    const currentState = this.repos.users.getState(user.id);

    if (['back', 'رجوع', 'عوده'].includes(norm)) {
      return this._handleBack(user, currentState);
    }

    const targetMenu = this._matchMenuTarget(norm, currentState);
    if (targetMenu) {
      return this._openMenu(targetMenu, user);
    }

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
      default: {
        // Bare invalid numeric selection at home menu
        if (/^\d+$/.test(norm)) {
          return {
            text: `⚠️ الخيار *${norm}* غير موجود في القائمة الرئيسية.\nأرسل رقماً من *1* إلى *11*، أو أرسل *رئيسية* لعرض القائمة.`,
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
    if (currentState.menu === 'settings' && data.step !== 'menu') {
      return this.profileHandler.openSettings(user);
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
    };
  }
}
