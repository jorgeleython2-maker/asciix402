// api/token-info.js
const fetch = require('node-fetch');
const { DEV_WALLET, BITQUERY_API_KEY } = require('../config');

module.exports = async (req, res) => {
  let liveData = {
    ticker: 'UNKNOWN',
    price: '$0.00000000',
    marketCap: 'Detecting token...',
    volume24h: '$0',
    lastMint: null
  };

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
      body: JSON.stringify({ query })
    });
    const data = await response.json();

    let mint = null;
    if (data.data?.Solana?.Instructions?.[0]?.Instruction?.Accounts) {
      mint = data.data.Solana.Instructions[0].Instruction.Accounts.find(a => a.Address.length === 44)?.Address;
    }

    if (!mint) {
      liveData.marketCap = 'No token created recently';
      return res.json(liveData);
    }

    // DexScreener
    const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const dexData = await dexRes.json();

    if (dexData.pairs?.[0]) {
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
      liveData.lastMint = mint;
    }
  } catch (err) {
    console.error('Error:', err);
    liveData.marketCap = 'API Error';
  }

  res.json(liveData);
};