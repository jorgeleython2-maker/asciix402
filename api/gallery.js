const fs = require('fs');
module.exports = async (req, res) => {
  const dir = '/tmp';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).slice(-10).map(f => JSON.parse(fs.readFileSync(dir + '/' + f)));
  res.json(files);
};