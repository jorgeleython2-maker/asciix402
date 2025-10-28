// api/buy-and-save.js
const fetch = require('node-fetch');
const fs = require('fs');
const { PUMP_API_KEY, SOL_TO_SPEND, TOKEN_MINT, RPC_URL } = require('../config');

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet || !TOKEN_MINT) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    // 1. Generar TX con trade-local
    const tradeUrl = `https://pumpportal.fun/api/trade-local?api-key=${PUMP_API_KEY}`;
    const trade = {
      publicKey: wallet,
      action: 'buy',
      mint: TOKEN_MINT,
      amount: Math.floor(SOL_TO_SPEND * 1e9),
      denominatedInSol: 'true',
      slippage: 20,
      priorityFee: 0.0005,
      pool: 'auto'
    };

    const response = await fetch(tradeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade)
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const txBase64 = result.tx; // TX en base64
    const id = Date.now().toString(36);

    // 2. Guardar ASCII + TX
    fs.writeFileSync(`/tmp/${id}.json`, JSON.stringify({ id, ascii, tx: txBase64, wallet }));

    res.json({ success: true, txBase64, id, downloadUrl: `/api/download?id=${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};