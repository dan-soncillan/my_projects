# 設計書：Prompt Counter（個人向け・シンプル版 / MVP）

## 1. 背景・目的
### 背景
LLMツール（ChatGPT/Claude/Gemini/Cursor）を日常的に使う中で、利用頻度・偏り・継続性を定量で把握できない。

### 目的
- 各ツールの **プロンプト送信回数**を計測し、日次・週次で可視化する
- 個人利用に最適化し、導入負荷とプライバシー懸念を最小化する

---

## 2. スコープ
### In Scope（MVP）
- Web UI（ChatGPT/Claude/Gemini）の送信イベントを自動カウント
- Cursorは手動カウント（拡張ポップアップ or ショートカット）
- ローカルストレージに送信単位で個別記録し、拡張内ダッシュボードで可視化
- CSVエクスポート（送信イベント単位）

### Out of Scope（MVP）
- プロンプト本文・会話内容の保存
- 正確なトークン/コスト算出（個人UIだけでは精度が落ちる）
- チーム/組織向け管理、アカウント横断連携
- 外部サーバでの集計（同期・共有）

---

## 3. 成果物（Deliverables）
- Chrome Extension（Manifest V3）
- Dashboard（拡張内ページ）
- 設計ドキュメント一式（本ファイルほか）

---

## 4. ユースケース
### UC-1：Web UIで送信した回数が自動で記録される
- 例：ChatGPTで送信→回数 +1

### UC-2：Cursor利用を手動で +1 できる
- 例：拡張ポップアップを開いて `+1` → 回数 +1

### UC-3：今日/週次の利用回数を確認できる
- ツール別に内訳が見える

### UC-4：データをCSVで出力できる
- 個人の分析（スプレッドシート等）に利用可能

---

## 5. 機能要件
### 5.1 必須（MVP）
1) イベント記録
- 送信イベント発生で 1件保存（1イベント=1プロンプト）
- データ項目：`id (UUID v4, PK), ts, tool, source`

2) 表示（Dashboard、表示時に動的集計）
- ダッシュボード表示時に、保存された送信イベントから動的に集計
- 今日の合計（本日の送信イベント数）
- 7日合計（過去7日間の送信イベント数）
- 7日推移（折れ線）
- ツール別内訳（積み上げ棒 or 円）

3) エクスポート
- 送信イベント単位でCSV出力

5) データ削除
- 全削除

### 5.2 任意（次フェーズ）
- 文字数カウント（本文は保存しない）
- 推定トークン（文字数→換算、精度は割り切り）
- 目標設定・達成率
- セッション化（一定間隔で区切る）

---

## 6. 非機能要件
- プライバシー：本文は保存しない
- ローカル完結：外部送信なし
- 軽量：ページ動作を妨げない
- 耐変更性：DOM変更に対して検知手段を冗長化（クリック＋Enter）

---

## 7. アーキテクチャ
### 7.1 全体像

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌──────────────┐             │
│  │ Content      │         │ Background   │             │
│  │ Script       │────────▶│ Script       │             │
│  │ (各Webサイト) │         │ (Service     │             │
│  │              │         │  Worker)     │             │
│  └──────────────┘         └──────────────┘             │
│         │                        │                       │
│         │                        │                       │
│         ▼                        ▼                       │
│  ┌──────────────┐         ┌──────────────┐             │
│  │ イベント検知  │         │ データ保存    │             │
│  │ (送信ボタン/  │         │ (chrome.     │             │
│  │  Enterキー)  │         │  storage)    │             │
│  └──────────────┘         └──────────────┘             │
│                                                           │
│  ┌──────────────┐         ┌──────────────┐             │
│  │ Popup        │         │ Dashboard    │             │
│  │ (手動カウント) │         │ (可視化)      │             │
│  │              │         │              │             │
│  └──────────────┘         └──────────────┘             │
│         │                        │                       │
│         └──────────┬─────────────┘                       │
│                    ▼                                     │
│            ┌──────────────┐                             │
│            │ Local Storage │                             │
│            │ (chrome.      │                             │
│            │  storage.local)│                            │
│            └──────────────┘                             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 7.2 コンポーネント構成

#### 7.2.1 Content Script
- **役割**: 各Webサイト（ChatGPT/Claude/Gemini）で送信イベントを検知
- **実装**:
  - DOM監視（送信ボタンのクリック）
  - キーボードイベント（Enter送信）
  - イベント発生時にBackground Scriptへメッセージ送信

