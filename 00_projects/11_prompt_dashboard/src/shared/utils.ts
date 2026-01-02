import { TIMEZONE } from './constants';
import { PromptEvent } from './types';

/**
 * UUID v4を生成
 */
export function generateUUID(): string {
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

/**
 * タイムスタンプをYYYY-MM-DD HH:mm:ss形式（JST）で生成
 */
export function formatTimestamp(date: Date = new Date()): string {
  // JST（UTC+9）に変換
  const jstDate = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  const hours = String(jstDate.getHours()).padStart(2, '0');
  const minutes = String(jstDate.getMinutes()).padStart(2, '0');
  const seconds = String(jstDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * タイムスタンプ文字列をDateオブジェクトに変換（JST）
 */
export function parseTimestamp(ts: string): Date {
  const [datePart, timePart] = ts.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  // JSTでDateオブジェクトを作成
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds) - 9 * 60 * 60 * 1000);
}

/**
 * タイムスタンプから日付文字列（YYYY-MM-DD）を抽出
 */
export function extractDate(ts: string): string {
  return ts.split(' ')[0];
}

/**
 * タイムスタンプから時刻文字列（HH:mm:ss）を抽出
 */
export function extractTime(ts: string): string {
  return ts.split(' ')[1] || '';
}

/**
 * 今日の日付文字列（YYYY-MM-DD）を取得
 */
export function getTodayDate(): string {
  return formatTimestamp().split(' ')[0];
}

/**
 * データ検証
 */
export function validateEvent(event: Partial<PromptEvent>): event is PromptEvent {
  return (
    typeof event.id === 'string' && event.id.length > 0 &&
    typeof event.ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(event.ts) &&
    ['chatgpt', 'claude', 'gemini', 'cursor'].includes(event.tool || '') &&
    ['webui', 'manual'].includes(event.source || '')
  );
}

