const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Cache with 5 minute TTL to respect API rate limits
const cache = new NodeCache({ stdTTL: 300 });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Keys - Use environment variables for security
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY || '';

// Helper function for API requests with error handling
async function makeAPIRequest(url, cacheKey) {
    try {
        // Check cache first
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return { success: true, data: cachedData, cached: true };
        }

        const response = await axios.get(url, { timeout: 10000 });
        
        // Cache the response
        cache.set(cacheKey, response.data);
        
        return { success: true, data: response.data, cached: false };
    } catch (error) {
        console.error(`API Request failed for ${cacheKey}:`, error.message);
        return { 
            success: false, 
            error: error.response?.data?.message || error.message || 'API request failed',
            status: error.response?.status || 500
        };
    }
}

// Routes

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server: process.env.SERVER_NAME || 'Unknown'
    });
});

// Get currency exchange rates
app.get('/api/exchange-rates/:base?', async (req, res) => {
    const baseCurrency = req.params.base || 'USD';
    const cacheKey = `exchange_${baseCurrency}`;
    
    try {
        let url;
        if (EXCHANGE_API_KEY) {
            url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${baseCurrency}`;
        } else {
            // Fallback to free API
            url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
        }
        
        const result = await makeAPIRequest(url, cacheKey);
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                cached: result.cached,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(result.status || 500).json({
                success: false,
                error: result.error,
                fallback: "Exchange rate data temporarily unavailable"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: "Unable to fetch exchange rates"
        });
    }
});

// Get stock data
app.get('/api/stock/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = `stock_${symbol}`;
    
    try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        const result = await makeAPIRequest(url, cacheKey);
        
        if (result.success) {
            const quote = result.data['Global Quote'];
            if (quote && Object.keys(quote).length > 0) {
                res.json({
                    success: true,
                    data: {
                        symbol: quote['01. symbol'],
                        price: quote['05. price'],
                        change: quote['09. change'],
                        changePercent: quote['10. change percent'],
                        volume: quote['06. volume'],
                        lastUpdate: quote['07. latest trading day']
                    },
                    cached: result.cached,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: `Stock symbol '${symbol}' not found or invalid`
                });
            }
        } else {
            res.status(result.status || 500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: `Unable to fetch stock data for ${symbol}`
        });
    }
});

// Get cryptocurrency data
app.get('/api/crypto/:ids?', async (req, res) => {
    const cryptoIds = req.params.ids || 'bitcoin,ethereum,cardano,polkadot,chainlink';
    const cacheKey = `crypto_${cryptoIds}`;
    
    try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
        const result = await makeAPIRequest(url, cacheKey);
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                cached: result.cached,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(result.status || 500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: "Unable to fetch cryptocurrency data"
        });
    }
});

// Get economic indicators
app.get('/api/economic/:indicator', async (req, res) => {
    const indicator = req.params.indicator.toUpperCase();
    const cacheKey = `economic_${indicator}`;
    
    // Map common indicators to Alpha Vantage functions
    const indicatorMap = {
        'GDP': 'REAL_GDP',
        'INFLATION': 'INFLATION',
        'UNEMPLOYMENT': 'UNEMPLOYMENT',
        'INTEREST_RATE': 'FEDERAL_FUNDS_RATE'
    };
    
    const functionName = indicatorMap[indicator] || indicator;
    
    try {
        const url = `https://www.alphavantage.co/query?function=${functionName}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        const result = await makeAPIRequest(url, cacheKey);
        
        if (result.success && result.data.data) {
            res.json({
                success: true,
                data: result.data.data.slice(0, 10), // Return last 10 data points
                cached: result.cached,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: `Economic indicator '${indicator}' not found or unavailable`
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: `Unable to fetch economic data for ${indicator}`
        });
    }
});

// Currency conversion endpoint
app.get('/api/convert/:from/:to/:amount', async (req, res) => {
    const { from, to, amount } = req.params;
    const cacheKey = `convert_${from}_${to}`;
    
    try {
        let url;
        if (EXCHANGE_API_KEY) {
            url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/pair/${from}/${to}`;
        } else {
            url = `https://api.exchangerate-api.com/v4/latest/${from}`;
        }
        
        const result = await makeAPIRequest(url, cacheKey);
        
        if (result.success) {
            let conversionRate;
            if (EXCHANGE_API_KEY) {
                conversionRate = result.data.conversion_rate;
            } else {
                conversionRate = result.data.rates[to];
            }
            
            if (conversionRate) {
                const convertedAmount = (parseFloat(amount) * conversionRate).toFixed(2);
                res.json({
                    success: true,
                    data: {
                        from,
                        to,
                        amount: parseFloat(amount),
                        rate: conversionRate,
                        result: parseFloat(convertedAmount)
                    },
                    cached: result.cached,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: `Conversion rate from ${from} to ${to} not available`
                });
            }
        } else {
            res.status(result.status || 500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: `Unable to convert ${from} to ${to}`
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Something went wrong on our end"
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
        message: `The requested endpoint ${req.path} does not exist`
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Finance Dashboard Server running on port ${PORT}`);
    console.log(`📊 Access the dashboard at http://localhost:${PORT}`);
    console.log(`💡 Server: ${process.env.SERVER_NAME || 'Local Development'}`);
});

module.exports = app;