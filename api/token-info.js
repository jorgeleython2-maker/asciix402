// api/token-info.js
const fetch = require('node-fetch');
const { DEV_WALLET } = require('../config');

module.exports = async (req, res) => {
  let liveData = {
    ticker: 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'No token found',
    volume24h: '$0',
    lastTrade: null
  };

  try {
    // 1. Buscar tokens creados por la wallet en Pump.fun
    const pumpRes = await fetch(`https://pumpportal.fun/api/data/creator-tokens?creator=${DEV_WALLET}`);
    const pumpData = await pumpRes.json();

    if (!pumpData || pumpData.length === 0) {
      return res.json(liveData);
    }

    const token = pumpData[0]; // El más reciente
    const mint = token.mint;

    // 2. Obtener datos en vivo de DexScreener
    const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const dexData = await dexRes.json();

    if (dexData.pairs && dexData.pairs.length > 0) {
      const pair = dexData.pairs[0];
      const price = parseFloat(pair.priceUsd || 0);
      const fdv = parseFloat(pair.fdv || 0);

      liveData = {
        ticker: pair.baseToken.symbol || 'TOKEN',
        price: `$${price.toFixed(8)}`,
        marketCap: fdv > 0 ? (fdv > 1e6 ? `$${Math.round(fdv / 1e6)}M` : `$${Math.round(fdv)}`) : 'N/A',
        volume24h: pair.volume?.h24 ? `$${Math.round(pair.volume.h24)}` : '$0',
        lastTrade: null,
        mint: mint
      };
    } else {
      liveData.ticker = token.symbol || 'TOKEN';
      liveData.mint = mint;
    }
  } catch (err) {
    console.error('Error detecting token:', err);
  }

  res.json(liveData);
};