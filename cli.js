#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

// CLI Interface for Finance Dashboard
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY || '';

console.log('\n🏦 Personal Finance Dashboard CLI');
console.log('==================================\n');

// Helper functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatPercentage(value) {
    const num = parseFloat(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

async function makeRequest(url) {
    try {
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message);
    }
}

// CLI Functions
async function getCurrencyConversion() {
    return new Promise((resolve) => {
        rl.question('Enter amount: ', (amount) => {
            rl.question('From currency (e.g., USD): ', (from) => {
                rl.question('To currency (e.g., EUR): ', async (to) => {
                    try {
                        console.log('\n⏳ Converting...\n');
                        
                        let url;
                        if (EXCHANGE_API_KEY) {
                            url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/pair/${from}/${to}`;
                        } else {
                            url = `https://api.exchangerate-api.com/v4/latest/${from}`;
                        }
                        
                        const data = await makeRequest(url);
                        
                        let rate;
                        if (EXCHANGE_API_KEY) {
                            rate = data.conversion_rate;
                        } else {
                            rate = data.rates[to];
                        }
                        
                        const result = (parseFloat(amount) * rate).toFixed(2);
                        
                        console.log('💱 Currency Conversion Result:');
                        console.log(`${formatCurrency(amount, from)} = ${formatCurrency(result, to)}`);
                        console.log(`Exchange Rate: 1 ${from} = ${rate.toFixed(4)} ${to}\n`);
                        
                    } catch (error) {
                        console.log(`❌ Error: ${error.message}\n`);
                    }
                    resolve();
                });
            });
        });
    });
}

async function getStockQuote() {
    return new Promise((resolve) => {
        rl.question('Enter stock symbol (e.g., AAPL): ', async (symbol) => {
            try {
                console.log('\n⏳ Fetching stock data...\n');
                
                const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
                const data = await makeRequest(url);
                
                const quote = data['Global Quote'];
                if (quote && Object.keys(quote).length > 0) {
                    const change = parseFloat(quote['09. change']);
                    const changeIcon = change >= 0 ? '📈' : '📉';
                    
                    console.log(`📊 Stock Quote for ${quote['01. symbol']}:`);
                    console.log(`Price: ${formatCurrency(quote['05. price'])}`);
                    console.log(`Change: ${changeIcon} ${change.toFixed(2)} (${quote['10. change percent']})`);
                    console.log(`Volume: ${parseInt(quote['06. volume']).toLocaleString()}`);
                    console.log(`Last Updated: ${quote['07. latest trading day']}\n`);
                } else {
                    console.log(`❌ Stock symbol '${symbol}' not found\n`);
                }
                
            } catch (error) {
                console.log(`❌ Error: ${error.message}\n`);
            }
            resolve();
        });
    });
}

async function getCryptoPrices() {
    try {
        console.log('\n⏳ Fetching cryptocurrency data...\n');
        
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,polkadot,chainlink&vs_currencies=usd&include_24hr_change=true';
        const data = await makeRequest(url);
        
        console.log('₿ Cryptocurrency Prices:');
        console.log('========================');
        
        Object.entries(data).forEach(([id, coinData]) => {
            const name = id.charAt(0).toUpperCase() + id.slice(1);
            const change = coinData.usd_24h_change || 0;
            const changeIcon = change >= 0 ? '📈' : '📉';
            
            console.log(`${name}: ${formatCurrency(coinData.usd)} ${changeIcon} ${formatPercentage(change)}`);
        });
        console.log();
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
}

async function budgetCalculator() {
    return new Promise((resolve) => {
        rl.question('Enter monthly income: $', (income) => {
            const monthlyIncome = parseFloat(income) || 0;
            const expenses = [];
            
            function addExpense() {
                rl.question('Enter expense name (or "done" to finish): ', (name) => {
                    if (name.toLowerCase() === 'done') {
                        calculateBudget();
                        return;
                    }
                    
                    rl.question(`Enter amount for ${name}: $`, (amount) => {
                        const expenseAmount = parseFloat(amount) || 0;
                        if (expenseAmount > 0) {
                            expenses.push({ name, amount: expenseAmount });
                        }
                        addExpense();
                    });
                });
            }
            
            function calculateBudget() {
                const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                const remaining = monthlyIncome - totalExpenses;
                const savingsRate = monthlyIncome > 0 ? (remaining / monthlyIncome) * 100 : 0;
                
                console.log('\n💰 Budget Analysis:');
                console.log('==================');
                console.log(`Monthly Income: ${formatCurrency(monthlyIncome)}`);
                console.log(`Total Expenses: ${formatCurrency(totalExpenses)}`);
                console.log(`Remaining: ${formatCurrency(remaining)} ${remaining >= 0 ? '✅' : '❌'}`);
                console.log(`Savings Rate: ${savingsRate.toFixed(1)}%`);
                
                if (expenses.length > 0) {
                    console.log('\n📋 Expense Breakdown:');
                    expenses.forEach(exp => {
                        console.log(`  ${exp.name}: ${formatCurrency(exp.amount)}`);
                    });
                }
                
                console.log('\n💡 Financial Advice:');
                if (remaining < 0) {
                    console.log('⚠️  Warning: Your expenses exceed your income!');
                } else if (savingsRate >= 20) {
                    console.log('🎉 Great job! You\'re saving 20% or more of your income.');
                } else if (savingsRate >= 10) {
                    console.log('👍 Good start! Try to increase your savings rate to 20%.');
                } else {
                    console.log('📈 Room for improvement! Aim to save at least 10% of your income.');
                }
                console.log();
                
                resolve();
            }
            
            console.log('\nEnter your monthly expenses (type "done" when finished):');
            addExpense();
        });
    });
}

function showMenu() {
    console.log('Select an option:');
    console.log('1. Currency Conversion');
    console.log('2. Stock Quote');
    console.log('3. Cryptocurrency Prices');
    console.log('4. Budget Calculator');
    console.log('5. Exit');
    console.log();
}

async function handleMenuChoice(choice) {
    switch (choice) {
        case '1':
            await getCurrencyConversion();
            break;
        case '2':
            await getStockQuote();
            break;
        case '3':
            await getCryptoPrices();
            break;
        case '4':
            await budgetCalculator();
            break;
        case '5':
            console.log('👋 Thank you for using Personal Finance Dashboard CLI!\n');
            rl.close();
            return false;
        default:
            console.log('❌ Invalid option. Please try again.\n');
    }
    return true;
}

async function main() {
    let running = true;
    
    while (running) {
        showMenu();
        
        const choice = await new Promise((resolve) => {
            rl.question('Enter your choice (1-5): ', resolve);
        });
        
        console.log();
        running = await handleMenuChoice(choice);
    }
}

// Check for API keys
if (ALPHA_VANTAGE_API_KEY === 'demo') {
    console.log('⚠️  Using demo API key for Alpha Vantage. Get a free key at: https://www.alphavantage.co/support/#api-key');
}

if (!EXCHANGE_API_KEY) {
    console.log('⚠️  No ExchangeRate API key found. Using fallback API (limited features).');
}

console.log();

// Start the CLI
main().catch(console.error);