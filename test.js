// 1. Mock DOM & Document Setup
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
    if (attr === 'data-value') this.dataValue = val;
  }
  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(cb => cb({ target: this }));
    }
  }
}

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

global.document = {
  getElementById: (id) => {
    if (id === 'display') return display;
    if (id === 'clear-btn') return buttons[0];
    return null;
  },
  querySelectorAll: (selector) => {
    if (selector === 'button') return buttons;
    return [];
  },
  querySelector: (selector) => {
    const match = selector.match(/data-value="([^"]+)"/);
    if (match) {
      const val = match[1];
      return buttons.find(b => b.getAttribute('data-value') === val) || null;
    }
    if (selector === '#clear-btn') return buttons[0];
    return null;
  }
};

global.HTMLInputElement = MockElement;
global.HTMLButtonElement = MockElement;

// 2. script.ts ロジック
let currentInput = "";
let operator = null;
let previousInput = null;
let isResultDisplayed = false;
let lastOperator = null;
let lastOperand = null;
let isEqualRepeating = false;
let isPercentApplied = false;
const clearButton = buttons[0];

function updateDisplay() {
  display.value = currentInput || "0";
}

function getDecimals(n) {
  const s = n.toString();
  if (s.includes('e-')) {
    const parts = s.split('e-');
    const baseDecimals = parts[0].includes('.') ? parts[0].split('.')[1].length : 0;
    return baseDecimals + parseInt(parts[1], 10);
  }
  return s.includes('.') ? s.split('.')[1].length : 0;
}

function expandExponential(str) {
  const m = str.match(/^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/i);
  if (!m) return str;
  const sign = m[1];
  const intPart = m[2];
  const decPart = m[3] || '';
  const exp = parseInt(m[4], 10);
  let digits = intPart + decPart;
  let pointPos = intPart.length + exp;
  if (pointPos <= 0) {
    digits = '0'.repeat(-pointPos) + digits;
    pointPos = 0;
  }
  while (pointPos > digits.length) {
    digits += '0';
  }
  const result = pointPos === 0
    ? '0.' + digits
    : digits.slice(0, pointPos) + (pointPos < digits.length ? '.' + digits.slice(pointPos) : '');
  return sign + result;
}

function formatResult(num) {
  if (isNaN(num) || !isFinite(num)) return "Error";
  const absVal = Math.abs(num);
  if (absVal >= 10000000000) return "Error";
  if (absVal === 0 || absVal < 0.000000005) return "0";
  const intLength = absVal < 1 ? 0 : Math.trunc(absVal).toString().length;
  const maxAllowedDecimals = Math.max(0, 10 - (absVal < 1 ? 1 : intLength));
  const decimalDigits = Math.min(8, maxAllowedDecimals);
  let precStr = num.toPrecision(12);
  if (/e/i.test(precStr)) {
    precStr = expandExponential(precStr);
  }
  const sign = precStr.startsWith('-') ? '-' : '';
  if (sign) precStr = precStr.slice(1);
  const [intPart, decPart = ''] = precStr.split('.');
  const truncatedDec = decPart.substring(0, decimalDigits);
  let str = truncatedDec.length > 0 ? `${intPart}.${truncatedDec}` : intPart;
  if (str.includes('.')) {
    str = str.replace(/0+$/, '').replace(/\.$/, '');
  }
  str = sign + str;
  return (str === "-0" || Number(str) === 0) ? "0" : str;
}

function clearDisplay() {
  currentInput = "";
  operator = null;
  previousInput = null;
  isResultDisplayed = false;
  lastOperator = null;
  lastOperand = null;
  isEqualRepeating = false;
  isPercentApplied = false;
  clearButton.textContent = "AC";
  clearButton.setAttribute('data-value', 'AC');
  updateDisplay();
}

function clearEntry() {
  currentInput = "0";
  isEqualRepeating = false;
  isPercentApplied = false;
  updateDisplay();
  clearButton.textContent = "AC";
  clearButton.setAttribute('data-value', 'AC');
}

