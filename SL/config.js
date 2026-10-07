// 全システム共通の設定_SL用
const APP_CONFIG = {
    // GAS_URL: "https://script.google.com/macros/s/AKfycbx3zNaU-DZSc18lndI5InCtzYFqyrx19HR-LWYdh0VKFKlBfI9Tr2plw6Niro-l83zUDA/exec",
    GAS_URL: "https://script.google.com/macros/s/AKfycbwvd3nQaffqNJDGz8BskMwMpktkk2i4su0bgwn49XD8kr8Seyz77FG5wXKlMVqnXlA/exec",

    // 区間ごとのゲート設定（ここを編集するだけでOK）
    TOURNAMENT_CONFIG: {
        1: { startGate: 1,  numGates: 3 },
        2: { startGate: 4,  numGates: 3 },
        3: { startGate: 7,  numGates: 3 },
        4: { startGate: 10, numGates: 4 },
        5: { startGate: 14, numGates: 3 }
    }
};