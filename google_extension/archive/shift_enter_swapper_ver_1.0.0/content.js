// content.js — ChatGPT専用・IME対応安定版
(() => {
  'use strict';
  const VERSION = 'swap-v3.2';
  console.log('[swap] loaded', VERSION, 'on', location.hostname);

  // --- IME 状態管理 ---
  let isComposing = false;
  window.addEventListener('compositionstart', () => { isComposing = true; }, true);
  window.addEventListener('compositionend',   () => { isComposing = false; }, true);

  // --- 対象要素判定 ---
  function isEditable(t) {
    if (!t) return false;
    if (t.isContentEditable) return true;
    if (t.tagName === 'TEXTAREA') return true;
    return false;
  }

  // --- contenteditable に <br> を安全に挿入 ---
  function insertBrAtCaretCE() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const br = document.createElement('br');
    range.insertNode(br);

    // ZWSP を入れてキャレット位置を安定化
    const zwsp = document.createTextNode('\u200B');
    range.setStartAfter(br);
    range.setEndAfter(br);
    range.insertNode(zwsp);

    const r2 = document.createRange();
    r2.setStartAfter(zwsp);
    r2.setEndAfter(zwsp);
    sel.removeAllRanges();
    sel.addRange(r2);

    // React 系エディタに変化を知らせる
    document.activeElement?.dispatchEvent(
      new InputEvent('input', { bubbles: true, cancelable: false, inputType: 'insertLineBreak' })
    );
  }

  // --- textarea 改行 ---
  function insertLineBreakTextarea(t) {
    const s = t.selectionStart, e = t.selectionEnd, v = t.value;
    t.value = v.slice(0, s) + '\n' + v.slice(e);
    const pos = s + 1;
    t.setSelectionRange(pos, pos);
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // --- 送信（ChatGPT はボタン click が最も確実） ---
  function sendAction(target) {
    const btn =
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[aria-label="Send message"]') ||
      document.querySelector('form button[type="submit"]');
    if (btn) {
      btn.click();
      return;
    }
    // 汎用フォールバック
    const form = target.closest('form');
    if (form) {
      const submitBtn = form.querySelector('[type=submit], button:not([type]), button[type=submit]');
      if (submitBtn) submitBtn.click(); else form.requestSubmit?.();
    }
  }

  // --- キー入替本体 ---
  function onKeyDown(e) {
    // ChatGPT専用 manifest（matches が chatgpt.com 限定）の前提
    if (e.key !== 'Enter') return;
    const t = e.target;
    if (!isEditable(t)) return;

    // IME変換中は確定に必要なので素通し
    if (isComposing) {
      // console.log('[swap] composing → passthrough');
      return;
    }

    // ここでサイト側のハンドラを完全に止める
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    if (!e.shiftKey) {
      // Enter → 改行
      // console.log('[swap] Enter → line break');
      if (t.tagName === 'TEXTAREA') insertLineBreakTextarea(t);
      else if (t.isContentEditable) insertBrAtCaretCE();
    } else {
      // Shift+Enter → 送信
      // console.log('[swap] Shift+Enter → send');
      sendAction(t);
    }
  }

  // capture = true で最前段で奪う
  window.addEventListener('keydown', onKeyDown, true);

  // 万一 keypress を使うサイト向けに抑え込み（安全側）
  window.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }
  }, true);
})();
