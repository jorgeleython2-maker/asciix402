// api/buy-and-save.js
const fetch = require('node-fetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { PUMP_API_KEY, SOL_TO_SPEND, TOKEN_MINT, POOL } = require('../config');

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet || !TOKEN_MINT) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    const tradeUrl = `https://pumpportal.fun/api/trade?api-key=${PUMP_API_KEY}&cluster=mainnet`;
    const trade = {
      action: 'buy',
      mint: TOKEN_MINT, // ← Usa el mint de config.js
      amount: Math.floor(SOL_TO_SPEND * 1e9),
      denominatedInSol: 'true',
      slippage: 20,
      priorityFee: 0.0001,
      pool: POOL // ← Pool correcto
    };

    const response = await fetch(tradeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const adapter = new FileSync('/tmp/db.json');
    const db = low(adapter);
    db.defaults({ ascii: [] }).write();
    const id = Date.now().toString(36);
    db.get('ascii').push({ id, ascii, wallet, tx: result.signature, mint: TOKEN_MINT }).write();

    res.json({ success: true, downloadUrl: `/api/download?id=${id}&format=jpg` }); // ← Redirige a JPG
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};