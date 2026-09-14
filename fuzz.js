// 1. Mock DOM Setup
class MockElement {
  constructor(id = '', dataValue = '', textContent = '') {
    this.id = id;
    this.dataValue = dataValue;
    this.textContent = textContent;
    this.value = '0';
    this.listeners = {};
    this.attributes = { 'data-value': dataValue };
  }
  getAttribute(attr) {
    return this.attributes[attr] || null;
  }
  setAttribute(attr, val) {
    this.attributes[attr] = val;
    if (attr === 'data-value') {
      this.dataValue = val;
    }
  }
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(cb => {
        cb({ target: this });
      });
    }
  }
}

// 2. Mock Buttons
const buttons = [
  new MockElement('clear-btn', 'AC', 'AC'),
  new MockElement('', '+/-', '+/-'),
  new MockElement('', '%', '%'),
  new MockElement('', '/', '÷'),
  new MockElement('', '7', '7'),
  new MockElement('', '8', '8'),
  new MockElement('', '9', '9'),
  new MockElement('', '*', '×'),
  new MockElement('', '4', '4'),
  new MockElement('', '5', '5'),
  new MockElement('', '6', '6'),
  new MockElement('', '-', '-'),
  new MockElement('', '1', '1'),
  new MockElement('', '2', '2'),
  new MockElement('', '3', '3'),
  new MockElement('', '+', '+'),
  new MockElement('', '0', '0'),
  new MockElement('', '00', '00'),
  new MockElement('', '.', '.'),
  new MockElement('', '=', '=')
];

const display = new MockElement('display', '', '');

// 3. Mock document
global.document = {
  getElementById: (id) => {
    if (id === 'display') return display;
    if (id === 'clear-btn') return buttons[0];
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === 'button') {
      return buttons;
    }
    return [];
  }
};

// 4. script.js 読み込み
require('./script.js');

// 5. ファズテスト設定
// 通常ファズ
const TOTAL_RUNS = 10000;
const KEYS_PER_RUN = 30;
// 長時間ファズ
const LONG_RUNS = 1000;
const LONG_KEYS_PER_RUN = 300;

// 6. 使用可能なキー
const keyPool = [
  'AC',
  '+/-',
  '%',
  '/',
  '7',
  '8',
  '9',
  '*',
  '4',
  '5',
  '6',
  '-',
  '1',
  '2',
  '3',
  '+',
  '0',
  '00',
  '.',
  '='
];

// 7. 統計情報
let crashCount = 0;
let invalidDisplayCount = 0;
let nanCount = 0;
let infinityCount = 0;
let undefinedCount = 0;
let nullCount = 0;
let decimalOverflowCount = 0;
let integerOverflowCount = 0;
let invalidCharacterCount = 0;
let emptyDisplayCount = 0;
let errorCount = 0;

// 8. 表示値チェック
function checkDisplayValue(val, sequenceHistory, runNumber) {
  // null / undefined
  if (val === null) {
    console.error(
      `❌ null検出 [Run #${runNumber}]`,
      sequenceHistory.join(' -> ')
    );
    nullCount++;
    invalidDisplayCount++;
    return false;
  }
  if (val === undefined) {
    console.error(
      `❌ undefined検出 [Run #${runNumber}]`,
      sequenceHistory.join(' -> ')
    );
    undefinedCount++;
    invalidDisplayCount++;
    return false;
  }
  // 文字列化
  const str = String(val);
  // NaN
  if (str.includes('NaN')) {
    console.error(
      `❌ NaN検出 [Run #${runNumber}]`,
      `表示: "${str}"`,
      `操作: ${sequenceHistory.join(' -> ')}`
    );
    nanCount++;
    invalidDisplayCount++;
    return false;
  }
  // Infinity
  if (str.includes('Infinity')) {
    console.error(
      `❌ Infinity検出 [Run #${runNumber}]`,
      `表示: "${str}"`,
      `操作: ${sequenceHistory.join(' -> ')}`
    );
    infinityCount++;
    invalidDisplayCount++;
    return false;
  }
  // Error
  if (str === 'Error') {
    errorCount++;
    // Error自体は仕様上正常なのでNGにはしない
    return true;
  }
  // 空文字
  if (str === '') {
    console.error(
      `❌ 空文字表示 [Run #${runNumber}]`,
      `操作: ${sequenceHistory.join(' -> ')}`
    );
    emptyDisplayCount++;
    invalidDisplayCount++;
    return false;
  }
  // 不正な文字
  //
  // 正常：
  // 0
  // 123
  // -123
  // 0.
  // 0.5
  // -0.5
  const validNumberPattern = /^-?\d+\.?\d*$/;
  if (!validNumberPattern.test(str)) {
    console.error(
      `❌ 不正な表示文字 [Run #${runNumber}]`,
      `表示: "${str}"`,
      `操作: ${sequenceHistory.join(' -> ')}`
    );
    invalidCharacterCount++;
    invalidDisplayCount++;
    return false;
  }
  // 整数部分の桁数チェック
  const absoluteValue = str.replace('-', '');
  const integerPart = absoluteValue.split('.')[0];
  if (integerPart.length > 10) {
    console.error(
      `❌ 整数11桁以上 [Run #${runNumber}]`,
      `表示: "${str}"`,
      `操作: ${sequenceHistory.join(' -> ')}`
    );
    integerOverflowCount++;
    invalidDisplayCount++;
    return false;
  }
  // 小数部分の桁数チェック
  if (absoluteValue.includes('.')) {
    const decimalPart = absoluteValue.split('.')[1];
    if (decimalPart.length > 8) {
      console.error(
        `❌ 小数9桁以上 [Run #${runNumber}]`,
        `表示: "${str}"`,
        `操作: ${sequenceHistory.join(' -> ')}`
      );
      decimalOverflowCount++;
      invalidDisplayCount++;
      return false;
    }
  }
  return true;
}

