// api/token-info.js
const fetch = require('node-fetch');
const { DEV_WALLET, BITQUERY_API_KEY } = require('../config');

module.exports = async (req, res) => {
  let liveData = {
    ticker: 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'Loading...',
    volume24h: '$0',
    lastMint: null
  };

  try {
    // 1. BitQuery para detectar mint
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

    const bitRes = await fetch('https://graphql.bitquery.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': BITQUERY_API_KEY },
      body: JSON.stringify({ query })
    });
    const bitData = await bitRes.json();

    let mint = null;
    if (bitData.data?.Solana?.Instructions?.[0]?.Instruction?.Accounts) {
      mint = bitData.data.Solana.Instructions[0].Instruction.Accounts.find(a => a.Address.length === 44)?.Address;
    }

    if (!mint) {
      liveData.marketCap = 'No token created';
      return res.json(liveData);
    }

    liveData.lastMint = mint;

    // 2. DexScreener con retry (3 intentos, 1s delay)
    let dexData = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        dexData = await dexRes.json();
        if (dexData.pairs && dexData.pairs.length > 0) break;
      } catch (err) {
        console.error(`DexScreener attempt ${attempt} failed:`, err.message);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000)); // 1s delay
      }
    }

    if (dexData && dexData.pairs && dexData.pairs.length > 0) {
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
  } catch (err) {
    console.error('Overall error:', err);
    liveData.marketCap = 'API Error';
  }

  res.json(liveData);
};