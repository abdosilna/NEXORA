import {
  ARABIC_DIVIDER,
  formatHeader,
  formatLessonCard,
  formatQuizCard,
  normalizeCommandText,
  paginateItems,
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
  all: 'جميع المستويات',
};

const LEVEL_ORDER = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
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
        formatHeader('💻', 'أكاديمية البرمجة — NEXORA', 'مسارات منظمة من المبتدئ إلى المتقدم مع مشاريع'),
        ...PROGRAMMING_TRACKS.map((t, i) => `*${i + 1}.* ${t.labelAr}`),
        `*6.* مساعد تصحيح الأخطاء البرمجية (Debugging الآمن)`,
        `*7.* مراجعة أخطائي البرمجية السابقة (${openMistakes.length})`,
        ARABIC_DIVIDER,
        `⚠️ ملاحظة أمنية: يتم تحليل الأكواد وتفسيرها تعليمياً فقط دون تنفيذها على الخادم.`,
        `اختر من القائمة التفاعلية أو أرسل رقم الخيار، أو *رئيسية* للعودة.`,
      ].join('\n'),
      interactiveList: {
        title: '💻 أكاديمية البرمجة',
        text: 'اختر اللغة البرمجية أو أداة التصحيح:',
        buttonText: 'اختر المسار',
        footer: 'نيكسورا · تحليل ساكن آمن ومشاريع عملية',
        sections: [
          {
            title: 'المسارات البرمجية (مبتدئ → متقدم)',
            rows: PROGRAMMING_TRACKS.map((t) => ({
              rowId: `prog:track:${t.key}`,
              title: t.labelAr,
              description: `دروس متدرجة، أمثلة، اختبارات، ومشاريع في ${t.labelAr}`,
            })),
          },
          {
            title: 'أدوات التصحيح والمراجعة',
            rows: [
              { rowId: 'prog:debug', title: '🛠️ مصحح الأخطاء الآمن', description: 'تحليل ساكن للأكواد واكتشاف الأخطاء' },
              { rowId: 'prog:mistakes', title: '🔁 مراجعة أخطائي', description: `أخطاء مفتوحة: ${openMistakes.length}` },
            ],
          },
        ],
      },
      buttons: [
        { id: 'prog:debug', title: '🛠️ تصحيح كود' },
        { id: 'prog:mistakes', title: `🔁 أخطائي (${openMistakes.length})` },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  async handleInput({ user, text, selectedId = null, state }) {
    const raw = String(selectedId || text || '').trim();
    const norm = normalizeCommandText(raw);
    const data = state?.data || {};

    if (raw === 'prog:debug') {
      return this._openDebugMode(user);
    }
    if (raw === 'prog:mistakes') {
      return this._openMistakeReview(user);
    }
    if (raw.startsWith('prog:track:')) {
      const key = raw.slice('prog:track:'.length);
      const track = PROGRAMMING_TRACKS.find((t) => t.key === key);
      if (track) {
        return this._renderTrackLessons(user, { track: track.key, trackLabel: track.labelAr, levelFilter: 'all', page: 1 });
      }
    }
    if (raw.startsWith('prog:level:') && data.track) {
      const levelFilter = raw.slice('prog:level:'.length);
      return this._renderTrackLessons(user, {
        track: data.track,
        trackLabel: data.trackLabel || data.track,
        levelFilter,
        page: 1,
      });
    }
    if (raw.startsWith('prog:lesson:')) {
      const lessonId = Number(raw.slice('prog:lesson:'.length));
      if (Number.isInteger(lessonId) && lessonId > 0) {
        return this._renderLesson(user, lessonId, data);
      }
    }

    if (data.step === 'select_track') {
      if (norm === '6' || norm.includes('تصحيح') || norm.includes('debug')) {
        return this._openDebugMode(user);
      }
      if (norm === '7' || norm.includes('اخطاء') || norm.includes('مراجعه')) {
        return this._openMistakeReview(user);
      }

      const idx = Number(norm) - 1;
      const track =
        PROGRAMMING_TRACKS[idx] ||
        PROGRAMMING_TRACKS.find((t) => norm.includes(t.key) || norm.includes(t.labelAr.toLowerCase()));

      if (!track) {
        return {
          text: '⚠️ يرجى اختيار رقم صحيح من *1* إلى *7*، أو كتابة اسم اللغة (مثل Python أو JavaScript).',
          buttons: [
            { id: 'menu:programming', title: '💻 المسارات' },
            { id: 'nav:home', title: '🏠 الرئيسية' },
          ],
        };
      }

      return this._renderTrackLessons(user, { track: track.key, trackLabel: track.labelAr, levelFilter: 'all', page: 1 });
    }

    if (data.step === 'review_mistakes') {
      if (raw === 'prog:mistakes:clear' || norm === '1' || norm.includes('تمت') || norm.includes('مسح') || norm.includes('تصفيه')) {
        this._resolveAllModuleMistakes(user.id);
        this.repos.users.setState(user.id, { menu: 'programming', data: { step: 'select_track' } });
        return {
          text: `✅ تم تسجيل مراجعة أخطائك البرمجية السابقة.\nأرسل *رجوع* أو رقم مسار (1–5) لمتابعة الدروس.`,
          buttons: [
            { id: 'menu:programming', title: '💻 المسارات' },
            { id: 'nav:home', title: '🏠 الرئيسية' },
          ],
        };
      }
      return {
        text: 'أرسل *1* لتأكيد إتمام مراجعة الأخطاء، أو *رجوع* للعودة لأكاديمية البرمجة.',
        buttons: [
          { id: 'prog:mistakes:clear', title: '✅ تأكيد المراجعة' },
          { id: 'nav:back', title: '⬅️ رجوع' },
        ],
      };
    }

    if (data.step === 'select_lesson') {
      if (raw === 'page:next' || norm === 'التالي') {
        return this._renderTrackLessons(user, { ...data, page: (Number(data.page) || 1) + 1 });
      }
      if (raw === 'page:prev' || norm === 'السابق') {
        return this._renderTrackLessons(user, { ...data, page: Math.max(1, (Number(data.page) || 1) - 1) });
      }
      if (['مبتدئ', 'beginner', 'متوسط', 'intermediate', 'متقدم', 'advanced', 'الكل', 'all'].includes(norm)) {
        const filterMap = { مبتدئ: 'beginner', beginner: 'beginner', متوسط: 'intermediate', intermediate: 'intermediate', متقدم: 'advanced', advanced: 'advanced', الكل: 'all', all: 'all' };
        return this._renderTrackLessons(user, { ...data, levelFilter: filterMap[norm] || 'all', page: 1 });
      }

      const picked = data.lessons?.[Number(norm) - 1];
      if (!picked) {
        return { text: `⚠️ أرسل رقم الدرس الصحيح (1 إلى ${data.lessons?.length || 1}) أو *رجوع*.` };
      }
      return this._renderLesson(user, picked.id, data);
    }

    if (data.step === 'in_lesson') {
      if (raw === 'prog:quiz' || norm === '1' || norm.includes('اختبار') || norm.includes('تمرين')) {
        return this._startQuiz(user, data.lessonId, data);
      }
      if (raw === 'prog:explain' || norm === '2' || norm.includes('شرح')) {
        return this._explainLessonDeeper(user, data.lessonId);
      }
      if (raw === 'prog:complete' || norm === '3' || norm.includes('تم') || norm.includes('اكمال')) {
        return this._completeLesson(user, data.lessonId, 88);
      }
      return {
        text: 'أرسل *1* للاختبار، *2* لشرح أعمق للكود، *3* لتسجيل الإتمام، أو *رجوع*.',
        buttons: [
          { id: 'prog:quiz', title: '📝 اختبار الدرس' },
          { id: 'prog:explain', title: '🔍 شرح أعمق' },
          { id: 'prog:complete', title: '✅ إتمام (+10)' },
        ],
      };
    }

    if (data.step === 'in_quiz') {
      const mapped = raw.startsWith('prog:ans:') ? raw.slice('prog:ans:'.length) : raw === 'prog:hint' ? 'تلميح' : raw;
      return this._gradeQuiz(user, mapped, data);
    }

    if (data.step === 'debug_mode') {
      return this._analyzeCodeSafely(user, raw);
    }

    return this.openHome(user);
  }

  _openDebugMode(user) {
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
      buttons: [
        { id: 'nav:back', title: '⬅️ رجوع' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
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

  _renderTrackLessons(user, { track, trackLabel, levelFilter = 'all', page = 1 }) {
    const courses = this.repos.curriculum
      .listCourses({ category: 'programming', subject: track })
      .sort((a, b) => (LEVEL_ORDER[a.level] || 9) - (LEVEL_ORDER[b.level] || 9) || a.sort_order - b.sort_order);

    const allLessons = [];
    for (const c of courses) {
      if (levelFilter !== 'all' && c.level !== levelFilter) continue;
      for (const l of this.repos.curriculum.listLessonsByCourse(c.id)) {
        allLessons.push({ ...l, course_title: c.title_ar, course_level: c.level });
      }
    }

    if (!allLessons.length) {
      return {
        text: `لا توجد دروس منشورة حالياً لمسار ${trackLabel} (${LEVEL_AR[levelFilter] || levelFilter}).`,
        buttons: [
          { id: 'prog:level:all', title: '📚 جميع المستويات' },
          { id: 'nav:back', title: '⬅️ رجوع' },
        ],
      };
    }

    const completedSet = this._getCompletedLessonIds(user.id);
    const paged = paginateItems(allLessons, page, 8);

    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: {
        step: 'select_lesson',
        track,
        trackLabel,
        levelFilter,
        page: paged.page,
        lessons: allLessons.map((l) => ({
          id: l.id,
          title_ar: l.title_ar,
          lesson_type: l.lesson_type,
          course_level: l.course_level,
        })),
      },
    });

    const lines = paged.items.map((l, i) => {
      const globalNum = paged.startIndex + i + 1;
      const badge = l.lesson_type === 'project' ? ' [مشروع]' : '';
      const levelTag = l.course_level ? ` (${LEVEL_AR[l.course_level] || l.course_level})` : '';
      const done = completedSet.has(l.id) ? ' ✅' : '';
      return `*${globalNum}.* ${l.title_ar}${badge}${levelTag}${done}`;
    });

    const buttons = [];
    if (paged.hasPrev) buttons.push({ id: 'page:prev', title: '⬅️ السابق' });
    if (paged.hasNext) buttons.push({ id: 'page:next', title: 'التالي ➡️' });
    if (!buttons.length) {
      buttons.push({ id: 'prog:level:intermediate', title: '📘 المتوسط' });
      buttons.push({ id: 'prog:level:advanced', title: '🚀 المتقدم' });
    }
    buttons.push({ id: 'nav:back', title: '🔙 المسارات' });

    return {
      text: [
        formatHeader(
          '📘',
          `مسار ${trackLabel} — ${LEVEL_AR[levelFilter] || 'الكل'}`,
          `${allLessons.length} دروس ومشاريع · صفحة ${paged.page} من ${paged.totalPages}`
        ),
        ...lines,
        ARABIC_DIVIDER,
        `أرسل رقم الدرس (1–${allLessons.length})، أو اختر من القائمة أو *رجوع*.`,
      ].join('\n'),
      interactiveList: {
        title: `📘 مسار ${trackLabel}`,
        text: `صفحة ${paged.page}/${paged.totalPages} · تصفية حسب المستوى أو فتح درس:`,
        buttonText: 'الدروس والمستويات',
        footer: 'نيكسورا · مبتدئ → متوسط → متقدم',
        sections: [
          {
            title: `الدروس (صفحة ${paged.page})`,
            rows: paged.items.map((l, i) => ({
              rowId: `prog:lesson:${l.id}`,
              title: `${paged.startIndex + i + 1}. ${l.title_ar}`.slice(0, 24),
              description: `${LEVEL_AR[l.course_level] || l.course_level}${l.lesson_type === 'project' ? ' · مشروع تطبيقي' : ''}`,
            })),
          },
          {
            title: 'تصفية المستوى',
            rows: [
              { rowId: 'prog:level:all', title: '📚 جميع المستويات', description: 'عرض المسار الكامل بالترتيب' },
              { rowId: 'prog:level:beginner', title: '🌱 المبتدئ', description: 'التأسيس والمفاهيم الأساسية' },
              { rowId: 'prog:level:intermediate', title: '📘 المتوسط', description: 'الهياكل المتقدمة والتطبيقات' },
              { rowId: 'prog:level:advanced', title: '🚀 المتقدم', description: 'المعمارية والأداء والمشاريع الكبرى' },
            ],
          },
        ],
      },
      buttons: buttons.slice(0, 3),
    };
  }

  _renderLesson(user, lessonId, navContext = {}) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'الدرس غير موجود.' };
    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);

    const savedNav = {
      track: navContext.track,
      trackLabel: navContext.trackLabel,
      levelFilter: navContext.levelFilter || 'all',
      page: navContext.page || 1,
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
      buttons: [
        { id: 'prog:quiz', title: `📝 اختبار (${exercises.length})` },
        { id: 'prog:explain', title: '🔍 شرح أعمق' },
        { id: 'prog:complete', title: '✅ إتمام (+10)' },
      ],
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
        buttons: [
          { id: 'prog:quiz', title: '📝 اختبار الدرس' },
          { id: 'nav:back', title: '⬅️ رجوع' },
        ],
      };
    }

    return {
      text: `🔍 *شرح مفصل:*\n${res.text}\n\nأرسل *1* للاختبار أو *رجوع*.`,
      buttons: [
        { id: 'prog:quiz', title: '📝 اختبار الدرس' },
        { id: 'nav:back', title: '⬅️ رجوع' },
      ],
    };
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
        buttons: [
          { id: 'nav:back', title: '⬅️ رجوع' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    return {
      text: `${staticBlock}🛠️ *التحليل والإصلاح المقترح:*\n${res.text}\n\nأرسل كوداً آخر أو *رجوع* للعودة إلى مسارات البرمجة.`,
      buttons: [
        { id: 'nav:back', title: '⬅️ رجوع' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
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
      buttons: firstEx.options.slice(0, 3).map((opt, idx) => ({
        id: `prog:ans:${idx + 1}`,
        title: `${idx + 1}. ${String(opt).slice(0, 16)}`,
      })),
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
      return {
        text: `💡 *تلميح:* ${current.hint_ar || 'تتبّع تنفيذ السطور خطوة بخطوة.'}`,
        buttons: (current.options || []).slice(0, 3).map((opt, idx) => ({
          id: `prog:ans:${idx + 1}`,
          title: `${idx + 1}. ${String(opt).slice(0, 16)}`,
        })),
      };
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
        buttons: nextEx.options.slice(0, 3).map((opt, idx) => ({
          id: `prog:ans:${idx + 1}`,
          title: `${idx + 1}. ${String(opt).slice(0, 16)}`,
        })),
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
      buttons: [
        { id: 'nav:back', title: '⬅️ قائمة الدروس' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
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
    return {
      text: `✅ تم تسجيل إتمام *${lesson.title_ar}* (+10 نقاط). أرسل *رجوع* لاختيار درس آخر.`,
      buttons: [
        { id: 'nav:back', title: '⬅️ قائمة الدروس' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  _openMistakeReview(user) {
    const mistakes = this._listModuleMistakes(user.id);
    if (!mistakes.length) {
      return {
        text: `🌟 سجل أخطائك البرمجية نظيف حالياً! لا توجد أخطاء غير مراجَعة.\nاختر مساراً (1–5) لمتابعة التعلم.`,
        buttons: [
          { id: 'menu:programming', title: '💻 المسارات' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
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
      buttons: [
        { id: 'prog:mistakes:clear', title: '✅ تأكيد المراجعة' },
        { id: 'nav:back', title: '⬅️ رجوع' },
      ],
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
