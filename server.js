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
      title: '改正会社法が成立 株主総会のオンライン開催が可能に',
      link: 'https://www3.nhk.or.jp/news/',
      pubDate: today.toISOString(),
      description: '企業の株主総会をオンラインのみで開催することを認める改正会社法が参議院本会議で可決・成立しました。',
      source: 'NHK政治ニュース',
      category: '政治・法務'
    },
    {
      title: '金融庁 暗号資産交換業者に業務改善命令',
      link: 'https://www3.nhk.or.jp/news/',
      pubDate: today.toISOString(),
      description: '金融庁は、顧客資産の管理体制に問題があったとして、暗号資産交換業者に対し業務改善命令を出しました。',
      source: 'NHK経済ニュース',
      category: '経済・金融'
    },
    {
      title: '大手企業の元役員 背任容疑で逮捕',
      link: 'https://www3.nhk.or.jp/news/',
      pubDate: today.toISOString(),
      description: '会社に損害を与えたとして、大手企業の元役員が背任の疑いで逮捕されました。',
      source: 'NHK社会ニュース',
      category: '社会・事件'
    },
    {
      title: '公正取引委員会 大手IT企業に排除措置命令',
      link: 'https://www3.nhk.or.jp/news/',
      pubDate: yesterday.toISOString(),
      description: '公正取引委員会は、独占禁止法違反で大手IT企業に排除措置命令を出しました。',
      source: 'NHK経済ニュース',
      category: '経済・金融'
    },
    {
      title: '個人情報保護法違反で企業に是正勧告',
      link: 'https://www3.nhk.or.jp/news/',
      pubDate: yesterday.toISOString(),
      description: '個人情報保護委員会は、顧客情報の管理に問題があった企業に是正勧告を出しました。',
      source: 'NHK社会ニュース',
      category: '社会・事件'
    },
    {
      title: '労働基準法改正案 今国会に提出へ',
      link: 'https://www3.nhk.or.jp/news/',
      pubDate: yesterday.toISOString(),
      description: '政府は労働時間規制の見直しを含む労働基準法改正案を今国会に提出する方針です。',
      source: 'NHK政治ニュース',
      category: '政治・法務'
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
