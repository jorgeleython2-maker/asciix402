// api/gallery.js
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  try {
    const entries = await kv.lrange('ascii', 0, -1);
    const arts = entries.slice(-10).map(e => JSON.parse(e)); // Últimos 10
    res.json(arts);
  } catch (err) {
    res.json([]);
  }
};