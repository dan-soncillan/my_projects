chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.url) return;
  const domain = new URL(tab.url).hostname;
  const { enabledDomains = [] } = await chrome.storage.sync.get("enabledDomains");
  const set = new Set(enabledDomains);
  if (set.has(domain)) {
    set.delete(domain);
    await chrome.action.setBadgeText({ text: "", tabId: tab.id });
  } else {
    set.add(domain);
    await chrome.action.setBadgeText({ text: "ON", tabId: tab.id });
  }
  await chrome.storage.sync.set({ enabledDomains: [...set] });
  chrome.tabs.sendMessage(tab.id, { type: "enter_swap_settings_updated" }).catch(() => {});
});
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (!tab?.url) return;
  const domain = new URL(tab.url).hostname;
  const { enabledDomains = [] } = await chrome.storage.sync.get("enabledDomains");
  await chrome.action.setBadgeText({ text: enabledDomains.includes(domain) ? "ON" : "", tabId });
});
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "complete" || !tab?.url) return;
  const domain = new URL(tab.url).hostname;
  const { enabledDomains = [] } = await chrome.storage.sync.get("enabledDomains");
  await chrome.action.setBadgeText({ text: enabledDomains.includes(domain) ? "ON" : "", tabId });
});
