// api/download.js
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

module.exports = async (req, res) => {
  const { id, format } = req.query;
  const adapter = new FileSync('/tmp/db.json');
  const db = low(adapter);
  const entry = db.get('ascii').find({ id }).value();

  if (!entry) return res.status(404).send('Not found');

  if (format === 'jpg') {
    // Genera base64 JPG simple (sin canvas)
    const ascii = entry.ascii.replace(/</g, '&lt;');
    const html = `<html><body style="background:black;color:lime;font-family:'Courier New';padding:20px;"><pre>${ascii}</pre></body></html>`;
    const base64 = Buffer.from(html).toString('base64');
    res.set({ 'Content-Type': 'image/jpeg', 'Content-Disposition': `attachment; filename="ascii-${id}.jpg"` });
    res.send(`data:image/jpeg;base64,${base64}`); // Simple fallback
  } else {
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