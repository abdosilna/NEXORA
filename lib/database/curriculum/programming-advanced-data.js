// Structured Beginner -> Intermediate -> Advanced Programming Academy extensions
// Completes full 3-tier progression across Python, HTML, CSS, JavaScript, and Node.js.

function buildLesson({
  courseSlug,
  slug,
  order,
  lessonType = 'lesson',
  difficulty = 'intermediate',
  title,
  explanation,
  codeLang,
  code,
  expectedOutput,
  commonMistakes = [],
  practiceTask,
  examples = [],
  exercises = [],
}) {
  const sections = [
    `📖 *الشرح التعليمي:*\n${explanation.trim()}`,
    `💻 *مثال برمجي تطبيقي:*\n\`\`\`${codeLang}\n${code.trim()}\n\`\`\``,
    `📤 *المخرجات / النتيجة المتوقعة (توضيح نظري):*\n${expectedOutput.trim()}`,
  ];

  if (commonMistakes.length) {
    sections.push(`⚠️ *أخطاء شائعة يجب تجنبها:*\n${commonMistakes.map((m) => `• ${m}`).join('\n')}`);
  }

  if (practiceTask) {
    sections.push(`✍️ *تمرين عملي مقترح:*\n${practiceTask.trim()}`);
  }

  return {
    courseSlug,
    slug,
    lesson_type: lessonType,
    title_ar: title,
    content_ar: sections.join('\n\n'),
    examples,
    sort_order: order,
    exercises: exercises.map((ex) => ({ difficulty, ...ex })),
  };
}

export const PROGRAMMING_ADVANCED_COURSES = [
  // Python Intermediate & Advanced
  {
    slug: 'prog-python-intermediate',
    category: 'programming',
    subject: 'python',
    title_ar: 'أكاديمية البرمجة — Python (المستوى المتوسط)',
    description_ar: 'البرمجة الكائنية OOP، معالجة الملفات، والاستثناءات والتعابير المولّدة.',
    level: 'intermediate',
    sort_order: 20,
  },
  {
    slug: 'prog-python-advanced',
    category: 'programming',
    subject: 'python',
    title_ar: 'أكاديمية البرمجة — Python (المستوى المتقدم)',
    description_ar: 'المزخرفات Decorators، البرمجة غير المتزامنة asyncio، ومشروع محلل بيانات.',
    level: 'advanced',
    sort_order: 21,
  },
  // HTML Intermediate & Advanced
  {
    slug: 'prog-html-intermediate',
    category: 'programming',
    subject: 'html',
    title_ar: 'أكاديمية البرمجة — HTML (المستوى المتوسط)',
    description_ar: 'النماذج المتقدمة والتحقق المدمج، الوسائط المتعددة، والجداول الدلالية.',
    level: 'intermediate',
    sort_order: 22,
  },
  {
    slug: 'prog-html-advanced',
    category: 'programming',
    subject: 'html',
    title_ar: 'أكاديمية البرمجة — HTML (المستوى المتقدم)',
    description_ar: 'إمكانية الوصول ARIA، بيانات SEO المنظمة، وواجهات الويب التفاعلية الحديثة.',
    level: 'advanced',
    sort_order: 23,
  },
  // CSS Intermediate & Advanced
  {
    slug: 'prog-css-intermediate',
    category: 'programming',
    subject: 'css',
    title_ar: 'أكاديمية البرمجة — CSS (المستوى المتوسط)',
    description_ar: 'التصميم المتجاوب Media Queries، المتغيرات CSS Variables، والانتقالات.',
    level: 'intermediate',
    sort_order: 24,
  },
  {
    slug: 'prog-css-advanced',
    category: 'programming',
    subject: 'css',
    title_ar: 'أكاديمية البرمجة — CSS (المستوى المتقدم)',
    description_ar: 'Container Queries، الحركات المعقدة Keyframes، ومعمارية الأنماط الحديثة.',
    level: 'advanced',
    sort_order: 25,
  },
  // JavaScript Advanced
  {
    slug: 'prog-js-advanced',
    category: 'programming',
    subject: 'javascript',
    title_ar: 'أكاديمية البرمجة — JavaScript (المستوى المتقدم)',
    description_ar: 'الإغلاقات Closures، حلقة الأحداث Event Loop، وأنماط التصميم الحديثة.',
    level: 'advanced',
    sort_order: 26,
  },
  // Node.js Beginner & Advanced (Intermediate already exists as prog-nodejs-core)
  {
    slug: 'prog-nodejs-beginner',
    category: 'programming',
    subject: 'nodejs',
    title_ar: 'أكاديمية البرمجة — Node.js (المستوى المبتدئ)',
    description_ar: 'بيئة Node.js، نظام الملفات fs/promises، والمسارات، والمتغيرات البيئية.',
    level: 'beginner',
    sort_order: 16,
  },
  {
    slug: 'prog-nodejs-advanced',
    category: 'programming',
    subject: 'nodejs',
    title_ar: 'أكاديمية البرمجة — Node.js (المستوى المتقدم)',
    description_ar: 'بث البيانات Streams، عمال الخلفية Worker Threads، وأمن الخوادم ومشروع API.',
    level: 'advanced',
    sort_order: 27,
  },
];

