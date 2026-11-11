document.addEventListener('DOMContentLoaded', () => {
  let allData = [];
  const TARGET_SHEET_NAME = "表示"; // 参照するスプレッドシートのシート名
  const MAX_DISPLAY = 3;             // 3名固定

  const clockElement = document.getElementById("clockTime");
  const athleteListElement = document.getElementById("athleteList");

  // ==========================================
  // 【音声（Web Audio API）関連の処理】
  // ==========================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ブラウザの自動再生ブロック対策
  window.addEventListener('click', initAudio, { once: true });
  window.addEventListener('keydown', initAudio, { once: true });

  // 物理ブザー風の音を発生させる関数（Type2仕様）
  function playBeep(type, isFinal = false) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // 矩形波 (square) で太いブザー音を再現
    osc.type = 'square';
    
    // 0秒のときは1000Hzの高音＆長め、それ以外は500Hz
    const freq = isFinal ? 1000 : 500; 
    const duration = type === '10sec' ? 0.6 : (isFinal ? 0.8 : 0.3);

    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // 音の立ち上がりと消え方を調整してパキッとしたブザー音にする
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime + duration - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  // 最後に音を鳴らした時刻キーを記憶（重複鳴り防止）
  let lastPlayedKey = "";

  // カウントダウン音の判定処理（1秒早いズレを+1000msで補正）
  function checkCountdownSound(athletes) {
    if (!athletes || athletes.length === 0) return;
    
    const nextAthlete = athletes[0];
    if (!nextAthlete || !nextAthlete.timeStr) return;

    const now = new Date();
    const timeParts = nextAthlete.timeStr.split(':');
    if (timeParts.length < 2) return;

    const targetTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parseInt(timeParts[0], 10),
      parseInt(timeParts[1], 10),
      parseInt(timeParts[2] || 0, 10)
    );

    // 1秒のズレ補正
    const diffMs = (targetTime.getTime() - now.getTime()) + 1000;
    
    if (diffMs < -100) return;

    const diffSec = Math.floor(diffMs / 1000);

    const playKey = `${nextAthlete.bib}_${nextAthlete.timeStr}_${diffSec}`;
    if (lastPlayedKey === playKey) return;

    // カウントダウン音の鳴り分け
    if (diffSec === 10) {
      playBeep('10sec', false);
      lastPlayedKey = playKey;
    } else if (diffSec >= 1 && diffSec <= 5) {
      playBeep('count', false);
      lastPlayedKey = playKey;
    } else if (diffSec === 0) {
      playBeep('final', true);
      lastPlayedKey = playKey;
    }
  }

  // ==========================================
  // 【データ取得・描画関連】
  // ==========================================

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

  function updateDisplay() {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const upcoming = allData.filter(item => {
      if (item.seconds === null) return true;
      return item.seconds >= currentSeconds;
    });

    const displayAthletes = upcoming.slice(0, MAX_DISPLAY);
    
    renderTable(displayAthletes);
    checkCountdownSound(displayAthletes);
  }

  function updateApp() {
    const now = new Date();
    
    const hour = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const sec = String(now.getSeconds()).padStart(2, "0");
    clockElement.innerText = `${hour}:${min}:${sec}`;

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

  fetchRoster();
  setInterval(() => fetchRoster(), 30000);
  updateApp();
});