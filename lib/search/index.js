import { safePublicFetch, validateSafePublicUrl } from '../security/ssrf.js';
import { sharedRateLimiter } from '../security/rate-limit.js';
import { sanitizeIncomingText } from '../security/sanitize.js';
import {
  ARABIC_DIVIDER,
  formatErrorNotice,
  formatHeader,
  normalizeCommandText,
} from '../utils/text.js';

const EXPLICIT_SEARCH_PATTERN =
  /(ابحث|بحث عن|مصادر|مراجع|روابط|وثائق|توثيق|مقارنة|قارن|احدث|أحدث|سعر|اليوم|اخبار|أخبار|دراسة|إحصائية|احصائية|source|sources|docs|documentation|official|latest|search)/i;

const TECH_DOCS_HINT =
  /(javascript|js|html|css|dom|fetch|promise|async|react|node|python|http|api|sql|regex|mdn|برمجة|جافاسكربت|بايثون|ويب)/i;

const SIMPLE_KNOWLEDGE_PATTERN =
  /^(ما هي|ما هو|من هو|من هي|كم عدد|عرف|عرّف|اشرح باختصار|what is|who is|capital of)\s+.{2,65}$/i;

export class ResearchModule {
  constructor(config, { aiService, repos, logger = null, fetchImpl = fetch, resolveDns = undefined } = {}) {
    this.config = config;
    this.aiService = aiService;
    this.repos = repos;
    this.logger = logger;
    this.fetchImpl = fetchImpl;
    this.resolveDns = resolveDns;
  }

  getHealth() {
    const provider = this.config.research.provider;
    const requiresKey = provider === 'serper' || provider === 'brave';
    const hasKey = Boolean(this.config.research.apiKey);
    return {
      provider,
      enabled: provider !== 'disabled',
      requiresKey,
      hasKey,
      ready: provider !== 'disabled' && (!requiresKey || hasKey),
      ssrfProtected: true,
    };
  }

  openHome(user) {
    this.repos.users.setState(user.id, { menu: 'research', data: { mode: 'await_query' } });
    const health = this.getHealth();

    const providerNote = !health.ready && health.requiresKey
      ? `⚠️ تنويه: المزوّد المحدد (*${health.provider}*) يتطلب ضبط *SEARCH_API_KEY* في الإعدادات.`
      : `المزوّد النشط: *${this._providerLabelAr(health.provider)}* (فحص SSRF للروابط مفعّل).`;

    return {
      text: [
        formatHeader('🔎', 'مساعد البحث المستقل — NEXORA', providerNote),
        `أرسل موضوع البحث أو سؤالاً، أو رابطاً عاماً موثوقاً (https://...) لتحليله:`,
        `• يدمج بين البحث العام، التوثيق الرسمي (مثل MDN)، المصادر التعليمية، والموسوعات كخيار إضافي.`,
        `• يفصل بين *الحقائق الموثّقة*، *تضارب الادعاءات*، و*ما لم يُتحقق منه*.`,
        `• أرسل *بحث <موضوع>* لفرض البحث في المصادر دائماً، أو *رئيسية* للعودة.`,
      ].join('\n'),
    };
  }

