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

// ニュースRSSフィードソース（NHKニュース）
const NEWS_SOURCES = [
  {
    name: 'NHK政治ニュース',
    url: 'https://www.nhk.or.jp/rss/news/cat3.xml',
    category: '政治・法務'
  },
  {
    name: 'NHK経済ニュース',
    url: 'https://www.nhk.or.jp/rss/news/cat4.xml',
    category: '経済・金融'
  },
  {
    name: 'NHK社会ニュース',
    url: 'https://www.nhk.or.jp/rss/news/cat2.xml',
    category: '社会・事件'
  }
];

// 法務・コンプライアンス関連キーワード
const LEGAL_KEYWORDS = [
  '法', '法律', '法案', '法改正', '法務', '裁判', '判決', '訴訟', '弁護士',
  '規制', '違反', '処分', '命令', '罰則', '罰金', '逮捕', '起訴', '摘発',
  '金融庁', '公正取引', '独禁', '独占禁止', 'カルテル', '談合',
  '個人情報', 'プライバシー', '情報漏洩', 'データ保護',
  '消費者', '景品表示', '不当表示', '詐欺', '悪質商法',
  'コンプライアンス', 'ガバナンス', '内部統制', '監査',
  '株主', '取締役', '会社法', '商法', '民法', '刑法',
  '労働', '雇用', 'ハラスメント', '解雇', '賃金',
  '税', '脱税', '申告漏れ', '課税',
  '特許', '商標', '著作権', '知的財産',
  '汚職', '贈収賄', '背任', '横領'
];

// ニュースカテゴリ定義
const CATEGORIES = {
  all: 'すべて',
  politics: '政治・法務',
  economy: '経済・金融',
  society: '社会・事件'
};

// 法務・コンプライアンス関連ニュースかどうかを判定
function isLegalNews(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return LEGAL_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

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

  // 全記事をフラット化
  const allNews = results.flat();

  // 法務・コンプライアンス関連ニュースをフィルタリング
  const legalNews = allNews.filter(item =>
    isLegalNews(item.title, item.description)
  );

  // 日付でソート
  legalNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  cache.set('allNews', legalNews);
  return legalNews;
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
        'politics': '政治・法務',
        'economy': '経済・金融',
        'society': '社会・事件'
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
