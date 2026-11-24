import { normalizeCommandText } from '../../utils/text.js';

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
    const due = this.repos.progress.getDueReviews(user.id, 5);
    this.repos.users.setState(user.id, { menu: 'languages', data: { step: 'select_language' } });

    const lines = [
      `🌍 *أكاديمية اللغات — NEXORA*`,
      `اختر اللغة التي ترغب في دراستها:`,
      ...LANGUAGE_REGISTRY.map((l, i) => `${i + 1}️⃣ ${l.labelAr}`),
      `5️⃣ مراجعة التكرار المتباعد (المستحق الآن: ${due.length})`,
      '',
      `أرسل رقم الخيار، أو *رئيسية* للعودة.`,
    ];
    return { text: lines.join('\n') };
  }

  async handleInput({ user, text, state }) {
    const norm = normalizeCommandText(text);
    const data = state?.data || {};

    if (data.step === 'select_language' && (norm === '5' || norm.includes('مراجعه'))) {
      return this._startSpacedRepetition(user);
    }

    if (data.step === 'select_language') {
      const idx = Number(norm) - 1;
      const byName = LANGUAGE_REGISTRY.find((l) => norm.includes(l.key) || norm.includes(l.short));
      const lang = LANGUAGE_REGISTRY[idx] || byName;
      if (!lang) {
        return { text: 'يرجى اختيار رقم لغة صحيح (1 إلى 4) أو 5 للمراجعة المتباعدة.' };
      }
      this.repos.users.setState(user.id, {
        menu: 'languages',
        data: { step: 'select_level', subject: lang.key, subjectLabel: lang.labelAr },
      });
      return {
        text: [
          `📚 *${lang.labelAr}*`,
          `اختر مستواك:`,
          `1️⃣ مبتدئ`,
          `2️⃣ متوسط`,
          `3️⃣ متقدم`,
          `• أرسل *رجوع* لاختيار لغة أخرى`,
        ].join('\n'),
      };
    }

    if (data.step === 'select_level') {
      const level = LEVELS[Number(norm) - 1] || LEVELS.find((lv) => norm === lv.key || norm === lv.labelAr);
      if (!level) {
        return { text: 'يرجى اختيار مستوى صحيح: 1 (مبتدئ)، 2 (متوسط)، أو 3 (متقدم).' };
      }

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

      this.repos.users.setState(user.id, {
        menu: 'languages',
        data: {
          step: 'select_lesson',
          subject: data.subject,
          level: level.key,
          lessons: lessons.map((l) => ({ id: l.id, title_ar: l.title_ar })),
        },
      });

      const listText = lessons
        .map((l, i) => `${i + 1}️⃣ [${TYPE_LABELS[l.lesson_type] || l.lesson_type}] ${l.title_ar}`)
        .join('\n');

      return {
        text: [
          `📖 *دروس ${data.subjectLabel} (${level.labelAr}):*`,
          listText,
          '',
          `أرسل رقم الدرس لفتحه، أو *رجوع* لتغيير المستوى.`,
        ].join('\n'),
      };
    }

    if (data.step === 'select_lesson') {
      const picked = data.lessons?.[Number(norm) - 1];
      if (!picked) {
        return { text: 'أرسل رقم الدرس الصحيح من القائمة، أو *رجوع*.' };
      }
      return this._renderLesson(user, picked.id);
    }

    if (data.step === 'in_lesson') {
      if (norm === '1' || norm.includes('نطق') || norm.includes('صوت')) {
        return this._playPronunciation(user, data.lessonId);
      }
      if (norm === '2' || norm.includes('اختبار') || norm.includes('تمرين')) {
        return this._startLessonQuiz(user, data.lessonId);
      }
      if (norm === '3' || norm.includes('اكمال') || norm.includes('تم')) {
        return this._completeLesson(user, data.lessonId, 85);
      }
      return { text: 'أرسل *1* للنطق الصوتي، *2* للاختبار، *3* لإتمام الدرس وحفظ التقدم، أو *رجوع*.' };
    }

    if (data.step === 'in_quiz') {
      return this._gradeExercise(user, text, data);
    }

    return this.openHome(user);
  }

  _renderLesson(user, lessonId) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'تعذر العثور على الدرس المطلوب.' };

    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);
    this.repos.users.setState(user.id, {
      menu: 'languages',
      data: { step: 'in_lesson', lessonId: lesson.id, courseId: lesson.course_id },
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

    const examplesBlock = lesson.examples.length
      ? `\n\n📌 *أمثلة تطبيقية:*\n${lesson.examples.map((e) => `• ${e}`).join('\n')}`
      : '';

    return {
      text: [
        `📘 *${lesson.title_ar}* (${TYPE_LABELS[lesson.lesson_type] || 'درس'})`,
        '',
        lesson.content_ar + examplesBlock,
        '',
        `الخيارات المتاحة:`,
        `1️⃣ مثال النطق الصوتي${lesson.pronunciation_text ? ` (${lesson.pronunciation_lang})` : ''}`,
        `2️⃣ بدء تمرين/اختبار الدرس (${exercises.length} سؤال)`,
        `3️⃣ تسجيل إتمام الدرس في التقدم والتكرار المتباعد`,
        `• أرسل *رجوع* للعودة`,
      ].join('\n'),
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
      };
    }

    return {
      text: `🔊 *النطق الصوتي:*\n"${lesson.pronunciation_text}"`,
      audio: synth,
    };
  }

  _startLessonQuiz(user, lessonId) {
    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);
    if (!exercises.length) {
      return this._completeLesson(user, lessonId, 90);
    }

    const ex = exercises[0];
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    this.repos.users.setState(user.id, {
      menu: 'languages',
      data: {
        step: 'in_quiz',
        lessonId,
        courseId: lesson.course_id,
        exerciseId: ex.id,
        question: ex.question_ar,
        correctAnswer: ex.correct_answer,
        explanation: ex.explanation_ar,
        hint: ex.hint_ar,
        topic: lesson.title_ar,
      },
    });

    const opts = ex.options.map((o, i) => `${i + 1}) ${o}`).join('\n');
    return {
      text: [
        `📝 *تمرين: ${lesson.title_ar}*`,
        ex.question_ar,
        '',
        opts,
        '',
        `أرسل رقم الإجابة، أو *تلميح* للمساعدة.`,
      ].join('\n'),
    };
  }

  _gradeExercise(user, text, data) {
    const norm = normalizeCommandText(text);
    if (norm === 'تلميح' || norm === 'hint') {
      return { text: `💡 *تلميح:* ${data.hint || 'راجع شرح الدرس السابق بدقة.'}` };
    }

    const isCorrect = norm === String(data.correctAnswer);
    const points = isCorrect ? 15 : 3;

    this.repos.progress.recordQuizAttempt({
      userId: user.id,
      courseId: data.courseId,
      lessonId: data.lessonId,
      exerciseId: data.exerciseId,
      topic: data.topic,
      userAnswer: text,
      isCorrect,
      scoreAwarded: points,
    });

    if (!isCorrect) {
      this.repos.progress.recordMistake?.({
        userId: user.id,
        module: 'languages',
        topic: data.topic,
        question: data.question || data.topic,
        userAnswer: text,
        expectedAnswer: String(data.correctAnswer),
      });
    } else {
      this.repos.progress.resolveMistakesByTopic?.(user.id, data.topic);
    }

    this.repos.progress.recordLessonProgress({
      userId: user.id,
      courseId: data.courseId,
      lessonId: data.lessonId,
      masteryScore: isCorrect ? 95 : 55,
      completed: isCorrect,
    });

    this.repos.users.addPoints(user.id, points);
    this.repos.users.setState(user.id, {
      menu: 'languages',
      data: { step: 'in_lesson', lessonId: data.lessonId, courseId: data.courseId },
    });

    return {
      text: [
        isCorrect ? `✅ *أحسنت! إجابة صحيحة (+${points} نقطة)*` : `❌ *إجابة غير دقيقة* — الصحيح هو رقم *${data.correctAnswer}*`,
        `💡 *التفسير:* ${data.explanation}`,
        `📅 تم تحديث جدول التكرار المتباعد لهذا الدرس.`,
        '',
        `أرسل *رجوع* لاختيار درس آخر أو *رئيسية* للقائمة الرئيسية.`,
      ].join('\n'),
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
    };
  }

  _startSpacedRepetition(user) {
    const due = this.repos.progress.getDueReviews(user.id, 3);
    if (!due.length) {
      return {
        text: `🎉 لا توجد دروس مستحقة للمراجعة المتباعدة حالياً.\nابدأ درساً جديداً من اللغات لإضافته إلى جدول المراجعة الذكي.`,
      };
    }
    const first = due[0];
    return this._renderLesson(user, first.lesson_id);
  }
}
