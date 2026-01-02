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
  // Geminiの送信ボタンセレクタ（より広範囲に）
  const selectors = [
    'button[aria-label*="送信"]',
    'button[data-icon="send"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]',
    'button:has(svg[data-icon="send"])',
    'button:has(svg[aria-label*="Send"])',
    '[role="button"][aria-label*="Send"]',
    '[role="button"][aria-label*="送信"]',
    'button[jsname]', // Gemini特有の属性
    'button[data-testid*="send"]',
    'button[data-testid*="submit"]',
    'button[aria-label*="Submit"]',
    'button[aria-label*="送信"]',
    // より汎用的なセレクタ
    'button:has(svg)',
    '[role="button"]:has(svg)',
  ];
  
  console.log('[Prompt Counter] Gemini content script loaded');
  
  let lastButtonCount = 0;
  
  const attachListeners = () => {
    let foundCount = 0;
    selectors.forEach(selector => {
      try {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => {
          if (!button.hasAttribute('data-prompt-counter-listener')) {
            button.setAttribute('data-prompt-counter-listener', 'true');
            button.addEventListener('click', (e) => {
              console.log('[Prompt Counter] Gemini button clicked', button);
              setTimeout(() => sendPromptEvent(), 100);
            }, true); // キャプチャフェーズで監視
            foundCount++;
          }
        });
      } catch (e) {
        // セレクタが無効な場合（:has()など）は無視
      }
    });
    
    if (foundCount > 0 && foundCount !== lastButtonCount) {
      console.log(`[Prompt Counter] Gemini attached listeners to ${foundCount} buttons`);
      lastButtonCount = foundCount;
    }
  };
  
  const observer = new MutationObserver(() => {
    attachListeners();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-label', 'data-testid'],
  });
  
  // 既存のボタンにもリスナーを追加
  attachListeners();
}

/**
 * Enterキー送信を検知
 */
function setupKeyboardListener(): void {
  // より積極的にEnterキーを監視
  document.addEventListener('keydown', (e) => {
    // Shift+Enterは除外
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      // テキストエリアまたはcontenteditable要素内かチェック
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('textarea') ||
        target.closest('input[type="text"]')
      ) {
        console.log('[Prompt Counter] Gemini Enter key pressed', target);
        // 少し遅延させて、送信が確実に行われるのを待つ
        setTimeout(() => sendPromptEvent(), 200);
      }
    }
  }, true); // キャプチャフェーズで監視
  
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
    if (target.querySelector('textarea, input[type="text"], [contenteditable="true"]')) {
      console.log('[Prompt Counter] Gemini form submitted', target);
      sendPromptEvent();
    }
  }, true); // キャプチャフェーズで監視
  
  // 入力フィールドの変更を監視（送信の検知に使用）
  const inputObserver = new MutationObserver(() => {
    const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    inputs.forEach(input => {
      if (!input.hasAttribute('data-prompt-counter-input-listener')) {
        input.setAttribute('data-prompt-counter-input-listener', 'true');
        input.addEventListener('input', () => {
          // 入力があったことを記録（デバッグ用）
          console.log('[Prompt Counter] Gemini input detected', input);
        });
      }
    });
  });
  
  inputObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 初期化（遅延付き）
 */
function init(): void {
  console.log('[Prompt Counter] Gemini content script initializing');
  
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