**メッセージパッシング仕様**:
```typescript
// Content Script → Background Script
interface PromptSentMessage {
  type: 'PROMPT_SENT';
  tool: 'chatgpt' | 'claude' | 'gemini';
  tabId: number;
  timestamp: number; // Unix時間（ミリ秒、デデュープ用）
}

// Background Script → Content Script（レスポンス）
interface MessageResponse {
  success: boolean;
  eventId?: string; // 保存されたイベントのID
  error?: string;
}

// 使用例
chrome.runtime.sendMessage(
  { type: 'PROMPT_SENT', tool: 'chatgpt', tabId: tab.id, timestamp: Date.now() },
  (response: MessageResponse) => {
    if (!response.success) {
      console.error('Failed to save prompt event:', response.error);
    }
  }
);
```

#### 7.2.2 Background Script (Service Worker)
- **役割**: データの永続化・取得API提供
- **実装**:
  - Content Scriptからのメッセージ受信
  - デデュープ処理（2秒以内の重複を排除）
  - `chrome.storage.local` への保存
  - データ取得API提供（集計は表示時に実行）

**デデュープロジック**:
```typescript
// デデュープキー生成
const dedupeKey = `${tool}_${tabId}_${Math.floor(timestamp / 2000)}`;

// 一時ストレージ（メモリ内、Service Worker再起動でリセット）
const recentEvents = new Map<string, number>(); // key: dedupeKey, value: timestamp

// デデュープチェック
function shouldDedupe(tool: string, tabId: number, timestamp: number): boolean {
  const key = `${tool}_${tabId}_${Math.floor(timestamp / 2000)}`;
  const lastEvent = recentEvents.get(key);
  
  if (lastEvent && (timestamp - lastEvent) < 2000) {
    return true; // 重複として除外
  }
  
  recentEvents.set(key, timestamp);
  // 古いエントリをクリーンアップ（5秒以上前）
  const now = Date.now();
  for (const [k, v] of recentEvents.entries()) {
    if (now - v > 5000) recentEvents.delete(k);
  }
  
  return false;
}
```

**ストレージ操作**:
```typescript
// イベント保存
async function saveEvent(event: PromptEvent): Promise<void> {
  try {
    const result = await chrome.storage.local.get('prompt_events');
    const events: PromptEvent[] = result.prompt_events || [];
    
    // 容量制限チェック（10,000件）
    if (events.length >= 10000) {
      // 古いデータから削除（90日以上前）
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const cutoffStr = formatTimestamp(cutoffDate);
      
      const filtered = events.filter(e => e.ts >= cutoffStr);
      if (filtered.length >= 10000) {
        // それでも超える場合は、最も古い1000件を削除
        filtered.sort((a, b) => a.ts.localeCompare(b.ts));
        filtered.splice(0, 1000);
      }
      events.length = 0;
      events.push(...filtered);
    }
    
    events.push(event);
    await chrome.storage.local.set({ prompt_events: events });
  } catch (error) {
    console.error('Failed to save event:', error);
    // エラー時はユーザーに通知しない（MVPは割り切り）
  }
}

// データ取得
async function getEvents(): Promise<PromptEvent[]> {
  try {
    const result = await chrome.storage.local.get('prompt_events');
    return result.prompt_events || [];
  } catch (error) {
    console.error('Failed to load events:', error);
    return [];
  }
}
```

#### 7.2.3 Popup
- **役割**: 手動カウント（Cursor用）・簡易表示
- **実装**:
  - `+1` ボタン（Cursor用）
  - 今日の合計表示（Background Scriptから取得）
  - Dashboardへのリンク

**手動カウント処理**:
```typescript
// Popup → Background Script
interface ManualCountMessage {
  type: 'MANUAL_COUNT';
  tool: 'cursor';
}

// ショートカットキー処理（Background Script）
chrome.commands.onCommand.addListener((command) => {
  if (command === 'manual-count') {
    const event: PromptEvent = {
      id: generateUUID(),
      ts: formatTimestamp(),
      tool: 'cursor',
      source: 'manual'
    };
    saveEvent(event);
  }
});
```

#### 7.2.4 Dashboard
- **役割**: 可視化・エクスポート
- **実装**:
  - チャート表示（Chart.js等）
  - CSVエクスポート機能
  - データ削除機能

**CSVエクスポート仕様**:
```typescript
function exportToCSV(events: PromptEvent[]): void {
  // ヘッダー行
  const headers = ['ID', 'Timestamp', 'Tool', 'Source'];
  const rows = events.map(e => [e.id, e.ts, e.tool, e.source]);
  
  // CSV形式に変換
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // BOM付きUTF-8でエンコード
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // ダウンロード
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-counter-${formatTimestamp().replace(/[ :]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```
- **ファイル名**: `prompt-counter-YYYY-MM-DD-HH-mm-ss.csv`
- **エンコーディング**: UTF-8 with BOM（Excelで正しく開けるように）
- **列の順序**: ID, Timestamp, Tool, Source