function appendNumber(value) {
  isEqualRepeating = false;
  isPercentApplied = false;
  if (isResultDisplayed) {
    currentInput = "";
    isResultDisplayed = false;
  }
  if (value === '.' && currentInput.includes('.')) return;
  if (currentInput === "" && value === '.') {
    currentInput = "0.";
    clearButton.textContent = "C";
    clearButton.setAttribute('data-value', 'C');
    updateDisplay();
    return;
  }
  const rawDigits = currentInput.replace('-', '').replace('.', '');
  if (rawDigits.length + value.length > 10) return;
  if (currentInput.includes('.')) {
    const parts = currentInput.split('.');
    if (parts[1] && parts[1].length + value.length > 8) return;
  }
  if ((currentInput === "" || currentInput === "0") && value === "00") {
    currentInput = "0";
    updateDisplay();
    return;
  }
  if (currentInput === "0" && value !== ".") {
    currentInput = value;
  } else {
    currentInput += value;
  }
  updateDisplay();
  if (currentInput !== "0" && currentInput !== "") {
    clearButton.textContent = "C";
    clearButton.setAttribute('data-value', 'C');
  }
}

function setOperator(value) {
  isEqualRepeating = false;
  if (currentInput === ""){
    if (previousInput !== null){
      operator = value;
    } else {
      previousInput = "0";
      operator = value;
    }
    return;
  }
  if (operator && previousInput) {
    calculateResult();
    if (currentInput === "Error") return;
  }
  previousInput = currentInput;
  operator = value;
  currentInput = "";
  isResultDisplayed = false;
  isEqualRepeating = false;
}

function calculateResult() {
  let str1, str2, activeOperator;
  if (isEqualRepeating && lastOperator && lastOperand) {
    str1 = currentInput;
    str2 = lastOperand;
    activeOperator = lastOperator;
  } else {
    if (!previousInput || !operator){
      isResultDisplayed = true;
      return;
    }
    if (currentInput === "") {
      currentInput = previousInput;
    }
    str1 = previousInput;
    str2 = currentInput;
    activeOperator = operator;
    lastOperator = operator;
    lastOperand = currentInput;
    isEqualRepeating = true;
  }
  let num1 = parseFloat(str1);
  let num2 = parseFloat(str2);
  let result = 0;
  const dec1 = getDecimals(num1);
  const dec2 = getDecimals(num2);
  const maxDec = Math.max(dec1, dec2);
  const factor = Math.pow(10, maxDec); 
  const int1 = Math.round(num1 * factor);
  const int2 = Math.round(num2 * factor);
  const f1 = Math.pow(10, dec1);
  const f2 = Math.pow(10, dec2);
  const scale1 = Math.round(num1 * f1);
  const scale2 = Math.round(num2 * f2);
  switch (activeOperator) {
    case '+':
      if (Math.abs(int1) < Number.MAX_SAFE_INTEGER && Math.abs(int2) < Number.MAX_SAFE_INTEGER) {
        result = (int1 + int2) / factor;
      } else {
        result = num1 + num2;
      }
      break;
    case '-':
      if (Math.abs(int1) < Number.MAX_SAFE_INTEGER && Math.abs(int2) < Number.MAX_SAFE_INTEGER) {
        result = (int1 - int2) / factor;
      } else {
        result = num1 - num2;
      }
      break;
    case '*':
      if (Math.abs(scale1 * scale2) < Number.MAX_SAFE_INTEGER) {
        result = (scale1 * scale2) / (f1 * f2);
      } else {
        result = num1 * num2;
      }
      break;
    case '/':
      if (num2 === 0) {
        currentInput = "Error";
        clearButton.textContent = "AC";
        clearButton.setAttribute('data-value', 'AC');
        updateDisplay();
        return;
      } else {
        if (Math.abs(int1) < Number.MAX_SAFE_INTEGER && Math.abs(int2) < Number.MAX_SAFE_INTEGER && int2 !== 0) {
          result = int1 / int2;
        } else {
          result = num1 / num2;
        }
      }
      break;
  }

  if (Math.abs(result) >= 10000000000) {
    currentInput = "Error";
    clearButton.textContent = "AC";
    clearButton.setAttribute('data-value', 'AC');
  } else {
    currentInput = formatResult(result);
  }
  operator = null;
  previousInput = null;
  isResultDisplayed = true;
  isPercentApplied = false;
  clearButton.textContent = "AC";
  clearButton.setAttribute('data-value', 'AC');
  updateDisplay();
}

