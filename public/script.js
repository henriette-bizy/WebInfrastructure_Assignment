// Global variables
let stockData = [];
let cryptoData = {};
let exchangeRates = {};
let isLoading = false;

// DOM elements
const elements = {
    serverStatus: document.getElementById('server-status'),
    refreshAllBtn: document.getElementById('refresh-all'),
    
    // Currency converter
    amountInput: document.getElementById('amount'),
    fromCurrency: document.getElementById('from-currency'),
    toCurrency: document.getElementById('to-currency'),
    convertBtn: document.getElementById('convert-btn'),
    conversionResult: document.getElementById('conversion-result'),
    
    // Stock tracker
    stockSymbolInput: document.getElementById('stock-symbol'),
    addStockBtn: document.getElementById('add-stock'),
    stockSearch: document.getElementById('stock-search'),
    stockSort: document.getElementById('stock-sort'),
    stockList: document.getElementById('stock-list'),
    
    // Crypto tracker
    cryptoFilter: document.getElementById('crypto-filter'),
    cryptoList: document.getElementById('crypto-list'),
    
    // Exchange rates
    baseCurrency: document.getElementById('base-currency'),
    ratesSearch: document.getElementById('rates-search'),
    ratesList: document.getElementById('rates-list'),
    
    // Budget calculator
    monthlyIncome: document.getElementById('monthly-income'),
    expenseList: document.getElementById('expense-list'),
    addExpenseBtn: document.getElementById('add-expense'),
    calculateBudgetBtn: document.getElementById('calculate-budget'),
    budgetResult: document.getElementById('budget-result'),
    
    // Modal and loading
    errorModal: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-message'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// Utility functions
function showLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'block';
    }
    isLoading = true;
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'none';
    }
    isLoading = false;
}

function showError(message) {
    if (elements.errorMessage && elements.errorModal) {
        elements.errorMessage.textContent = message;
        elements.errorModal.style.display = 'block';
    } else {
        alert(`Error: ${message}`);
    }
}

function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-US').format(number);
}

