"use strict";
const display = document.getElementById('display');
const buttons = document.querySelectorAll('button');
let currentInput = "";
let operator = null;
let previousInput = null;
let isResultDisplayed = false;
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
    updateDisplay();
}
//数字を入力する関数
function appendNumber(value) {
    if (isResultDisplayed) {
        currentInput = "";
        isResultDisplayed = false;
    }
    if (value === '.' && currentInput.includes('.'))
        return;
    //何もないときに.を入れた場合は0.を追加する
    if (currentInput === "" && value === '.') {
        currentInput = "0.";
        updateDisplay();
        return;
    }
    //10桁でストップする
    const integerPart = currentInput.split('.')[0].replace('-', '');
    if (integerPart.length + value.length > 10 && value !== '.') {
        return;
    }
    if (currentInput.replace('-', '').length > 10) {
        return;
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
}
//演算子を設定する関数
function setOperator(value) {
    if (currentInput === "") {
        if (previousInput !== null) {
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
}
//計算を実行する関数
function calculateResult() {
    if (!previousInput || !currentInput || !operator)
        return;
    const num1 = parseFloat(previousInput);
    const num2 = parseFloat(currentInput);
    let result = 0;
    switch (operator) {
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
                updateDisplay();
                return;
            }
            else {
                result = num1 / num2;
            }
            break;
    }
    result = parseFloat(result.toFixed(8));
    const integerPart = result.toString().split('.')[0].replace('-', '');
    if (integerPart.length > 10) {
        currentInput = "Error";
    }
    else {
        let resultStr = result.toString();
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
    if (previousInput && operator) {
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
    percentValue = parseFloat(percentValue.toFixed(8));
    let resultStr = percentValue.toString();
    //指数表記の場合は0にする
    if (resultStr.includes('e')) {
        resultStr = "0";
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
}
//ボタンをクリックしたときの処理
buttons.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.getAttribute('data-value');
        if (!value)
            return;
        if (currentInput === "Error" && value !== 'AC') {
            return;
        }
        if (value === 'AC') {
            clearDisplay();
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
