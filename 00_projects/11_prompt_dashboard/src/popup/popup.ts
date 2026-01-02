import { getTodayEvents } from '../shared/storage';
import { ManualCountMessage } from '../shared/types';

/**
 * 今日のカウントを表示
 */
async function updateTodayCount(): Promise<void> {
  const todayEvents = await getTodayEvents();
  const count = todayEvents.length;
  const countElement = document.getElementById('todayCount');
  if (countElement) {
    countElement.textContent = `${count}回`;
  }
}

/**
 * 手動カウントボタンの処理
 */
function setupManualCountButton(): void {
  const button = document.getElementById('manualCountBtn') as HTMLButtonElement;
  if (!button) return;
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = '記録中...';
    
    const message: ManualCountMessage = {
      type: 'MANUAL_COUNT',
      tool: 'cursor',
    };
    
    chrome.runtime.sendMessage(message, (response) => {
      if (response && response.success) {
        // カウントを更新
        updateTodayCount();
        button.textContent = '✓ 記録完了';
        setTimeout(() => {
          button.textContent = '+1 (Cursor)';
          button.disabled = false;
        }, 1000);
      } else {
        console.error('Failed to save manual count:', response?.error);
        button.textContent = 'エラー';
        setTimeout(() => {
          button.textContent = '+1 (Cursor)';
          button.disabled = false;
        }, 2000);
      }
    });
  });
}

/**
 * Dashboardを開くボタンの処理
 */
function setupDashboardButton(): void {
  const button = document.getElementById('dashboardBtn');
  if (!button) return;
  
  button.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard/dashboard.html'),
    });
  });
}

/**
 * 初期化
 */
function init(): void {
  updateTodayCount();
  setupManualCountButton();
  setupDashboardButton();
  
  // 定期的にカウントを更新（5秒ごと）
  setInterval(() => {
    updateTodayCount();
  }, 5000);
}

init();

