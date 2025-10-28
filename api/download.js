// api/download.js
const fs = require('fs');

module.exports = async (req, res) => {
  const { id } = req.query;
  const file = `/tmp/${id}.json`;
  if (!fs.existsSync(file)) return res.status(404).send('Not found');

  const entry = JSON.parse(fs.readFileSync(file));
  if (req.query.format === 'txt') {
    res.set({ 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="ascii-${id}.txt"` });
    res.send(entry.ascii);
  } else {
    res.send(`
      <pre style="background:#000;color:#0f0;font-family:monospace;padding:20px;">
${entry.ascii}
      </pre>
      <a href="/api/download?id=${id}&format=txt" download>Download TXT</a>
    `);
  }
};