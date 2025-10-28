// api/token-info.js
const fetch = require('node-fetch');
const { TOKEN_MINT } = require('../config');

module.exports = async (req, res) => {
  if (!TOKEN_MINT) return res.json({ ticker: 'ERROR', marketCap: 'Add TOKEN_MINT', price: '$0.00000000' });

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT}`);
    const data = await response.json();

    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      const price = parseFloat(pair.priceUsd || 0);
      const fdv = parseFloat(pair.fdv || 0);

      res.json({
        ticker: pair.baseToken.symbol || 'TOKEN',
        price: `$${price.toFixed(8)}`,
        marketCap: fdv > 0 ? `$${Math.round(fdv)}` : 'N/A'
      });
    } else {
      res.json({ ticker: 'NEW', marketCap: 'No pool', price: '$0.00000000' });
    }
  } catch {
    res.json({ ticker: 'ERROR', marketCap: 'API Error', price: '$0.00000000' });
  }
};