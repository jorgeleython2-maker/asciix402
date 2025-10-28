const fs = require('fs');

module.exports = async (req, res) => {
  const { id, tx } = req.body;
  const file = `/tmp/${id}.json`;
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });

  const entry = JSON.parse(fs.readFileSync(file));
  entry.tx = tx;
  fs.writeFileSync(file, JSON.stringify(entry));

  res.json({ success: true });
};