function formatPercentage(value) {
    const num = parseFloat(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

// API request function with error handling
async function makeRequest(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Server health check
async function checkServerHealth() {
    try {
        const data = await makeRequest('/health');
        if (elements.serverStatus) {
            elements.serverStatus.textContent = `Server: ${data.server || 'Online'} ✓`;
            elements.serverStatus.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
            elements.serverStatus.style.borderColor = '#2ecc71';
        }
    } catch (error) {
        if (elements.serverStatus) {
            elements.serverStatus.textContent = 'Server: Offline ✗';
            elements.serverStatus.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
            elements.serverStatus.style.borderColor = '#e74c3c';
        }
    }
}

// Currency conversion functionality
async function convertCurrency() {
    const amount = parseFloat(elements.amountInput.value);
    const from = elements.fromCurrency.value;
    const to = elements.toCurrency.value;
    
    if (!amount || amount <= 0) {
        showError('Please enter a valid amount');
        return;
    }
    
    if (from === to) {
        elements.conversionResult.innerHTML = `
            <div class="conversion-display">
                <strong>${formatCurrency(amount, from)} = ${formatCurrency(amount, to)}</strong>
                <p>Same currency selected</p>
            </div>
        `;
        elements.conversionResult.classList.add('show');
        return;
    }
    
    try {
        showLoading();
        const data = await makeRequest(`/api/convert/${from}/${to}/${amount}`);
        
        elements.conversionResult.innerHTML = `
            <div class="conversion-display">
                <strong>${formatCurrency(amount, from)} = ${formatCurrency(data.data.result, to)}</strong>
                <p>Exchange Rate: 1 ${from} = ${data.data.rate.toFixed(4)} ${to}</p>
                <small>Last updated: ${new Date(data.timestamp).toLocaleTimeString()}</small>
            </div>
        `;
        elements.conversionResult.classList.add('show');
        
    } catch (error) {
        showError(`Currency conversion failed: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Stock tracking functionality
async function addStock() {
    const symbol = elements.stockSymbolInput.value.trim().toUpperCase();
    
    if (!symbol) {
        showError('Please enter a stock symbol');
        return;
    }
    
    if (stockData.some(stock => stock.symbol === symbol)) {
        showError('Stock already added to tracker');
        return;
    }
    
    try {
        showLoading();
        const data = await makeRequest(`/api/stock/${symbol}`);
        
        stockData.push(data.data);
        elements.stockSymbolInput.value = '';
        displayStocks();
        
    } catch (error) {
        showError(`Failed to add stock: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function removeStock(symbol) {
    stockData = stockData.filter(stock => stock.symbol !== symbol);
    displayStocks();
}

function displayStocks() {
    if (!elements.stockList) return;
    
    let filteredStocks = [...stockData];
    
    // Apply search filter
    const searchTerm = elements.stockSearch.value.toLowerCase();
    if (searchTerm) {
        filteredStocks = filteredStocks.filter(stock => 
            stock.symbol.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply sorting
    const sortBy = elements.stockSort.value;
    filteredStocks.sort((a, b) => {
        switch (sortBy) {
            case 'symbol':
                return a.symbol.localeCompare(b.symbol);
            case 'price':
                return parseFloat(b.price) - parseFloat(a.price);
            case 'change':
                return parseFloat(b.change) - parseFloat(a.change);
            default:
                return 0;
        }
    });
    
    if (filteredStocks.length === 0) {
        elements.stockList.innerHTML = '<div class="loading">No stocks to display. Add some stocks to get started!</div>';
        return;
    }
    
    elements.stockList.innerHTML = filteredStocks.map(stock => {
        const change = parseFloat(stock.change);
        const changeClass = change >= 0 ? 'positive' : 'negative';
        const changePercent = stock.changePercent ? stock.changePercent.replace('%', '') : '0';
        
        return `
            <div class="stock-item">
                <div class="item-info">
                    <div class="item-symbol">${stock.symbol}</div>
                    <div class="item-price">${formatCurrency(parseFloat(stock.price))}</div>
                </div>
                <div class="item-stats">
                    <div class="item-change ${changeClass}">
                        ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent}%)
                    </div>
                    <div class="item-volume">Vol: ${formatNumber(stock.volume)}</div>
                </div>
                <button class="remove-stock btn btn-danger" onclick="removeStock('${stock.symbol}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Cryptocurrency functionality
async function loadCryptocurrencyData() {
    try {
        const data = await makeRequest('/api/crypto');
        cryptoData = data.data;
        displayCryptocurrencies();
    } catch (error) {
        if (elements.cryptoList) {
            elements.cryptoList.innerHTML = `<div class="error-message">Failed to load cryptocurrency data: ${error.message}</div>`;
        }
    }
}

function displayCryptocurrencies() {
    if (!elements.cryptoList || !cryptoData) return;
    
    const filter = elements.cryptoFilter.value;
    let cryptoArray = Object.entries(cryptoData).map(([id, data]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        price: data.usd,
        change: data.usd_24h_change || 0,
        marketCap: data.usd_market_cap || 0
    }));
    
    // Apply filters
    switch (filter) {
        case 'top5':
            cryptoArray = cryptoArray.slice(0, 5);
            break;
        case 'gainers':
            cryptoArray = cryptoArray.filter(crypto => crypto.change > 0).sort((a, b) => b.change - a.change);
            break;
        case 'losers':
            cryptoArray = cryptoArray.filter(crypto => crypto.change < 0).sort((a, b) => a.change - b.change);
            break;
    }
    
    elements.cryptoList.innerHTML = cryptoArray.map(crypto => {
        const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
        
        return `
            <div class="crypto-item">
                <div class="item-info">
                    <div class="item-symbol">${crypto.name}</div>
                    <div class="item-price">${formatCurrency(crypto.price)}</div>
                </div>
                <div class="item-stats">
                    <div class="item-change ${changeClass}">
                        ${formatPercentage(crypto.change)}
                    </div>
                    <div class="item-volume">
                        Market Cap: ${formatCurrency(crypto.marketCap, 'USD')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Exchange rates functionality
async function loadExchangeRates() {
    try {
        const baseCurrency = elements.baseCurrency.value;
        const data = await makeRequest(`/api/exchange-rates/${baseCurrency}`);
        exchangeRates = data.data.rates;
        displayExchangeRates();
    } catch (error) {
        if (elements.ratesList) {
            elements.ratesList.innerHTML = `<div class="error-message">Failed to load exchange rates: ${error.message}</div>`;
        }
    }
}

function displayExchangeRates() {
    if (!elements.ratesList || !exchangeRates) return;
    
    const searchTerm = elements.ratesSearch.value.toLowerCase();
    const filteredRates = Object.entries(exchangeRates).filter(([currency]) =>
        currency.toLowerCase().includes(searchTerm)
    );
    
    // Sort by currency code
    filteredRates.sort(([a], [b]) => a.localeCompare(b));
    
    elements.ratesList.innerHTML = filteredRates.map(([currency, rate]) => `
        <div class="rate-item">
            <div class="item-info">
                <div class="item-symbol">${currency}</div>
                <div class="item-price">${rate.toFixed(4)}</div>
            </div>
        </div>
    `).join('');
}

// Budget calculator functionality
function addExpense() {
    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item';
    expenseItem.innerHTML = `
        <input type="text" placeholder="Expense name" class="expense-name">
        <input type="number" placeholder="Amount" class="expense-amount" min="0" step="0.01">
        <button class="remove-expense btn btn-danger" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    elements.expenseList.appendChild(expenseItem);
}

function calculateBudget() {
    const income = parseFloat(elements.monthlyIncome.value) || 0;
    const expenseItems = elements.expenseList.querySelectorAll('.expense-item');
    
    let totalExpenses = 0;
    const expenses = [];
    
    expenseItems.forEach(item => {
        const name = item.querySelector('.expense-name').value.trim();
        const amount = parseFloat(item.querySelector('.expense-amount').value) || 0;
        
        if (name && amount > 0) {
            expenses.push({ name, amount });
            totalExpenses += amount;
        }
    });
    
    const remaining = income - totalExpenses;
    const savingsRate = income > 0 ? (remaining / income) * 100 : 0;
    
    elements.budgetResult.innerHTML = `
        <div class="budget-summary">
            <div class="budget-item">
                <div class="budget-item-label">Monthly Income</div>
                <div class="budget-item-value">${formatCurrency(income)}</div>
            </div>
            <div class="budget-item">
                <div class="budget-item-label">Total Expenses</div>
                <div class="budget-item-value">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="budget-item">
                <div class="budget-item-label">Remaining</div>
                <div class="budget-item-value ${remaining >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(remaining)}
                </div>
            </div>
            <div class="budget-item">
                <div class="budget-item-label">Savings Rate</div>
                <div class="budget-item-value ${savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? '' : 'negative'}">
                    ${savingsRate.toFixed(1)}%
                </div>
            </div>
        </div>
        
        ${expenses.length > 0 ? `
            <div class="expense-breakdown">
                <h4>Expense Breakdown</h4>
                ${expenses.map(expense => `
                    <div style="display: flex; justify-content: space-between; margin: 0.5rem 0;">
                        <span>${expense.name}</span>
                        <span>${formatCurrency(expense.amount)}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="budget-advice">
            ${remaining < 0 ? 
                '<p style="color: #e74c3c;"><strong>⚠️ Warning:</strong> Your expenses exceed your income!</p>' :
                savingsRate >= 20 ?
                    '<p style="color: #27ae60;"><strong>✅ Great job!</strong> You\'re saving 20% or more of your income.</p>' :
                    savingsRate >= 10 ?
                        '<p style="color: #f39c12;"><strong>💡 Good start!</strong> Try to increase your savings rate to 20%.</p>' :
                        '<p style="color: #e74c3c;"><strong>📈 Room for improvement!</strong> Aim to save at least 10% of your income.</p>'
            }
        </div>
    `;
    
    elements.budgetResult.classList.add('show');
}

// Refresh all data
async function refreshAllData() {
    if (isLoading) return;
    
    try {
        showLoading();
        
        // Refresh all widgets
        await Promise.allSettled([
            checkServerHealth(),
            loadCryptocurrencyData(),
            loadExchangeRates()
        ]);
        
        // Refresh stock data if any stocks are tracked
        if (stockData.length > 0) {
            const stockPromises = stockData.map(async (stock, index) => {
                try {
                    const data = await makeRequest(`/api/stock/${stock.symbol}`);
                    stockData[index] = data.data;
                } catch (error) {
                    console.error(`Failed to refresh ${stock.symbol}:`, error);
                }
            });
            
            await Promise.allSettled(stockPromises);
            displayStocks();
        }
        
    } catch (error) {
        showError(`Failed to refresh data: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if all elements exist
    const missingElements = Object.entries(elements).filter(([key, element]) => !element);
    if (missingElements.length > 0) {
        console.warn('Missing elements:', missingElements.map(([key]) => key));
    }
    
    // Currency converter
    if (elements.convertBtn) {
        elements.convertBtn.addEventListener('click', convertCurrency);
    }
    
    // Stock tracker
    if (elements.addStockBtn) {
        elements.addStockBtn.addEventListener('click', addStock);
    }
    
    if (elements.stockSymbolInput) {
        elements.stockSymbolInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addStock();
            }
        });
    }
    
    if (elements.stockSearch) {
        elements.stockSearch.addEventListener('input', displayStocks);
    }
    
    if (elements.stockSort) {
        elements.stockSort.addEventListener('change', displayStocks);
    }
    
    // Crypto filter
    if (elements.cryptoFilter) {
        elements.cryptoFilter.addEventListener('change', displayCryptocurrencies);
    }
    
    // Exchange rates
    if (elements.baseCurrency) {
        elements.baseCurrency.addEventListener('change', loadExchangeRates);
    }
    
    if (elements.ratesSearch) {
        elements.ratesSearch.addEventListener('input', displayExchangeRates);
    }
    
    // Budget calculator
    if (elements.addExpenseBtn) {
        elements.addExpenseBtn.addEventListener('click', addExpense);
    }
    
    if (elements.calculateBudgetBtn) {
        elements.calculateBudgetBtn.addEventListener('click', calculateBudget);
    }
    
    // Refresh all button
    if (elements.refreshAllBtn) {
        elements.refreshAllBtn.addEventListener('click', refreshAllData);
    }
    
    // Modal close functionality
    if (elements.errorModal) {
        const closeBtn = elements.errorModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                elements.errorModal.style.display = 'none';
            });
        }
        
        window.addEventListener('click', function(event) {
            if (event.target === elements.errorModal) {
                elements.errorModal.style.display = 'none';
            }
        });
    }
    
    // Initial data load
    checkServerHealth();
    loadCryptocurrencyData();
    loadExchangeRates();
    
    // Load default stocks
    const defaultStocks = ['AAPL', 'GOOGL', 'MSFT'];
    defaultStocks.forEach(async (symbol) => {
        try {
            const data = await makeRequest(`/api/stock/${symbol}`);
            stockData.push(data.data);
            displayStocks();
        } catch (error) {
            console.warn(`Failed to load default stock ${symbol}:`, error);
        }
    });
});

// Auto-refresh data every 5 minutes
setInterval(() => {
    if (!isLoading) {
        refreshAllData();
    }
}, 5 * 60 * 1000);