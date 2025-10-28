const fetch = require('node-fetch');
const { TOKEN_MINT } = require('../config');

module.exports = async (req, res) => {
  if (!TOKEN_MINT) {
    return res.json({ ticker: 'ERROR', marketCap: 'Add TOKEN_MINT in config.js', price: '$0.00000000' });
  }

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
        marketCap: fdv > 0 ? `$${Math.round(fdv)}` : 'N/A',
        volume24h: pair.volume?.h24 ? `$${Math.round(pair.volume.h24)}` : '$0'
      });
    } else {
      res.json({ ticker: 'TOKEN', marketCap: `Mint: ${TOKEN_MINT.slice(0,8)}...`, price: '$0.00000000' });
    }
  } catch (err) {
    res.json({ ticker: 'ERROR', marketCap: 'API Error', price: '$0.00000000' });
  }
};