export const PROGRAMMING_ADVANCED_LESSONS = [
  // ==================== PYTHON INTERMEDIATE & ADVANCED ====================
  buildLesson({
    courseSlug: 'prog-python-intermediate',
    slug: 'py-int-01-oop-classes',
    order: 1,
    difficulty: 'intermediate',
    title: 'البرمجة كائنية التوجه (Classes & Objects) في Python',
    explanation:
      'تسمح الأصناف (Classes) بتجميع البيانات والوظائف المرتبطة بها في قالب واحد. الدالة البانية `__init__` تهيّئ خصائص كل كائن عند إنشائه، والمعامل `self` يشير إلى الكائن الحالي.',
    codeLang: 'python',
    code: `class CourseProgress:\n    def __init__(self, student, points=0):\n        self.student = student\n        self.points = points\n\n    def add_points(self, amount):\n        self.points += amount\n        return f"{self.student}: {self.points} XP"\n\np = CourseProgress("سارة", 20)\nprint(p.add_points(15))`,
    expectedOutput: 'سارة: 35 XP',
    commonMistakes: [
      'نسيان تمرير `self` كأول معامل في دوال الصنف.',
      'مشاركة قوائم قابلة للتعديل كخصائص على مستوى الصنف بدل تعريفها داخل `__init__`.',
    ],
    practiceTask: 'أضف دالة `is_mastered()` تعيد `True` إذا كانت النقاط 100 فأكثر.',
    examples: ['class Student:', 'def __init__(self, name): self.name = name'],
    exercises: [
      {
        question_ar: 'ما وظيفة الدالة الخاصة `__init__` داخل الصنف في Python؟',
        options: ['تهيئة خصائص الكائن عند إنشائه', 'حذف الكائن من الذاكرة', 'تحويل الكائن إلى نص'],
        correct_answer: '1',
        explanation_ar: '`__init__` هي دالة البناء (Constructor) وتُستدعى تلقائياً فور إنشاء نسخة من الصنف.',
        hint_ar: 'تبدأ من كلمة initialize.',
      },
      {
        question_ar: 'إلامَ يشير المعامل الأول `self` في دوال الكائن؟',
        options: ['إلى النسخة الحالية من الكائن نفسها', 'إلى الملف الخارجي', 'إلى المكتبة القياسية'],
        correct_answer: '1',
        explanation_ar: '`self` يربط الدالة بخصائص الكائن الذي استُدعيت منه.',
        hint_ar: 'يعني "نفسه".',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-python-intermediate',
    slug: 'py-int-02-files-exceptions',
    order: 2,
    difficulty: 'intermediate',
    title: 'معالجة الاستثناءات والملفات بأمان (try/except & with)',
    explanation:
      'استخدام `with open(...)` يضمن إغلاق الملف تلقائياً حتى عند حدوث خطأ، بينما كتلة `try/except` تحمي البرنامج من الانهيار المفاجئ وتسمح برسائل خطأ واضحة.',
    codeLang: 'python',
    code: `def parse_score(raw_text):\n    try:\n        score = int(raw_text)\n        if not 0 <= score <= 100:\n            raise ValueError("النسبة خارج النطاق")\n        return score\n    except ValueError as err:\n        return f"خطأ في الإدخال: {err}"\n\nprint(parse_score("92"))\nprint(parse_score("abc"))`,
    expectedOutput: '92\nخطأ في الإدخال: invalid literal for int() with base 10: \'abc\'',
    commonMistakes: [
      'استخدام `except:` بدون تحديد نوع الاستثناء مما يخفي أخطاء البرمجة الحقيقية.',
      'فتح الملفات بدون `with` ونسيان استدعاء `file.close()`.',
    ],
    practiceTask: 'عدّل الدالة لتقرأ سطراً من ملف نصي مع التعامل مع `FileNotFoundError`.',
    examples: ['with open("notes.txt", "r", encoding="utf-8") as f:'],
    exercises: [
      {
        question_ar: 'ما الفائدة الأساسية لاستخدام `with open(...)` عند التعامل مع الملفات؟',
        options: ['إغلاق الملف تلقائياً بعد انتهاء الكتلة', 'تشفير الملف تلقائياً', 'ضغط حجم الملف'],
        correct_answer: '1',
        explanation_ar: 'مدير السياق (`with`) يضمن إغلاق مقبض الملف حتى لو وقع استثناء أثناء القراءة.',
        hint_ar: 'يتعلق بتحرير الموارد تلقائياً.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-python-advanced',
    slug: 'py-adv-01-decorators-async',
    order: 1,
    difficulty: 'advanced',
    title: 'المزخرفات (Decorators) والبرمجة غير المتزامنة asyncio',
    explanation:
      'المزخرف Decorator هو دالة تغلف دالة أخرى لإضافة سلوك مشترك (مثل التحقق أو القياس) دون تعديل جسمها. ومع `async/await` في `asyncio` يمكن تنفيذ مهام الشبكة بالتوازي التعاوني.',
    codeLang: 'python',
    code: `import functools\n\ndef log_step(fn):\n    @functools.wraps(fn)\n    def wrapper(*args, **kwargs):\n        print(f"بدء: {fn.__name__}")\n        return fn(*args, **kwargs)\n    return wrapper\n\n@log_step\ndef compute_average(nums):\n    return sum(nums) / len(nums)\n\nprint(compute_average([80, 90, 100]))`,
    expectedOutput: 'بدء: compute_average\n90.0',
    commonMistakes: [
      'نسيان `@functools.wraps(fn)` مما يفقد الدالة اسمها وتوثيقها الأصلي.',
      'استدعاء دالة محجوزة متزامنة مثل `time.sleep` داخل حلقة `asyncio` بدل `await asyncio.sleep`.',
    ],
    practiceTask: 'اكتب مزخرفاً يتحقق أن جميع المدخلات الرقمية موجبة قبل تنفيذ الدالة.',
    examples: ['@functools.wraps(fn)', 'async def fetch(): await asyncio.sleep(0.1)'],
    exercises: [
      {
        question_ar: 'لماذا نستخدم `@functools.wraps(fn)` داخل المزخرف؟',
        options: ['للحفاظ على اسم الدالة الأصلية وبياناتها الوصفية', 'لتسريع العمليات الحسابية', 'لتحويل الدالة إلى async'],
        correct_answer: '1',
        explanation_ar: '`functools.wraps` ينسخ `__name__` و `__doc__` من الدالة الأصلية إلى الدالة المغلفة.',
        hint_ar: 'يحفظ هوية الدالة المزخرفة.',
      },
    ],
  }),

  // ==================== HTML INTERMEDIATE & ADVANCED ====================
  buildLesson({
    courseSlug: 'prog-html-intermediate',
    slug: 'html-int-01-forms-validation',
    order: 1,
    difficulty: 'intermediate',
    title: 'النماذج المتقدمة والتحقق الأصلي من المدخلات في HTML',
    explanation:
      'تدعم نماذج HTML الحديثة خصائص تحقق مدمجة مثل `required` و`minlength` و`pattern` و`type="email"` مع وسم `<label>` المرتبط بـ `for` لتحسين تجربة المستخدم وإمكانية الوصول.',
    codeLang: 'html',
    code: `<form action="/enroll" method="post">\n  <label for="email">البريد التعليمي</label>\n  <input id="email" name="email" type="email" required placeholder="student@example.com" />\n  <button type="submit">تسجيل</button>\n</form>`,
    expectedOutput: 'نموذج تسجيل يتحقق المتصفح تلقائياً من صحة صيغة البريد وعدم تركه فارغاً قبل الإرسال.',
    commonMistakes: [
      'استخدام `placeholder` بديلاً عن `<label>` مما يضر بقارئات الشاشة.',
      'الاعتماد على تحقق المتصفح فقط وإهمال التحقق على الخادم.',
    ],
    practiceTask: 'أضف حقل كلمة مرور بحد أدنى 8 أحرف باستخدام `minlength="8"`.',
    examples: ['<label for="phone">الهاتف</label>', '<input type="tel" required />'],
    exercises: [
      {
        question_ar: 'كيف نربط وسم `<label>` بحقل إدخال `<input id="username">` بشكل قياسي؟',
        options: ['عبر الصفة for="username"', 'عبر الصفة class="username"', 'عبر الصفة href="username"'],
        correct_answer: '1',
        explanation_ar: 'مطابقة `for` في `<label>` مع `id` في `<input>` تفعّل التركيز عند النقر وتساعد قارئات الشاشة.',
        hint_ar: 'تربط Label بمعرّف الحقل.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-html-advanced',
    slug: 'html-adv-01-aria-a11y',
    order: 1,
    difficulty: 'advanced',
    title: 'إمكانية الوصول المتقدمة (ARIA) والبيانات الدلالية',
    explanation:
      'نستخدم سمات ARIA مثل `aria-expanded` و`aria-live="polite"` فقط عند بناء مكونات ديناميكية لا تكفيها الوسوم القياسية، مع تفضيل العناصر الأصلية مثل `<button>` و`<dialog>`.',
    codeLang: 'html',
    code: `<button type="button" aria-expanded="false" aria-controls="menu-panel">القائمة</button>\n<div id="status-banner" role="status" aria-live="polite">تم حفظ التقدم بنجاح.</div>`,
    expectedOutput: 'زر يعلن حالته (مفتوح/مغلق) لقارئات الشاشة، وشريط حالة يقرأ التحديثات فوراً بدون إزعاج.',
    commonMistakes: [
      'استخدام `<div onclick="...">` بدل `<button type="button">` مما يعطل التنقل بلوحة المفاتيح.',
      'إضافة سمات `aria-*` متعارضة مع الدور الأصلي للعنصر.',
    ],
    practiceTask: 'صمّم تنبيه خطأ يستخدم `role="alert"` وزر إغلاق بصفة `aria-label`.',
    examples: ['aria-live="polite"', 'aria-label="إغلاق النافذة"'],
    exercises: [
      {
        question_ar: 'ما القاعدة الذهبية الأولى عند استخدام WAI-ARIA؟',
        options: [
          'استخدم عنصر HTML الأصلي مثل <button> متى توفر قبل اللجوء إلى ARIA',
          'استبدل كل الوسوم بـ <div> مع role',
          'أضف role على كل فقرة نصية',
        ],
        correct_answer: '1',
        explanation_ar: 'عناصر HTML الأصلية تمنح دعم لوحة المفاتيح والقراءة تلقائياً بشكل أضمن.',
        hint_ar: 'الأصلي أفضل من المصطنع.',
      },
    ],
  }),

  // ==================== CSS INTERMEDIATE & ADVANCED ====================
  buildLesson({
    courseSlug: 'prog-css-intermediate',
    slug: 'css-int-01-variables-responsive',
    order: 1,
    difficulty: 'intermediate',
    title: 'المتغيرات المخصصة (Custom Properties) والتصميم المتجاوب',
    explanation:
      'تُعرّف متغيرات CSS داخل `:root` بصيغة `--color-accent` وتُستدعى بـ `var(--color-accent)`، وتُدمج مع `@media` لتكييف الشبكة مع شاشات الجوال والحاسوب.',
    codeLang: 'css',
    code: `:root {\n  --bg-midnight: #0b0f19;\n  --accent-violet: #8b5cf6;\n}\n.card {\n  background: var(--bg-midnight);\n  border: 1px solid var(--accent-violet);\n}\n@media (max-width: 768px) {\n  .grid { grid-template-columns: 1fr; }\n}`,
    expectedOutput: 'بطاقة بهوية لونية موحدة تتحول شبكتها تلقائياً إلى عمود واحد على الشاشات الأصغر من 768px.',
    commonMistakes: [
      'تكرار الأكواد اللونية في 20 موضعاً بدل استخدام متغير واحد في `:root`.',
      'نسيان اختبار التخطيط على عرض 375px للهواتف.',
    ],
    practiceTask: 'عرّف متغيرين للألوان في `:root` وأنشئ استعلام وسائط يقلّص الحشوة على الهاتف.',
    examples: ['color: var(--accent-cyan, #22d3ee);', '@media (prefers-reduced-motion: reduce)'],
    exercises: [
      {
        question_ar: 'كيف تُقرأ قيمة المتغير `--accent-violet` داخل قاعدة CSS؟',
        options: ['var(--accent-violet)', '$accent-violet', '@accent-violet'],
        correct_answer: '1',
        explanation_ar: 'الدالة القياسية `var(--name)` تسترجع قيمة المتغير مع إمكانية تمرير قيمة بديلة.',
        hint_ar: 'اختصار لكلمة variable.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-css-advanced',
    slug: 'css-adv-01-container-motion',
    order: 1,
    difficulty: 'advanced',
    title: 'استعلامات الحاوية (@container) وحركات الأداء العالي',
    explanation:
      'يتيح `@container` استجابة المكوّن لحجم الحاوية الأب لا لحجم الشاشة فقط، بينما يضمن تحريك `transform` و`opacity` أداءً سلساً دون إعادة حساب التخطيط (Reflow).',
    codeLang: 'css',
    code: `.widget-shell { container-type: inline-size; }\n@container (min-width: 420px) {\n  .widget-card { display: flex; gap: 1rem; }\n}\n@media (prefers-reduced-motion: reduce) {\n  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }\n}`,
    expectedOutput: 'مكوّن يتبدل تخطيطه بناءً على اتساع الحاوية المحيطة ويحترم تفضيل تقليل الحركة.',
    commonMistakes: [
      'تحريك خصائص مثل `width` أو `top` بكثافة بدل `transform` مما يسبب تقطعاً بصرياً.',
      'تجاهل `@media (prefers-reduced-motion: reduce)` للمستخدمين ذوي الحساسية للحركة.',
    ],
    practiceTask: 'أنشئ تأثير تمرير ناعم على بطاقة باستخدام `transform: translateY(-2px)` فقط.',
    examples: ['container-type: inline-size;', 'transition: transform 180ms ease;'],
    exercises: [
      {
        question_ar: 'أي خصائص CSS تمنح أفضل أداء للتحريك السلس دون إعادة تخطيط الصفحة؟',
        options: ['transform و opacity', 'width و margin-left', 'border-width و height'],
        correct_answer: '1',
        explanation_ar: 'خصائص `transform` و `opacity` تُعالج في طبقة التركيب (Compositor) دون إعادة حساب هندسة الصفحة.',
        hint_ar: 'تعمل على وحدة الرسوميات بدون Reflow.',
      },
    ],
  }),

  // ==================== JAVASCRIPT ADVANCED ====================
  buildLesson({
    courseSlug: 'prog-js-advanced',
    slug: 'js-adv-01-closures-event-loop',
    order: 1,
    difficulty: 'advanced',
    title: 'الإغلاقات (Closures) وحلقة الأحداث (Event Loop)',
    explanation:
      'الإغلاق Closure يحدث عندما تحتفظ الدالة الداخلية بالوصول إلى متغيرات نطاقها الخارجي حتى بعد انتهاء تنفيذ الدالة الخارجية. كما تنفّذ حلقة الأحداث المهام الدقيقة (Microtasks مثل Promises) قبل المؤقتات (setTimeout).',
    codeLang: 'javascript',
    code: `function createCounter(start = 0) {\n  let count = start;\n  return {\n    next() {\n      count += 1;\n      return count;\n    },\n  };\n}\n\nconst counter = createCounter(10);\nconsole.log(counter.next(), counter.next());`,
    expectedOutput: '11 12',
    commonMistakes: [
      'توقع تنفيذ `setTimeout(fn, 0)` قبل `Promise.resolve().then(...)` بينما الأولوية لـ Microtasks.',
      'الاحتفاظ بمراجع كبيرة غير لازمة داخل Closure مما يؤخر تحرير الذاكرة.',
    ],
    practiceTask: 'اكتب دالة `createRateGuard(limit)` باستخدام Closure تحسب عدد الاستدعاءات المتبقية.',
    examples: ['Promise.resolve().then(() => console.log("microtask"));'],
    exercises: [
      {
        question_ar: 'في JavaScript، أيهما يُنفّذ أولاً بعد انتهاء المكدس الحالي: Promise.then أم setTimeout(fn, 0)؟',
        options: ['Promise.then (طابور Microtasks)', 'setTimeout(fn, 0) دائماً', 'يُنفّذان عشوائياً'],
        correct_answer: '1',
        explanation_ar: 'تُفرّغ حلقة الأحداث طابور المهام الدقيقة (Microtasks) بالكامل قبل الانتقال إلى المهمة الكبرى التالية.',
        hint_ar: 'الوعود لها أولوية أعلى من المؤقتات.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-js-advanced',
    slug: 'js-adv-02-patterns-project',
    order: 2,
    lessonType: 'project',
    difficulty: 'advanced',
    title: 'مشروع متقدم: محرّك قياس التعلّم التفاعلي (Immutable State)',
    explanation:
      'في هذا المشروع نصمم دالة نقية Pure Function تحسب تقدّم المتعلم بدون تعديل البيانات الأصلية (Immutability)، مما يسهل اختبارها في Node.js.',
    codeLang: 'javascript',
    code: `export function evaluateTrack(records = []) {\n  const completed = records.filter((r) => r.completed);\n  const avgScore = completed.length\n    ? Math.round(completed.reduce((sum, r) => sum + r.score, 0) / completed.length)\n    : 0;\n  return { completedCount: completed.length, avgScore };\n}\n\nconsole.log(evaluateTrack([{ completed: true, score: 90 }, { completed: false, score: 40 }]));`,
    expectedOutput: '{ completedCount: 1, avgScore: 90 }',
    commonMistakes: [
      'استخدام `Array.prototype.sort` مباشرة على المصفوفة الأصلية دون نسخها أولاً.',
      'القسمة على صفر عند خلو قائمة الدروس المكتملة.',
    ],
    practiceTask: 'أضف للمشروع حساب أعلى درجة باستخدام `Math.max` مع حماية حالة القائمة الفارغة.',
    examples: ['const copy = [...items].sort((a, b) => a - b);'],
    exercises: [
      {
        question_ar: 'ما الميزة الأساسية للدوال النقية (Pure Functions) في المشاريع الكبيرة؟',
        options: [
          'نفس المدخلات تعطي دائماً نفس المخرجات دون آثار جانبية مما يسهل الاختبار',
          'تتصل بقاعدة البيانات تلقائياً',
          'تتجاوز معالجة الأخطاء',
        ],
        correct_answer: '1',
        explanation_ar: 'الدالة النقية لا تعدّل حالة خارجية ويمكن اختبارها بأمان وسرعة.',
        hint_ar: 'تعتمد على مدخلاتها فقط.',
      },
    ],
  }),

  // ==================== NODE.JS BEGINNER & ADVANCED ====================
  buildLesson({
    courseSlug: 'prog-nodejs-beginner',
    slug: 'node-beg-01-runtime-env',
    order: 1,
    difficulty: 'beginner',
    title: 'مقدمة في Node.js، المسارات، ومتغيرات البيئة',
    explanation:
      'Node.js بيئة تشغيل لـ JavaScript على الخادم. نستورد وحدات النظام القياسية بالبادئة `node:` مثل `node:path`، ونقرأ الأسرار من `process.env` دون كتابتها داخل الكود أبداً.',
    codeLang: 'javascript',
    code: `import path from 'node:path';\n\nconst port = Number(process.env.PORT || 3000);\nconst dataFile = path.join('data', 'nexora.sqlite');\nconsole.log({ port, dataFile });`,
    expectedOutput: "{ port: 3000, dataFile: 'data/nexora.sqlite' }",
    commonMistakes: [
      'كتابة كلمات المرور أو مفاتيح API مباشرة داخل الملفات المصدرية.',
      'دمج المسارات يدوياً بالرمز `/` أو `\\` بدل `path.join()`.',
    ],
    practiceTask: 'اكتب سطراً يقرأ `BOT_NAME` من `process.env` بقيمة افتراضية `"NEXORA BOT"`.',
    examples: ["import path from 'node:path';", 'const name = process.env.BOT_NAME || "NEXORA BOT";'],
    exercises: [
      {
        question_ar: 'ما الطريقة الآمنة لحفظ وتمرير مفاتيح API في مشاريع Node.js؟',
        options: ['عبر متغيرات البيئة (process.env)', 'كتابتها نصاً داخل index.js', 'إرسالها في روابط GET'],
        correct_answer: '1',
        explanation_ar: 'متغيرات البيئة تفصل الأسرار عن الكود المصدري وتمنع تسربها في مستودع Git.',
        hint_ar: 'تقرأ من process.env.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-nodejs-beginner',
    slug: 'node-beg-02-fs-promises',
    order: 2,
    difficulty: 'beginner',
    title: 'التعامل غير المتزامن مع الملفات عبر node:fs/promises',
    explanation:
      'نستخدم `fs/promises` في Node.js لتجنب حظر حلقة الأحداث أثناء قراءة أو كتابة الملفات. وعند الكتابة المهمة نكتب لملف مؤقت ثم نستبدل عبر `fs.rename` لضمان سلامة البيانات.',
    codeLang: 'javascript',
    code: `import fs from 'node:fs/promises';\n\nasync function writeAtomicJson(targetPath, payload) {\n  const tmpPath = \`\${targetPath}.tmp\`;\n  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf8');\n  await fs.rename(tmpPath, targetPath);\n}`,
    expectedOutput: 'يُكتب الملف المؤقت أولاً ثم يُنقل ذرياً إلى المسار الهدف دون تلف الملف أثناء الانقطاع.',
    commonMistakes: [
      'استخدام `fs.readFileSync` داخل مسارات الطلبات المتزامنة مما يبطئ الخادم لجميع المستخدمين.',
      'عدم إنشاء المجلد الأب عبر `{ recursive: true }` قبل الكتابة.',
    ],
    practiceTask: 'أضف استدعاء `await fs.mkdir(path.dirname(targetPath), { recursive: true })` للدالة أعلاه.',
    examples: ["await fs.mkdir('data', { recursive: true });"],
    exercises: [
      {
        question_ar: 'لماذا نُفضّل `fs/promises` على الدوال المتزامنة `*Sync` داخل خادم ويب أو بوت؟',
        options: ['لأنها لا تحظر حلقة الأحداث عن بقية المستخدمين', 'لأنها لا تحتاج مساحة قرص', 'لأنها تحذف الملف تلقائياً'],
        correct_answer: '1',
        explanation_ar: 'الدوال غير المتزامنة تتيح للخادم معالجة رسائل أخرى أثناء انتظار القرص.',
        hint_ar: 'يتعلق بعدم تجميد Event Loop.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-nodejs-beginner',
    slug: 'node-beg-03-http-express',
    order: 3,
    difficulty: 'beginner',
    title: 'بناء نقاط نهاية Express والتحقق من المدخلات بـ Zod',
    explanation:
      'في خوادم Express نتحقق دائماً من صحة `req.body` باستخدام مخطط مثل Zod قبل لمس قاعدة البيانات، ونعيد رمز حالة HTTP مناسباً (`400` للخطأ و`200` للنجاح).',
    codeLang: 'javascript',
    code: `import { z } from 'zod';\n\nconst TopicSchema = z.object({ title: z.string().trim().min(2).max(120) });\nconst check = TopicSchema.safeParse({ title: '  Node.js  ' });\nconsole.log(check.success, check.data);`,
    expectedOutput: "true { title: 'Node.js' }",
    commonMistakes: [
      'تمرير `req.body` مباشرة إلى الاستعلامات دون تحقق من النوع أو الطول.',
      'إرجاع تفاصيل Stack Trace كاملة للمستخدم عند حدوث خطأ 500.',
    ],
    practiceTask: 'وسّع المخطط ليشمل حقلاً اختيارياً `level` بالقيم `beginner | intermediate | advanced`.',
    examples: ['if (!parsed.success) return res.status(400).json({ error: "Invalid input" });'],
    exercises: [
      {
        question_ar: 'ما رمز HTTP القياسي عند رفض طلب يحتوي على بيانات إدخال غير صالحة؟',
        options: ['400 Bad Request', '200 OK', '301 Moved Permanently'],
        correct_answer: '1',
        explanation_ar: 'الرمز 400 يشير إلى أن الطلب الوارد من العميل غير صالح أو ينقصه حقول مطلوبة.',
        hint_ar: 'ضمن سلسلة أخطاء العميل 4xx.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-nodejs-advanced',
    slug: 'node-adv-01-streams-workers',
    order: 1,
    difficulty: 'advanced',
    title: 'تدفق البيانات (Streams) والحد من المعدل (Rate Limiting)',
    explanation:
      'تسمح Streams بمعالجة البيانات الضخمة قطعة بقطعة بذاكرة محدودة، بينما تحمي خوارزميات Rate Limiting الخادم وواجهات API من الاستهلاك المفرط.',
    codeLang: 'javascript',
    code: `import { pipeline } from 'node:stream/promises';\nimport fs from 'node:fs';\nimport zlib from 'node:zlib';\n\nasync function compressFile(src, dest) {\n  await pipeline(fs.createReadStream(src), zlib.createGzip(), fs.createWriteStream(dest));\n}`,
    expectedOutput: 'يُضغط الملف إلى gzip مع استهلاك ذاكرة ثابت مهما كان حجم الملف الأصلي.',
    commonMistakes: [
      'ربط التدفقات بـ `.pipe()` بدون `pipeline()` مما يهمل معالجة الأخطاء وإغلاق التدفقات.',
      'تحميل ملفات بمساحة مئات الميجابايت عبر `fs.readFile` دفعة واحدة في الذاكرة.',
    ],
    practiceTask: 'تعلّم الفرق بين `AbortSignal.timeout(ms)` وترك الطلبات مفتوحة للأبد.',
    examples: ['signal: AbortSignal.timeout(10000)'],
    exercises: [
      {
        question_ar: 'ما ميزة استخدام `stream/promises` (`pipeline`) مقارنة بقراءة الملف بالكامل بـ `readFile`؟',
        options: [
          'استهلاك ذاكرة منخفض ومعالجة تلقائية لأخطاء التدفقات',
          'إزالة الحاجة إلى نظام الملفات',
          'تشفير كلمة المرور تلقائياً',
        ],
        correct_answer: '1',
        explanation_ar: '`pipeline` ينظّف جميع التدفقات عند الخطأ ولا يحمّل الملف كاملاً في الرام.',
        hint_ar: 'يتعلق بالذاكرة وإغلاق التدفقات.',
      },
    ],
  }),
  buildLesson({
    courseSlug: 'prog-nodejs-advanced',
    slug: 'node-adv-02-security-capstone',
    order: 2,
    lessonType: 'project',
    difficulty: 'advanced',
    title: 'مشروع تخرج Node.js: بوابة خدمة مصغّرة محمية من SSRF',
    explanation:
      'في هذا المشروع نجمع معمارية Node.js الحديثة: التحقق من المدخلات، رفض عناوين الشبكة الداخلية (SSRF Protection)، وضبط المهلة الزمنية للطلبات الخارجية.',
    codeLang: 'javascript',
    code: `export function isSafeHttpsUrl(rawUrl) {\n  try {\n    const u = new URL(rawUrl);\n    const host = u.hostname.toLowerCase();\n    if (u.protocol !== 'https:') return false;\n    if (host === 'localhost' || host.startsWith('127.') || host.startsWith('192.168.')) return false;\n    return true;\n  } catch {\n    return false;\n  }\n}\n\nconsole.log(isSafeHttpsUrl('https://nodejs.org'), isSafeHttpsUrl('http://127.0.0.1'));`,
    expectedOutput: 'true false',
    commonMistakes: [
      'السماح ببروتوكول `file://` أو `http://169.254.169.254` عند جلب روابط المستخدم.',
      'الاكتفاء بفحص السلسلة النصية بدل تحليلها بكائن `URL` القياسي.',
    ],
    practiceTask: 'أضف حظر نطاقات `10.*` و `::1` لاكتمال حارس SSRF في مشروعك.',
    examples: ["if (u.protocol !== 'https:') throw new Error('HTTPS only');"],
    exercises: [
      {
        question_ar: 'لماذا نحظر عناوين مثل `127.0.0.1` و `169.254.169.254` عند جلب روابط يدخلها المستخدم؟',
        options: [
          'لمنع هجمات تزوير الطلبات من طرف الخادم (SSRF)',
          'لزيادة حجم الاستجابة',
          'لتحويل JSON إلى XML',
        ],
        correct_answer: '1',
        explanation_ar: 'ثغرة SSRF تستغل الخادم للوصول إلى خدمات داخلية أو بيانات وصفية حساسة لا ينبغي كشفها.',
        hint_ar: 'Server-Side Request Forgery.',
      },
    ],
  }),
];
