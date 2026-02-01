# 法務・コンプライアンス日次ニュース配信アプリ

法務・コンプライアンス分野の最新ニュースを集約して配信するWebアプリケーションです。

## 機能

### Webアプリケーション
- **ニュース集約**: 法務省、金融庁、消費者庁、公正取引委員会、個人情報保護委員会などの公式RSSフィードからニュースを取得
- **カテゴリフィルター**: 法務省、金融規制、消費者保護、独禁法、個人情報保護などでフィルタリング
- **日付フィルター**: 特定の日付のニュースを表示
- **キーワード検索**: タイトルや説明文からキーワード検索
- **レスポンシブデザイン**: PC・タブレット・スマートフォンに対応
- **キャッシュ機能**: パフォーマンス向上のため1時間のキャッシュを使用

### メール配信機能
- **日次自動配信**: 毎朝8時（JST）に自動でニュースをメール配信
- **注目トピック**: 重要なニュース1〜3件を要約付きで配信
- **その他のニュース**: 追加の重要ニュースを箇条書きで5〜10件配信
- **無料運用**: GitHub Actions + SendGrid無料枠で運用可能

## 技術スタック

- **バックエンド**: Node.js + Express
- **フロントエンド**: HTML5 + CSS3 + JavaScript (Vanilla)
- **ニュース取得**: rss-parser
- **キャッシュ**: node-cache
- **メール配信**: SendGrid
- **自動実行**: GitHub Actions

## セットアップ

### 必要条件

- Node.js 18以上
- GitHubアカウント
- SendGridアカウント（無料枠: 100通/日）

### Webアプリのインストール

```bash
# 依存関係のインストール
npm install

# アプリケーションの起動
npm start
```

サーバーが起動したら、ブラウザで http://localhost:3000 にアクセスしてください。

### メール配信のセットアップ

#### 1. SendGridアカウントの作成

1. [SendGrid](https://sendgrid.com/) にアクセスしてアカウントを作成
2. 無料プラン（Free）を選択（100通/日まで無料）
3. **Settings > API Keys** からAPIキーを作成
   - 名前: `legal-news-app`（任意）
   - Permissions: `Full Access` または `Mail Send` のみ
4. 生成されたAPIキーをコピー（一度しか表示されません）

#### 2. 送信元メールアドレスの認証

SendGridで送信元アドレスを認証する必要があります：

1. **Settings > Sender Authentication** に移動
2. **Single Sender Verification** を選択
3. 送信元として使用するメールアドレスを登録
4. 確認メールが届くので、リンクをクリックして認証完了

#### 3. GitHubリポジトリのSecretsを設定

1. GitHubリポジトリの **Settings > Secrets and variables > Actions** に移動
2. 以下のSecretsを追加:

| Secret名 | 値 | 説明 |
|----------|-----|------|
| `SENDGRID_API_KEY` | `SG.xxxxx...` | SendGridのAPIキー |
| `MAIL_TO` | `takayuki.mito@gmail.com` | 送信先メールアドレス |
| `MAIL_FROM` | `your-verified@email.com` | SendGridで認証済みの送信元アドレス |

#### 4. GitHub Actionsの有効化

1. リポジトリの **Actions** タブに移動
2. ワークフローが表示されていることを確認
3. 初回は「I understand my workflows, go ahead and enable them」をクリック

#### 5. 動作確認（手動実行）

1. **Actions** タブで「Daily Legal News Email」ワークフローを選択
2. **Run workflow** ボタンをクリック
3. 実行結果を確認し、メールが届くことを確認

### ローカルでのメール配信テスト

```bash
# 環境変数を設定してテスト実行
SENDGRID_API_KEY=your_api_key \
MAIL_TO=your@email.com \
MAIL_FROM=verified@email.com \
npm run send-mail
```

## 配信スケジュール

- **配信時間**: 毎日 8:00 AM（日本時間）
- **配信内容**:
  - 件名: `【法務ニュース】YYYY年MM月DD日`
  - 本文:
    - 注目トピック（1〜3件、各3〜5行の要約）
    - その他の重要ニュース（箇条書きで5〜10件）
    - 各記事へのリンク

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/news` | ニュース一覧を取得 |
| GET | `/api/categories` | カテゴリ一覧を取得 |
| GET | `/api/sources` | ニュースソース一覧を取得 |
| POST | `/api/refresh` | キャッシュをクリア |

### クエリパラメータ（/api/news）

- `category`: カテゴリでフィルター（legal, finance, consumer, antitrust, privacy）
- `date`: 日付でフィルター（YYYY-MM-DD形式）
- `search`: キーワード検索

## プロジェクト構造

```
my-first-project/
├── server.js                        # バックエンドサーバー
├── package.json                     # プロジェクト設定
├── public/
│   ├── index.html                   # メインHTML
│   ├── styles.css                   # スタイルシート
│   └── app.js                       # フロントエンドロジック
├── scripts/
│   └── send-daily-mail.js           # メール配信スクリプト
├── .github/
│   └── workflows/
│       └── daily-news-mail.yml      # GitHub Actions設定
└── README.md
```

## トラブルシューティング

### メールが届かない場合

1. **Secretsの確認**: GitHub Secretsが正しく設定されているか確認
2. **送信元認証**: SendGridで送信元アドレスが認証済みか確認
3. **迷惑メールフォルダ**: 迷惑メールフォルダに振り分けられていないか確認
4. **Actions ログ**: GitHub Actionsの実行ログでエラーを確認

### ニュースが取得できない場合

- RSSフィードのURLが変更されている可能性があります
- サンプルニュースが代わりに表示/配信されます

## ライセンス

MIT

## 注意事項

- ニュースは各省庁の公式RSSフィードより取得しています。正確な情報は各省庁の公式サイトをご確認ください。
- SendGrid無料枠は100通/日までです。複数の配信先がある場合はプランをご確認ください。