**パフォーマンス考慮**:
- 大量データ（10,000件）での表示: チャート描画前にデータを集計してから描画
- ストレージ読み込み: 非同期処理、エラーハンドリング
- チャート描画: Chart.jsの`data.datasets`を事前に集計してから設定

### 7.3 データモデル

#### 7.3.1 イベントデータ（Raw）
```typescript
interface PromptEvent {
  id: string;         // 一意ID（UUID v4、PK）
  ts: string;         // タイムスタンプ（YYYY-MM-DD HH:mm:ss形式、ローカル時間）
  tool: string;       // 'chatgpt' | 'claude' | 'gemini' | 'cursor'
  source: string;     // 'webui' | 'manual'
}
```

注：`day` や `hour` は保存せず、表示時に `ts` から動的に抽出します。

**タイムスタンプ生成**:
```typescript
function formatTimestamp(date: Date = new Date()): string {
  // JST（UTC+9）に変換
  const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  const hours = String(jstDate.getHours()).padStart(2, '0');
  const minutes = String(jstDate.getMinutes()).padStart(2, '0');
  const seconds = String(jstDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
```
- **タイムゾーン**: JST（日本標準時、UTC+9）をデフォルト
- **精度**: 秒単位（ミリ秒は含まない）

**UUID生成**:
```typescript
function generateUUID(): string {
  // モダンブラウザ対応
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // フォールバック（古いブラウザ対応）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

**データ検証**:
```typescript
function validateEvent(event: Partial<PromptEvent>): event is PromptEvent {
  return (
    typeof event.id === 'string' && event.id.length > 0 &&
    typeof event.ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(event.ts) &&
    ['chatgpt', 'claude', 'gemini', 'cursor'].includes(event.tool || '') &&
    ['webui', 'manual'].includes(event.source || '')
  );
}
```

### 7.4 ストレージ設計

- **キー**: `prompt_events` (配列)
- **形式**: `PromptEvent[]`
- **容量**: 最大10,000件（約1年分想定）
- **クリーンアップ**: 古いデータ（90日以上前）を自動削除（オプション）

---

## 8. 画面設計

### 8.1 Popup（簡易表示）
```
┌─────────────────────┐
│ Prompt Counter      │
├─────────────────────┤
│ 今日: 12回          │
│                     │
│ [Dashboardを開く]   │
│ [+1 (Cursor)]       │
└─────────────────────┘
```

### 8.2 Dashboard（メイン画面）
```
┌─────────────────────────────────────────┐
│ Prompt Counter Dashboard                │
├─────────────────────────────────────────┤
│                                         │
│  今日の合計: 12回                       │
│  7日合計: 87回                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 7日推移（折れ線グラフ）          │   │
│  │                                 │   │
│  │    [グラフ表示]                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ツール別内訳（積み上げ棒/円）    │   │
│  │                                 │   │
│  │    [グラフ表示]                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [CSVエクスポート]  [データ全削除]      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 9. イベント検知仕様

### 9.1 ChatGPT (chatgpt.com)
- **送信ボタン**: `button[data-testid="send-button"]` のクリック
- **Enter送信**: テキストエリアでの `Enter` キー（`Shift+Enter` は除外）

### 9.2 Claude (claude.ai)
- **送信ボタン**: `button[aria-label*="Send"]` のクリック
- **Enter送信**: テキストエリアでの `Enter` キー

### 9.3 Gemini (aistudio.google.com)
- **送信ボタン**: `button[aria-label*="送信"]` または `button[data-icon="send"]` のクリック
- **Enter送信**: テキストエリアでの `Enter` キー

### 9.4 デデュープ（重複防止）
- 同一タブ・同一ツールで **2秒以内** の連続送信は1回としてカウント
- タイムスタンプベースで判定（`dedupe_key = tool + tabId + floor(ts_ms / 2000)`）

---

## 10. 技術スタック

- **言語**: TypeScript
- **フレームワーク**: なし（Vanilla JS）
- **チャート**: Chart.js
- **ビルド**: Vite（推奨、高速な開発体験）
- **Manifest**: V3

### 10.1 依存関係（想定）

```json
{
  "dependencies": {
    "chart.js": "^4.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@types/chrome": "^0.0.250"
  }
}
```

---

## 10.2 ファイル構造

