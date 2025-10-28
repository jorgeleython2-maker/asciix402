// api/buy-and-save.js
const fetch = require('node-fetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { PUMP_API_KEY, SOL_TO_SPEND, DEV_WALLET, HELIUS_API_KEY } = require('../config');

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet) return res.status(400).json({ error: 'Missing data' });

  try {
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const sigRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [DEV_WALLET, { limit: 20 }]
    })});
    const sigData = await sigRes.json();

    let mint = null;
    if (sigData.result && sigData.result.length > 0) {
      const signatures = sigData.result.map(s => s.signature);
      const txRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getParsedTransactions', params: [signatures, { encoding: 'jsonParsed' }]
      })});
      const txData = await txRes.json();

      for (const tx of txData.result || []) {
        if (tx && tx.meta && tx.meta.logMessages) {
          const mintLog = tx.meta.logMessages.find(l => l.includes('Mint: '));
          if (mintLog) {
            mint = mintLog.split('Mint: ')[1].split(' ')[0];
            break;
          }
        }
      }
    }

    if (!mint) throw new Error('No Pump.fun trade found');

    // Comprar
    const tradeUrl = `https://pumpportal.fun/api/trade?api-key=${PUMP_API_KEY}&cluster=mainnet`;
    const trade = { action: 'buy', mint, amount: Math.floor(SOL_TO_SPEND * 1e9), denominatedInSol: 'true', slippage: 20, priorityFee: 0.0001, pool: 'auto' };
    const response = await fetch(tradeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    // Guardar
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