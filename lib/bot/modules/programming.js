import {
  ARABIC_DIVIDER,
  formatHeader,
  formatLessonCard,
  formatQuizCard,
  normalizeCommandText,
} from '../../utils/text.js';

export const PROGRAMMING_TRACKS = [
  { key: 'python', labelAr: 'Python' },
  { key: 'html', labelAr: 'HTML' },
  { key: 'css', labelAr: 'CSS' },
  { key: 'javascript', labelAr: 'JavaScript' },
  { key: 'nodejs', labelAr: 'Node.js' },
];

const LEVEL_AR = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};

export class ProgrammingAcademyModule {
  constructor({ repos, aiService }) {
    this.repos = repos;
    this.aiService = aiService;
  }

  openHome(user) {
    const openMistakes = this._listModuleMistakes(user.id);
    this.repos.users.setState(user.id, { menu: 'programming', data: { step: 'select_track' } });
    return {
      text: [
        formatHeader('💻', 'أكاديمية البرمجة — NEXORA', 'دروس مرتّبة، أمثلة عملية، ومشاريع صغيرة'),
        ...PROGRAMMING_TRACKS.map((t, i) => `*${i + 1}.* ${t.labelAr}`),
        `*6.* مساعد تصحيح الأخطاء البرمجية (Debugging الآمن)`,
        `*7.* مراجعة أخطائي البرمجية السابقة (${openMistakes.length})`,
        ARABIC_DIVIDER,
        `⚠️ ملاحظة أمنية: يتم تحليل الأكواد وتفسيرها تعليمياً فقط دون تنفيذها على الخادم.`,
        `أرسل رقم الخيار، أو *رئيسية* للعودة.`,
      ].join('\n'),
    };
  }

  async handleInput({ user, text, state }) {
    const norm = normalizeCommandText(text);
    const data = state?.data || {};

    if (data.step === 'select_track') {
      if (norm === '6' || norm.includes('تصحيح') || norm.includes('debug')) {
        this.repos.users.setState(user.id, {
          menu: 'programming',
          data: { step: 'debug_mode' },
        });
        return {
          text: [
            formatHeader('🛠️', 'مساعد تصحيح الأخطاء البرمجية', 'تحليل ساكن وتعليمي آمن'),
            `ألصق الكود الذي يواجه مشكلة واذكر رسالة الخطأ (إن وجدت) وسأشرح لك السبب وطريقة الإصلاح بأمان بدون تنفيذ الكود على الخادم.`,
            ARABIC_DIVIDER,
            `أرسل *رجوع* للعودة إلى المسارات البرمجية.`,
          ].join('\n'),
        };
      }

      if (norm === '7' || norm.includes('اخطاء') || norm.includes('مراجعه')) {
        return this._openMistakeReview(user);
      }

      const idx = Number(norm) - 1;
      const track =
        PROGRAMMING_TRACKS[idx] ||
        PROGRAMMING_TRACKS.find((t) => norm.includes(t.key) || norm.includes(t.labelAr.toLowerCase()));

      if (!track) {
        return { text: '⚠️ يرجى اختيار رقم صحيح من *1* إلى *7*، أو كتابة اسم اللغة (مثل Python أو JavaScript).' };
      }

      return this._renderTrackLessons(user, { track: track.key, trackLabel: track.labelAr });
    }

    if (data.step === 'review_mistakes') {
      if (norm === '1' || norm.includes('تمت') || norm.includes('مسح') || norm.includes('تصفيه')) {
        this._resolveAllModuleMistakes(user.id);
        this.repos.users.setState(user.id, { menu: 'programming', data: { step: 'select_track' } });
        return {
          text: `✅ تم تسجيل مراجعة أخطائك البرمجية السابقة.\nأرسل *رجوع* أو رقم مسار (1–5) لمتابعة الدروس.`,
        };
      }
      return { text: 'أرسل *1* لتأكيد إتمام مراجعة الأخطاء، أو *رجوع* للعودة لأكاديمية البرمجة.' };
    }

    if (data.step === 'select_lesson') {
      const picked = data.lessons?.[Number(norm) - 1];
      if (!picked) {
        return { text: `⚠️ أرسل رقم الدرس الصحيح (1 إلى ${data.lessons?.length || 1}) أو *رجوع*.` };
      }
      return this._renderLesson(user, picked.id, data);
    }

    if (data.step === 'in_lesson') {
      if (norm === '1' || norm.includes('اختبار') || norm.includes('تمرين')) {
        return this._startQuiz(user, data.lessonId, data);
      }
      if (norm === '2' || norm.includes('شرح')) {
        return this._explainLessonDeeper(user, data.lessonId);
      }
      if (norm === '3' || norm.includes('تم') || norm.includes('اكمال')) {
        return this._completeLesson(user, data.lessonId, 88);
      }
      return { text: 'أرسل *1* للاختبار، *2* لشرح أعمق للكود، *3* لتسجيل الإتمام، أو *رجوع*.' };
    }

    if (data.step === 'in_quiz') {
      return this._gradeQuiz(user, text, data);
    }

    if (data.step === 'debug_mode') {
      return this._analyzeCodeSafely(user, text);
    }

    return this.openHome(user);
  }

