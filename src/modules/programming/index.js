import { normalizeCommandText } from '../../utils/text.js';

export const PROGRAMMING_TRACKS = [
  { key: 'python', labelAr: 'Python' },
  { key: 'html', labelAr: 'HTML' },
  { key: 'css', labelAr: 'CSS' },
  { key: 'javascript', labelAr: 'JavaScript' },
  { key: 'nodejs', labelAr: 'Node.js' },
];

export class ProgrammingAcademyModule {
  constructor({ repos, aiService }) {
    this.repos = repos;
    this.aiService = aiService;
  }

  openHome(user) {
    this.repos.users.setState(user.id, { menu: 'programming', data: { step: 'select_track' } });
    return {
      text: [
        `💻 *أكاديمية البرمجة — NEXORA*`,
        `اختر المسار البرمجي:`,
        ...PROGRAMMING_TRACKS.map((t, i) => `${i + 1}️⃣ ${t.labelAr}`),
        `6️⃣ مساعدة تصحيح الأخطاء البرمجية (Debugging الآمن)`,
        '',
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
          text: `🛠️ *مساعد تصحيح الأخطاء البرمجية*\nألصق الكود الذي يواجه مشكلة واذكر رسالة الخطأ (إن وجدت) وسأشرح لك السبب وطريقة الإصلاح بأمان بدون تنفيذ الكود على الخادم.`,
        };
      }

      const idx = Number(norm) - 1;
      const track =
        PROGRAMMING_TRACKS[idx] ||
        PROGRAMMING_TRACKS.find((t) => norm.includes(t.key) || norm.includes(t.labelAr.toLowerCase()));

      if (!track) {
        return { text: 'يرجى اختيار رقم صحيح من 1 إلى 6.' };
      }

      const courses = this.repos.curriculum.listCourses({
        category: 'programming',
        subject: track.key,
      });

      const lessons = [];
      for (const c of courses) {
        for (const l of this.repos.curriculum.listLessonsByCourse(c.id)) {
          lessons.push({ ...l, course_title: c.title_ar });
        }
      }

      if (!lessons.length) {
        return { text: `لا توجد دروس منشورة حالياً لمسار ${track.labelAr}.` };
      }

      this.repos.users.setState(user.id, {
        menu: 'programming',
        data: {
          step: 'select_lesson',
          track: track.key,
          trackLabel: track.labelAr,
          lessons: lessons.map((l) => ({ id: l.id, title_ar: l.title_ar })),
        },
      });

      return {
        text: [
          `📘 *دروس ${track.labelAr}:*`,
          lessons.map((l, i) => `${i + 1}️⃣ ${l.title_ar}`).join('\n'),
          '',
          `أرسل رقم الدرس لفتحه، أو *رجوع* لتغيير اللغة.`,
        ].join('\n'),
      };
    }

    if (data.step === 'select_lesson') {
      const picked = data.lessons?.[Number(norm) - 1];
      if (!picked) return { text: 'أرسل رقم الدرس الصحيح أو *رجوع*.' };
      return this._renderLesson(user, picked.id);
    }

    if (data.step === 'in_lesson') {
      if (norm === '1' || norm.includes('اختبار')) {
        return this._startQuiz(user, data.lessonId);
      }
      if (norm === '2' || norm.includes('شرح')) {
        return this._explainLessonDeeper(user, data.lessonId);
      }
      if (norm === '3' || norm.includes('تم') || norm.includes('اكمال')) {
        return this._completeLesson(user, data.lessonId, 88);
      }
      return { text: 'أرسل *1* للاختبار، *2* لشرح إضافي للمثال، *3* لتسجيل الإتمام، أو *رجوع*.' };
    }

    if (data.step === 'in_quiz') {
      return this._gradeQuiz(user, text, data);
    }

    if (data.step === 'debug_mode') {
      return this._analyzeCodeSafely(user, text);
    }

