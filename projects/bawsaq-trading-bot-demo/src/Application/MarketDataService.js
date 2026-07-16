const fetch = require('node-fetch');

class MarketDataService {
    static getSupportedSymbols() {
        return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    }

    static normalizeTicker(ticker) {
        return {
            symbol: ticker.symbol,
            price: Number(ticker.lastPrice || 0),
            change24h: Number(ticker.priceChangePercent || 0),
        };
    }

    static async getMarketData() {
        const symbols = MarketDataService.getSupportedSymbols();
        const url = 'https://api.binance.com/api/v3/ticker/24hr';

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Binance request failed: ${response.status}`);
        }

        const tickers = await response.json();

        if (!Array.isArray(tickers)) {
            throw new Error('Unexpected market data response');
        }

        const tickerMap = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));

        return symbols
            .map((symbol) => tickerMap.get(symbol))
            .filter(Boolean)
            .map(MarketDataService.normalizeTicker);
    }
}

module.exports = MarketDataService;
