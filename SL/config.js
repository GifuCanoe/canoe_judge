// 全システム共通の設定_SL用
const APP_CONFIG = {
    // GAS_URL: "https://script.google.com/macros/s/AKfycbx3zNaU-DZSc18lndI5InCtzYFqyrx19HR-LWYdh0VKFKlBfI9Tr2plw6Niro-l83zUDA/exec",
    GAS_URL: "https://script.google.com/macros/s/AKfycbxjP2le2-_RmDJ0vpu3Cs6x_tytbbmVVvc5TG2g-RXItBvwk_Onz7mgrpvmivlgp7MC/exec",

    // 区間ごとのゲート設定（ここを編集するだけでOK）
    TOURNAMENT_CONFIG: {
        1: { startGate: 1,  numGates: 5 },
        2: { startGate: 6,  numGates: 5 },
        3: { startGate: 11, numGates: 3 },
        4: { startGate: 14, numGates: 3 },
        5: { startGate: 17, numGates: 4 }
    }
};