import { PromptEvent } from './types';
import { STORAGE_KEY, MAX_EVENTS, CLEANUP_DAYS, BATCH_DELETE_COUNT } from './constants';
import { formatTimestamp, extractDate } from './utils';

/**
 * イベントを保存
 */
export async function saveEvent(event: PromptEvent): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const events: PromptEvent[] = result[STORAGE_KEY] || [];
    
    // 容量制限チェック（10,000件）
    if (events.length >= MAX_EVENTS) {
      // 古いデータから削除（90日以上前）
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS);
      const cutoffStr = formatTimestamp(cutoffDate);
      
      const filtered = events.filter(e => e.ts >= cutoffStr);
      if (filtered.length >= MAX_EVENTS) {
        // それでも超える場合は、最も古い1000件を削除
        filtered.sort((a, b) => a.ts.localeCompare(b.ts));
        filtered.splice(0, BATCH_DELETE_COUNT);
      }
      events.length = 0;
      events.push(...filtered);
    }
    
    events.push(event);
    await chrome.storage.local.set({ [STORAGE_KEY]: events });
  } catch (error) {
    console.error('Failed to save event:', error);
    // エラー時はユーザーに通知しない（MVPは割り切り）
  }
}

/**
 * 全イベントを取得
 */
export async function getEvents(): Promise<PromptEvent[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  } catch (error) {
    console.error('Failed to load events:', error);
    return [];
  }
}

/**
 * 全イベントを削除
 */
export async function deleteAllEvents(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to delete events:', error);
    throw error;
  }
}

/**
 * 今日のイベントを取得
 */
export async function getTodayEvents(): Promise<PromptEvent[]> {
  const events = await getEvents();
  const today = extractDate(formatTimestamp());
  return events.filter(e => extractDate(e.ts) === today);
}

/**
 * 過去N日間のイベントを取得
 */
export async function getEventsForDays(days: number): Promise<PromptEvent[]> {
  const events = await getEvents();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = formatTimestamp(cutoffDate);
  return events.filter(e => e.ts >= cutoffStr);
}

