export default {
  name: 'admin',
  command: ['status', 'plugins', 'maintenance', 'reload'],
  tags: ['admin', 'owner'],
  owner: true,
  help: ['status', 'plugins', 'maintenance [on|off]', 'reload'],

  async handler(_m, ctx) {
    const { command, args, config, repos, pluginManager, whatsappManager, healthService } = ctx;
    const cmd = (command || '').toLowerCase();

    if (cmd === 'plugins') {
      const loaded = pluginManager?.listPlugins?.() || [];
      const stats = repos.admin.listPluginStats?.() || [];
      const statMap = new Map(stats.map((s) => [s.plugin_name, s]));
      const lines = [
        `🧩 *الإضافات المحمّلة (${loaded.length}):*`,
        ...loaded.map((p) => {
          const st = statMap.get(p.name);
          const runs = st ? ` · تشغيل: ${st.total_runs} (أخطاء: ${st.error_runs})` : '';
          return `• *${p.name}* [${p.command.slice(0, 4).join(', ')}]${runs}`;
        }),
      ];
      return { text: lines.join('\n') };
    }

    if (cmd === 'maintenance') {
      const arg = String(args || '').trim().toLowerCase();
      let next;
      if (arg === 'on' || arg === 'true' || arg === 'تشغيل') {
        next = true;
      } else if (arg === 'off' || arg === 'false' || arg === 'ايقاف' || arg === 'إيقاف') {
        next = false;
      } else {
        next = !repos.admin.getSetting('maintenance_mode', false);
      }
      repos.admin.setSetting('maintenance_mode', next);
      repos.admin.logAudit({
        adminUsername: 'whatsapp-owner',
        action: 'maintenance_toggled',
        targetType: 'application_settings',
        details: { maintenance_mode: next },
      });
      return {
        text: next ? '🛠️ تم تفعيل وضع الصيانة المؤقتة.' : '✅ تم إيقاف وضع الصيانة وعاد البوت للعمل الطبيعي.',
      };
    }

    if (cmd === 'reload') {
      if (whatsappManager?.reloadHandler) {
        await whatsappManager.reloadHandler({ restartConn: false, reloadPlugins: true });
      } else if (pluginManager?.reloadPlugins) {
        await pluginManager.reloadPlugins();
      }
      const count = pluginManager?.listPlugins?.().length || 0;
      return { text: `♻️ تمت إعادة تحميل الإضافات ومعالجات واتساب بنجاح (${count} إضافة نشطة).` };
    }

    const snap = healthService?.getSnapshot?.() || {};
    const usersCount = repos.users.countUsers();
    const msgStats = repos.conversations.getStats();

    return {
      text: [
        `📊 *حالة النظام — ${config.botName}*`,
        `• قاعدة البيانات: *${snap.database?.status || 'ok'}*`,
        `• اتصال واتساب: *${snap.whatsapp?.state || 'unknown'}*`,
        `• الإضافات النشطة: *${pluginManager?.listPlugins?.().length || 0}*`,
        `• المتعلمون المسجلون: *${usersCount}*`,
        `• إجمالي الرسائل التفاعلية: *${msgStats.totalMessages}* (اليوم: ${msgStats.todayMessages})`,
        `• وضع الصيانة: *${repos.admin.getSetting('maintenance_mode', false) ? 'مفعّل' : 'متوقف'}*`,
      ].join('\n'),
    };
  },
};
