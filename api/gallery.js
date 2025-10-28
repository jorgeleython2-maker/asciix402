// api/gallery.js
const fs = require('fs');
module.exports = async (req, res) => {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).slice(-10);
  const arts = files.map(f => JSON.parse(fs.readFileSync(`${dir}/${f}`)));
  res.json(arts);
};