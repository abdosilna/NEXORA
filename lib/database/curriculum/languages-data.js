// Complete authentic multi-unit language curriculum for English, Japanese, Russian, and Chinese.
// Each language contains:
// - Beginner level: 4 structured units x 5 lessons = 20+ real lessons per language (80+ total)
// - Intermediate & Advanced levels: substantive structured lessons

function buildLesson({
  courseSlug,
  slug,
  unit,
  order,
  type,
  title,
  vocab = [],
  grammar = '',
  examples = [],
  pronunciationGuide = '',
  pronunciationText = '',
  pronunciationLang = 'en',
  exercises = [],
}) {
  const parts = [`📂 *الوحدة:* ${unit}`];
  if (vocab.length) {
    parts.push(`🔤 *المفردات الأساسية:*\n${vocab.map((v) => `• ${v}`).join('\n')}`);
  }
  if (grammar) {
    parts.push(`📐 *الشرح والقواعد:*\n${grammar}`);
  }
  if (pronunciationGuide) {
    parts.push(`🗣️ *إرشادات النطق:*\n${pronunciationGuide}`);
  }

  return {
    courseSlug,
    slug,
    lesson_type: type,
    title_ar: `${unit} — ${title}`,
    content_ar: parts.join('\n\n'),
    examples,
    pronunciation_text: pronunciationText,
    pronunciation_lang: pronunciationLang,
    sort_order: order,
    exercises,
  };
}

function makeCourseLessons(courseSlug, lang, unitDefs) {
  const out = [];
  let order = 1;
  for (const unit of unitDefs) {
    for (const item of unit.lessons) {
      out.push(
        buildLesson({
          courseSlug,
          slug: item.slug,
          unit: unit.title,
          order: order++,
          type: item.type || 'lesson',
          title: item.title,
          vocab: item.vocab || [],
          grammar: item.grammar || '',
          examples: item.examples || [],
          pronunciationGuide: item.pronunciationGuide || '',
          pronunciationText: item.pronunciationText || '',
          pronunciationLang: lang,
          exercises: item.exercises || [],
        })
      );
    }
  }
  return out;
}

