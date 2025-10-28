// api/token-info.js
const fetch = require('node-fetch');
const { DEV_WALLET, BITQUERY_API_KEY } = require('../config');

let cache = { mint: null, data: null, timestamp: 0 };
const CACHE_TTL = 60000; // 1 min

module.exports = async (req, res) => {
  const defaultData = {
    ticker: 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'Loading...',
    volume24h: '$0',
    lastMint: null
  };

  try {
    // Cache
    if (cache.timestamp > Date.now() - CACHE_TTL && cache.mint) {
      return res.json(cache.data);
    }

    // BitQuery con retry
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
        if (i === 2) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!mint) {
      defaultData.marketCap = 'No token created';
      return res.json(defaultData);
    }

    // DexScreener
    let dexData = null;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { timeout: 8000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        dexData = await response.json();
        if (dexData.pairs?.length > 0) break;
      } catch (err) {
        if (i === 2) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    let liveData = defaultData;
    if (dexData?.pairs?.[0]) {
      const pair = dexData.pairs[0];
      const price = parseFloat(pair.priceUsd || 0);
      const fdv = parseFloat(pair.fdv || 0);

      liveData = {
        ticker: pair.baseToken.symbol || 'TOKEN',
        price: `$${price.toFixed(8)}`,
        marketCap: fdv > 0 ? (fdv > 1e6 ? `$${Math.round(fdv / 1e6)}M` : `$${Math.round(fdv)}`) : 'N/A',
        volume24h: pair.volume?.h24 ? `$${Math.round(pair.volume.h24)}` : '$Glitches0',
        lastMint: mint
      };
    } else {
      liveData.marketCap = `Mint: ${mint.slice(0,8)}...`;
      liveData.lastMint = mint;
    }

    cache = { mint, data: liveData, timestamp: Date.now() };
    res.json(liveData);

  } catch (err) {
    console.error('Error:', err);
    defaultData.marketCap = 'API Error';
    res.json(defaultData);
  }
};