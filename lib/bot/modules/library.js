import { ARABIC_DIVIDER, formatHeader, normalizeCommandText, paginateItems } from '../../utils/text.js';

export class LibraryModule {
  constructor({ repos }) {
    this.repos = repos;
  }

  openHub(user) {
    this.repos.users.setState(user.id, { menu: 'library', data: { kind: 'hub', page: 1 } });
    return {
      text: [
        formatHeader('🎌', 'مكتبة الأنمي والترفيه المرخّص والمعرفة', 'مصادر قانونية وتعليمية موثّقة فقط'),
        `*1.* 🎌 دليل الأنمي التعليمي والمرخّص`,
        `*2.* 📚 مكتبة المعرفة والكتب المفتوحة`,
        ARABIC_DIVIDER,
        `اختر القسم المطلوب أو أرسل اسماً للبحث المباشر، أو *رئيسية* للعودة.`,
      ].join('\n'),
      interactiveList: {
        title: '🎌 مكتبة الأنمي والمعرفة',
        text: 'اختر الدليل الذي تود تصفحه:',
        buttonText: 'اختر الدليل',
        footer: 'جميع الروابط مرخّصة ومفتوحة قانونياً',
        sections: [
          {
            title: 'الأدلة المتاحة',
            rows: [
              { rowId: 'library:anime', title: '🎌 دليل الأنمي المرخّص', description: 'أعمال علمية ولغوية بروابط رسمية مرخّصة' },
              { rowId: 'library:knowledge', title: '📚 مكتبة المعرفة المفتوحة', description: 'توثيقات رسمية وكتب ملكية عامة مجانية' },
            ],
          },
        ],
      },
      buttons: [
        { id: 'library:anime', title: '🎌 دليل الأنمي' },
        { id: 'library:knowledge', title: '📚 مكتبة المعرفة' },
        { id: 'nav:home', title: '🏠 الرئيسية' },
      ],
    };
  }

  openKnowledge(user, page = 1) {
    return this._renderCatalogPage(user, { kind: 'knowledge', query: '', page });
  }

  openAnime(user, page = 1) {
    return this._renderCatalogPage(user, { kind: 'anime', query: '', page });
  }

  handleInput({ user, text, selectedId = null, state }) {
    const raw = String(selectedId || text || '').trim();
    const norm = normalizeCommandText(raw);
    const data = state?.data || {};
    const kind = data.kind || 'hub';
    const currentPage = Number(data.page) || 1;

    if (raw === 'library:anime' || (kind === 'hub' && (norm === '1' || norm.includes('انمي')))) {
      return this.openAnime(user, 1);
    }
    if (raw === 'library:knowledge' || (kind === 'hub' && (norm === '2' || norm.includes('معرفه') || norm.includes('كتب')))) {
      return this.openKnowledge(user, 1);
    }
    if (raw === 'library:hub') {
      return this.openHub(user);
    }

    const activeKind = kind === 'hub' ? 'anime' : kind;
    if (raw === 'page:next' || norm === 'التالي') {
      return this._renderCatalogPage(user, { kind: activeKind, query: data.query || '', page: currentPage + 1 });
    }
    if (raw === 'page:prev' || norm === 'السابق') {
      return this._renderCatalogPage(user, { kind: activeKind, query: data.query || '', page: Math.max(1, currentPage - 1) });
    }

    const query = norm === 'الكل' || norm === 'all' ? '' : raw;
    return this._renderCatalogPage(user, { kind: activeKind, query, page: 1 });
  }

  _renderCatalogPage(user, { kind, query = '', page = 1 }) {
    const allItems = this.repos.resources.list({ kind, query, limit: 50 });
    const paged = paginateItems(allItems, page, 4);

    this.repos.users.setState(user.id, {
      menu: 'library',
      data: { kind, query, page: paged.page, totalPages: paged.totalPages },
    });

    const isAnime = kind === 'anime';
    const title = isAnime ? 'دليل الأنمي التعليمي والمرخّص' : 'مكتبة المعرفة والمصادر المفتوحة';
    const emoji = isAnime ? '🎌' : '📚';
    const subtitle = query
      ? `نتائج البحث عن "${query}" (${paged.totalItems}) · صفحة ${paged.page}/${paged.totalPages}`
      : `${paged.totalItems} مصدر موثّق · صفحة ${paged.page} من ${paged.totalPages}`;

    const footer = isAnime
      ? '⚖️ جميع الروابط قانونية ومرخصة فقط. اكتب كلمة بحث (مثل: Dr. STONE أو يابانية) أو *الكل*.'
      : 'اكتب كلمة للبحث (مثل: برمجة، يابانية، كتب) أو *الكل* لعرض القائمة.';

    const buttons = [];
    if (paged.hasPrev) buttons.push({ id: 'page:prev', title: '⬅️ السابق' });
    if (paged.hasNext) buttons.push({ id: 'page:next', title: 'التالي ➡️' });
    buttons.push({ id: isAnime ? 'library:knowledge' : 'library:anime', title: isAnime ? '📚 المعرفة' : '🎌 الأنمي' });
    if (buttons.length < 3) buttons.push({ id: 'nav:home', title: '🏠 الرئيسية' });

    return {
      text: this._formatCatalog(formatHeader(emoji, title, subtitle), paged.items, paged.startIndex, footer),
      buttons: buttons.slice(0, 3),
    };
  }

  _formatCatalog(header, items, startIndex = 0, footer = '') {
    if (!items.length) {
      return `${header}\n\nلم يتم العثور على نتائج مطابقة.\n${ARABIC_DIVIDER}\n${footer}`;
    }

    const body = items
      .map((item, idx) => {
        const displayTitle = item.title_ar ? `${item.title_ar} (${item.title})` : item.title;
        const meta = [item.category, item.genre, item.source_label].filter(Boolean).join(' · ');
        return `*${startIndex + idx + 1}.* *${displayTitle}*\n   _${meta}_\n   ${item.description_ar}\n   🔗 ${item.legal_url}`;
      })
      .join('\n\n');

    return `${header}\n\n${body}\n\n${ARABIC_DIVIDER}\n${footer}`;
  }
}
