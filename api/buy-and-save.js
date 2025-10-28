// api/buy-and-save.js
const fetch = require('node-fetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { PUMP_API_KEY, SOL_TO_SPEND, DEV_WALLET, HELIUS_API_KEY } = require('../config');

module.exports = async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet) return res.status(400).json({ error: 'Missing data' });

  try {
    // Detectar último mint creado (mismo código)
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const payload1 = { jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [DEV_WALLET, { limit: 20 }] };
    const txRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload1) });
    const txData = await txRes.json();

    let mint = null;
    if (txData.result && txData.result.length > 0) {
      const signatures = txData.result.map(sig => sig.signature);
      const payload2 = { jsonrpc: '2.0', id: 1, method: 'getParsedTransactions', params: [signatures, { encoding: 'jsonParsed' }] };
      const detailsRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload2) });
      const detailsData = await detailsRes.json();

      for (const tx of detailsData.result || []) {
        if (tx && tx.transaction && tx.transaction.message && tx.transaction.message.instructions) {
          for (const instr of tx.transaction.message.instructions) {
            if (instr.programId === 'TokenkegQfeZyiNwAJbNbGKLsK' && instr.parsed && instr.parsed.type === 'initializeMint') {
              mint = instr.parsed.info.mint;
              break;
            }
          }
          if (mint) break;
        }
      }
    }

    if (!mint) throw new Error('No token creation found');

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