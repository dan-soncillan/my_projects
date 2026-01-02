export const STORAGE_KEY = 'prompt_events';
export const MAX_EVENTS = 10000;
export const CLEANUP_DAYS = 90;
export const BATCH_DELETE_COUNT = 1000;
export const DEDUPE_WINDOW_MS = 2000;
export const DEDUPE_CLEANUP_MS = 5000;

export const TOOLS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  cursor: 'Cursor',
};

export const TIMEZONE = 'Asia/Tokyo';