```
prompt-counter/
├── manifest.json              # Manifest V3設定
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background Script
│   ├── content/
│   │   ├── chatgpt.ts        # ChatGPT用Content Script
│   │   ├── claude.ts          # Claude用Content Script
│   │   └── gemini.ts          # Gemini用Content Script
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── dashboard/
│   │   ├── dashboard.html
│   │   ├── dashboard.ts
│   │   └── dashboard.css
│   ├── shared/
│   │   ├── types.ts           # 型定義
│   │   ├── storage.ts          # ストレージ操作
│   │   ├── utils.ts            # ユーティリティ（UUID、タイムスタンプ等）
│   │   └── constants.ts        # 定数
│   └── icons/                 # アイコン画像
└── dist/                      # ビルド出力
```

---

### 11.1 データ収集範囲
- プロンプト本文: **取得しない**
- 会話内容: **取得しない**
- タイムスタンプ・ツール名・送信時刻のみ

### 11.2 データ保存
- ローカルストレージのみ（`chrome.storage.local`）
- 外部送信なし
- 暗号化不要（機密情報を含まない）

### 11.3 権限
- `activeTab`: 現在のタブでのみ動作
- `storage`: ローカル保存用

### 11.4 Manifest V3設定詳細

```json
{
  "manifest_version": 3,
  "name": "Prompt Counter",
  "version": "0.1.0",
  "description": "プロンプト送信回数を記録・可視化するChrome拡張",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://aistudio.google.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["content/chatgpt.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://claude.ai/*"],
      "js": ["content/claude.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://aistudio.google.com/*"],
      "js": ["content/gemini.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "commands": {
    "manual-count": {
      "suggested_key": {
        "default": "Ctrl+Shift+1",
        "mac": "Command+Shift+1"
      },
      "description": "Cursor手動カウント（+1）"
    }
  }
}
```

---

## 12. エラーハンドリング

### 12.1 エラーハンドリング方針
- **保存失敗**: コンソールにエラー出力のみ（ユーザー通知なし、MVPは割り切り）
- **読み込み失敗**: 空配列を返す、ダッシュボードに「データなし」を表示
- **メッセージ送信失敗**: リトライなし（次の送信で再試行）
- **デデュープ失敗**: 重複保存を許容（データ整合性は保たれる）

### 12.2 ログ出力
- 開発環境: `console.log` / `console.error` で詳細ログ
- 本番環境: エラーのみ出力（パフォーマンス考慮）

---

## 13. バージョン管理

### 13.1 バージョン番号
- **形式**: `MAJOR.MINOR.PATCH`（Semantic Versioning）
- **初期バージョン**: `0.1.0`（MVP）
- **管理**: `package.json` と `manifest.json` で同期

### 13.2 データマイグレーション
- **現時点**: マイグレーション不要（初回リリース）
- **将来**: スキーマ変更時は `chrome.storage.onChanged` で検知し、マイグレーション関数を実行

---

## 14. 開発環境・ビルド手順

### 14.1 セットアップ
```bash
# 依存関係のインストール
npm install

# 開発モード（watch）
npm run dev

# ビルド
npm run build
```

### 14.2 ローカルテスト
1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist/` ディレクトリを選択

### 14.3 ビルド設定（Vite）
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        'background/service-worker': 'src/background/service-worker.ts',
        'content/chatgpt': 'src/content/chatgpt.ts',
        'content/claude': 'src/content/claude.ts',
        'content/gemini': 'src/content/gemini.ts',
        'popup/popup': 'src/popup/popup.ts',
        'dashboard/dashboard': 'src/dashboard/dashboard.ts',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
```

---

## 15. 開発・リリース計画

### Phase 1: MVP開発
1. 基本構造（Manifest V3設定）
2. Content Script実装（ChatGPT/Claude/Gemini）
3. Background Script実装（データ保存）
4. Dashboard実装（可視化）
5. Popup実装（手動カウント）
6. CSVエクスポート機能

### Phase 2: テスト・改善
1. 各ツールでの動作確認
2. デデュープロジック検証
3. UI/UX改善

### Phase 3: リリース準備
1. プライバシーポリシー整備
2. Chrome Web Store申請
3. ドキュメント整備

---

## 16. リスク・課題

### 16.1 技術的リスク
- **DOM変更への対応**: 各ツールのUI変更で検知が失敗する可能性
  - **対策**: 複数のセレクタを用意、定期的なメンテナンス

### 16.2 運用リスク
- **ストレージ容量**: 長期利用で容量増加
  - **対策**: 自動クリーンアップ（90日以上前のデータ削除）

### 16.3 プライバシーリスク
- **誤検知**: 意図しない送信をカウント
  - **対策**: デデュープロジック、手動削除機能

---

## 17. 参考資料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

