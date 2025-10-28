// server.js
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json()); // ← Para POST
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;