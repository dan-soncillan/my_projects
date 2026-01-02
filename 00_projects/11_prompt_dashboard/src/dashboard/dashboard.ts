import { getEvents, getEventsForDays, deleteAllEvents } from '../shared/storage';
import { PromptEvent } from '../shared/types';
import { extractDate, getTodayDate } from '../shared/utils';
import { TOOLS } from '../shared/constants';
import { Chart } from 'chart.js/auto';

let trendChart: Chart | null = null;
let toolChart: Chart | null = null;

/**
 * 今日の合計を表示
 */
async function updateTodayTotal(): Promise<void> {
  const events = await getEvents();
  const today = getTodayDate();
  const todayEvents = events.filter(e => extractDate(e.ts) === today);
  const total = todayEvents.length;
  
  const element = document.getElementById('todayTotal');
  if (element) {
    element.textContent = `${total}回`;
  }
}

/**
 * 7日合計を表示
 */
async function updateWeekTotal(): Promise<void> {
  const events = await getEventsForDays(7);
  const total = events.length;
  
  const element = document.getElementById('weekTotal');
  if (element) {
    element.textContent = `${total}回`;
  }
}

/**
 * 7日推移グラフを描画
 */
async function renderTrendChart(): Promise<void> {
  const events = await getEventsForDays(7);
  
  // 過去7日間の日付リストを生成
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    // JSTで日付文字列を生成
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    dates.push(dateStr);
  }
  
  // 日付ごとにカウント
  const counts = dates.map(date => {
    return events.filter(e => extractDate(e.ts) === date).length;
  });
  
  const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
  if (!ctx) return;
  
  // 既存のチャートを破棄
  if (trendChart) {
    trendChart.destroy();
  }
  
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.map(d => {
        const date = new Date(d + 'T00:00:00+09:00');
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        label: '送信回数',
        data: counts,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

/**
 * ツール別内訳グラフを描画
 */
async function renderToolChart(): Promise<void> {
  const events = await getEventsForDays(7);
  
  // ツール別にカウント
  const toolCounts: Record<string, number> = {
    chatgpt: 0,
    claude: 0,
    gemini: 0,
    cursor: 0,
  };
  
  events.forEach(e => {
    if (e.tool in toolCounts) {
      toolCounts[e.tool]++;
    }
  });
  
  const ctx = document.getElementById('toolChart') as HTMLCanvasElement;
  if (!ctx) return;
  
  // 既存のチャートを破棄
  if (toolChart) {
    toolChart.destroy();
  }
  
  const colors = [
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
  ];
  
  toolChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(toolCounts).map(tool => TOOLS[tool] || tool),
      datasets: [{
        label: '送信回数',
        data: Object.values(toolCounts),
        backgroundColor: colors,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

/**
 * CSVエクスポート
 */
async function exportToCSV(): Promise<void> {
  const events = await getEvents();
  
  // ヘッダー行
  const headers = ['ID', 'Timestamp', 'Tool', 'Source'];
  const rows = events.map(e => [e.id, e.ts, e.tool, e.source]);
  
  // CSV形式に変換
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // BOM付きUTF-8でエンコード
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // ダウンロード
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  a.download = `prompt-counter-${timestamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * データ全削除
 */
async function deleteAllData(): Promise<void> {
  if (!confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
    return;
  }
  
  try {
    await deleteAllEvents();
    alert('データを削除しました。');
    // 画面を更新
    await updateAll();
  } catch (error) {
    console.error('Failed to delete events:', error);
    alert('データの削除に失敗しました。');
  }
}

/**
 * すべての表示を更新
 */
async function updateAll(): Promise<void> {
  await updateTodayTotal();
  await updateWeekTotal();
  await renderTrendChart();
  await renderToolChart();
}

/**
 * 初期化
 */
function init(): void {
  // エクスポートボタン
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }
  
  // 削除ボタン
  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteAllData);
  }
  
  // 初期表示
  updateAll();
  
  // 定期的に更新（30秒ごと）
  setInterval(() => {
    updateAll();
  }, 30000);
}

init();

