// api/buy-and-save.js
const fetch = require('node-fetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { PUMP_API_KEY, SOL_TO_SPEND, DEV_WALLET, BITQUERY_API_KEY } = require('../config');

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet) return res.status(400).json({ error: 'Missing data' });

  let mint = null;

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

    if (data.data?.Solana?.Instructions?.[0]?.Instruction?.Accounts) {
      mint = data.data.Solana.Instructions[0].Instruction.Accounts.find(a => a.Address.length === 44)?.Address;
    }
  } catch (err) {
    console.error('Mint detection error:', err);
  }

  if (!mint) return res.status(500).json({ error: 'No token mint found' });

  try {
    const tradeUrl = `https://pumpportal.fun/api/trade?api-key=${PUMP_API_KEY}&cluster=mainnet`;
    const trade = {
      action: 'buy',
      mint,
      amount: Math.floor(SOL_TO_SPEND * 1e9),
      denominatedInSol: 'true',
      slippage: 20,
      priorityFee: 0.0001,
      pool: 'auto'
    };

    const response = await fetch(tradeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const adapter = new FileSync('/tmp/db.json');
    const db = low(adapter);
    db.defaults({ ascii: [] }).write();
    const id = Date.now().toString(36);
    db.get('ascii').push({ id, ascii, wallet, tx: result.signature, devWallet: DEV_WALLET, mint }).write();

    res.json({ success: true, downloadUrl: `/api/download?id=${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};