import { normalizeCommandText } from '../../utils/text.js';

const URGENT_SAFETY_PATTERN =
  /(انتحار|اذي نفسي|أذى نفسي|اقتل نفسي|kill myself|suicide|self[- ]?harm|end my life|أنهي حياتي)/i;

const MEDICAL_PATTERN =
  /(تشخيص طبي|علاج دوائي|جرعة دواء|وصفة طبية|اكتئاب سريري|دواء|diagnose|prescription|dosage)/i;

const INAPPROPRIATE_PATTERN = /(محتوى إباحي|عنف جنسي|porn|nsfw|18\+)/i;

export class SafeSupportModule {
  constructor({ repos, aiService }) {
    this.repos = repos;
    this.aiService = aiService;
  }

  openHome(user) {
    this.repos.users.setState(user.id, { menu: 'support', data: { active: true } });
    return {
      text: [
        `🌿 *الدعم الدراسي والتوجيه العام*`,
        `مساحة هادئة لتنظيم وقت الدراسة، التغلب على التسويف، وإدارة ضغط الاختبارات.`,
        `🔒 *الخصوصية:* محادثاتك هنا خاصة ولا تُشارك أو تُحوّل إلى الإدارة مطلقاً دون موافقتك الصريحة.`,
        `⚕️ *تنويه:* هذا القسم للدعم الدراسي والعام فقط ولا يقدم تشخيصاً طبياً أو نفسياً.`,
        ``,
        `شاركني التحدي الدراسي الذي تواجهه، أو أرسل *رئيسية* للعودة.`,
      ].join('\n'),
    };
  }

  async handleInput({ user, text }) {
    const clean = String(text || '').trim();
    const norm = normalizeCommandText(clean);

    // Urgent safety check takes immediate precedence
    if (URGENT_SAFETY_PATTERN.test(clean)) {
      return {
        text: [
          `🤍 *سلامتك تهمنا جداً.*`,
          `إذا كنت تمر بأزمة حادة أو تفكر في إيذاء نفسك، يرجى التوجه فوراً لطلب المساعدة البشرية المتخصصة:`,
          `• تواصل مع خدمات الطوارئ المحلية في بلدك فوراً (مثل 999 / 911 / 112).`,
          `• تواصل مع شخص تثق به من عائلتك أو أصدقائك ليكون معك الآن.`,
          `• إذا كنت في منطقة تتوفر فيها خطوط مساندة نفسية وطنية، اتصل بها على الفور.`,
          ``,
          `أنا بوت تعليمي ولا أستطيع تقديم الرعاية الطبية العاجلة، لكن وجود الدعم المختص بجانبك الآن هو الخطوة الأهم.`,
        ].join('\n'),
      };
    }

    if (INAPPROPRIATE_PATTERN.test(clean)) {
      return {
        text: `🛡️ يلتزم NEXORA BOT بمحتوى تعليمي آمن ومناسب لجميع الأعمار، ولا يتعامل مع محتوى غير لائق.`,
      };
    }

    if (MEDICAL_PATTERN.test(clean) || norm.includes('مرض') || norm.includes('علاج')) {
      return {
        text: [
          `⚕️ *تنويه مهم:*`,
          `لا أقدّم تشخيصاً طبياً أو وصفات علاجية أو جرعات أدوية.`,
          `يُنصح دائماً بمراجعة طبيب أو مختص صحي معتمد لأي أعراض جسدية أو نفسية.`,
          `إذا أردت المساعدة في *تنظيم جدول دراسي مرن* يراعي راحتك، أخبرني وسأساعدك بكل سرور.`,
        ].join('\n'),
      };
    }

    const res = await this.aiService.complete({
      userId: user.id,
      systemAddon: `أنت مرشد دراسي محترم وداعم بالعربية.
القواعد:
- قدّم خطوات عملية هادئة لإدارة وقت الدراسة والتركيز وتخفيف القلق الدراسي.
- لا تقدّم أي تشخيص طبي أو نفسي.
- حافظ على محتوى مناسب لجميع الأعمار.
- التزم بالإيجاز (4-6 نقاط عملية).`,
      messages: [{ role: 'user', content: clean }],
      context: { level: user.learning_level },
    });

    return {
      text: `${res.text}\n\n🔒 تبقى هذه الجلسة خاصة بك. أرسل *رئيسية* للعودة للقائمة.`,
    };
  }
}