  handleBack(user, data = {}) {
    if (data.step === 'in_quiz' && data.lessonId) {
      return this._renderLesson(user, data.lessonId, data.navContext || {});
    }
    if (data.step === 'in_lesson') {
      const nav = data.navContext || {};
      if (nav.track) {
        return this._renderTrackLessons(user, nav);
      }
      return this.openHome(user);
    }
    return this.openHome(user);
  }

  _renderTrackLessons(user, { track, trackLabel }) {
    const courses = this.repos.curriculum.listCourses({
      category: 'programming',
      subject: track,
    });

    const lessons = [];
    for (const c of courses) {
      for (const l of this.repos.curriculum.listLessonsByCourse(c.id)) {
        lessons.push({ ...l, course_title: c.title_ar, course_level: c.level });
      }
    }

    if (!lessons.length) {
      return { text: `لا توجد دروس منشورة حالياً لمسار ${trackLabel}.` };
    }

    const completedSet = this._getCompletedLessonIds(user.id);
    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: {
        step: 'select_lesson',
        track,
        trackLabel,
        lessons: lessons.map((l) => ({
          id: l.id,
          title_ar: l.title_ar,
          lesson_type: l.lesson_type,
          course_level: l.course_level,
        })),
      },
    });

    const lines = lessons.map((l, i) => {
      const badge = l.lesson_type === 'project' ? ' [مشروع صغير]' : '';
      const levelTag = l.course_level ? ` (${LEVEL_AR[l.course_level] || l.course_level})` : '';
      const done = completedSet.has(l.id) ? ' ✅' : '';
      return `*${i + 1}.* ${l.title_ar}${badge}${levelTag}${done}`;
    });

    return {
      text: [
        formatHeader('📘', `مسار ${trackLabel}`, `${lessons.length} دروس ومشاريع مرتّبة`),
        ...lines,
        ARABIC_DIVIDER,
        `أرسل رقم الدرس لفتحه، أو *رجوع* لتغيير المسار البرمجي.`,
      ].join('\n'),
    };
  }

  _renderLesson(user, lessonId, navContext = {}) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'الدرس غير موجود.' };
    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);

    const savedNav = {
      track: navContext.track,
      trackLabel: navContext.trackLabel,
    };

    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: {
        step: 'in_lesson',
        lessonId: lesson.id,
        courseId: lesson.course_id,
        navContext: savedNav,
      },
    });

    this.repos.progress.markInProgress({
      userId: user.id,
      courseId: lesson.course_id,
      lessonId: lesson.id,
    });
    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'programming',
      eventType: 'lesson_opened',
      topic: lesson.title_ar,
    });

    const badgeText = lesson.lesson_type === 'project' ? 'مشروع تطبيقي صغير' : 'درس برمجي تفاعلي';
    return {
      text: formatLessonCard({
        title: lesson.title_ar,
        badge: badgeText,
        content: lesson.content_ar,
        examples: lesson.examples,
        footerActions: [
          `*1.* اختبار الدرس (${exercises.length} ${exercises.length === 1 ? 'سؤال' : 'أسئلة'})`,
          `*2.* شرح أعمق للكود وأمثلة إضافية (بالذكاء الاصطناعي)`,
          `*3.* تسجيل إتمام الدرس (+10 نقاط)`,
          `• أرسل *رجوع* لقائمة دروس المسار`,
        ],
      }),
    };
  }

  async _explainLessonDeeper(user, lessonId) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'الدرس غير موجود.' };

    const res = await this.aiService.complete({
      userId: user.id,
      systemAddon:
        'اشرح الكود البرمجي بالعربية سطراً بسطر للمتعلم ولا تشغّل أي كود. اعرض أخطاء المبتدئين الشائعة وكيفية تجنبها.',
      messages: [{ role: 'user', content: `اشرح هذا الدرس بمثال عملي مبسط:\n${lesson.title_ar}\n${lesson.content_ar}` }],
      context: { level: user.learning_level },
    });

    if (!res.ok) {
      return {
        text: `${res.text}\n${ARABIC_DIVIDER}\nأرسل *1* لاختبار الدرس المدمج أو *رجوع*.`,
      };
    }

    return { text: `🔍 *شرح مفصل:*\n${res.text}\n\nأرسل *1* للاختبار أو *رجوع*.` };
  }

  async _analyzeCodeSafely(user, userCodeInput) {
    const staticChecks = [];
    if (/\beval\s*\(|new\s+Function\s*\(/.test(userCodeInput)) {
      staticChecks.push('تحذير أمني: استخدام eval أو Function يشكل خطراً أمنياً ويُفضّل استبداله بمنطق آمن.');
    }
    if (/SELECT\s+.*\+\s*|INSERT\s+.*\+\s*/i.test(userCodeInput)) {
      staticChecks.push('تحذير أمني: دمج النصوص داخل SQL يعرّض التطبيق لحقن SQL؛ استخدم الاستعلامات المعاملية (`?`).');
    }
    if ((userCodeInput.match(/\(/g) || []).length !== (userCodeInput.match(/\)/g) || []).length) {
      staticChecks.push('ملاحظة نحوية: عدد الأقواس الدائرية `(` و `)` غير متوازن.');
    }
    if ((userCodeInput.match(/\{/g) || []).length !== (userCodeInput.match(/\}/g) || []).length) {
      staticChecks.push('ملاحظة نحوية: عدد الأقواس المعقوفة `{` و `}` غير متوازن.');
    }

    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'programming',
      eventType: 'debug_help',
      topic: 'static_code_analysis',
    });

    const staticBlock = staticChecks.length
      ? `🔎 *نتائج الفحص الساكن السريع:*\n${staticChecks.map((s) => `• ${s}`).join('\n')}\n\n`
      : '';

    const res = await this.aiService.complete({
      userId: user.id,
      systemAddon:
        'أنت مرشد برمجة تساعد في تصحيح الأخطاء عبر التحليل الساكن فقط (دون تنفيذ الكود). حدد الخطأ المحتمل، اشرحه بالعربية، وقدّم النسخة المصححة.',
      messages: [
        {
          role: 'user',
          content: `حلل هذا الكود أو الخطأ التعليمي:\n${userCodeInput}\nملاحظات ساكنة أولية: ${staticChecks.join(' | ') || 'لا توجد'}`,
        },
      ],
      context: { level: user.learning_level },
    });

    if (!res.ok) {
      return {
        text: `${staticBlock}${res.text}\n${ARABIC_DIVIDER}\nأرسل كوداً آخر للفحص الساكن أو *رجوع* للعودة إلى مسارات البرمجة.`,
      };
    }

    return {
      text: `${staticBlock}🛠️ *التحليل والإصلاح المقترح:*\n${res.text}\n\nأرسل كوداً آخر أو *رجوع* للعودة إلى مسارات البرمجة.`,
    };
  }

  _startQuiz(user, lessonId, parentData = {}) {
    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);
    if (!exercises.length) return this._completeLesson(user, lessonId, 90);

    const lesson = this.repos.curriculum.getLessonById(lessonId);
    const quizQueue = exercises.map((ex) => ({
      id: ex.id,
      question_ar: ex.question_ar,
      options: ex.options,
      correct_answer: String(ex.correct_answer),
      explanation_ar: ex.explanation_ar,
      hint_ar: ex.hint_ar,
    }));

    const firstEx = quizQueue[0];
    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: {
        step: 'in_quiz',
        lessonId,
        courseId: lesson.course_id,
        topic: lesson.title_ar,
        navContext: parentData.navContext || {},
        quizQueue,
        quizIndex: 0,
        correctCount: 0,
      },
    });

    return {
      text: formatQuizCard({
        title: `اختبار برمجي: ${lesson.title_ar}`,
        progressLabel: `السؤال 1 من ${quizQueue.length}`,
        question: firstEx.question_ar,
        options: firstEx.options,
        footerHint: `أرسل رقم الإجابة (1–${firstEx.options.length})، *تلميح*، أو *رجوع*.`,
      }),
    };
  }

  _gradeQuiz(user, text, data) {
    const queue = Array.isArray(data.quizQueue) && data.quizQueue.length ? data.quizQueue : null;
    const quizIndex = Number(data.quizIndex) || 0;
    const current = queue ? queue[quizIndex] : {
      id: data.exerciseId,
      question_ar: data.question || data.topic,
      options: [],
      correct_answer: String(data.correctAnswer),
      explanation_ar: data.explanation,
      hint_ar: data.hint,
    };

    const norm = normalizeCommandText(text);
    if (norm === 'تلميح' || norm === 'hint') {
      return { text: `💡 *تلميح:* ${current.hint_ar || 'تتبّع تنفيذ السطور خطوة بخطوة.'}` };
    }

    const maxOpt = current.options?.length || 3;
    const numericAns = Number(norm);
    if (!/^\d+$/.test(norm) || numericAns < 1 || numericAns > maxOpt) {
      return { text: `⚠️ يرجى إرسال رقم خيار صحيح بين *1* و *${maxOpt}*، أو *تلميح* أو *رجوع*.` };
    }

    const isCorrect = norm === String(current.correct_answer);
    const pts = isCorrect ? 15 : 3;
    const nextCorrectCount = (Number(data.correctCount) || 0) + (isCorrect ? 1 : 0);

    this.repos.progress.recordQuizAttempt({
      userId: user.id,
      courseId: data.courseId,
      lessonId: data.lessonId,
      exerciseId: current.id,
      topic: data.topic,
      userAnswer: text,
      isCorrect,
      scoreAwarded: pts,
    });

    if (!isCorrect) {
      const expectedText = current.options?.[Number(current.correct_answer) - 1] || current.correct_answer;
      const chosenText = current.options?.[numericAns - 1] || text;
      this.repos.progress.recordMistake?.({
        userId: user.id,
        module: 'programming',
        topic: data.topic,
        question: current.question_ar || data.topic,
        userAnswer: chosenText,
        expectedAnswer: `${current.correct_answer}) ${expectedText}`,
      });
    } else {
      this.repos.progress.resolveMistakesByTopic?.(user.id, data.topic);
    }

    this.repos.users.addPoints(user.id, pts);

    const feedbackLine = isCorrect
      ? `✅ *صحيح! (+${pts} نقطة)*`
      : `❌ *غير صحيح* — الصحيح: رقم *${current.correct_answer}*`;
    const explainLine = `💡 ${current.explanation_ar}`;

    if (queue && quizIndex + 1 < queue.length) {
      const nextIdx = quizIndex + 1;
      const nextEx = queue[nextIdx];
      this.repos.users.setState(user.id, {
        menu: 'programming',
        data: {
          ...data,
          quizIndex: nextIdx,
          correctCount: nextCorrectCount,
        },
      });

      const nextCard = formatQuizCard({
        title: `متابعة الاختبار البرمجي`,
        progressLabel: `السؤال ${nextIdx + 1} من ${queue.length}`,
        question: nextEx.question_ar,
        options: nextEx.options,
        footerHint: `أرسل رقم الإجابة (1–${nextEx.options.length}) أو *تلميح*.`,
      });

      return {
        text: [feedbackLine, explainLine, '', nextCard].join('\n'),
      };
    }

    const totalQ = queue ? queue.length : 1;
    const mastery = Math.round((nextCorrectCount / totalQ) * 100);
    const completed = mastery >= 50;

    this.repos.progress.recordLessonProgress({
      userId: user.id,
      courseId: data.courseId,
      lessonId: data.lessonId,
      masteryScore: Math.max(60, mastery),
      completed,
    });
    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: {
        step: 'in_lesson',
        lessonId: data.lessonId,
        courseId: data.courseId,
        navContext: data.navContext || {},
      },
    });

    return {
      text: [
        feedbackLine,
        explainLine,
        ARABIC_DIVIDER,
        `🏁 *النتيجة النهائية:* ${nextCorrectCount} من ${totalQ} (${mastery}%)`,
        `أرسل *رجوع* للعودة لقائمة الدروس أو *رئيسية*.`,
      ].join('\n'),
    };
  }

  _completeLesson(user, lessonId, score) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'الدرس غير موجود.' };
    this.repos.progress.recordLessonProgress({
      userId: user.id,
      courseId: lesson.course_id,
      lessonId: lesson.id,
      masteryScore: score,
      completed: true,
    });
    this.repos.users.addPoints(user.id, 10);
    return { text: `✅ تم تسجيل إتمام *${lesson.title_ar}* (+10 نقاط). أرسل *رجوع* لاختيار درس آخر.` };
  }

  _openMistakeReview(user) {
    const mistakes = this._listModuleMistakes(user.id);
    if (!mistakes.length) {
      return {
        text: `🌟 سجل أخطائك البرمجية نظيف حالياً! لا توجد أخطاء غير مراجَعة.\nاختر مساراً (1–5) لمتابعة التعلم.`,
      };
    }

    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: { step: 'review_mistakes' },
    });

    const lines = mistakes.slice(0, 8).map((m, idx) => {
      return [
        `*${idx + 1}.* (${m.topic || 'درس برمجة'})`,
        `   ❓ *السؤال:* ${m.question}`,
        `   ❌ *إجابتك:* ${m.user_answer}`,
        `   ✅ *الصحيح:* ${m.expected_answer}`,
      ].join('\n');
    });

    return {
      text: [
        formatHeader('🔁', 'مراجعة الأخطاء البرمجية السابقة', `عدد الأخطاء المفتوحة: ${mistakes.length}`),
        ...lines,
        ARABIC_DIVIDER,
        `• أرسل *1* لتأكيد إتمام المراجعة وتحديث السجل`,
        `• أو *رجوع* للعودة إلى مسارات البرمجة`,
      ].join('\n\n'),
    };
  }

  _getCompletedLessonIds(userId) {
    try {
      const rows = this.repos.progress.db
        ?.prepare(`SELECT lesson_id FROM user_progress WHERE user_id = ? AND status = 'completed'`)
        .all(userId);
      return new Set((rows || []).map((r) => r.lesson_id));
    } catch {
      return new Set();
    }
  }

  _listModuleMistakes(userId) {
    const all = this.repos.progress.listOpenMistakes?.(userId, 30) || [];
    return all.filter((m) => m.module === 'programming');
  }

  _resolveAllModuleMistakes(userId) {
    try {
      this.repos.progress.db
        ?.prepare(`UPDATE user_mistakes SET resolved = 1 WHERE user_id = ? AND module = 'programming' AND resolved = 0`)
        .run(userId);
    } catch {
      // ignore on partial mocks
    }
  }
}
