// content.js — ChatGPT専用・IME対応・Slack方式 (Enter=改行 / 送信=Cmd+Enter(Mac) or Ctrl+Enter(Win/Linux))
(() => {
  'use strict';
  const VERSION = 'swap-v3.5';
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

    // ZWSP でキャレット安定
    const zwsp = document.createTextNode('\u200B');
    range.setStartAfter(br);
    range.setEndAfter(br);
    range.insertNode(zwsp);

    const r2 = document.createRange();
    r2.setStartAfter(zwsp);
    r2.setEndAfter(zwsp);
    sel.removeAllRanges();
    sel.addRange(r2);

    // React 系に変化通知
    document.activeElement?.dispatchEvent(
      new InputEvent('input', { bubbles: true, cancelable: false, inputType: 'insertLineBreak' })
    );
  }

  // --- contenteditable の <br> と ZWSP を適切に処理 ---
  function cleanupBrAndZwsp() {
    const editable = document.activeElement;
    if (!editable || !editable.isContentEditable) return;

    // ZWSP を削除
    const walker = document.createTreeWalker(
      editable,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.textContent.includes('\u200B') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const zwspNodes = [];
    let node;
    while (node = walker.nextNode()) {
      zwspNodes.push(node);
    }

    zwspNodes.forEach(node => {
      if (node.textContent === '\u200B') {
        node.remove();
      } else {
        node.textContent = node.textContent.replace(/\u200B/g, '');
      }
    });

    // 連続する <br> タグを整理
    const brElements = editable.querySelectorAll('br');
    brElements.forEach((br, index) => {
      const nextBr = br.nextElementSibling;
      if (nextBr && nextBr.tagName === 'BR') {
        // 連続する <br> の場合は1つだけ残す
        if (index > 0) {
          br.remove();
        }
      }
    });
  }

  // --- textarea 改行 ---
  function insertLineBreakTextarea(t) {
    const s = t.selectionStart, e = t.selectionEnd, v = t.value;
    t.value = v.slice(0, s) + '\n' + v.slice(e);
    const pos = s + 1;
    t.setSelectionRange(pos, pos);
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // --- 送信（ChatGPTはボタンclickが最も確実） ---
  function sendAction(target) {
    const btn =
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[aria-label="Send message"]') ||
      document.querySelector('form button[type="submit"]');
    if (btn) { btn.click(); return; }

    const form = target.closest('form');
    if (form) {
      const submitBtn = form.querySelector('[type=submit], button:not([type]), button[type=submit]');
      if (submitBtn) submitBtn.click(); else form.requestSubmit?.();
    }
  }

  // --- OS 判定 ---
  const isMac = () => navigator.platform.toUpperCase().includes('MAC');

  // --- キー処理（Slack方式） ---
  //  Enter        → 改行（共通）
  //  送信         → macOS: Cmd+Enter / Windows & Linux: Ctrl+Enter
  //  Backspace/Delete → 通常の削除処理
  function onKeyDown(e) {
    const t = e.target;
    if (!isEditable(t)) return;

    // IME変換中は確定に必要なので素通し
    if (isComposing) return;

    // Backspace と Delete の処理
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // 通常の削除処理を実行
      setTimeout(() => {
        cleanupBrAndZwsp();
      }, 0);
      return; // 通常の処理をそのまま通す
    }

    // Enter キーの処理
    if (e.key !== 'Enter') return;

    const sendCombo = isMac() ? (e.metaKey && !e.ctrlKey) : (e.ctrlKey && !e.metaKey);

    if (sendCombo) {
      // 送信
      e.preventDefault();
      e.stopImmediatePropagation();
      sendAction(t);
    } else {
      // 改行（Enter単体、または Shift+Enter 等もすべて改行）
      e.preventDefault();
      e.stopImmediatePropagation();
      if (t.tagName === 'TEXTAREA') insertLineBreakTextarea(t);
      else if (t.isContentEditable) insertBrAtCaretCE();
    }
  }

  // capture=true で最前段で奪う
  window.addEventListener('keydown', onKeyDown, true);

  // 一部サイトの keypress 互換用に抑え込み
  window.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }
  }, true);

  // 入力時のクリーンアップ
  window.addEventListener('input', (e) => {
    if (isEditable(e.target)) {
      setTimeout(() => {
        cleanupBrAndZwsp();
      }, 0);
    }
  }, true);
})();
