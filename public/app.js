// 法務・コンプライアンス日次ニュースアプリ

class LegalNewsApp {
  constructor() {
    this.newsContainer = document.getElementById('news-container');
    this.categorySelect = document.getElementById('category-select');
    this.dateFilter = document.getElementById('date-filter');
    this.searchInput = document.getElementById('search-input');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.newsCount = document.getElementById('news-count');
    this.lastUpdated = document.getElementById('last-updated');

    this.news = [];
    this.debounceTimer = null;

    this.init();
  }

  init() {
    // イベントリスナーの設定
    this.categorySelect.addEventListener('change', () => this.filterNews());
    this.dateFilter.addEventListener('change', () => this.filterNews());
    this.searchInput.addEventListener('input', () => this.debounceSearch());
    this.refreshBtn.addEventListener('click', () => this.refreshNews());

    // 初期データの取得
    this.fetchNews();
  }

  // ニュースを取得
  async fetchNews() {
    this.showLoading();

    try {
      const params = new URLSearchParams();

      const category = this.categorySelect.value;
      if (category && category !== 'all') {
        params.append('category', category);
      }

      const date = this.dateFilter.value;
      if (date) {
        params.append('date', date);
      }

      const search = this.searchInput.value.trim();
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/news?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        this.news = data.news;
        this.renderNews(data.news);
        this.updateStatus(data.count, data.lastUpdated);
      } else {
        this.showError('ニュースの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      this.showError('ネットワークエラーが発生しました');
    }
  }

  // ニュースを表示
  renderNews(news) {
    if (!news || news.length === 0) {
      this.showEmpty();
      return;
    }

    // 日付でグループ化
    const groupedNews = this.groupByDate(news);

    let html = '';
    const today = new Date().toDateString();

    for (const [date, items] of Object.entries(groupedNews)) {
      const dateLabel = this.formatDateLabel(date);
      const isToday = new Date(date).toDateString() === today;

      html += `
        <div class="date-header">
          <span class="date-header-icon">&#128197;</span>
          ${dateLabel}${isToday ? ' (本日)' : ''}
        </div>
      `;

      items.forEach(item => {
        const categoryClass = this.getCategoryClass(item.category);
        const isItemToday = new Date(item.pubDate).toDateString() === today;

        html += `
          <article class="news-card ${isItemToday ? 'today' : ''}">
            <div class="news-card-header">
              <span class="news-category ${categoryClass}">${this.escapeHtml(item.category)}</span>
              <span class="news-date">${this.formatTime(item.pubDate)}</span>
            </div>
            <h2 class="news-title">
              <a href="${this.escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
                ${this.escapeHtml(item.title)}
              </a>
            </h2>
            ${item.description ? `<p class="news-description">${this.escapeHtml(item.description)}</p>` : ''}
            <div class="news-source">出典: ${this.escapeHtml(item.source)}</div>
          </article>
        `;
      });
    }

    this.newsContainer.innerHTML = html;
  }

  // 日付でグループ化
  groupByDate(news) {
    const grouped = {};

    news.forEach(item => {
      const date = new Date(item.pubDate).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    return grouped;
  }

  // カテゴリに応じたCSSクラスを取得
  getCategoryClass(category) {
    const classMap = {
      '法務省': 'category-legal',
      '金融規制': 'category-finance',
      '消費者保護': 'category-consumer',
      '独禁法': 'category-antitrust',
      '個人情報保護': 'category-privacy'
    };
    return classMap[category] || 'category-legal';
  }

  // 日付ラベルをフォーマット
  formatDateLabel(dateString) {
    const date = new Date(dateString);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    };
    return date.toLocaleDateString('ja-JP', options);
  }

  // 時刻をフォーマット
  formatTime(dateString) {
    const date = new Date(dateString);
    const options = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('ja-JP', options);
  }

  // ステータスを更新
  updateStatus(count, lastUpdated) {
    this.newsCount.textContent = `${count}件のニュース`;

    if (lastUpdated) {
      const date = new Date(lastUpdated);
      const options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      this.lastUpdated.textContent = `最終更新: ${date.toLocaleDateString('ja-JP', options)}`;
    }
  }

  // フィルター適用
  filterNews() {
    this.fetchNews();
  }

  // 検索のデバウンス
  debounceSearch() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.filterNews();
    }, 300);
  }

  // ニュースを更新
  async refreshNews() {
    this.refreshBtn.classList.add('loading');
    this.refreshBtn.disabled = true;

    try {
      // キャッシュをクリア
      await fetch('/api/refresh', { method: 'POST' });
      // 再取得
      await this.fetchNews();
    } catch (error) {
      console.error('Error refreshing news:', error);
    } finally {
      this.refreshBtn.classList.remove('loading');
      this.refreshBtn.disabled = false;
    }
  }

  // ローディング表示
  showLoading() {
    this.newsContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>ニュースを読み込んでいます...</p>
      </div>
    `;
  }

  // 空の状態を表示
  showEmpty() {
    this.newsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128240;</div>
        <p>条件に一致するニュースがありません</p>
        <p>フィルター条件を変更してお試しください</p>
      </div>
    `;
    this.newsCount.textContent = '0件のニュース';
  }

  // エラー表示
  showError(message) {
    this.newsContainer.innerHTML = `
      <div class="error-state">
        <p>&#9888; ${this.escapeHtml(message)}</p>
        <p>しばらく経ってから再度お試しください</p>
      </div>
    `;
  }

  // XSS対策のためのエスケープ
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
  new LegalNewsApp();
});
