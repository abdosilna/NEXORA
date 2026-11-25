import {
  ARABIC_DIVIDER,
  formatHeader,
  formatQuizCard,
  normalizeCommandText,
} from '../../utils/text.js';

const WEB_RESEARCH_HINT =
  /(ابحث في الويب|ابحث عن مصادر|روابط|مراجع|مصادر موثوقة|احدث اخبار|أحدث أخبار|سعر اليوم|بحث\s+)/i;

export class TutorModule {
  constructor({ aiService, repos, researchService = null }) {
    this.aiService = aiService;
    this.repos = repos;
    this.researchService = researchService;
  }

  async openHome(user) {
    const prefs = this.repos.users.getPreferences(user.id);
    const aiProfile = this.repos.users.getAiLearningProfile?.(user.id);
    const summary = this.repos.progress.getUserSummary(user.id);
    const consent = aiProfile?.memory_consent !== false;

    const weaknessesList = consent
      ? aiProfile?.weaknesses?.length
        ? aiProfile.weaknesses
        : prefs.weaknesses
      : [];
    const strengthsList = consent
      ? aiProfile?.strengths?.length
        ? aiProfile.strengths
        : prefs.strengths
      : [];

    const weaknessesText = consent
      ? weaknessesList.length
        ? weaknessesList.join('، ')
        : 'لم تُرصد بعد'
      : 'غير محفوظة (حفظ الذاكرة متوقف)';
    const strengthsText = consent
      ? strengthsList.length
        ? strengthsList.join('، ')
        : 'لم تُرصد بعد'
      : 'غير محفوظة (حفظ الذاكرة متوقف)';

    this.repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });

    const aiStatusNote = this.aiService?.isReady?.()
      ? `المزوّد الذكي جاهز (${this.aiService.getActiveProvider().model})`
      : 'تنويه: مفتاح مزوّد الذكاء الاصطناعي غير مضبوط حالياً';

    return {
      text: [
        formatHeader('🎓', 'المعلم الشخصي والمساعد الذكي', aiStatusNote),
        `المستوى: *${this._levelAr(user.learning_level)}* · النقاط: *${user.total_points} XP*`,
        `الدروس المكتملة: *${summary.completedLessons}* · دقة الاختبارات: *${summary.quizAccuracy}%*`,
        `نقاط القوة: ${strengthsText}`,
        `نقاط تحتاج مراجعة: ${weaknessesText}`,
        '',
        `اكتب أي سؤال عام أو تعليمي بالعربية (مثل: ما هي البرمجة؟ أو ما هي عاصمة اليابان؟)، أو اختر:`,
        `*1.* توليد درس مخصص حسب مستواك`,
        `*2.* اختبار تكيفي سريع`,
        `*3.* مراجعة أخطائي المتكررة`,
        `*4.* تلميح (أثناء أي اختبار)`,
        `*5.* تبديل موافقة حفظ الذاكرة التعليمية (${consent ? 'مفعّلة' : 'متوقفة'})`,
        ARABIC_DIVIDER,
        `أرسل *رئيسية* للعودة للقائمة الرئيسية.`,
      ].join('\n'),
      interactiveList: {
        title: '🎓 المعلم الذكي',
        text: 'اختر أداة تعليمية أو أرسل سؤالك نصياً:',
        buttonText: 'أدوات المعلم',
        footer: 'نيكسورا · اسأل أي سؤال مباشرة',
        sections: [
          {
            title: 'أدوات التعلم الذكي',
            rows: [
              { rowId: 'tutor:lesson', title: '📖 توليد درس مخصص', description: 'شرح خطوة بخطوة يناسب مستواك' },
              { rowId: 'tutor:quiz', title: '📝 اختبار تكيفي سريع', description: 'تقييم مستواك وتحديث نقاط القوة والضعف' },
              { rowId: 'tutor:revision', title: '🔁 مراجعة أخطائي', description: 'خطة مراجعة مبنية على أخطائك السابقة' },
              { rowId: 'tutor:toggle_memory', title: '🧠 إعداد الذاكرة', description: consent ? 'إيقاف حفظ الذاكرة' : 'تفعيل حفظ الذاكرة' },
            ],
          },
        ],
      },
      buttons: [
        { id: 'tutor:quiz', title: '📝 اختبار سريع' },
        { id: 'tutor:revision', title: '🔁 مراجعة الأخطاء' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  async handleInput({ user, text, selectedId = null, state }) {
    const raw = String(selectedId || text || '').trim();
    const cleanText = raw;
    const norm = normalizeCommandText(cleanText);
    const data = state?.data || {};

    if (data.activeQuiz) {
      if (raw === 'tutor:hint' || norm === 'تلميح' || norm === 'hint' || norm === '4') {
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
        return {
          text: `💡 *تلميح (${nextHintIdx}):*\n${hint}\n\nأرسل رقم أو نص إجابتك الآن.`,
          buttons: [
            ...(data.activeQuiz.options || []).slice(0, 2).map((o, idx) => ({
              id: `tutor:ans:${idx + 1}`,
              title: `${idx + 1}. ${String(o).slice(0, 16)}`,
            })),
            { id: 'nav:cancel', title: '❎ إلغاء' },
          ],
        };
      }

      const mappedAnswer = raw.startsWith('tutor:ans:') ? raw.slice('tutor:ans:'.length) : cleanText;
      return this._evaluateQuizAnswer({ user, text: mappedAnswer, quiz: data.activeQuiz });
    }

    if (raw === 'tutor:toggle_memory' || norm === '5' || norm.includes('ذاكره')) {
      const profile = this.repos.users.getAiLearningProfile?.(user.id);
      const nextConsent = !(profile?.memory_consent ?? true);
      this.repos.users.upsertAiLearningProfile?.(user.id, { memory_consent: nextConsent });
      return {
        text: nextConsent
          ? '✅ تم تفعيل حفظ التقدم والذاكرة التعليمية بموافقتك؛ سيتذكر المعلم مستواك ونقاط ضعفك الفعلية المحفوظة في قاعدة البيانات.'
          : '🔒 تم إيقاف حفظ الذاكرة التعليمية؛ لن يحفظ المعلم تفضيلات أو نقاط ضعف جديدة ولن يدّعي تذكّر بيانات غير محفوظة.',
        buttons: [
          { id: 'menu:tutor', title: '🎓 المعلم الذكي' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    if (raw === 'tutor:lesson' || norm === '1' || norm.startsWith('درس ')) {
      const topic = norm.startsWith('درس ') ? cleanText.slice(4).trim() : 'بناء التفكير البرمجي المنطقي';
      return this._generateLesson({ user, topic });
    }

    if (raw === 'tutor:quiz' || norm === '2' || norm.startsWith('اختبار')) {
      const topic = raw === 'tutor:quiz' ? '' : cleanText.replace(/^اختبار\s*/i, '').trim() || '';
      return this._startQuickQuiz({ user, topic });
    }

    if (raw === 'tutor:revision' || norm === '3' || norm.includes('مراجعه') || norm.includes('اخطائي')) {
      return this._generateRevision({ user });
    }

    // Distinguish explicit web-search requests from conversational AI questions
    if (this.researchService && WEB_RESEARCH_HINT.test(cleanText)) {
      return this.researchService.handleInput({ user, text: cleanText, forceWebSearch: true });
    }

    const prefs = this.repos.users.getPreferences(user.id);
    const aiProfile = this.repos.users.getAiLearningProfile?.(user.id);
    const consent = aiProfile?.memory_consent !== false;
    const history = this.repos.conversations.getRecentForUser(user.id, { module: 'tutor', limit: 8 });
    const savedProgressCount = this.repos.progress.getUserSummary(user.id).completedLessons;

    // Exclude the just-recorded current user turn if already appended by handler.js
    const priorHistory =
      history.length && history[history.length - 1]?.role === 'user' && history[history.length - 1]?.message_text === cleanText
        ? history.slice(0, -1)
        : history;

    const messages = [
      ...priorHistory.map((h) => ({ role: h.role, content: h.message_text })),
      { role: 'user', content: cleanText },
    ];

    const strengths = consent ? (aiProfile?.strengths?.length ? aiProfile.strengths : prefs.strengths) : [];
    const weaknesses = consent ? (aiProfile?.weaknesses?.length ? aiProfile.weaknesses : prefs.weaknesses) : [];
    const currentLevel = aiProfile?.level || user.learning_level || 'beginner';

    const memoryRule = consent
      ? `البيانات المحفوظة فعلياً لهذا المتعلم: المستوى (${currentLevel})، الدروس المكتملة (${savedProgressCount})، نقاط القوة (${strengths.join('، ') || 'لا توجد بعد'})، نقاط الضعف (${weaknesses.join('، ') || 'لا توجد بعد'}). لا تدّعِ أبداً تذكّر أي معلومة لم ترد هنا أو في سجل المحادثة أعلاه.`
      : 'حفظ الذاكرة متوقف باختيار المتعلم: لا تدّعِ أنك تتذكر معلوماته بين الجلسات، واكتفِ بسياق المحادثة الحالية فقط.';

    const systemAddon = `أسلوب الشرح المفضل: ${aiProfile?.preferred_style || prefs.tutor_style || 'balanced'}.
${memoryRule}
قدّم شرحاً واضحاً بالعربية الفصحى على خطوات متدرجة تناسب مستوى المتعلم (${this._levelAr(currentLevel)})، مع مثال تطبيقي مختصر وسؤال متابعة مفيد في النهاية.
إذا احتاج السؤال بحثاً حياً في الويب أو مصادر حالية، نبّه المتعلم لإرسال *بحث <الموضوع>*.`;

    const res = await this.aiService.complete({
      userId: user.id,
      systemAddon,
      messages,
      context: { level: currentLevel },
    });

    if (!res.ok) {
      return {
        text: res.text,
        buttons: [
          { id: 'menu:languages', title: '🌍 اللغات' },
          { id: 'menu:programming', title: '💻 البرمجة' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'tutor',
      eventType: 'topic_explained',
      topic: cleanText.slice(0, 80),
      payload: { provider: res.provider, level: currentLevel },
    });

    return {
      text: `${res.text}\n\n${ARABIC_DIVIDER}\n💬 أرسل سؤال متابعة، أو *2* لاختبار تكيفي، أو *رئيسية* للعودة.`,
      buttons: [
        { id: 'tutor:quiz', title: '📝 اختبار تكيفي' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  async _generateLesson({ user, topic }) {
    const level = user.learning_level || 'beginner';
    const res = await this.aiService.complete({
      userId: user.id,
      systemAddon: `أنشئ درساً تعليمياً قصيراً ومنظماً بالعربية حول "${topic}" يناسب المستوى (${this._levelAr(level)}). قسّمه إلى: 1) الهدف، 2) الشرح خطوة بخطوة، 3) مثال عملي، 4) سؤال تحقق قصير.`,
      messages: [{ role: 'user', content: `اشرح لي درساً حول: ${topic}` }],
      context: { level },
    });

    if (!res.ok) {
      return { text: res.text };
    }

    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'tutor',
      eventType: 'lesson_generated',
      topic,
    });

    return {
      text: [
        formatHeader('📖', `درس مخصص: ${topic}`, `المستوى: ${this._levelAr(level)}`),
        res.text,
        ARABIC_DIVIDER,
        `أرسل *2* للحصول على اختبار حول هذا الدرس، أو *رئيسية* للعودة.`,
      ].join('\n\n'),
    };
  }

  async _startQuickQuiz({ user, topic }) {
    const prefs = this.repos.users.getPreferences(user.id);
    const aiProfile = this.repos.users.getAiLearningProfile?.(user.id);
    const level = aiProfile?.level || user.learning_level || 'beginner';
    const focusTopic = topic || prefs.weaknesses[0] || 'البرمجة واللغات';

    if (this.aiService?.isReady?.()) {
      const prompt = `أنشئ سؤال اختيار من متعدد واحد فقط بالعربية حول "${focusTopic}" يناسب المستوى "${level}".
أرجع JSON فقط بهذا الشكل الدقيق دون نص إضافي:
{"question":"...","options":["خيار 1","خيار 2","خيار 3"],"correctIndex":"1","explanation":"...","hints":["تلميح 1","تلميح 2"]}`;

      const res = await this.aiService.complete({
        userId: user.id,
        systemAddon: 'أنت مولّد أسئلة تعليمية دقيقة. أرجع JSON صالحاً فقط.',
        messages: [{ role: 'user', content: prompt }],
        context: { level },
      });

      if (!res.ok) {
        return { text: res.text };
      }

      const parsed = this._tryParseQuizJson(res.text);
      if (!parsed) {
        return {
          text: '⚠️ تعذر تنسيق سؤال الاختبار من المزوّد هذه المرة. جرّب إعادة إرسال *2* أو اختر اختباراً منظماً من *أكاديمية اللغات* أو *أكاديمية البرمجة*.',
        };
      }

      const quiz = {
        topic: focusTopic,
        question: parsed.question,
        options: parsed.options,
        correctIndex: String(parsed.correctIndex),
        explanation: parsed.explanation,
        hints: parsed.hints?.length ? parsed.hints : ['راجع المفهوم الأساسي للدرس بتركيز.'],
        hintsUsed: 0,
      };

      this.repos.users.setState(user.id, { menu: 'tutor', data: { activeQuiz: quiz } });
      return {
        text: formatQuizCard({
          title: `اختبار تكيفي — ${focusTopic}`,
          progressLabel: `المستوى: ${this._levelAr(level)}`,
          question: quiz.question,
          options: quiz.options,
          footerHint: `أرسل رقم الإجابة (1-${quiz.options.length})، أو *تلميح* للمساعدة، أو *إلغاء*.`,
        }),
      };
    }

    // Pull a real curriculum exercise matching user's level when AI API key is not configured
    const dbExercise = this._pickCurriculumExercise(level, focusTopic);
    if (!dbExercise) {
      return {
        text: [
          `⚠️ تعذر توليد اختبار ذكي مخصص لأن مفتاح مزوّد الذكاء الاصطناعي غير مفعّل.`,
          `يمكنك خوض اختبارات حقيقية من منهج *أكاديمية اللغات* (أرسل *لغات*) أو *أكاديمية البرمجة* (أرسل *برمجة*).`,
        ].join('\n'),
      };
    }

    const quiz = {
      topic: dbExercise.lesson_title || focusTopic,
      courseId: dbExercise.course_id,
      lessonId: dbExercise.lesson_id,
      exerciseId: dbExercise.id,
      question: dbExercise.question_ar,
      options: dbExercise.options,
      correctIndex: String(dbExercise.correct_answer),
      explanation: dbExercise.explanation_ar,
      hints: [dbExercise.hint_ar || 'تذكّر قاعدة الدرس بدقة.'],
      hintsUsed: 0,
    };

    this.repos.users.setState(user.id, { menu: 'tutor', data: { activeQuiz: quiz } });
    return {
      text: formatQuizCard({
        title: `اختبار من المنهج — ${quiz.topic}`,
        progressLabel: `المستوى: ${this._levelAr(level)}`,
        question: quiz.question,
        options: quiz.options,
        footerHint: `أرسل رقم الإجابة (1-${quiz.options.length})، أو *تلميح* للمساعدة، أو *إلغاء*.`,
      }),
    };
  }

  _pickCurriculumExercise(level, topicHint = '') {
    const db = this.repos.users.db;
    const normHint = normalizeCommandText(topicHint);
    const all = db
      .prepare(
        `SELECT e.*, l.title_ar AS lesson_title, l.course_id, c.level
         FROM exercises e
         JOIN lessons l ON l.id = e.lesson_id
         JOIN courses c ON c.id = l.course_id
         WHERE c.is_published = 1 AND l.is_published = 1
         ORDER BY CASE WHEN e.difficulty = ? THEN 0 ELSE 1 END, RANDOM()
         LIMIT 20`
      )
      .all(level);

    if (!all.length) return null;
    const matched =
      all.find((r) => normHint && normalizeCommandText(`${r.lesson_title} ${r.question_ar}`).includes(normHint)) ||
      all[0];
    let options = [];
    try {
      options = JSON.parse(matched.options_json);
    } catch {
      options = [];
    }
    if (!options.length) return null;
    return { ...matched, options };
  }

  async _evaluateQuizAnswer({ user, text, quiz }) {
    const norm = normalizeCommandText(text);
    const validChoice = /^[1-9]$/.test(norm) && Number(norm) <= (quiz.options?.length || 4);
    if (!validChoice) {
      return {
        text: `يرجى إرسال رقم اختيار صحيح من *1* إلى *${quiz.options?.length || 3}*، أو أرسل *تلميح* أو *إلغاء*.`,
      };
    }

    const isCorrect = norm === String(quiz.correctIndex);
    const hintsUsed = quiz.hintsUsed || 0;
    const score = isCorrect ? Math.max(5, 15 - hintsUsed * 3) : 0;

    this.repos.progress.recordQuizAttempt({
      userId: user.id,
      courseId: quiz.courseId || null,
      lessonId: quiz.lessonId || null,
      exerciseId: quiz.exerciseId || null,
      topic: quiz.topic,
      userAnswer: text,
      isCorrect,
      hintsUsed,
      scoreAwarded: score,
    });

    const aiProfile = this.repos.users.getAiLearningProfile?.(user.id);
    const consent = aiProfile?.memory_consent !== false;
    let adaptiveNote = '';

    if (consent) {
      const prefs = this.repos.users.getPreferences(user.id);
      const strengths = new Set(prefs.strengths);
      const weaknesses = new Set(prefs.weaknesses);
      const mistakes = [...prefs.repeated_mistakes];

      if (isCorrect) {
        this.repos.users.addPoints(user.id, score);
        strengths.add(quiz.topic);
        weaknesses.delete(quiz.topic);
        this.repos.progress.resolveMistakesByTopic?.(user.id, quiz.topic);

        // Adaptive difficulty upgrade check based on real saved quiz summary
        const summary = this.repos.progress.getUserSummary(user.id);
        if (user.learning_level === 'beginner' && summary.quizCorrect >= 5 && summary.quizAccuracy >= 80) {
          this.repos.users.updateProfile(user.id, { learningLevel: 'intermediate' });
          adaptiveNote = '\n🚀 *ترقية تكيفية:* بناءً على أدائك المتفوق، تم رفع مستواك في المعلّم إلى *متوسط*!';
        } else if (user.learning_level === 'intermediate' && summary.quizCorrect >= 12 && summary.quizAccuracy >= 85) {
          this.repos.users.updateProfile(user.id, { learningLevel: 'advanced' });
          adaptiveNote = '\n🚀 *ترقية تكيفية:* بناءً على استمرار دقتك العالية، تم رفع مستواك إلى *متقدم*!';
        }
      } else {
        weaknesses.add(quiz.topic);
        mistakes.unshift({ topic: quiz.topic, question: quiz.question.slice(0, 80), at: new Date().toISOString() });
        this.repos.progress.recordMistake?.({
          userId: user.id,
          module: 'tutor',
          topic: quiz.topic,
          question: quiz.question,
          userAnswer: text,
          expectedAnswer: String(quiz.correctIndex),
        });
      }

      this.repos.users.updatePreferences(user.id, {
        strengths: [...strengths].slice(0, 10),
        weaknesses: [...weaknesses].slice(0, 10),
        repeated_mistakes: mistakes.slice(0, 15),
      });
    } else if (isCorrect) {
      this.repos.users.addPoints(user.id, score);
    }

    this.repos.users.setState(user.id, { menu: 'tutor', data: { mode: 'chat' } });

    return {
      text: [
        isCorrect
          ? `✅ *أحسنت! إجابة صحيحة (+${score} نقطة)*`
          : `❌ *إجابة غير صحيحة* — الصحيح هو رقم *${quiz.correctIndex}*`,
        `💡 *الشرح:* ${quiz.explanation}${adaptiveNote}`,
        ARABIC_DIVIDER,
        `أرسل *2* لسؤال جديد، أو *3* لمراجعة الأخطاء، أو *رئيسية* للعودة.`,
      ].join('\n\n'),
    };
  }

  async _generateRevision({ user }) {
    const aiProfile = this.repos.users.getAiLearningProfile?.(user.id);
    if (aiProfile?.memory_consent === false) {
      return {
        text: `🔒 حفظ الذاكرة التعليمية متوقف حالياً باختيارك، لذا لم تُحفظ نقاط ضعف للمراجعة التلقائية.\nأرسل *5* لتفعيل حفظ التقدم أو اكتب أي موضوع للمراجعة المباشرة.`,
      };
    }

    const prefs = this.repos.users.getPreferences(user.id);
    const openMistakes = this.repos.progress.listOpenMistakes?.(user.id, 5) || [];
    const due = this.repos.progress.getDueReviews(user.id, 3);

    if (!prefs.weaknesses.length && !prefs.repeated_mistakes.length && !openMistakes.length && !due.length) {
      return {
        text: `✨ سجلّك نظيف حالياً! لم تُرصد أخطاء متكررة أو مراجعات متأخرة.\nأرسل *2* لاختبار جديد أو اكتب أي موضوع لشرحه.`,
      };
    }

    const lines = [formatHeader('🔁', 'خطة المراجعة المخصصة لك')];
    if (prefs.weaknesses.length) {
      lines.push(`• مواضيع تحتاج تعزيزاً: ${prefs.weaknesses.join('، ')}`);
    }
    if (openMistakes.length) {
      lines.push(`• أخطاء قيد المراجعة (${openMistakes.length}):`);
      for (const m of openMistakes.slice(0, 3)) {
        lines.push(`  - *${m.topic}*: ${m.question.slice(0, 80)}`);
      }
    }
    if (due.length) {
      lines.push(`• دروس حان موعد مراجعتها (التكرار المتباعد):`);
      for (const d of due) {
        lines.push(`  - ${d.lesson_title} (${d.course_title})`);
      }
    }
    lines.push('', ARABIC_DIVIDER, `اكتب اسم أي نقطة من القائمة أعلاه لشرحها وتبسيطها الآن، أو أرسل *2* لاختبارها.`);
    return { text: lines.join('\n') };
  }

  _tryParseQuizJson(raw) {
    try {
      const match = String(raw || '').match(/\{[\s\S]*\}/);
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
