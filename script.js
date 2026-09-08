"use strict";
const display = document.getElementById('display');
const buttons = document.querySelectorAll('button');
const clearButton = document.getElementById('clear-btn');
let currentInput = "";
let operator = null;
let previousInput = null;
let isResultDisplayed = false;
let lastOperator = null;
let lastOperand = null;
let isEqualRepeating = false;
//表示を更新する関数
function updateDisplay() {
    display.value = currentInput || "0";
}
//表示をクリアする関数
function clearDisplay() {
    currentInput = "";
    operator = null;
    previousInput = null;
    isResultDisplayed = false;
    lastOperator = null;
    lastOperand = null;
    isEqualRepeating = false;
    clearButton.textContent = "AC";
    clearButton.setAttribute('data-value', 'AC');
    updateDisplay();
}
//現在の入力だけをクリアする関数
function clearEntry() {
    currentInput = "0";
    isEqualRepeating = false;
    updateDisplay();
    clearButton.textContent = "AC";
    clearButton.setAttribute('data-value', 'AC');
}
//数字を入力する関数
function appendNumber(value) {
    isEqualRepeating = false;
    if (isResultDisplayed) {
        currentInput = "";
        isResultDisplayed = false;
    }
    if (value === '.' && currentInput.includes('.'))
        return;
    //何もないときに.を入れた場合は0.を追加する
    if (currentInput === "" && value === '.') {
        currentInput = "0.";
        clearButton.textContent = "C";
        clearButton.setAttribute('data-value', 'C');
        updateDisplay();
        return;
    }
    // 全体の桁数制限
    if (currentInput.replace('-', '').replace('.', '').length + value.length > 10) {
        return;
    }
    // 小数第8位までの制限
    if (currentInput.includes('.')) {
        const fractionalPart = currentInput.split('.')[1] ?? "";
        if (fractionalPart.length + value.length > 8) {
            return;
        }
    }
    //00を入れた場合は0のまま
    if ((currentInput === "" || currentInput === "0") && value === "00") {
        currentInput = "0";
        updateDisplay();
        return;
    }
    //0を入れた場合は0のまま
    if (currentInput === "0" && value !== ".") {
        currentInput = value;
    }
    else {
        currentInput += value;
    }
    updateDisplay();
    if (currentInput !== "0" && currentInput !== "") {
        clearButton.textContent = "C";
        clearButton.setAttribute('data-value', 'C');
    }
}
//演算子を設定する関数
function setOperator(value) {
    isEqualRepeating = false;
    if (currentInput === "") {
        if (previousInput !== null) {
            operator = value;
        }
        else {
            previousInput = "0";
            operator = value;
        }
        return;
    }
    if (operator && previousInput) {
        calculateResult();
    }
    previousInput = currentInput;
    operator = value;
    currentInput = "";
    isResultDisplayed = false;
    isEqualRepeating = false;
}
//計算を実行する関数
function calculateResult() {
    let num1;
    let num2;
    let activeOperator;
    if (isEqualRepeating && lastOperator && lastOperand) {
        num1 = parseFloat(currentInput);
        num2 = parseFloat(lastOperand);
        activeOperator = lastOperator;
    }
    else {
        if (!previousInput || !operator) {
            isResultDisplayed = true;
            return;
        }
        if (currentInput === "") {
            currentInput = previousInput;
        }
        num1 = parseFloat(previousInput);
        num2 = parseFloat(currentInput);
        activeOperator = operator;
        lastOperator = operator;
        lastOperand = currentInput;
        isEqualRepeating = true;
    }
    let result = 0;
    switch (activeOperator) {
        case '+':
            result = num1 + num2;
            break;
        case '-':
            result = num1 - num2;
            break;
        case '*':
            result = num1 * num2;
            break;
        case '/':
            if (num2 === 0) {
                currentInput = "Error";
                clearButton.textContent = "AC";
                clearButton.setAttribute('data-value', 'AC');
                updateDisplay();
                return;
            }
            else {
                result = num1 / num2;
            }
            break;
    }
    let resultStr = result.toFixed(8);
    if (resultStr.includes('.')) {
        resultStr = resultStr.replace(/0+$/, '').replace(/\.$/, '');
    }
    if (resultStr === "-0")
        resultStr = "0";
    const integerPart = (resultStr.split('.')[0] ?? "").replace('-', '');
    if (integerPart.length > 10) {
        currentInput = "Error";
        clearButton.textContent = "AC";
        clearButton.setAttribute('data-value', 'AC');
    }
    else {
        let maxLength = 10;
        if (resultStr.includes('.'))
            maxLength += 1;
        if (resultStr.startsWith('-'))
            maxLength += 1;
        if (resultStr.length > maxLength) {
            resultStr = resultStr.substring(0, maxLength);
            if (resultStr.endsWith('.')) {
                resultStr = resultStr.slice(0, -1);
            }
        }
        currentInput = resultStr;
    }
    operator = null;
    previousInput = null;
    isResultDisplayed = true;
    clearButton.textContent = "AC";
    clearButton.setAttribute('data-value', 'AC');
    updateDisplay();
}
//+/-ボタンを実行する関数
function toggleSign() {
    if (!currentInput || currentInput === "0" || currentInput === "Error")
        return;
    currentInput = currentInput.startsWith('-') ? currentInput.slice(1) : `-${currentInput}`;
    updateDisplay();
}
//%ボタンを実行する関数
function applyPercentage() {
    if (!currentInput || currentInput === "0" || currentInput === "Error")
        return;
    //小数点以下8桁までにおさめる
    let num = parseFloat(currentInput);
    let percentValue = 0;
    if (previousInput !== null && operator !== null) {
        if (operator === '+' || operator === '-') {
            percentValue = parseFloat(previousInput) * (num / 100);
        }
        else {
            percentValue = num / 100;
        }
    }
    else {
        percentValue = num / 100;
    }
    let resultStr = percentValue.toFixed(8);
    if (resultStr.includes('.')) {
        resultStr = resultStr.replace(/0+$/, '').replace(/\.$/, '');
    }
    //10桁でストップする
    let maxLength = 10;
    if (resultStr.includes('.'))
        maxLength += 1;
    if (resultStr.startsWith('-'))
        maxLength += 1;
    if (resultStr.length > maxLength) {
        resultStr = resultStr.substring(0, maxLength);
        if (resultStr.endsWith('.')) {
            resultStr = resultStr.slice(0, -1);
        }
    }
    currentInput = resultStr;
    updateDisplay();
    isResultDisplayed = true;
}
//ボタンをクリックしたときの処理
buttons.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.getAttribute('data-value');
        if (!value)
            return;
        if (currentInput === "Error") {
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
