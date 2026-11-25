import {
  ARABIC_DIVIDER,
  formatHeader,
  formatLessonCard,
  formatQuizCard,
  normalizeCommandText,
  paginateItems,
} from '../../utils/text.js';

export const LANGUAGE_REGISTRY = [
  { key: 'japanese', labelAr: 'اليابانية (日本語)', short: 'ياباني' },
  { key: 'english', labelAr: 'الإنجليزية (English)', short: 'إنجليزي' },
  { key: 'russian', labelAr: 'الروسية (Русский)', short: 'روسي' },
  { key: 'chinese', labelAr: 'الصينية (中文)', short: 'صيني' },
];

const LEVELS = [
  { key: 'beginner', labelAr: 'مبتدئ' },
  { key: 'intermediate', labelAr: 'متوسط' },
  { key: 'advanced', labelAr: 'متقدم' },
];

const TYPE_LABELS = {
  vocabulary: 'مفردات وأمثلة',
  grammar: 'قواعد',
  reading: 'فهم مقروء',
  writing: 'كتابة',
  listening: 'استماع',
  pronunciation: 'نطق',
  lesson: 'درس شامل',
};

export class LanguageAcademyModule {
  constructor({ repos, audioService }) {
    this.repos = repos;
    this.audioService = audioService;
  }

