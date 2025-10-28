// api/token-info.js
const fetch = require('node-fetch');
const { DEV_WALLET, HELIUS_API_KEY } = require('../config');

module.exports = async (req, res) => {
  let liveData = {
    ticker: 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'Detecting last trade...',
    volume24h: '$0',
    lastTrade: null
  };

  try {
    // 1. Obtener firmas recientes (últimas 10 tx)
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const payload1 = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [DEV_WALLET, { limit: 10 }]
    };
    const txRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload1)
    });
    const txData = await txRes.json();

    if (txData.result && txData.result.length > 0) {
      const signatures = txData.result.map(sig => sig.signature);

      // 2. Obtener detalles de tx
      const payload2 = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getParsedTransactions',
        params: [signatures, { encoding: 'jsonParsed', commitment: 'confirmed' }]
      };
      const detailsRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2)
      });
      const detailsData = await detailsRes.json();

      // 3. Buscar último trade en Pump.fun
      const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
      let lastMint = null;
      for (const tx of detailsData.result || []) {
        if (tx && tx.transaction && tx.transaction.message && tx.transaction.message.instructions) {
          for (const instr of tx.transaction.message.instructions) {
            if (instr.programId && instr.programId.toString() === PUMP_PROGRAM) {
              if (instr.parsed && instr.parsed.type === 'transfer' && instr.parsed.info && instr.parsed.info.mint) {
                lastMint = instr.parsed.info.mint;
                break;
              }
            }
          }
          if (lastMint) break;
        }
      }

      if (lastMint) {
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
            lastTrade: `Last trade mint: ${lastMint.slice(0,8)}...`,
            mint: lastMint
          };
        } else {
          liveData.lastTrade = `Last mint: ${lastMint.slice(0,8)}...`;
          liveData.mint = lastMint;
        }
      } else {
        liveData.marketCap = 'No recent Pump.fun trades found';
      }
    } else {
      liveData.marketCap = 'No recent transactions';
    }
  } catch (err) {
    console.error('Detection error:', err);
    liveData.marketCap = 'RPC Error';
  }

  res.json(liveData);
};