# RogerFilm ホームページ

RogerFilmの企業ホームページです。ゼロサイトから自前のホームページに移行するためのプロジェクトです。

## 📋 要件定義

詳細な要件定義は [`要件定義書.md`](./要件定義書.md) を参照してください。

## ファイル構成

- `index.html` - メインのHTMLファイル
- `styles.css` - スタイルシート
- `script.js` - JavaScript機能（モバイルメニュー、アニメーションなど）
- `要件定義書.md` - プロジェクト要件定義書

## 機能

### 実装済み機能

- ✅ レスポンシブデザイン（モバイル、タブレット、デスクトップ対応）
- ✅ スムーススクロール
- ✅ モバイルメニュー（ハンバーガーメニュー）
- ✅ Googleフォームによるお問い合わせ（iframe埋め込み）
- ✅ スクロール時のフェードインアニメーション
- ✅ SEO対策（メタタグ、OGPタグ、構造化データ）
- ✅ CTAボタンの複数配置（会社概要、サービス、実績セクション）

### 今後の実装予定

- ⚠️ Google Analytics導入
- ⚠️ 実績画像の追加

## カスタマイズ方法

### 1. 会社情報の更新

`index.html`内の以下の部分を編集してください：

- 会社名: `<title>`タグと`.nav-brand`内
- 会社概要: `#about`セクション
- サービス内容: `#services`セクション
- 実績: `#works`セクション
- 連絡先情報: `#contact`セクション内の`.contact-info`

### 2. 色の変更

`styles.css`の`:root`セクションでカラーパレットを変更できます：

```css
:root {
    --primary-color: #2c3e50;      /* メインカラー */
    --secondary-color: #3498db;    /* セカンダリカラー */
    --accent-color: #e74c3c;       /* アクセントカラー */
    /* ... */
}
```

### 3. 実績画像の追加

`#works`セクションの`.work-placeholder`を実際の画像に置き換えてください：

```html
<div class="work-card">
    <img src="images/work1.jpg" alt="実績1" class="work-image">
    <h3>プロジェクト名</h3>
    <p>プロジェクトの説明</p>
</div>
```

対応するCSSも追加：

```css
.work-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
}
```

### 4. Googleフォームの設定

お問い合わせフォームはGoogleフォームを使用しています。設定方法は以下の通りです：

1. **Googleフォームの作成**
   - [Googleフォーム](https://www.google.com/forms/about/)にアクセス
   - 新しいフォームを作成
   - 必要な項目を追加（お名前、会社名、メールアドレス、電話番号、お問い合わせ種別、お問い合わせ内容など）

2. **フォームの埋め込み**
   - Googleフォームの「送信」ボタンをクリック
   - 「<>」アイコン（埋め込みコード）を選択
   - iframeコードをコピー
   - `index.html`の`#contact`セクション内の`.google-form-container`に貼り付け

3. **フォームのURLを取得**
   - Googleフォームの「送信」ボタンをクリック
   - 「リンク」アイコンを選択
   - URLをコピーして、`index.html`内のGoogleフォームへのリンクに設定

現在、`index.html`にはプレースホルダーとして以下のような記述があります：

```html
<div class="google-form-container">
    <!-- ここにGoogleフォームの埋め込みコードを貼り付けてください -->
    <iframe src="YOUR_GOOGLE_FORM_EMBED_URL" width="100%" height="600" frameborder="0" marginheight="0" marginwidth="0">読み込んでいます…</iframe>
</div>
```

または、リンクボタンとして表示する場合：

```html
<div class="google-form-link">
    <a href="YOUR_GOOGLE_FORM_URL" target="_blank" class="btn btn-primary btn-large">お問い合わせフォームを開く</a>
</div>
```

## GitHub Pagesでの公開方法

このプロジェクトはGitHub Pagesを使用して公開します。

### 1. GitHubリポジトリの作成

1. GitHubにログイン
2. 新しいリポジトリを作成（例: `rogerfilm-hp`）
3. リポジトリをローカルにクローン

```bash
git clone https://github.com/YOUR_USERNAME/rogerfilm-hp.git
cd rogerfilm-hp
```

### 2. ファイルのアップロード

プロジェクトフォルダ内のファイルをリポジトリにコピー：

```bash
# 現在のプロジェクトフォルダからファイルをコピー
cp -r /path/to/20_hp/* .
```

### 3. GitHub Pagesの有効化

1. GitHubリポジトリのページに移動
2. 「Settings」タブをクリック
3. 左メニューから「Pages」を選択
4. 「Source」で「Deploy from a branch」を選択
5. 「Branch」で「main」（または「master」）を選択
6. 「/ (root)」を選択
7. 「Save」をクリック

### 4. カスタムドメインの設定（オプション）

現在のドメイン `rogerfilm.zrst.jp` を使用する場合：

1. GitHubリポジトリの「Settings」→「Pages」に移動
2. 「Custom domain」に `rogerfilm.zrst.jp` を入力
3. 「Save」をクリック
4. ドメインのDNS設定を変更：
   - レコードタイプ: `CNAME`
   - ホスト名: `rogerfilm.zrst.jp`
   - 値: `YOUR_USERNAME.github.io`

### 5. 公開の確認

数分後、以下のURLでサイトにアクセスできます：

- `https://YOUR_USERNAME.github.io/rogerfilm-hp/`（リポジトリ名が含まれる場合）
- `https://YOUR_USERNAME.github.io/`（リポジトリ名が `YOUR_USERNAME.github.io` の場合）
- `https://rogerfilm.zrst.jp/`（カスタムドメインを設定した場合）

### 6. 更新方法

ファイルを更新したら、GitHubにプッシュするだけで自動的にサイトが更新されます：

```bash
git add .
git commit -m "サイトを更新"
git push origin main
```

## 開発環境での確認

ローカルで確認するには、以下のいずれかの方法を使用：

### 方法1: Python（簡易サーバー）

```bash
# Python 3の場合
python3 -m http.server 8000

# ブラウザで http://localhost:8000 にアクセス
```

### 方法2: Node.js（http-server）

```bash
# http-serverをインストール
npm install -g http-server

# サーバーを起動
http-server -p 8000
```

### 方法3: VS CodeのLive Server拡張機能

VS Codeの「Live Server」拡張機能を使用すると、自動リロード機能付きで確認できます。

## Googleフォームのメリット

- ✅ **完全無料**：制限なく使用可能
- ✅ **サーバー不要**：Googleが管理するため、サーバー設定が不要
- ✅ **自動集計**：回答がGoogleスプレッドシートに自動保存される
- ✅ **メール通知**：回答があった際にメール通知を受け取れる
- ✅ **簡単設定**：フォーム作成が簡単で、デザインもカスタマイズ可能

## 注意事項

- Googleフォームの埋め込みURLは実際のフォーム作成後に取得してください
- 実績セクションの画像はプレースホルダーです。実際の画像に置き換えてください
- 連絡先情報（メールアドレス、電話番号）は実際の情報に更新してください
- SEO対策が必要な場合は、`<meta>`タグの追加や構造化データの実装を検討してください
- GitHub Pagesは静的サイトのみ対応です（サーバーサイド処理は不可）

## ライセンス

このプロジェクトはRogerFilmの所有物です。
