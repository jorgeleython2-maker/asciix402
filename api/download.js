// api/download.js
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
module.exports = async (req, res) => {
  const { id } = req.query;
  const adapter = new FileSync('/tmp/db.json');
  const db = low(adapter);
  const entry = db.get('ascii').find({ id }).value();
  if (!entry) return res.status(404).send('Not found');
  if (req.query.file) {
    res.set({ 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="ascii-${id}.txt"` });
    res.send(entry.ascii);
  } else {
    res.send(`<pre>${entry.ascii.replace(/</g, '&lt;')}</pre><a href="/api/download?id=${id}&file=1">Download</a>`);
  }
};