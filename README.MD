# Personal Finance Dashboard

A comprehensive web application that provides real-time financial data, currency conversion, stock tracking, and budget planning tools. Built with Node.js, Express, and vanilla JavaScript.

## 🌟 Features

- **Real-time Currency Conversion**: Convert between multiple currencies with live exchange rates
- **Stock Market Tracking**: Add and monitor stock prices with real-time updates
- **Cryptocurrency Monitor**: Track popular cryptocurrencies with price changes and market caps
- **Exchange Rate Dashboard**: View current exchange rates for multiple currencies
- **Budget Calculator**: Plan your monthly budget with expense tracking and financial advice
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Error Handling**: Robust error handling with user-friendly messages
- **Caching**: API response caching to improve performance and respect rate limits

## 🚀 Live Demo

The application serves a genuine purpose by providing:
- Financial planning tools for personal budgeting
- Real-time market data for investment decisions
- Currency conversion for international transactions
- Comprehensive financial overview in one dashboard

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker (for containerization)
- API keys (see API Setup section)

## 🔧 API Setup

This application uses the following APIs:

### 1. Alpha Vantage API (Stock Market Data)
- **Website**: [https://www.alphavantage.co/](https://www.alphavantage.co/)
- **Documentation**: [https://www.alphavantage.co/documentation/](https://www.alphavantage.co/documentation/)
- **Free Tier**: 5 API requests per minute, 500 requests per day
- **Get API Key**: [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)

### 2. ExchangeRate-API (Currency Exchange Rates)
- **Website**: [https://exchangerate-api.com/](https://exchangerate-api.com/)
- **Documentation**: [https://exchangerate-api.com/docs](https://exchangerate-api.com/docs)
- **Free Tier**: 1,500 requests per month
- **Get API Key**: [https://app.exchangerate-api.com/sign-up](https://app.exchangerate-api.com/sign-up)

### 3. CoinGecko API (Cryptocurrency Data)
- **Website**: [https://www.coingecko.com/](https://www.coingecko.com/)
- **Documentation**: [https://www.coingecko.com/en/api](https://www.coingecko.com/en/api)
- **Free Tier**: No API key required, rate limited
- **Note**: No registration required for basic usage

## 🛠️ Local Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd finance-dashboard
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

Update the `.env` file with your API keys:
```env
PORT=8080
SERVER_NAME=Local
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
EXCHANGE_API_KEY=your_exchange_rate_api_key_here
```

### 4. Run Locally
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 5. Access the Application
Open your browser and navigate to: `http://localhost:8080`

## 🐳 Docker Deployment

### Part 2A: Docker Container Deployment

#### 1. Build the Docker Image
```bash
# Replace <dockerhub-username> with your Docker Hub username
docker build -t <dockerhub-username>/finance-dashboard:v1 .
```

#### 2. Test Locally
```bash
# Run the container locally
docker run -p 8080:8080 \
  -e ALPHA_VANTAGE_API_KEY=your_api_key \
  -e EXCHANGE_API_KEY=your_api_key \
  <dockerhub-username>/finance-dashboard:v1

# Test the application
curl http://localhost:8080/health
```

#### 3. Push to Docker Hub
```bash
# Login to Docker Hub
docker login

# Push the image
docker push <dockerhub-username>/finance-dashboard:v1

# Tag as latest
docker tag <dockerhub-username>/finance-dashboard:v1 <dockerhub-username>/finance-dashboard:latest
docker push <dockerhub-username>/finance-dashboard:latest
```

#### 4. Deploy on Lab Infrastructure

**Docker Hub Repository**: `https://hub.docker.com/r/<dockerhub-username>/finance-dashboard`

**SSH into Web01 and Web02:**
```bash
# On Web01
ssh user@web-01

# Pull and run the application
docker pull <dockerhub-username>/finance-dashboard:v1
docker run -d --name finance-app --restart unless-stopped \
  -p 8080:8080 \
  -e SERVER_NAME=Web01 \
  -e ALPHA_VANTAGE_API_KEY=your_api_key \
  -e EXCHANGE_API_KEY=your_api_key \
  <dockerhub-username>/finance-dashboard:v1

# Verify it's running
curl http://localhost:8080/health
```

```bash
# On Web02
ssh user@web-02

# Pull and run the application
docker pull <dockerhub-username>/finance-dashboard:v1
docker run -d --name finance-app --restart unless-stopped \
  -p 8080:8080 \
  -e SERVER_NAME=Web02 \
  -e ALPHA_VANTAGE_API_KEY=your_api_key \
  -e EXCHANGE_API_KEY=your_api_key \
  <dockerhub-username>/finance-dashboard:v1

# Verify it's running
curl http://localhost:8080/health
```

#### 5. Configure Load Balancer (HAProxy)

**Edit HAProxy Configuration on lb-01:**
```bash
# SSH into load balancer
ssh user@lb-01

# Edit HAProxy configuration
sudo nano /etc/haproxy/haproxy.cfg
```

**HAProxy Configuration Snippet:**
```
global
    daemon

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend finance_frontend
    bind *:80
    default_backend finance_backend

backend finance_backend
    balance roundrobin
    option httpchk GET /health
    server web01 172.20.0.11:8080 check
    server web02 172.20.0.12:8080 check
```

**Reload HAProxy:**
```bash
# Method 1: Reload configuration
docker exec -it lb-01 sh -c 'haproxy -sf $(pidof haproxy) -f /etc/haproxy/haproxy.cfg'

# Method 2: Restart container if needed
docker restart lb-01
```

#### 6. Testing Load Balancing

**Test from your host machine:**
```bash
# Test multiple requests to see round-robin distribution
for i in {1..10}; do
  curl -s http://localhost/health | jq '.server'
done

# Should alternate between Web01 and Web02
```

**Verify both servers are healthy:**
```bash
# Check HAProxy stats (if enabled)
curl http://localhost/stats

# Manual verification
curl http://172.20.0.11:8080/health  # Web01
curl http://172.20.0.12:8080/health  # Web02
```

## 🧪 Testing & Verification

### Load Balancing Evidence
The application includes a server identifier in the health check response to verify load balancing:

1. **Server Identification**: Each instance reports its server name in the health endpoint
2. **Round-Robin Testing**: Multiple requests show alternating server responses
3. **Health Monitoring**: HAProxy health checks ensure only healthy servers receive traffic

### Screenshots/Logs Location
- HAProxy logs: `/var/log/haproxy.log`
- Application logs: Check Docker container logs with `docker logs finance-app`
- Load balancing proof: Health check responses showing different server names

## 🔒 Security Considerations

### API Key Management
- **Development**: Use `.env` files (never commit to git)
- **Production**: Use environment variables or Docker secrets
- **Container**: Pass as environment variables during docker run

### Container Security
- Uses non-root user (`nodeuser`)
- Minimal Alpine Linux base image
- Only production dependencies installed
- Health checks for monitoring

## 📊 User Interactions

### Data Filtering & Searching
- **Stock Tracker**: Search by symbol, sort by price/change
- **Currency Rates**: Search currencies by code
- **Cryptocurrency**: Filter by top gainers/losers

### Sorting Options
- **Stocks**: Sort by symbol (A-Z), price (high to low), change (high to low)
- **Real-time Updates**: Auto-refresh every 5 minutes
- **Manual Refresh**: Refresh all data button

### Budget Planning
- **Interactive Calculator**: Add/remove expenses dynamically
- **Financial Advice**: Automated recommendations based on savings rate
- **Visual Feedback**: Color-coded results (red for overspending, green for good savings)

## 🚨 Error Handling

### API Failures
- **Graceful Degradation**: Shows cached data when APIs are unavailable
- **User Feedback**: Clear error messages for failed requests
- **Retry Logic**: Automatic retries for transient failures

### Network Issues
- **Timeout Handling**: 10-second timeout for API requests
- **Fallback Data**: Cached responses when fresh data unavailable
- **Status Indicators**: Server health status in header

## 🔄 Caching Strategy

- **Response Caching**: 5-minute TTL to respect API rate limits
- **Memory Cache**: In-memory caching with node-cache
- **Cache Indicators**: UI shows when data is from cache vs fresh

## 📱 Responsive Design

- **Mobile-First**: Optimized for mobile devices
- **Flexible Grid**: Auto-adjusting widget layout
- **Touch-Friendly**: Large buttons and touch targets
- **Performance**: Optimized for slower connections

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Build Docker image
docker build -t finance-dashboard .

# Run with Docker Compose (if using)
docker-compose up -d
```

## 📈 Performance Optimizations

- **API Caching**: Reduces redundant API calls
- **Efficient DOM Updates**: Minimal DOM manipulation
- **Responsive Images**: Optimized for different screen sizes
- **Lazy Loading**: Data loaded on demand

## 🔧 Troubleshooting

### Common Issues

1. **API Key Errors**:
   - Verify API keys in `.env` file
   - Check API key validity and rate limits
   - Ensure proper environment variable names

2. **Docker Container Issues**:
   - Check container logs: `docker logs <container-name>`
   - Verify port mapping: `-p 8080:8080`
   - Ensure environment variables are passed correctly

3. **Load Balancer Problems**:
   - Verify HAProxy configuration syntax
   - Check backend server health
   - Ensure correct IP addresses and ports

4. **Network Connectivity**:
   - Test API endpoints manually with curl
   - Check firewall settings
   - Verify Docker network configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Credits & Attribution

### APIs Used
- **Alpha Vantage**: Stock market and economic data - [https://www.alphavantage.co/](https://www.alphavantage.co/)
- **ExchangeRate-API**: Currency exchange rates - [https://exchangerate-api.com/](https://exchangerate-api.com/)
- **CoinGecko**: Cryptocurrency market data - [https://www.coingecko.com/](https://www.coingecko.com/)

### Libraries & Technologies
- **Node.js & Express**: Server framework
- **Axios**: HTTP client for API requests
- **Font Awesome**: Icons
- **Node-Cache**: In-memory caching

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review API documentation links
3. Check Docker Hub repository for updates
4. Create an issue in the repository

---

**Built with ❤️ for the Web Infrastructure Assignment**