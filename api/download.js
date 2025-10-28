const fs = require('fs');

module.exports = async (req, res) => {
  const { id, format } = req.query;
  const file = `/tmp/${id}.json`;
  if (!fs.existsSync(file)) return res.status(404).send('Not found');

  const entry = JSON.parse(fs.readFileSync(file));

  if (format === 'txt') {
    res.set({ 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="ascii-${id}.txt"` });
    res.send(entry.ascii);
  } else {
    res.send(`
      <pre style="background:#000;color:#0f0;font-family:monospace;padding:20px;">
${entry.ascii.replace(/</g, '&lt;')}
      </pre>
      <p><a href="/api/download?id=${id}&format=txt" download>Download TXT</a></p>
      <p><small>TX: <a href="https://solscan.io/tx/${entry.tx}" target="_blank">${entry.tx?.slice(0,8)}...</a></small></p>
    `);
  }
};