# 計測仕様（MVP）

## 1. 計測対象
- ChatGPT（chatgpt.com）
- Claude（claude.ai）
- Gemini（aistudio.google.com 等）
- Cursor（manual：拡張ポップアップ/ショートカット）

---

## 2. イベント定義
- **Prompt = 送信1回**
- 送信イベントを検知したら `prompt_count = 1` を記録する

---

## 3. Web UI 検知ロジック（冗長化）
DOMが変わりやすいため、1手段に依存しない。

### 3.1 クリック送信
- 送信ボタン（紙飛行機アイコン等）に相当するクリックを検知してカウント

### 3.2 Enter送信
- textarea / contenteditable 上で Enter を検知
- **Shift+Enter は除外**
- IME確定のEnter誤検知を避けるため、可能なら composition 状態を考慮

---

## 4. 重複排除（デデュープ）
### 4.1 目的
- Enter検知とクリック検知が同時に発火するケースなど、二重計上を防ぐ

### 4.2 ルール（MVP）
- 同一タブ・同一ツールで **2秒以内**の記録は 1回に丸める
- 実装場所: Background Script（Service Worker）
- デデュープキー: `tool + tabId + floor(timestamp_ms / 2000)`
  - `timestamp_ms`: Unix時間（ミリ秒）、Content Scriptから送信される
  - `tool`: 'chatgpt' | 'claude' | 'gemini'
  - `tabId`: `chrome.tabs.getCurrent()` で取得

例）
- `dedupe_key = "chatgpt_123_1704067200"`（tool_tabId_floor(ts_ms/2000)）
- 2秒以内に同じキーで送信された場合は、最初の1件のみ保存

---

## 5. 保存項目（本文は保存しない）
- `id`：UUID v4（PK）
  - 生成方法: `crypto.randomUUID()`（フォールバック実装あり）
- `ts`：YYYY-MM-DD HH:mm:ss形式
  - タイムゾーン: JST（日本標準時）をデフォルト
  - 精度: 秒単位（ミリ秒は含まない）
  - 生成方法: `new Date()` から `YYYY-MM-DD HH:mm:ss` 形式に変換（JSTで）
- `tool`：chatgpt / claude / gemini / cursor
- `source`：webui / manual

注：`day` や `hour` は保存せず、表示時に `ts` から動的に抽出

**データ検証**:
- 保存前に各フィールドの型・形式を検証
- 不正データは保存せず、エラーログを出力

任意（次フェーズ）
- `char_len`：入力文字数（本文は保持しない）
- `session_id`：セッション推定用

---

## 6. Cursor（手動カウント）
### 6.1 仕様
- 拡張ポップアップに `Cursor +1` ボタン
- もしくはショートカット（例：Ctrl/Cmd + Shift + 1）で記録

### 6.2 保存
- Web UI と同じ保存形式で `tool=cursor, source=manual` として保存

---

## 7. 例外・エラー時
- 保存に失敗した場合：次回起動時にリトライは不要（MVPは割り切り）
  - エラーはコンソールに出力のみ、ユーザー通知なし
- 検知不能な場合：手動補正（+1）で補える導線を維持
- ストレージ容量超過（10,000件超）の場合：
  - 90日以上前のデータを自動削除
  - それでも超過する場合は、最も古い1,000件を削除
- メッセージ送信失敗：リトライなし（次の送信で再試行）

