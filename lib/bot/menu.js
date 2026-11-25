import { ARABIC_DIVIDER, formatHeader } from '../utils/text.js';

export const MAIN_MENU_SECTIONS = [
  {
    title: 'التعلّم والأكاديميات',
    items: [
      { id: 'menu:tutor', num: '1', title: '🎓 المعلم الذكي', desc: 'شرح تفاعلي بالعربية، أسئلة عامة، واختبارات تكيفية' },
      { id: 'menu:languages', num: '2', title: '🌍 أكاديمية اللغات', desc: 'اليابانية، الإنجليزية، الروسية، الصينية + مراجعة' },
      { id: 'menu:programming', num: '3', title: '💻 أكاديمية البرمجة', desc: 'Python, HTML, CSS, JavaScript, Node.js + مشاريع' },
    ],
  },
  {
    title: 'البحث والصوت والإبداع والترفيه',
    items: [
      { id: 'menu:research', num: '4', title: '🔎 البحث الذكي', desc: 'بحث متعدد المصادر (ويب + توثيق رسمي + مراجع)' },
      { id: 'menu:audio', num: '5', title: '🎙️ الذكاء الصوتي', desc: 'نطق الكلمات وتحويل النصوص إلى رسائل صوتية' },
      { id: 'menu:creative', num: '6', title: '🎨 الاستوديو الإبداعي', desc: 'توليد صور تعليمية وإبداعية عالية الدقة بأمان' },
      { id: 'menu:library_hub', num: '7', title: '🎌 مكتبة الأنمي والمعرفة', desc: 'أعمال مرخّصة قانونياً وكتب ومصادر مفتوحة' },
    ],
  },
  {
    title: 'المتابعة والإعدادات',
    items: [
      { id: 'menu:progress', num: '8', title: '📊 تقدّمي التعليمي', desc: 'نقاطك، إتقانك، ومراجعات التكرار المتباعد' },
      { id: 'menu:help_settings', num: '9', title: '⚙️ المساعدة والإعدادات', desc: 'الأوامر، الخصوصية، التصدير، والدعم الدراسي' },
    ],
  },
];

export const MAIN_MENU_ITEMS = MAIN_MENU_SECTIONS.flatMap((s) => s.items);

export function buildMainMenuText(botName = 'NEXORA BOT', user = null, banner = '', prefix = '.') {
  const greetingName = user?.display_name ? ` *${user.display_name}*` : '';
  const sectionsText = MAIN_MENU_SECTIONS.map((section) => {
    const rows = section.items.map((item) => `*${item.num}.* ${item.title}\n   _${item.desc}_`).join('\n');
    return `❖ *${section.title}*\n${rows}`;
  }).join('\n\n');

  return [
    formatHeader('✨', `القائمة الرئيسية — ${botName}`, `أهلاً${greetingName}! ${banner || 'أكاديميتك التعليمية الذكية عبر واتساب'}`),
    '',
    sectionsText,
    '',
    ARABIC_DIVIDER,
    `🧭 *التنقل السريع في أي وقت:*`,
    `• *رئيسية* (0 أو ${prefix}menu)  |  *رجوع* للخلف`,
    `• *إلغاء* لإنهاء المهمة  |  *مساعدة* (${prefix}help)`,
    `• أوامر المجموعات: ${prefix}tutor · ${prefix}lang · ${prefix}code · ${prefix}creative`,
    '',
    `اختر من القائمة التفاعلية أو أرسل *رقم القسم* (1 إلى 9)، أو اكتب سؤالك مباشرة:`,
  ].join('\n');
}

export function buildInteractiveListPayload(botName = 'NEXORA BOT', user = null) {
  const greetingName = user?.display_name ? ` ${user.display_name}` : '';
  return {
    title: `✦ ${botName}`,
    text: `مرحباً${greetingName}! اختر مسارك من القائمة التعليمية:`,
    footer: 'نيكسورا · رئيسية | رجوع | مساعدة',
    buttonText: 'فتح قائمة نيكسورا',
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

export function buildMainMenuButtons() {
  return [
    { id: 'menu:tutor', title: '🎓 المعلم الذكي' },
    { id: 'menu:progress', title: '📊 تقدّمي' },
  ];
}
