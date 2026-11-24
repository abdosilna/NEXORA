import { normalizeCommandText } from '../../utils/text.js';

export class TutorModule {
  constructor({ aiService, repos }) {
    this.aiService = aiService;
    this.repos = repos;
  }

  async openHome(user) {
    const prefs = this.repos.users.getPreferences(user.id);
    const summary = this.repos.progress.getUserSummary(user.id);
    const weaknessesText = prefs.weaknesses.length ? prefs.weaknesses.join('، ') : 'لم تُرصد بعد';
    const strengthsText = prefs.strengths.length ? prefs.strengths.join('، ') : 'قيد البناء';

    this.repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });

    return {
      text: [
        `🎓 *المعلم الشخصي الذكي*`,
        `المستوى الحالي: *${this._levelAr(user.learning_level)}* · النقاط: *${user.total_points}*`,
        `نقاط القوة: ${strengthsText}`,
        `نقاط تحتاج مراجعة: ${weaknessesText}`,
        `الدروس المكتملة: ${summary.completedLessons} · دقة الاختبارات: ${summary.quizAccuracy}%`,
        ``,
        `اكتب أي سؤال أو موضوع تريد شرحه بالعربية، أو اختر أمراً:`,
        `1️⃣ توليد درس مخصص`,
        `2️⃣ اختبار سريع حسب مستواك`,
        `3️⃣ مراجعة أخطائي المتكررة`,
        `4️⃣ تلميح (أثناء أي اختبار)`,
        `• أرسل *رئيسية* للعودة للقائمة الرئيسية`,
      ].join('\n'),
    };
  }

  async handleInput({ user, text, state }) {
    const norm = normalizeCommandText(text);
    const data = state?.data || {};

    // Active quiz flow inside tutor
    if (data.activeQuiz) {
      if (norm === 'تلميح' || norm === 'hint' || norm === '4') {
        const nextHintIdx = (data.activeQuiz.hintsUsed || 0) + 1;
        const hints = data.activeQuiz.hints || [
          'ركّز على الكلمة المفتاحية في السؤال واستبعد الخيار البعيد منطقياً.',
          'تذكّر القاعدة الأساسية للمفهوم قبل النظر إلى التفاصيل.',
        ];
        const hint = hints[Math.min(nextHintIdx - 1, hints.length - 1)];
        this.repos.users.setState(user.id, {
          menu: 'tutor',
          data: {
            ...data,
            activeQuiz: { ...data.activeQuiz, hintsUsed: nextHintIdx },
          },
        });
        return { text: `💡 *تلميح (${nextHintIdx}):*\n${hint}\n\nأرسل رقم أو نص إجابتك الآن.` };
      }

      return this._evaluateQuizAnswer({ user, text, quiz: data.activeQuiz });
    }

    if (norm === '1' || norm.startsWith('درس ')) {
      const topic = norm.startsWith('درس ') ? text.trim().slice(4).trim() : 'التفكير المنطقي وتنظيم الدراسة';
      return this._generateLesson({ user, topic });
    }

    if (norm === '2' || norm.startsWith('اختبار')) {
      const topic = text.trim().replace(/^اختبار\s*/i, '').trim() || 'مفاهيم عامة حسب مستواي';
      return this._startQuickQuiz({ user, topic });
    }

    if (norm === '3' || norm.includes('مراجعه') || norm.includes('اخطائي')) {
      return this._generateRevision({ user });
    }

    // Free-form Arabic explanation adapted to user's level & history
    const prefs = this.repos.users.getPreferences(user.id);
    const history = this.repos.conversations.getRecentForUser(user.id, { module: 'tutor', limit: 6 });
    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.message_text })),
      { role: 'user', content: text },
    ];

    const systemAddon = `مستوى المتعلم: ${user.learning_level}.
نقاط القوة المسجلة: ${prefs.strengths.join(', ') || 'غير محددة'}.
نقاط الضعف المسجلة: ${prefs.weaknesses.join(', ') || 'غير محددة'}.
قدّم شرحاً بالعربية واضحاً ومرتباً مع مثال واحد وسؤال تحقق قصير في النهاية. لا تختلق مصادر.`;

    const res = await this.aiService.complete({
      userId: user.id,
      systemAddon,
      messages,
      context: { level: user.learning_level },
    });

    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'tutor',
      eventType: 'topic_explained',
      topic: text.slice(0, 80),
      payload: { provider: res.provider },
    });

    return {
      text: `${res.text}\n\n—\n💬 يمكنك طرح سؤال متابعة، أو إرسال *2* لاختبار سريع، أو *رئيسية* للخروج.`,
    };
  }

  async _generateLesson({ user, topic }) {
    const res = await this.aiService.complete({
      userId: user.id,
      systemAddon: `أنشئ درساً تعليمياً قصيراً ومنظماً بالعربية حول "${topic}" يناسب المستوى (${user.learning_level}). قسّمه إلى: الهدف، الشرح المبسط، مثال عملي، ونقطة للمراجعة.`,
      messages: [{ role: 'user', content: `اشرح لي درساً حول: ${topic}` }],
      context: { level: user.learning_level },
    });

    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'tutor',
      eventType: 'lesson_generated',
      topic,
    });

    return {
      text: `📖 *درس مخصص: ${topic}*\n\n${res.text}\n\nأرسل *2* للحصول على اختبار حول هذا الدرس، أو *رئيسية* للعودة.`,
    };
  }

  async _startQuickQuiz({ user, topic }) {
    const prefs = this.repos.users.getPreferences(user.id);
    const focusTopic = topic && topic !== 'مفاهيم عامة حسب مستواي'
      ? topic
      : prefs.weaknesses[0] || 'أساسيات البرمجة أو اللغات';

    // Deterministic reliable quiz bank + optional AI question generation
    const builtInQuiz = {
      topic: focusTopic,
      question: `سؤال تطبيقي (${this._levelAr(user.learning_level)}) حول *${focusTopic}*:\nأي منهجية هي الأفضل لترسيخ المعلومة الجديدة وتجنب النسيان؟`,
      options: [
        'التكرار المتباعد مع حل تمارين تطبيقية وشرح الفكرة بأسلوبك',
        'القراءة السريعة مرة واحدة دون تدوين أو تطبيق',
        'حفظ الإجابات فقط دون فهم السبب',
      ],
      correctIndex: '1',
      explanation: 'التكرار المتباعد والاسترجاع النشط هما الأكثر فاعلية علمياً لترسيخ الفهم طويل المدى.',
      hints: [
        'فكّر في الطريقة التي تدمج بين المراجعة على فترات والتطبيق العملي.',
        'الخيار الصحيح يذكر التكرار المتباعد.',
      ],
      hintsUsed: 0,
    };

    if (this.aiService.getActiveProvider().name !== 'fallback') {
      const prompt = `أنشئ سؤال اختيار من متعدد واحد فقط بالعربية حول "${focusTopic}" للمستوى "${user.learning_level}".
أرجع JSON فقط بهذا الشكل الدقيق دون نص إضافي:
{"question":"...","options":["خيار 1","خيار 2","خيار 3"],"correctIndex":"1","explanation":"...","hints":["تلميح 1","تلميح 2"]}`;

      const res = await this.aiService.complete({
        userId: user.id,
        systemAddon: 'أنت مولّد أسئلة تعليمية. أرجع JSON صالحاً فقط.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        context: { level: user.learning_level },
      });

      const parsed = this._tryParseQuizJson(res.text);
      if (parsed) {
        builtInQuiz.question = parsed.question;
        builtInQuiz.options = parsed.options;
        builtInQuiz.correctIndex = String(parsed.correctIndex);
        builtInQuiz.explanation = parsed.explanation;
        builtInQuiz.hints = parsed.hints?.length ? parsed.hints : builtInQuiz.hints;
      }
    }

    this.repos.users.setState(user.id, {
      menu: 'tutor',
      data: { activeQuiz: builtInQuiz },
    });

    const formattedOptions = builtInQuiz.options.map((o, idx) => `${idx + 1}) ${o}`).join('\n');
    return {
      text: [
        `📝 *اختبار المعلم الشخصي*`,
        builtInQuiz.question,
        '',
        formattedOptions,
        '',
        `أرسل رقم الإجابة (1 أو 2 أو 3)، أو أرسل *تلميح* للمساعدة، أو *إلغاء* للخروج.`,
      ].join('\n'),
    };
  }

  async _evaluateQuizAnswer({ user, text, quiz }) {
    const norm = normalizeCommandText(text);
    const isCorrect = norm === String(quiz.correctIndex);
    const hintsUsed = quiz.hintsUsed || 0;
    const score = isCorrect ? Math.max(5, 15 - hintsUsed * 3) : 0;

    this.repos.progress.recordQuizAttempt({
      userId: user.id,
      topic: quiz.topic,
      userAnswer: text,
      isCorrect,
      hintsUsed,
      scoreAwarded: score,
    });

    const prefs = this.repos.users.getPreferences(user.id);
    const strengths = new Set(prefs.strengths);
    const weaknesses = new Set(prefs.weaknesses);
    const mistakes = [...prefs.repeated_mistakes];

    if (isCorrect) {
      this.repos.users.addPoints(user.id, score);
      strengths.add(quiz.topic);
      weaknesses.delete(quiz.topic);
    } else {
      weaknesses.add(quiz.topic);
      mistakes.unshift({ topic: quiz.topic, question: quiz.question.slice(0, 80), at: new Date().toISOString() });
    }

    this.repos.users.updatePreferences(user.id, {
      strengths: [...strengths].slice(0, 10),
      weaknesses: [...weaknesses].slice(0, 10),
      repeated_mistakes: mistakes.slice(0, 15),
    });

    this.repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });

    return {
      text: [
        isCorrect ? `✅ *إجابة صحيحة! (+${score} نقطة)*` : `❌ *إجابة غير صحيحة* — الإجابة الصحيحة هي رقم *${quiz.correctIndex}*`,
        `💡 *التفسير:* ${quiz.explanation}`,
        '',
        `أرسل *2* لسؤال جديد، أو *3* لمراجعة نقاط الضعف، أو *رئيسية* للعودة.`,
      ].join('\n'),
    };
  }

  async _generateRevision({ user }) {
    const prefs = this.repos.users.getPreferences(user.id);
    const due = this.repos.progress.getDueReviews(user.id, 3);

    if (!prefs.weaknesses.length && !prefs.repeated_mistakes.length && !due.length) {
      return {
        text: `✨ سجلّك نظيف حالياً! لم تُرصد أخطاء متكررة أو مراجعات متأخرة.\nأرسل *2* لاختبار جديد أو اكتب أي موضوع للمراجعة.`,
      };
    }

    const lines = [`🔁 *خطة المراجعة المخصصة لك:*`];
    if (prefs.weaknesses.length) {
      lines.push(`• مواضيع تحتاج تعزيزاً: ${prefs.weaknesses.join('، ')}`);
    }
    if (prefs.repeated_mistakes.length) {
      lines.push(`• آخر الأخطاء المسجلة:`);
      for (const m of prefs.repeated_mistakes.slice(0, 3)) {
        lines.push(`  - ${m.topic}: ${m.question}`);
      }
    }
    if (due.length) {
      lines.push(`• دروس حان موعد مراجعتها (التكرار المتباعد):`);
      for (const d of due) {
        lines.push(`  - ${d.lesson_title} (${d.course_title})`);
      }
    }
    lines.push('', `اكتب اسم أي نقطة من القائمة أعلاه لشرحها وتبسيطها الآن، أو أرسل *2* لاختبارها.`);
    return { text: lines.join('\n') };
  }

  _tryParseQuizJson(raw) {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const obj = JSON.parse(match[0]);
      if (!obj.question || !Array.isArray(obj.options) || obj.options.length < 2 || !obj.correctIndex) {
        return null;
      }
      return obj;
    } catch {
      return null;
    }
  }

  _levelAr(level) {
    if (level === 'advanced') return 'متقدم';
    if (level === 'intermediate') return 'متوسط';
    return 'مبتدئ';
  }
}
