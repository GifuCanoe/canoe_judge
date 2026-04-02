// 全システム共通の設定
const APP_CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbwKfM-Xrt4z7RHnHjRarxj724DUz9r3QQ-mbAV-CxnYQjxqm-uc3CcqXEw4AW_D27j1ZQ/exec",

    // 区間ごとのゲート設定（ここを編集するだけでOK）
    TOURNAMENT_CONFIG: {
        1: { startGate: 1,  numGates: 4 },
        2: { startGate: 5,  numGates: 4 },
        3: { startGate: 9,  numGates: 4 },
        4: { startGate: 13, numGates: 3 },
        5: { startGate: 16, numGates: 2 }
    }
};