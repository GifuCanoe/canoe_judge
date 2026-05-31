document.addEventListener('DOMContentLoaded', () => {
    let allData = [];
    let currentInputArrayIndex = 0;
    let currentRound = "";
    let lastRecordTime = 0;
    const CHATTERING_DELAY = 500;   //チャタリング防止時間（ミリ秒）

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
    function saveBackup() {
        const backup = {
            round: currentRound,
            data: allData,
            index: currentInputArrayIndex
        };
        localStorage.setItem('canoe_goal_backup', JSON.stringify(backup));
    }

    function checkBackup() {
        const saved = localStorage.getItem('canoe_goal_backup');
        if (saved) {
            try {
                const backup = JSON.parse(saved);
                if (confirm(`前回の「${backup.round}」の未送信データが残っています。復元しますか？`)) {
                    allData = backup.data;
                    currentRound = backup.round;
                    currentInputArrayIndex = backup.index;
                    render();
                    document.getElementById('file-setup').style.display = 'none';
                } else {
                    localStorage.removeItem('canoe_goal_backup');
                }
            } catch (e) { console.error("Backup parse error", e); }
        }
    }

    function getTimestamp() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
        return `${h}:${m}:${s}.${ms}`;
    }

    // 名簿取得（Start列の状況も取得するよう拡張）
    async function fetchRoster(roundName) {
        localStorage.removeItem('canoe_goal_backup');
        currentRound = roundName;
        loadingMessage.textContent = `${roundName}の名簿を取得中...`;
        try {
            const res = await fetch(`${APP_CONFIG.GAS_URL}?round=${encodeURIComponent(roundName)}`);
            const list = await res.json();
            
            // list[i][0]:Category, [1]:Bib, [2]:Start状況(Time or DNS)
            allData = list.map(item => {
                // スタート側ですでにDNSなら、ゴール側の初期値をDNSにする
                const initialStatus = (item[2] === "DNS") ? "DNS" : null;
                return [item[0], item[1], initialStatus];
            });

            // 最初の入力対象がDNSだった場合、次の空欄までフォーカスを移動
            currentInputArrayIndex = 0;
            if (allData[currentInputArrayIndex][2] === "DNS") {
                findNextEmpty();
            }

            render();
            document.getElementById('file-setup').style.display = 'none';
            saveBackup();
        } catch (e) {
            loadingMessage.innerHTML = `<span style="color:red;">取得失敗</span>`;
        }
    }

    // 次の空欄を探すロジック（独立した関数に整理）
    function findNextEmpty() {
        let foundNext = false;
        // 後ろに空欄を探す
        for (let i = currentInputArrayIndex + 1; i < allData.length; i++) {
            if (!allData[i][2]) {
                currentInputArrayIndex = i;
                foundNext = true;
                break;
            }
        }
        // 前に戻って空欄を探す
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

    // 記録処理
    function recordGoal(type) {
        if (allData.length === 0) return;

        // すでにDNSの選手は記録をガード（CLEAR以外）
        if (type !== 'CLEAR' && allData[currentInputArrayIndex][2] === 'DNS') {
            console.log("DNS選手のためスキップします");
            findNextEmpty();
            render();
            return;
        }

        const now = Date.now();
        if (type !== 'CLEAR') {
            if (now - lastRecordTime < CHATTERING_DELAY) return; 
            lastRecordTime = now;
        }

        if (type === 'FINISH') {
            allData[currentInputArrayIndex][2] = getTimestamp();
            soundFinish.currentTime = 0;
            soundFinish.play().catch(e => {});
        } else if (type === 'DNF') {
            allData[currentInputArrayIndex][2] = 'DNF';
            soundDNF.currentTime = 0;
            soundDNF.play().catch(e => {});
        } else if (type === 'CLEAR') {
            allData[currentInputArrayIndex][2] = null;
        }
        
        if (type !== 'CLEAR') {
            findNextEmpty();
        }

        render();
        saveBackup();
        sync();
    }

    async function sync() {
        try {
            await fetch(APP_CONFIG.GAS_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify({ 
                    section: "GOAL", 
                    round: currentRound, 
                    data: allData 
                })
            });
        } catch (e) { console.error("Sync Error"); }
    }

    function render() {
        arraysContainer.innerHTML = '';
        allData.forEach((rowValues, i) => {
            const row = document.createElement('div');
            row.className = `array-row ${i === currentInputArrayIndex ? 'active-row' : ''}`;
            row.id = `row-${i}`;
            row.onclick = () => { 
                currentInputArrayIndex = i; 
                render(); 
                saveBackup();
            };

            rowValues.forEach((val, j) => {
                const cell = document.createElement('div');
                const cellType = j === 0 ? 'cat-cell' : (j === 1 ? 'bib-cell' : 'time-cell');
                cell.className = `cell ${cellType}`;
                
                if (j === 0 && val) {
                    const cat = String(val).toUpperCase();
                    if (cat.includes('MK1')) cell.classList.add('cat-mk1');
                    else if (cat.includes('WK1')) cell.classList.add('cat-wk1');
                    else if (cat.includes('MC1')) cell.classList.add('cat-mc1');
                    else if (cat.includes('WC1')) cell.classList.add('cat-wc1');
                }

                // DNSのセルをグレーアウトする
                if (j === 2 && val === 'DNS') {
                    cell.style.backgroundColor = '#666';
                    cell.style.color = '#ccc';
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

    checkBackup();

    roundBtns.forEach(btn => btn.onclick = () => fetchRoster(btn.dataset.round));
    document.getElementById('finish-btn').onclick = () => recordGoal('FINISH');
    document.getElementById('dnf-btn').onclick = () => recordGoal('DNF');
    document.getElementById('clear-btn').onclick = () => recordGoal('CLEAR');

    const hc = document.getElementById('column-headers');
    hc.innerHTML = `
        <div class="header-row">
            <div class="header-cell cat-cell">Category</div>
            <div class="header-cell bib-cell">Bib</div>
            <div class="header-cell time-cell">Goal Time</div>
        </div>`;

    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        const key = event.key.toUpperCase();
        if (key === 'G') recordGoal('FINISH');
        else if (key === 'D') recordGoal('DNF');
        else if (key === 'C') recordGoal('CLEAR');
    });
});