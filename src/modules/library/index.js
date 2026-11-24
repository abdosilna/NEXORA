import { normalizeCommandText } from '../../utils/text.js';

export class LibraryModule {
  constructor({ repos }) {
    this.repos = repos;
  }

  openKnowledge(user) {
    this.repos.users.setState(user.id, { menu: 'library', data: { kind: 'knowledge' } });
    const items = this.repos.resources.list({ kind: 'knowledge', limit: 8 });
    return {
      text: this._formatCatalog('📚 *مكتبة المعرفة والمصادر المفتوحة*', items, 'اكتب كلمة للبحث في المكتبة (مثل: برمجة، يابانية، كتب) أو أرسل *رئيسية*.'),
    };
  }

  openAnime(user) {
    this.repos.users.setState(user.id, { menu: 'library', data: { kind: 'anime' } });
    const items = this.repos.resources.list({ kind: 'anime', limit: 8 });
    return {
      text: this._formatCatalog('🎌 *دليل الأنمي التعليمي والمرخّص*', items, 'اكتب تصنيفاً أو اسماً للبحث (مثل: علمي، يابانية، Dr. STONE) أو أرسل *رئيسية*.\n⚖️ جميع الروابط قانونية ومرخصة فقط.'),
    };
  }

  handleInput({ user, text, state }) {
    const kind = state?.data?.kind || 'knowledge';
    const norm = normalizeCommandText(text);
    const query = norm === 'الكل' || norm === 'all' ? '' : text.trim();
    const items = this.repos.resources.list({ kind, query, limit: 10 });

    const header =
      kind === 'anime'
        ? `🎌 *نتائج دليل الأنمي المرخّص (${items.length}):*`
        : `📚 *نتائج مكتبة المعرفة (${items.length}):*`;

    return {
      text: this._formatCatalog(
        header,
        items,
        'اكتب كلمة بحث جديدة، أو *الكل* لعرض القائمة، أو *رئيسية* للعودة.'
      ),
    };
  }

  _formatCatalog(header, items, footer) {
    if (!items.length) {
      return `${header}\n\nلم يتم العثور على نتائج مطابقة.\n${footer}`;
    }

    const body = items
      .map((item, idx) => {
        const displayTitle = item.title_ar ? `${item.title_ar} (${item.title})` : item.title;
        const meta = [item.category, item.genre, item.source_label].filter(Boolean).join(' · ');
        return `${idx + 1}. *${displayTitle}*\n   ${meta}\n   ${item.description_ar}\n   🔗 ${item.legal_url}`;
      })
      .join('\n\n');

    return `${header}\n\n${body}\n\n—\n${footer}`;
  }
}
