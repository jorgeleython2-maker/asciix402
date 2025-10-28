const fs = require('fs');
const { createCanvas } = require('canvas');

module.exports = async (req, res) => {
  const { id } = req.query;

  try {
    const entryFile = `/tmp/${id}.json`;
    if (!fs.existsSync(entryFile)) return res.status(404).send('Not found');

    const entry = JSON.parse(fs.readFileSync(entryFile, 'utf8'));

    if (req.query.format === 'jpg') {
      const canvas = createCanvas(800, 600);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = 'lime';
      ctx.font = '16px Courier New';
      const lines = entry.ascii.split('\n');
      lines.forEach((line, i) => ctx.fillText(line, 20, 50 + i * 20));

      const buffer = canvas.toBuffer('image/jpeg');
      res.set({ 'Content-Type': 'image/jpeg', 'Content-Disposition': `attachment; filename="ascii-${id}.jpg"` });
      res.send(buffer);
    } else {
      res.send(`
        <pre style="background:#000;color:#0f0;font-family:monospace;padding:20px;">${entry.ascii}</pre>
        <a href="/api/download?id=${id}&format=jpg" download>Download JPG</a>
      `);
    }
  } catch (err) {
    res.status(500).send('Error');
  }
};