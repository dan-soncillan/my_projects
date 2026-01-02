import { PromptSentMessage, ManualCountMessage, MessageResponse, PromptEvent } from '../shared/types';
import { saveEvent } from '../shared/storage';
import { generateUUID, formatTimestamp, validateEvent } from '../shared/utils';
import { DEDUPE_WINDOW_MS, DEDUPE_CLEANUP_MS } from '../shared/constants';

// デデュープ用の一時ストレージ（メモリ内、Service Worker再起動でリセット）
const recentEvents = new Map<string, number>(); // key: dedupeKey, value: timestamp

/**
 * デデュープキーを生成
 */
function generateDedupeKey(tool: string, tabId: number, timestamp: number): string {
  return `${tool}_${tabId}_${Math.floor(timestamp / DEDUPE_WINDOW_MS)}`;
}

/**
 * デデュープチェック
 */
function shouldDedupe(tool: string, tabId: number, timestamp: number): boolean {
  const key = generateDedupeKey(tool, tabId, timestamp);
  const lastEvent = recentEvents.get(key);
  
  if (lastEvent && (timestamp - lastEvent) < DEDUPE_WINDOW_MS) {
    return true; // 重複として除外
  }
  
  recentEvents.set(key, timestamp);
  
  // 古いエントリをクリーンアップ（5秒以上前）
  const now = Date.now();
  for (const [k, v] of recentEvents.entries()) {
    if (now - v > DEDUPE_CLEANUP_MS) {
      recentEvents.delete(k);
    }
  }
  
  return false;
}

/**
 * プロンプト送信イベントを処理
 */
async function handlePromptSent(
  message: PromptSentMessage,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  try {
    const { tool, timestamp } = message;
    const tabId = sender.tab?.id || 0; // Content Scriptから送信された場合、sender.tab.idが利用可能
    
    // デデュープチェック
    if (shouldDedupe(tool, tabId, timestamp)) {
      return { success: true }; // 重複のため保存せず、成功として返す
    }
    
    // イベント作成
    const event: PromptEvent = {
      id: generateUUID(),
      ts: formatTimestamp(new Date(timestamp)),
      tool,
      source: 'webui',
    };
    
    // データ検証
    if (!validateEvent(event)) {
      console.error('Invalid event data:', event);
      return { success: false, error: 'Invalid event data' };
    }
    
    // 保存
    await saveEvent(event);
    
    return { success: true, eventId: event.id };
  } catch (error) {
    console.error('Failed to handle prompt sent:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 手動カウントイベントを処理
 */
async function handleManualCount(message: ManualCountMessage): Promise<MessageResponse> {
  try {
    const { tool } = message;
    
    // イベント作成
    const event: PromptEvent = {
      id: generateUUID(),
      ts: formatTimestamp(),
      tool,
      source: 'manual',
    };
    
    // データ検証
    if (!validateEvent(event)) {
      console.error('Invalid event data:', event);
      return { success: false, error: 'Invalid event data' };
    }
    
    // 保存
    await saveEvent(event);
    
    return { success: true, eventId: event.id };
  } catch (error) {
    console.error('Failed to handle manual count:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * メッセージリスナー
 */
chrome.runtime.onMessage.addListener(
  (message: PromptSentMessage | ManualCountMessage, sender, sendResponse) => {
    // 非同期処理のため、trueを返して非同期レスポンスを許可
    (async () => {
      if (message.type === 'PROMPT_SENT') {
        const response = await handlePromptSent(message, sender);
        sendResponse(response);
      } else if (message.type === 'MANUAL_COUNT') {
        const response = await handleManualCount(message);
        sendResponse(response);
      } else {
        sendResponse({ success: false, error: 'Unknown message type' });
      }
    })();
    
    return true; // 非同期レスポンスを許可
  }
);

/**
 * ショートカットキー処理
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'manual-count') {
    const message: ManualCountMessage = {
      type: 'MANUAL_COUNT',
      tool: 'cursor',
    };
    await handleManualCount(message);
  }
});

