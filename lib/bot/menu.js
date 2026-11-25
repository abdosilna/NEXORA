import { ARABIC_DIVIDER, formatHeader } from '../utils/text.js';

export const MAIN_MENU_SECTIONS = [
  {
    title: 'التعلّم الذكي والأكاديميات',
    items: [
      { id: 'menu:tutor', num: '1', title: '🎓 المعلم الشخصي الذكي', desc: 'شرح تفاعلي بالعربية، أسئلة عامة، واختبارات متدرجة' },
      { id: 'menu:languages', num: '2', title: '🌍 أكاديمية اللغات', desc: 'الإنجليزية، اليابانية، الروسية، الصينية + مراجعة الأخطاء' },
      { id: 'menu:programming', num: '3', title: '💻 أكاديمية البرمجة', desc: 'Python, JavaScript, HTML, CSS, Node.js + مشاريع' },
    ],
  },
  {
    title: 'البحث والمعرفة والصوت',
    items: [
      { id: 'menu:research', num: '4', title: '🔎 مساعد البحث المستقل', desc: 'بحث متعدد المصادر (ويب + توثيق رسمي + مراجع)' },
      { id: 'menu:audio', num: '5', title: '🎙️ الصوت والنطق', desc: 'نطق الكلمات وإعدادات الرد الصوتي' },
      { id: 'menu:knowledge', num: '6', title: '📚 مكتبة المعرفة', desc: 'كتب وتوثيقات تعليمية مفتوحة وقانونية' },
      { id: 'menu:anime', num: '7', title: '🎌 دليل الأنمي', desc: 'أعمال علمية ولغوية بروابط قانونية مرخّصة' },
    ],
  },
  {
    title: 'المتابعة والإعدادات',
    items: [
      { id: 'menu:progress', num: '8', title: '📊 التقدّم التعليمي', desc: 'إحصائياتك، نقاطك، ومراجعات التكرار المتباعد' },
      { id: 'menu:settings', num: '9', title: '⚙️ الإعدادات والخصوصية', desc: 'تغيير المستوى، الذاكرة، تصدير أو حذف بياناتك' },
      { id: 'menu:support', num: '10', title: '🌿 الدعم الدراسي الآمن', desc: 'تنظيم الدراسة وإدارة الوقت بخصوصية تامة' },
      { id: 'menu:help', num: '11', title: '❓ المساعدة والأوامر', desc: 'دليل الاستخدام والأوامر السريعة' },
    ],
  },
];

export const MAIN_MENU_ITEMS = MAIN_MENU_SECTIONS.flatMap((s) => s.items);

export function buildMainMenuText(botName = 'NEXORA BOT', user = null, banner = '', prefix = '.') {
  const greetingName = user?.display_name ? ` ${user.display_name}` : '';
  const sectionsText = MAIN_MENU_SECTIONS.map((section) => {
    const rows = section.items.map((item) => `*${item.num}.* ${item.title}\n   _${item.desc}_`).join('\n');
    return `📌 *${section.title}*\n${rows}`;
  }).join('\n\n');

  return [
    formatHeader('✨', `مرحباً${greetingName} في ${botName}`, banner || 'منصتك التعليمية الذكية عبر واتساب.'),
    '',
    sectionsText,
    '',
    ARABIC_DIVIDER,
    `🧭 *التنقل السريع في أي وقت:*`,
    `• *رئيسية* (0 أو ${prefix}menu) — القائمة الرئيسية`,
    `• *رجوع* — خطوة للخلف  |  *إلغاء* — إنهاء المهمة`,
    `• *مساعدة* (${prefix}help) — دليل الأوامر`,
    `• في المجموعات: ${prefix}tutor | ${prefix}lang | ${prefix}code | ${prefix}research`,
    '',
    `اختر من القائمة التفاعلية أو أرسل *رقم القسم* (1 إلى 11)، أو اكتب سؤالك مباشرة:`,
  ].join('\n');
}

export function buildInteractiveListPayload(botName = 'NEXORA BOT', user = null) {
  const greetingName = user?.display_name ? ` ${user.display_name}` : '';
  return {
    title: botName,
    text: `مرحباً${greetingName}! اختر القسم التعليمي المناسب من القائمة:`,
    footer: 'أرسل: رئيسية | رجوع | إلغاء | مساعدة',
    buttonText: 'فتح القائمة التعليمية',
    sections: MAIN_MENU_SECTIONS.map((sec) => ({
      title: sec.title.slice(0, 24),
      rows: sec.items.map((item) => ({
        rowId: item.id,
        title: item.title.slice(0, 24),
        description: item.desc.slice(0, 72),
      })),
    })),
  };
}
