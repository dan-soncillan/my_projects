let enabled = true; // ← とりあえず常に有効化してテスト
let isComposing = false;

window.addEventListener("compositionstart", () => { isComposing = true; });
window.addEventListener("compositionend", () => { isComposing = false; });

function handler(e) {
  if (!enabled) {
    console.log("[swap] disabled");
    return;
  }
  if (e.key !== "Enter") return;

  console.log("[swap] Enter detected", {isComposing, shift: e.shiftKey});

  if (isComposing) {
    console.log("[swap] IME中なので素通し");
    return;
  }

  e.preventDefault();
  e.stopImmediatePropagation();
  console.log("[swap] swapping!", {shift: e.shiftKey});

  if (!e.shiftKey) {
    console.log("[swap] Enter → 改行");
    if (e.target.tagName === "TEXTAREA") {
      const t = e.target;
      const s = t.selectionStart, epos = t.selectionEnd, v = t.value;
      t.value = v.slice(0,s) + "\n" + v.slice(epos);
      t.setSelectionRange(s+1,s+1);
      t.dispatchEvent(new Event("input",{bubbles:true}));
    } else if (e.target.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createElement("br"));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else {
    console.log("[swap] Shift+Enter → 送信");
    const btn = document.querySelector('button[data-testid="send-button"]') ||
                document.querySelector('button[aria-label="Send message"]') ||
                document.querySelector('form button[type="submit"]');
    if (btn) btn.click();
  }
}

window.addEventListener("keydown", handler, true);
