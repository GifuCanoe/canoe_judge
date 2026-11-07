document.addEventListener('DOMContentLoaded', () => {
  let allData = [];
  const TARGET_SHEET_NAME = "表示"; // 参照するスプレッドシートのシート名
  const MAX_DISPLAY = 3;             // 3名固定

  const clockElement = document.getElementById("clockTime");
  const athleteListElement = document.getElementById("athleteList");

  // 日付文字列から秒数への変換（ローカル時間 JST として解釈）
  function timeStringToSeconds(timeStr) {
    if (!timeStr) return null;
    let timeString = String(timeStr).trim();

    if (timeString.includes('T')) {
      const dateObj = new Date(timeString);
      if (!isNaN(dateObj.getTime())) {
        const h = dateObj.getHours();
        const m = dateObj.getMinutes();
        const s = dateObj.getSeconds();
        return h * 3600 + m * 60 + s;
      }
    }

    const parts = timeString.split(':').map(Number);
    if (isNaN(parts[0])) return null;
    return parts[0] * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }

  // 表示用時刻フォーマット（ローカル時間で整形）
  function formatTimeString(timeStr) {
    if (!timeStr) return '';
    let timeString = String(timeStr).trim();

    if (timeString.includes('T')) {
      const dateObj = new Date(timeString);
      if (!isNaN(dateObj.getTime())) {
        const h = String(dateObj.getHours()).padStart(2, '0');
        const m = String(dateObj.getMinutes()).padStart(2, '0');
        const s = String(dateObj.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
      }
    }
    return timeString;
  }

  // GASから「表示」シートの名簿データ取得
  async function fetchRoster() {
    try {
      const res = await fetch(`${APP_CONFIG.GAS_URL}?round=${encodeURIComponent(TARGET_SHEET_NAME)}`);
      const list = await res.json();

      allData = list.map(item => {
        const category = item[0] || '';
        const bib = item[1] || '';
        const rawTimeStr = item[2] || ''; 
        
        return {
          category: category,
          bib: bib,
          timeStr: formatTimeString(rawTimeStr),
          seconds: timeStringToSeconds(rawTimeStr)
        };
      });
      
      updateDisplay();
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  }

  // リストのフィルタリングと描画更新
  function updateDisplay() {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const upcoming = allData.filter(item => {
      if (item.seconds === null) return true; // アナウンス行（時刻なし）はそのまま残す
      return item.seconds >= currentSeconds;
    });

    const displayAthletes = upcoming.slice(0, MAX_DISPLAY);
    renderTable(displayAthletes);
  }

  // メインループ
  function updateApp() {
    const now = new Date();
    
    // 1. 時計表示更新
    const hour = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const sec = String(now.getSeconds()).padStart(2, "0");
    clockElement.innerText = `${hour}:${min}:${sec}`;

    // 2. リスト状態監視更新
    updateDisplay();

    requestAnimationFrame(updateApp);
  }

  function renderTable(athletes) {
    if (allData.length === 0) {
      athleteListElement.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">データがありません</td></tr>`;
      return;
    }

    if (athletes.length === 0) {
      athleteListElement.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">本日の全スケジュールが終了しました</td></tr>`;
      return;
    }

    let html = "";
    athletes.forEach((athlete) => {
      const catUpper = String(athlete.category).toUpperCase();
      let catClass = "";
      if (catUpper.includes('MK1')) catClass = 'cat-mk1';
      else if (catUpper.includes('WK1')) catClass = 'cat-wk1';
      else if (catUpper.includes('MC1')) catClass = 'cat-mc1';
      else if (catUpper.includes('WC1')) catClass = 'cat-wc1';

      const catHtml = athlete.category 
        ? `<span class="cat-badge ${catClass}">${athlete.category}</span>` 
        : '';

      html += `
        <tr>
          <td>${catHtml}</td>
          <td class="bib-col">${athlete.bib}</td>
          <td class="time-col">${athlete.timeStr}</td>
        </tr>
      `;
    });
    athleteListElement.innerHTML = html;
  }

  // 初回データ取得
  fetchRoster();

  // 30秒ごとの自動データ同期
  setInterval(() => fetchRoster(), 30000);

  // 時計更新ループ起動
  updateApp();
});