// 9. ボタン取得
function getButton(key) {
  if (key === 'AC' || key === 'C') {
    return buttons[0];
  }
  return buttons.find(
    b => b.getAttribute('data-value') === key
  );
}

// 10. 通常ファズテスト
console.log('');
console.log('========================================');
console.log('💣 通常ファズテスト開始');
console.log(`シーケンス数: ${TOTAL_RUNS}`);
console.log(`1シーケンス: ${KEYS_PER_RUN} 操作`);
console.log(`総操作数: ${TOTAL_RUNS * KEYS_PER_RUN}`);
console.log('========================================');


for (let i = 0; i < TOTAL_RUNS; i++) {
  // 毎回ACで初期化
  buttons[0].click();
  const sequenceHistory = [];
  for (let j = 0; j < KEYS_PER_RUN; j++) {
    const key =
      keyPool[Math.floor(Math.random() * keyPool.length)];
    sequenceHistory.push(key);
    const btn = getButton(key);
    if (!btn) {
      console.error(
        `⚠️ ボタン取得失敗: "${key}"`
      );
      continue;
    }
    try {
      btn.click();
      const val = display.value;
      const valid =
        checkDisplayValue(
          val,
          sequenceHistory,
          i + 1
        );
      if (!valid) {
        break;
      }
    } catch (err) {
      console.error('');
      console.error(
        `💥 クラッシュ発生 [Run #${i + 1}]`
      );
      console.error(
        `操作: ${sequenceHistory.join(' -> ')}`
      );
      console.error(err);
      crashCount++;
      break;
    }
  }
}

// 11. 長時間ファズテスト
console.log('');
console.log('========================================');
console.log('🔥 長時間ファズテスト開始');
console.log(`シーケンス数: ${LONG_RUNS}`);
console.log(`1シーケンス: ${LONG_KEYS_PER_RUN} 操作`);
console.log(`総操作数: ${LONG_RUNS * LONG_KEYS_PER_RUN}`);
console.log('※ シーケンス途中でACリセットしない');
console.log('========================================');


buttons[0].click();

for (let i = 0; i < LONG_RUNS; i++) {
  const sequenceHistory = [];
  for (let j = 0; j < LONG_KEYS_PER_RUN; j++) {
    const key =
      keyPool[Math.floor(Math.random() * keyPool.length)];
    sequenceHistory.push(key);
    const btn = getButton(key);
    if (!btn) {
      continue;
    }
    try {
      btn.click();
      const val = display.value;
      const valid =
        checkDisplayValue(
          val,
          sequenceHistory,
          `LONG-${i + 1}`
        );
      if (!valid) {
        break;
      }
    } catch (err) {
      console.error('');
      console.error(
        `💥 長時間ファズでクラッシュ`
      );
      console.error(
        `Run: ${i + 1}`
      );
      console.error(
        `操作: ${sequenceHistory.join(' -> ')}`
      );
      console.error(err);
      crashCount++;
      break;
    }
  }
}

// 12. 最終結果
console.log('');
console.log('========================================');
console.log('📊 ファズテスト最終結果');
console.log('========================================');
console.log(`総試行数              : ${TOTAL_RUNS}`);
console.log(`通常ファズ操作数      : ${TOTAL_RUNS * KEYS_PER_RUN}`);
console.log(`長時間試行数          : ${LONG_RUNS}`);
console.log(`長時間ファズ操作数    : ${LONG_RUNS * LONG_KEYS_PER_RUN}`);
console.log('');
console.log(`クラッシュ            : ${crashCount}`);
console.log(`表示異常              : ${invalidDisplayCount}`);
console.log('');
console.log(`NaN                   : ${nanCount}`);
console.log(`Infinity              : ${infinityCount}`);
console.log(`undefined             : ${undefinedCount}`);
console.log(`null                  : ${nullCount}`);
console.log('');
console.log(`整数11桁以上          : ${integerOverflowCount}`);
console.log(`小数9桁以上           : ${decimalOverflowCount}`);
console.log(`不正な表示文字        : ${invalidCharacterCount}`);
console.log(`空文字                : ${emptyDisplayCount}`);
console.log('');
console.log(`Error発生回数         : ${errorCount}`);
console.log('========================================');
if (
  crashCount === 0 &&
  invalidDisplayCount === 0
) {
  console.log('');
  console.log(
    '✨ ファズテスト PASS'
  );
  console.log(
    'ランダム入力に対して異常表示・クラッシュは検出されませんでした。'
  );
} else {
  console.log('');
  console.log(
    '❌ ファズテスト FAIL'
  );
  console.log(
    '検出された異常を確認してください。'
  );
}