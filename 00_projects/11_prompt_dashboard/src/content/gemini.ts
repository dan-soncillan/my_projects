import { PromptSentMessage } from '../shared/types';

let isComposing = false;

/**
 * 送信イベントを検知してBackground Scriptに送信
 */
function sendPromptEvent(): void {
  const message: PromptSentMessage = {
    type: 'PROMPT_SENT',
    tool: 'gemini',
    timestamp: Date.now(),
  };
  
  chrome.runtime.sendMessage(message, (response) => {
    if (!response || !response.success) {
      console.error('Failed to save prompt event:', response?.error);
    }
  });
}

/**
 * 送信ボタンのクリックを検知
 */
function setupButtonListener(): void {
  // Geminiの送信ボタンセレクタ
  const selectors = [
    'button[aria-label*="送信"]',
    'button[data-icon="send"]',
    'button[aria-label*="Send"]',
  ];
  
  const observer = new MutationObserver(() => {
    selectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (!button.hasAttribute('data-prompt-counter-listener')) {
          button.setAttribute('data-prompt-counter-listener', 'true');
          button.addEventListener('click', () => {
            setTimeout(() => sendPromptEvent(), 100);
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // 既存のボタンにもリスナーを追加
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(button => {
      if (!button.hasAttribute('data-prompt-counter-listener')) {
        button.setAttribute('data-prompt-counter-listener', 'true');
        button.addEventListener('click', () => {
          setTimeout(() => sendPromptEvent(), 100);
        });
      }
    });
  });
}

/**
 * Enterキー送信を検知
 */
function setupKeyboardListener(): void {
  document.addEventListener('keydown', (e) => {
    // Shift+Enterは除外
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      // テキストエリアまたはcontenteditable要素内かチェック
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')
      ) {
        sendPromptEvent();
      }
    }
  });
  
  // IME入力状態を検知
  document.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  
  document.addEventListener('compositionend', () => {
    isComposing = false;
  });
}

/**
 * 初期化
 */
function init(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupButtonListener();
      setupKeyboardListener();
    });
  } else {
    setupButtonListener();
    setupKeyboardListener();
  }
}

init();

