// api/token-info.js
const fetch = require('node-fetch');
const { TOKEN_MINT, TOKEN_SYMBOL } = require('../config');

module.exports = async (req, res) => {
  let liveData = {
    ticker: TOKEN_SYMBOL || 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'Loading...',
    volume24h: '$0',
    lastTrade: null
  };

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT}`);
    const data = await response.json();

    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      const price = parseFloat(pair.priceUsd || 0);
      const fdv = parseFloat(pair.fdv || 0);

      liveData = {
        ticker: pair.baseToken.symbol || 'UNKNOWN',
        price: `$${price.toFixed(8)}`,
        marketCap: fdv > 0 ? (fdv > 1e6 ? `$${Math.round(fdv / 1e6)}M` : `$${Math.round(fdv)}`) : 'N/A',
        volume24h: pair.volume?.h24 ? `$${Math.round(pair.volume.h24)}` : '$0',
        lastTrade: null,
        updatedAt: new Date().toLocaleTimeString()
      };
    } else {
      liveData.marketCap = 'No pool found';
    }
  } catch (err) {
    console.error('DexScreener error:', err);
    liveData.marketCap = 'API Error';
  }

  res.json(liveData);
};