function toggleSign() {
  if (!currentInput || currentInput === "0" || currentInput === "Error") return;
  currentInput = currentInput.startsWith('-') ? currentInput.slice(1) : `-${currentInput}`;
  updateDisplay();
  isEqualRepeating = false;
  isPercentApplied = false;
}

function applyPercentage() {
  if (!currentInput || currentInput === "0" || currentInput === "Error") return;
  if (isPercentApplied) return;

  let num = parseFloat(currentInput);
  let percentValue = 0;
  if(previousInput !==null && operator !== null){
    if (operator === '+' || operator === '-') {
      percentValue = parseFloat(previousInput) * (num / 100);
    } else {
      percentValue = num / 100;
    }
  } else {
    percentValue = num / 100;
  }
  currentInput = formatResult(percentValue);
  updateDisplay();
  isResultDisplayed = true;
  isEqualRepeating = false;
  lastOperator = null;
  lastOperand = null;
  isPercentApplied = true;
}

// イベントリスナー接続
buttons.forEach(button => {
  button.addEventListener('click', () => {
    const value = button.getAttribute('data-value');
    if (!value) return;
    if (currentInput === "Error"){
      if (value === 'AC' || value === 'C') clearDisplay();
      return;
    }
    if (value === 'AC') clearDisplay();
    else if (value === 'C') clearEntry();
    else if (value === '+/-') toggleSign();
    else if (value === '%') applyPercentage();
    else if (value === '=') calculateResult();
    else if (['+', '-', '/', '*'].includes(value)) setOperator(value);
    else appendNumber(value);
  });
});

