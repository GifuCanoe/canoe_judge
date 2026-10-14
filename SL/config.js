// 全システム共通の設定_SL用
const APP_CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbxoz84pPElGG6OsVZHMGZuhZuEWvo0qwF3KBFk67lFaIQc3LcgoyfrC2hU6kIJIhwT5/exec",

    // 区間ごとのゲート設定（ここを編集するだけでOK）
    TOURNAMENT_CONFIG: {
        1: { startGate: 1,  numGates: 5 },
        2: { startGate: 6,  numGates: 5 },
        3: { startGate: 11, numGates: 3 },
        4: { startGate: 14, numGates: 3 },
        5: { startGate: 17, numGates: 4 }
    }
};