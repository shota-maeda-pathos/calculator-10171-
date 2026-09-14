const display = document.getElementById('display') as HTMLInputElement;
const buttons = document.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
const clearButton = document.getElementById('clear-btn') as HTMLButtonElement;

let currentInput: string = "";
let operator: string | null = null;
let previousInput: string | null = null;
let isResultDisplayed: boolean = false;
let lastOperator: string | null = null;
let lastOperand: string | null = null;
let isEqualRepeating: boolean = false;
let isPercentApplied: boolean = false;

// 表示を更新する関数
function updateDisplay() {
    display.value = currentInput || "0";
}

// 指数表記も正確にカウントする関数
function getDecimals(n: number): number {
    const s = n.toString();
    if (s.includes('e-')) {
        const parts = s.split('e-');
        const baseDecimals = parts[0].includes('.') ? parts[0].split('.')[1].length : 0;
        return baseDecimals + parseInt(parts[1], 10);
    }
    return s.includes('.') ? s.split('.')[1].length : 0;
}

// toPrecision() が指数表記 ("1.23e-8" 等) を返した場合に、素の小数文字列へ変換する
function expandExponential(str: string): string {
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

// 計算結果の処理
function formatResult(num: number): string {
    if (isNaN(num) || !isFinite(num)) {
        return "Error";
    }
    const absVal = Math.abs(num);
    if (absVal >= 10000000000) {
        return "Error";
    }
    if (absVal === 0 || absVal < 0.000000005) {
        return "0";
    }
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

// 表示をクリアする関数
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

// 現在の入力だけをクリアする関数
function clearEntry() {
    currentInput = "0";
    isEqualRepeating = false;
    isPercentApplied = false;
    updateDisplay();
    clearButton.textContent = "AC";
    clearButton.setAttribute('data-value', 'AC');
}

// 数字を入力する関数
function appendNumber(value: string) {
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
    // 数字のみの桁数を判定（マイナスとドットを除外）
    const rawDigits = currentInput.replace('-', '').replace('.', '');
    // 全体10桁制限
    if (rawDigits.length + value.length > 10) {
        return;
    }
    // 小数第8位制限
    if (currentInput.includes('.')) {
        const parts = currentInput.split('.');
        if (parts[1] && parts[1].length + value.length > 8) {
            return;
        }
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

// 演算子を設定する関数
function setOperator(value: string) {
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

// 計算を実行する関数
function calculateResult() {
    let str1: string;
    let str2: string;
    let activeOperator: string;
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
    let result: number = 0;
    // 小数点以下の長さを取得
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
    // 10桁オーバーでエラー
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

// +/-ボタンを実行する関数
function toggleSign() {
    if (!currentInput || currentInput === "0" || currentInput === "Error") return;
    currentInput = currentInput.startsWith('-') ? currentInput.slice(1) : `-${currentInput}`;
    updateDisplay();
    isEqualRepeating = false
    isPercentApplied = false;
}

// %ボタンを実行する関数
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

// ボタンをクリックしたときの処理
buttons.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.getAttribute('data-value');
        if (!value) return;
        if (currentInput === "Error"){
            if (value === 'AC' || value === 'C') {
                clearDisplay();
            }
            return;
        }
        if (value === 'AC') {
            clearDisplay();
        } 
        else if (value === 'C') {
            clearEntry();
        }
        else if (value === '+/-') {
            toggleSign();
        } 
        else if (value === '%') {
            applyPercentage();
        }
        else if (value === '=') {
            calculateResult();
        }
        else if (['+', '-', '/', '*'].includes(value)) {
            setOperator(value);
        }
        else {
            appendNumber(value);
        }
    });
});