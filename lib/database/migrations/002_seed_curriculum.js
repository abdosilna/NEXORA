export const migration002 = {
  id: '002_seed_curriculum',
  name: 'Seed Language Academy, Programming Academy, Legal Knowledge & Anime Library, and default settings',
  up(db) {
    const insertCourse = db.prepare(`
      INSERT OR IGNORE INTO courses (slug, category, subject, title_ar, description_ar, level, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const getCourseBySlug = db.prepare('SELECT id FROM courses WHERE slug = ?');
    const insertLesson = db.prepare(`
      INSERT OR IGNORE INTO lessons (course_id, slug, lesson_type, title_ar, content_ar, examples_json, pronunciation_text, pronunciation_lang, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const getLessonBySlug = db.prepare('SELECT id FROM lessons WHERE slug = ?');
    const insertExercise = db.prepare(`
      INSERT INTO exercises (lesson_id, question_ar, options_json, correct_answer, explanation_ar, hint_ar, difficulty)
      SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE lesson_id = ? AND question_ar = ?)
    `);

    const coursesSeed = [
      // Language Academy: Japanese
      {
        slug: 'lang-japanese-beginner',
        category: 'language',
        subject: 'japanese',
        title_ar: 'اللغة اليابانية — المستوى المبتدئ',
        description_ar: 'أساسيات الهيراغانا والتحيات وتراكيب الجمل اليابانية البسيطة.',
        level: 'beginner',
        sort_order: 1,
        lessons: [
          {
            slug: 'jp-beg-vocab-greetings',
            lesson_type: 'vocabulary',
            title_ar: 'التحيات والمفردات اليومية (ياباني)',
            content_ar: 'تعلّم أهم التحيات اليابانية اليومية مع النطق الصحيح بالروماجي والكانا:\n• おはようございます (Ohayou gozaimasu): صباح الخير (رسمية)\n• こんにちは (Konnichiwa): مرحباً / طاب يومك\n• ありがとうございます (Arigatou gozaimasu): شكراً جزيلاً\n• すみません (Sumimasen): عذراً / لو سمحت',
            examples_json: JSON.stringify([
              'こんにちは、わたしはネクソラです。(Konnichiwa, watashi wa Nekusora desu.) — مرحباً، أنا نيكسورا.',
              'ありがとうございます。(Arigatou gozaimasu.) — شكراً جزيلاً لك.',
            ]),
            pronunciation_text: 'Konnichiwa, watashi wa gakusei desu. Arigatou gozaimasu.',
            pronunciation_lang: 'ja',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ما معنى التحية اليابانية "Konnichiwa (こんにちは)"؟',
                options: ['مرحباً / طاب يومك', 'تصبح على خير', 'وداعاً'],
                correct_answer: '1',
                explanation_ar: '"こんにちは" تُقال للترحيب خلال النهار وتعني مرحباً أو طاب يومك.',
                hint_ar: 'تُستخدم عند لقاء شخص في وقت الظهيرة.',
                difficulty: 'beginner',
              },
            ],
          },
          {
            slug: 'jp-beg-grammar-wa-desu',
            lesson_type: 'grammar',
            title_ar: 'قاعدة الجملة الاسمية (は / です)',
            content_ar: 'في اليابانية نربط المبتدأ بالخبر باستخدام الأداة は (تُنطق wa) ونختم الجملة الرسمية بـ です (desu).\nالتركيب: [الاسم 1] は [الاسم 2] です.\nمثال: わたしは がくせい です (أنا طالب).',
            examples_json: JSON.stringify([
              'わたしは エンジニア です。(أنا مهندس)',
              'これは ほん です。(هذا كتاب)',
            ]),
            pronunciation_text: 'Watashi wa gakusei desu. Kore wa hon desu.',
            pronunciation_lang: 'ja',
            sort_order: 2,
            exercises: [
              {
                question_ar: 'أي أداة تُستخدم للدلالة على موضوع الجملة في اليابانية؟',
                options: ['は (wa)', 'か (ka)', 'の (no)'],
                correct_answer: '1',
                explanation_ar: 'الحرف は عند استخدامه كأداة موضوع يُنطق wa ويربط الموضوع ببقية الجملة.',
                hint_ar: 'نطقها يختلف عن نطقها الأبجدي ha.',
                difficulty: 'beginner',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-japanese-intermediate',
        category: 'language',
        subject: 'japanese',
        title_ar: 'اللغة اليابانية — المستوى المتوسط',
        description_ar: 'صيغة て-form، الطلب المهذب، وفهم نصوص الحياة اليومية.',
        level: 'intermediate',
        sort_order: 2,
        lessons: [
          {
            slug: 'jp-int-reading-daily',
            lesson_type: 'reading',
            title_ar: 'فهم المقروء: في المكتبة (ياباني)',
            content_ar: 'النص:\nきのう、ともだちと としょかんへ いきました。にほんごの ほんを 二さつ かりました。とても おもしろかったです。\n\nالترجمة:\nأمس ذهبت إلى المكتبة مع صديقي. استعرت كتابين باللغة اليابانية. كانا ممتعين جداً.',
            examples_json: JSON.stringify([
              'としょかん (Toshokan) = مكتبة',
              'かりました (Karimashita) = استعرت',
            ]),
            pronunciation_text: 'Kinou, tomodachi to toshokan e ikimashita.',
            pronunciation_lang: 'ja',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'كم كتاباً استعار المتحدث في النص؟',
                options: ['كتاباً واحداً', 'كتابين', 'ثلاثة كتب'],
                correct_answer: '2',
                explanation_ar: 'ورد في النص "二さつ" (nisatsu) أي كتابان.',
                hint_ar: 'ابحث عن الرقم 二 في النص.',
                difficulty: 'intermediate',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-japanese-advanced',
        category: 'language',
        subject: 'japanese',
        title_ar: 'اللغة اليابانية — المستوى المتقدم',
        description_ar: 'لغة الاحترام (Keigo) والتعبير الأكاديمي والكتابة الاحترافية.',
        level: 'advanced',
        sort_order: 3,
        lessons: [
          {
            slug: 'jp-adv-writing-keigo',
            lesson_type: 'writing',
            title_ar: 'تمارين الكتابة الرسمية (Keigo)',
            content_ar: 'في اليابانية المتقدمة نستخدم صيغ التواضع (Kenjougo) والاحترام (Sonkeigo) في الرسائل الرسمية:\n• いたします (itashimasu) بدل します (أفعل بتواضع)\n• ご覧になる (goran ni naru) بدل 見る (ينظر باحترام).',
            examples_json: JSON.stringify([
              'ご確認いただけますでしょうか。(هل يمكنكم التكرم بالمراجعة؟)',
            ]),
            pronunciation_text: 'Gokakunin itadakemasu deshou ka.',
            pronunciation_lang: 'ja',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'أي صيغة تُعد من لغة التواضع (Kenjougo) للفعل します؟',
                options: ['いたします', 'します', 'やる'],
                correct_answer: '1',
                explanation_ar: 'صيغة いたします هي الصيغة الرسمية المتواضعة للفعل します في المراسلات.',
                hint_ar: 'تُستخدم عند التحدث عن أفعالك أمام شخص ذي مقام رسمي.',
                difficulty: 'advanced',
              },
            ],
          },
        ],
      },
      // Language Academy: English
      {
        slug: 'lang-english-beginner',
        category: 'language',
        subject: 'english',
        title_ar: 'اللغة الإنجليزية — المستوى المبتدئ',
        description_ar: 'المفردات الأساسية، المضارع البسيط، وبناء الجمل الواضحة.',
        level: 'beginner',
        sort_order: 4,
        lessons: [
          {
            slug: 'en-beg-vocab-core',
            lesson_type: 'vocabulary',
            title_ar: 'مفردات الدراسة والعمل (إنجليزي)',
            content_ar: 'أهم الكلمات اليومية:\n• Knowledge (/ˈnɒlɪdʒ/): معرفة\n• Practice (/ˈpræktɪs/): ممارسة\n• Schedule (/ˈʃedjuːl/): جدول زمني\n• Improve (/ɪmˈpruːv/): يحسّن',
            examples_json: JSON.stringify([
              'Daily practice helps you improve your English.',
              'I organize my study schedule every morning.',
            ]),
            pronunciation_text: 'Daily practice helps you improve your knowledge and study schedule.',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ما الكلمة الإنجليزية التي تعني "يحسّن"؟',
                options: ['Improve', 'Schedule', 'Forget'],
                correct_answer: '1',
                explanation_ar: 'الفعل Improve يعني يحسّن أو يطوّر، أما Schedule فتعني جدولاً.',
                hint_ar: 'تبدأ بحرف I.',
                difficulty: 'beginner',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-english-intermediate',
        category: 'language',
        subject: 'english',
        title_ar: 'اللغة الإنجليزية — المستوى المتوسط',
        description_ar: 'الأزمنة المركبة، الاستماع والفهم، وكتابة الفقرات المنظمة.',
        level: 'intermediate',
        sort_order: 5,
        lessons: [
          {
            slug: 'en-int-listening-habits',
            lesson_type: 'listening',
            title_ar: 'درس الاستماع والنطق: ربط الكلمات (Connected Speech)',
            content_ar: 'في النطق الإنجليزي الطبيعي، تندمج نهاية الكلمة الساكنة مع بداية الكلمة التالية المتحركة:\n• "pick it up" تُنطق متصلة: pi-ki-tup\n• "not at all" تُنطق: no-ta-tall.',
            examples_json: JSON.stringify([
              'Could you pick it up before noon?',
              'That is not a problem at all.',
            ]),
            pronunciation_text: 'Could you pick it up before noon? Not a problem at all.',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'متى يحدث ربط الكلمات (Linking) غالباً في الإنجليزية؟',
                options: [
                  'عند التقاء حرف ساكن في نهاية كلمة بحرف متحرك في بداية الكلمة التالية',
                  'فقط في بداية الجملة',
                  'عند التوقف بين الجمل',
                ],
                correct_answer: '1',
                explanation_ar: 'يربط المتحدثون الحرف الساكن الأخير بالحرف المتحرك التالي لجعل النطق سلساً.',
                hint_ar: 'تأمل مثال pick it up.',
                difficulty: 'intermediate',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-english-advanced',
        category: 'language',
        subject: 'english',
        title_ar: 'اللغة الإنجليزية — المستوى المتقدم',
        description_ar: 'الأسلوب الأكاديمي، النقد التحليلي، وصياغة الحجج بدقة.',
        level: 'advanced',
        sort_order: 6,
        lessons: [
          {
            slug: 'en-adv-grammar-inversion',
            lesson_type: 'grammar',
            title_ar: 'التقديم والتأخير للتوكيد (Negative Inversion)',
            content_ar: 'عند بدء الجملة بعبارات نفي مقيدة مثل "Not only" أو "Rarely"، نقلب الفعل المساعد قبل الفاعل:\n• Not only did she finish the project, but she also documented every module.\n• Rarely have we seen such consistent progress.',
            examples_json: JSON.stringify([
              'Seldom does a single tool solve every architectural problem.',
            ]),
            pronunciation_text: 'Not only did she finish the project, she also documented it clearly.',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'أي جملة تستخدم قاعدة التقديم (Inversion) بشكل صحيح؟',
                options: [
                  'Rarely have I seen such dedication.',
                  'Rarely I have seen such dedication.',
                  'Rarely seen I have such dedication.',
                ],
                correct_answer: '1',
                explanation_ar: 'بعد "Rarely" في بداية الجملة يأتي الفعل المساعد "have" قبل الفاعل "I".',
                hint_ar: 'ترتيب السؤال: فعل مساعد + فاعل.',
                difficulty: 'advanced',
              },
            ],
          },
        ],
      },
      // Language Academy: Russian
      {
        slug: 'lang-russian-beginner',
        category: 'language',
        subject: 'russian',
        title_ar: 'اللغة الروسية — المستوى المبتدئ',
        description_ar: 'الأبجدية السيريلية والتحيات الأساسية والجمل التعريفية.',
        level: 'beginner',
        sort_order: 7,
        lessons: [
          {
            slug: 'ru-beg-vocab-intro',
            lesson_type: 'pronunciation',
            title_ar: 'التحيات الروسية والنطق الأساسي',
            content_ar: 'أشهر عبارات البداية في الروسية:\n• Здравствуйте (Zdravstvuyte): مرحباً (رسمية)\n• Привет (Privet): أهلاً (ودية)\n• Спасибо (Spasibo): شكراً\n• Пожалуйста (Pozhaluysta): عفواً / من فضلك',
            examples_json: JSON.stringify([
              'Здравствуйте! Меня зовут Амир. (مرحباً! اسمي أمير.)',
            ]),
            pronunciation_text: 'Zdravstvuyte! Menya zovut Amir. Spasibo.',
            pronunciation_lang: 'ru',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ما معنى الكلمة الروسية "Спасибо"؟',
                options: ['شكراً', 'صباح الخير', 'وداعاً'],
                correct_answer: '1',
                explanation_ar: '"Спасибо" (سباسيبو) تعني شكراً.',
                hint_ar: 'نطقها القريب بالعربية: سباسيبو.',
                difficulty: 'beginner',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-russian-intermediate',
        category: 'language',
        subject: 'russian',
        title_ar: 'اللغة الروسية — المستوى المتوسط',
        description_ar: 'الحالات الإعرابية الأساسية وأفعال الحركة.',
        level: 'intermediate',
        sort_order: 8,
        lessons: [
          {
            slug: 'ru-int-grammar-cases',
            lesson_type: 'grammar',
            title_ar: 'حالة المجرور للمكان (Предложный падеж)',
            content_ar: 'للدلالة على المكان مع حرف الجر "в" (في) أو "на" (على)، يأخذ الاسم غالباً اللاحقة -е:\n• школа -> в школе (في المدرسة)\n• университет -> в университете (في الجامعة).',
            examples_json: JSON.stringify([
              'Я учусь в университете. (أنا أدرس في الجامعة.)',
            ]),
            pronunciation_text: 'Ya uchus v universitete.',
            pronunciation_lang: 'ru',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ما الصيغة الصحيحة لعبارة "في المدرسة" من كلمة школа؟',
                options: ['в школе', 'в школа', 'в школу'],
                correct_answer: '1',
                explanation_ar: 'في حالة المكان (Prepositional case) تتغير النهاية إلى -е فتصبح в школе.',
                hint_ar: 'الحرف الأخير يتحول إلى е.',
                difficulty: 'intermediate',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-russian-advanced',
        category: 'language',
        subject: 'russian',
        title_ar: 'اللغة الروسية — المستوى المتقدم',
        description_ar: 'اكتمال الفعل (Aspect) والأسلوب التحليلي.',
        level: 'advanced',
        sort_order: 9,
        lessons: [
          {
            slug: 'ru-adv-aspect',
            lesson_type: 'grammar',
            title_ar: 'الفعل التام والناقص (НСВ / СВ)',
            content_ar: 'تعتمد الروسية على التمييز بين الفعل المستمر/المتكرر (Несовершенный вид) والفعل المكتمل بنتيجة (Совершенный вид):\n• читать (يقرأ / مستمر) مقابل прочитать (أنهى قراءة كتاب كامل).',
            examples_json: JSON.stringify([
              'Я читал книгу два часа. / Я прочитал всю книгу.',
            ]),
            pronunciation_text: 'Ya prochital vsyu knigu vchera.',
            pronunciation_lang: 'ru',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'أي فعل يدل على إتمام القراءة بالكامل؟',
                options: ['прочитать', 'читать', 'читаю'],
                correct_answer: '1',
                explanation_ar: 'прочитать هو الفعل التام (СВ) الذي يشير إلى إنجاز الفعل بالكامل.',
                hint_ar: 'يبدأ بالسابقة про-.',
                difficulty: 'advanced',
              },
            ],
          },
        ],
      },
      // Language Academy: Chinese
      {
        slug: 'lang-chinese-beginner',
        category: 'language',
        subject: 'chinese',
        title_ar: 'اللغة الصينية — المستوى المبتدئ',
        description_ar: 'النغمات الأربع (Pinyin) والمفردات الأساسية للحوار.',
        level: 'beginner',
        sort_order: 10,
        lessons: [
          {
            slug: 'zh-beg-tones-greetings',
            lesson_type: 'pronunciation',
            title_ar: 'النغمات الأربع والتحيات (صيني)',
            content_ar: 'تعتمد الماندرين على 4 نغمات تغير معنى المقطع:\n• 你好 (Nǐ hǎo): مرحباً\n• 谢谢 (Xièxie): شكراً\n• 学习 (Xuéxí): يتعلم / يدرس\n• 再见 (Zàijiàn): إلى اللقاء',
            examples_json: JSON.stringify([
              '你好！我喜欢学习中文。(مرحباً! أحب تعلم الصينية.)',
            ]),
            pronunciation_text: 'Ni hao! Wo xihuan xuexi Zhongwen.',
            pronunciation_lang: 'zh',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ما معنى الكلمة الصينية "谢谢 (Xièxie)"؟',
                options: ['شكراً', 'مرحباً', 'وداعاً'],
                correct_answer: '1',
                explanation_ar: '"谢谢" (شيي شيي) تعني شكراً.',
                hint_ar: 'تُنطق Xièxie.',
                difficulty: 'beginner',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-chinese-intermediate',
        category: 'language',
        subject: 'chinese',
        title_ar: 'اللغة الصينية — المستوى المتوسط',
        description_ar: 'الروابط المنطقية وأداة الإتمام 了 وفهم النصوص.',
        level: 'intermediate',
        sort_order: 11,
        lessons: [
          {
            slug: 'zh-int-reading-connector',
            lesson_type: 'reading',
            title_ar: 'الربط السببي (因为...所以...)',
            content_ar: 'نستخدم التركيب 因为 (لأن)... 所以 (لذلك)... لبيان السبب والنتيجة:\n因为今天下雨，所以我在家学习。\n(لأن السماء تمطر اليوم، لذلك أدرس في المنزل.)',
            examples_json: JSON.stringify([
              '因为我每天练习，所以进步很快。(لأنني أتدرب يومياً، أتقدم بسرعة.)',
            ]),
            pronunciation_text: 'Yinwei wo meitian lianxi, suoyi jinbu hen kuai.',
            pronunciation_lang: 'zh',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ما الكلمة المكملة لـ "因为" في جملة السبب والنتيجة؟',
                options: ['所以 (لذلك)', '但是 (لكن)', '或者 (أو)'],
                correct_answer: '1',
                explanation_ar: 'التركيب القياسي هو 因为...所以... (لأن... لذلك...).',
                hint_ar: 'تعني "لذلك".',
                difficulty: 'intermediate',
              },
            ],
          },
        ],
      },
      {
        slug: 'lang-chinese-advanced',
        category: 'language',
        subject: 'chinese',
        title_ar: 'اللغة الصينية — المستوى المتقدم',
        description_ar: 'التعابير الاصطلاحية (Chengyu) والكتابة الرسمية.',
        level: 'advanced',
        sort_order: 12,
        lessons: [
          {
            slug: 'zh-adv-writing-chengyu',
            lesson_type: 'writing',
            title_ar: 'الأمثال الرباعية (Chengyu) في الكتابة',
            content_ar: 'التعبير 循序渐进 (Xún xù jiàn jìn) يعني التقدم خطوة بخطوة بانتظام، ويُستخدم بكثرة في المقالات التعليمية لإبراز قيمة التعلم المتدرج.',
            examples_json: JSON.stringify([
              '学习语言必须循序渐进。(تعلم اللغات يجب أن يسير خطوة بخطوة.)',
            ]),
            pronunciation_text: 'Xuexi yuyan bixu xunxu jianjin.',
            pronunciation_lang: 'zh',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ماذا يعني التعبير الصيني 循序渐进؟',
                options: ['التدرج المنظم خطوة بخطوة', 'السرعة دون تخطيط', 'التوقف عن الدراسة'],
                correct_answer: '1',
                explanation_ar: 'يرمز 循序渐进 إلى الاتباع المنظم للمراحل والتقدم التدريجي.',
                hint_ar: 'يشير إلى التعلم المتدرج.',
                difficulty: 'advanced',
              },
            ],
          },
        ],
      },
      // Programming Academy: Python, HTML, CSS, JavaScript, Node.js
      {
        slug: 'prog-python-core',
        category: 'programming',
        subject: 'python',
        title_ar: 'أكاديمية البرمجة — Python',
        description_ar: 'المتغيرات، الدوال، هياكل البيانات، ومعالجة الأخطاء بأسلوب واضح.',
        level: 'beginner',
        sort_order: 13,
        lessons: [
          {
            slug: 'py-lesson-1-functions',
            lesson_type: 'lesson',
            title_ar: 'الدوال والقوائم في Python',
            content_ar: 'تُعرّف الدالة في بايثون بالكلمة المفتاحية def:\n\n```python\ndef average(scores):\n    if not scores:\n        return 0\n    return sum(scores) / len(scores)\n\nprint(average([85, 90, 95]))  # 90.0\n```\nلاحظ التحقق من القائمة الفارغة لتجنب القسمة على صفر.',
            examples_json: JSON.stringify([
              'def greet(name): return f"مرحباً {name}"',
            ]),
            pronunciation_text: '',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ماذا يعيد استدعاء average([]) في المثال السابق؟',
                options: ['0', 'خطأ ZeroDivisionError', 'None'],
                correct_answer: '1',
                explanation_ar: 'الشرط `if not scores:` يلتقط القائمة الفارغة ويعيد 0 بأمان قبل القسمة.',
                hint_ar: 'انظر إلى السطر الثاني داخل الدالة.',
                difficulty: 'beginner',
              },
            ],
          },
        ],
      },
      {
        slug: 'prog-html-core',
        category: 'programming',
        subject: 'html',
        title_ar: 'أكاديمية البرمجة — HTML',
        description_ar: 'الوسوم الدلالية (Semantic HTML)، النماذج، وإمكانية الوصول.',
        level: 'beginner',
        sort_order: 14,
        lessons: [
          {
            slug: 'html-lesson-1-semantic',
            lesson_type: 'lesson',
            title_ar: 'بنية HTML الدلالية وإمكانية الوصول',
            content_ar: 'استخدام الوسوم الدلالية مثل `<header>` و `<main>` و `<nav>` و `<article>` يساعد محركات البحث وقارئات الشاشة:\n\n```html\n<main>\n  <article>\n    <h1>مقدمة في الويب</h1>\n    <p>نستخدم العناصر الدلالية لتوضيح المعنى.</p>\n  </article>\n</main>\n```',
            examples_json: JSON.stringify([
              '<label for="email">البريد</label><input id="email" type="email" required />',
            ]),
            pronunciation_text: '',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'أي وسم يُستخدم لتحديد المحتوى الرئيسي الفريد في الصفحة؟',
                options: ['<main>', '<div>', '<span>'],
                correct_answer: '1',
                explanation_ar: 'الوسم `<main>` يحدد المحتوى الأساسي للصفحة ويحسّن إمكانية الوصول.',
                hint_ar: 'اسمه يعني "رئيسي".',
                difficulty: 'beginner',
              },
            ],
          },
        ],
      },
      {
        slug: 'prog-css-core',
        category: 'programming',
        subject: 'css',
        title_ar: 'أكاديمية البرمجة — CSS',
        description_ar: 'Flexbox و Grid والتصميم المتجاوب والمتغيرات.',
        level: 'beginner',
        sort_order: 15,
        lessons: [
          {
            slug: 'css-lesson-1-grid-flex',
            lesson_type: 'lesson',
            title_ar: 'التخطيط عبر Flexbox و CSS Grid',
            content_ar: 'نستخدم Flexbox للترتيب أحادي البعد (صف أو عمود) و Grid للتخطيط ثنائي البعد:\n\n```css\n.dashboard-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n  gap: 1rem;\n}\n```',
            examples_json: JSON.stringify([
              '.toolbar { display: flex; align-items: center; justify-content: space-between; }',
            ]),
            pronunciation_text: '',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'ماذا تفعل الخاصية `gap: 1rem;` داخل Grid أو Flex؟',
                options: [
                  'تضيف مسافة متساوية بين العناصر الفرعية فقط',
                  'تضيف هوامش خارجية حول الحاوية كلها',
                  'تغيّر لون الخلفية',
                ],
                correct_answer: '1',
                explanation_ar: '`gap` تحدد المسافات بين الأعمدة والصفوف دون إضافة هوامش زائدة عند الحواف.',
                hint_ar: 'تعمل بين الأبناء فقط.',
                difficulty: 'beginner',
              },
            ],
          },
        ],
      },
      {
        slug: 'prog-js-core',
        category: 'programming',
        subject: 'javascript',
        title_ar: 'أكاديمية البرمجة — JavaScript',
        description_ar: 'المتغيرات الحديثة، الدوال غير المتزامنة، ومعالجة المصفوفات.',
        level: 'intermediate',
        sort_order: 16,
        lessons: [
          {
            slug: 'js-lesson-1-async',
            lesson_type: 'lesson',
            title_ar: 'البرمجة غير المتزامنة (async/await)',
            content_ar: 'تتيح `async/await` كتابة عمليات غير متزامنة بشكل مقروء مع معالجة الأخطاء عبر `try/catch`:\n\n```js\nasync function fetchLesson(id) {\n  try {\n    const res = await fetch(`/api/lessons/${id}`);\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    return await res.json();\n  } catch (err) {\n    return { error: err.message };\n  }\n}\n```',
            examples_json: JSON.stringify([
              'const ids = items.map(item => item.id);',
            ]),
            pronunciation_text: '',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'لماذا نتحقق من `res.ok` عند استخدام `fetch`؟',
                options: [
                  'لأن fetch لا يطلق استثناء تلقائياً عند استجابات 404 أو 500',
                  'لأن fetch يعيد نصاً دائماً',
                  'لتسريع الاتصال بالإنترنت',
                ],
                correct_answer: '1',
                explanation_ar: 'في JavaScript، يرفض Promise الخاص بـ fetch فقط عند فشل الشبكة، لذا يجب فحص `res.ok` لأخطاء HTTP.',
                hint_ar: 'فكّر في استجابة HTTP 404.',
                difficulty: 'intermediate',
              },
            ],
          },
        ],
      },
      {
        slug: 'prog-nodejs-core',
        category: 'programming',
        subject: 'nodejs',
        title_ar: 'أكاديمية البرمجة — Node.js',
        description_ar: 'وحدات ESM، خوادم Express، قواعد البيانات، وأفضل ممارسات الأمان.',
        level: 'intermediate',
        sort_order: 17,
        lessons: [
          {
            slug: 'node-lesson-1-esm-security',
            lesson_type: 'lesson',
            title_ar: 'وحدات ES Modules واستعلامات SQL الآمنة',
            content_ar: 'في Node.js الحديث نستخدم `import/export` ونمرّر القيم للاستعلامات عبر معاملات مقيدة (Parameterized Queries) لمنع حقن SQL:\n\n```js\nconst stmt = db.prepare("SELECT id, title_ar FROM lessons WHERE id = ?");\nconst lesson = stmt.get(lessonId);\n```',
            examples_json: JSON.stringify([
              'import fs from "node:fs/promises";',
            ]),
            pronunciation_text: '',
            pronunciation_lang: 'en',
            sort_order: 1,
            exercises: [
              {
                question_ar: 'لماذا نستخدم `?` في استعلام `db.prepare(...)` بدل دمج النص مباشرة؟',
                options: [
                  'لمنع ثغرة حقن SQL (SQL Injection)',
                  'لتقليل حجم ملف JavaScript',
                  'لتشغيل الكود في المتصفح',
                ],
                correct_answer: '1',
                explanation_ar: 'الاستعلامات المعاملية تفصل بنية SQL عن مدخلات المستخدم وتمنع تنفيذ أوامر غير مصرح بها.',
                hint_ar: 'يتعلق بأمان قاعدة البيانات.',
                difficulty: 'intermediate',
              },
            ],
          },
        ],
      },
    ];

    for (const c of coursesSeed) {
      insertCourse.run(c.slug, c.category, c.subject, c.title_ar, c.description_ar, c.level, c.sort_order);
      const courseRow = getCourseBySlug.get(c.slug);
      if (!courseRow) continue;

      for (const l of c.lessons) {
        insertLesson.run(
          courseRow.id,
          l.slug,
          l.lesson_type,
          l.title_ar,
          l.content_ar,
          l.examples_json,
          l.pronunciation_text,
          l.pronunciation_lang,
          l.sort_order
        );
        const lessonRow = getLessonBySlug.get(l.slug);
        if (!lessonRow) continue;

        for (const ex of l.exercises) {
          insertExercise.run(
            lessonRow.id,
            ex.question_ar,
            JSON.stringify(ex.options),
            ex.correct_answer,
            ex.explanation_ar,
            ex.hint_ar,
            ex.difficulty,
            lessonRow.id,
            ex.question_ar
          );
        }
      }
    }

    // Seed Legal Knowledge & Authorized Anime Directory
    const insertResource = db.prepare(`
      INSERT INTO resources (kind, title, title_ar, category, genre, description_ar, legal_url, source_label, is_authorized, is_published)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1, 1
      WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = ? AND kind = ?)
    `);

    const resourcesSeed = [
      {
        kind: 'knowledge',
        title: 'MDN Web Docs',
        title_ar: 'توثيق MDN لتقنيات الويب',
        category: 'برمجة',
        genre: 'توثيق رسمي',
        description_ar: 'المرجع المفتوح الأشمل لتعلم HTML و CSS و JavaScript وواجهات الويب.',
        legal_url: 'https://developer.mozilla.org/',
        source_label: 'Mozilla (Open Educational)',
      },
      {
        kind: 'knowledge',
        title: 'Python Official Documentation',
        title_ar: 'التوثيق الرسمي للغة Python',
        category: 'برمجة',
        genre: 'توثيق رسمي',
        description_ar: 'الدليل الرسمي والشروحات التعليمية المعتمدة من مؤسسة بايثون.',
        legal_url: 'https://docs.python.org/3/tutorial/',
        source_label: 'Python Software Foundation',
      },
      {
        kind: 'knowledge',
        title: 'Tofugu Hiragana Guide',
        title_ar: 'دليل تعلم الهيراغانا اليابانية',
        category: 'لغات',
        genre: 'يابانية',
        description_ar: 'دليل مجاني منظم لتعلم قراءة وكتابة الحروف اليابانية الأساسية.',
        legal_url: 'https://www.tofugu.com/japanese/learn-hiragana/',
        source_label: 'Tofugu Educational',
      },
      {
        kind: 'knowledge',
        title: 'Project Gutenberg',
        title_ar: 'مكتبة غوتنبرغ للكتب المفتوحة',
        category: 'كتب ومصادر',
        genre: 'ملكية عامة',
        description_ar: 'أكثر من 70,000 كتاب إلكتروني مجاني وقانوني ضمن الملكية العامة.',
        legal_url: 'https://www.gutenberg.org/',
        source_label: 'Public Domain',
      },
      {
        kind: 'anime',
        title: 'Dr. STONE',
        title_ar: 'دكتور ستون (علم وتجارب)',
        category: 'علمي وتعليمي',
        genre: 'مغامرة / علوم',
        description_ar: 'عمل أنمي يستعرض إعادة بناء العلوم والكيمياء والفيزياء بأسلوب تعليمي مشوّق.',
        legal_url: 'https://www.crunchyroll.com/series/GYEXQKJG6/dr-stone',
        source_label: 'Crunchyroll (مرخص)',
      },
      {
        kind: 'anime',
        title: 'Cells at Work! (Hataraku Saibou)',
        title_ar: 'خلايا في العمل (أحياء)',
        category: 'علمي وتعليمي',
        genre: 'أحياء / كوميديا تعليمية',
        description_ar: 'شرح مبسط لوظائف جهاز المناعة وخلايا جسم الإنسان عبر شخصيات تفاعلية.',
        legal_url: 'https://www.crunchyroll.com/series/GRMG8ZQZR/cells-at-work',
        source_label: 'Crunchyroll (مرخص)',
      },
      {
        kind: 'anime',
        title: 'A Place Further Than The Universe',
        title_ar: 'مكان أبعد من الكون',
        category: 'تحفيز ومغامرة',
        genre: 'دراما / ملهم',
        description_ar: 'قصة ملهمة حول الإصرار والعمل الجماعي في رحلة علمية إلى القارة القطبية.',
        legal_url: 'https://www.crunchyroll.com/series/GY25N85MY/a-place-further-than-the-universe',
        source_label: 'Crunchyroll (مرخص)',
      },
      {
        kind: 'anime',
        title: 'Shirokuma Cafe',
        title_ar: 'مقهى الدب القطبي (لتعلم اليابانية)',
        category: 'تعلم اليابانية',
        genre: 'حياة يومية',
        description_ar: 'حوارات هادئة وواضحة جداً ومناسبة لمتعلمي اللغة اليابانية في المستوى المبتدئ والمتوسط.',
        legal_url: 'https://www.crunchyroll.com/series/GYQ4W72K6/polar-bear-cafe',
        source_label: 'Crunchyroll (مرخص)',
      },
    ];

    for (const r of resourcesSeed) {
      insertResource.run(
        r.kind,
        r.title,
        r.title_ar,
        r.category,
        r.genre,
        r.description_ar,
        r.legal_url,
        r.source_label,
        r.title,
        r.kind
      );
    }

    // Default application settings
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO application_settings (key, value_json) VALUES (?, ?)
    `);
    insertSetting.run('maintenance_mode', JSON.stringify(false));
    insertSetting.run('welcome_banner_ar', JSON.stringify('مرحباً بك في NEXORA BOT — منصتك التعليمية الذكية عبر واتساب.'));
    insertSetting.run('safe_mode_strict', JSON.stringify(true));
    insertSetting.run('max_daily_ai_requests', JSON.stringify(40));
    insertSetting.run('voice_enabled_global', JSON.stringify(true));
  },
};
