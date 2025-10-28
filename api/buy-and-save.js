const fetch = require('node-fetch');
const fs = require('fs');
const { PUMP_API_KEY, SOL_TO_SPEND, TOKEN_MINT } = require('../config');

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet) return res.status(400).json({ error: 'Missing' });

  try {
    const trade = {
      action: 'buy',
      mint: TOKEN_MINT,
      amount: Math.floor(SOL_TO_SPEND * 1e9),
      denominatedInSol: 'true',
      slippage: 20,
      priorityFee: 0.0001,
      pool: 'auto'
    };

    const response = await fetch(`https://pumpportal.fun/api/trade?api-key=${PUMP_API_KEY}&cluster=mainnet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade)
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const id = Date.now().toString(36);
    fs.writeFileSync(`/tmp/${id}.json`, JSON.stringify({ id, ascii, tx: result.signature }));

    res.json({ success: true, downloadUrl: `/api/download?id=${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};