const $domain=document.getElementById("domain");
const $list=document.getElementById("list");
async function load(){const {enabledDomains=[]}=await chrome.storage.sync.get("enabledDomains"); render(enabledDomains);}
function render(domains){$list.innerHTML=""; domains.forEach((d)=>{const li=document.createElement("li"); li.textContent=d+" "; const btn=document.createElement("button"); btn.textContent="削除"; btn.onclick=async()=>{const {enabledDomains=[]}=await chrome.storage.sync.get("enabledDomains"); const next=enabledDomains.filter(x=>x!==d); await chrome.storage.sync.set({enabledDomains:next}); render(next);}; li.appendChild(btn); $list.appendChild(li);});}
document.getElementById("add").addEventListener("click", async()=>{const v=($domain.value||"").trim(); if(!v) return; const domain=v.replace(/^https?:\/\//,"").split("/")[0]; const {enabledDomains=[]}=await chrome.storage.sync.get("enabledDomains"); if(!enabledDomains.includes(domain)){enabledDomains.push(domain); await chrome.storage.sync.set({enabledDomains}); render(enabledDomains); $domain.value="";}});
load();
