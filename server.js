// server.js
const express = require('express');
const fetch = require('node-fetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// === TUS DATOS (MAINNET) ===
const PUMP_API_KEY = '9x7pwjube5wq0tagf5r34nb169mkjc9bdxj34v9m6n97ghk1a90n6x3ma58ppu37ct4q6j3qdthm2kbgb9gq8gk3cnb6pnhr6wt7mp33a59njt3p8d7k0e3nb1w4jrvm88nq8pauewyku9x77jka6adcpge1g8x2m2kad84e9nk6m3tegun6gtpcgt5crjmd4npajumcnvkuf8';
const TOKEN_MINT = '3uVFtitJozUMrsxakiqwitX1N3f2Vrc4KQT49Hucpump';
const TOKENS_REQUIRED = 1;
const SOL_TO_SPEND = 0.001;

// === DB ===
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ ascii: [], stats: { totalArts: 0 } }).write();

// === DATOS EN VIVO ===
let liveData = {
  ticker: 'PAYGATE',
  price: '$0.00000000',
  marketCap: 'Loading...',
  volume24h: '$0',
  lastTrade: null,
  updatedAt: null
};

// === DEXSCREENER: DATOS FIABLES (MC ARREGLADO CON FDV) ===
async function updateFromDexScreener() {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINT}`);
    const data = await res.json();

    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0]; // Pump.fun pair
      const price = parseFloat(pair.priceUsd || 0);
      const fdv = parseFloat(pair.fdv || 0); // FDV = MC para tokens como el tuyo

      liveData.ticker = pair.baseToken.symbol || 'PAYGATE';
      liveData.price = `$${price.toFixed(8)}`;
      liveData.marketCap = fdv > 0 
        ? (fdv > 1e6 ? `$${Math.round(fdv / 1e6)}M` : `$${Math.round(fdv)}`) 
        : 'No data';
      liveData.volume24h = pair.volume?.h24 ? `$${Math.round(pair.volume.h24)}` : '$0';
      liveData.updatedAt = new Date().toLocaleTimeString();

      console.log('Datos actualizados:', liveData);
    } else {
      liveData.marketCap = 'No pool detected';
    }
  } catch (err) {
    console.error('DexScreener error:', err.message);
    liveData.marketCap = 'API error';
  }
}

// === WEBSOCKET: TRADES EN VIVO ===
function startWebSocket() {
  const ws = new WebSocket('wss://pumpportal.fun/api/data');

  ws.on('open', () => {
    console.log('WebSocket conectado');
    ws.send(JSON.stringify({
      method: "subscribeTokenTrade",
      keys: [TOKEN_MINT]
    }));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.tokenTrade) {
        const t = msg.tokenTrade;
        liveData.lastTrade = `${t.side.toUpperCase()} $${t.solAmount.toFixed(3)} by ${t.maker.slice(0,6)}...`;
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'update', data: liveData }));
          }
        });
      }
    } catch (err) {
      console.error('WS error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket cerrado. Reconectando...');
    setTimeout(startWebSocket, 3000);
  });
}

// === WEBSOCKET SERVER ===
const server = app.listen(process.env.PORT || 3000);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', data: liveData }));
});

// === INICIAR ===
startWebSocket();
updateFromDexScreener();
setInterval(updateFromDexScreener, 15000);

// === APIs ===
app.get('/api/token-info', (req, res) => res.json(liveData));
app.get('/api/gallery', (req, res) => res.json(db.get('ascii').take(10).value()));

// === COMPRA + GUARDAR ===
app.post('/api/buy-and-save', async (req, res) => {
  const { ascii, wallet } = req.body;
  if (!ascii || !wallet) return res.status(400).json({ error: 'Missing ASCII or wallet' });

  try {
    const url = `https://pumpportal.fun/api/trade?api-key=${PUMP_API_KEY}&cluster=mainnet`;
    const trade = {
      action: 'buy',
      mint: TOKEN_MINT,
      amount: Math.floor(SOL_TO_SPEND * 1e9),
      denominatedInSol: 'true',
      slippage: 20,
      priorityFee: 0.0001,
      pool: 'auto'
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const id = Date.now().toString(36);
    db.get('ascii').push({ id, ascii, wallet, tx: result.signature, date: new Date().toISOString() }).write();
    db.update('stats.totalArts', n => n + 1).write();

    res.json({ success: true, downloadUrl: `/download/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === DESCARGA ===
app.get('/download/:id', (req, res) => {
  const entry = db.get('ascii').find({ id: req.params.id }).value();
  if (!entry) return res.status(404).send('Not found');
  res.send(`
    <!DOCTYPE html>
    <html><head><title>ASCII</title><style>
      body {font-family: monospace; background: #000; color: #0f0; text-align: center; padding: 40px;}
      pre {background: #111; padding: 20px; border: 2px solid #0f0; margin: 20px auto; max-width: 600px; white-space: pre-wrap;}
      button {background: #0f0; color: #000; padding: 12px; font-weight: bold; border: none; cursor: pointer;}
    </style></head><body>
      <h1>ASCII Ready</h1>
      <pre>${entry.ascii.replace(/</g, '&lt;')}</pre>
      <a href="/download/${entry.id}/file" download="ascii.txt"><button>Download .TXT</button></a>
      <p><small>Tx: <a href="https://solscan.io/tx/${entry.tx}?cluster=mainnet" target="_blank" style="color:#0f0;">View</a></small></p>
    </body></html>
  `);
});

app.get('/download/:id/file', (req, res) => {
  const entry = db.get('ascii').find({ id: req.params.id }).value();
  if (!entry) return res.status(404).send('Not found');
  res.set({ 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="ascii-${entry.id}.txt"` });
  res.send(entry.ascii);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));