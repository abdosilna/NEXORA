import { ARABIC_DIVIDER, formatHeader, normalizeCommandText } from '../utils/text.js';

export class ProfileAndSettingsHandler {
  constructor({ repos }) {
    this.repos = repos;
  }

  openProgress(user) {
    this.repos.users.setState(user.id, { menu: 'progress', data: {} });
    const summary = this.repos.progress.getUserSummary(user.id);
    const prefs = this.repos.users.getPreferences(user.id);
    const aiProfile = this.repos.users.getAiLearningProfile?.(user.id);

    const subjectsText = summary.bySubject.length
      ? summary.bySubject.map((s) => `• *${s.subject}*: ${s.lessons_count} درس (إتقان ${s.avg_mastery || 0}%)`).join('\n')
      : '• لم تبدأ أي مسار بعد — جرّب أكاديمية اللغات أو البرمجة!';

    const levelAr =
      user.learning_level === 'advanced' ? 'متقدم' : user.learning_level === 'intermediate' ? 'متوسط' : 'مبتدئ';

    return {
      text: [
        formatHeader('📊', `تقدّمك التعليمي — ${user.display_name || user.phone_number}`),
        `❖ المستوى: *${levelAr}* · النقاط: *${user.total_points} XP*`,
        `• الدروس المكتملة: *${summary.completedLessons}* · قيد التعلّم: *${summary.inProgressLessons}*`,
        `• الاختبارات: *${summary.quizCorrect}/${summary.quizTotal}* (دقة *${summary.quizAccuracy}%*)`,
        `• مراجعات التكرار المتباعد المستحقة: *${summary.dueReviews}*`,
        `• أخطاء مفتوحة للمراجعة: *${summary.openMistakes || 0}*`,
        `• حفظ الذاكرة التعليمية: *${aiProfile?.memory_consent === false ? 'متوقف باختيارك' : 'مفعّل'}*`,
        '',
        `❖ *التقدّم حسب المسار:*`,
        subjectsText,
        '',
        `💪 نقاط القوة: ${prefs.strengths.join('، ') || 'لم تُسجّل بعد'}`,
        `🎯 للتركيز والمراجعة: ${prefs.weaknesses.join('، ') || 'لا يوجد حالياً'}`,
        ARABIC_DIVIDER,
        `اختر وجتك التالية أو أرسل *رئيسية* للعودة.`,
      ].join('\n'),
      buttons: [
        { id: 'menu:languages', title: '🌍 أكاديمية اللغات' },
        { id: 'menu:programming', title: '💻 أكاديمية البرمجة' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  openHelpAndSettingsHub(user) {
    this.repos.users.setState(user.id, { menu: 'help_settings', data: { step: 'hub' } });
    return {
      text: [
        formatHeader('⚙️', 'المساعدة والإعدادات — NEXORA', 'إدارة الحساب، الخصوصية، الدليل، والدعم الدراسي'),
        `*1.* ⚙️ إعدادات الحساب والخصوصية وتصدير البيانات`,
        `*2.* ❓ دليل الاستخدام والأوامر السريعة`,
        `*3.* 🌿 الدعم الدراسي الآمن وتنظيم الوقت`,
        `*4.* 📦 تصدير ملخص بياناتي فوراً (JSON)`,
        ARABIC_DIVIDER,
        `اختر من القائمة التفاعلية أو أرسل رقم الخيار (1–4).`,
      ].join('\n'),
      interactiveList: {
        title: '⚙️ المساعدة والإعدادات',
        text: 'اختر القسم المطلوب:',
        buttonText: 'خيارات الإعدادات',
        footer: 'نيكسورا · خصوصيتك أولوية',
        sections: [
          {
            title: 'الحساب والخصوصية والمساعدة',
            rows: [
              { rowId: 'settings:open', title: '⚙️ الإعدادات والخصوصية', description: 'المستوى، الصوت، الذاكرة، وتصدير/حذف الحساب' },
              { rowId: 'help_settings:guide', title: '❓ دليل الأوامر', description: 'شرح كل الأقسام والأوامر في الخاص والمجموعات' },
              { rowId: 'support:open', title: '🌿 الدعم الدراسي الآمن', description: 'تنظيم الجدول وتخفيف قلق الاختبارات بخصوصية تامة' },
              { rowId: 'settings:export', title: '📦 تصدير بياناتي', description: 'عرض ملخص بياناتك المحفوظة بصيغة JSON' },
            ],
          },
        ],
      },
      buttons: [
        { id: 'settings:open', title: '⚙️ الإعدادات' },
        { id: 'help_settings:guide', title: '❓ الدليل' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  openSettings(user) {
    const prefs = this.repos.users.getPreferences(user.id);
    const aiProfile = this.repos.users.getAiLearningProfile?.(user.id);
    this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'menu' } });

    const levelAr =
      user.learning_level === 'advanced' ? 'متقدم' : user.learning_level === 'intermediate' ? 'متوسط' : 'مبتدئ';
    const consentStatus = aiProfile?.memory_consent === false ? 'متوقف (خصوصية صارمة)' : 'مفعّل بموافقتك';

    return {
      text: [
        formatHeader('⚙️', 'الإعدادات والخصوصية'),
        `الاسم: *${user.display_name || 'غير محدد'}*`,
        `المستوى الدراسي: *${levelAr}*`,
        `اللغة المفضلة: *${user.preferred_language}*`,
        `الردود الصوتية: *${prefs.voice_replies_enabled ? 'مفعّلة' : 'متوقفة'}*`,
        `الذاكرة التعليمية للمعلّم: *${consentStatus}*`,
        '',
        `اختر الإجراء:`,
        `*1.* تغيير المستوى (مبتدئ / متوسط / متقدم)`,
        `*2.* تبديل الردود الصوتية`,
        `*3.* تصدير بياناتي الشخصية (JSON)`,
        `*4.* حذف حسابي وجميع بياناتي نهائياً`,
        `*5.* تفعيل / إيقاف حفظ الذاكرة التعليمية للمعلّم`,
        ARABIC_DIVIDER,
        `أرسل رقم الخيار، أو *رجوع* / *رئيسية*.`,
      ].join('\n'),
      interactiveList: {
        title: '⚙️ إعدادات المتعلّم',
        text: 'اختر الإجراء المطلوب تعديله:',
        buttonText: 'إجراءات الإعدادات',
        footer: 'خصوصيتك محمية ولا تُشارك مع الغير',
        sections: [
          {
            title: 'تخصيص الحساب والخصوصية',
            rows: [
              { rowId: 'settings:level', title: '🎯 تغيير المستوى', description: 'اختر مبتدئ أو متوسط أو متقدم' },
              { rowId: 'settings:voice', title: '🔊 الردود الصوتية', description: 'تفعيل أو إيقاف النطق الصوتي' },
              { rowId: 'settings:toggle_memory', title: '🧠 موافقة الذاكرة', description: 'تفعيل أو إيقاف حفظ تفضيلات التعلم' },
              { rowId: 'settings:export', title: '📦 تصدير بياناتي', description: 'ملخص JSON للبيانات المحفوظة' },
              { rowId: 'settings:delete', title: '🗑️ حذف الحساب', description: 'حذف كافة بياناتك وتقدمك نهائياً' },
            ],
          },
        ],
      },
      buttons: [
        { id: 'settings:level', title: '🎯 المستوى' },
        { id: 'settings:toggle_memory', title: '🧠 الذاكرة' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  handleSettingsInput({ user, text, selectedId = null, state }) {
    const raw = String(selectedId || text || '').trim();
    const norm = normalizeCommandText(raw);
    const data = state?.data || {};

    if (raw === 'settings:open') {
      return this.openSettings(user);
    }

    if (data.step === 'confirm_delete') {
      if (norm === 'نعم احذف بياناتي' || norm === 'confirm delete') {
        this.repos.users.deleteUser(user.id);
        return {
          text: '🗑️ تم حذف ملفك وتاريخ تعلمك وبياناتك بالكامل من قاعدة البيانات. عند إرسال أي رسالة مستقبلية سيتم تسجيلك كحساب جديد.',
          buttons: [{ id: 'nav:home', title: '🏠 بدء جديد' }],
        };
      }
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'menu' } });
      return {
        text: '✅ تم إلغاء عملية الحذف. بياناتك ما زالت محفوظة بأمان.',
        buttons: [
          { id: 'settings:open', title: '⚙️ الإعدادات' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    if (data.step === 'choose_level' || raw.startsWith('settings:set_level:')) {
      let nextLevel = null;
      const picked = raw.startsWith('settings:set_level:') ? raw.slice('settings:set_level:'.length) : norm;
      if (picked === '1' || picked.includes('مبتدئ') || picked === 'beginner') nextLevel = 'beginner';
      if (picked === '2' || picked.includes('متوسط') || picked === 'intermediate') nextLevel = 'intermediate';
      if (picked === '3' || picked.includes('متقدم') || picked === 'advanced') nextLevel = 'advanced';

      if (!nextLevel) {
        return {
          text: 'يرجى اختيار *1* (مبتدئ) أو *2* (متوسط) أو *3* (متقدم).',
          buttons: [
            { id: 'settings:set_level:beginner', title: '1️⃣ مبتدئ' },
            { id: 'settings:set_level:intermediate', title: '2️⃣ متوسط' },
            { id: 'settings:set_level:advanced', title: '3️⃣ متقدم' },
          ],
        };
      }

      this.repos.users.updateProfile(user.id, { learningLevel: nextLevel });
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'menu' } });
      return {
        text: `✅ تم تحديث مستواك التعليمي إلى *${nextLevel}* بنجاح.`,
        buttons: [
          { id: 'settings:open', title: '⚙️ الإعدادات' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    if (norm === '1' || raw === 'settings:level') {
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'choose_level' } });
      return {
        text: 'اختر مستواك التعليمي الجديد:\n*1.* مبتدئ\n*2.* متوسط\n*3.* متقدم',
        buttons: [
          { id: 'settings:set_level:beginner', title: '1️⃣ مبتدئ' },
          { id: 'settings:set_level:intermediate', title: '2️⃣ متوسط' },
          { id: 'settings:set_level:advanced', title: '3️⃣ متقدم' },
        ],
      };
    }

    if (norm === '2' || raw === 'settings:voice') {
      const prefs = this.repos.users.getPreferences(user.id);
      const next = !prefs.voice_replies_enabled;
      this.repos.users.updatePreferences(user.id, { voice_replies_enabled: next });
      return {
        text: next ? '🔊 تم تفعيل الردود الصوتية.' : '🔇 تم إيقاف الردود الصوتية.',
        buttons: [
          { id: 'settings:open', title: '⚙️ الإعدادات' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    if (norm === '3' || raw === 'settings:export' || norm.includes('تصدير') || norm === 'export') {
      const exported = this.repos.users.exportUserData(user.id);
      const summaryJson = JSON.stringify(
        {
          exportedAt: exported.exportedAt,
          profile: exported.profile,
          preferences: {
            voice_replies_enabled: exported.preferences.voice_replies_enabled,
            tutor_style: exported.preferences.tutor_style,
            strengths: exported.preferences.strengths,
            weaknesses: exported.preferences.weaknesses,
          },
          stats: {
            progressItems: exported.progress.length,
            quizAttempts: exported.quizAttempts.length,
            mistakes: exported.mistakes?.length || 0,
            researchHistory: exported.researchHistory?.length || 0,
            conversations: exported.conversations.length,
          },
        },
        null,
        2
      );
      return {
        text: `📦 *ملف تصدير بياناتك (${exported.exportedAt}):*\n\`\`\`\n${summaryJson}\n\`\`\`\nبياناتك الخاصة متاحة لك وحدك ولا تُعرض للمشرفين.`,
        buttons: [
          { id: 'settings:open', title: '⚙️ الإعدادات' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    if (norm === '4' || raw === 'settings:delete' || norm.includes('حذف')) {
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'confirm_delete' } });
      return {
        text: `⚠️ *تأكيد حذف الحساب والبيانات*\nسيتم حذف تقدمك واختباراتك ومحادثاتك نهائياً.\nللتأكيد أرسل الجملة التالية حرفياً:\n*نعم احذف بياناتي*\nأو أرسل *إلغاء* للتراجع.`,
        buttons: [
          { id: 'nav:cancel', title: '❎ إلغاء الحذف' },
          { id: 'settings:open', title: '⚙️ الإعدادات' },
        ],
      };
    }

    if (norm === '5' || raw === 'settings:toggle_memory' || norm.includes('ذاكره')) {
      const current = this.repos.users.getAiLearningProfile?.(user.id);
      const nextConsent = !(current?.memory_consent ?? true);
      this.repos.users.upsertAiLearningProfile?.(user.id, { memory_consent: nextConsent });
      return {
        text: nextConsent
          ? '✅ تم تفعيل حفظ الذاكرة التعليمية للمعلم الذكي بموافقتك.'
          : '🔒 تم إيقاف حفظ الذاكرة التعليمية التلقائية؛ لن يحفظ المعلم نقاط ضعف أو مستوى جديدة دون تفعيلك لها.',
        buttons: [
          { id: 'settings:open', title: '⚙️ الإعدادات' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    return this.openSettings(user);
  }
}
