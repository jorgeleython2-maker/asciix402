// api/buy-and-save.js
const fetch = require('node-fetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { PUMP_API_KEY, DEV_WALLET, SOL_TO_SPEND } = require('../config');

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet) return res.status(400).json({ error: 'Missing data' });

  try {
    // 1. Detectar el token más reciente del dev
    const pumpRes = await fetch(`https://pumpportal.fun/api/data/creator-tokens?creator=${DEV_WALLET}`);
    const tokens = await pumpRes.json();
    if (!tokens || tokens.length === 0) throw new Error('No token found for this wallet');

    const mint = tokens[0].mint;

    // 2. Comprar
    const url = `https://pumpportal.fun/api/trade?api-key=${PUMP_API_KEY}&cluster=mainnet`;
    const trade = {
      action: 'buy',
      mint,
      amount: Math.floor(SOL_TO_SPEND * 1e9),
      denominatedInSol: 'true',
      slippage: 20,
      priorityFee: 0.0001,
      pool: 'auto'
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    // 3. Guardar
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