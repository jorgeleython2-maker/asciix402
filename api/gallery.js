// api/gallery.js
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
module.exports = async (req, res) => {
  const adapter = new FileSync('/tmp/db.json');
  const db = low(adapter);
  db.defaults({ ascii: [] }).write();
  res.json(db.get('ascii').take(10).value());
};