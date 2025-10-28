// api/download.js
const fs = require('fs');

module.exports = async (req, res) => {
  const { id } = req.query;
  const file = `/tmp/${id}.json`;
  if (!fs.existsSync(file)) return res.status(404).send('Not found');

  const entry = JSON.parse(fs.readFileSync(file));
  res.send(`
    <pre style="background:#000;color:#0f0;font-family:monospace;padding:20px;">
${entry.ascii.replace(/</g, '&lt;')}
    </pre>
    <p><a href="data:text/plain;base64,${Buffer.from(entry.ascii).toString('base64')}" download="ascii-${id}.txt">Download TXT</a></p>
  `);
};