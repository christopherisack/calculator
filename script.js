(function() {
    // ---------- DOM elements ----------
    const previousOperandElement = document.getElementById('previousOperand');
    const currentOperandElement = document.getElementById('currentOperand');

    // ---------- Calculator state ----------
    let currentOperand = '0';      // displayed number / current input
    let previousOperand = '';       // stored value before operator
    let operation = null;            // current mathematical operation (+, -, *, /)
    let shouldResetScreen = false;   // flag to overwrite current operand after equals/operation

    // ---------- Helper functions ----------
    function formatNumber(numberStr) {
        // format large numbers with commas, but keep decimal precision.
        // if number contains '.', split and handle decimal part.
        if (numberStr === '') return '';
        const num = parseFloat(numberStr);
        if (isNaN(num)) return '0';
        
        // For very large or small numbers we don't want scientific notation for display.
        // we keep as string but add thousand separators to integer part.
        let [integerPart, decimalPart] = numberStr.split('.');
        // format integer part with commas
        integerPart = parseFloat(integerPart).toLocaleString('en-US', { maximumFractionDigits: 0 });
        if (decimalPart !== undefined) {
            // limit decimal digits to 8 to avoid overflow and trailing zeros
            decimalPart = decimalPart.slice(0, 8);
            return `${integerPart}.${decimalPart}`;
        }
        return integerPart;
    }

    function updateDisplay() {
        // Update current operand display with formatting
        if (currentOperand !== undefined && currentOperand !== null) {
            // Avoid formatting when it's just a decimal point typed temporarily? 
            // But it's safe: if currentOperand is '.' or ends with '.' we handle gracefully.
            if (currentOperand === '.') {
                currentOperandElement.innerText = '0.';
            } else if (currentOperand === '') {
                currentOperandElement.innerText = '0';
            } else {
                // if the number has trailing decimal but no digits, keep dot visible
                if (currentOperand.endsWith('.')) {
                    let raw = currentOperand.slice(0, -1);
                    if (raw === '' || raw === '-') {
                        currentOperandElement.innerText = currentOperand;
                    } else {
                        let formatted = formatNumber(raw);
                        currentOperandElement.innerText = formatted + '.';
                    }
                } else {
                    currentOperandElement.innerText = formatNumber(currentOperand);
                }
            }
        } else {
            currentOperandElement.innerText = '0';
        }
        
        // Update previous operand display with operation sign
        if (operation !== null && previousOperand !== '') {
            let formattedPrev = formatNumber(previousOperand);
            let operatorSymbol = '';
            switch (operation) {
                case '+': operatorSymbol = '+'; break;
                case '-': operatorSymbol = '-'; break;
                case '*': operatorSymbol = '×'; break;
                case '/': operatorSymbol = '÷'; break;
                default: operatorSymbol = '';
            }
            previousOperandElement.innerText = `${formattedPrev} ${operatorSymbol}`;
        } else {
            if (previousOperand !== '') {
                previousOperandElement.innerText = formatNumber(previousOperand);
            } else {
                previousOperandElement.innerText = '';
            }
        }
    }

    function appendNumber(number) {
        // Avoid resetting screen incorrectly when number typing
        if (shouldResetScreen) {
            currentOperand = '';
            shouldResetScreen = false;
        }
        
        // Prevent multiple decimals
        if (number === '.') {
            if (currentOperand.includes('.')) return;
            // if currentOperand is empty or negative sign only, prepend 0
            if (currentOperand === '' || currentOperand === '-') {
                currentOperand = '0.';
                updateDisplay();
                return;
            }
            currentOperand += '.';
            updateDisplay();
            return;
        }
        
        // limit length to avoid overflow (max 12 digits before decimal, but flexible)
        if (currentOperand.replace(/\./g, '').length >= 15 && !currentOperand.includes('e')) {
            return;
        }
        
        // handle starting zero: if currentOperand === '0' and number is not dot, replace
        if (currentOperand === '0' && number !== '.') {
            currentOperand = number;
        } else {
            currentOperand += number;
        }
        updateDisplay();
    }

    function deleteLast() {
        if (shouldResetScreen) {
            // if reset flag is true, delete clears everything? Actually DEL on result clears last digit of result
            // but standard behavior: after equals, DEL should remove last digit of current result.
            // we treat normally
            shouldResetScreen = false;
        }
        if (currentOperand.length === 1 || (currentOperand.length === 2 && currentOperand.startsWith('-'))) {
            currentOperand = '0';
        } else {
            currentOperand = currentOperand.slice(0, -1);
            if (currentOperand === '' || currentOperand === '-') currentOperand = '0';
        }
        updateDisplay();
    }

    function clearAll() {
        currentOperand = '0';
        previousOperand = '';
        operation = null;
        shouldResetScreen = false;
        updateDisplay();
    }

    function percent() {
        // Convert current operand to percentage (divide by 100)
        if (shouldResetScreen) shouldResetScreen = false;
        let value = parseFloat(currentOperand);
        if (isNaN(value)) return;
        let percentValue = value / 100;
        // Convert to string without exponential for small numbers
        currentOperand = percentValue.toString();
        updateDisplay();
    }

    function compute() {
        if (operation === null || previousOperand === '' || shouldResetScreen) return;
        let prev = parseFloat(previousOperand);
        let curr = parseFloat(currentOperand);
        if (isNaN(prev) || isNaN(curr)) return;
        
        let result;
        switch (operation) {
            case '+':
                result = prev + curr;
                break;
            case '-':
                result = prev - curr;
                break;
            case '*':
                result = prev * curr;
                break;
            case '/':
                if (curr === 0) {
                    alert("Division by zero is not allowed");
                    clearAll();
                    return;
                }
                result = prev / curr;
                break;
            default:
                return;
        }
        
        // Handle floating point precision (round to reasonable decimal places)
        result = parseFloat(result.toFixed(10));
        // convert result to string without trailing zeros but keep number integrity
        currentOperand = result.toString();
        operation = null;
        previousOperand = '';
        shouldResetScreen = true;   // next number will overwrite
        updateDisplay();
    }
    
    function setOperation(op) {
        // if there's a pending operation and current operand is not fresh, compute first
        if (operation !== null && !shouldResetScreen && previousOperand !== '') {
            // compute previous operation before setting new one (chained operations)
            compute();
            // after compute, currentOperand holds result, shouldResetScreen becomes true
            // But we need to set previousOperand to that result and keep new operation
            previousOperand = currentOperand;
            operation = op;
            shouldResetScreen = true;
            updateDisplay();
            return;
        }
        
        // if we are just starting or after equals, set operation
        if (currentOperand === '' || currentOperand === null) return;
        
        if (previousOperand !== '' && operation !== null && shouldResetScreen) {
            // special case: user changes operator after equals?
            operation = op;
            updateDisplay();
            return;
        }
        
        // store current operand as previous and reset current for next input
        if (!shouldResetScreen) {
            previousOperand = currentOperand;
            operation = op;
            shouldResetScreen = true;   // next digit will start fresh
            updateDisplay();
        } else {
            // if screen reset flag true and operation changes without number (change mind)
            operation = op;
            updateDisplay();
        }
    }

    // ---------- Event listeners (using data attributes) ----------
    function handleButtonClick(event) {
        const target = event.target;
        if (!target.matches('button')) return;
        
        // number buttons
        if (target.hasAttribute('data-number')) {
            const number = target.getAttribute('data-number');
            appendNumber(number);
        }
        
        // operator buttons (+, -, *, /)
        if (target.hasAttribute('data-operator')) {
            const operator = target.getAttribute('data-operator');
            // map display symbol to actual operator
            let op = operator;
            if (operator === '÷') op = '/';
            if (operator === '×') op = '*';
            setOperation(op);
        }
        
        // action buttons: clear, delete, percent, equals
        if (target.hasAttribute('data-action')) {
            const action = target.getAttribute('data-action');
            switch (action) {
                case 'clear':
                    clearAll();
                    break;
                case 'delete':
                    deleteLast();
                    break;
                case 'percent':
                    percent();
                    break;
                case 'equals':
                    compute();
                    break;
                default: break;
            }
        }
    }
    
    // keyboard support (extra accessibility)
    function handleKeyboard(event) {
        const key = event.key;
        // numbers 0-9 and decimal
        if (/^[0-9]$/.test(key)) {
            event.preventDefault();
            appendNumber(key);
        } else if (key === '.') {
            event.preventDefault();
            appendNumber('.');
        } else if (key === 'Backspace') {
            event.preventDefault();
            deleteLast();
        } else if (key === 'Delete' || key === 'Escape') {
            event.preventDefault();
            clearAll();
        } else if (key === '%') {
            event.preventDefault();
            percent();
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            event.preventDefault();
            let mappedOp = key;
            if (key === '*') mappedOp = '*';
            if (key === '/') mappedOp = '/';
            setOperation(mappedOp);
        } else if (key === 'Enter' || key === '=') {
            event.preventDefault();
            compute();
        }
    }
    
    // Attach click listeners to the buttons container (event delegation)
    const buttonsContainer = document.querySelector('.buttons');
    buttonsContainer.addEventListener('click', handleButtonClick);
    
    // keyboard event binding
    window.addEventListener('keydown', handleKeyboard);
    
    // initial display update
    updateDisplay();
    
    console.log("Calculator ready — enjoy seamless calculations!");
})();
