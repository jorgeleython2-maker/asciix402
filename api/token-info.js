// api/token-info.js
const fetch = require('node-fetch');
const { DEV_WALLET, BITQUERY_API_KEY } = require('../config');

// Cache en memoria (Vercel serverless)
let cache = {
  mint: null,
  data: null,
  timestamp: 0
};
const CACHE_TTL = 60 * 1000; // 1 minuto

module.exports = async (req, res) => {
  let liveData = {
    ticker: 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'Loading...',
    volume24h: '$0',
    lastMint: null
  };

  try {
    // 1. Usar cache si es reciente
    if (cache.timestamp > Date.now() - CACHE_TTL && cache.mint) {
      liveData = cache.data;
      return res.json(liveData);
    }

    // 2. Detectar mint con BitQuery (retry 3 veces)
    let mint = null;
    for (let i = 0; i < 3; i++) {
      try {
        const query = `
          query {
            Solana(network: solana) {
              Instructions(
                where: {
                  Instruction: { Program: { Address: { is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" } }, Method: { is: "create" } }
                  Transaction: { Signer: { is: "${DEV_WALLET}" } }
                }
                orderBy: { descendingByField: "Block_Time" }
                limit: { count: 1 }
              ) {
                Instruction { Accounts { Address } }
              }
            }
          }
        `;

        const response = await fetch('https://graphql.bitquery.io', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': BITQUERY_API_KEY },
          body: JSON.stringify({ query }),
          timeout: 8000
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data.data?.Solana?.Instructions?.[0]?.Instruction?.Accounts) {
          mint = data.data.Solana.Instructions[0].Instruction.Accounts.find(a => a.Address.length === 44)?.Address;
          break;
        }
      } catch (err) {
        console.error(`BitQuery attempt ${i + 1} failed:`, err.message);
        if (i === 2) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!mint) {
      liveData.marketCap = 'No token created';
      return res.json(liveData);
    }

    liveData.lastMint = mint;

    // 3. DexScreener con retry
    let dexData = null;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { timeout: 8000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        dexData = await response.json();
        if (dexData.pairs?.length > 0) break;
      } catch (err) {
        console.error(`DexScreener attempt ${i + 1} failed:`, err.message);
        if (i === 2) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (dexData?.pairs?.[0]) {
      const pair = dexData.pairs[0];
      const price = parseFloat(pair.priceUsd || 0);
      const fdv = parseFloat(pair.fdv || 0);

      liveData = {
        ticker: pair.baseToken.symbol || 'TOKEN',
        price: `$${price.toFixed(8)}`,
        marketCap: fdv > 0 ? (fdv > 1e6 ? `$${Math.round(fdv / 1e6)}M` : `$${Math.round(fdv)}`) : 'N/A',
        volume24h: pair.volume?.h24 ? `$${Math.round(pair.volume.h24)}` : '$0',
        lastMint: mint
      };
    } else {
      liveData.marketCap = `Mint: ${mint.slice(0,8)}...`;
    }

    // 4. Guardar en cache
    cache = { mint, data: liveData, timestamp: Date.now() };

  } catch (err) {
    console.error('Final error:', err);
    liveData.marketCap = 'API Error';
  }

  res.json(liveData);
};