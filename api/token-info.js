const fetch = require('node-fetch');
const { TOKEN_MINT } = require('../config');

module.exports = async (req, res) => {
  if (!TOKEN_MINT) return res.json({ ticker: 'ERROR', marketCap: 'Add TOKEN_MINT', price: '$0.00000000' });

  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT}`);
    const d = await r.json();
    if (d.pairs?.[0]) {
      const p = d.pairs[0];
      const price = parseFloat(p.priceUsd || 0);
      const fdv = parseFloat(p.fdv || 0);
      res.json({
        ticker: p.baseToken.symbol || 'TOKEN',
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