    return this.openHome(user);
  }

  _renderLesson(user, lessonId) {
    const lesson = this.repos.curriculum.getLessonById(lessonId);
    if (!lesson) return { text: 'الدرس غير موجود.' };
    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);

    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: { step: 'in_lesson', lessonId: lesson.id, courseId: lesson.course_id },
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

    return {
      text: [
        `💻 *${lesson.title_ar}*`,
        '',
        lesson.content_ar,
        '',
        `الخيارات:`,
        `1️⃣ اختبار الدرس (${exercises.length} سؤال)`,
        `2️⃣ شرح أعمق للكود وأمثلة إضافية`,
        `3️⃣ تسجيل إتمام الدرس (+10 نقاط)`,
        `• أرسل *رجوع* للعودة`,
      ].join('\n'),
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

    return { text: `🔍 *شرح مفصل:*\n${res.text}\n\nأرسل *1* للاختبار أو *رجوع*.` };
  }

  async _analyzeCodeSafely(user, userCodeInput) {
    // Strictly static analysis + AI explanation — NEVER eval/exec/spawn user code.
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

    const staticBlock = staticChecks.length ? `🔎 *فحص ساكن سريع:*\n${staticChecks.map((s) => `• ${s}`).join('\n')}\n\n` : '';
    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'programming',
      eventType: 'debug_help',
      topic: 'static_code_analysis',
    });

    return {
      text: `${staticBlock}🛠️ *التحليل والإصلاح المقترح:*\n${res.text}\n\nأرسل كوداً آخر أو *رجوع* للعودة إلى مسارات البرمجة.`,
    };
  }

  _startQuiz(user, lessonId) {
    const exercises = this.repos.curriculum.listExercisesByLesson(lessonId);
    if (!exercises.length) return this._completeLesson(user, lessonId, 90);
    const ex = exercises[0];
    const lesson = this.repos.curriculum.getLessonById(lessonId);

    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: {
        step: 'in_quiz',
        lessonId,
        courseId: lesson.course_id,
        exerciseId: ex.id,
        correctAnswer: ex.correct_answer,
        explanation: ex.explanation_ar,
        hint: ex.hint_ar,
        topic: lesson.title_ar,
      },
    });

    const opts = ex.options.map((o, i) => `${i + 1}) ${o}`).join('\n');
    return {
      text: `📝 *اختبار برمجي: ${lesson.title_ar}*\n${ex.question_ar}\n\n${opts}\n\nأرسل رقم الإجابة أو *تلميح*.`,
    };
  }

  _gradeQuiz(user, text, data) {
    const norm = normalizeCommandText(text);
    if (norm === 'تلميح' || norm === 'hint') {
      return { text: `💡 *تلميح:* ${data.hint || 'تتبّع تنفيذ السطور خطوة بخطوة.'}` };
    }
    const isCorrect = norm === String(data.correctAnswer);
    const pts = isCorrect ? 15 : 3;

    this.repos.progress.recordQuizAttempt({
      userId: user.id,
      courseId: data.courseId,
      lessonId: data.lessonId,
      exerciseId: data.exerciseId,
      topic: data.topic,
      userAnswer: text,
      isCorrect,
      scoreAwarded: pts,
    });
    this.repos.progress.recordLessonProgress({
      userId: user.id,
      courseId: data.courseId,
      lessonId: data.lessonId,
      masteryScore: isCorrect ? 95 : 60,
      completed: isCorrect,
    });
    this.repos.users.addPoints(user.id, pts);
    this.repos.users.setState(user.id, {
      menu: 'programming',
      data: { step: 'in_lesson', lessonId: data.lessonId, courseId: data.courseId },
    });

    return {
      text: `${isCorrect ? `✅ *صحيح! (+${pts} نقطة)*` : `❌ *غير صحيح* — الصحيح: *${data.correctAnswer}*`}\n💡 ${data.explanation}\n\nأرسل *رجوع* للعودة للدروس.`,
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
}
