// api/download.js
const fs = require('fs');
const { createCanvas } = require('canvas');

module.exports = async (req, res) => {
  const { id } = req.query;
  const file = `/tmp/${id}.json`;
  if (!fs.existsSync(file)) return res.status(404).send('Not found');

  const entry = JSON.parse(fs.readFileSync(file));

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 800, 600);
  ctx.fillStyle = 'lime';
  ctx.font = '16px "Courier New"';
  entry.ascii.split('\n').forEach((line, i) => ctx.fillText(line, 20, 50 + i * 20));

  const buffer = canvas.toBuffer('image/jpeg');
  res.set({ 'Content-Type': 'image/jpeg', 'Content-Disposition': `attachment; filename="ascii-${id}.jpg"` });
  res.send(buffer);
};