// ==================== 1. ENGLISH (20 Beginner + Intermediate + Advanced) ====================
const ENGLISH_BEGINNER_UNITS = [
  {
    title: 'الوحدة 1: الأساسيات والتحيات',
    lessons: [
      {
        slug: 'en-b-01-alphabet-sounds',
        type: 'pronunciation',
        title: 'الأبجدية والأصوات المتحركة القصيرة',
        vocab: ['Apple (/ˈæpəl/): تفاحة', 'Egg (/eɡ/): بيضة', 'Ink (/ɪŋk/): حبر', 'Orange (/ˈɒrɪndʒ/): برتقالة', 'Umbrella (/ʌmˈbrelə/): مظلة'],
        grammar: 'تتكوّن الإنجليزية من 26 حرفاً: 5 أحرف متحركة (a, e, i, o, u) و21 حرفاً ساكناً. الصوت القصير للحرف المتحرك يظهر غالباً عندما يقع بين ساكنين (CVC) مثل cat و pen و sit.',
        examples: ['A red apple is on the desk. — تفاحة حمراء على المكتب.', 'I have an orange umbrella. — لديّ مظلة برتقالية.'],
        pronunciationGuide: 'انتبه لعدم إشباع الحرف المتحرك القصير: /æ/ في cat أقرب إلى فتحة مفتوحة عريضة، بينما /e/ في pen أخف وأقصر.',
        pronunciationText: 'An apple, an egg, ink, an orange, and an umbrella.',
        exercises: [
          { question_ar: 'كم عدد الأحرف المتحركة الأساسية (Vowels) في الإنجليزية؟', options: ['5 أحرف (a, e, i, o, u)', '3 أحرف فقط', '7 أحرف'], correct_answer: '1', explanation_ar: 'الأحرف المتحركة الخمسة الأساسية هي a, e, i, o, u.', hint_ar: 'انظر إلى بداية الكلمات الخمس في الدرس.', difficulty: 'beginner' },
          { question_ar: 'ما معنى كلمة Umbrella؟', options: ['مكتب', 'مظلة', 'تفاحة'], correct_answer: '2', explanation_ar: 'Umbrella تعني مظلة.', hint_ar: 'تُستخدم عند المطر.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-02-greetings',
        type: 'vocabulary',
        title: 'التحيات والتعارف اليومي',
        vocab: ['Good morning: صباح الخير', 'Good evening: مساء الخير', 'How are you?: كيف حالك؟', 'Nice to meet you: سررت بلقائك', 'See you later: أراك لاحقاً'],
        grammar: 'نستخدم "Nice to meet you" عند اللقاء الأول فقط، بينما نستخدم "Good to see you" عند لقاء شخص نعرفه مسبقاً.',
        examples: ['Good morning! How are you today? — صباح الخير! كيف حالك اليوم؟', 'I am fine, thank you. Nice to meet you! — أنا بخير شكراً، سررت بلقائك!'],
        pronunciationGuide: 'في عبارة "Nice to meet you" يُنطق حرف t في meet موصولاً بـ you بسلاسة: /miːtʃuː/ في الكلام السريع أو بوضوح /miːt juː/.',
        pronunciationText: 'Good morning! How are you? Nice to meet you.',
        exercises: [
          { question_ar: 'أي عبارة تُقال عند التعرف على شخص لأول مرة؟', options: ['Nice to meet you', 'See you yesterday', 'Good night'], correct_answer: '1', explanation_ar: 'Nice to meet you هي عبارة الترحيب الرسمية والودية عند اللقاء الأول.', hint_ar: 'تعني سررت بلقائك.', difficulty: 'beginner' },
          { question_ar: 'كيف ترد بأدب على سؤال How are you?', options: ['I am fine, thank you', 'See you later', 'My name is pen'], correct_answer: '1', explanation_ar: 'الرد المعتاد هو I am fine, thank you.', hint_ar: 'تبدأ بـ I am fine.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-03-pronouns-tobe',
        type: 'grammar',
        title: 'ضمائر الفاعل وفعل الكينونة (am / is / are)',
        vocab: ['I: أنا', 'You: أنت / أنتم', 'He: هو', 'She: هي', 'They: هم', 'We: نحن'],
        grammar: 'فعل الكينونة (Verb to be) في المضارع:\n• I -> am (I am a student)\n• He / She / It -> is (She is a doctor)\n• You / We / They -> are (They are ready)',
        examples: ['I am an engineer. — أنا مهندس.', 'She is very smart. — هي ذكية جداً.', 'We are in the classroom. — نحن في الصف.'],
        pronunciationGuide: 'الاختصارات شائعة جداً في النطق: I\'m (/aɪm/)، He\'s (/hiːz/)، They\'re (/ðeər/).',
        pronunciationText: 'I am a learner. She is my teacher. We are ready.',
        exercises: [
          { question_ar: 'اختر الفعل الصحيح: "They ___ good friends."', options: ['is', 'am', 'are'], correct_answer: '3', explanation_ar: 'الضمير They يأخذ دائماً الفعل are في المضارع.', hint_ar: 'ضمير جمع.', difficulty: 'beginner' },
          { question_ar: 'ما الجملة الصحيحة؟', options: ['He is a student', 'He are a student', 'He am a student'], correct_answer: '1', explanation_ar: 'He يأخذ is.', hint_ar: 'ضمير مفرد غائب.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-04-numbers-days',
        type: 'vocabulary',
        title: 'الأرقام (1-20) وأيام الأسبوع',
        vocab: ['One to Ten: واحد إلى عشرة', 'Eleven / Twelve: أحد عشر / اثنا عشر', 'Monday: الإثنين', 'Wednesday: الأربعاء', 'Friday: الجمعة'],
        grammar: 'تسبق أيام الأسبوع دائماً حرف الجر **on** (وليس in): نقول "on Monday" و"on Friday". وتُكتب أيام الأسبوع دائماً بحرف كبير (Capital letter).',
        examples: ['Our English class is on Monday and Wednesday. — حصتنا الإنجليزية يوم الإثنين والأربعاء.', 'I read twelve pages every day. — أقرأ اثنتي عشرة صفحة يومياً.'],
        pronunciationGuide: 'حرف d في Wednesday صامت تماماً وتُنطق الكلمة: /ˈwenzdeɪ/ (وينزداي).',
        pronunciationText: 'We meet on Monday, Wednesday, and Friday at ten.',
        exercises: [
          { question_ar: 'أي حرف جر يُستخدم مع أيام الأسبوع؟', options: ['on', 'at', 'under'], correct_answer: '1', explanation_ar: 'نستخدم on قبل أيام الأسبوع مثل on Friday.', hint_ar: 'حرف جر من حرفين يبدأ بـ o.', difficulty: 'beginner' },
          { question_ar: 'كيف تُنطق كلمة Wednesday؟', options: ['بحذف صوت حرف d الأوسط (وينزداي)', 'بنطق d بقوة مرتين', 'مثل Sunday'], correct_answer: '1', explanation_ar: 'الحرف d الأول في Wednesday لا يُنطق.', hint_ar: 'صامت (Silent letter).', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-05-articles-a-an-the',
        type: 'grammar',
        title: 'أدوات النكرة والمعرفة (a / an / the)',
        vocab: ['Book: كتاب', 'Hour: ساعة زمنية', 'University: جامعة', 'Sun: الشمس'],
        grammar: '• **a**: قبل الاسم المفرد النكرة الذي يبدأ بصوت ساكن (a book, a university لأن u هنا يُنطق /j/).\n• **an**: قبل الاسم المفرد النكرة الذي يبدأ بصوت متحرك (an apple, an hour لأن h صامتة).\n• **the**: للتعريف المحدد أو الفريد (the sun, the book on the table).',
        examples: ['It takes an hour to finish. — يستغرق الأمر ساعة للانتهاء.', 'The sun rises in the east. — تشرق الشمس من الشرق.'],
        pronunciationGuide: 'أداة التعريف the تُنطق /ðə/ قبل الساكن و/ðiː/ قبل الصوت المتحرك مثل the apple.',
        pronunciationText: 'An apple, a book, an hour, and the sun.',
        exercises: [
          { question_ar: 'اختر الأداة الصحيحة: "Please wait ___ hour."', options: ['a', 'an', 'the'], correct_answer: '2', explanation_ar: 'كلمة hour تبدأ بصوت متحرك لأن h صامتة، لذا نستخدم an.', hint_ar: 'استمع لأول صوت يُنطق في hour.', difficulty: 'beginner' },
          { question_ar: 'لماذا نقول "a university" وليس "an university"؟', options: ['لأن الكلمة تبدأ بصوت ساكن /j/', 'لأنها جمع', 'لأنها معرفة'], correct_answer: '1', explanation_ar: 'الاعتماد على الصوت المنطوق لا شكل الحرف، وكلمة university تبدأ بصوت "يو".', hint_ar: 'فكّر في الصوت الأول.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 2: العائلة والأشياء اليومية',
    lessons: [
      {
        slug: 'en-b-06-family-members',
        type: 'vocabulary',
        title: 'أفراد العائلة والملكية (my / your / his)',
        vocab: ['Father / Mother: أب / أم', 'Brother / Sister: أخ / أخت', 'Parents: الوالدان', 'My / His / Her: لي / له / لها'],
        grammar: 'صفات الملكية تأتي قبل الاسم المملوك ولا تتغير بالجمع:\n• my brother / my brothers\n• her sister / his book',
        examples: ['My parents live in Riyadh. — والداي يعيشان في الرياض.', 'Her brother is a programmer. — أخوها مبرمج.'],
        pronunciationGuide: 'صوت th في father و mother و brother يُنطق بذال عربية واضحة /ð/.',
        pronunciationText: 'My father, my mother, and my sister live together.',
        exercises: [
          { question_ar: 'ما معنى كلمة Parents؟', options: ['الأصدقاء', 'الوالدان', 'الجيران'], correct_answer: '2', explanation_ar: 'Parents تعني الأب والأم معاً (الوالدان).', hint_ar: 'تشمل الأب والأم.', difficulty: 'beginner' },
          { question_ar: 'أكمل: "Sara loves ___ family."', options: ['his', 'her', 'we'], correct_answer: '2', explanation_ar: 'للمفرد المؤنث الغائب نستخدم صفة الملكية her.', hint_ar: 'سارة مؤنث.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-07-singular-plural',
        type: 'grammar',
        title: 'المفرد والجمع المنتظم والشاذ',
        vocab: ['Box -> Boxes: صندوق / صناديق', 'City -> Cities: مدينة / مدن', 'Child -> Children: طفل / أطفال', 'Person -> People: شخص / أشخاص'],
        grammar: '1. القاعدة العامة: نضيف s (book -> books).\n2. بعد s, sh, ch, x نضيف es (box -> boxes).\n3. حرف ساكن + y يتحول إلى ies (city -> cities).\n4. جموع شاذة: child -> children, man -> men, woman -> women.',
        examples: ['Three children are playing in the park. — ثلاثة أطفال يلعبون في الحديقة.', 'Many cities have large libraries. — كثير من المدن فيها مكتبات كبيرة.'],
        pronunciationGuide: 'الجمع بـ es يُنطق مقطعاً إضافياً /ɪz/: boxes (/ˈbɒksɪz/).',
        pronunciationText: 'One box, two boxes. One child, three children.',
        exercises: [
          { question_ar: 'ما الجمع الصحيح لكلمة Child؟', options: ['Childs', 'Children', 'Childes'], correct_answer: '2', explanation_ar: 'Child من الأسماء الشاذة وجمعها children.', hint_ar: 'لا تأخذ s.', difficulty: 'beginner' },
          { question_ar: 'ما الجمع الصحيح لكلمة City؟', options: ['Citys', 'Cities', 'Cites'], correct_answer: '2', explanation_ar: 'لأن y مسبوقة بحرف ساكن t نحولها إلى ies.', hint_ar: 'قاعدة y بعد ساكن.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-08-this-that-these',
        type: 'grammar',
        title: 'أسماء الإشارة (This / That / These / Those)',
        vocab: ['This: هذا/هذه (قريب مفرد)', 'That: ذلك/تلك (بعيد مفرد)', 'These: هؤلاء/هذه (قريب جمع)', 'Those: أولئك/تلك (بعيد جمع)'],
        grammar: 'للقريب نستخدم this (مفرد) و these (جمع). للبعيد نستخدم that (مفرد) و those (جمع).',
        examples: ['This pen is blue, and that bag is black. — هذا القلم أزرق، وتلك الحقيبة سوداء.', 'These lessons are easy. — هذه الدروس سهلة.'],
        pronunciationGuide: 'فرّق بين قصر this (/ðɪs/) وطول these (/ðiːz/) مع صوت الزاي في آخر these.',
        pronunciationText: 'This is my notebook, and those are your books.',
        exercises: [
          { question_ar: 'اختر الكلمة المناسبة للجمع القريب: "___ apples are fresh."', options: ['This', 'These', 'That'], correct_answer: '2', explanation_ar: 'These تُستخدم للجمع القريب.', hint_ar: 'أبيلز جمع.', difficulty: 'beginner' },
          { question_ar: 'متى نستخدم That؟', options: ['للمفرد البعيد', 'للجمع القريب', 'للجمع البعيد'], correct_answer: '1', explanation_ar: 'That للمفرد البعيد.', hint_ar: 'عكس This.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-09-colors-adjectives',
        type: 'vocabulary',
        title: 'الألوان والصفات الأساسية',
        vocab: ['Big / Small: كبير / صغير', 'Fast / Slow: سريع / بطيء', 'New / Old: جديد / قديم', 'Blue / Green / White: أزرق / أخضر / أبيض'],
        grammar: 'في الإنجليزية تأتي الصفة **قبل** الاسم الموصوف ولا تُجمع أبداً:\n• a new car (وليس a car new)\n• two green trees (وليس greens)',
        examples: ['I bought a new laptop yesterday. — اشتريت حاسوباً محمولاً جديداً أمس.', 'He lives in a small white house. — يعيش في بيت أبيض صغير.'],
        pronunciationGuide: 'في "white house" يبدأ white بصوت /w/ دون نطق h.',
        pronunciationText: 'A fast green train and a small white house.',
        exercises: [
          { question_ar: 'أي ترتيب هو الصحيح في الإنجليزية؟', options: ['a big house', 'a house big', 'a bigs houses'], correct_answer: '1', explanation_ar: 'الصفة تسبق الاسم الموصوف في الإنجليزية.', hint_ar: 'الصفة أولاً.', difficulty: 'beginner' },
          { question_ar: 'ما عكس كلمة Fast؟', options: ['New', 'Slow', 'Blue'], correct_answer: '2', explanation_ar: 'Fast (سريع) عكسها Slow (بطيء).', hint_ar: 'تعني بطيء.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-10-there-is-are',
        type: 'grammar',
        title: 'التعبير عن الوجود (There is / There are)',
        vocab: ['There is: يوجد (للمفرد)', 'There are: يوجد (للجمع)', 'Kitchen: مطبخ', 'Window: نافذة', 'Chair: كرسي'],
        grammar: 'نستخدم "There is" مع الاسم المفرد أو غير المعدود، و"There are" مع الجمع. في السؤال نقلبها إلى "Is there...?" و"Are there...?".',
        examples: ['There is a computer on the desk. — يوجد حاسوب على المكتب.', 'There are four chairs in the room. — توجد أربعة كراسٍ في الغرفة.'],
        pronunciationGuide: 'تختصر There is إلى There\'s (/ðeərz/).',
        pronunciationText: 'There is a book on the table, and there are two chairs.',
        exercises: [
          { question_ar: 'أكمل: "___ five students in the library."', options: ['There is', 'There are', 'There am'], correct_answer: '2', explanation_ar: 'students جمع لذا نستخدم There are.', hint_ar: 'خمسة طلاب جمع.', difficulty: 'beginner' },
          { question_ar: 'كيف تسأل: هل يوجد كتاب هنا؟', options: ['Is there a book here?', 'Are there a book here?', 'There is a book here?'], correct_answer: '1', explanation_ar: 'في السؤال نقدم Is قبل there.', hint_ar: 'تبدأ بـ Is.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 3: الروتين اليومي والأزمنة الأساسية',
    lessons: [
      {
        slug: 'en-b-11-present-simple',
        type: 'grammar',
        title: 'المضارع البسيط (Present Simple) للعادات',
        vocab: ['Wake up: يستيقظ', 'Work: يعمل', 'Study: يدرس', 'Every day: كل يوم', 'Usually: عادةً'],
        grammar: 'نستخدم المضارع البسيط للعادات والحقائق:\n• مع I / You / We / They: الفعل مجرد (I study every day).\n• مع He / She / It: نضيف s للفعل (She studies, He works).',
        examples: ['I wake up at six every morning. — أستيقظ الساعة السادسة كل صباح.', 'He reads twenty minutes before sleep. — يقرأ عشرين دقيقة قبل النوم.'],
        pronunciationGuide: 'تُضاف -s في نهاية الفعل بصوت /s/ أو /z/ حسب الحرف السابق: works (/s/), reads (/z/).',
        pronunciationText: 'I study English every day. He works in an office.',
        exercises: [
          { question_ar: 'اختر الفعل الصحيح: "She ___ Arabic and English."', options: ['speak', 'speaks', 'speaking'], correct_answer: '2', explanation_ar: 'مع الفاعل المفرد الغائب She نضيف s للفعل.', hint_ar: 'مضارع بسيط مع She.', difficulty: 'beginner' },
          { question_ar: 'متى نستخدم المضارع البسيط؟', options: ['للعادات والحقائق الثابتة', 'لأحداث انتهت العام الماضي', 'للمستقبل البعيد فقط'], correct_answer: '1', explanation_ar: 'المضارع البسيط يعبر عن الروتين اليومي والحقائق العامة.', hint_ar: 'كلمة every day تدل عليه.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-12-negation-questions',
        type: 'grammar',
        title: 'النفي والسؤال في المضارع (Do / Does)',
        vocab: ['Do not (Don\'t): لا (للمتكلم والجمع)', 'Does not (Doesn\'t): لا (للمفرد الغائب)', 'Always: دائماً', 'Never: أبداً'],
        grammar: 'في النفي والسؤال نستخدم الفعل المساعد do / does ويعود الفعل الأصلي إلى صورته المجردة بدون s:\n• She does not (doesn\'t) like coffee.\n• Does he play football?',
        examples: ['Do you understand the lesson? — هل تفهم الدرس؟', 'He doesn\'t waste his time. — هو لا يضيع وقته.'],
        pronunciationGuide: 'لا تنسَ حذف s من الفعل الرئيسي عند وجود does أو doesn\'t.',
        pronunciationText: 'Do you study daily? Yes, I do. She does not stop learning.',
        exercises: [
          { question_ar: 'اختر الجملة الصحيحة:', options: ['Does she live here?', 'Does she lives here?', 'Do she live here?'], correct_answer: '1', explanation_ar: 'بعد Does يعود الفعل إلى صورته الأساسية live بدون s.', hint_ar: 'احذر تكرار s.', difficulty: 'beginner' },
          { question_ar: 'ما أداة النفي الصحيحة مع They؟', options: ['doesn\'t', 'don\'t', 'isn\'t like'], correct_answer: '2', explanation_ar: 'They تأخذ do not / don\'t.', hint_ar: 'فاعل جمع.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-13-telling-time',
        type: 'vocabulary',
        title: 'الوقت والساعات وحروف الجر (at / in / on)',
        vocab: ['O\'clock: تماماً', 'Half past: ونصف', 'Quarter past: وربع', 'Morning / Afternoon: صباحاً / ظهراً', 'Midnight: منتصف الليل'],
        grammar: '• **at**: للساعات الدقيقة (at 7:00, at noon)\n• **on**: للأيام والتواريخ (on Sunday)\n• **in**: للأشهر والفترات والسنوات (in the morning, in June, in 2026)',
        examples: ['The meeting starts at half past nine. — يبدأ الاجتماع الساعة التاسعة والنصف.', 'I study best in the morning. — أدرس أفضل في الصباح.'],
        pronunciationGuide: 'كلمة half تُنطق /hɑːf/ بحذف حرف l.',
        pronunciationText: 'The class starts at nine thirty in the morning.',
        exercises: [
          { question_ar: 'اختر حرف الجر الصحيح: "The train arrives ___ 6 o\'clock."', options: ['in', 'on', 'at'], correct_answer: '3', explanation_ar: 'الساعات المحددة تأخذ دائماً حرف الجر at.', hint_ar: 'وقت محدد بالساعة.', difficulty: 'beginner' },
          { question_ar: 'ماذا تعني "Half past eight"؟', options: ['الثامنة والربع', 'الثامنة والنصف', 'الثامنة إلا ربع'], correct_answer: '2', explanation_ar: 'Half تعني نصف ساعة بعد الثامنة.', hint_ar: 'half = نصف.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-14-present-continuous',
        type: 'grammar',
        title: 'المضارع المستمر (am/is/are + verb-ing)',
        vocab: ['Now: الآن', 'Right now: في هذه اللحظة', 'Reading: يقرأ الآن', 'Writing: يكتب الآن', 'Listening: يستمع الآن'],
        grammar: 'يعبّر المضارع المستمر عن حدث يقع الآن أثناء الكلام: الفاعل + am/is/are + الفعل+ing.',
        examples: ['I am reading an Arabic-English guide right now. — أقرأ دليلاً عربياً إنجليزياً الآن.', 'They are practicing pronunciation together. — هم يتدربون على النطق معاً.'],
        pronunciationGuide: 'اللاحقة -ing تُنطق بغنة أنفية خفيفة /ɪŋ/ دون نطق حرف g بقوة في النهاية.',
        pronunciationText: 'I am learning English right now, and my friend is writing notes.',
        exercises: [
          { question_ar: 'اختر الصيغة الصحيحة: "Look! It ___ outside."', options: ['rains', 'is raining', 'rain'], correct_answer: '2', explanation_ar: 'كلمة Look! تدل على حدث يقع في اللحظة الحالية فنستخدم المضارع المستمر.', hint_ar: 'انظر! الآن.', difficulty: 'beginner' },
          { question_ar: 'ما الصيغة الناقصة في: "We ___ watching an educational video."', options: ['am', 'is', 'are'], correct_answer: '3', explanation_ar: 'الضمير We يأخذ are.', hint_ar: 'فاعل جمع.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-15-past-simple-regular',
        type: 'grammar',
        title: 'الماضي البسيط المنتظم والشائع (Past Simple)',
        vocab: ['Yesterday: أمس', 'Last week: الأسبوع الماضي', 'Finished: أنهى', 'Learned: تعلّم', 'Went: ذهب (شاذ)', 'Saw: رأى (شاذ)'],
        grammar: 'للتحدث عن حدث انتهى في الماضي:\n• الأفعال المنتظمة تأخذ -ed (work -> worked, finish -> finished).\n• أفعال شاذة شائعة: go -> went, see -> saw, have -> had.\n• في النفي نستخدم didn\'t + الفعل مجرداً.',
        examples: ['Yesterday I learned ten new words. — أمس تعلّمت عشر كلمات جديدة.', 'We went to the library last week. — ذهبنا إلى المكتبة الأسبوع الماضي.'],
        pronunciationGuide: 'نهاية -ed تُنطق /t/ بعد الأصوات المهموسة مثل worked (/wɜːrkt/)، و/ɪd/ بعد t و d مثل started.',
        pronunciationText: 'Yesterday I studied two lessons and went to the library.',
        exercises: [
          { question_ar: 'ما الماضي من الفعل go؟', options: ['goed', 'went', 'goes'], correct_answer: '2', explanation_ar: 'go فعل شاذ ماضيه went.', hint_ar: 'يبدأ بـ w.', difficulty: 'beginner' },
          { question_ar: 'اختر الجملة المنفية الصحيحة:', options: ['I didn\'t went home', 'I didn\'t go home', 'I not went home'], correct_answer: '2', explanation_ar: 'بعد didn\'t يعود الفعل للمصدر المجرد go.', hint_ar: 'didn\'t يلغي تصريف الماضي.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 4: مواقف الحياة الواقعية والتواصل',
    lessons: [
      {
        slug: 'en-b-16-food-ordering',
        type: 'vocabulary',
        title: 'في المطعم والطلب المهذب (Would like)',
        vocab: ['Menu: قائمة الطعام', 'Water: ماء', 'Bill / Check: الفاتورة', 'I would like...: أودّ...', 'Could I have...?: هل يمكنني الحصول على...؟'],
        grammar: 'استخدام "I would like..." أو "Can I have..., please?" أكثر تهذيباً بكثير من "Give me..." في المطاعم والمتاجر.',
        examples: ['I would like a cup of tea, please. — أودّ كوباً من الشاي من فضلك.', 'Could we have the bill, please? — هل يمكننا الحصول على الفاتورة؟'],
        pronunciationGuide: 'حرف l في would و could صامت ولا يُنطق: /wʊd/, /kʊd/.',
        pronunciationText: 'I would like a glass of water and the menu, please.',
        exercises: [
          { question_ar: 'أي عبارة هي الأكثر تهذيباً عند الطلب في مطعم؟', options: ['Give me water now', 'I would like some water, please', 'Water for me'], correct_answer: '2', explanation_ar: 'I would like..., please هي الصيغة القياسية المهذبة للطلب.', hint_ar: 'تبدأ بـ I would like.', difficulty: 'beginner' },
          { question_ar: 'ما معنى كلمة Menu؟', options: ['الفاتورة', 'قائمة الطعام', 'الطاولة'], correct_answer: '2', explanation_ar: 'Menu تعني قائمة الطعام.', hint_ar: 'تقرؤها لاختيار الوجبة.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-17-directions-places',
        type: 'vocabulary',
        title: 'الأماكن والسؤال عن الاتجاهات',
        vocab: ['Turn left: انعطف يساراً', 'Turn right: انعطف يميناً', 'Go straight: سر للأمام مباشرة', 'Next to: بجانب', 'Opposite: مقابل / أمام'],
        grammar: 'عند إعطاء الاتجاهات نستخدم فعل الأمر المباشر بدون فاعل: "Go straight, then turn right.".',
        examples: ['Excuse me, where is the train station? — عذراً، أين محطة القطار؟', 'Go straight and turn left next to the bank. — سر مباشرة ثم انعطف يساراً بجانب البنك.'],
        pronunciationGuide: 'كلمة straight تحتوي على gh صامتة وتُنطق: /streɪt/.',
        pronunciationText: 'Go straight ahead, then turn left next to the school.',
        exercises: [
          { question_ar: 'ماذا تعني عبارة "Go straight"؟', options: ['ارجع للخلف', 'سر للأمام مباشرة', 'انعطف يميناً'], correct_answer: '2', explanation_ar: 'Go straight تعني استمر في السير للأمام بخط مستقيم.', hint_ar: 'straight = مستقيم.', difficulty: 'beginner' },
          { question_ar: 'ما معنى "Next to"؟', options: ['خلف', 'بجانب', 'تحت'], correct_answer: '2', explanation_ar: 'Next to تعني بجوار أو بجانب.', hint_ar: 'قريب جداً من الجانب.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-18-shopping-prices',
        type: 'vocabulary',
        title: 'التسوق والسؤال عن السعر والكمية',
        vocab: ['How much is this?: كم سعر هذا؟', 'Expensive: غالٍ', 'Cheap: رخيص', 'Discount: خصم', 'Size: مقاس'],
        grammar: '• للسؤال عن السعر أو الأسماء غير المعدودة نستخدم **How much**.\n• للسؤال عن عدد الأشياء المعدودة نستخدم **How many** (How many books?).',
        examples: ['How much does this jacket cost? — كم يكلف هذا المعطف؟', 'Do you have this shirt in a medium size? — هل لديكم هذا القميص بمقاس متوسط؟'],
        pronunciationGuide: 'كلمة cost تنتهي بتاء واضحة /kɒst/.',
        pronunciationText: 'How much is this notebook? Is there a student discount?',
        exercises: [
          { question_ar: 'أي سؤال صحيح للاستفسار عن سعر منتج؟', options: ['How many is this?', 'How much is this?', 'How tall is this?'], correct_answer: '2', explanation_ar: 'نستخدم How much للسؤال عن السعر.', hint_ar: 'السعر غير معدود.', difficulty: 'beginner' },
          { question_ar: 'ما عكس كلمة Expensive؟', options: ['Cheap', 'Size', 'Discount'], correct_answer: '1', explanation_ar: 'Expensive (غالٍ) عكسها Cheap (رخيص).', hint_ar: 'تعني رخيص الثمن.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-19-can-ability-requests',
        type: 'grammar',
        title: 'الاستطاعة والطلب بـ Can و Must',
        vocab: ['Can: يستطيع', 'Cannot (Can\'t): لا يستطيع', 'Must: يجب', 'Help: يساعد', 'Repeat: يكرر / يعيد'],
        grammar: 'الأفعال الناقصة (Modals) مثل can و must يتبعها دائماً فعل مجرد بدون to وبدون s:\n• She can speak three languages. (وليس can speaks)\n• Can you repeat that, please?',
        examples: ['Can you speak slowly, please? — هل يمكنك التحدث ببطء من فضلك؟', 'You must practice every week. — يجب أن تتدرب كل أسبوع.'],
        pronunciationGuide: 'في الإنجليزية الأمريكية تُنطق can غالباً خفيفة /kən/ بينما can\'t واضحة /kænt/.',
        pronunciationText: 'Can you help me, please? I can read English well.',
        exercises: [
          { question_ar: 'اختر الجملة الصحيحة:', options: ['He can swims fast', 'He can to swim fast', 'He can swim fast'], correct_answer: '3', explanation_ar: 'بعد can يأتي الفعل مجرداً بدون to أو s.', hint_ar: 'فعل مجرد تماماً.', difficulty: 'beginner' },
          { question_ar: 'ما معنى "Can you repeat that?"؟', options: ['هل يمكنك تكرار ذلك؟', 'هل يمكنك المغادرة؟', 'هل تحب هذا؟'], correct_answer: '1', explanation_ar: 'Repeat تعني يعيد أو يكرر.', hint_ar: 'تُقال عند عدم سماع الجملة.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'en-b-20-reading-dialogue-review',
        type: 'reading',
        title: 'مشروع القراءة الشامل: حوار في مكتبة عامة',
        vocab: ['Library card: بطاقة المكتبة', 'Borrow: يستعير', 'Return: يُرجع', 'Quiet: هادئ'],
        grammar: 'يجمع هذا الحوار التحيات، السؤال المهذب، وأيام الأسبوع:\n"Good morning! Can I borrow two science books?"\n"Sure, please return them on Friday."',
        examples: ['Ali: Good morning! Could I borrow this Python book?\nLibrarian: Yes, of course! You can keep it until next Monday.'],
        pronunciationGuide: 'اقرأ الحوار بصوت مرتفع مرتين لربط النغمة السؤال الصاعدة في أسئلة Yes/No.',
        pronunciationText: 'Good morning! Can I borrow two science books until next Monday?',
        exercises: [
          { question_ar: 'ما معنى الفعل Borrow؟', options: ['يشتري', 'يستعير', 'يبيع'], correct_answer: '2', explanation_ar: 'Borrow يعني يستعير كتاباً أو شيئاً ثم يعيده.', hint_ar: 'تفعل ذلك في المكتبة.', difficulty: 'beginner' },
          { question_ar: 'أي عبارة تناسب سؤال موظف المكتبة بأدب؟', options: ['Could I borrow this book, please?', 'Give book now', 'I borrowing book'], correct_answer: '1', explanation_ar: 'Could I..., please? صيغة مهذبة وصحيحة نحوياً.', hint_ar: 'استخدام Could + فعل مجرد.', difficulty: 'beginner' },
        ],
      },
    ],
  },
];

// ==================== 2. JAPANESE (20 Beginner) ====================
const JAPANESE_BEGINNER_UNITS = [
  {
    title: 'الوحدة 1: الهيراغانا والتحيات',
    lessons: [
      {
        slug: 'jp-b-01-hiragana-vowels',
        type: 'pronunciation',
        title: 'أحرف العلة الخمسة في الهيراغانا (あ い う え お)',
        vocab: ['あ (a): آ', 'い (i): إي', 'う (u): أو خفيفة', 'え (e): إيه', 'お (o): أو'],
        grammar: 'جميع الكلمات اليابانية تُبنى على مقاطع صوتية منتظمة، وأساسها أحرف العلة الخمسة (a, i, u, e, o) بالترتيب الياباني الثابت.',
        examples: ['あい (ai) — حب', 'いえ (ie) — بيت', 'うえ (ue) — فوق'],
        pronunciationGuide: 'الصوت う (u) يُنطق دون تدوير قوي للشفتين، بل بشفتين مسترخيتين.',
        pronunciationText: 'A, i, u, e, o. Ai, ie, ue.',
        exercises: [
          { question_ar: 'ما قراءة المقطع الياباني いえ؟', options: ['ie (بيت)', 'ai (حب)', 'ue (فوق)'], correct_answer: '1', explanation_ar: 'い = i و え = e فالنطق ie ويعني بيت.', hint_ar: 'الحرف الثاني هو e.', difficulty: 'beginner' },
          { question_ar: 'كم عدد أحرف العلة الأساسية في اليابانية؟', options: ['5 أحرف', '3 أحرف', '10 أحرف'], correct_answer: '1', explanation_ar: 'اليابانية فيها 5 أصوات علة أساسية فقط: a, i, u, e, o.', hint_ar: 'あ い う え お.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-02-hiragana-k-s',
        type: 'pronunciation',
        title: 'صفا الكاف والسين (か き く け こ / さ し す せ そ)',
        vocab: ['かさ (kasa): مظلة', 'いす (isu): كرسي', 'えき (eki): محطة قطار', 'さかな (sakana): سمك'],
        grammar: 'المقطع し يُنطق (shi) وليس si. وتُستخدم الحروف لمقاطع صوتية واضحة ثابتة النطق.',
        examples: ['これは かさ です。(Kore wa kasa desu.) — هذه مظلة.', 'えきは どこ ですか。(Eki wa doko desu ka?) — أين المحطة؟'],
        pronunciationGuide: 'احرص على نطق す (su) بخفة عند نهاية الكلمة مثل です (desu تُنطق أقرب إلى des).',
        pronunciationText: 'Kasa, isu, eki, sakana.',
        exercises: [
          { question_ar: 'كيف يُنطق الحرف し في اليابانية؟', options: ['shi', 'si', 'chi'], correct_answer: '1', explanation_ar: 'المقطع し يُنطق shi.', hint_ar: 'يشبه صوت الشين.', difficulty: 'beginner' },
          { question_ar: 'ما معنى كلمة えき (eki)؟', options: ['مظلة', 'محطة قطار', 'كرسي'], correct_answer: '2', explanation_ar: 'eki تعني محطة القطار.', hint_ar: 'مكان ركوب القطارات.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-03-greetings-daily',
        type: 'vocabulary',
        title: 'التحيات الصباحية والمسائية والاعتذار',
        vocab: ['おはようございます (Ohayou gozaimasu): صباح الخير', 'こんばんは (Konbanwa): مساء الخير', 'おやすみなさい (Oyasuminasai): تصبح على خير', 'すみません (Sumimasen): عذراً / لو سمحت'],
        grammar: 'المقطع は في نهاية こんにちは و こんばんは يُنطق wa لأنه في الأصل أداة نحوية.',
        examples: ['おはようございます、せんせい。(صباح الخير يا أستاذ.)', 'すみません、いま なんじ ですか。(عذراً، كم الساعة الآن؟)'],
        pronunciationGuide: 'المد في おはよう (Ohayou) يعني إطالة صوت o قليلاً وليس نطق u منفصلة.',
        pronunciationText: 'Ohayou gozaimasu. Konbanwa. Sumimasen.',
        exercises: [
          { question_ar: 'أي عبارة تعني "مساء الخير"؟', options: ['こんばんは (Konbanwa)', 'おはようございます (Ohayou gozaimasu)', 'さようなら (Sayounara)'], correct_answer: '1', explanation_ar: 'Konbanwa تعني مساء الخير.', hint_ar: 'تبدأ بـ Konban.', difficulty: 'beginner' },
          { question_ar: 'ما العبارة المناسبة للفت انتباه شخص بأدب أو الاعتذار؟', options: ['すみません (Sumimasen)', 'おやすみ (Oyasumi)', 'いただきます'], correct_answer: '1', explanation_ar: 'Sumimasen تُستخدم للاعتذار وللطلب المهذب.', hint_ar: 'تعني عذراً.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-04-self-introduction',
        type: 'vocabulary',
        title: 'التعريف بالنفس (はじめまして)',
        vocab: ['はじめまして (Hajimemashite): تشرفنا باللقاء الأول', 'わたし (watashi): أنا', 'なまえ (namae): اسم', 'よろしく おねがいします (Yoroshiku onegaishimasu): أرجو لطفكم وتعاونكم'],
        grammar: 'نستخدم بنية التعريف القياسية:\nはじめまして。わたしは [الاسم] です。よろしく おねがいします。',
        examples: ['はじめまして。わたしは サラ です。(تشرفنا، أنا سارة.)', 'にほんごを べんきょうして います。(أدرس اللغة اليابانية.)'],
        pronunciationGuide: 'في はじめまして (Hajimemashite) يُخفف صوت i في النهاية فتُنطق تقريباً hajimemashte.',
        pronunciationText: 'Hajimemashite. Watashi wa Sara desu. Yoroshiku onegaishimasu.',
        exercises: [
          { question_ar: 'متى تُقال عبارة はじめまして (Hajimemashite)؟', options: ['عند لقاء شخص لأول مرة', 'عند الذهاب للنوم', 'عند تناول الطعام'], correct_answer: '1', explanation_ar: 'تُقال في بداية التعارف الأول فقط.', hint_ar: 'تعني في البداية / سررت بلقائك.', difficulty: 'beginner' },
          { question_ar: 'ما معنى كلمة わたし (watashi)؟', options: ['أنت', 'أنا', 'هو'], correct_answer: '2', explanation_ar: 'watashi تعني أنا في الأسلوب المهذب المحايد.', hint_ar: 'ضمير المتكلم.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-05-numbers-1-to-20',
        type: 'vocabulary',
        title: 'الأرقام اليابانية (1 إلى 20)',
        vocab: ['いち (ichi): 1', 'に (ni): 2', 'さん (san): 3', 'よん / し (yon/shi): 4', 'ご (go): 5', 'じゅう (juu): 10', 'にじゅう (nijuu): 20'],
        grammar: 'من 11 إلى 19 نركب: 10 (じゅう) + الرقم: 11 = じゅういち (juuichi)، 15 = じゅうご (juugo). ومن 20: 2 + 10 = にじゅう.',
        examples: ['じゅういち (11)، じゅうに (12)، じゅうご (15).', 'わたしは にじゅうさい です。(عمري عشرون عاماً.)'],
        pronunciationGuide: '4 يُنطق غالباً yon و7 يُنطق nana في العد اليومي الواضح.',
        pronunciationText: 'Ichi, ni, san, yon, go, roku, nana, hachi, kyuu, juu.',
        exercises: [
          { question_ar: 'كيف نقول الرقم 15 باليابانية؟', options: ['じゅうご (juugo)', 'ごじゅう (gojuu)', 'じゅうさん (juusan)'], correct_answer: '1', explanation_ar: '10 (juu) + 5 (go) = juugo.', hint_ar: 'العشرة أولاً ثم الخمسة.', difficulty: 'beginner' },
          { question_ar: 'ماذا يعني にじゅう (nijuu)؟', options: ['12', '20', '2'], correct_answer: '2', explanation_ar: 'اثنان (ni) × عشرة (juu) = عشرون.', hint_ar: 'في العشرات نضع الرقم قبل juu.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 2: القواعد الأساسية وأسماء الإشارة',
    lessons: [
      {
        slug: 'jp-b-06-questions-ka',
        type: 'grammar',
        title: 'تكوين السؤال بأداة الاستفهام か (ka)',
        vocab: ['はい (hai): نعم', 'いいえ (iie): لا', 'がくせい (gakusei): طالب', 'せんせい (sensei): معلم'],
        grammar: 'لتحويل أي جملة خبرية إلى سؤال في اليابانية، نضيف الأداة **か** في نهاية الجملة فقط دون تغيير ترتيب الكلمات:\n• あなたは がくせい です か。(هل أنت طالب؟)',
        examples: ['あなたは がくせい ですか。— はい、がくせい です。(هل أنت طالب؟ نعم، أنا طالب.)', 'せんせい ですか。— いいえ、エンジニア です。(هل أنت معلم؟ لا، أنا مهندس.)'],
        pronunciationGuide: 'لا نحتاج علامة استفهام إجبارية لأن か تؤدي وظيفتها مع نغمة صاعدة لطيفة.',
        pronunciationText: 'Anata wa gakusei desu ka? Hai, gakusei desu.',
        exercises: [
          { question_ar: 'ما الأداة التي تحوّل الجملة اليابانية إلى سؤال؟', options: ['か (ka)', 'の (no)', 'も (mo)'], correct_answer: '1', explanation_ar: 'إضافة か في نهاية الجملة يحولها إلى استفهام.', hint_ar: 'تأتي بعد です.', difficulty: 'beginner' },
          { question_ar: 'ما معنى いいえ (iie)؟', options: ['نعم', 'لا', 'شكراً'], correct_answer: '2', explanation_ar: 'はい تعني نعم و いいえ تعني لا.', hint_ar: 'النفي.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-07-kore-sore-are',
        type: 'grammar',
        title: 'أسماء الإشارة (これ / それ / あれ)',
        vocab: ['これ (kore): هذا (قريب من المتكلم)', 'それ (sore): ذلك (قريب من المخاطب)', 'あれ (are): ذلك البعيد (عن الاثنين)', 'ほん (hon): كتاب', 'かばん (kaban): حقيبة'],
        grammar: 'نستخدم これ و それ و あれ كضمائر مستقلة قبل は:\n• これは ほん です。(هذا كتاب)\n• それは なん ですか。(ما ذلك الذي معك؟)',
        examples: ['これは にほんごの ほん です。(هذا كتاب لغة يابانية.)', 'あれは わたし の かばん です。(تلك حقيبتي.)'],
        pronunciationGuide: 'الصوت r في これ (kore) قريب من راء خفيفة ملموسة بطرف اللسان.',
        pronunciationText: 'Kore wa hon desu. Sore wa nan desu ka?',
        exercises: [
          { question_ar: 'أي كلمة تشير لشيء بعيد عن المتكلم والمستمع معاً؟', options: ['これ (kore)', 'それ (sore)', 'あれ (are)'], correct_answer: '3', explanation_ar: 'あれ يُستخدم للبعيد عن الطرفين.', hint_ar: 'الثالث في الترتيب.', difficulty: 'beginner' },
          { question_ar: 'ما معنى ほん (hon)؟', options: ['كتاب', 'حقيبة', 'قلم'], correct_answer: '1', explanation_ar: 'hon تعني كتاب.', hint_ar: 'تقرأه.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-08-particle-no',
        type: 'grammar',
        title: 'أداة الملكية والإضافة の (no)',
        vocab: ['わたしの (watashi no): خاصتي / لي', 'ともだち (tomodachi): صديق', 'にほんご (nihongo): اللغة اليابانية', 'ノート (nooto): دفتر'],
        grammar: 'تربط الأداة **の** بين اسمين بحيث يوضح الاسم الأول الاسم الثاني أو يملكه:\n[المالك/النوع] の [الشيء]\n• わたしの ほん (كتابي)\n• にほんごの せんせい (معلم اللغة اليابانية)',
        examples: ['これは ともだちの ノート です。(هذا دفتر صديقي.)', 'わたしは 東京大学の がくせい です。(أنا طالب في جامعة طوكيو.)'],
        pronunciationGuide: 'المقطع の يُنطق no بوضوح وقصر.',
        pronunciationText: 'Kore wa watashi no tomodachi no hon desu.',
        exercises: [
          { question_ar: 'كيف نقول "كتابي" باليابانية؟', options: ['わたしの ほん', 'ほんの わたし', 'わたし か ほん'], correct_answer: '1', explanation_ar: 'المالك (わたし) يأتي أولاً ثم の ثم الشيء المملوك (ほん).', hint_ar: 'المالك قبل المملوك.', difficulty: 'beginner' },
          { question_ar: 'ما وظيفة الأداة の؟', options: ['النفي', 'الملكية والإضافة بين اسمين', 'الزمن الماضي'], correct_answer: '2', explanation_ar: 'تعمل كحرف إضافة وملكية مثل of في الإنجليزية.', hint_ar: 'تربط اسمين.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-09-negation-ja-arimasen',
        type: 'grammar',
        title: 'النفي المهذب للأسماء (ではありません / じゃありません)',
        vocab: ['ではありません (dewa arimasen): ليس (رسمي)', 'じゃありません (ja arimasen): ليس (يومي مهذب)', 'いしゃ (isha): طبيب', 'かいしゃいん (kaishain): موظف شركة'],
        grammar: 'لنفي الجملة الاسمية التي تنتهي بـ です، نستبدل です بـ **ではありません** أو **じゃありません**:\n• わたしは いしゃ ではありません。(أنا لست طبيباً.)',
        examples: ['これは わたしの かさ じゃありません。(هذه ليست مظلتي.)', 'きょうは やすみ ではありません。(اليوم ليس عطلة.)'],
        pronunciationGuide: 'في ではありません يُنطق は كـ wa: de-wa a-ri-ma-sen.',
        pronunciationText: 'Watashi wa isha dewa arimasen. Gakusei desu.',
        exercises: [
          { question_ar: 'ما صيغة نفي الجملة الاسمية المهذبة في اليابانية؟', options: ['ではありません / じゃありません', 'ですか', 'ます'], correct_answer: '1', explanation_ar: 'نستبدل です بـ ではありません للنفي.', hint_ar: 'تحتوي على arimasen.', difficulty: 'beginner' },
          { question_ar: 'ما معنى كلمة いしゃ (isha)؟', options: ['طبيب', 'معلم', 'طالب'], correct_answer: '1', explanation_ar: 'isha تعني طبيب.', hint_ar: 'يعمل في المستشفى.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-10-places-koko-soko',
        type: 'vocabulary',
        title: 'الأماكن وأين (ここ / そこ / あそこ / どこ)',
        vocab: ['ここ (koko): هنا', 'そこ (soko): هناك', 'あそこ (asoko): هناك البعيد', 'どこ (doko): أين', 'トイレ (toire): دورة المياه'],
        grammar: 'للسؤال عن المكان:\n[المكان] は どこ ですか。\nمثال: トイレは どこ ですか。(أين دورة المياه؟)',
        examples: ['ここは きょうしつ です。(هنا قاعة الدرس.)', 'えきは あそこ です。(المحطة هناك.)'],
        pronunciationGuide: 'كلمات الأماكن تأتي بنمط متناغم: ko-ko / so-ko / a-so-ko / do-ko.',
        pronunciationText: 'Sumimasen, toire wa doko desu ka? Asoko desu.',
        exercises: [
          { question_ar: 'ما أداة السؤال عن المكان؟', options: ['どこ (doko)', 'だれ (dare)', 'いつ (itsu)'], correct_answer: '1', explanation_ar: 'doko تعني أين.', hint_ar: 'تنتهي بـ ko مثل koko.', difficulty: 'beginner' },
          { question_ar: 'ماذا تعني ここ (koko)؟', options: ['هنا', 'متى', 'من'], correct_answer: '1', explanation_ar: 'koko تعني هنا (مكان المتكلم).', hint_ar: 'القريب.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 3: الأفعال اليومية والأزمنة',
    lessons: [
      {
        slug: 'jp-b-11-verbs-masu-present',
        type: 'grammar',
        title: 'الأفعال في الصيغة المهذبة (ます / ません)',
        vocab: ['たべます (tabemasu): يأكل', 'のみます (nomimasu): يشرب', 'べんきょうします (benkyou shimasu): يدرس', 'ねます (nemasu): ينام'],
        grammar: 'صيغة **ます** تدل على المضارع أو المستقبل المهذب، ونفيها **ません**:\n• わたしは まいにち べんきょうします。(أدرس كل يوم)\n• コーヒーを のみません。(لا أشرب القهوة)',
        examples: ['まいあさ パンを たべます。(آكل الخبز كل صباح.)', '日本語を べんきょうします。(أدرس اليابانية.)'],
        pronunciationGuide: 'صوت u في نهاية ます (masu) خفيف جداً.',
        pronunciationText: 'Mainichi nihongo o benkyou shimasu.',
        exercises: [
          { question_ar: 'ما نفي الفعل たべます (يأكل)؟', options: ['たべません', 'たべました', 'たべですか'], correct_answer: '1', explanation_ar: 'تتحول ます إلى ません في النفي.', hint_ar: 'تنتهي بـ sen.', difficulty: 'beginner' },
          { question_ar: 'ما معنى のみます (nomimasu)؟', options: ['يشرب', 'ينام', 'يقرأ'], correct_answer: '1', explanation_ar: 'nomimasu تعني يشرب.', hint_ar: 'مع الماء أو الشاي.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-12-particle-o-action',
        type: 'grammar',
        title: 'أداة المفعول به を (o)',
        vocab: ['みず (mizu): ماء', 'ごはん (gohan): أرز / وجبة', 'おんがく (ongaku): موسيقى', 'ききます (kikimasu): يستمع'],
        grammar: 'الأداة **を** (وتُنطق o في الكلام الحديث) تأتي مباشرة **بعد** المفعول به وقبل الفعل، لأن الفعل الياباني يأتي في نهاية الجملة:\n[المفعول] を [الفعل]',
        examples: ['みずを のみます。(أشرب الماء.)', 'ともだちと ごはんを たべます。(آكل الطعام مع صديقي.)'],
        pronunciationGuide: 'الحرف を يُكتب wo في لوحة المفاتيح لكنه يُنطق o في الجمل.',
        pronunciationText: 'Mizu o nomimasu. Gohan o tabemasu.',
        exercises: [
          { question_ar: 'أين يقع الفعل غالباً في الجملة اليابانية؟', options: ['في نهاية الجملة', 'في بداية الجملة قبل الفاعل', 'بين المفعول به و を'], correct_answer: '1', explanation_ar: 'ترتيب الجملة اليابانية SOV: الفاعل ثم المفعول به ثم الفعل في النهاية.', hint_ar: 'انظر لآخر الجملة.', difficulty: 'beginner' },
          { question_ar: 'أي أداة تُوضع بعد المفعول به؟', options: ['を (o)', 'か (ka)', 'ね (ne)'], correct_answer: '1', explanation_ar: 'الأداة を تحدد المفعول به.', hint_ar: 'تُكتب wo.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-13-verbs-past-mashita',
        type: 'grammar',
        title: 'الماضي في الأفعال (ました / ませんでした)',
        vocab: ['きのう (kinou): أمس', 'いきます -> いきました: ذهب', 'みます -> みました: شاهد', 'かいます -> かいました: اشترى'],
        grammar: 'للتحويل للماضي:\n• إثبات: نستبدل ます بـ **ました**\n• نفي: نستبدل ます بـ **ませんでした**',
        examples: ['きのう としょかんへ いきました。(أمس ذهبت إلى المكتبة.)', 'けさ なにも たべませんでした。(لم آكل شيئاً هذا الصباح.)'],
        pronunciationGuide: 'المقطع ました يُنطق mashita بتخفيف i قليلاً.',
        pronunciationText: 'Kinou eiga o mimashita. Totemo omoshirokatta desu.',
        exercises: [
          { question_ar: 'ما الماضي المثبت للفعل みます (يشاهد)؟', options: ['みました', 'みません', 'みますか'], correct_answer: '1', explanation_ar: 'تتحول ます إلى ました.', hint_ar: 'تنتهي بـ shita.', difficulty: 'beginner' },
          { question_ar: 'ما معنى きのう (kinou)؟', options: ['غداً', 'أمس', 'اليوم'], correct_answer: '2', explanation_ar: 'kinou تعني أمس.', hint_ar: 'يدل على الماضي.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-14-particles-ni-de-e',
        type: 'grammar',
        title: 'حروف المكان والزمن والاتجاه (に / で / へ)',
        vocab: ['へ (تُنطق e): إلى (الاتجاه)', 'で (de): في (مكان وقوع الفعل)', 'に (ni): في وقت محدد / إلى', 'がっこう (gakkou): مدرسة'],
        grammar: '• **へ (e)**: وجهة الحركة مع いきます / きます (がっこうへ いきます).\n• **で (de)**: المكان الذي يحدث فيه نشاط (としょかんで べんきょうします).\n• **に (ni)**: مع الساعة والأيام المحددة (7じに おきます).',
        examples: ['うちで にほんごを べんきょうします。(أدرس اليابانية في البيت.)', '7じに がっこうへ いきます。(أذهب إلى المدرسة الساعة السابعة.)'],
        pronunciationGuide: 'الحرف へ كأداة اتجاه يُنطق e وليس he.',
        pronunciationText: 'Uchi de benkyou shimasu. Gakkou e ikimasu.',
        exercises: [
          { question_ar: 'أي أداة تُستخدم لتحديد مكان أداء نشاط مثل "أدرس في المكتبة"؟', options: ['で (de)', 'か (ka)', 'を (o)'], correct_answer: '1', explanation_ar: 'الأداة で تحدد مكان حدوث الفعل.', hint_ar: 'مكان النشاط.', difficulty: 'beginner' },
          { question_ar: 'ما نطق الأداة へ عند استخدامها للاتجاه؟', options: ['e', 'ha', 'o'], correct_answer: '1', explanation_ar: 'へ كأداة اتجاه تُنطق e.', hint_ar: 'مثل الحرف え.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-15-days-and-time',
        type: 'vocabulary',
        title: 'أيام الأسبوع والساعة (なんじ / なんようび)',
        vocab: ['げつようび (getsuyoubi): الإثنين', 'かようび: الثلاثاء', 'きんようび (kinyoubi): الجمعة', 'いま (ima): الآن', '〜じ (-ji): الساعة ...'],
        grammar: 'السؤال عن الساعة: **いま なんじ ですか** (كم الساعة الآن؟).\nالجواب: いま 3じ (さんじ) です (الساعة الآن الثالثة).',
        examples: ['いま なんじ ですか。— 9じはん です。(كم الساعة الآن؟ التاسعة والنصف.)', 'きんようびに やすみます。(أستريح يوم الجمعة.)'],
        pronunciationGuide: 'كلمة はん (han) بعد الساعة تعني "ونصف".',
        pronunciationText: 'Ima nanji desu ka? Kuji han desu.',
        exercises: [
          { question_ar: 'ما معنى いま なんじ ですか؟', options: ['كم الساعة الآن؟', 'ما اسمك؟', 'أين أنت؟'], correct_answer: '1', explanation_ar: 'ima (الآن) + nanji (كم ساعة).', hint_ar: 'سؤال عن الوقت.', difficulty: 'beginner' },
          { question_ar: 'ما معنى はん (han) بعد الساعة؟', options: ['تماماً', 'ونصف', 'دقيقة'], correct_answer: '2', explanation_ar: 'han تعني نصف ساعة.', hint_ar: '30 دقيقة.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 4: الصفات والتفضيل والمحادثات اليومية',
    lessons: [
      {
        slug: 'jp-b-16-i-adjectives',
        type: 'grammar',
        title: 'صفات الياء (い-Adjectives) وتصريفها',
        vocab: ['おおきい (ookii): كبير', 'ちいさい (chiisai): صغير', 'あたらしい (atarashii): جديد', 'おもしろい (omoshiroi): ممتع', 'たかい (takai): غالٍ / مرتفع'],
        grammar: 'الصفات المنتهية بـ い تسبق الاسم مباشرة. لنفيها نحذف い الأخيرة ونضيف **くない です**:\n• おもしろい -> おもしろくない です (غير ممتع)\n• たかい -> たかくない です (غير غالٍ)',
        examples: ['これは とても おもしろい ほん です。(هذا كتاب ممتع جداً.)', 'この かばんは たかくない です。(هذه الحقيبة ليست غالية.)'],
        pronunciationGuide: 'كلمة いい (جيد) شاذة في النفي وتصبح よくない です (yokunai desu).',
        pronunciationText: 'Kono hon wa totemo omoshiroi desu. Takakunai desu.',
        exercises: [
          { question_ar: 'كيف تنفي الصفة おもしろい (ممتع)؟', options: ['おもしろくない です', 'おもしろい ません', 'おもしろじゃない'], correct_answer: '1', explanation_ar: 'صفات い تُنفى باستبدال い بـ くない.', hint_ar: 'نضيف kunai.', difficulty: 'beginner' },
          { question_ar: 'ما معنى あたらしい (atarashii)؟', options: ['جديد', 'قديم', 'صغير'], correct_answer: '1', explanation_ar: 'atarashii تعني جديد.', hint_ar: 'عكس قديم.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-17-na-adjectives',
        type: 'grammar',
        title: 'صفات النون (な-Adjectives)',
        vocab: ['きれい (kirei): جميل / نظيف', 'しずか (shizuka): هادئ', 'すき (suki): محبوب / مفضل', 'ゆうめい (yuumei): مشهور'],
        grammar: 'عندما تصف صفات な اسماً بعدها، نضع **な** بينهما:\n• しずかな としょかん (مكتبة هادئة)\n• きれいな まち (مدينة جميلة)\nوتُنفى بـ じゃありません.',
        examples: ['ここは しずかな ところ です。(هذا مكان هادئ.)', 'わたしは にほんごが すき です。(أنا أحب اللغة اليابانية.)'],
        pronunciationGuide: 'انتبه: きれい تنتهي بحرف い لكنها في القواعد من صفات な!',
        pronunciationText: 'Koko wa shizuka na toshokan desu.',
        exercises: [
          { question_ar: 'اختر الربط الصحيح: "مدينة جميلة"', options: ['きれいな まち', 'きれい まち', 'きれいの まち'], correct_answer: '1', explanation_ar: 'きれい من صفات な وتأخذ な قبل الاسم.', hint_ar: 'نضيف な.', difficulty: 'beginner' },
          { question_ar: 'ما معنى しずか (shizuka)؟', options: ['هادئ', 'سريع', 'صعب'], correct_answer: '1', explanation_ar: 'shizuka تعني هادئ.', hint_ar: 'صفة للمكتبة.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-18-likes-and-abilities',
        type: 'grammar',
        title: 'التعبير عن الإعجاب والقدرة (すき / じょうず + が)',
        vocab: ['すき (suki): يحب', 'じょうず (jouzu): ماهر في', 'スポーツ (supootsu): رياضة', 'りょうり (ryouri): طبخ'],
        grammar: 'مع صفات المشاعر والمهارة (すき و じょうず) نستخدم الأداة **が** وليس を:\n• わたしは 音楽が すき です。(أحب الموسيقى.)',
        examples: ['わたしは プログラミングが すき です。(أنا أحب البرمجة.)', 'あには 日本語が じょうず です。(أخي ماهر في اليابانية.)'],
        pronunciationGuide: 'في すき (suki) يُخفف صوت u فتُسمع أقرب إلى ski.',
        pronunciationText: 'Watashi wa puroguramingu ga suki desu.',
        exercises: [
          { question_ar: 'أي أداة تُستخدم قبل すき です (يحب)؟', options: ['が (ga)', 'を (o)', 'へ (e)'], correct_answer: '1', explanation_ar: 'نستخدم الأداة が مع صفات التفضيل مثل すき.', hint_ar: 'قاعدة مهمة مع suki.', difficulty: 'beginner' },
          { question_ar: 'ما معنى じょうず (jouzu)؟', options: ['ماهر / بارع', 'حزين', 'متعب'], correct_answer: '1', explanation_ar: 'jouzu تعني ماهر.', hint_ar: 'للمهارة.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-19-polite-requests',
        type: 'vocabulary',
        title: 'الطلب والأسعار في المتجر (〜を ください)',
        vocab: ['これ を ください (kore o kudasai): أعطني هذا من فضلك', 'いくら (ikura): كم السعر؟', 'えん (en): ين ياباني', 'おねがいします: من فضلك'],
        grammar: 'للطلب المهذب لشيء أو طعام: [الشيء] を **ください**.\nوللسؤال عن السعر: これは **いくら** ですか。',
        examples: ['すみません、これは いくら ですか。(عذراً، كم سعر هذا؟)', 'みずを ふたつ ください。(أعطني زجاجتي ماء من فضلك.)'],
        pronunciationGuide: 'كلمة ください تُنطق kudasai بوضوح في آخر الجملة.',
        pronunciationText: 'Sumimasen, kore wa ikura desu ka? Kore o kudasai.',
        exercises: [
          { question_ar: 'ماذا تقول عندما تريد طلب شيء في متجر؟', options: ['これを ください (kore o kudasai)', 'これは どこですか', 'きのう みました'], correct_answer: '1', explanation_ar: '〜を ください هي صيغة الطلب المهذب في المتاجر والمطاعم.', hint_ar: 'تنتهي بـ kudasai.', difficulty: 'beginner' },
          { question_ar: 'ما أداة السؤال عن السعر؟', options: ['いくら (ikura)', 'だれ (dare)', 'なに (nani)'], correct_answer: '1', explanation_ar: 'ikura تعني كم السعر.', hint_ar: 'يُقال عند الدفع.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'jp-b-20-katakana-reading',
        type: 'reading',
        title: 'قراءة الكاتاكانا (カタカナ) وحوار ختامي',
        vocab: ['コーヒー (koohii): قهوة', 'コンピューター (konpyuutaa): حاسوب', 'インターネット (intaanetto): إنترنت', 'カメラ (kamera): كاميرا'],
        grammar: 'تُستخدم **الكاتاكانا** لكتابة الكلمات الأجنبية المستعارة والمصطلحات التقنية، وتُمد الحروف بشرطة طويلة (ー).',
        examples: ['わたしは コンピューターで インターネットを つかいます。(أستخدم الإنترنت على الحاسوب.)'],
        pronunciationGuide: 'الشرطة الطويلة ー تطيل حركة الحرف السابق لها بمقدار نبضة واحدة.',
        pronunciationText: 'Koohii o nomimasu. Konpyuutaa o tsukaimasu.',
        exercises: [
          { question_ar: 'متى تُستخدم أبجدية الكاتاكانا (カタカナ) في اليابانية غالباً؟', options: ['للكلمات الأجنبية والمستعارة', 'لأدوات النحو فقط', 'للكانجي الصيني'], correct_answer: '1', explanation_ar: 'تُكتب الكلمات الدخيلة مثل コーヒー و カメラ بالكاتاكانا.', hint_ar: 'مثل coffee و camera.', difficulty: 'beginner' },
          { question_ar: 'ما وظيفة الرمز (ー) في الكاتاكانا؟', options: ['إطالة الصوت المتحرك السابق', 'إنهاء الجملة', 'السؤال'], correct_answer: '1', explanation_ar: 'يمثل علامة المد الصوتي في الكاتاكانا.', hint_ar: 'مثل oo في koohii.', difficulty: 'beginner' },
        ],
      },
    ],
  },
];

// ==================== 3. RUSSIAN (20 Beginner) ====================
const RUSSIAN_BEGINNER_UNITS = [
  {
    title: 'الوحدة 1: السيريلية والنطق الأساسي',
    lessons: [
      {
        slug: 'ru-b-01-cyrillic-lookalikes',
        type: 'pronunciation',
        title: 'حروف السيريلية المشابهة (А, О, К, М, Т)',
        vocab: ['Мама (Mama): أم', 'Кот (Kot): قط', 'Том (Tom): مجلد / توم', 'Там (Tam): هناك', 'Кто (Kto): من؟'],
        grammar: 'تتكوّن الأبجدية الروسية (السيريلية) من 33 حرفاً. أسهل 5 حروف تتطابق تقريباً مع اللاتينية شكلاً ونطقاً هي А, К, М, О, Т.',
        examples: ['Кто там? — Там кот. (من هناك؟ — هناك قط.)', 'Мама дома. (الأم في البيت.)'],
        pronunciationGuide: 'حرف О إذا لم يكن عليه نبرة (Stress) يميل نطقه إلى /a/ خفيفة! مثل Москва (مَسكفا).',
        pronunciationText: 'Mama, kot, tam. Kto tam?',
        exercises: [
          { question_ar: 'كم عدد أحرف الأبجدية الروسية السيريلية؟', options: ['33 حرفاً', '26 حرفاً', '20 حرفاً'], correct_answer: '1', explanation_ar: 'الأبجدية الروسية تحتوي على 33 حرفاً.', hint_ar: 'أكثر من الإنجليزية بـ 7 أحرف.', difficulty: 'beginner' },
          { question_ar: 'ما معنى كلمة Кот؟', options: ['كلب', 'قط', 'بيت'], correct_answer: '2', explanation_ar: 'Кот (كوت) تعني قط.', hint_ar: 'حيوان أليف.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-02-cyrillic-tricky-letters',
        type: 'pronunciation',
        title: 'حروف خادعة الشكل (В, Н, Р, С, У, Х)',
        vocab: ['Вода (Voda): ماء', 'Нос (Nos): أنف', 'Рука (Ruka): يد', 'Сын (Syn): ابن', 'Утро (Utro): صباح', 'Хорошо (Khorosho): جيد / حسناً'],
        grammar: 'انتبه لهذه الحروف الروسية:\n• В = V | Н = N | Р = R | С = S | У = U | Х = Kh (خ)',
        examples: ['Доброе утро! — صباح الخير!', 'Всё хорошо. — كل شيء بخير.'],
        pronunciationGuide: 'الحرف Р يُنطق راء واضحة، وليس P! والحرف С يُنطق سين دائماً.',
        pronunciationText: 'Dobroe utro! Voda, nos, ruka. Khorosho.',
        exercises: [
          { question_ar: 'كيف يُنطق الحرف الروسي Р في كلمة Рука؟', options: ['R (راء)', 'P (باء ثقيلة)', 'F (فاء)'], correct_answer: '1', explanation_ar: 'الحرف Сيريلي Р يقابل صوت R.', hint_ar: 'يُنطق روكا.', difficulty: 'beginner' },
          { question_ar: 'ما صوت الحرف С في الروسية؟', options: ['S (سين)', 'K (كاف)', 'Ch'], correct_answer: '1', explanation_ar: 'الحرف С في السيريلية يُنطق دائماً S.', hint_ar: 'في كلمة Спасибо.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-03-cyrillic-unique-letters',
        type: 'pronunciation',
        title: 'حروف روسية مميزة (Б, Г, Д, Ж, З, Л, П, Ф, Ч, Ш, Я)',
        vocab: ['Дом (Dom): بيت', 'Город (Gorod): مدينة', 'Школа (Shkola): مدرسة', 'Яблоко (Yabloko): تفاحة', 'Чай (Chay): شاي'],
        grammar: 'أحرف مميزة: Д (D)، Г (G مصرية)، Л (L)، П (P)، Ж (J)، Ш (Sh)، Ч (Ch)، Я (Ya).',
        examples: ['Мой дом в городе. (بيتي في المدينة.)', 'Я пью чай. (أنا أشرب الشاي.)'],
        pronunciationGuide: 'الحرف Я يعني مقطع Ya، وعندما يأتي مستقلاً يعني "أنا"!',
        pronunciationText: 'Dom, gorod, shkola, yabloko, chay.',
        exercises: [
          { question_ar: 'ما الحرف الروسي الذي يُنطق (Sh) في كلمة Школа؟', options: ['Ш', 'Д', 'П'], correct_answer: '1', explanation_ar: 'Ш يُنطق شين، لذا Школа = Shkola (مدرسة).', hint_ar: 'شكله ثلاثي الأسنان.', difficulty: 'beginner' },
          { question_ar: 'ماذا يعني الحرف Я عندما يأتي كلمة مستقلة؟', options: ['أنا', 'أنت', 'هو'], correct_answer: '1', explanation_ar: 'Я تعني "أنا" بالروسية.', hint_ar: 'ضمير المتكلم.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-04-greetings-polite',
        type: 'vocabulary',
        title: 'التحيات الروسية حسب أوقات اليوم',
        vocab: ['Доброе утро: صباح الخير', 'Добрый день: نهارك سعيد', 'Добрый вечер: مساء الخير', 'До свидания: إلى اللقاء', 'Пока: وداعاً (ودي)'],
        grammar: 'تتغير كلمة "طيب/سعيد" (Доброе / Добрый) حسب جنس الاسم الذي يليها: утро (محايد) -> Доброе، بينما день و вечер (مذكر) -> Добрый.',
        examples: ['Добрый день! Как дела? — نهارك سعيد! كيف الأحوال؟', 'До свидания! — إلى اللقاء!'],
        pronunciationGuide: 'في Здравствуйте، الحرف в الأول صامت تقريباً في النطق السريع: زدراستفويتي.',
        pronunciationText: 'Dobroe utro! Dobry den! Do svidaniya!',
        exercises: [
          { question_ar: 'أي عبارة تُقال صباحاً؟', options: ['Доброе утро', 'Добрый вечер', 'Спокойной ночи'], correct_answer: '1', explanation_ar: 'Утро تعني صباح.', hint_ar: 'Доброе утро.', difficulty: 'beginner' },
          { question_ar: 'ما العبارة الرسمية للوداع؟', options: ['До свидания', 'Привет', 'Спасибо'], correct_answer: '1', explanation_ar: 'До свидания تُستخدم في المواقف الرسمية.', hint_ar: 'أطول من Пока.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-05-introducing-yourself',
        type: 'vocabulary',
        title: 'التعارف وتقديم الاسم (Меня зовут...)',
        vocab: ['Меня зовут...: اسمي...', 'Как вас зовут?: ما اسمك؟ (رسمي)', 'Очень приятно: تشرفت كثيراً', 'Откуда вы?: من أين أنت؟'],
        grammar: 'في الروسية لا نستخدم فعل "يكون" في الحاضر؛ ولتقديم الاسم نقول حرفياً: "يُدعوني ..." أي **Меня зовут [الاسم]**.',
        examples: ['Меня зовут Омар. Очень приятно! — اسمي عمر، تشرفت كثيراً!', 'Как тебя зовут? — ما اسمك؟ (للاصدقاء)'],
        pronunciationGuide: 'كلمة Очень تُنطق ochen بتخفيف حرف n في النهاية.',
        pronunciationText: 'Kak vas zovut? Menya zovut Omar. Ochen priyatno.',
        exercises: [
          { question_ar: 'كيف تقول "اسمي سارة" بالروسية؟', options: ['Меня зовут Сара', 'Тебя зовут Сара', 'Спасибо Сара'], correct_answer: '1', explanation_ar: 'Меня зовут تعني اسمي.', hint_ar: 'تبدأ بـ Меня.', difficulty: 'beginner' },
          { question_ar: 'ما معنى Очень приятно؟', options: ['تشرفت / سررت كثيراً', 'تصبح على خير', 'كم الساعة'], correct_answer: '1', explanation_ar: 'تُقال عند التعرف على شخص.', hint_ar: 'تحية تعارف.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 2: الضمائر وجنس الأسماء والملكية',
    lessons: [
      {
        slug: 'ru-b-06-pronouns-no-tobe',
        type: 'grammar',
        title: 'الضمائر الشخصية وغياب فعل الكينونة في الحاضر',
        vocab: ['Я: أنا', 'Ты: أنتَ/أنتِ (ودي)', 'Вы: أنتم / حضرتك (رسمي)', 'Он / Она: هو / هي', 'Мы / Они: نحن / هم'],
        grammar: 'ميزة مريحة في الروسية: لا نضع am/is/are في الحاضر:\n• Я студент (أنا طالب)\n• Она врач (هي طبيبة)\n• Мы друзья (نحن أصدقاء)',
        examples: ['Я студент, а он учитель. — أنا طالب، وهو معلم.', 'Вы готовы? — هل أنتم مستعدون؟'],
        pronunciationGuide: 'في كلمة Она النبرة على a الأخيرة، لذا تُنطق o الأولى أقرب إلى a: أَنا.',
        pronunciationText: 'Ya student. Ona uchitel. My druzya.',
        exercises: [
          { question_ar: 'أين فعل الكينونة (يكون) في جملة "Я студент"؟', options: ['محذوف في الزمن الحاضر', 'الكلمة الأولى', 'لا يوجد ضمير'], correct_answer: '1', explanation_ar: 'في الروسية الحاضرة يُفهم فعل الكينونة ضمنياً ولا يُكتب.', hint_ar: 'أبسط من الإنجليزية.', difficulty: 'beginner' },
          { question_ar: 'أي ضمير يُستخدم للاحترام مع شخص غريب أو أكبر سناً؟', options: ['Вы', 'Ты', 'Я'], correct_answer: '1', explanation_ar: 'Вы تُستخدم للجمع وللمخاطب المفرد بصيغة الاحترام.', hint_ar: 'يقابل حضرتك.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-07-noun-gender',
        type: 'grammar',
        title: 'تحديد جنس الأسماء (مذكر / مؤنث / محايد)',
        vocab: ['Стол (مذكر): طاولة', 'Книга (مؤنث): كتاب', 'Окно (محايد): نافذة', 'Море (محايد): بحر', 'Семья (مؤنث): عائلة'],
        grammar: 'نهاية الاسم تحدد جنسه في الروسية:\n• **مذكر**: ينتهي بحرف ساكن أو й (стол, музей).\n• **مؤنث**: ينتهي بـ а أو я (книга, семья).\n• **محايد**: ينتهي بـ о أو е (окно, море).',
        examples: ['Это новый стол. (هذه طاولة جديدة - مذكر)', 'Это интересная книга. (هذا كتاب ممتع - مؤنث)'],
        pronunciationGuide: 'كلمة книга (كتاب) مؤنث في الروسية رغم أن "كتاب" مذكر في العربية، لذا انتبه للنهاية -а.',
        pronunciationText: 'Stol, kniga, okno, more.',
        exercises: [
          { question_ar: 'ما جنس كلمة Окно (نافذة) في الروسية؟', options: ['محايد (لأنها تنتهي بـ о)', 'مذكر', 'مؤنث'], correct_answer: '1', explanation_ar: 'الأسماء المنتهية بـ о أو е تكون محايدة الجنس.', hint_ar: 'انظر للحرف الأخير о.', difficulty: 'beginner' },
          { question_ar: 'ما جنس كلمة Книга (كتاب)؟', options: ['مؤنث (تنتهي بـ а)', 'مذكر', 'محايد'], correct_answer: '1', explanation_ar: 'تنتهي بحرف а لذا هي مؤنثة نحوياً في الروسية.', hint_ar: 'تنتهي بـ a.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-08-possessives',
        type: 'grammar',
        title: 'ضمائر الملكية (Мой / Моя / Моё / Мои)',
        vocab: ['Мой: لي (للمذكر)', 'Моя: لي (للمؤنث)', 'Моё: لي (للمحايد)', 'Мои: لي (للجمع)', 'Наш / Наша: لنا'],
        grammar: 'يتطابق ضمير الملكية مع جنس الشيء المملوك:\n• мой телефон (هاتفي - مذكر)\n• моя книга (كتابي - مؤنث)\n• моё окно (نافذتي - محايد)',
        examples: ['Это мой друг. — هذا صديقي.', 'Где моя сумка? — أين حقيبتي؟'],
        pronunciationGuide: 'الحرف ё في моё يُنطق دائماً yo ويجذب النبرة الصوتية إليه.',
        pronunciationText: 'Moy drug, moya kniga, moyo okno, moi druzya.',
        exercises: [
          { question_ar: 'اختر الضمير الصحيح لكلمة книга (مؤنث): "___ книга"', options: ['мой', 'моя', 'моё'], correct_answer: '2', explanation_ar: 'كلمة книга مؤنثة فتأخذ моя.', hint_ar: 'نهاية مؤنثة.', difficulty: 'beginner' },
          { question_ar: 'اختر الضمير الصحيح لكلمة дом (مذكر): "___ дом"', options: ['мой', 'моя', 'мои'], correct_answer: '1', explanation_ar: 'дом مذكر وتأخذ мой.', hint_ar: 'تنتهي بساكن.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-09-plurals-basic',
        type: 'grammar',
        title: 'صياغة الجمع الأساسي (-ы / -и)',
        vocab: ['Стол -> Столы: طاولات', 'Книга -> Книги: كتب', 'Город -> Города: مدن (شاذ)', 'Друг -> Друзья: أصدقاء'],
        grammar: 'القاعدة العامة للجمع:\n• المذكر والمؤنث يأخذان **-ы** (стол -> столы, лампа -> лампы).\n• بعد الأحرف г, к, х, ж, ш, щ, ч نضع **-и** بدل ы (книга -> книги).',
        examples: ['На столе лежат книги и ручки. — على الطاولة كتب وأقلام.', 'Мои друзья учатся здесь. — أصدقائي يدرسون هنا.'],
        pronunciationGuide: 'الصوت ы حرف روسي عميق يُنطق من وسط الفم مع تراجع اللسان.',
        pronunciationText: 'Stol, stoly. Kniga, knigi.',
        exercises: [
          { question_ar: 'ما جمع كلمة Книга؟', options: ['Книги', 'Книгаы', 'Книго'], correct_answer: '1', explanation_ar: 'بعد حرف г نستخدم и بدل ы فتصبح Книги.', hint_ar: 'قاعدة الحروف السبعة.', difficulty: 'beginner' },
          { question_ar: 'ما جمع كلمة Стол؟', options: ['Столы', 'Стола', 'Столе'], correct_answer: '1', explanation_ar: 'نضيف ы للاسم المذكر المنتهي بساكن عادي.', hint_ar: 'تنتهي بـ ы.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-10-numbers-1-to-20',
        type: 'vocabulary',
        title: 'الأرقام الروسية (1 إلى 20)',
        vocab: ['Один (1)، Два (2)، Три (3)، Четыре (4)، Пять (5)', 'Шесть (6)، Семь (7)، Восемь (8)، Девять (9)، Десять (10)', 'Двадцать (20)'],
        grammar: 'من 11 إلى 19 نضيف اللاحقة **-надцать** (-nadtsat) على جذر الرقم: 11 = одиннадцать, 12 = двенадцать, 15 = пятнадцать.',
        examples: ['У меня два брата. — لديّ أخوان.', 'Пять плюс пять — десять. — خمسة زائد خمسة يساوي عشرة.'],
        pronunciationGuide: 'الحرف ь (علامة الترقيق) في نهاية пять و семь و десять يجعل الحرف الساكن الأخير ناعماً.',
        pronunciationText: 'Odin, dva, tri, chetyre, pyat, shest, sem, vosem, devyat, desyat.',
        exercises: [
          { question_ar: 'ما الرقم Три (Tri)؟', options: ['3', '5', '10'], correct_answer: '1', explanation_ar: 'Три تعني ثلاثة.', hint_ar: 'يشبه three.', difficulty: 'beginner' },
          { question_ar: 'بماذا تنتهي الأرقام من 11 إلى 19 في الروسية؟', options: ['-надцать', '-десят', '-сто'], correct_answer: '1', explanation_ar: 'تشترك الأعداد 11-19 في اللاحقة -надцать.', hint_ar: 'تعني على العشرة.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 3: الأفعال والحاضر والأسئلة',
    lessons: [
      {
        slug: 'ru-b-11-verbs-group1',
        type: 'grammar',
        title: 'تصريف أفعال المجموعة الأولى (Читать / Знать / Работать)',
        vocab: ['Читать: يقرأ', 'Знать: يعرف', 'Работать: يعمل', 'Понимать: يفهم', 'Делать: يفعل'],
        grammar: 'تصريف المجموعة الأولى (مثال Читать):\n• Я читаю | Ты читаешь | Он/Она читает\n• Мы читаем | Вы читаете | Они читают',
        examples: ['Я читаю книгу по-русски. — أنا أقرأ كتاباً بالروسية.', 'Вы понимаете меня? — هل تفهمني؟'],
        pronunciationGuide: 'الصيغة читают تنتهي بصوت yut واضح.',
        pronunciationText: 'Ya chitayu. Ty chitaesh. My chitaem. Oni chitayut.',
        exercises: [
          { question_ar: 'أكمل: "Я ___ по-русски." (أفهم)', options: ['понимаю', 'понимает', 'понимаем'], correct_answer: '1', explanation_ar: 'مع الضمير Я ينتهي الفعل بـ -ю أو -у.', hint_ar: 'ضمير المتكلم المفرد.', difficulty: 'beginner' },
          { question_ar: 'ما معنى الفعل Работать؟', options: ['يعمل', 'ينام', 'يسافر'], correct_answer: '1', explanation_ar: 'Работать تعني يعمل.', hint_ar: 'كلمة работа تعني عمل.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-12-verbs-group2',
        type: 'grammar',
        title: 'تصريف أفعال المجموعة الثانية (Говорить / Учить)',
        vocab: ['Говорить: يتكلم', 'Учить: يتعلم / يدرّس', 'Любить: يحب', 'Смотреть: يشاهد'],
        grammar: 'أفعال تنتهي غالباً بـ -ить وتُصرّف كالتالي (مثال Говорить):\n• Я говорю | Ты говоришь | Он говорит\n• Мы говорим | Вы говорите | Они говорят',
        examples: ['Я говорю по-арабски и по-русски. — أتحدث العربية والروسية.', 'Мы учим новые слова. — نحن نتعلم كلمات جديدة.'],
        pronunciationGuide: 'للتعبير عن "يتحدث بلغة معينة" نستخدم по- + اسم اللغة: по-русски, по-арабски.',
        pronunciationText: 'Ya govoryu po-arabski i nemnogo po-russki.',
        exercises: [
          { question_ar: 'كيف تقول "أنا أتحدث الروسية"؟', options: ['Я говорю по-русски', 'Я говорит по-русски', 'Мы говорю по-русски'], correct_answer: '1', explanation_ar: 'Я يأخذ говорю ومع اللغة نستخدم по-русски.', hint_ar: 'تطابق الفاعل مع الفعل.', difficulty: 'beginner' },
          { question_ar: 'ما معنى الفعل Любить؟', options: ['يحب', 'يكتب', 'يسأل'], correct_answer: '1', explanation_ar: 'Любить يعني يحب.', hint_ar: 'Я люблю...', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-13-wh-questions',
        type: 'vocabulary',
        title: 'أدوات الاستفهام الأساسية (Что / Где / Когда / Почему)',
        vocab: ['Что (Shto): ماذا / ما', 'Кто (Kto): من', 'Где (Gde): أين', 'Когда (Kogda): متى', 'Почему (Pochemu): لماذا'],
        grammar: 'أدوات الاستفهام تأتي غالباً في بداية السؤال مع نبرة مرتفعة على أداة الاستفهام ذاتها:\n• Где вы живёте? (أين تسكن؟)\n• Что вы делаете? (ماذا تفعل؟)',
        examples: ['Когда начинается урок? — متى يبدأ الدرس؟', 'Почему вы учите русский язык? — لماذا تتعلم اللغة الروسية؟'],
        pronunciationGuide: 'كلمة Что شاذة في النطق فتُنطق Shto (وليس Chto)!',
        pronunciationText: 'Chto eto? Gde vy zhivyote? Kogda urok?',
        exercises: [
          { question_ar: 'كيف تُنطق الكلمة الروسية Что؟', options: ['Shto (شتو)', 'Kto', 'Mto'], correct_answer: '1', explanation_ar: 'Что تُنطق Shto استثنائياً.', hint_ar: 'تبدأ بصوت شين.', difficulty: 'beginner' },
          { question_ar: 'ما أداة السؤال عن الزمن "متى"؟', options: ['Когда', 'Где', 'Кто'], correct_answer: '1', explanation_ar: 'Когда تعني متى.', hint_ar: 'تبدأ بـ Ко-.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-14-negation-past',
        type: 'grammar',
        title: 'النفي بـ (Не) والزمن الماضي (-л / -ла / -ли)',
        vocab: ['Не: لا / لم', 'Вчера: أمس', 'Был / Была / Были: كان / كانت / كانوا', 'Работал: عمل (مذكر)'],
        grammar: '1. للنفي نضع **не** مباشرة قبل الفعل: Я не знаю (لا أعرف).\n2. للماضي نحذف -ть من المصدر ونضيف:\n• -л للمذكر | -ла للمؤنث | -ли للجمع.',
        examples: ['Вчера я читал статью. — أمس قرأت مقالاً (مذكر).', 'Вчера она была дома. — أمس كانت في البيت (مؤنث).'],
        pronunciationGuide: 'تُنطق не متصلة بالكلمة التالية بلا فصل طويل.',
        pronunciationText: 'Vchera ya ne rabotal. Ya chital knigu.',
        exercises: [
          { question_ar: 'ما علامة الماضي المفرد المؤنث في الفعل؟', options: ['-ла (مثل читала)', '-л (مثل читал)', '-ют'], correct_answer: '1', explanation_ar: 'اللاحقة -ла تشير للفاعل المؤنث في الماضي.', hint_ar: 'نهاية مؤنثة.', difficulty: 'beginner' },
          { question_ar: 'أين نضع أداة النفي не؟', options: ['قبل الفعل مباشرة', 'في نهاية الجملة', 'بعد المفعول به'], correct_answer: '1', explanation_ar: 'توضع не قبل الفعل الذي تنفيه.', hint_ar: 'Я не знаю.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-15-days-and-time',
        type: 'vocabulary',
        title: 'أيام الأسبوع وفصول السنة',
        vocab: ['Понедельник: الإثنين', 'Пятница: الجمعة', 'Суббота / Воскресенье: السبت / الأحد', 'Зима / Лето: الشتاء / الصيف'],
        grammar: 'للدلالة على يوم محدد نستخدم حرف الجر **в** + اليوم في حالة النصب: в пятницу (في يوم الجمعة)، في الإثنين: в понедельник.',
        examples: ['В пятницу мы отдыхаем. — في يوم الجمعة نستريح.', 'Зимой холодно, а летом тепло. — في الشتاء الجو بارد وفي الصيف دافئ.'],
        pronunciationGuide: 'كلمة Воскресенье تعني الأحد (وترتبط بيوم العطلة).',
        pronunciationText: 'Ponedelnik, pyatnitsa, subbota, voskresenye.',
        exercises: [
          { question_ar: 'ما معنى كلمة Пятница؟', options: ['الجمعة', 'الأحد', 'الإثنين'], correct_answer: '1', explanation_ar: 'Пятница (من رقم 5 пять) تعني الجمعة.', hint_ar: 'اليوم الخامس في الأسبوع الروسي.', difficulty: 'beginner' },
          { question_ar: 'ما معنى Лето؟', options: ['الصيف', 'الشتاء', 'الربيع'], correct_answer: '1', explanation_ar: 'Лето يعني الصيف و Зима تعني الشتاء.', hint_ar: 'الفصل الدافئ.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 4: الحياة اليومية والحالات البسيطة',
    lessons: [
      {
        slug: 'ru-b-16-location-prepositional',
        type: 'grammar',
        title: 'حالة المكان الأساسية (в / на + -е)',
        vocab: ['В городе: في المدينة', 'В университете: في الجامعة', 'На работе: في العمل', 'Дома: في البيت (حالة خاصة)'],
        grammar: 'عند السؤال بـ **Где?** (أين؟)، نضع حرف الجر **в** (في) أو **на** (على/في) ونغير نهاية الاسم غالباً إلى **-е**.\nاستثناء مهم: نقول **дома** (في البيت) بدون حرف جر!',
        examples: ['Я учусь в университете. — أدرس في الجامعة.', 'Мой брат сейчас дома. — أخي الآن في البيت.'],
        pronunciationGuide: 'حرف الجر в يُنطق متصلاً بالكلمة التالية، وقد يتحول صوته إلى f قبل الأحرف المهموسة مثل в школе (f shkole).',
        pronunciationText: 'Ya v universitete. Moi roditeli doma.',
        exercises: [
          { question_ar: 'كيف نقول "في البيت" بالروسية؟', options: ['дома', 'в дома', 'на доме'], correct_answer: '1', explanation_ar: 'дома ظرف مكان مستقل ولا يأخذ حرف جر.', hint_ar: 'كلمة واحدة بدون حرف جر.', difficulty: 'beginner' },
          { question_ar: 'كيف تتغير كلمة работа مع حرف الجر на (في العمل)؟', options: ['на работе', 'на работа', 'на работу'], correct_answer: '1', explanation_ar: 'تأخذ اللاحقة -е في حالة المجرور للمكان.', hint_ar: 'تنتهي بـ е.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-17-family-and-have',
        type: 'grammar',
        title: 'التعبير عن الملكية (У меня есть...)',
        vocab: ['У меня есть...: لديّ / عندي...', 'У тебя есть...?: هل لديك...؟', 'Брат: أخ', 'Сестра: أخت', 'Время: وقت'],
        grammar: 'تعبير "عندي" في الروسية هو: **У + [ضمير المالك] + есть + [الشيء]**.\nوفي النفي نستخدم **нет**: У меня нет времени (ليس عندي وقت).',
        examples: ['У меня есть брат и сестра. — لديّ أخ وأخت.', 'У вас есть вопрос? — هل لديكم سؤال؟'],
        pronunciationGuide: 'حرف т في есть يُنطق ناعماً (yest).',
        pronunciationText: 'U menya est brat i sestra. U vas est vopros?',
        exercises: [
          { question_ar: 'كيف تقول "لديّ كتاب"؟', options: ['У меня есть книга', 'Я имею есть книга', 'Меня книга'], correct_answer: '1', explanation_ar: 'الصيغة القياسية للملكية هي У меня есть...', hint_ar: 'تبدأ بـ У меня.', difficulty: 'beginner' },
          { question_ar: 'ما الكلمة التي تنفي الملكية (لا يوجد عندي)؟', options: ['нет', 'есть', 'да'], correct_answer: '1', explanation_ar: 'نستبدل есть بـ нет في النفي.', hint_ar: 'تعني لا يوجد.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-18-food-cafe',
        type: 'vocabulary',
        title: 'الطعام والمشروبات والطلب في المقهى',
        vocab: ['Хлеб: خبز', 'Сыр: جبن', 'Кофе: قهوة', 'Чай: شاي', 'Дайте, пожалуйста...: أعطني من فضلك...'],
        grammar: 'كلمة **Кофе** اسم مذكر غير متصرف في الفصحى التقليدية: чёрный кофе (قهوة سوداء). وللطلب المهذب: **Можно...? / Дайте, пожалуйста...**.',
        examples: ['Дайте, пожалуйста, чай с лимоном. — أعطني شاياً بالليمون من فضلك.', 'Сколько это стоит? — كم يكلف هذا؟'],
        pronunciationGuide: 'في пожалуйста الحرف й لا يكاد يُنطق في الكلام السريع (بَجالُستا).',
        pronunciationText: 'Dayte, pozhaluysta, chashku kofe. Skolko eto stoit?',
        exercises: [
          { question_ar: 'كيف تسأل "كم يكلف هذا؟" بالروسية؟', options: ['Сколько это стоит?', 'Где это находится?', 'Как это зовут?'], correct_answer: '1', explanation_ar: 'Сколько تعني كم و стоит يعني يكلف.', hint_ar: 'تبدأ بـ Сколько.', difficulty: 'beginner' },
          { question_ar: 'ما معنى كلمة Хлеб؟', options: ['خبز', 'ماء', 'لحم'], correct_answer: '1', explanation_ar: 'Хлеб تعني خبز.', hint_ar: 'يُشترى من المخبز.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-19-want-and-can',
        type: 'grammar',
        title: 'التعبير عن الرغبة والقدرة (Хотеть / Мочь)',
        vocab: ['Хочу (Khochu): أريد', 'Могу (Mogu): أستطيع', 'Нужно (Nuzhno): يجب / ينبغي', 'Помочь: يساعد'],
        grammar: 'يتبع الفعلين Хотеть (يريد) و Мочь (يستطيع) فعل في المصدر:\n• Я хочу учить русский язык. (أريد أن أتعلم الروسية.)\n• Вы можете помочь? (هل تستطيعون المساعدة؟)',
        examples: ['Я хочу говорить свободно. — أريد أن أتحدث بطلاقة.', 'Я могу прочитать этот текст. — أستطيع قراءة هذا النص.'],
        pronunciationGuide: 'تصريف Хотеть يتبدل بين ч و т: Я хочу، لكن Мы хотим.',
        pronunciationText: 'Ya khochu uchit russkiy yazyk. Ya mogu pomoch.',
        exercises: [
          { question_ar: 'ما معنى Я хочу؟', options: ['أنا أريد', 'أنا أنام', 'أنا أذهب'], correct_answer: '1', explanation_ar: 'Я хочу من فعل хотеть وتعني أنا أريد.', hint_ar: 'تعبر عن الرغبة.', difficulty: 'beginner' },
          { question_ar: 'ما الشكل الصحيح للفعل بعد Я могу؟', options: ['فعل في المصدر (مثل читать)', 'اسم مكان', 'رقم'], correct_answer: '1', explanation_ar: 'يأتي بعد الأفعال المساعدة مصدر ينتهي بـ -ть.', hint_ar: 'يماثل to + verb.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'ru-b-20-reading-dialogue',
        type: 'reading',
        title: 'مشروع القراءة الختامي: تعارف ومخطط يومي',
        vocab: ['Утром: صباحاً', 'Днём: نهاراً', 'Вечером: مساءً', 'Потому что: لأن'],
        grammar: 'نص ختامي متكامل:\n"Привет! Меня зовут Тимур. Утром я учусь в университете, а вечером читаю книги и учу программирование, потому что я хочу стать инженером."',
        examples: ['Утром я пью чай и повторяю слова. — في الصباح أشرب الشاي وأراجع الكلمات.'],
        pronunciationGuide: 'لاحظ تحول أسماء أوقات اليوم إلى ظروف عند حذف حرف الجر وإضافة -ом: утро -> утром (صباحاً).',
        pronunciationText: 'Utrom ya uchus v universitete, a vecherom chitayu knigi.',
        exercises: [
          { question_ar: 'ماذا يفعل تيمور في المساء (вечером) حسب النص؟', options: ['يقرأ الكتب ويتعلم البرمجة', 'ينام طوال اليوم', 'يذهب إلى المطعم'], correct_answer: '1', explanation_ar: 'ورد في النص: вечером читаю книги и учу программирование.', hint_ar: 'ابحث عن كلمة вечером.', difficulty: 'beginner' },
          { question_ar: 'ما معنى عبارة Потому что؟', options: ['لأن', 'لكن', 'أين'], correct_answer: '1', explanation_ar: 'Потому что أداة ربط سببية تعني "لأن".', hint_ar: 'توضح السبب.', difficulty: 'beginner' },
        ],
      },
    ],
  },
];

// ==================== 4. CHINESE (20 Beginner) ====================
const CHINESE_BEGINNER_UNITS = [
  {
    title: 'الوحدة 1: النغمات والبينين والتحيات',
    lessons: [
      {
        slug: 'zh-b-01-four-tones',
        type: 'pronunciation',
        title: 'النغمات الأربع (四声) وأهميتها في المعنى',
        vocab: ['mā (妈): أم (نغمة 1)', 'má (麻): قنب (نغمة 2)', 'mǎ (马): حصان (نغمة 3)', 'mà (骂): يوبخ (نغمة 4)'],
        grammar: 'في الصينية (الماندرين)، تغيير النغمة يغيّر المعنى كلياً:\n1. عالية مستوية (ˉ)\n2. صاعدة كالسؤال (ˊ)\n3. هابطة ثم صاعدة (ˇ)\n4. هابطة سريعة حازمة (ˋ)',
        examples: ['妈妈 (māma) — أمي', '买马 (mǎi mǎ) — يشتري حصاناً'],
        pronunciationGuide: 'تدرب على النغمة الرابعة بنطق حاسم وقصير من الأعلى للأسفل، وعلى الثالثة بالهبوط ثم الصعود الخفيف.',
        pronunciationText: 'Ma1, ma2, ma3, ma4. Mama mai ma.',
        exercises: [
          { question_ar: 'ماذا يحدث إذا نُطقت كلمة صينية بنغمة خاطئة؟', options: ['يتغير معنى الكلمة تماماً', 'لا يتغير المعنى أبداً', 'تتحول إلى صيغة الجمع'], correct_answer: '1', explanation_ar: 'الصينية لغة نغمية؛ فالنغمة جزء أساسي من هوية الكلمة ومعناها.', hint_ar: 'تذكّر الفرق بين mā و mǎ.', difficulty: 'beginner' },
          { question_ar: 'أي نغمة تُنطق عالية ومستوية دون صعود أو هبوط؟', options: ['النغمة الأولى (ˉ)', 'النغمة الثانية (ˊ)', 'النغمة الرابعة (ˋ)'], correct_answer: '1', explanation_ar: 'النغمة الأولى عالية ومستقرة.', hint_ar: 'خط أفقي مستقيم.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-02-pinyin-initials',
        type: 'pronunciation',
        title: 'نظام البينين (Pinyin) والأصوات الصعبة (zh, ch, sh, x, q)',
        vocab: ['zhōng (中): وسط', 'chī (吃): يأكل', 'shū (书): كتاب', 'xué (学): يتعلم', 'qù (去): يذهب'],
        grammar: 'البينين هو نظام الكتابة بالأحرف اللاتينية لتعلّم النطق:\n• **q** يُنطق "تش" ناعمة مع ابتسامة خفيفة (qù).\n• **x** يُنطق "ش" ناعمة جداً (xué).\n• **zh** قريب من "ج" مع ثني طرف اللسان للخلف قليلاً.',
        examples: ['我学习中文。(Wǒ xuéxí Zhōngwén.) — أتعلم الصينية.', '我看书。(Wǒ kàn shū.) — أقرأ كتاباً.'],
        pronunciationGuide: 'لا تنطق q مثل الكاف الإنجليزية أبداً! هي صوت تش مخفف ومهموس.',
        pronunciationText: 'Zhongwen, chi, shu, xuexi, qu.',
        exercises: [
          { question_ar: 'ما وظيفة نظام البينين (Pinyin)؟', options: ['تمثيل النطق الصحيح للمقاطع الصينية بالأحرف اللاتينية', 'ترجمة الأسماء الروسية', 'استبدال القواعد'], correct_answer: '1', explanation_ar: 'البينين يساعد المتعلمين على قراءة النطق والنغمات بدقة.', hint_ar: 'يشبه الروماجي في اليابانية.', difficulty: 'beginner' },
          { question_ar: 'ما معنى الكلمة الصينية 书 (shū)؟', options: ['كتاب', 'ماء', 'بيت'], correct_answer: '1', explanation_ar: 'shū تعني كتاب.', hint_ar: 'في جملة 我看书.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-03-greetings-politeness',
        type: 'vocabulary',
        title: 'التحيات اليومية وعبارات اللباقة',
        vocab: ['你好 (Nǐ hǎo): مرحباً', '您好 (Nín hǎo): مرحباً (احترام)', '谢谢 (Xièxie): شكراً', '不客气 (Bú kèqi): عفواً / على الرحب', '对不起 (Duìbuqǐ): آسف'],
        grammar: 'تغيير النغمة التلقائي (Tone Sandhi): عند التقاء نغمتين ثالثتين مثل nǐ + hǎo، تتحول الأولى نطقاً إلى النغمة الثانية فتُسمع ní hǎo.',
        examples: ['您好！请问您贵姓？(مرحباً بحضرتك! ما اسم العائلة الكريم؟)', '谢谢你！— 不客气。(شكراً لك! — على الرحب.)'],
        pronunciationGuide: 'في 您好 (Nín hǎo)، الحرف 您 يُستخدم لكبار السن والمعلمين للاحترام.',
        pronunciationText: 'Ni hao! Nin hao! Xiexie! Bu keqi!',
        exercises: [
          { question_ar: 'كيف ترد بأدب على من يقول لك 谢谢 (شكراً)؟', options: ['不客气 (Bú kèqi)', '对不起 (Duìbuqǐ)', '再见 (Zàijiàn)'], correct_answer: '1', explanation_ar: '不客气 تعني عفواً أو لا داعي للشكر.', hint_ar: 'تبدأ بـ bù.', difficulty: 'beginner' },
          { question_ar: 'ما الفرق بين 你好 و 您好؟', options: ['您好 صيغة أكثر احتراماً ورسمية', '您好 للجمع فقط', 'لا فرق بينهما'], correct_answer: '1', explanation_ar: 'الرمز 您 (بإضافة قلب 心 في الأسفل) يدل على التقدير والاحترام.', hint_ar: 'للمعلمين والكبار.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-04-pronouns-shi',
        type: 'grammar',
        title: 'الضمائر وفعل الكينونة 是 (shì)',
        vocab: ['我 (wǒ): أنا', '你 (nǐ): أنت', '他 / 她 (tā): هو / هي', '们 (-men): علامة الجمع للضمائر', '老师 (lǎoshī): معلم', '学生 (xuésheng): طالب'],
        grammar: 'الفعل **是 (shì)** لا يتغير بتغير الضمير أو الزمن! ولجمع الضمائر نضيف **们**:\n• 我们 (نحن) | 你们 (أنتم) | 他们 (هم)\nمثال: 我是学生 (أنا طالب).',
        examples: ['我是学生，她是老师。(أنا طالب، وهي معلمة.)', '我们都是朋友。(نحن جميعاً أصدقاء.)'],
        pronunciationGuide: 'لاحظ أن 他 (هو) و 她 (هي) لهما نفس النطق تماماً tā، والاختلاف في الرسم فقط.',
        pronunciationText: 'Wo shi xuesheng. Ta shi laoshi. Women shi pengyou.',
        exercises: [
          { question_ar: 'ما لاحقة الجمع التي تُضاف للضمائر في الصينية (مثل أنا -> نحن)؟', options: ['们 (-men)', '吗 (-ma)', '的 (-de)'], correct_answer: '1', explanation_ar: '我 (أنا) + 们 = 我们 (نحن).', hint_ar: 'في 我们 و 他们.', difficulty: 'beginner' },
          { question_ar: 'ماذا يعني الفعل 是 (shì)؟', options: ['يكون (am/is/are)', 'يأكل', 'يقرأ'], correct_answer: '1', explanation_ar: '是 يربط الاسم بالخبر مثل هو/يكون.', hint_ar: '我是学生.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-05-numbers-1-to-99',
        type: 'vocabulary',
        title: 'الأرقام الصينية (1 إلى 99) بالمنطق البسيط',
        vocab: ['一 (yī): 1', '二 (èr): 2', '三 (sān): 3', '四 (sì): 4', '五 (wǔ): 5', '十 (shí): 10', '二十 (èrshí): 20'],
        grammar: 'من 11 إلى 99 التركيب منطقي جداً:\n• 14 = 10 + 4 = 十四 (shísì)\n• 35 = 3 × 10 + 5 = 三十五 (sānshíwǔ)',
        examples: ['二十五 (èrshíwǔ) = 25', '九十九 (jiǔshíjiǔ) = 99'],
        pronunciationGuide: 'الرقم 4 (sì) نغمة رابعة حادة، بينما 10 (shí) نغمة ثانية صاعدة.',
        pronunciationText: 'Yi, er, san, si, wu, liu, qi, ba, jiu, shi.',
        exercises: [
          { question_ar: 'كيف نركب الرقم 25 بالصينية؟', options: ['二十五 (èrshíwǔ)', '五十二 (wǔshíèr)', '二五'], correct_answer: '1', explanation_ar: '2 (èr) + 10 (shí) + 5 (wǔ) = 25.', hint_ar: 'اثنان عشرة خمسة.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 十 (shí)؟', options: ['10', '5', '1'], correct_answer: '1', explanation_ar: 'الرمز 十 يمثل الرقم 10.', hint_ar: 'يشبه علامة الجمع.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 2: الأسئلة والنفي والملكية',
    lessons: [
      {
        slug: 'zh-b-06-questions-ma',
        type: 'grammar',
        title: 'أسئلة نعم/لا باستخدام الأداة 吗 (ma)',
        vocab: ['吗 (ma): هل؟', '忙 (máng): مشغول', '累 (lèi): متعب', '好 (hǎo): بخير / جيد'],
        grammar: 'نضيف الأداة **吗 (ma)** في نهاية أي جملة خبرية لتحويلها فوراً إلى سؤال هل:\n• 你忙吗？ (هل أنت مشغول؟)\n• 你是老师吗？ (هل أنت معلم؟)',
        examples: ['你好吗？— 我很好，谢谢。(كيف حالك؟ — أنا بخير جداً، شكراً.)', '你学习汉语吗？(هل تدرس اللغة الصينية؟)'],
        pronunciationGuide: '吗 نغمة محايدة خفيفة جداً في آخر السؤال.',
        pronunciationText: 'Ni mang ma? Wo hen hao, xiexie.',
        exercises: [
          { question_ar: 'أين نضع أداة الاستفهام 吗 في السؤال الصيني؟', options: ['في نهاية الجملة', 'في بداية الجملة', 'قبل الفعل'], correct_answer: '1', explanation_ar: 'تأتي 吗 دائماً في ختام الجملة.', hint_ar: 'تشبه か اليابانية.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 你忙吗？', options: ['هل أنت مشغول؟', 'أين بيتك؟', 'ما اسمك؟'], correct_answer: '1', explanation_ar: '忙 (máng) تعني مشغول.', hint_ar: 'مقطع mang.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-07-negation-bu-mei',
        type: 'grammar',
        title: 'أداتا النفي 不 (bù) و 没 (méi)',
        vocab: ['不 (bù): لا / ليس (للحاضر والصفات)', '不是 (bú shì): ليس', '没有 (méiyǒu): لا يملك / لم يحدث في الماضي'],
        grammar: '• **不**: تنفي الحاضر والمستقبل والصفات (我不忙: لست مشغولاً؛ 我不是医生).\n• **没**: تنفي الفعل 有 (يملك) دائماً -> 没有 (لا يملك)، وتنفي وقوع فعل في الماضي.',
        examples: ['我不是医生，我是工程师。(لست طبيباً، أنا مهندس.)', '我没有时间。(ليس لديّ وقت.)'],
        pronunciationGuide: 'تتحول نغمة 不 إلى الصاعدة (bú) إذا جاء بعدها حرف نغمة رابعة مثل 不是 (bú shì).',
        pronunciationText: 'Wo bu mang. Wo bu shi yisheng. Wo meiyou shijian.',
        exercises: [
          { question_ar: 'أي أداة نفي تُستخدم دائماً مع الفعل 有 (يملك)؟', options: ['没 (méiyǒu)', '不 (bùyǒu)', '吗'], correct_answer: '1', explanation_ar: 'الفعل 有 لا يُنفى أبداً بـ 不 بل دائماً بـ 没 -> 没有.', hint_ar: 'أداة النفي الثانية.', difficulty: 'beginner' },
          { question_ar: 'كيف تنفي الجملة 我是学生؟', options: ['我不是学生', '我没是学生', '我是学生吗'], correct_answer: '1', explanation_ar: 'نضع 不 قبل 是.', hint_ar: '不是.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-08-possessive-de',
        type: 'grammar',
        title: 'أداة الملكية والوصف 的 (de)',
        vocab: ['我的 (wǒ de): لي / خاصتي', '你的 (nǐ de): لك', '爸爸 (bàba): أب', '手机 (shǒujī): هاتف محمول'],
        grammar: 'تُوضع الأداة **的 (de)** بين المالك والمملوك:\n• 我的书 (كتابي)\n• 老师的电脑 (حاسوب المعلم)\nملاحظة: مع أفراد العائلة المقربين يمكن حذف 的 اختصاراً (我妈妈).',
        examples: ['这是我的手机。(هذا هاتفي.)', '他的汉语很好。(صينيته ممتازة.)'],
        pronunciationGuide: 'تُنطق 的 (de) بنغمة محايدة قصيرة.',
        pronunciationText: 'Zhe shi wo de shouji. Ta de Hanyu hen hao.',
        exercises: [
          { question_ar: 'كيف نقول "كتابي" بالصينية؟', options: ['我的书 (wǒ de shū)', '书的我', '我吗书'], correct_answer: '1', explanation_ar: 'المالك أولاً ثم 的 ثم المملوك.', hint_ar: 'wǒ + de + shū.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 手机 (shǒujī)؟', options: ['هاتف محمول', 'طاولة', 'مدرسة'], correct_answer: '1', explanation_ar: 'حرفياً آلة اليد، وتعني الهاتف المحمول.', hint_ar: '手 تعني يد.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-09-name-and-nationality',
        type: 'vocabulary',
        title: 'الاسم والجنسية (叫 / 哪国人)',
        vocab: ['叫 (jiào): يُدعى', '什么名字 (shénme míngzi): ما الاسم؟', '哪国人 (nǎ guó rén): من أي بلد؟', '人 (rén): شخص / إنسان'],
        grammar: 'لتكوين الجنسية: [اسم البلد] + **人**:\n• 中国人 (صيني) | 日本人 (ياباني) | 沙特人 (سعودي) | 埃及人 (مصري).',
        examples: ['你叫什么名字？— 我叫艾哈迈德。(ما اسمك؟ — اسمي أحمد.)', '你是哪国人？(من أي بلد أنت؟)'],
        pronunciationGuide: 'في 什么 (shénme)، انتبه للنغمة الصاعدة على shén.',
        pronunciationText: 'Ni jiao shenme mingzi? Ni shi na guo ren?',
        exercises: [
          { question_ar: 'ما الرمز الذي يُضاف بعد اسم البلد لتكوين الجنسية؟', options: ['人 (rén)', '书 (shū)', '吗 (ma)'], correct_answer: '1', explanation_ar: '人 تعني إنسان/شخص، وبإضافتها للبلد تدل على الجنسية.', hint_ar: 'موجود في 中国人.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 你叫什么名字؟', options: ['ما اسمك؟', 'كم عمرك؟', 'أين تعمل؟'], correct_answer: '1', explanation_ar: 'تُسأل بها عن الاسم.', hint_ar: 'míngzi تعني اسم.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-10-measure-words',
        type: 'grammar',
        title: 'كلمات القياس الأساسية (个 / 本)',
        vocab: ['个 (gè): أداة القياس العامة', '本 (běn): للكتب والدفاتر', '杯 (bēi): للأكواب', '一个人: شخص واحد', '两本书: كتابان'],
        grammar: 'في الصينية لا يلتقي الرقم بالاسم مباشرة، بل تتوسطهما أداة قياس:\n[الرقم] + [أداة القياس] + [الاسم]\nمهم: مع أدوات القياس نستخدم **两 (liǎng)** للرقم 2 وليس 二!',
        examples: ['我有两本中文书。(لديّ كتابان بالصينية.)', '我要一杯茶。(أريد كوب شاي.)'],
        pronunciationGuide: 'كلمة 两 (liǎng) تُستخدم للكميات (اثنان من شيء)، بينما 二 في العد والحساب.',
        pronunciationText: 'Yi ge pengyou. Liang ben shu. Yi bei cha.',
        exercises: [
          { question_ar: 'أي كلمة قياس تُستخدم مع الكتب (书)؟', options: ['本 (běn)', '杯 (bēi)', '岁 (suì)'], correct_answer: '1', explanation_ar: '本 تُستخدم للكتب والمجلدات.', hint_ar: '两本书.', difficulty: 'beginner' },
          { question_ar: 'أي كلمة تعني "اثنان" قبل كلمات القياس مثل "كتابان"؟', options: ['两 (liǎng)', '二 (èr)', '十 (shí)'], correct_answer: '1', explanation_ar: 'نستخدم 两 قبل كلمات القياس.', hint_ar: 'liang ben shu.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 3: الأفعال والزمن والأماكن',
    lessons: [
      {
        slug: 'zh-b-11-this-that-where',
        type: 'vocabulary',
        title: 'الإشارة والأماكن (这 / 那 / 哪儿)',
        vocab: ['这 (zhè): هذا', '那 (nà): ذلك', '这儿 / 这里: هنا', '那儿 / 那里: هناك', '哪儿 / 哪里: أين؟'],
        grammar: 'للسؤال عن المكان:\n[الشيء/الشخص] 在 **哪儿**？ (أين يوجد...؟)\nحرف **在 (zài)** يعني "يوجد في / متواجد".',
        examples: ['图书馆在哪儿？— 在那里。(أين المكتبة؟ — هناك.)', '我在家学习。(أنا أدرس في البيت.)'],
        pronunciationGuide: 'الفرق بين 那 (nà هناك) و 哪 (nǎ أين) في النغمة: الرابعة مقابل الثالثة.',
        pronunciationText: 'Zhe shi shudian. Tushuguan zai nar? Zai nar.',
        exercises: [
          { question_ar: 'ما الفعل/الحرف الذي يعني "يوجد في"؟', options: ['在 (zài)', '是 (shì)', '叫 (jiào)'], correct_answer: '1', explanation_ar: '在 يدل على التواجد في مكان.', hint_ar: '我在家.', difficulty: 'beginner' },
          { question_ar: 'ما أداة السؤال عن المكان "أين"؟', options: ['哪儿 / 哪里', '什么', '多少'], correct_answer: '1', explanation_ar: '哪儿 (nǎr) أو 哪里 (nǎlǐ) تعني أين.', hint_ar: 'نغمة ثالثة.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-12-dates-days',
        type: 'vocabulary',
        title: 'أيام الأسبوع والتواريخ (星期 / 月 / 号)',
        vocab: ['星期一 (Xīngqīyī): الإثنين', '星期五: الجمعة', '星期天 / 星期日: الأحد', '今天 (jīntiān): اليوم', '明天 (míngtiān): غداً'],
        grammar: 'أيام الأسبوع تبدأ بـ **星期** + الرقم من 1 إلى 6، أما الأحد فهو **星期天** أو 星期日!\nالتاريخ يُكتب من الأكبر للأصغر: السنة -> الشهر (月) -> اليوم (号).',
        examples: ['今天是星期三。(اليوم هو الأربعاء.)', '明天我有汉语课。(غداً لديّ حصة لغة صينية.)'],
        pronunciationGuide: 'ترتيب الزمن في الجملة الصينية يبدأ بـ الكبير ثم الأصغر، ويوضع قبل الفعل غالباً.',
        pronunciationText: 'Jintian shi xingqiyi. Mingtian shi xingqier.',
        exercises: [
          { question_ar: 'كيف يُقال يوم الجمعة بالصينية؟', options: ['星期五 (Xīngqīwǔ)', '星期一 (Xīngqīyī)', '星期天'], correct_answer: '1', explanation_ar: 'الجمعة هو اليوم الخامس -> 星期 + 五.', hint_ar: '五 = 5.', difficulty: 'beginner' },
          { question_ar: 'ما ترتيب كتابة التاريخ في الصينية؟', options: ['من الأكبر للأصغر (سنة ثم شهر ثم يوم)', 'من الأصغر للأكبر', 'اليوم ثم السنة فقط'], correct_answer: '1', explanation_ar: 'الصينية ترتب الزمن والمكان من العام/الكبير إلى الخاص/الصغير.', hint_ar: 'السنة أولاً.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-13-telling-time',
        type: 'vocabulary',
        title: 'الوقت والساعات (点 / 分 / 半)',
        vocab: ['现在几点？: كم الساعة الآن؟', '点 (diǎn): ساعة (توقيت)', '分 (fēn): دقيقة', '半 (bàn): نصف'],
        grammar: 'بنية الساعة: [الرقم] 点 [الدقائق] 分:\n• 8:00 = 八点 (bā diǎn)\n• 8:30 = 八点半 (bā diǎn bàn)\n• 9:15 = 九点十五分',
        examples: ['现在几点？— 现在九点半。(كم الساعة الآن؟ التاسعة والنصف.)', '我七点起床。(أستيقظ الساعة السابعة.)'],
        pronunciationGuide: 'كلمة 现在 (xiànzài) تعني الآن.',
        pronunciationText: 'Xianzai ji dian? Xianzai jiudian ban.',
        exercises: [
          { question_ar: 'ما معنى 八点半 (bā diǎn bàn)؟', options: ['الثامنة والنصف', 'الثامنة صباحاً فقط', 'الثالثة'], correct_answer: '1', explanation_ar: '八 (8) + 点 (ساعة) + 半 (نصف).', hint_ar: '半 = نصف.', difficulty: 'beginner' },
          { question_ar: 'كيف تسأل "كم الساعة الآن؟"', options: ['现在几点？', '今天星期几？', '你是谁？'], correct_answer: '1', explanation_ar: '现在 (الآن) + 几点 (كم ساعة).', hint_ar: 'تحتوي على 点.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-14-daily-verbs',
        type: 'vocabulary',
        title: 'أفعال يومية شائعة وترتيب الجملة',
        vocab: ['去 (qù): يذهب', '来 (lái): يأتي', '看 (kàn): ينظر / يقرأ / يشاهد', '写 (xiě): يكتب', '工作 (gōngzuò): يعمل'],
        grammar: 'الترتيب القياسي في الصينية: **[الفاعل] + [الزمان] + [المكان] + [الفعل] + [المفعول]**.\nمثال: 我明天在图书馆看书 (أنا غداً في المكتبة أقرأ كتاباً).',
        examples: ['我去学校学习。(أذهب إلى المدرسة للدراسة.)', '她写汉字。(هي تكتب الحروف الصينية.)'],
        pronunciationGuide: '汉字 (Hànzì) تعني الرموز/المقاطع الصينية.',
        pronunciationText: 'Wo mingtian qu xuexiao xie Hanzi.',
        exercises: [
          { question_ar: 'أين يقع ظرف الزمان غالباً في الجملة الصينية؟', options: ['قبل الفعل (بعد أو قبل الفاعل)', 'دائماً بعد المفعول به في آخر كلمة', 'محذوف'], correct_answer: '1', explanation_ar: 'الزمان والمكان يسبقان الفعل الرئيسي في الصينية.', hint_ar: 'الفاعل + الزمان + المكان + الفعل.', difficulty: 'beginner' },
          { question_ar: 'ما معنى الفعل 写 (xiě)؟', options: ['يكتب', 'يشرب', 'ينام'], correct_answer: '1', explanation_ar: '写 يعني يكتب.', hint_ar: '写汉字.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-15-past-le',
        type: 'grammar',
        title: 'أداة إتمام الفعل 了 (le)',
        vocab: ['了 (le): علامة إتمام الحدث', '买了 (mǎi le): اشترى', '吃了 (chī le): أكل', '昨天 (zuótiān): أمس'],
        grammar: 'للتعبير عن إتمام حدث (ماضٍ منجز)، نضع **了** بعد الفعل (أو في نهاية الجملة). وعند النفي بـ **没** نحذف 了 تماماً!\n• 我买了两本书 (اشتريت كتابين)\n• 我没买书 (لم أشترِ كتباً)',
        examples: ['昨天我看了两个小时的书。(أمس قرأت ساعتين.)', '我今天没喝咖啡。(اليوم لم أشرب قهوة.)'],
        pronunciationGuide: '了 تُنطق بنغمة محايدة قصيرة جداً.',
        pronunciationText: 'Zuotian wo maile liang ben shu. Wo mei he kafei.',
        exercises: [
          { question_ar: 'ماذا نفعل بـ 了 عند نفي الفعل الماضي باستخدام 没؟', options: ['نحذف 了 ولا نستخدمها مع 没', 'نكررها مرتين', 'نضعها قبل الفاعل'], correct_answer: '1', explanation_ar: 'لا تجتمع 没 (لم يحدث) مع 了 (اكتمل الحدث).', hint_ar: 'تعارض في المعنى.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 昨天 (zuótiān)؟', options: ['أمس', 'اليوم', 'غداً'], correct_answer: '1', explanation_ar: '昨天 = أمس، 今天 = اليوم، 明天 = غداً.', hint_ar: 'يدل على الماضي.', difficulty: 'beginner' },
        ],
      },
    ],
  },
  {
    title: 'الوحدة 4: الرغبات والتسوق والمحادثة',
    lessons: [
      {
        slug: 'zh-b-16-want-and-can',
        type: 'grammar',
        title: 'أفعال الرغبة والقدرة (想 / 要 / 会)',
        vocab: ['想 (xiǎng): يودّ / يفكر في', '要 (yào): يريد / سيقوم بـ', '会 (huì): يستطيع (مهارة مكتسبة)', '说 (shuō): يتحدث'],
        grammar: '• **会 (huì)** تدل على مهارة تعلّمتها: 我会说中文 (أستطيع التحدث بالصينية).\n• **想 (xiǎng)** للرغبة اللطيفة: 我想喝茶 (أودّ شرب الشاي).',
        examples: ['我会写汉字。(أعرف كيف أكتب المقاطع الصينية.)', '我想去中国学习。(أودّ الذهاب إلى الصين للدراسة.)'],
        pronunciationGuide: '会 تُنطق huì (تنتهي بصوت اي).',
        pronunciationText: 'Wo hui shuo yidian Zhongwen. Wo xiang he cha.',
        exercises: [
          { question_ar: 'أي فعل يُستخدم للتعبير عن مهارة مكتسبة مثل "أستطيع التحدث بالصينية"؟', options: ['会 (huì)', '有 (yǒu)', '在 (zài)'], correct_answer: '1', explanation_ar: '会 يعبر عن معرفة/قدرة مكتسبة بالتعلم.', hint_ar: '我会说中文.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 我想喝茶؟', options: ['أود شرب الشاي', 'أكره الشاي', 'أين الشاي'], correct_answer: '1', explanation_ar: '想 تعني يود، 喝 يشرب، 茶 شاي.', hint_ar: 'رغبة.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-17-shopping-prices',
        type: 'vocabulary',
        title: 'التسوق والسؤال عن السعر (多少钱)',
        vocab: ['多少钱？(Duōshao qián?): كم السعر؟', '块 (kuài): وحدة العملة (يوان بالعامية)', '太贵了 (tài guì le): غالٍ جداً', '便宜 (piányi): رخيص'],
        grammar: 'للسؤال عن السعر: 这个多少钱？ (كم سعر هذا؟).\nالبنية **太 + [صفة] + 了** تعني "جداً / أكثر من اللازم": 太好了 (رائع جداً)!',
        examples: ['这个苹果多少钱？— 三块钱。(كم سعر هذه التفاحة؟ — 3 يوان.)', '这本书不太贵。(هذا الكتاب ليس غالياً جداً.)'],
        pronunciationGuide: 'كلمة 便宜 تُنطق piányi بنبرة صاعدة ثم محايدة.',
        pronunciationText: 'Zhege duoshao qian? Tai gui le, pianyi yidian ba.',
        exercises: [
          { question_ar: 'ما العبارة المستخدمة للسؤال عن السعر؟', options: ['多少钱？(Duōshao qián?)', '几点了？', '叫什么？'], correct_answer: '1', explanation_ar: '多少 (كم) + 钱 (مال).', hint_ar: 'فيها كلمة 钱.', difficulty: 'beginner' },
          { question_ar: 'ماذا تفيد الصيغة 太...了 (مثل 太好了)؟', options: ['التأكيد بمعنى "جداً / للغاية"', 'النفي الماضي', 'السؤال'], correct_answer: '1', explanation_ar: '太 + الصفة + 了 تشدد الصفة.', hint_ar: '太贵了 = غالٍ جداً.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-18-weather-adjectives',
        type: 'vocabulary',
        title: 'الطقس والصفات مع 很 (hěn)',
        vocab: ['天气 (tiānqì): الطقس', '冷 (lěng): بارد', '热 (rè): حار', '下雨 (xiàyǔ): تمطر', '很 (hěn): جداً / رابطة قبل الصفة'],
        grammar: 'في الجمل الوصفية الصينية لا نستخدم 是 قبل الصفة، بل نستخدم **很** كرابط طبيعي:\n• 今天很热 (الجو حار اليوم) — ولا نقول 今天是热.',
        examples: ['今天天气很好，不冷也不热。(طقس اليوم جميل جداً، ليس بارداً ولا حاراً.)'],
        pronunciationGuide: 'عندما تقول 今天很好 فإن 很 تعمل كرابط متوازن ولا تبالغ دائماً بمعنى "جداً".',
        pronunciationText: 'Jintian tianqi hen hao, bu leng ye bu re.',
        exercises: [
          { question_ar: 'أي جملة صحيحة لوصف أن اليوم بارد؟', options: ['今天很冷', '今天是冷', '今天有冷'], correct_answer: '1', explanation_ar: 'نربط المبتدأ بالصفة بـ 很 وليس بـ 是.', hint_ar: 'لا نستخدم 是 مع الصفات المفردة.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 天气 (tiānqì)؟', options: ['الطقس', 'الوقت', 'السعر'], correct_answer: '1', explanation_ar: '天气 تعني الطقس.', hint_ar: 'يتعلق بالبرد والحر.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-19-polite-requests-qing',
        type: 'vocabulary',
        title: 'الطلب المهذب والاستئذان (请 qǐng)',
        vocab: ['请 (qǐng): من فضلك / تفضل', '请坐 (qǐng zuò): تفضل بالجلوس', '请问 (qǐng wèn): لو سمحت أسأل...', '再说一遍: قل ذلك مرة أخرى'],
        grammar: 'نضع **请 (qǐng)** في بداية الجملة قبل الفعل لجعلها دعوة أو طلباً لطيفاً ومؤدباً.',
        examples: ['请问，地铁站在哪儿？(لو سمحت، أين محطة المترو؟)', '请进，请坐，请喝茶。(تفضل بالدخول والجلوس وشرب الشاي.)'],
        pronunciationGuide: '请 تبدأ بالصوت تش الخفيف (q) مع نغمة ثالثة.',
        pronunciationText: 'Qing jin! Qing zuo! Qingwen, ditezhan zai nar?',
        exercises: [
          { question_ar: 'ماذا تقول للضيف عند دعوته للجلوس بأدب؟', options: ['请坐 (qǐng zuò)', '请走', '多少钱'], correct_answer: '1', explanation_ar: '请 (تفضل) + 坐 (اجلس).', hint_ar: 'تبدأ بـ 请.', difficulty: 'beginner' },
          { question_ar: 'متى نستخدم 请问 (qǐngwèn)؟', options: ['قبل طرح سؤال على شخص بأدب', 'عند الوداع', 'بعد النوم'], correct_answer: '1', explanation_ar: '请问 تعني "أرجو المعذرة، هل لي بسؤال؟".', hint_ar: '问 تعني يسأل.', difficulty: 'beginner' },
        ],
      },
      {
        slug: 'zh-b-20-comprehensive-reading',
        type: 'reading',
        title: 'مشروع القراءة الشامل: حوار في مقهى ومكتبة',
        vocab: ['朋友 (péngyou): صديق', '一起 (yìqǐ): معاً', '高兴 (gāoxìng): سعيد', '进步 (jìnbù): يتقدم / يتحسن'],
        grammar: 'نص تطبيقي:\n"你好！我是大卫。今天星期六，我和朋友一起在书店看书。我很喜欢学习中文，我的朋友也会说一点儿阿拉伯语。我们都很高兴！"',
        examples: ['我们一起学习，一起进步。(نتعلم معاً ونتقدم معاً.)'],
        pronunciationGuide: 'كلمة 一起 تتحول نغمة 一 فيها إلى الرابعة: yìqǐ.',
        pronunciationText: 'Jintian xingqiliu, wo he pengyou yiqi zai shudian kanshu.',
        exercises: [
          { question_ar: 'أين يقرأ ديفيد وصديقه يوم السبت حسب النص؟', options: ['في مكتبة بيع الكتب (书店)', 'في المطعم', 'في المحطة'], correct_answer: '1', explanation_ar: 'ورد في النص: 在书店看书 (يقرآن في 书店).', hint_ar: 'ابحث عن الكلمة بعد 在.', difficulty: 'beginner' },
          { question_ar: 'ما معنى 一起 (yìqǐ)؟', options: ['معاً / سوياً', 'بمفردي', 'أمس'], correct_answer: '1', explanation_ar: '一起 تعني معاً.', hint_ar: '我和朋友一起.', difficulty: 'beginner' },
        ],
      },
    ],
  },
];

// ==================== INTERMEDIATE & ADVANCED ENRICHMENT ====================
const EXTRA_INTERMEDIATE_ADVANCED = [
  // English Intermediate & Advanced extra lessons
  ...makeCourseLessons('lang-english-intermediate', 'en', [
    {
      title: 'الوحدة المتوسطة: الأزمنة والتواصل المهني',
      lessons: [
        {
          slug: 'en-i-02-present-perfect',
          type: 'grammar',
          title: 'المضارع التام (Present Perfect) للخبرات والإنجازات',
          vocab: ['Experience: خبرة', 'Already / Yet: مسبقاً / بعد', 'Since / For: منذ / لمدة'],
          grammar: 'نستخدم `have/has + Past Participle` لربط الماضي بالحاضر دون تحديد لحظة زمنية منتهية: "I have studied English for two years."',
          examples: ['Have you ever built a web project? — هل سبق أن بنيت مشروع ويب؟', 'She has already completed five modules. — لقد أتمت خمس وحدات بالفعل.'],
          pronunciationGuide: 'تُختصر I have إلى I\'ve (/aɪv/).',
          pronunciationText: 'I have studied programming for two years.',
          exercises: [
            { question_ar: 'أي جملة صحيحة في المضارع التام؟', options: ['She has finished the lesson', 'She have finished the lesson', 'She has finish the lesson'], correct_answer: '1', explanation_ar: 'She تأخذ has مع التصريف الثالث finished.', hint_ar: 'has + V3.', difficulty: 'intermediate' },
          ],
        },
        {
          slug: 'en-i-03-conditionals-1-2',
          type: 'grammar',
          title: 'الجمل الشرطية (First & Second Conditionals)',
          vocab: ['Condition: شرط', 'Result: نتيجة', 'Unless: ما لم'],
          grammar: '• الشرط الواقعي (First): If + مضارع بسيط, will + مصدر.\n• الشرط التخيلي (Second): If + ماضٍ بسيط, would + مصدر.',
          examples: ['If you practice daily, you will improve quickly. — إن تدربت يومياً فستتحسن سريعاً.', 'If I had more time, I would learn Chinese too. — لو كان لدي وقت أكثر لتعلمت الصينية أيضاً.'],
          pronunciationGuide: 'اربط بين If و الفاعل بسلاسة دون وقفة طويلة.',
          pronunciationText: 'If you practice daily, you will improve your fluency.',
          exercises: [
            { question_ar: 'أكمل الشرط الأول: "If it rains tomorrow, we ___ at home."', options: ['will stay', 'stayed', 'staying'], correct_answer: '1', explanation_ar: 'في الشرط الواقعي للمستقبل نستخدم will + مصدر في جواب الشرط.', hint_ar: 'نتيجة مستقبلية.', difficulty: 'intermediate' },
          ],
        },
      ],
    },
  ]),
  ...makeCourseLessons('lang-english-advanced', 'en', [
    {
      title: 'الوحدة المتقدمة: التحليل والأسلوب الأكاديمي',
      lessons: [
        {
          slug: 'en-a-02-passive-academic',
          type: 'writing',
          title: 'المبني للمجهول الرسمي وصياغة التقارير',
          vocab: ['Implement: ينفذ', 'Evaluate: يقيّم', 'Hypothesis: فرضية', 'Evidence: دليل'],
          grammar: 'في الكتابة العلمية نركز على النتيجة باستخدام `be + Past Participle`: "The experiment was conducted under strict conditions."',
          examples: ['Multiple sources were compared before publishing the report. — قورنت مصادر متعددة قبل نشر التقرير.'],
          pronunciationGuide: 'ركز على وضوح المقطع المنبور في слова مثل hy-PO-the-sis.',
          pronunciationText: 'The hypothesis was evaluated using verifiable evidence.',
          exercises: [
            { question_ar: 'اختر الجملة الأكاديمية المصاغة بالمبني للمجهول:', options: ['The data was analyzed carefully', 'The data analyzed carefully', 'The data analyzing carefully'], correct_answer: '1', explanation_ar: 'البيانات تُحلَّل، لذا نستخدم was + analyzed.', hint_ar: 'was + تصريف ثالث.', difficulty: 'advanced' },
          ],
        },
      ],
    },
  ]),
  // Japanese Intermediate & Advanced extra lessons
  ...makeCourseLessons('lang-japanese-intermediate', 'ja', [
    {
      title: 'الوحدة المتوسطة: صيغة て والطلب والربط',
      lessons: [
        {
          slug: 'jp-i-02-te-form-requests',
          type: 'grammar',
          title: 'صيغة て (て-form) والطلب المهذب (〜てください)',
          vocab: ['かいて ください: اكتب من فضلك', 'みて ください: انظر من فضلك', 'おしえて ください: أخبرني / علّمني من فضلك'],
          grammar: 'تُستخدم صيغة て لربط الأفعال المتتالية وللطلب المهذب مع ください أو الاستمرار مع います.',
          examples: ['ゆっくり はなして ください。(تحدث ببطء من فضلك.)', 'いま にほんごを べんきょうして います。(أنا أدرس اليابانية الآن.)'],
          pronunciationGuide: 'كلمة ゆっくり تحتوي على حرف صامت مشدد っ يتوقف عنده النفس لحظة: yuk-kuri.',
          pronunciationText: 'Yukkuri hanashite kudasai. Eigo de kaite kudasai.',
          exercises: [
            { question_ar: 'ماذا تعني صيغة [فعل-て] + ください؟', options: ['طلب مهذب لفعل شيء من فضلك', 'نفي ماضٍ', 'سؤال عن السعر'], correct_answer: '1', explanation_ar: '〜てください تُستخدم للطلب المهذب مثل من فضلك افعل كذا.', hint_ar: 'تنتهي بـ kudasai.', difficulty: 'intermediate' },
          ],
        },
        {
          slug: 'jp-i-03-want-tai',
          type: 'grammar',
          title: 'التعبير عن الرغبة الشخصية (〜たい です)',
          vocab: ['いきたい: أريد أن أذهب', 'まなびたい: أريد أن أتعلم', 'よみたい: أريد أن أقرأ'],
          grammar: 'نحذف ます من الفعل ونضيف **たい です**: いきます -> いきたい です (أريد أن أذهب).',
          examples: ['らいねん きょうとへ いきたい です。(أريد الذهاب إلى كيوتو العام القادم.)'],
          pronunciationGuide: 'تُعامل صيغة たい في النفي كصفات い فتصبح たくない です.',
          pronunciationText: 'Rainen Nihon e ikitai desu.',
          exercises: [
            { question_ar: 'كيف تصوغ "أريد أن أقرأ" من الفعل よみます؟', options: ['よみたい です', 'よみません', 'よみました'], correct_answer: '1', explanation_ar: 'نستبدل ます بـ たい.', hint_ar: 'تنتهي بـ tai.', difficulty: 'intermediate' },
          ],
        },
      ],
    },
  ]),
  ...makeCourseLessons('lang-japanese-advanced', 'ja', [
    {
      title: 'الوحدة المتقدمة: الأسلوب الرسمي والتعابير المتقدمة',
      lessons: [
        {
          slug: 'jp-a-02-formal-connectors',
          type: 'reading',
          title: 'الربط الشرطي والسببي المتقدم (〜にもかかわらず / 〜によって)',
          vocab: ['にもかかわらず: على الرغم من', 'によって: بواسطة / تبعاً لـ', 'かん点 (かんてん): وجهة نظر'],
          grammar: 'تُستخدم هذه الأدوات في المقالات الإخبارية والأكاديمية لربط الأفكار المعقدة بموضوعية.',
          examples: ['けいけんが すくない にもかかわらず、かれは よく できました。(رغم قلة خبرته، أبلى بلاءً حسناً.)'],
          pronunciationGuide: 'اقرأ المقطع にもかかわらず بتسلسل دون تقطيع.',
          pronunciationText: 'Keiken ga sukunai ni mo kakawarazu, kare wa yoku dekimashita.',
          exercises: [
            { question_ar: 'ماذا يفيد التعبير にもかかわらず في السياق الرسمي؟', options: ['التناقض بمعنى "على الرغم من"', 'النتيجة', 'المقارنة العددية'], correct_answer: '1', explanation_ar: 'يعني "على الرغم من" في الكتابة الرسمية.', hint_ar: 'يدل على التناقض.', difficulty: 'advanced' },
          ],
        },
      ],
    },
  ]),
  // Russian Intermediate & Advanced extra lessons
  ...makeCourseLessons('lang-russian-intermediate', 'ru', [
    {
      title: 'الوحدة المتوسطة: المفعول به وأفعال الحركة',
      lessons: [
        {
          slug: 'ru-i-02-motion-verbs',
          type: 'grammar',
          title: 'أفعال الحركة الأساسية (Идти / Ходить / Ехать)',
          vocab: ['Идти: يمشي الآن (اتجاه واحد)', 'Ходить: يمشي ذهاباً وإياباً/عادةً', 'Ехать: يذهب بوسيلة نقل الآن'],
          grammar: 'تميّز الروسية بين المشي على الأقدام (идти/ходить) والانتقال بوسيلة نقل (ехать/ездить)، وبين الحركة في اتجاه واحد الآن والحركة المتكررة.',
          examples: ['Сейчас я иду в библиотеку. — أنا ماشٍ الآن إلى المكتبة.', 'Я часто хожу в спортзал. — أذهب غالباً إلى النادي الرياضي.'],
          pronunciationGuide: 'يُقرأ الفعل идти بوضوح id-ti.',
          pronunciationText: 'Seichas ya idu v universitet. Zavtra my edem v gorod.',
          exercises: [
            { question_ar: 'أي فعل نستخدم للذهاب بالسيارة أو القطار الآن؟', options: ['ехать', 'идти', 'читать'], correct_answer: '1', explanation_ar: 'ехать/ездить يُستخدمان للسفر أو الانتقال بمركبة.', hint_ar: 'بوسيلة نقل.', difficulty: 'intermediate' },
          ],
        },
      ],
    },
  ]),
  ...makeCourseLessons('lang-russian-advanced', 'ru', [
    {
      title: 'الوحدة المتقدمة: التراكيب المعقدة والروابط',
      lessons: [
        {
          slug: 'ru-a-02-complex-clauses',
          type: 'writing',
          title: 'الجمل الموصولة والشرطية المتقدمة (Который / Если бы)',
          vocab: ['Который: الذي/التي (يتغير إعرابه)', 'Если бы: لو أن (شرط افتراضي)', 'Несмотря на: على الرغم من'],
          grammar: 'في الشرط التخيلي نستخدم **Если бы + [فعل ماضٍ]** في شطري الجملة، وتتحول который حسب دورها الإعرابي.',
          examples: ['Если бы у меня было больше времени, я бы выучил ещё один язык. — لو كان لدي وقت أكثر لتعلمت لغة أخرى.'],
          pronunciationGuide: 'حافظ على نغمة التوكيد في الكلمة التي تسبق бы.',
          pronunciationText: 'Esli by u menya bylo vremya, ya by prochital etu knigu.',
          exercises: [
            { question_ar: 'ما التركيب الصحيح للشرط التخيلي بالروسية؟', options: ['Если бы + ماضٍ', 'Если бы + أمر', 'Когда + اسم فقط'], correct_answer: '1', explanation_ar: 'تتطلب бы في الجملة الشرطية غير الواقعية استخدام صيغة الماضي.', hint_ar: 'فيها бы.', difficulty: 'advanced' },
          ],
        },
      ],
    },
  ]),
  // Chinese Intermediate & Advanced extra lessons
  ...makeCourseLessons('lang-chinese-intermediate', 'zh', [
    {
      title: 'الوحدة المتوسطة: المقارنة والتجربة',
      lessons: [
        {
          slug: 'zh-i-02-comparison-bi',
          type: 'grammar',
          title: 'أسلوب المقارنة باستخدام 比 (bǐ)',
          vocab: ['比 (bǐ): مقارنةً بـ', '更 (gèng): أكثر', '一点儿 (yìdiǎnr): قليلاً', '一样 (yíyàng): متساوٍ'],
          grammar: 'البنية: **[أ] 比 [ب] + [الصفة]** (دون وضع 很 أبداً!).\n• 今天比昨天冷 (اليوم أبرد من أمس).',
          examples: ['汉字比拼音难一点儿。(المقاطع الصينية أصعب قليلاً من البينين.)'],
          pronunciationGuide: 'تذكر عدم استخدام 很 بعد 比؛ بل استخدم 一点儿 أو 得多 للتفاوت.',
          pronunciationText: 'Jintian bi zuotian leng yidianr.',
          exercises: [
            { question_ar: 'أي جملة مقارنة صينية صحيحة؟', options: ['今天比昨天热', '今天比昨天很热', '今天很比昨天热'], correct_answer: '1', explanation_ar: 'نستخدم [أ] 比 [ب] + [صفة] مباشرة بدون 很.', hint_ar: 'بدون 很.', difficulty: 'intermediate' },
          ],
        },
      ],
    },
  ]),
  ...makeCourseLessons('lang-chinese-advanced', 'zh', [
    {
      title: 'الوحدة المتقدمة: البلاغة وصياغة المقالات',
      lessons: [
        {
          slug: 'zh-a-02-ba-structure-discourse',
          type: 'writing',
          title: 'بنية 把 (bǎ) والتركيز على أثر الفعل',
          vocab: ['把 (bǎ): تقديم المفعول به لإبراز تأثير الفعل عليه', '不仅...而且...: ليس فقط... بل أيضاً...'],
          grammar: 'نستخدم **把** عندما نريد توضيح ما آلت إليه حالة المفعول به بعد الفعل:\n• 请把门关上 (من فضلك أغلق الباب) · 我把作业写完了 (أنهيت كتابة الواجب).',
          examples: ['不仅要多听，而且要多练习说。(ليس فقط الاستماع كثيراً، بل التمرن على التحدث أيضاً.)'],
          pronunciationGuide: 'التركيز الصوتي يكون على النتيجة بعد الفعل مثل 写完.',
          pronunciationText: 'Wo ba zuoye xiewanle.',
          exercises: [
            { question_ar: 'متى نستخدم بنية 把 (bǎ) في الصينية؟', options: ['عند إبراز نتيجة أو تغيير وقع على مفعول محدد', 'عند السؤال عن الوقت', 'للتعبير عن الجنسية'], correct_answer: '1', explanation_ar: 'تضع 把 المفعول به المحدد قبل الفعل لبيان ما حدث له أو نتيجته.', hint_ar: 'التركيز على أثر الفعل.', difficulty: 'advanced' },
          ],
        },
      ],
    },
  ]),
];

export const LANGUAGE_CURRICULUM_LESSONS = [
  ...makeCourseLessons('lang-english-beginner', 'en', ENGLISH_BEGINNER_UNITS),
  ...makeCourseLessons('lang-japanese-beginner', 'ja', JAPANESE_BEGINNER_UNITS),
  ...makeCourseLessons('lang-russian-beginner', 'ru', RUSSIAN_BEGINNER_UNITS),
  ...makeCourseLessons('lang-chinese-beginner', 'zh', CHINESE_BEGINNER_UNITS),
  ...EXTRA_INTERMEDIATE_ADVANCED,
];
