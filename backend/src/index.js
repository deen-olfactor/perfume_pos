const express = require('express');
const bodyParser = require('body-parser');
const { initDb } = require('./db');

const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

app.post('/api/init-db', (req, res) => {
  try {
    initDb();
    return res.json({ ok: true, message: 'DB initialized' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
