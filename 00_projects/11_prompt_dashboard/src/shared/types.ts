export interface PromptEvent {
  id: string;         // 一意ID（UUID v4、PK）
  ts: string;         // タイムスタンプ（YYYY-MM-DD HH:mm:ss形式、ローカル時間）
  tool: string;       // 'chatgpt' | 'claude' | 'gemini' | 'cursor'
  source: string;     // 'webui' | 'manual'
}

export interface PromptSentMessage {
  type: 'PROMPT_SENT';
  tool: 'chatgpt' | 'claude' | 'gemini';
  timestamp: number; // Unix時間（ミリ秒、デデュープ用）
}

export interface ManualCountMessage {
  type: 'MANUAL_COUNT';
  tool: 'cursor';
}

export interface MessageResponse {
  success: boolean;
  eventId?: string; // 保存されたイベントのID
  error?: string;
}

export type ToolType = 'chatgpt' | 'claude' | 'gemini' | 'cursor';
export type SourceType = 'webui' | 'manual';

