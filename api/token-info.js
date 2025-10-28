const fetch = require('node-fetch');
const { TOKEN_MINT } = require('../config');

module.exports = async (req, res) => {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT}`);
    const data = await response.json();
    if (data.pairs?.[0]) {
      const p = data.pairs[0];
      res.json({
        ticker: p.baseToken.symbol,
        price: `$${parseFloat(p.priceUsd).toFixed(8)}`,
        marketCap: `$${Math.round(p.fdv)}`
      });
    } else {
      res.json({ ticker: 'NEW', marketCap: 'No data', price: '$0.00000000' });
    }
  } catch {
    res.json({ ticker: 'ERROR', marketCap: 'API Error', price: '$0.00000000' });
  }
};