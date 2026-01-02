import { PromptSentMessage } from '../shared/types';

let isComposing = false;

/**
 * 送信イベントを検知してBackground Scriptに送信
 */
function sendPromptEvent(): void {
  const message: PromptSentMessage = {
    type: 'PROMPT_SENT',
    tool: 'claude',
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
  // Claudeの送信ボタンセレクタ
  const selectors = [
    'button[aria-label*="Send"]',
    'button[aria-label*="送信"]',
    'button[data-icon="send"]',
    'button[type="submit"]',
    'button:has(svg[data-icon="send"])',
    'button:has(svg[aria-label*="Send"])',
    '[role="button"][aria-label*="Send"]',
    '[role="button"][aria-label*="送信"]',
  ];
  
  console.log('[Prompt Counter] Claude content script loaded');
  
  const observer = new MutationObserver(() => {
    selectors.forEach(selector => {
      try {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => {
          if (!button.hasAttribute('data-prompt-counter-listener')) {
            button.setAttribute('data-prompt-counter-listener', 'true');
            button.addEventListener('click', () => {
              console.log('[Prompt Counter] Claude button clicked');
              setTimeout(() => sendPromptEvent(), 100);
            });
          }
        });
      } catch (e) {
        // セレクタが無効な場合（:has()など）は無視
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // 既存のボタンにもリスナーを追加
  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(button => {
        if (!button.hasAttribute('data-prompt-counter-listener')) {
          button.setAttribute('data-prompt-counter-listener', 'true');
          button.addEventListener('click', () => {
            console.log('[Prompt Counter] Claude button clicked');
            setTimeout(() => sendPromptEvent(), 100);
          });
        }
      });
    } catch (e) {
      // セレクタが無効な場合（:has()など）は無視
    }
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
        console.log('[Prompt Counter] Claude Enter key pressed');
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
 * フォーム送信を検知（フォールバック）
 */
function setupFormListener(): void {
  // フォーム送信イベントを監視
  document.addEventListener('submit', (e) => {
    const target = e.target as HTMLElement;
    // テキストエリアやinputがあるフォームのみ
    if (target.querySelector('textarea, input[type="text"]')) {
      console.log('[Prompt Counter] Claude form submitted');
      sendPromptEvent();
    }
  }, true); // キャプチャフェーズで監視
}

/**
 * 初期化（遅延付き）
 */
function init(): void {
  console.log('[Prompt Counter] Claude content script initializing');
  
  // ページが完全に読み込まれるまで待つ
  const initialize = () => {
    // 少し遅延させて、動的コンテンツが読み込まれるのを待つ
    setTimeout(() => {
      setupButtonListener();
      setupKeyboardListener();
      setupFormListener();
      
      // 定期的に再初期化を試みる（SPAのルーティングに対応）
      setInterval(() => {
        setupButtonListener();
      }, 2000);
    }, 500);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // ページが完全に読み込まれた後も再初期化
  window.addEventListener('load', () => {
    setTimeout(() => {
      setupButtonListener();
    }, 1000);
  });
}

init();

