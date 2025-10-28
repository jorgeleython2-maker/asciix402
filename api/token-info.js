// api/token-info.js
const fetch = require('node-fetch');
const { DEV_WALLET, HELIUS_API_KEY } = require('../config');

module.exports = async (req, res) => {
  let liveData = {
    ticker: 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'Detecting last Pump.fun trade...',
    volume24h: '$0',
    lastMint: null
  };

  try {
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    
    // 1. Obtener firmas recientes
    const sigRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [DEV_WALLET, { limit: 20 }]
      })
    });
    const sigData = await sigRes.json();

    if (!sigData.result || sigData.result.length === 0) {
      liveData.marketCap = 'No transactions';
      return res.json(liveData);
    }

    const signatures = sigData.result.map(s => s.signature);

    // 2. Obtener detalles de tx
    const txRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getParsedTransactions',
        params: [signatures, { encoding: 'jsonParsed', commitment: 'confirmed' }]
      })
    });
    const txData = await txRes.json();

    // 3. Buscar último trade en Pump.fun
    const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
    let lastMint = null;

    for (const tx of txData.result || []) {
      if (tx && tx.meta && tx.meta.logMessages) {
        for (const log of tx.meta.logMessages) {
          // Pump.fun logs: "Program 6EF8... invoke [1]" y luego "Mint: <mint>"
          if (log.includes(PUMP_PROGRAM)) {
            const mintMatch = tx.meta.logMessages.find(l => l.includes('Mint: '));
            if (mintMatch) {
              lastMint = mintMatch.split('Mint: ')[1].split(' ')[0];
              break;
            }
          }
        }
        if (lastMint) break;
      }
    }

    if (!lastMint) {
      liveData.marketCap = 'No Pump.fun trade found';
      return res.json(liveData);
    }

    // 4. Datos de DexScreener
    const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${lastMint}`);
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
        lastMint: lastMint
      };
    } else {
      liveData.marketCap = `Mint: ${lastMint.slice(0,8)}...`;
      liveData.lastMint = lastMint;
    }
  } catch (err) {
    console.error('Error:', err);
    liveData.marketCap = 'RPC Error';
  }

  res.json(liveData);
};