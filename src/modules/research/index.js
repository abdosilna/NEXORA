import { safePublicFetch, validateSafePublicUrl } from '../../security/ssrf.js';
import { sharedRateLimiter } from '../../security/rate-limit.js';
import { sanitizeIncomingText } from '../../security/sanitize.js';

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
    return {
      provider: this.config.research.provider,
      enabled: this.config.research.provider !== 'disabled',
      ssrfProtected: true,
    };
  }

  openHome(user) {
    this.repos.users.setState(user.id, { menu: 'research', data: { mode: 'await_query' } });
    return {
      text: [
        `🔎 *مساعد البحث المستقل — NEXORA*`,
        `المزود المفعّل: *${this.config.research.provider}* (مع فحص أمان الروابط ومنع SSRF).`,
        ``,
        `أرسل موضوع البحث أو سؤالاً، أو أرسل رابطاً عاماً موثوقاً (https://...) لتحليله:`,
        `• يعرض لك الحقائق المستخلصة مقابل التفسيرات وما لم يُتحقق منه`,
        `• يذكر عناوين المصادر الفعلية وروابطها وتاريخ الاسترجاع دون أي اختلاق`,
        `• أرسل *رئيسية* للعودة.`,
      ].join('\n'),
    };
  }

  async handleInput({ user, text }) {
    const query = sanitizeIncomingText(text, 300);
    if (!query || query.length < 2) {
      return { text: 'يرجى كتابة عبارة بحث واضحة (حرفين على الأقل).' };
    }

    if (this.config.research.provider === 'disabled') {
      return {
        text: '⚠️ خدمة البحث عبر الويب معطلة حالياً من إعدادات النظام.',
      };
    }

    const rate = sharedRateLimiter.check(`research:${user.id}`, { limit: 6, windowMs: 60_000 });
    if (!rate.allowed) {
      return {
        text: `⏳ تجاوزت حد طلبات البحث المؤقت. انتظر ${Math.ceil(rate.retryAfterMs / 1000)} ثانية وحاول مجدداً.`,
      };
    }

    const retrievedAt = new Date().toISOString().slice(0, 10);

    // Direct URL inspection mode (SSRF protected)
    if (/^https?:\/\//i.test(query)) {
      return this._inspectSingleUrl({ user, rawUrl: query, retrievedAt });
    }

    const sources = await this._searchSources(query);
    if (!sources.length) {
      return {
        text: [
          `🔎 *نتائج البحث عن:* "${query}"`,
          `تاريخ الاسترجاع: ${retrievedAt}`,
          ``,
          `لم يُعثر على مصادر عامة متاحة وموثوقة مطابقة تماماً لعبارة البحث عبر مزود (${this.config.research.provider}).`,
          `• جرّب صياغة أبسط أو كلمات مفتاحية إنجليزية/عربية أدق.`,
          `• لا يتم اختلاق أي مصادر غير موجودة.`,
        ].join('\n'),
      };
    }

    const formattedSources = sources
      .map((s, i) => `[${i + 1}] ${s.title}\nالرابط: ${s.url}\nالمقتطف: ${s.snippet}`)
      .join('\n\n');

    const aiRes = await this.aiService.complete({
      userId: user.id,
      systemAddon: `أنت باحث علمي مستقل. لخص المصادر التالية فقط بالعربية.
قواعد صارمة:
1. افصل بوضوح بين: (أ) الحقائق المباشرة من المصادر، (ب) التفسيرات أو المقارنة بين المصادر وأي تناقض، (ج) الجوانب غير المؤكدة/المفقودة.
2. لا تذكر أي معلومة أو رابط غير موجود في المصادر المزوّدة.
3. أشر إلى أرقام المصادر [1]، [2]..`,
      messages: [
        {
          role: 'user',
          content: `السؤال/الموضوع: ${query}\n\nالمصادر المسترجعة بتاريخ ${retrievedAt}:\n${formattedSources}`,
        },
      ],
      temperature: 0.2,
      context: { level: user.learning_level },
    });

    const summaryBody = aiRes.isFallback
      ? this._buildDeterministicResearchSummary(query, sources)
      : aiRes.text;

    const citations = sources
      .map((s, i) => `[${i + 1}] *${s.title}*\n🔗 ${s.url}\n📅 تاريخ الاسترجاع: ${retrievedAt}`)
      .join('\n\n');

    this.repos.progress.recordLearningEvent({
      userId: user.id,
      module: 'research',
      eventType: 'search_completed',
      topic: query.slice(0, 80),
      payload: { sourcesCount: sources.length, provider: this.config.research.provider },
    });

    return {
      text: [
        `🔎 *تقرير البحث المستقل: ${query}*`,
        `تاريخ الاسترجاع: ${retrievedAt} · المزود: ${this.config.research.provider}`,
        '',
        summaryBody,
        '',
        `📚 *المصادر الفعلية:*`,
        citations,
      ].join('\n'),
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
        .slice(0, 2200);

      if (!plain) {
        return { text: `تم فحص الرابط (${fetched.url}) لكنه لم يحتوِ على نص قابل للقراءة.` };
      }

      const aiRes = await this.aiService.complete({
        userId: user.id,
        systemAddon:
          'لخّص النص التالي من الصفحة العامة بالعربية مع فصل الحقائق المباشرة عن التفسيرات وتوضيح أي نقص في المعلومات.',
        messages: [{ role: 'user', content: `المصدر: ${title} (${fetched.url})\nالنص:\n${plain}` }],
        temperature: 0.2,
      });

      return {
        text: [
          `🌐 *تحليل مصدر عام موثّق*`,
          `العنوان: *${title}*`,
          `الرابط: ${fetched.url}`,
          `تاريخ الاسترجاع: ${retrievedAt}`,
          '',
          aiRes.isFallback ? `• مقتطف من الصفحة:\n${plain.slice(0, 600)}...` : aiRes.text,
        ].join('\n'),
      };
    } catch (err) {
      return {
        text: `🛡️ تعذر جلب الرابط لأسباب أمنية أو شبكية: ${err.message}`,
      };
    }
  }

  async _searchSources(query) {
    const provider = this.config.research.provider;
    try {
      if (provider === 'serper' && this.config.research.apiKey) {
        return await this._searchSerper(query);
      }
      if (provider === 'brave' && this.config.research.apiKey) {
        return await this._searchBrave(query);
      }
      if (provider === 'duckduckgo') {
        return await this._searchDuckDuckGo(query);
      }
      return await this._searchWikipedia(query);
    } catch (err) {
      this.logger?.warn?.('research', `Search provider ${provider} error`, err.message);
      return [];
    }
  }

  async _searchWikipedia(query) {
    const langs = /[\u0600-\u06FF]/.test(query) ? ['ar', 'en'] : ['en', 'ar'];
    const results = [];

    for (const lang of langs) {
      const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`;
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
        });
      }
      if (results.length >= 4) break;
    }
    return results.slice(0, 4);
  }

  async _searchDuckDuckGo(query) {
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await this.fetchImpl(apiUrl, {
      headers: { 'User-Agent': 'NexoraBot-Research/1.0' },
      signal: AbortSignal.timeout(this.config.research.timeoutMs),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out = [];
    if (data.AbstractText && data.AbstractURL) {
      out.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
      });
    }
    for (const topic of data.RelatedTopics || []) {
      if (topic.FirstURL && topic.Text && out.length < 4) {
        out.push({
          title: topic.Text.split(' - ')[0]?.slice(0, 80) || 'DuckDuckGo Result',
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }
    if (!out.length) {
      return this._searchWikipedia(query);
    }
    return out;
  }

  async _searchSerper(query) {
    const res = await this.fetchImpl('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.config.research.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 4 }),
      signal: AbortSignal.timeout(this.config.research.timeoutMs),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic || []).slice(0, 4).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
    }));
  }

  async _searchBrave(query) {
    const res = await this.fetchImpl(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=4`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.config.research.apiKey,
        },
        signal: AbortSignal.timeout(this.config.research.timeoutMs),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results || []).slice(0, 4).map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.description || '',
    }));
  }

  _buildDeterministicResearchSummary(query, sources) {
    return [
      `📌 *حقائق مباشرة من المصادر المسترجعة:*`,
      ...sources.map((s, i) => `• [${i + 1}] ${s.snippet || s.title}`),
      ``,
      `⚖️ *مقارنة وتفسير:*`,
      `• تعتمد النقاط أعلاه على المقتطفات المتاحة من ${sources.length} مصدر/مصادر عامة حول "${query}".`,
      ``,
      `❓ *ما لم يُتحقق منه بعد:*`,
      `• للتفاصيل الكاملة أو فض أي تعارض محتمل، راجع النص الكامل عبر الروابط الأصلية أدناه.`,
    ].join('\n');
  }
}
