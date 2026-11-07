// 全システム共通の設定_SL用
const APP_CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbzsXW5PwNbK4t-6G_Czm4VGTtGhzLL7mqoqTz3HYhz2wSMeHSF22mu7EnW7Aw6RlgSU/exec",

    // 区間ごとのゲート設定（ここを編集するだけでOK）
    TOURNAMENT_CONFIG: {
        1: { startGate: 1,  numGates: 3 },
        2: { startGate: 4,  numGates: 3 },
        3: { startGate: 7,  numGates: 3 },
        4: { startGate: 10, numGates: 3 },
        5: { startGate: 13, numGates: 3 }
    }
};