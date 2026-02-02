/**
 * 法務・コンプライアンス日次ニュース メール配信スクリプト
 *
 * 環境変数:
 * - SENDGRID_API_KEY: SendGrid APIキー
 * - MAIL_TO: 送信先メールアドレス
 * - MAIL_FROM: 送信元メールアドレス
 */

const sgMail = require('@sendgrid/mail');
const Parser = require('rss-parser');

// SendGrid設定
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Legal News App/1.0'
  }
});

// ニュースソース定義（NHKニュース）
const NEWS_SOURCES = [
  {
    name: 'NHK政治ニュース',
    url: 'https://www.nhk.or.jp/rss/news/cat3.xml',
    category: '政治・法務',
    priority: 1
  },
  {
    name: 'NHK経済ニュース',
    url: 'https://www.nhk.or.jp/rss/news/cat4.xml',
    category: '経済・金融',
    priority: 2
  },
  {
    name: 'NHK社会ニュース',
    url: 'https://www.nhk.or.jp/rss/news/cat2.xml',
    category: '社会・事件',
    priority: 1
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

// 法務・コンプライアンス関連ニュースかどうかを判定
function isLegalNews(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return LEGAL_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

// RSSフィードを取得
async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.map(item => ({
      title: item.title || '(タイトルなし)',
      link: item.link || '#',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      description: item.contentSnippet || item.content || item.description || '',
      source: source.name,
      category: source.category,
      priority: source.priority
    }));
  } catch (error) {
    console.error(`フィード取得エラー (${source.name}):`, error.message);
    return [];
  }
}

// 全ニュースを取得
async function getAllNews() {
  console.log('ニュースを取得中...');

  const promises = NEWS_SOURCES.map(source => fetchFeed(source));
  const results = await Promise.all(promises);

  // 全記事をフラット化
  const allNews = results.flat();
  console.log(`合計${allNews.length}件のニュースを取得`);

  // 法務・コンプライアンス関連ニュースをフィルタリング
  const legalNews = allNews.filter(item =>
    isLegalNews(item.title, item.description)
  );
  console.log(`法務・コンプライアンス関連: ${legalNews.length}件`);

  // 24時間以内のニュースをフィルタ
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const recentNews = legalNews.filter(item => {
    const pubDate = new Date(item.pubDate);
    return pubDate >= yesterday;
  });

  // 優先度と日付でソート
  recentNews.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return new Date(b.pubDate) - new Date(a.pubDate);
  });

  console.log(`24時間以内の法務関連ニュース: ${recentNews.length}件`);
  return recentNews;
}

// サンプルニュース（フィードが取得できない場合）
function getSampleNews() {
  const today = new Date();
  return [
    {
      title: '【法務省】会社法改正に関するパブリックコメント募集開始',
      link: 'https://www.moj.go.jp/',
      pubDate: today.toISOString(),
      description: '法務省は、会社法施行規則の一部改正案について、広く国民からの意見を募集します。改正案では、株主総会の電子化推進や取締役会のオンライン開催に関する規定が含まれています。',
      source: '法務省新着情報',
      category: '法務省',
      priority: 1
    },
    {
      title: '【金融庁】金融商品取引業者等向け監督指針の改正について',
      link: 'https://www.fsa.go.jp/',
      pubDate: today.toISOString(),
      description: '金融商品取引業者等向けの総合的な監督指針について改正を行いました。顧客本位の業務運営に関する原則の実効性確保が主な改正点です。',
      source: '金融庁報道発表',
      category: '金融規制',
      priority: 2
    },
    {
      title: '【消費者庁】景品表示法に基づく措置命令について',
      link: 'https://www.caa.go.jp/',
      pubDate: today.toISOString(),
      description: '不当な表示を行った事業者に対し、措置命令を行いました。',
      source: '消費者庁新着情報',
      category: '消費者保護',
      priority: 3
    }
  ];
}

// 要約を生成（説明文から3〜5行程度）
function generateSummary(description, maxLines = 5) {
  if (!description) return '詳細は元記事をご確認ください。';

  // 改行で分割して整形
  const lines = description
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[。．]/)
    .filter(line => line.trim().length > 0)
    .slice(0, maxLines)
    .map(line => line.trim() + '。');

  return lines.join('\n') || '詳細は元記事をご確認ください。';
}

// 日付フォーマット
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

// メール本文を生成
function generateEmailContent(news, date) {
  const dateStr = formatDate(date);

  // ニュースがない場合
  if (news.length === 0) {
    return {
      subject: `【法務ニュース】${dateStr}`,
      text: `${dateStr}の法務・コンプライアンスニュース\n\n本日は新着ニュースがありませんでした。\n\n---\n法務・コンプライアンス日次ニュース配信`,
      html: generateHtmlNoNews(dateStr)
    };
  }

  // 注目トピック（上位1〜3件）
  const featuredNews = news.slice(0, 3);

  // その他の重要ニュース（4件目以降、最大10件）
  const otherNews = news.slice(3, 13);

  // テキスト版
  let textContent = `${dateStr}の法務・コンプライアンスニュース\n\n`;
  textContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  textContent += `■ 注目トピック\n`;
  textContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  featuredNews.forEach((item, index) => {
    textContent += `【${index + 1}】${item.title}\n`;
    textContent += `【${item.category}】${item.source}\n\n`;
    textContent += `${generateSummary(item.description)}\n\n`;
    textContent += `▶ 元記事: ${item.link}\n\n`;
    textContent += `---\n\n`;
  });

  if (otherNews.length > 0) {
    textContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    textContent += `■ その他の重要ニュース\n`;
    textContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    otherNews.forEach(item => {
      textContent += `• ${item.title}\n`;
      textContent += `  【${item.category}】${item.link}\n\n`;
    });
  }

  textContent += `\n---\n`;
  textContent += `法務・コンプライアンス日次ニュース配信\n`;
  textContent += `※本メールは自動配信です。\n`;

  // HTML版
  const htmlContent = generateHtmlContent(featuredNews, otherNews, dateStr);

  return {
    subject: `【法務ニュース】${dateStr}`,
    text: textContent,
    html: htmlContent
  };
}

