const express = require('express');
const path = require('path');
const Parser = require('rss-parser');
const NodeCache = require('node-cache');

const app = express();
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Legal News App/1.0'
  }
});

// キャッシュ設定（1時間）
const cache = new NodeCache({ stdTTL: 3600 });

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

// 法務・コンプライアンス関連のRSSフィードソース
const NEWS_SOURCES = [
  {
    name: '法務省新着情報',
    url: 'https://www.moj.go.jp/rss/index.xml',
    category: '法務省'
  },
  {
    name: '金融庁報道発表',
    url: 'https://www.fsa.go.jp/news/news.rdf',
    category: '金融規制'
  },
  {
    name: '消費者庁新着情報',
    url: 'https://www.caa.go.jp/rss/policies.rdf',
    category: '消費者保護'
  },
  {
    name: '公正取引委員会',
    url: 'https://www.jftc.go.jp/rss/index.xml',
    category: '独禁法'
  },
  {
    name: '個人情報保護委員会',
    url: 'https://www.ppc.go.jp/files/rss/news.xml',
    category: '個人情報保護'
  }
];

// ニュースカテゴリ定義
const CATEGORIES = {
  all: 'すべて',
  legal: '法務省',
  finance: '金融規制',
  consumer: '消費者保護',
  antitrust: '独禁法',
  privacy: '個人情報保護'
};

// RSSフィードを取得してパース
async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.map(item => ({
      title: item.title || '(タイトルなし)',
      link: item.link || '#',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      description: item.contentSnippet || item.content || item.description || '',
      source: source.name,
      category: source.category
    }));
  } catch (error) {
    console.error(`フィード取得エラー (${source.name}):`, error.message);
    return [];
  }
}

// 全ニュースを取得
async function getAllNews() {
  const cachedNews = cache.get('allNews');
  if (cachedNews) {
    return cachedNews;
  }

  const promises = NEWS_SOURCES.map(source => fetchFeed(source));
  const results = await Promise.all(promises);

  // 全記事をフラット化して日付でソート
  const allNews = results
    .flat()
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  cache.set('allNews', allNews);
  return allNews;
}

// サンプルニュースデータ（フィードが取得できない場合のフォールバック）
function getSampleNews() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      title: '【法務省】会社法改正に関するパブリックコメント募集開始',
      link: 'https://www.moj.go.jp/',
      pubDate: today.toISOString(),
      description: '法務省は、会社法施行規則の一部改正案について、広く国民からの意見を募集します。',
      source: '法務省新着情報',
      category: '法務省'
    },
    {
      title: '【金融庁】金融商品取引業者等向け監督指針の改正について',
      link: 'https://www.fsa.go.jp/',
      pubDate: today.toISOString(),
      description: '金融商品取引業者等向けの総合的な監督指針について改正を行いました。',
      source: '金融庁報道発表',
      category: '金融規制'
    },
    {
      title: '【消費者庁】景品表示法に基づく措置命令について',
      link: 'https://www.caa.go.jp/',
      pubDate: today.toISOString(),
      description: '不当な表示を行った事業者に対し、措置命令を行いました。',
      source: '消費者庁新着情報',
      category: '消費者保護'
    },
    {
      title: '【公正取引委員会】独占禁止法違反事件の処理状況について',
      link: 'https://www.jftc.go.jp/',
      pubDate: yesterday.toISOString(),
      description: '令和6年度における独占禁止法違反事件の処理状況を公表しました。',
      source: '公正取引委員会',
      category: '独禁法'
    },
    {
      title: '【個人情報保護委員会】個人情報保護法ガイドラインの改正',
      link: 'https://www.ppc.go.jp/',
      pubDate: yesterday.toISOString(),
      description: '個人情報の保護に関する法律についてのガイドラインを改正しました。',
      source: '個人情報保護委員会',
      category: '個人情報保護'
    },
    {
      title: '【法務省】民事訴訟法等の一部を改正する法律の施行について',
      link: 'https://www.moj.go.jp/',
      pubDate: yesterday.toISOString(),
      description: '民事訴訟手続のIT化に関する法律が施行されました。',
      source: '法務省新着情報',
      category: '法務省'
    }
  ];
}

// API: ニュース一覧取得
app.get('/api/news', async (req, res) => {
  try {
    let news = await getAllNews();

    // ニュースが取得できない場合はサンプルデータを使用
    if (news.length === 0) {
      news = getSampleNews();
    }

    // カテゴリフィルタ
    const { category, search, date } = req.query;

    if (category && category !== 'all') {
      const categoryMap = {
        'legal': '法務省',
        'finance': '金融規制',
        'consumer': '消費者保護',
        'antitrust': '独禁法',
        'privacy': '個人情報保護'
      };
      news = news.filter(item => item.category === categoryMap[category]);
    }

    // 検索フィルタ
    if (search) {
      const searchLower = search.toLowerCase();
      news = news.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    // 日付フィルタ
    if (date) {
      const filterDate = new Date(date).toDateString();
      news = news.filter(item =>
        new Date(item.pubDate).toDateString() === filterDate
      );
    }

    res.json({
      success: true,
      count: news.length,
      lastUpdated: new Date().toISOString(),
      news: news
    });
  } catch (error) {
    console.error('ニュース取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ニュースの取得に失敗しました'
    });
  }
});

// API: カテゴリ一覧取得
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: CATEGORIES
  });
});

// API: ニュースソース一覧取得
app.get('/api/sources', (req, res) => {
  res.json({
    success: true,
    sources: NEWS_SOURCES.map(s => ({ name: s.name, category: s.category }))
  });
});

// API: キャッシュクリア
app.post('/api/refresh', (req, res) => {
  cache.flushAll();
  res.json({
    success: true,
    message: 'キャッシュをクリアしました'
  });
});

// ルートへのアクセスはindex.htmlを返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  法務・コンプライアンス日次ニュース配信アプリ             ║
║  サーバー起動: http://localhost:${PORT}                     ║
╚════════════════════════════════════════════════════════════╝
  `);
});
