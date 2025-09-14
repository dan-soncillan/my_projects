let enabled = false;
async function refreshEnabled() {
  try {
    const domain = location.hostname;
    const { enabledDomains = [] } = await chrome.storage.sync.get("enabledDomains");
    enabled = enabledDomains.includes(domain);
  } catch { enabled = false; }
}
refreshEnabled();
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "enter_swap_settings_updated") refreshEnabled();
});
function isEditableTarget(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA") return true;
  return false;
}
function insertLineBreak(target) {
  if (!target) return;
  if (target.tagName === "TEXTAREA") {
    const { selectionStart: s, selectionEnd: e, value: v } = target;
    target.value = v.slice(0, s) + "\n" + v.slice(e);
    const pos = s + 1;
    target.setSelectionRange(pos, pos);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  if (target.isContentEditable) {
    document.execCommand("insertLineBreak", false, null);
  }
}
function simulateEnter(target) {
  const init = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
  const canceled = !target.dispatchEvent(new KeyboardEvent("keydown", init));
  target.dispatchEvent(new KeyboardEvent("keypress", init));
  target.dispatchEvent(new KeyboardEvent("keyup", init));
  if (!canceled) {
    const form = target.closest("form");
    if (form) {
      const submitBtn = form.querySelector("[type=submit], button:not([type]), button[type=submit]");
      if (submitBtn) submitBtn.click(); else form.requestSubmit?.();
    }
  }
}
function handler(e) {
  if (!enabled) return;
  const t = e.target;
  if (!isEditableTarget(t)) return;
  if (e.key !== "Enter" || e.defaultPrevented) return;
  if (!e.shiftKey) { e.preventDefault(); insertLineBreak(t); }
  else { e.preventDefault(); simulateEnter(t); }
}
window.addEventListener("keydown", handler, true);
