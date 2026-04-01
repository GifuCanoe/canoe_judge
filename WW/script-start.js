document.addEventListener('DOMContentLoaded', () => {
    let allData = [];
    let currentInputArrayIndex = 0;
    let currentRound = "";
    let lastRecordTime = 0;
    const CHATTERING_DELAY = 500;   //チャタリング防止時間（ミリ秒）　500で0.5秒

    const arraysContainer = document.getElementById('arrays-container');
    const roundBtns = document.querySelectorAll('.round-toggle-btn');
    const loadingMessage = document.getElementById('loading-message');

    // --- 音声設定 ---
    const soundFinish = new Audio('sound_0.mp3');
    const soundDNF = new Audio('sound_2.mp3');
    let isAudioUnlocked = false;

    const unlockAudio = () => {
        if (isAudioUnlocked) return;
        const fPromise = soundFinish.play();
        const dPromise = soundDNF.play();
        Promise.all([fPromise, dPromise]).then(() => {
            soundFinish.pause(); soundFinish.currentTime = 0;
            soundDNF.pause();    soundDNF.currentTime = 0;
            isAudioUnlocked = true;
            console.log("Audio Unlocked");
        }).catch(e => console.log("Audio waiting..."));
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    // --- バックアップ機能 ---

    // 1. ローカルに保存
    function saveBackup() {
        const backup = {
            round: currentRound,
            data: allData,
            index: currentInputArrayIndex
        };
        localStorage.setItem('canoe_goal_backup', JSON.stringify(backup));
    }

    // 2. ローカルから復元（起動時にチェック）
    function checkBackup() {
        const saved = localStorage.getItem('canoe_goal_backup');
        if (saved) {
            try {
                const backup = JSON.parse(saved);
                if (confirm(`前回の「${backup.round}」の未送信データが残っています。復元しますか？\n（キャンセルすると新しい名簿を取得できます）`)) {
                    allData = backup.data;
                    currentRound = backup.round;
                    currentInputArrayIndex = backup.index;
                    render();
                    document.getElementById('file-setup').style.display = 'none';
                } else {
                    // キャンセルされた場合は古いバックアップを破棄
                    localStorage.removeItem('canoe_goal_backup');
                }
            } catch (e) {
                console.error("Backup parse error", e);
            }
        }
    }

    // 時刻取得
    function getTimestamp() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
        return `${h}:${m}:${s}.${ms}`;
    }

    // 名簿取得
    async function fetchRoster(roundName) {
        // 新しく名簿を取る際は、古いバックアップを消去
        localStorage.removeItem('canoe_goal_backup');
        
        currentRound = roundName;
        loadingMessage.textContent = `${roundName}の名簿を取得中...`;
        try {
            const res = await fetch(`${APP_CONFIG.GAS_URL}?round=${encodeURIComponent(roundName)}`);
            const list = await res.json();
            allData = list.map(item => [item[0], item[1], null]);
            currentInputArrayIndex = 0;
            render();
            document.getElementById('file-setup').style.display = 'none';
            saveBackup(); // 取得直後の状態を保存
        } catch (e) {
            loadingMessage.innerHTML = `<span style="color:red;">取得失敗</span>`;
        }
    }

    // 記録処理
    function recordGoal(type) {
        if (allData.length === 0) return;

        // 現在時刻（ミリ秒）を取得
        const now = Date.now();

        // CLEAR（修正）以外の場合で、前回の記録から設定時間以内なら無視する
        if (type !== 'CLEAR') {
            if (now - lastRecordTime < CHATTERING_DELAY) {
                console.log("Chattering prevented"); // ログに表示（確認用）
                return; 
            }
            // 記録時間を更新
            lastRecordTime = now;
        }
        // 以上チャタリング対策用コード

        if (type === 'START') {
            allData[currentInputArrayIndex][2] = getTimestamp();
            soundFinish.currentTime = 0;
            soundFinish.play().catch(e => console.error("Sound error:", e));
        } else if (type === 'DNS') {
            allData[currentInputArrayIndex][2] = 'DNS';
            soundDNF.currentTime = 0;
            soundDNF.play().catch(e => console.error("Sound error:", e));
        } else if (type === 'CLEAR') {
            allData[currentInputArrayIndex][2] = null;
        }
        
        // 次の空欄を探すロジック（追い越し対応版）
        if (type !== 'CLEAR') {
            let foundNext = false;
            for (let i = currentInputArrayIndex + 1; i < allData.length; i++) {
                if (!allData[i][2]) {
                    currentInputArrayIndex = i;
                    foundNext = true;
                    break;
                }
            }
            if (!foundNext) {
                for (let i = 0; i < currentInputArrayIndex; i++) {
                    if (!allData[i][2]) {
                        currentInputArrayIndex = i;
                        foundNext = true;
                        break;
                    }
                }
            }
        }

        render();
        saveBackup(); // 記録するたびに保存
        sync();
    }

    // GAS同期
    async function sync() {
        try {
            await fetch(APP_CONFIG.GAS_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify({ 
                    section: "START", 
                    round: currentRound, 
                    data: allData 
                })
            });
        } catch (e) { console.error("Sync Error"); }
    }

    // リスト描画
    function render() {
        arraysContainer.innerHTML = '';
        allData.forEach((rowValues, i) => {
            const row = document.createElement('div');
            row.className = `array-row ${i === currentInputArrayIndex ? 'active-row' : ''}`;
            row.id = `row-${i}`;
            row.onclick = () => { 
                currentInputArrayIndex = i; 
                render(); 
                saveBackup(); // 選択位置の変更も保存
            };

            rowValues.forEach((val, j) => {
                const cell = document.createElement('div');
                const cellType = j === 0 ? 'cat-cell' : (j === 1 ? 'bib-cell' : 'time-cell');
                cell.className = `cell ${cellType}`;
                
                if (j === 0 && val) {
                    const cat = String(val).toUpperCase();
                    if (cat.includes('MK1')) cell.classList.add('cat-mk1');
                    else if (cat.includes('WK1')) cell.classList.add('cat-wk1');
                    else if (cat.includes('DR-M')) cell.classList.add('cat-drm');
                    else if (cat.includes('DR-W')) cell.classList.add('cat-drw');
                }
                cell.textContent = val || '';
                row.appendChild(cell);
            });
            arraysContainer.appendChild(row);
        });

        const activeRow = document.getElementById(`row-${currentInputArrayIndex}`);
        if (activeRow) {
            activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 初期化：バックアップの有無を確認
    checkBackup();

    // ボタンイベント登録
    roundBtns.forEach(btn => btn.onclick = () => fetchRoster(btn.dataset.round));
    document.getElementById('start-btn').onclick = () => recordGoal('START');
    document.getElementById('dns-btn').onclick = () => recordGoal('DNS');
    document.getElementById('clear-btn').onclick = () => recordGoal('CLEAR');

    // ヘッダー生成
    const hc = document.getElementById('column-headers');
    hc.innerHTML = `
        <div class="header-row">
            <div class="header-cell cat-cell">Category</div>
            <div class="header-cell bib-cell">Bib</div>
            <div class="header-cell time-cell">Goal Time</div>
        </div>`;

    // --- キーボード操作の対応 ---
    document.addEventListener('keydown', (event) => {
        // 入力中の誤動作を防ぐため、もし他にテキスト入力などがあれば除外する（今回は不要ですが念のため）
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        const key = event.key.toUpperCase(); // 押しやすくするため大文字小文字を区別しない

        if (key === 'G') {
            recordGoal('START');
        } else if (key === 'D') {
            recordGoal('DNS');
        } else if (key === 'C') {
            recordGoal('CLEAR');
        }
    });

});