// 3. Test Runner & Assertion Helper
function press(...keys) {
  for (const key of keys) {
    let btn;
    if (key === 'AC' || key === 'C') {
      btn = buttons[0];
    } else {
      btn = buttons.find(b => b.getAttribute('data-value') === key);
    }
    if (btn) btn.click();
  }
}
function reset() {
  clearDisplay();
}
let passed = 0;
let failed = 0;
function assert(title, expected) {
  if (display.value === expected) {
    console.log(`✅ PASS: ${title} (結果: ${display.value})`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${title} (期待値: "${expected}", 実際: "${display.value}")`);
    failed++;
  }
}

console.log("🚀 電卓アプリ 全テストケース実行開始...\n");

reset(); press('1', '+', '2', '='); assert('001. 基本加算 (1+2)', '3');
reset(); press('5', '-', '2', '='); assert('002. 基本減算 (5-2)', '3');
reset(); press('3', '*', '4', '='); assert('003. 基本乗算 (3*4)', '12');
reset(); press('8', '/', '2', '='); assert('004. 基本除算 (8/2)', '4');
reset(); press('0', '+', '0', '='); assert('005. ゼロ加算', '0');
reset(); press('0', '-', '5', '='); assert('006. ゼロ減算', '-5');
reset(); press('1', '0', '/', '2', '='); assert('007. 整数除算', '5');
reset(); press('2', '*', '0', '='); assert('008. ゼロ乗算', '0');
reset(); press('0', '/', '2', '='); assert('009. ゼロ除算分子', '0');
reset(); press('1', '2', '3', '+', '4', '5', '6', '='); assert('010. 複数桁加算', '579');
reset(); press('1', '0', '-', '2', '5', '='); assert('011. 負の結果減算', '-15');
reset(); press('1', '2', '*', '1', '2', '='); assert('012. 複数桁乗算', '144');
reset(); press('2', '5', '0', '/', '4', '='); assert('013. 小数結果除算', '62.5');
reset(); press('1', '+', '2', '+', '3', '='); assert('014. 連続加算', '6');
reset(); press('1', '0', '-', '3', '-', '2', '='); assert('015. 連続減算', '5');
reset(); press('2', '*', '3', '*', '4', '='); assert('016. 連続乗算', '24');
reset(); press('1', '0', '0', '/', '2', '/', '5', '='); assert('017. 連続除算', '10');
reset(); press('1', '0', '+', '2', '0', '-', '5', '='); assert('018. 加減混合', '25');
reset(); press('5', '+', '5', '-'); assert('019. 演算子押下時小計表示', '10');
reset(); press('5', '+', '-', '2', '='); assert('020. 演算子切り替え (+から-)', '3');
reset(); press('5', '+', '*', '3', '='); assert('021. 演算子切り替え (+から*)', '15');
reset(); press('5', '+', '-', '*', '/', '2', '='); assert('022. 複数演算子切り替え', '2.5');
reset(); press('1', '0', '*', '2', '/', '4', '='); assert('023. 乗除混合', '5');
reset(); press('.'); assert('024. 単独ドット入力', '0.');
reset(); press('.', '5'); assert('025. 先頭ドット入力', '0.5');
reset(); press('1', '.', '2', '.', '3'); assert('026. 複数ドット無視', '1.23');
reset(); press('0', '.', '1', '+', '0', '.', '2', '='); assert('027. 浮動小数点誤差 (0.1+0.2)', '0.3');
reset(); press('0', '.', '1', '+', '0', '.', '7', '='); assert('028. 浮動小数点誤差 (0.1+0.7)', '0.8');
reset(); press('0', '.', '3', '-', '0', '.', '1', '='); assert('029. 浮動小数点誤差 (0.3-0.1)', '0.2');
reset(); press('0', '.', '1', '*', '3', '='); assert('030. 浮動小数点誤差 (0.1*3)', '0.3');
reset(); press('1', '/', '3', '='); assert('031. 割り切れない除算丸め', '0.33333333');
reset(); press('2', '/', '3', '='); assert('032. 四捨五入ではなく切り捨て等による丸め検証', '0.66666666');
reset(); press('1', '0', '/', '7', '='); assert('033. 循環小数丸め', '1.42857142');
reset(); press('5', '+', '.', '5', '='); assert('034. 演算子直後ドット補完', '5.5');
reset(); press('0', '.', '3', '3', '3', '0', '0', '0', '+', '0', '='); assert('035. 末尾ゼロ削除', '0.333');
reset(); press('0', '.', '0', '0', '0', '5'); assert('036. 0.000後の数字入力', '0.0005');
reset(); press('5', '.', '+', '2', '='); assert('037. ドット直後の演算子', '7');
reset(); press('5', '-', '5', '=', '.'); assert('038. 結果0からのドット入力', '0.');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1'); assert('039. 整数10桁制限', '1234567890');
reset(); press('0', '.', '1', '2', '3', '4', '5', '6', '7', '8', '9'); assert('040. 小数8位制限', '0.12345678');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'); assert('041. 10桁後ドットブロック', '1234567890');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '+', '1', '='); assert('042. 10億の限界値', '1000000000');
reset(); press('1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '-', '1', '='); assert('043. 10億からの減算', '999999999');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '*', '2', '='); assert('044. 10桁オーバーフロー計算', 'Error');
reset(); press('0', '.', '0', '0', '0', '0', '1', '*', '0', '.', '0', '0', '0', '0', '1', '='); assert('045. 指数表記防止とアンダーフロー', '0');
reset(); press('5', '+/-'); assert('046. 正数符号反転', '-5');
reset(); press('5', '+/-', '+/-'); assert('047. 符号反転解除', '5');
reset(); press('0', '+/-'); assert('048. ゼロ符号反転', '0');
reset(); press('5', '*', '2', '+/-', '='); assert('049. 数字入力後符号反転 (5 * -2)', '-10');
reset(); press('5', '0', '%'); assert('050. 単独パーセント', '0.5');
reset(); press('1', '0', '0', '0', '+', '1', '0', '%', '='); assert('051. 加算パーセント (1000 + 10%)', '1100');
reset(); press('5', '0', '0', '0', '-', '2', '0', '%', '='); assert('052. 減算パーセント', '4000');
reset(); press('1', '0', '0', '*', '1', '0', '%', '='); assert('053. 乗算パーセント', '10');
reset(); press('1', '0', '0', '/', '1', '0', '%', '='); assert('054. 除算パーセント', '1000');
reset(); press('5', '0', '%', '%'); assert('055. パーセント連打（2回目は無視されるか）', '0.5');
reset(); press('5', '+', '5', '=', '%'); assert('056. 計算結果に対するパーセント', '0.1');
reset(); press('5', '+', '3', '=', '+/-'); assert('057. 計算結果に対する符号反転', '-8');
reset(); press('1', '2', '3', 'AC'); assert('058. AC全クリア', '0');
reset(); press('1', '2', '3', 'AC', '5', '='); assert('059. C後数字打ち直し', '5');
reset(); press('1', '0', '+', '2', '0', 'AC', '5', '='); assert('060. 演算途中C後再計算', '15');
reset(); press('1', '+', '2', '=', 'AC'); assert('061. 結果表示後クリア', '0');
reset(); press('5', '/', '0', '=', 'AC'); assert('062. Error後クリア復帰', '0');
reset(); press('1', '2', '3', 'AC', 'AC'); assert('063. C/ACの連打クリア', '0');
reset(); press('5', '+', 'AC', '3', '='); assert('064. 演算子直後のC押下', '8');
reset(); press('2', '+', '3', '='); assert('065. イコール計算', '5');
press('='); assert('066. 反復計算 1回目 (+3)', '8');
press('='); assert('067. 反復計算 2回目 (+3)', '11');
reset(); press('1', '0', '-', '2', '=', '='); assert('068. 反復減算 (-2)', '6');
reset(); press('5', '*', '2', '=', '='); assert('069. 反復乗算 (*2)', '20');
reset(); press('1', '+', '2', '=', '5'); assert('070. 結果後数字入力(新規)', '5');
reset(); press('1', '+', '2', '=', '+', '5', '='); assert('071. 結果後演算子(継続)', '8');
reset(); press('5', '='); assert('072. 単独数字のイコール押下', '5');
reset(); press('5', '+', '='); assert('073. 演算子直後のイコール押下', '10');
reset(); press('0', '0', '0'); assert('074. ゼロ連打', '0');
reset(); press('00'); assert('075. 初期状態00', '0');
reset(); press('0', '00'); assert('076. 0後00', '0');
reset(); press('1', '00'); assert('077. 数字後00', '100');
reset(); press('0', '1'); assert('078. 先頭0置換', '1');
reset(); press('00', '1'); assert('079. 先頭00置換', '1');
reset(); press('5', '+', '00'); assert('080. 演算子直後00', '0');
reset(); press('1', '00', '00'); assert('081. 00連打', '10000');
reset(); press('5', '/', '0', '='); assert('082. ゼロ除算エラー', 'Error');
reset(); press('0', '/', '0', '='); assert('083. 0/0エラー', 'Error');
reset(); press('5', '/', '0', '=', '1'); assert('084. Error時数字ブロック', 'Error');
reset(); press('5', '/', '0', '=', '+'); assert('085. Error時演算子ブロック', 'Error');
reset(); press('5', '/', '0', '=', '+/-'); assert('086. Error時符号反転ブロック', 'Error');
reset(); press('5', '/', '0', '=', '%'); assert('087. Error時パーセントブロック', 'Error');
reset(); press('1', '2', '3', '4', '5'); assert('088. 5桁表示', '12345');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '0'); assert('089. 10桁限界表示', '1234567890');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1'); assert('090. 11桁目入力ブロック', '1234567890');
reset(); press('1', '+/-'); assert('091. 負の1桁表示', '-1');
reset(); press('1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '+/-'); assert('092. 負の10桁限界表示', '-1000000000');
reset(); press('0', '.', '1', '2', '3', '4', '5', '6', '7', '8'); assert('093. 小数第8位限界表示', '0.12345678');
reset(); press('0', '.', '1', '2', '3', '4', '5', '6', '7', '8', '9'); assert('094. 小数第9位目入力ブロック', '0.12345678');
reset(); press('1', '2', '3', '.', '1', '2', '3', '4', '5', '6', '7'); assert('095. 複合桁 3桁.7桁 (全体10桁)', '123.1234567');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '1'); assert('096. 複合桁 9桁.1桁 (全体10桁)', '123456789.1');
reset(); press('0', '.', '5', '*', '2', '='); assert('097. 整数化時の.0消去', '1');
reset(); press('0', '.', '2', '5', '*', '2', '='); assert('098. 小数第2位末尾ゼロ消去', '0.5');
reset(); press('1', '.', '2', '5', '-', '0', '.', '2', '5', '='); assert('099. 減算ジャスト整数化', '1');
reset(); press('0', '.', '5', '0', '+/-'); assert('100. 小数符号反転ゼロ消去', '-0.50');
reset(); press('1', '%'); assert('101. 1%のゼロ消去', '0.01');
reset(); press('1', '0', '/', '4', '*', '2', '='); assert('102. 連続演算整数化', '5');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '+', '1', '='); assert('103. [限界] 100億突破 (Error)', 'Error');
reset(); press('0', '-', '9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '-', '1', '='); assert('104. [限界] 負の100億突破 (Error)', 'Error');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '+', '0', '.', '5', '='); assert('105. [境界] 10桁限界＋0.5 (四捨五入回避で9999999999)', '9999999999');
press('='); assert('106. [境界] 10桁限界＋0.5を2回 (ここは9999999999のままか)', '9999999999');
reset(); press('1', '0', '0', '0', '0', '0', '0', '0', '0', '.', '1', '-', '1', '0', '0', '0', '0', '0', '0', '0', '0', '='); assert('107. [精度] 1億.1 - 1億 (0.1になるか)', '0.1');
reset(); press('1', '/', '3', '*', '3', '='); assert('108. [精度] 1÷3×3 (実機仕様の0.99999999)', '0.99999999');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '*', '0', '.', '1', '='); assert('109. [精度] 巨大数と小数の乗算 (99999999.9)', '99999999.9');
reset(); press('0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '*', '0', '.', '1', '='); assert('110. [アンダーフロー] 極小値の乗算 (0に丸められるか)', '0');
reset(); press('1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '/', '0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '='); assert('111. [オーバーフロー] 極大数÷極小数 (Error)', 'Error');
reset(); press('1', '0', '0', '/', '3', '='); assert('112. [UI限界] 100÷3 (10桁枠での丸め)', '33.33333333');
reset(); press('1', '0', '0', '0', '/', '3', '='); assert('113. [UI限界] 1000÷3 (10桁枠での丸め)', '333.3333333');
reset(); press('1', '0', '0', '0', '0', '/', '3', '='); assert('114. [UI限界] 10000÷3 (10桁枠での丸め)', '3333.333333');
reset(); press('1', '0', '0', '0', '0', '0', '/', '3', '='); assert('115. [UI限界] 100000÷3 (10桁枠での丸め)', '33333.33333');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '.', '9', '+', '0', '.', '1', '='); assert('116. [境界繰り上がり] 999999999.9 + 0.1', '1000000000');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '%'); assert('117. [境界] 10桁の%処理', '12345678.9');
reset(); press('0', '.', '3', '/', '0', '.', '1', '='); assert('118. [2進法・浮動小数点] 0.3 / 0.1 (3になるか)', '3');
reset(); press('0', '.', '0', '7', '*', '1', '0', '0', '='); assert('119. [2進法・浮動小数点] 0.07 * 100 (7になるか)', '7');
reset(); press('9', '9', '.', '9', '9', '9', '9', '9', '9', '9', '9', '*', '9', '9', '.', '9', '9', '9', '9', '9', '9', '9', '9', '='); assert('120. [桁数・精度限界] 99.99999999 の2乗', '9999.999998');
reset(); press('1', '.', '0', '0', '5', '*', '1', '0', '0', '='); assert('121. [2進法・浮動小数点] 1.005 * 100 (100.5になるか)', '100.5');
reset(); press('5', '/', '9', '='); assert('122. [UI丸め] 5 / 9 (四捨五入されずに切り捨てられるか)', '0.55555555');
reset(); press('1', '2', '3', '4', '5', '6', '7', '.', '8', '8', '+/-', '-', '0', '.', '0', '1', '='); assert('123. [表示限界] 負の数と小数の複合 (文字数ではなく数字カウントか)', '-1234567.89');
reset(); press('5', '+', '-', '*', '3', '='); assert('124. 演算子連打で最後の演算子が有効になるか', '15');
reset(); press('='); assert('125. 何も入力せずイコール押下', '0');
reset(); press('%', '%', '%'); assert('126. 演算子未選択でパーセント連打', '0');
reset(); press('AC', '='); assert('127. AC直後にイコール', '0');
reset(); press('.', '+', '3', '='); assert('128. 小数点のみ入力後に演算子', '3');
reset(); press('5', '+', '+/-', '3', '='); assert('129. 演算子直後の符号反転は無視されるか', '8');
reset(); press('5', '.', '+/-'); assert('130. 小数点直後の符号反転表示', '-5.');
reset(); press('2', '+', '3', '=', '+', '-', '*', '4', '='); assert('131. 結果表示後の演算子連打切り替え', '20');
reset(); press('5', '+', 'AC', '3', '+', '2', '='); assert('132. 演算子入力後のC(部分クリア)は保留中の計算を消さない', '10');
reset(); press('3', '+/-', '*', '4', '+/-', '='); assert('133. 負×負で正になるか', '12');
reset(); press('3', '+/-', '*', '4', '='); assert('134. 負×正で負になるか', '-12');
reset(); press('0', '.', '0', '0', '0', '0', '0', '0', '0', '0', '1', '+/-', '*', '1', '='); assert('135. 極小の負数がアンダーフローで0になるか(-0にならないか)', '0');
reset(); press('1', '/', '8', '='); assert('136. ちょうど割り切れる小数 (1/8)', '0.125');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '/', '3', '='); assert('137. 9桁整数の割り算', '41152263');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '/', '7', '='); assert('138. 9桁の循環小数(表示枠1桁制限)', '142857142.7');
reset(); press('0', '.', '0', '0', '0', '0', '0', '0', '0', '0', '5'); assert('139. 境界値の生入力表示(計算前)', '0.00000000');
reset(); press('0', '.', '0', '0', '0', '0', '0', '0', '0', '0', '5', '*', '1', '='); assert('140. 境界値ちょうど(0.000000005)の乗算は0になるか', '0');
reset(); press('0', '.', '0', '0', '0', '0', '0', '0', '0', '0', '6', '*', '1', '='); assert('141. 閾値超えでも表示8桁制限で0になる境界ケース', '0');
reset(); press('+', '+', '+', '+'); assert('142. 演算子だけを数字なしで連打してもクラッシュしないか', '0');
reset(); press('.', '.', '.', '.'); assert('143. 小数点だけ連打してもクラッシュしないか', '0.');
reset(); press('1', '.', '0', '0'); assert('144. 小数点の後にゼロを続けて入力', '1.00');
reset(); press('1', '0', '0', '0', '0', '0', '0', '0', '-', '0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '='); assert('145. 大小差がある連続減算での桁落ち', '10000000');
reset(); press('1', '0', '0', '0', '0', '0', '0', '.', '0', '1', '-', '1', '0', '0', '0', '0', '0', '0', '='); assert('146. 近似値の引き算（桁落ち後の精度）', '0.01');
reset(); press('1', '-', '0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '='); assert('147. 微小値の累積と桁落ち', '0.99999999');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', '.', '0', '0', '0', '0', '0', '0', '0', '0', '1', '='); assert('148. 表示限界以下の微小値の加算', '123456789');
reset(); press('0', '.', '1', '*', '0', '.', '1', '='); assert('149. 0.1の連続乗算', '0.01');
reset(); press('0', '.', '2', '+', '0', '.', '4', '='); assert('150. 0.2 + 0.4', '0.6');
reset(); press('1', '-', '0', '.', '9', '='); assert('151. 1 - 0.9', '0.1');
reset(); press('0', '.', '0', '0', '0', '1', '*', '0', '.', '0', '0', '0', '1', '='); assert('152. 0.0001 * 0.0001', '0.00000001');
reset(); press('0', '.', '0', '0', '0', '1', '*', '0', '.', '0', '0', '0', '0', '1', '='); assert('153. 0.0001 * 0.00001 (アンダーフロー)', '0');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '+', '1', '='); assert('154. 9桁最大値+1', '1000000000');
reset(); press('1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '-', '1', '='); assert('155. 10桁最小側境界', '999999999');
reset(); press('1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '+', '0', '.', '0', '1', '='); assert('156. 10桁整数+最小小数', '1000000000');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '.', '9', '9', '+', '0', '.', '0', '1', '='); assert('157. 小数繰り上がり境界', '100000000');
reset(); press('0', '.', '9', '9', '9', '9', '9', '9', '9', '9', '+', '0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '='); assert('158. 小数8桁境界加算', '1');
reset(); press('0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '/', '1', '='); assert('159. 最小表示値の除算', '0.00000001');
reset(); press('0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '/', '0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '='); assert('160. 最小値÷最小値', '1');
reset(); press('0', '.', '1', '+', '0', '.', '2', '-', '0', '.', '3', '='); assert('161. 浮動小数点誤差の累積', '0');
reset(); press('0', '.', '1', '*', '0', '.', '2', '*', '0', '.', '3', '='); assert('162. 小数連続乗算', '0.006');
reset(); press('9', '.', '9', '9', '9', '9', '9', '9', '9', '9', '+', '0', '.', '0', '0', '0', '0', '0', '0', '0', '1', '='); assert('163. 小数繰り上がり', '10');
reset(); press('5', '+', '5', '=', '=', '='); assert('164. 加算イコール連打', '20');
reset(); press('1', '0', '-', '2', '=', '=', '='); assert('165. 減算イコール連打', '4');
reset(); press('2', '*', '2', '=', '=', '='); assert('166. 乗算イコール連打', '16');
reset(); press('1', '0', '/', '2', '=', '=', '='); assert('167. 除算イコール連打', '1.25');
reset(); press('5', '%', '+', '5', '='); assert('168. %後の加算', '5.05');
reset(); press('5', '%', '*', '2', '='); assert('169. %後の乗算', '0.1');
reset(); press('5', '+', '5', '%', '='); assert('170. 加算%後の計算', '5.25');
reset(); press('5', '+/-', '%'); assert('171. 負数のパーセント', '-0.05');
reset(); press('5', '.', '5', '+/-', '+/-'); assert('172. 小数符号反転往復', '5.5');
reset(); press('5', '/', '0', '='); assert('173. Error後の再入力確認', 'Error');
press('AC', '5', '+', '5', '='); assert('174. Error後AC復帰', '10');
reset(); press('0','.','1','2','3','4','5','6','7','00'); assert('175. 小数7桁+00はブロック', '0.1234567');
reset(); press('1','2','3','4','5','6','7','8','9','00'); assert('176. 整数9桁+00はブロック', '123456789');
reset(); press('0', '%'); assert('177. 0に対する%は無視されるか', '0');
reset(); press('1', '0', '+', '5', 'C', '3', '='); assert('178. 2つ目の数値をCで訂正', '13');
reset(); press('1', '0', '+', '5', 'C', '='); assert('179. Cで消した直後のイコール (10+0=10になるか)', '10');
reset(); press('5', '+', 'C', '3', '='); assert('180. 演算子直後のC押下は演算子を取り消さないか', '8');
reset(); press('5', '.', '+', '3', '='); assert('181. ドット末尾での演算子 (8になるか)', '8');
reset(); press('0', '.', '+/-'); assert('182. 0.の状態で符号反転 (-0. または -0 になるか)', '-0.');
reset(); press('9', '9', '9', '9', '9', '9', '9', '9', '9', '9', '*', '2'); press('/'); assert('183. 演算子押下時の中間計算でオーバーフロー', 'Error');
reset(); press('5', '+', '%'); assert('184. 演算子直後の% (一般的には無視されるか5+0になる)', '5');
reset(); press('2', '+', '3', '=', '=', '%'); assert('185. リピート計算後の結果に対する%', '0.08');
reset(); press('1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+/-', '1'); assert('186. マイナスがついて11文字になっても10桁制限が正しく働き1はブロックされるか', '-1234567890');

console.log(`\n================================`);
console.log(`🎉 テスト結果: 成功 ${passed} 件 / 失敗 ${failed} 件`);
console.log(`================================`);