  openHome(user) {
    const due = this.repos.progress.getDueReviews(user.id, 10);
    const openMistakes = this._listModuleMistakes(user.id);
    this.repos.users.setState(user.id, { menu: 'languages', data: { step: 'select_language' } });

    const lines = [
      formatHeader('🌍', 'أكاديمية اللغات — NEXORA', 'اختر اللغة التي ترغب في دراستها'),
      ...LANGUAGE_REGISTRY.map((l, i) => `*${i + 1}.* ${l.labelAr}`),
      `*5.* مراجعة التكرار المتباعد (المستحق الآن: ${due.length})`,
      `*6.* مراجعة أخطائي السابقة (${openMistakes.length})`,
      ARABIC_DIVIDER,
      `اختر من القائمة التفاعلية أو أرسل رقم الخيار، أو *رئيسية* للعودة.`,
    ];

    return {
      text: lines.join('\n'),
      interactiveList: {
        title: '🌍 أكاديمية اللغات',
        text: 'اختر اللغة أو جلسة المراجعة:',
        buttonText: 'اختر اللغة',
        footer: 'نيكسورا · اليابانية، الإنجليزية، الروسية، الصينية',
        sections: [
          {
            title: 'اللغات المتاحة',
            rows: LANGUAGE_REGISTRY.map((l) => ({
              rowId: `lang:select:${l.key}`,
              title: l.labelAr.slice(0, 24),
              description: `مسار متدرج (مبتدئ / متوسط / متقدم) + نطق وتمارين`,
            })),
          },
          {
            title: 'المراجعة الذكية',
            rows: [
              { rowId: 'lang:srs', title: '🔁 التكرار المتباعد', description: `الدروس المستحقة الآن: ${due.length}` },
              { rowId: 'lang:mistakes', title: '🎯 مراجعة الأخطاء', description: `أخطاء مفتوحة: ${openMistakes.length}` },
            ],
          },
        ],
      },
      buttons: [
        { id: 'lang:srs', title: `🔁 مراجعة (${due.length})` },
        { id: 'lang:mistakes', title: `🎯 أخطائي (${openMistakes.length})` },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  async handleInput({ user, text, selectedId = null, state }) {
    const raw = String(selectedId || text || '').trim();
    const norm = normalizeCommandText(raw);
    const data = state?.data || {};

    if (raw === 'lang:srs') {
      return this._startSpacedRepetition(user);
    }
    if (raw === 'lang:mistakes') {
      return this._openMistakeReview(user);
    }
    if (raw.startsWith('lang:select:')) {
      const langKey = raw.slice('lang:select:'.length);
      const lang = LANGUAGE_REGISTRY.find((l) => l.key === langKey);
      if (lang) {
        return this._renderLevelMenu(user, { subject: lang.key, subjectLabel: lang.labelAr });
      }
    }
    if (raw.startsWith('lang:level:') && data.subject) {
      const lvlKey = raw.slice('lang:level:'.length);
      const level = LEVELS.find((lv) => lv.key === lvlKey);
      if (level) {
        return this._openLevelContent(user, data, level);
      }
    }
    if (raw.startsWith('lang:unit:')) {
      const unitIdx = Number(raw.slice('lang:unit:'.length));
      if (Number.isInteger(unitIdx) && unitIdx >= 0) {
        return this._openUnitByIndex(user, data, unitIdx);
      }
    }
    if (raw.startsWith('lang:lesson:')) {
      const lessonId = Number(raw.slice('lang:lesson:'.length));
      if (Number.isInteger(lessonId) && lessonId > 0) {
        return this._renderLesson(user, lessonId, data);
      }
    }

    if (data.step === 'select_language') {
      if (norm === '5' || norm.includes('تكرار') || norm.includes('متباعد')) {
        return this._startSpacedRepetition(user);
      }
      if (norm === '6' || norm.includes('اخطاء') || norm.includes('مراجعه')) {
        return this._openMistakeReview(user);
      }

      const idx = Number(norm) - 1;
      const byName = LANGUAGE_REGISTRY.find((l) => norm.includes(l.key) || norm.includes(l.short));
      const lang = LANGUAGE_REGISTRY[idx] || byName;
      if (!lang) {
        return {
          text: '⚠️ يرجى اختيار رقم صحيح من *1* إلى *6* (اللغات 1–4، المراجعة المتباعدة 5، الأخطاء 6).',
          buttons: [
            { id: 'menu:languages', title: '🌍 قائمة اللغات' },
            { id: 'nav:home', title: '🏠 الرئيسية' },
          ],
        };
      }

      return this._renderLevelMenu(user, { subject: lang.key, subjectLabel: lang.labelAr });
    }

    if (data.step === 'review_mistakes') {
      if (raw === 'lang:mistakes:clear' || norm === '1' || norm.includes('تمت') || norm.includes('مسح') || norm.includes('تصفيه')) {
        this._resolveAllModuleMistakes(user.id);
        this.repos.users.setState(user.id, { menu: 'languages', data: { step: 'select_language' } });
        return {
          text: `✅ تم تسجيل مراجعة جميع الأخطاء السابقة في اللغات.\nأرسل *رجوع* أو رقم لغة (1–4) لبدء درس جديد.`,
          buttons: [
            { id: 'menu:languages', title: '🌍 اللغات' },
            { id: 'nav:home', title: '🏠 الرئيسية' },
          ],
        };
      }
      return {
        text: 'أرسل *1* لتأكيد إتمام مراجعة الأخطاء، أو *رجوع* للعودة لأكاديمية اللغات.',
        buttons: [
          { id: 'lang:mistakes:clear', title: '✅ تأكيد المراجعة' },
          { id: 'nav:back', title: '⬅️ رجوع' },
        ],
      };
    }

    if (data.step === 'select_level') {
      const level = LEVELS[Number(norm) - 1] || LEVELS.find((lv) => norm === lv.key || norm === lv.labelAr);
      if (!level) {
        return {
          text: '⚠️ يرجى اختيار مستوى صحيح: *1* (مبتدئ)، *2* (متوسط)، أو *3* (متقدم).',
          buttons: LEVELS.map((lv) => ({ id: `lang:level:${lv.key}`, title: lv.labelAr })),
        };
      }
      return this._openLevelContent(user, data, level);
    }

    if (data.step === 'select_unit') {
      const unitIdx = Number(norm) - 1;
      if (!Number.isInteger(unitIdx) || unitIdx < 0 || !data.units?.[unitIdx]) {
        return { text: `⚠️ أرسل رقم الوحدة الصحيح (1 إلى ${data.units?.length || 1}) أو *رجوع*.` };
      }
      return this._openUnitByIndex(user, data, unitIdx);
    }

    if (data.step === 'select_lesson') {
      if (raw === 'page:next' || norm === 'التالي') {
        return this._renderLessonList(user, { ...data, page: (Number(data.page) || 1) + 1 });
      }
      if (raw === 'page:prev' || norm === 'السابق') {
        return this._renderLessonList(user, { ...data, page: Math.max(1, (Number(data.page) || 1) - 1) });
      }
      const picked = data.lessons?.[Number(norm) - 1];
      if (!picked) {
        return { text: `⚠️ أرسل رقم الدرس الصحيح (1 إلى ${data.lessons?.length || 1}) أو *رجوع*.` };
      }
      return this._renderLesson(user, picked.id, data);
    }

    if (data.step === 'in_lesson') {
      if (raw === 'lang:pronounce' || norm === '1' || norm.includes('نطق') || norm.includes('صوت')) {
        return this._playPronunciation(user, data.lessonId);
      }
      if (raw === 'lang:quiz' || norm === '2' || norm.includes('اختبار') || norm.includes('تمرين')) {
        return this._startLessonQuiz(user, data.lessonId, data);
      }
      if (raw === 'lang:complete' || norm === '3' || norm.includes('اكمال') || norm.includes('تم')) {
        return this._completeLesson(user, data.lessonId, 85);
      }
      return {
        text: 'أرسل *1* للنطق الصوتي، *2* للاختبار، *3* لإتمام الدرس وحفظ التقدم، أو *رجوع*.',
        buttons: [
          { id: 'lang:pronounce', title: '🔊 النطق' },
          { id: 'lang:quiz', title: '📝 الاختبار' },
          { id: 'lang:complete', title: '✅ إتمام' },
        ],
      };
    }

    if (data.step === 'in_quiz') {
      const mapped = raw.startsWith('lang:ans:') ? raw.slice('lang:ans:'.length) : raw === 'lang:hint' ? 'تلميح' : raw;
      return this._gradeExercise(user, mapped, data);
    }

    return this.openHome(user);
  }

  _openLevelContent(user, data, level) {
    const courses = this.repos.curriculum.listCourses({
      category: 'language',
      subject: data.subject,
      level: level.key,
    });

    if (!courses.length) {
      return { text: 'لا توجد دروس منشورة لهذا المستوى حالياً. جرب مستوى آخر أو أرسل *رجوع*.' };
    }

    const lessons = [];
    for (const c of courses) {
      for (const l of this.repos.curriculum.listLessonsByCourse(c.id)) {
        lessons.push({ ...l, course_title: c.title_ar });
      }
    }

    if (!lessons.length) {
      return { text: 'لا توجد دروس مضافة بعد في هذا المسار.' };
    }

    const units = this._groupLessonsIntoUnits(lessons);
    if (units.length > 1) {
      return this._renderUnitList(user, {
        subject: data.subject,
        subjectLabel: data.subjectLabel,
        level: level.key,
        levelLabel: level.labelAr,
        units,
      });
    }

    return this._renderLessonList(user, {
      subject: data.subject,
      subjectLabel: data.subjectLabel,
      level: level.key,
      levelLabel: level.labelAr,
      unitIndex: 0,
      unitTitle: units[0].title,
      hasUnits: false,
      lessons: units[0].lessons,
      page: 1,
    });
  }

  _openUnitByIndex(user, data, unitIdx) {
    const allCourses = this.repos.curriculum.listCourses({
      category: 'language',
      subject: data.subject,
      level: data.level,
    });
    const lessons = [];
    for (const c of allCourses) {
      for (const l of this.repos.curriculum.listLessonsByCourse(c.id)) {
        lessons.push(l);
      }
    }
    const units = this._groupLessonsIntoUnits(lessons);
    const targetUnit = units[unitIdx];
    if (!targetUnit) {
      return { text: 'تعذر تحميل دروس الوحدة، أرسل *رجوع* وحاول مرة أخرى.' };
    }

    return this._renderLessonList(user, {
      subject: data.subject,
      subjectLabel: data.subjectLabel,
      level: data.level,
      levelLabel: data.levelLabel,
      unitIndex: unitIdx,
      unitTitle: targetUnit.title,
      hasUnits: true,
      lessons: targetUnit.lessons,
      page: 1,
    });
  }

  handleBack(user, data = {}) {
    if (data.step === 'in_quiz' && data.lessonId) {
      return this._renderLesson(user, data.lessonId, data.navContext || {});
    }
    if (data.step === 'in_lesson') {
      const nav = data.navContext || {};
      if (nav.lessons?.length) {
        return this._renderLessonList(user, nav);
      }
      if (nav.subject) {
        return this._renderLevelMenu(user, nav);
      }
      return this.openHome(user);
    }
    if (data.step === 'select_lesson') {
      if (data.hasUnits && data.subject && data.level) {
        const courses = this.repos.curriculum.listCourses({
          category: 'language',
          subject: data.subject,
          level: data.level,
        });
        const lessons = courses.flatMap((c) => this.repos.curriculum.listLessonsByCourse(c.id));
        const units = this._groupLessonsIntoUnits(lessons);
        return this._renderUnitList(user, { ...data, units });
      }
      if (data.subject) {
        return this._renderLevelMenu(user, data);
      }
      return this.openHome(user);
    }
    if (data.step === 'select_unit' && data.subject) {
      return this._renderLevelMenu(user, data);
    }
    return this.openHome(user);
  }

  _renderLevelMenu(user, { subject, subjectLabel }) {
    this.repos.users.setState(user.id, {
      menu: 'languages',
      data: { step: 'select_level', subject, subjectLabel },
    });
    return {
      text: [
        formatHeader('📚', subjectLabel, 'اختر المستوى الدراسي'),
        `*1.* مبتدئ (دروس تأسيسية منظمة)`,
        `*2.* متوسط (محادثة وقراءة وقواعد)`,
        `*3.* متقدم (تعبير وأساليب احترافية)`,
        ARABIC_DIVIDER,
        `اختر من الأزرار أو أرسل رقم المستوى، أو *رجوع* لاختيار لغة أخرى.`,
      ].join('\n'),
      buttons: LEVELS.map((lv, idx) => ({
        id: `lang:level:${lv.key}`,
        title: `${idx + 1}. ${lv.labelAr}`,
      })),
    };
  }

  _renderUnitList(user, { subject, subjectLabel, level, levelLabel, units }) {
    const completedSet = this._getCompletedLessonIds(user.id);
    this.repos.users.setState(user.id, {
      menu: 'languages',
      data: {
        step: 'select_unit',
        subject,
        subjectLabel,
        level,
        levelLabel,
        units: units.map((u) => ({ title: u.title, count: u.lessons.length })),
      },
    });

    const unitLines = units.map((u, idx) => {
      const done = u.lessons.filter((l) => completedSet.has(l.id)).length;
      return `*${idx + 1}.* ${u.title} (${u.lessons.length} دروس | مكتمل: ${done})`;
    });

    return {
      text: [
        formatHeader('📂', `${subjectLabel} — ${levelLabel}`, `الوحدات التعليمية (${units.length} وحدات)`),
        ...unitLines,
        ARABIC_DIVIDER,
        `اختر الوحدة من القائمة أو أرسل رقمها، أو *رجوع* لتغيير المستوى.`,
      ].join('\n'),
      interactiveList: {
        title: `📂 وحدات ${subjectLabel}`,
        text: `المستوى: ${levelLabel}`,
        buttonText: 'اختر الوحدة',
        footer: 'نيكسورا · اختر وحدة لعرض دروسها',
        sections: [
          {
            title: 'الوحدات الدراسية',
            rows: units.map((u, idx) => ({
              rowId: `lang:unit:${idx}`,
              title: u.title.slice(0, 24),
              description: `${u.lessons.length} دروس متدرجة`,
            })),
          },
        ],
      },
      buttons: [
        { id: 'nav:back', title: '⬅️ رجوع' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  _renderLessonList(user, { subject, subjectLabel, level, levelLabel, unitIndex = 0, unitTitle = '', hasUnits = false, lessons = [], page = 1 }) {
    const completedSet = this._getCompletedLessonIds(user.id);
    const paged = paginateItems(lessons, page, 6);

    this.repos.users.setState(user.id, {
      menu: 'languages',
      data: {
        step: 'select_lesson',
        subject,
        subjectLabel,
        level,
        levelLabel,
        unitIndex,
        unitTitle,
        hasUnits,
        page: paged.page,
        lessons: lessons.map((l) => ({ id: l.id, title_ar: l.title_ar, lesson_type: l.lesson_type })),
      },
    });

    const listText = paged.items
      .map((l, i) => {
        const globalNum = paged.startIndex + i + 1;
        const doneMark = completedSet.has(l.id) ? ' ✅' : '';
        const shortTitle = l.title_ar.includes(' — ') ? l.title_ar.split(' — ').slice(1).join(' — ') : l.title_ar;
        return `*${globalNum}.* [${TYPE_LABELS[l.lesson_type] || l.lesson_type}] ${shortTitle}${doneMark}`;
      })
      .join('\n');

    const subtitle = `${unitTitle || 'قائمة الدروس'} · صفحة ${paged.page} من ${paged.totalPages}`;
    const buttons = [];
    if (paged.hasPrev) buttons.push({ id: 'page:prev', title: '⬅️ السابق' });
    if (paged.hasNext) buttons.push({ id: 'page:next', title: 'التالي ➡️' });
    buttons.push({ id: 'nav:back', title: '🔙 رجوع' });
    if (buttons.length < 3) buttons.push({ id: 'nav:home', title: '🏠 الرئيسية' });

    return {
      text: [
        formatHeader('📖', `${subjectLabel} (${levelLabel})`, subtitle),
        listText,
        ARABIC_DIVIDER,
        `اختر الدرس من القائمة أو أرسل رقم الدرس (1–${lessons.length})، أو *رجوع*.`,
      ].join('\n'),
      interactiveList: {
        title: `📖 ${subjectLabel}`,
        text: `${unitTitle || 'الدروس'} (صفحة ${paged.page}/${paged.totalPages})`,
        buttonText: 'اختر الدرس',
        footer: 'نيكسورا · دروس منظمة',
        sections: [
          {
            title: `صفحة ${paged.page}`,
            rows: paged.items.map((l, i) => {
              const shortTitle = l.title_ar.includes(' — ') ? l.title_ar.split(' — ').slice(1).join(' — ') : l.title_ar;
              return {
                rowId: `lang:lesson:${l.id}`,
                title: `${paged.startIndex + i + 1}. ${shortTitle}`.slice(0, 24),
                description: `${TYPE_LABELS[l.lesson_type] || l.lesson_type}${completedSet.has(l.id) ? ' (مكتمل)' : ''}`,
              };
            }),
          },
        ],
      },
      buttons: buttons.slice(0, 3),
    };
  }

  _renderLesson(user, lessonId, navContext = {}) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'تعذر العثور على الدرس المطلوب.' };

    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);
    const savedNav = {
      subject: navContext.subject,
      subjectLabel: navContext.subjectLabel,
      level: navContext.level,
      levelLabel: navContext.levelLabel,
      unitIndex: navContext.unitIndex,
      unitTitle: navContext.unitTitle,
      hasUnits: navContext.hasUnits,
      page: navContext.page || 1,
      lessons: navContext.lessons,
    };

    this.repos.users.setState(user.id, {
      menu: 'languages',
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
      module: 'languages',
      eventType: 'lesson_opened',
      topic: lesson.title_ar,
    });

    return {
      text: formatLessonCard({
        title: lesson.title_ar,
        badge: `النوع: ${TYPE_LABELS[lesson.lesson_type] || 'درس'}`,
        content: lesson.content_ar,
        examples: lesson.examples,
        pronunciation: lesson.pronunciation_text,
        pronunciationLang: lesson.pronunciation_lang,
        footerActions: [
          `*1.* مثال النطق الصوتي${lesson.pronunciation_text ? ` (${lesson.pronunciation_lang})` : ''}`,
          `*2.* بدء تمرين/اختبار الدرس (${exercises.length} ${exercises.length === 1 ? 'سؤال' : 'أسئلة'})`,
          `*3.* تسجيل إتمام الدرس في التقدم والتكرار المتباعد`,
          `• أرسل *رجوع* للعودة`,
        ],
      }),
      buttons: [
        { id: 'lang:pronounce', title: '🔊 النطق' },
        { id: 'lang:quiz', title: '📝 تمرين الدرس' },
        { id: 'lang:complete', title: '✅ إتمام (+10)' },
      ],
    };
  }

  async _playPronunciation(user, lessonId) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson || !lesson.pronunciation_text) {
      return { text: 'لا يوجد نص نطق مرفق لهذا الدرس حالياً.' };
    }

    const synth = await this.audioService.synthesizeSpeech({
      text: lesson.pronunciation_text,
      lang: lesson.pronunciation_lang || 'en',
      userId: user.id,
    });

    if (!synth.ok) {
      return {
        text: [
          `🗣️ *مثال النطق النصي (${lesson.pronunciation_lang}):*`,
          `"${lesson.pronunciation_text}"`,
          `⚠️ ${synth.reason}`,
        ].join('\n'),
        buttons: [
          { id: 'lang:quiz', title: '📝 ابدأ التمرين' },
          { id: 'nav:back', title: '⬅️ رجوع' },
        ],
      };
    }

    return {
      text: `🔊 *النطق الصوتي:*\n"${lesson.pronunciation_text}"`,
      audio: synth,
      buttons: [
        { id: 'lang:quiz', title: '📝 ابدأ التمرين' },
        { id: 'nav:back', title: '⬅️ رجوع' },
      ],
    };
  }

  _startLessonQuiz(user, lessonId, parentData = {}) {
    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);
    if (!exercises.length) {
      return this._completeLesson(user, lessonId, 90);
    }

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
      menu: 'languages',
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
        title: `تمرين: ${lesson.title_ar}`,
        progressLabel: `السؤال 1 من ${quizQueue.length}`,
        question: firstEx.question_ar,
        options: firstEx.options,
        footerHint: `أرسل رقم الإجابة (1–${firstEx.options.length})، *تلميح* للمساعدة، أو *رجوع* للدرس.`,
      }),
      buttons: firstEx.options.slice(0, 3).map((opt, idx) => ({
        id: `lang:ans:${idx + 1}`,
        title: `${idx + 1}. ${String(opt).slice(0, 16)}`,
      })),
    };
  }

  _gradeExercise(user, text, data) {
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
        text: `💡 *تلميح:* ${current.hint_ar || 'راجع شرح الدرس السابق بدقة.'}`,
        buttons: (current.options || []).slice(0, 3).map((opt, idx) => ({
          id: `lang:ans:${idx + 1}`,
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
    const points = isCorrect ? 15 : 3;
    const nextCorrectCount = (Number(data.correctCount) || 0) + (isCorrect ? 1 : 0);

    this.repos.progress.recordQuizAttempt({
      userId: user.id,
      courseId: data.courseId,
      lessonId: data.lessonId,
      exerciseId: current.id,
      topic: data.topic,
      userAnswer: text,
      isCorrect,
      scoreAwarded: points,
    });

    if (!isCorrect) {
      const expectedText = current.options?.[Number(current.correct_answer) - 1] || current.correct_answer;
      const chosenText = current.options?.[numericAns - 1] || text;
      this.repos.progress.recordMistake?.({
        userId: user.id,
        module: 'languages',
        topic: data.topic,
        question: current.question_ar || data.topic,
        userAnswer: chosenText,
        expectedAnswer: `${current.correct_answer}) ${expectedText}`,
      });
    } else {
      this.repos.progress.resolveMistakesByTopic?.(user.id, data.topic);
    }

    this.repos.users.addPoints(user.id, points);

    const feedbackLine = isCorrect
      ? `✅ *إجابة صحيحة! (+${points} نقطة)*`
      : `❌ *إجابة غير دقيقة* — الصحيح هو رقم *${current.correct_answer}*`;
    const explainLine = `💡 *التفسير:* ${current.explanation_ar}`;

    if (queue && quizIndex + 1 < queue.length) {
      const nextIdx = quizIndex + 1;
      const nextEx = queue[nextIdx];
      this.repos.users.setState(user.id, {
        menu: 'languages',
        data: {
          ...data,
          quizIndex: nextIdx,
          correctCount: nextCorrectCount,
        },
      });

      const nextCard = formatQuizCard({
        title: `متابعة التمرين`,
        progressLabel: `السؤال ${nextIdx + 1} من ${queue.length}`,
        question: nextEx.question_ar,
        options: nextEx.options,
        footerHint: `أرسل رقم الإجابة (1–${nextEx.options.length}) أو *تلميح*.`,
      });

      return {
        text: [feedbackLine, explainLine, '', nextCard].join('\n'),
        buttons: nextEx.options.slice(0, 3).map((opt, idx) => ({
          id: `lang:ans:${idx + 1}`,
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
      masteryScore: Math.max(55, mastery),
      completed,
    });

    this.repos.users.setState(user.id, {
      menu: 'languages',
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
        `🏁 *نتيجة التمرين:* ${nextCorrectCount} من ${totalQ} (${mastery}%)`,
        `📅 تم تحديث جدول التكرار المتباعد لهذا الدرس.`,
        `أرسل *رجوع* لقائمة الدروس أو *رئيسية* للقائمة الرئيسية.`,
      ].join('\n'),
      buttons: [
        { id: 'nav:back', title: '⬅️ قائمة الدروس' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  _completeLesson(user, lessonId, masteryScore) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'الدرس غير موجود.' };

    const progress = this.repos.progress.recordLessonProgress({
      userId: user.id,
      courseId: lesson.course_id,
      lessonId: lesson.id,
      masteryScore,
      completed: true,
    });
    this.repos.users.addPoints(user.id, 10);

    return {
      text: `✅ تم تسجيل إتمام درس *${lesson.title_ar}* (+10 نقاط)!\n📅 المراجعة القادمة وفق التكرار المتباعد بعد: *${progress.srs_interval_days} يوم*.\nأرسل *رجوع* أو *رئيسية*.`,
      buttons: [
        { id: 'nav:back', title: '⬅️ قائمة الدروس' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  _startSpacedRepetition(user) {
    const due = this.repos.progress.getDueReviews(user.id, 3);
    if (!due.length) {
      return {
        text: `🎉 لا توجد دروس مستحقة للمراجعة المتباعدة حالياً.\nابدأ درساً جديداً من اللغات لإضافته إلى جدول المراجعة الذكي.`,
        buttons: [
          { id: 'menu:languages', title: '🌍 اختيار لغة' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }
    const first = due[0];
    return this._renderLesson(user, first.lesson_id);
  }

  _openMistakeReview(user) {
    const mistakes = this._listModuleMistakes(user.id);
    if (!mistakes.length) {
      return {
        text: `🌟 سجل أخطائك في اللغات نظيف حالياً! لا توجد أخطاء غير مراجَعة.\nاختر لغة (1–4) لمواصلة التعلم.`,
        buttons: [
          { id: 'menu:languages', title: '🌍 اختيار لغة' },
          { id: 'nav:home', title: '🏠 الرئيسية' },
        ],
      };
    }

    this.repos.users.setState(user.id, {
      menu: 'languages',
      data: { step: 'review_mistakes' },
    });

    const lines = mistakes.slice(0, 8).map((m, idx) => {
      return [
        `*${idx + 1}.* (${m.topic || 'درس لغة'})`,
        `   ❓ *السؤال:* ${m.question}`,
        `   ❌ *إجابتك:* ${m.user_answer}`,
        `   ✅ *الصحيح:* ${m.expected_answer}`,
      ].join('\n');
    });

    return {
      text: [
        formatHeader('🔁', 'مراجعة أخطاء اللغات السابقة', `عدد الأخطاء المفتوحة: ${mistakes.length}`),
        ...lines,
        ARABIC_DIVIDER,
        `• أرسل *1* بعد المراجعة لإغلاق هذه الأخطاء وتحديث سجلك`,
        `• أو *رجوع* للعودة إلى قائمة اللغات`,
      ].join('\n\n'),
      buttons: [
        { id: 'lang:mistakes:clear', title: '✅ تأكيد المراجعة' },
        { id: 'nav:back', title: '⬅️ رجوع' },
      ],
    };
  }

  _groupLessonsIntoUnits(lessons) {
    const unitMap = new Map();
    const unprefixed = [];

    for (const lesson of lessons) {
      const idx = lesson.title_ar.indexOf(' — ');
      if (idx > 0 && lesson.title_ar.startsWith('الوحدة')) {
        const unitTitle = lesson.title_ar.slice(0, idx).trim();
        if (!unitMap.has(unitTitle)) unitMap.set(unitTitle, []);
        unitMap.get(unitTitle).push(lesson);
      } else {
        unprefixed.push(lesson);
      }
    }

    if (!unitMap.size) {
      return [{ title: 'الدروس المتاحة', lessons }];
    }

    const units = Array.from(unitMap.entries()).map(([title, list]) => ({ title, lessons: list }));
    if (unprefixed.length) {
      units[0].lessons = [...unprefixed, ...units[0].lessons];
    }
    return units;
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
    return all.filter((m) => m.module === 'languages');
  }

  _resolveAllModuleMistakes(userId) {
    try {
      this.repos.progress.db
        ?.prepare(`UPDATE user_mistakes SET resolved = 1 WHERE user_id = ? AND module = 'languages' AND resolved = 0`)
        .run(userId);
    } catch {
      // ignore on partial mocks
    }
  }
}
