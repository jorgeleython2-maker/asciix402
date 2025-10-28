// api/buy-and-save.js
const fetch = require('node-fetch');
const Redis = require('@upstash/redis');
const { PUMP_API_KEY, SOL_TO_SPEND, TOKEN_MINT } = require('../config');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet || !TOKEN_MINT) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    const tradeUrl = `https://pumpportal.fun/api/trade?api-key=${PUMP_API_KEY}&cluster=mainnet`;
    const trade = {
      action: 'buy',
      mint: TOKEN_MINT,
      amount: Math.floor(SOL_TO_SPEND * 1e9),
      denominatedInSol: 'true',
      slippage: 20,
      priorityFee: 0.0001,
      pool: 'auto'
    };

    const response = await fetch(tradeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const id = Date.now().toString(36);
    const entry = { id, ascii, wallet, tx: result.signature, mint: TOKEN_MINT };

    await redis.set(`ascii:${id}`, JSON.stringify(entry));

    res.json({ success: true, downloadUrl: `/api/download?id=${id}&format=jpg` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};