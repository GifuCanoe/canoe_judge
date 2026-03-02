// 全システム共通の設定
const APP_CONFIG = {
    GAS_URL: "https://script.google.com/macros/s/AKfycbwzqvTqm90UxPcnTEigBq_FzW05svpzILtmdGvE1NuBOeTkXRErD-qkmju67mWENbA5Xw/exec",

    // 区間ごとのゲート設定（ここを編集するだけでOK）
    TOURNAMENT_CONFIG: {
        1: { startGate: 1,  numGates: 3 },
        2: { startGate: 4,  numGates: 3 },
        3: { startGate: 7,  numGates: 3 },
        4: { startGate: 10, numGates: 3 },
        5: { startGate: 13, numGates: 3 }
    }
};