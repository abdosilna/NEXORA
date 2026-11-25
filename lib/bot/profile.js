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
      ? summary.bySubject.map((s) => `• ${s.subject}: ${s.lessons_count} درس (إتقان ${s.avg_mastery || 0}%)`).join('\n')
      : '• لم تبدأ أي مسار بعد — جرّب أكاديمية اللغات أو البرمجة!';

    const levelAr =
      user.learning_level === 'advanced' ? 'متقدم' : user.learning_level === 'intermediate' ? 'متوسط' : 'مبتدئ';

    return {
      text: [
        formatHeader('📊', `تقدّمك التعليمي — ${user.display_name || user.phone_number}`),
        `المستوى: *${levelAr}* · النقاط: *${user.total_points}*`,
        `الدروس المكتملة: *${summary.completedLessons}* · قيد التعلّم: *${summary.inProgressLessons}*`,
        `الاختبارات: *${summary.quizCorrect}/${summary.quizTotal}* (دقة *${summary.quizAccuracy}%*)`,
        `مراجعات مستحقة بالتكرار المتباعد: *${summary.dueReviews}*`,
        `أخطاء قيد المراجعة: *${summary.openMistakes || 0}*`,
        `حفظ التقدّم التكيفي: *${aiProfile?.memory_consent === false ? 'متوقف باختيارك' : 'مفعّل'}*`,
        '',
        `📚 *حسب المسار:*`,
        subjectsText,
        '',
        `💪 نقاط القوة المحفوظة: ${prefs.strengths.join('، ') || 'لم تُسجّل بعد'}`,
        `🎯 نقاط للتركيز: ${prefs.weaknesses.join('، ') || 'لا يوجد حالياً'}`,
        ARABIC_DIVIDER,
        `أرسل *رئيسية* للعودة.`,
      ].join('\n'),
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
        `أرسل رقم الخيار، أو *رئيسية* للعودة.`,
      ].join('\n'),
    };
  }

  handleSettingsInput({ user, text, state }) {
    const norm = normalizeCommandText(text);
    const data = state?.data || {};

    if (data.step === 'confirm_delete') {
      if (norm === 'نعم احذف بياناتي' || norm === 'confirm delete') {
        this.repos.users.deleteUser(user.id);
        return {
          text: '🗑️ تم حذف ملفك وتاريخ تعلمك وبياناتك بالكامل من قاعدة البيانات. عند إرسال أي رسالة مستقبلية سيتم تسجيلك كحساب جديد.',
        };
      }
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'menu' } });
      return { text: '✅ تم إلغاء عملية الحذف. بياناتك ما زالت محفوظة بأمان.' };
    }

    if (data.step === 'choose_level') {
      let nextLevel = null;
      if (norm === '1' || norm.includes('مبتدئ') || norm === 'beginner') nextLevel = 'beginner';
      if (norm === '2' || norm.includes('متوسط') || norm === 'intermediate') nextLevel = 'intermediate';
      if (norm === '3' || norm.includes('متقدم') || norm === 'advanced') nextLevel = 'advanced';

      if (!nextLevel) {
        return { text: 'يرجى إرسال *1* (مبتدئ) أو *2* (متوسط) أو *3* (متقدم).' };
      }

      this.repos.users.updateProfile(user.id, { learningLevel: nextLevel });
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'menu' } });
      return { text: `✅ تم تحديث مستواك التعليمي إلى *${nextLevel}* بنجاح.` };
    }

    if (norm === '1') {
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'choose_level' } });
      return { text: 'اختر مستواك التعليمي الجديد:\n*1.* مبتدئ\n*2.* متوسط\n*3.* متقدم' };
    }

    if (norm === '2') {
      const prefs = this.repos.users.getPreferences(user.id);
      const next = !prefs.voice_replies_enabled;
      this.repos.users.updatePreferences(user.id, { voice_replies_enabled: next });
      return { text: next ? '🔊 تم تفعيل الردود الصوتية.' : '🔇 تم إيقاف الردود الصوتية.' };
    }

    if (norm === '3' || norm.includes('تصدير') || norm === 'export') {
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
        text: `📦 *ملف تصدير بياناتك (${exported.exportedAt}):*\n\`\`\`\n${summaryJson}\n\`\`\`\nيمكنك طلب النسخة الكاملة من المشرف إذا رغبت بأرشفة كل الرسائل.`,
      };
    }

    if (norm === '4' || norm.includes('حذف')) {
      this.repos.users.setState(user.id, { menu: 'settings', data: { step: 'confirm_delete' } });
      return {
        text: `⚠️ *تأكيد حذف الحساب والبيانات*\nسيتم حذف تقدمك واختباراتك ومحادثاتك نهائياً.\nللتأكيد أرسل الجملة التالية حرفياً:\n*نعم احذف بياناتي*\nأو أرسل *إلغاء* للتراجع.`,
      };
    }

    if (norm === '5' || norm.includes('ذاكره')) {
      const current = this.repos.users.getAiLearningProfile?.(user.id);
      const nextConsent = !(current?.memory_consent ?? true);
      this.repos.users.upsertAiLearningProfile?.(user.id, { memory_consent: nextConsent });
      return {
        text: nextConsent
          ? '✅ تم تفعيل حفظ الذاكرة التعليمية للمعلم الذكي بموافقتك.'
          : '🔒 تم إيقاف حفظ الذاكرة التعليمية التلقائية؛ لن يحفظ المعلم نقاط ضعف أو مستوى جديدة دون تفعيلك لها.',
      };
    }

    return this.openSettings(user);
  }
}
