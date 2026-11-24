import { buildHelpResponse } from '../lib/bot/help.js';
import { ProfileAndSettingsHandler } from '../lib/bot/profile.js';

export default {
  name: 'menu',
  command: [
    'menu',
    'main',
    'start',
    'help',
    'progress',
    'settings',
    'support',
    'قائمة',
    'قائمه',
    'رئيسية',
    'رئيسيه',
    'مساعدة',
    'مساعده',
    'تقدم',
    'اعدادات',
    'إعدادات',
    'دعم',
  ],
  tags: ['core', 'navigation'],
  help: ['menu', 'help', 'progress', 'settings', 'support'],

  async handler(m, ctx) {
    const cmd = (ctx.command || '').toLowerCase();
    const { user, repos, router, modules, config } = ctx;
    const profileHandler = new ProfileAndSettingsHandler({ repos });

    if (cmd === 'help' || cmd === 'مساعدة' || cmd === 'مساعده') {
      return buildHelpResponse(config.botName, config.botPrefix);
    }

    if (cmd === 'progress' || cmd === 'تقدم') {
      return profileHandler.openProgress(user);
    }

    if (cmd === 'settings' || cmd === 'اعدادات' || cmd === 'إعدادات') {
      if (m.isGroup) {
        return { text: '🔒 إعدادات الحساب وتصدير/حذف البيانات متاحة في المحادثة الخاصة فقط حفاظاً على خصوصيتك.' };
      }
      if (ctx.args) {
        return profileHandler.handleSettingsInput({ user, text: ctx.args, state: repos.users.getState(user.id) });
      }
      return profileHandler.openSettings(user);
    }

    if (cmd === 'support' || cmd === 'دعم') {
      if (m.isGroup) {
        return { text: '🌿 قسم الدعم الدراسي الخاص متاح في المحادثة الفردية فقط لضمان خصوصيتك الكاملة.' };
      }
      if (ctx.args) {
        return modules.support.handleInput({ user, text: ctx.args });
      }
      return modules.support.openHome(user);
    }

    return router._renderMainMenu(user);
  },
};