  async handleInput({ user, text, forceWebSearch = false }) {
    const raw = sanitizeIncomingText(text, 300);
    if (!raw || raw.length < 2) {
      return { text: 'يرجى كتابة عبارة بحث واضحة (حرفين على الأقل).' };
    }

    const cleanQuery = raw.replace(/^(?:بحث|ابحث عن)\s+/i, '').trim() || raw;
    const explicitSearch = forceWebSearch || /^بحث\s+/i.test(raw) || EXPLICIT_SEARCH_PATTERN.test(raw);

    if (this.config.research.provider === 'disabled') {
      return {
        text: formatErrorNotice(
          'خدمة البحث عبر الويب معطلة',
          'تم إيقاف البحث عبر الويب من إعدادات النظام (SEARCH_PROVIDER=disabled).',
          ['غيّر SEARCH_PROVIDER إلى multi أو duckduckgo أو serper في ملف .env.']
        ),
      };
    }

    const rate = sharedRateLimiter.check(`research:${user.id}`, { limit: 6, windowMs: 60_000 });
    if (!rate.allowed) {
      return {
        text: `⏳ تجاوزت حد طلبات البحث المؤقت. انتظر ${Math.ceil(rate.retryAfterMs / 1000)} ثانية وحاول مجدداً.`,
      };
    }

    const retrievedAt = new Date().toISOString().slice(0, 10);

    if (/^https?:\/\//i.test(cleanQuery)) {
      return this._inspectSingleUrl({ user, rawUrl: cleanQuery, retrievedAt });
    }

    // Answer simple general knowledge directly when AI is ready and web search wasn't explicitly demanded
    if (!explicitSearch && SIMPLE_KNOWLEDGE_PATTERN.test(cleanQuery) && this.aiService?.isReady?.()) {
      const directRes = await this.aiService.complete({
        userId: user.id,
        systemAddon: `أجب عن سؤال المعرفة العامة التالي بالعربية الفصحى بدقة وإيجاز دون الحاجة لبحث ويب. إذا كان السؤال يعتمد على بيانات متغيرة أو حديثة جداً، نبّه المتعلم ليطلب بحثاً بالإنترنت.`,
        messages: [{ role: 'user', content: cleanQuery }],
        context: { level: user.learning_level },
      });

      if (directRes.ok) {
        return {
          text: [
            formatHeader('💡', `إجابة معرفية مباشرة: ${cleanQuery}`, 'أُجيب مباشرة دون استهلاك بحث ويب'),
            directRes.text,
            ARABIC_DIVIDER,
            `🔎 إذا أردت مصادر وروابط خارجية حول الموضوع، أرسل: *بحث ${cleanQuery}*`,
          ].join('\n'),
        };
      }
    }

    // Explicit missing-key guard for paid search providers (never simulate search)
    const provider = this.config.research.provider;
    if ((provider === 'serper' || provider === 'brave') && !this.config.research.apiKey) {
      return {
        text: formatErrorNotice(
          'مفتاح البحث الخارجي غير مضبوط',
          `المزوّد المحدد (${provider}) يتطلب مفتاح API فعلياً (SEARCH_API_KEY) ولا يتم محاكاة نتائج البحث.`,
          [
            `أضف *SEARCH_API_KEY* الخاص بمزوّد *${provider}* في ملف *.env*.`,
            'أو اضبط *SEARCH_PROVIDER=multi* لاستخدام البحث متعدد المصادر المجاني (DuckDuckGo + التوثيق الرسمي + ويكيبيديا).',
          ]
        ),
      };
    }

    const searchOutcome = await this._searchSources(cleanQuery);
    if (searchOutcome.error) {
      return {
        text: formatErrorNotice(
          'تعذر إتمام البحث الخارجي',
          `فشل الاتصال بمزوّد البحث (${this._providerLabelAr(provider)}): ${searchOutcome.error}`,
          ['تحقّق من الاتصال بالإنترنت أو صلاحية SEARCH_API_KEY، ثم أعد المحاولة.']
        ),
      };
    }

    const sources = searchOutcome.sources;
    if (!sources.length) {
      this.repos.progress.recordResearchHistory?.({
        userId: user.id,
        query: cleanQuery,
        provider,
        sources: [],
        uncertaintyNote: 'لم يعثر المزود على مصادر متاحة مطابقة لعبارة البحث.',
      });
      return {
        text: [
          formatHeader('🔎', `نتائج البحث عن: "${cleanQuery}"`, `تاريخ الاسترجاع: ${retrievedAt}`),
          `لم يُعثر على مصادر عامة موثوقة مطابقة تماماً لعبارة البحث عبر (${this._providerLabelAr(provider)}).`,
          `• جرّب كلمات مفتاحية أدق أو صياغة إنجليزية للمصطلحات التقنية.`,
          `• لا يتم اختلاق أي مصادر غير موجودة.`,
        ].join('\n'),
      };
    }

    const formattedSources = sources
      .map(
        (s, i) =>
          `[${i + 1}] (${s.sourceTypeLabel}) ${s.title}\nالرابط: ${s.url}\nالمقتطف: ${s.snippet}`
      )
      .join('\n\n');

    let summaryBody;
    let aiNote = '';
    if (this.aiService?.isReady?.()) {
      const aiRes = await this.aiService.complete({
        userId: user.id,
        systemAddon: `أنت باحث علمي مستقل. حلّل المصادر المتعددة التالية بالعربية الفصحى فقط.
قواعد صارمة:
1. افصل بوضوح بين:
   - *📌 الحقائق المؤكدة والمتفق عليها* من المصادر
   - *⚖️ مقارنة المصادر وأي تعارض* (اذكر إن اختلفت المصادر أو إذا اتفقت)
   - *❓ ما لم يُتحقق منه أو ينقص المصادر*
2. لا تذكر أي معلومة أو رابط غير موجود في المصادر المزوّدة.
3. أشر إلى أرقام المصادر [1]، [2]..`,
        messages: [
          {
            role: 'user',
            content: `السؤال/الموضوع: ${cleanQuery}\n\nالمصادر المسترجعة بتاريخ ${retrievedAt}:\n${formattedSources}`,
          },
        ],
        context: { level: user.learning_level },
      });
      if (aiRes.ok) {
        summaryBody = aiRes.text;
      } else {
        aiNote = `\n_ملاحظة: تم عرض المقتطفات المباشرة من المصادر لتعذر تلخيصها عبر الذكاء الاصطناعي (${aiRes.errorDetail || 'غير متاح'})._\n`;
        summaryBody = this._buildDeterministicResearchSummary(cleanQuery, sources);
      }
    } else {
      summaryBody = this._buildDeterministicResearchSummary(cleanQuery, sources);
    }

    const citations = sources
      .map(
        (s, i) =>
          `[${i + 1}] *${s.title}* — _${s.sourceTypeLabel}_\n🔗 ${s.url}`
      )
      .join('\n\n');

    this.repos.progress.recordResearchHistory?.({
      userId: user.id,
      query: cleanQuery,
      provider,
      sources: sources.map((s) => ({ title: s.title, url: s.url, type: s.sourceTypeLabel })),
      uncertaintyNote: `تم استرجاع ${sources.length} مصدر بتاريخ ${retrievedAt}`,
    });

    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'research',
      eventType: 'search_completed',
      topic: cleanQuery.slice(0, 80),
      payload: { sourcesCount: sources.length, provider },
    });

    return {
      text: [
        formatHeader(
          '🔎',
          `تقرير البحث المستقل: ${cleanQuery}`,
          `تاريخ الاسترجاع: ${retrievedAt} · المزوّد: ${this._providerLabelAr(provider)}`
        ),
        aiNote + summaryBody,
        ARABIC_DIVIDER,
        `📚 *المصادر الفعلية (${sources.length}):*`,
        citations,
      ].join('\n\n'),
    };
  }

  async _inspectSingleUrl({ user, rawUrl, retrievedAt }) {
    try {
      await validateSafePublicUrl(rawUrl, { resolveDns: this.resolveDns });
      const fetched = await safePublicFetch(rawUrl, {
        timeoutMs: this.config.research.timeoutMs,
        resolveDns: this.resolveDns,
        fetchImpl: this.fetchImpl,
      });

      const titleMatch = fetched.body.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim().slice(0, 140) : new URL(fetched.url).hostname;
      const plain = fetched.body
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2600);

      if (!plain) {
        return { text: `تم فحص الرابط (${fetched.url}) لكنه لم يحتوِ على نص قابل للقراءة.` };
      }

      let bodyText = `• *مقتطف مباشر من الصفحة:*\n${plain.slice(0, 700)}...`;
      if (this.aiService?.isReady?.()) {
        const aiRes = await this.aiService.complete({
          userId: user.id,
          systemAddon:
            'لخّص النص التالي من الصفحة العامة بالعربية مع فصل الحقائق المباشرة عن التفسيرات وتوضيح أي نقص في المعلومات.',
          messages: [{ role: 'user', content: `المصدر: ${title} (${fetched.url})\nالنص:\n${plain}` }],
        });
        if (aiRes.ok) {
          bodyText = aiRes.text;
        }
      }

      this.repos.progress.recordResearchHistory?.({
        userId: user.id,
        query: rawUrl,
        provider: 'url-inspect',
        sources: [{ title, url: fetched.url }],
        uncertaintyNote: `تحليل مصدر عام بتاريخ ${retrievedAt}`,
      });

      return {
        text: [
          formatHeader('🌐', 'تحليل مصدر عام موثّق', `تاريخ الاسترجاع: ${retrievedAt}`),
          `العنوان: *${title}*\n🔗 ${fetched.url}`,
          bodyText,
        ].join('\n\n'),
      };
    } catch (err) {
      return {
        text: formatErrorNotice(
          'تعذر جلب الرابط',
          `لم يتم فتح الرابط لأسباب أمنية أو شبكية: ${err.message}`,
          ['تأكد من أن الرابط عام (HTTPS) ولا يشير إلى شبكة محلية.']
        ),
      };
    }
  }

  async _searchSources(query) {
    const provider = this.config.research.provider;
    try {
      if (provider === 'serper') {
        return { sources: await this._searchSerper(query), error: null };
      }
      if (provider === 'brave') {
        return { sources: await this._searchBrave(query), error: null };
      }
      if (provider === 'duckduckgo') {
        const ddg = await this._searchDuckDuckGoWebAndApi(query);
        return { sources: ddg, error: null };
      }
      if (provider === 'wikipedia') {
        return { sources: await this._searchWikipedia(query), error: null };
      }

      // Multi-source aggregation: combines Web Search + Official Docs + Educational + Wikipedia (optional)
      const tasks = [];
      if (this.config.research.apiKey) {
        // Use configured web key if user provided one while keeping multi mode
        tasks.push(this._searchSerper(query).catch(() => []));
      } else {
        tasks.push(this._searchDuckDuckGoWebAndApi(query).catch(() => []));
      }

      if (TECH_DOCS_HINT.test(query)) {
        tasks.push(this._searchMdnDocs(query).catch(() => []));
      }
      tasks.push(this._searchCuratedEducationalSources(query));
      tasks.push(this._searchWikipedia(query).catch(() => []));

      const batches = await Promise.all(tasks);
      const merged = this._deduplicateSources(batches.flat());
      return { sources: merged.slice(0, 6), error: null };
    } catch (err) {
      this.logger?.warn?.('research', `Search provider ${provider} error`, err.message);
      return { sources: [], error: err.message };
    }
  }

  async _searchMdnDocs(query) {
    const res = await this.fetchImpl(
      `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`,
      {
        headers: { 'User-Agent': 'NexoraBot-Research/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.research.timeoutMs),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.documents || []).slice(0, 2).map((doc) => ({
      title: `${doc.title} — MDN Web Docs`,
      url: `https://developer.mozilla.org${doc.mdn_url}`,
      snippet: String(doc.summary || '').replace(/\s+/g, ' ').trim(),
      sourceTypeLabel: '📘 توثيق رسمي (MDN)',
    }));
  }

  async _searchCuratedEducationalSources(query) {
    if (!this.repos?.resources?.list) return [];
    const norm = normalizeCommandText(query);
    const words = norm.split(' ').filter((w) => w.length >= 2).slice(0, 4);
    const matches = [];
    const catalog = this.repos.resources.list({ kind: 'knowledge', limit: 25 });
    for (const item of catalog) {
      const hay = normalizeCommandText(`${item.title} ${item.title_ar} ${item.category} ${item.description_ar}`);
      if (words.some((w) => hay.includes(w))) {
        matches.push({
          title: item.title_ar ? `${item.title_ar} (${item.title})` : item.title,
          url: item.legal_url,
          snippet: item.description_ar,
          sourceTypeLabel: `🎓 مصدر تعليمي موثّق (${item.source_label || 'مرجع'})`,
        });
      }
    }
    return matches.slice(0, 2);
  }

  async _searchWikipedia(query) {
    const langs = /[\u0600-\u06FF]/.test(query) ? ['ar', 'en'] : ['en', 'ar'];
    const results = [];

    for (const lang of langs) {
      const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=2`;
      const res = await this.fetchImpl(apiUrl, {
        headers: { 'User-Agent': 'NexoraBot-Research/1.0' },
        signal: AbortSignal.timeout(this.config.research.timeoutMs),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const hits = data?.query?.search || [];
      for (const hit of hits) {
        const cleanSnippet = String(hit.snippet || '').replace(/<[^>]+>/g, '').trim();
        results.push({
          title: `${hit.title} (Wikipedia ${lang.toUpperCase()})`,
          url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/\s+/g, '_'))}`,
          snippet: cleanSnippet,
          sourceTypeLabel: '📖 موسوعة عامة (اختياري)',
        });
      }
      if (results.length >= 2) break;
    }
    return results.slice(0, 2);
  }

  async _searchDuckDuckGoWebAndApi(query) {
    const out = [];

    // 1. DuckDuckGo Instant Answer JSON
    try {
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await this.fetchImpl(apiUrl, {
        headers: { 'User-Agent': 'NexoraBot-Research/1.0' },
        signal: AbortSignal.timeout(this.config.research.timeoutMs),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.AbstractText && data.AbstractURL) {
          out.push({
            title: data.Heading || query,
            url: data.AbstractURL,
            snippet: data.AbstractText,
            sourceTypeLabel: '🌐 بحث ويب عام (DuckDuckGo)',
          });
        }
        for (const topic of data.RelatedTopics || []) {
          if (topic.FirstURL && topic.Text && out.length < 3) {
            out.push({
              title: topic.Text.split(' - ')[0]?.slice(0, 80) || 'DuckDuckGo Result',
              url: topic.FirstURL,
              snippet: topic.Text,
              sourceTypeLabel: '🌐 بحث ويب عام (DuckDuckGo)',
            });
          }
        }
      }
    } catch {
      // Continue to HTML endpoint
    }

    // 2. DuckDuckGo HTML organic results if Instant Answer returned too few
    if (out.length < 2) {
      try {
        const htmlRes = await this.fetchImpl(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; NexoraBot-Research/1.0)',
              Accept: 'text/html',
            },
            signal: AbortSignal.timeout(this.config.research.timeoutMs),
          }
        );
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const parsed = this._parseDuckDuckGoHtml(html);
          out.push(...parsed);
        }
      } catch {
        // Ignore transient HTML fetch errors
      }
    }

    return this._deduplicateSources(out).slice(0, 4);
  }

  _parseDuckDuckGoHtml(html) {
    const results = [];
    const linkRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRe = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

    const links = [];
    let m;
    while ((m = linkRe.exec(html)) !== null && links.length < 5) {
      let href = m[1];
      if (href.includes('uddg=')) {
        try {
          const parsedUrl = new URL(href.startsWith('//') ? `https:${href}` : href, 'https://duckduckgo.com');
          href = parsedUrl.searchParams.get('uddg') || href;
        } catch {
          // keep raw href
        }
      }
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (/^https?:\/\//i.test(href) && title) {
        links.push({ title, url: href });
      }
    }

    const snippets = [];
    while ((m = snippetRe.exec(html)) !== null && snippets.length < 5) {
      const raw = (m[1] || m[2] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      snippets.push(raw);
    }

    for (let i = 0; i < links.length; i += 1) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || links[i].title,
        sourceTypeLabel: '🌐 بحث ويب عام (DuckDuckGo)',
      });
    }
    return results;
  }

  async _searchSerper(query) {
    if (!this.config.research.apiKey) {
      throw new Error('مفتاح SEARCH_API_KEY مطلوب لمزود Serper.');
    }
    const res = await this.fetchImpl('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.config.research.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }),
      signal: AbortSignal.timeout(this.config.research.timeoutMs),
    });
    if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
    const data = await res.json();
    return (data.organic || []).slice(0, 5).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      sourceTypeLabel: this._classifyUrlSourceType(item.link),
    }));
  }

  async _searchBrave(query) {
    if (!this.config.research.apiKey) {
      throw new Error('مفتاح SEARCH_API_KEY مطلوب لمزود Brave Search.');
    }
    const res = await this.fetchImpl(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.config.research.apiKey,
        },
        signal: AbortSignal.timeout(this.config.research.timeoutMs),
      }
    );
    if (!res.ok) throw new Error(`Brave Search HTTP ${res.status}`);
    const data = await res.json();
    return (data.web?.results || []).slice(0, 5).map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.description || '',
      sourceTypeLabel: this._classifyUrlSourceType(item.url),
    }));
  }

  _classifyUrlSourceType(url) {
    const lower = String(url || '').toLowerCase();
    if (/(developer\.mozilla\.org|docs\.python\.org|nodejs\.org|w3\.org|tc39\.es|ietf\.org)/.test(lower)) {
      return '📘 توثيق رسمي';
    }
    if (/(wikipedia\.org)/.test(lower)) {
      return '📖 موسوعة عامة';
    }
    if (/(\.edu|coursera|khanacademy|mit\.edu|stanford\.edu|harvard\.edu|freecodecamp)/.test(lower)) {
      return '🎓 مصدر تعليمي';
    }
    return '🌐 بحث ويب عام';
  }

  _deduplicateSources(list) {
    const seen = new Set();
    const out = [];
    for (const item of list) {
      if (!item?.url || seen.has(item.url)) continue;
      seen.add(item.url);
      out.push(item);
    }
    return out;
  }

  _providerLabelAr(provider) {
    const map = {
      multi: 'بحث متعدد المصادر (ويب + توثيق رسمي + تعليمي + موسوعة)',
      serper: 'بحث الويب عبر Serper',
      brave: 'بحث الويب عبر Brave Search',
      duckduckgo: 'بحث الويب عبر DuckDuckGo',
      wikipedia: 'موسوعة Wikipedia',
      disabled: 'معطّل',
    };
    return map[provider] || provider;
  }

  _buildDeterministicResearchSummary(query, sources) {
    const uniqueTypes = [...new Set(sources.map((s) => s.sourceTypeLabel))];
    return [
      `📌 *الحقائق والمقتطفات المباشرة من المصادر:*`,
      ...sources.map((s, i) => `• [${i + 1}] (${s.sourceTypeLabel}) ${s.snippet || s.title}`),
      ``,
      `⚖️ *مقارنة المصادر وتقييمها:*`,
      `• تم جمع النتائج من ${sources.length} مصادر ضمن (${uniqueTypes.join('، ')}) حول "${query}".`,
      sources.length > 1
        ? `• قارن تفاصيل المصادر [1] إلى [${sources.length}] أدناه للتأكد من عدم وجود تعارض في الأرقام أو التواريخ.`
        : `• مصدر واحد متاح فقط؛ يُنصح بمراجعة مصادر إضافية للتحقق المتقاطع.`,
      ``,
      `❓ *ما لم يُتحقق منه بعد:*`,
      `• تعتمد هذه الخلاصة على المقتطفات المفهرسة فقط دون قراءة كامل صفحات الويب؛ أرسل رابطاً محدداً لتحليل نصه الكامل.`,
    ].join('\n');
  }
}

export const ResearchEngine = ResearchModule;
