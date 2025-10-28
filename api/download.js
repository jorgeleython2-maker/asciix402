// api/download.js
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { createCanvas, loadImage } = require('canvas'); // npm install canvas
const fs = require('fs');

module.exports = async (req, res) => {
  const { id, format } = req.query;
  const adapter = new FileSync('/tmp/db.json');
  const db = low(adapter);
  const entry = db.get('ascii').find({ id }).value();

  if (!entry) return res.status(404).send('Not found');

  if (format === 'jpg') {
    // Genera JPG del ASCII
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = 'lime';
    ctx.font = '14px Courier New';
    const lines = entry.ascii.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, 20, 40 + i * 20));

    const buffer = canvas.toBuffer('image/jpeg');
    res.set({ 'Content-Type': 'image/jpeg', 'Content-Disposition': `attachment; filename="ascii-${id}.jpg"` });
    res.send(buffer);
  } else {
    // Vista HTML
    res.send(`
      <!DOCTYPE html>
      <html><head><title>ASCII Ready</title><style>
        body {font-family:monospace;background:#000;color:#0f0;text-align:center;padding:40px;}
        pre {background:#111;padding:20px;border:2px solid #0f0;margin:20px auto;max-width:600px;white-space:pre-wrap;}
        a {color:#0f0;text-decoration:none;}
      </style></head><body>
        <h1>ASCII Ready</h1>
        <pre>${entry.ascii.replace(/</g, '&lt;')}</pre>
        <a href="/api/download?id=${id}&format=jpg" download>Download JPG</a>
      </body></html>
    `);
  }
};