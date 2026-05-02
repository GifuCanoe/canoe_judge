document.addEventListener('DOMContentLoaded', () => {
    const currentSection = document.body.getAttribute('data-section') || "1";

    // --- 要素の取得 ---
    const arraysContainer = document.getElementById('arrays-container');
    const roundBtns = document.querySelectorAll('.round-toggle-btn');
    const fileSetupDiv = document.getElementById('file-setup');
    const loadingMessage = document.getElementById('loading-message');
    const clearBtn = document.getElementById('clear-btn');

    // --- 状態管理変数 ---
    let GATE_START_NUMBER, NUM_GATES, TOTAL_CELLS_IN_ARRAY;
    let allData = [];
    let TOTAL_ARRAYS = 0;
    let currentInputArrayIndex = 0; 
    let currentInputCellIndex = 2; 
    let currentRound = ""; 

    // --- 音声処理 ---
    const sounds = {
        0: new Audio('sound_0.mp3'),
        2: new Audio('sound_2.mp3'),
        50: new Audio('sound_50.mp3')
    };

    function playSound(num) {
        if (num !== null && sounds[num]) {
            sounds[num].pause();
            sounds[num].currentTime = 0;
            sounds[num].play().catch(e => console.warn("音声再生失敗:", e));
        }
    }

    // --- 初期設定適用[cite: 2] ---
    function initSettings() {
        const config = APP_CONFIG.TOURNAMENT_CONFIG[currentSection];
        if (!config) return;

        GATE_START_NUMBER = config.startGate;
        NUM_GATES = config.numGates;
        TOTAL_CELLS_IN_ARRAY = NUM_GATES + 2; 
        document.getElementById('main-title').textContent = `区間${currentSection}`;
        updateHeaders();
    }

    function updateHeaders() {
        const headerContainer = document.getElementById('column-headers');
        headerContainer.innerHTML = '';
        const headerRow = document.createElement('div');
        headerRow.classList.add('header-row');
        ['Category', 'Bib'].forEach(text => {
            const cell = document.createElement('div');
            cell.className = 'header-cell array-number-cell';
            cell.textContent = text;
            headerRow.appendChild(cell);
        });
        for (let i = 0; i < NUM_GATES; i++) {
            const gHeader = document.createElement('div');
            gHeader.className = 'header-cell gate-header';
            gHeader.textContent = `G${GATE_START_NUMBER + i}`;
            headerRow.appendChild(gHeader);
        }
        headerContainer.appendChild(headerRow);
    }

    // --- データ通信[cite: 2] ---
    async function fetchAndSetupRoster(roundName) {
        currentRound = roundName;
        document.getElementById('main-title').textContent = `区間${currentSection} - ${currentRound}`;
        const fetchUrl = `${APP_CONFIG.GAS_URL}?round=${encodeURIComponent(currentRound)}`;
        try {
            loadingMessage.textContent = `${currentRound}の名簿を取得中...`;
            const response = await fetch(fetchUrl);
            const list = await response.json(); 
            if (!list || list.length === 0 || list.error) throw new Error("データなし");
            
            allData = list.map(item => {
                const row = Array(TOTAL_CELLS_IN_ARRAY).fill(null);
                row[0] = item[0]; row[1] = item[1];
                return row;
            });
            TOTAL_ARRAYS = allData.length;
            fileSetupDiv.style.display = 'none';
            currentInputArrayIndex = 0;
            currentInputCellIndex = 2;
            renderArrays(true); // 初回はスクロールさせる
        } catch (err) {
            loadingMessage.innerHTML = `<span style="color:red;">名簿取得に失敗しました</span>`;
        }
    }

    async function syncToGoogleSheets() {
        if (allData.length === 0) return;
        try {
            await fetch(APP_CONFIG.GAS_URL, { 
                method: "POST", 
                mode: "no-cors", 
                body: JSON.stringify({
                    section: currentSection,
                    round: currentRound,
                    startGate: GATE_START_NUMBER,
                    numGates: NUM_GATES,
                    data: allData
                }) 
            });
        } catch (err) { console.error("同期失敗:", err); }
    }

    // --- 入力・表示[cite: 2, 4] ---
    function inputData(num) {
        if (allData.length === 0) return;
        allData[currentInputArrayIndex][currentInputCellIndex] = num;
        if (num !== null) {
            playSound(num);
            if (currentInputCellIndex < TOTAL_CELLS_IN_ARRAY - 1) {
                currentInputCellIndex++;
            } else if (currentInputArrayIndex < TOTAL_ARRAYS - 1) {
                currentInputCellIndex = 2;
                currentInputArrayIndex++;
            }
        }
        renderArrays(true); // 入力時は追従スクロールを有効にする
        syncToGoogleSheets();
    }

    function renderArrays(shouldScroll = false) {
        if (allData.length === 0) return;
        arraysContainer.innerHTML = '';

        for (let i = 0; i < TOTAL_ARRAYS; i++) {
            const row = document.createElement('div');
            row.className = 'array-row';
            if (i === currentInputArrayIndex) row.id = 'active-row';

            for (let j = 0; j < TOTAL_CELLS_IN_ARRAY; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                if (j < 2) {
                    cell.textContent = allData[i][j];
                    cell.classList.add('array-number-cell');
                    if (j === 0) {
                        const cat = String(allData[i][0]).toUpperCase();
                        if (cat.includes('MK1')) cell.classList.add('cat-mk1');
                        else if (cat.includes('WK1')) cell.classList.add('cat-wk1');
                        else if (cat.includes('MC1')) cell.classList.add('cat-mc1');
                        else if (cat.includes('WC1')) cell.classList.add('cat-wc1');
                    }
                } else {
                    cell.textContent = allData[i][j] !== null ? allData[i][j] : '';
                    if (allData[i][j] === 2) cell.classList.add('is-two');
                    if (allData[i][j] === 50) cell.classList.add('is-fifty');
                    if (i === currentInputArrayIndex && j === currentInputCellIndex) cell.classList.add('cell-highlight');
                    cell.onclick = () => { 
                        currentInputArrayIndex = i; 
                        currentInputCellIndex = j; 
                        renderArrays(false); // 手動選択時は自動スクロールさせない
                    };
                }
                row.appendChild(cell);
            }
            arraysContainer.appendChild(row);
        }

        // 自動追従スクロール
        if (shouldScroll) {
            const activeRow = document.getElementById('active-row');
            if (activeRow) {
                activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function moveFocus(dir) {
        if (dir === 'prevArray' && currentInputArrayIndex > 0) currentInputArrayIndex--;
        else if (dir === 'nextArray' && currentInputArrayIndex < TOTAL_ARRAYS - 1) currentInputArrayIndex++;
        else if (dir === 'prevCell') {
            if (currentInputCellIndex > 2) currentInputCellIndex--;
            else if (currentInputArrayIndex > 0) { currentInputArrayIndex--; currentInputCellIndex = TOTAL_CELLS_IN_ARRAY - 1; }
        } else if (dir === 'nextCell') {
            if (currentInputCellIndex < TOTAL_CELLS_IN_ARRAY - 1) currentInputCellIndex++;
            else if (currentInputArrayIndex < TOTAL_ARRAYS - 1) { currentInputArrayIndex++; currentInputCellIndex = 2; }
        }
        renderArrays(true);
    }

    // --- イベント設定 ---
    roundBtns.forEach(btn => {
        btn.onclick = () => {
            roundBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fetchAndSetupRoster(btn.dataset.round);
        };
    });

    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.onclick = () => inputData(parseInt(btn.dataset.value));
    });
    clearBtn.onclick = () => inputData(null);

    initSettings();
});