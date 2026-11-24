export const MAIN_MENU_ITEMS = [
  { id: 'menu:tutor', num: '1', title: '🎓 المعلم الشخصي الذكي', desc: 'شرح مخصص بالعربية، اختبارات، وتلميح تدريجي' },
  { id: 'menu:languages', num: '2', title: '🌍 أكاديمية اللغات', desc: 'اليابانية، الإنجليزية، الروسية، الصينية + تكرار متباعد' },
  { id: 'menu:programming', num: '3', title: '💻 أكاديمية البرمجة', desc: 'Python, HTML, CSS, JavaScript, Node.js' },
  { id: 'menu:research', num: '4', title: '🔎 مساعد البحث المستقل', desc: 'بحث من مصادر عامة موثقة ومقارنة النتائج' },
  { id: 'menu:audio', num: '5', title: '🎙️ الصوت والنطق', desc: 'دروس النطق الصوتي وإعدادات الصوت' },
  { id: 'menu:knowledge', num: '6', title: '📚 مكتبة المعرفة', desc: 'مصادر تعليمية مفتوحة وقانونية' },
  { id: 'menu:anime', num: '7', title: '🎌 دليل الأنمي', desc: 'أعمال تعليمية وثقافية بروابط مشاهدة قانونية فقط' },
  { id: 'menu:progress', num: '8', title: '📊 التقدّم التعليمي', desc: 'إحصائياتك، نقاطك، والمراجعات المستحقة' },
  { id: 'menu:settings', num: '9', title: '⚙️ الإعدادات والخصوصية', desc: 'المستوى، الصوت، تصدير أو حذف بياناتك' },
  { id: 'menu:support', num: '10', title: '🌿 الدعم الدراسي الآمن', desc: 'تنظيم الدراسة والتشجيع مع خصوصية تامة' },
  { id: 'menu:help', num: '11', title: '❓ المساعدة والأوامر', desc: 'دليل الاستخدام والأوامر السريعة' },
];

export function buildMainMenuText(botName = 'NEXORA BOT', user = null, banner = '', prefix = '.') {
  const greetingName = user?.display_name ? ` ${user.display_name}` : '';
  const lines = [
    `✨ *مرحباً${greetingName} في ${botName}*`,
    banner || 'منصتك التعليمية التفاعلية عبر واتساب.',
    '',
    `📋 *القائمة الرئيسية:*`,
    ...MAIN_MENU_ITEMS.map((item) => `*${item.num}.* ${item.title}\n    _${item.desc}_`),
    '',
    `🧭 *أوامر سريعة في أي وقت:*`,
    `• *رئيسية* (أو 0 / ${prefix}menu) — العودة للقائمة الرئيسية`,
    `• *رجوع* (back) — الرجوع خطوة للخلف`,
    `• *إلغاء* (cancel) — إنهاء العملية الحالية`,
    `• *مساعدة* (${prefix}help) — عرض دليل الاستخدام`,
    `• *أوامر المجموعات:* ${prefix}tutor | ${prefix}lang | ${prefix}code | ${prefix}research | ${prefix}anime`,
    '',
    `أرسل *رقم القسم* (1 إلى 11) للبدء:`,
  ];
  return lines.join('\n');
}

export function buildInteractiveListPayload(botName = 'NEXORA BOT', user = null) {
  const greetingName = user?.display_name ? ` ${user.display_name}` : '';
  return {
    title: botName,
    text: `مرحباً${greetingName}! اختر القسم التعليمي من القائمة التفاعلية أو أرسل رقمه (1-11).`,
    footer: 'أرسل: رئيسية | رجوع | إلغاء | مساعدة',
    buttonText: 'فتح القائمة التعليمية',
    sections: [
      {
        title: 'الأكاديميات والتعلّم',
        rows: MAIN_MENU_ITEMS.slice(0, 5).map((item) => ({
          rowId: item.id,
          title: item.title.slice(0, 24),
          description: item.desc.slice(0, 72),
        })),
      },
      {
        title: 'المكتبة والتقدّم والإعدادات',
        rows: MAIN_MENU_ITEMS.slice(5).map((item) => ({
          rowId: item.id,
          title: item.title.slice(0, 24),
          description: item.desc.slice(0, 72),
        })),
      },
    ],
  };
}