// HTML版メール本文を生成
function generateHtmlContent(featuredNews, otherNews, dateStr) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- ヘッダー -->
    <tr>
      <td style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">⚖ 法務・コンプライアンスニュース</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">${dateStr}</p>
      </td>
    </tr>

    <!-- 注目トピック -->
    <tr>
      <td style="padding: 24px;">
        <h2 style="color: #1a365d; font-size: 16px; border-bottom: 2px solid #1a365d; padding-bottom: 8px; margin: 0 0 16px 0;">
          📌 注目トピック
        </h2>

        ${featuredNews.map((item, index) => `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #3182ce;">
          <span style="display: inline-block; background: #ebf8ff; color: #2b6cb0; padding: 2px 10px; border-radius: 12px; font-size: 12px; margin-bottom: 8px;">
            ${escapeHtml(item.category)}
          </span>
          <h3 style="color: #1a202c; font-size: 15px; margin: 8px 0;">
            ${escapeHtml(item.title)}
          </h3>
          <p style="color: #4a5568; font-size: 13px; line-height: 1.6; margin: 8px 0;">
            ${escapeHtml(generateSummary(item.description, 3))}
          </p>
          <p style="margin: 12px 0 0 0;">
            <a href="${escapeHtml(item.link)}" style="color: #3182ce; font-size: 13px; text-decoration: none;">
              ▶ 元記事を読む →
            </a>
          </p>
          <p style="color: #718096; font-size: 11px; margin: 8px 0 0 0;">
            出典: ${escapeHtml(item.source)}
          </p>
        </div>
        `).join('')}
      </td>
    </tr>

    ${otherNews.length > 0 ? `
    <!-- その他のニュース -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <h2 style="color: #1a365d; font-size: 16px; border-bottom: 2px solid #1a365d; padding-bottom: 8px; margin: 0 0 16px 0;">
          📋 その他の重要ニュース
        </h2>
        <ul style="margin: 0; padding: 0; list-style: none;">
          ${otherNews.map(item => `
          <li style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <a href="${escapeHtml(item.link)}" style="color: #2d3748; font-size: 13px; text-decoration: none; display: block;">
              • ${escapeHtml(item.title)}
            </a>
            <span style="color: #718096; font-size: 11px;">【${escapeHtml(item.category)}】</span>
          </li>
          `).join('')}
        </ul>
      </td>
    </tr>
    ` : ''}

    <!-- フッター -->
    <tr>
      <td style="background: #2d3748; padding: 20px; text-align: center;">
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">
          法務・コンプライアンス日次ニュース配信
        </p>
        <p style="color: #718096; font-size: 11px; margin: 8px 0 0 0;">
          ※本メールは自動配信です。ニュースはNHKニュースRSSフィードより取得しています。
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ニュースがない場合のHTML
function generateHtmlNoNews(dateStr) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">⚖ 法務・コンプライアンスニュース</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">${dateStr}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px; text-align: center;">
        <p style="color: #4a5568; font-size: 14px;">本日は新着ニュースがありませんでした。</p>
      </td>
    </tr>
    <tr>
      <td style="background: #2d3748; padding: 20px; text-align: center;">
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">法務・コンプライアンス日次ニュース配信</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// HTMLエスケープ
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// メイン処理
async function main() {
  console.log('='.repeat(50));
  console.log('法務・コンプライアンス日次ニュース メール配信');
  console.log('='.repeat(50));
  console.log(`実行日時: ${new Date().toLocaleString('ja-JP')}`);

  // 環境変数チェック
  if (!process.env.SENDGRID_API_KEY) {
    console.error('エラー: SENDGRID_API_KEY が設定されていません');
    process.exit(1);
  }

  const mailTo = process.env.MAIL_TO || 'takayuki.mito@gmail.com';
  const mailFrom = process.env.MAIL_FROM || 'noreply@legal-news.example.com';

  console.log(`送信先: ${mailTo}`);
  console.log(`送信元: ${mailFrom}`);

  try {
    // ニュース取得
    let news = await getAllNews();

    // ニュースがない場合はサンプルを使用（オプション）
    if (news.length === 0) {
      console.log('ニュースが取得できませんでした。サンプルデータを使用します。');
      news = getSampleNews();
    }

    // メール本文生成
    const today = new Date();
    const emailContent = generateEmailContent(news, today);

    console.log(`件名: ${emailContent.subject}`);
    console.log(`ニュース件数: 注目${Math.min(news.length, 3)}件 + その他${Math.max(0, Math.min(news.length - 3, 10))}件`);

    // メール送信
    const msg = {
      to: mailTo,
      from: mailFrom,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    await sgMail.send(msg);
    console.log('✅ メール送信完了');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('SendGrid エラー詳細:', error.response.body);
    }
    process.exit(1);
  }
}

main();
