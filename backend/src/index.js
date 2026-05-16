const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { getDb, initDb } = require('./db');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

// Serve simple frontend static files
app.use('/static', express.static(path.join(__dirname, '..', 'frontend')));

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

// Products CRUD
app.get('/api/products', (req, res) => {
  const db = getDb();
  try {
    const products = db.prepare('SELECT * FROM products').all();
    const variantsStmt = db.prepare('SELECT * FROM variants WHERE product_id = ?');
    const result = products.map(p => ({ ...p, variants: variantsStmt.all(p.id) }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const db = getDb();
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const variants = db.prepare('SELECT * FROM variants WHERE product_id = ?').all(id);
    res.json({ ...product, variants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.post('/api/products', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = crypto.randomUUID();
  const db = getDb();
  try {
    db.prepare('INSERT INTO products (id, name, description) VALUES (?, ?, ?)').run(id, name, description || null);
    res.status(201).json({ id, name, description: description || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.put('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const { name, description } = req.body;
  const db = getDb();
  try {
    const info = db.prepare('UPDATE products SET name = ?, description = ? WHERE id = ?').run(name, description || null, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Product not found' });
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.delete('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const db = getDb();
  try {
    const deleteVariants = db.prepare('DELETE FROM variants WHERE product_id = ?');
    const deleteProduct = db.prepare('DELETE FROM products WHERE id = ?');
    const del = db.transaction(() => {
      deleteVariants.run(id);
      const info = deleteProduct.run(id);
      return info;
    });
    const info = del();
    if (info.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

// Variants CRUD
app.get('/api/variants', (req, res) => {
  const db = getDb();
  try {
    const variants = db.prepare('SELECT * FROM variants').all();
    res.json(variants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.get('/api/variants/:id', (req, res) => {
  const id = req.params.id;
  const db = getDb();
  try {
    const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(id);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    res.json(variant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.post('/api/variants', (req, res) => {
  const { product_id, sku, size_ml, concentration, price_cents } = req.body;
  if (!product_id || !size_ml) return res.status(400).json({ error: 'product_id and size_ml are required' });
  const id = crypto.randomUUID();
  const db = getDb();
  try {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(400).json({ error: 'product_id does not exist' });
    db.prepare('INSERT INTO variants (id, product_id, sku, size_ml, concentration, price_cents) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, product_id, sku || null, size_ml, concentration || null, price_cents || 0);
    const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(id);
    res.status(201).json(variant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.put('/api/variants/:id', (req, res) => {
  const id = req.params.id;
  const { sku, size_ml, concentration, price_cents } = req.body;
  const db = getDb();
  try {
    const info = db.prepare('UPDATE variants SET sku = ?, size_ml = ?, concentration = ?, price_cents = ? WHERE id = ?')
      .run(sku || null, size_ml, concentration || null, price_cents || 0, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Variant not found' });
    const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(id);
    res.json(variant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.delete('/api/variants/:id', (req, res) => {
  const id = req.params.id;
  const db = getDb();
  try {
    const info = db.prepare('DELETE FROM variants WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Variant not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

// Stock endpoints
app.get('/api/stock_entries', (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT * FROM stock_entries ORDER BY received_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.get('/api/stock_entries/:id', (req, res) => {
  const id = req.params.id;
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM stock_entries WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Stock entry not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.get('/api/stock/variant/:variant_id', (req, res) => {
  const variant_id = req.params.variant_id;
  const db = getDb();
  try {
    const total = db.prepare('SELECT SUM(qty) as qty FROM stock_entries WHERE variant_id = ?').get(variant_id);
    res.json({ variant_id, qty: total.qty || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

app.post('/api/stock_entries', (req, res) => {
  const { variant_id, qty, batch, source } = req.body;
  if (!variant_id || typeof qty !== 'number') return res.status(400).json({ error: 'variant_id and numeric qty are required' });
  const id = crypto.randomUUID();
  const db = getDb();
  try {
    const variant = db.prepare('SELECT id FROM variants WHERE id = ?').get(variant_id);
    if (!variant) return res.status(400).json({ error: 'variant_id does not exist' });
    db.prepare('INSERT INTO stock_entries (id, variant_id, qty, batch, source) VALUES (?, ?, ?, ?, ?)')
      .run(id, variant_id, qty, batch || null, source || 'manual');
    const entry = db.prepare('SELECT * FROM stock_entries WHERE id = ?').get(id);
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

// Stock adjustments (manual corrections) - creates negative/positive stock_entries and logs audit
app.post('/api/stock_adjustments', (req, res) => {
  const { variant_id, qty, reason, user_id } = req.body;
  if (!variant_id || typeof qty !== 'number' || !reason) return res.status(400).json({ error: 'variant_id, numeric qty and reason are required' });
  const id = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const db = getDb();
  try {
    const variant = db.prepare('SELECT id FROM variants WHERE id = ?').get(variant_id);
    if (!variant) return res.status(400).json({ error: 'variant_id does not exist' });
    const insert = db.prepare('INSERT INTO stock_entries (id, variant_id, qty, batch, source) VALUES (?, ?, ?, ?, ?)');
    const insertAudit = db.prepare('INSERT INTO audit_trail (id, entity, entity_id, action, changes, user_id) VALUES (?, ?, ?, ?, ?, ?)');
    const tx = db.transaction(() => {
      insert.run(id, variant_id, qty, null, 'adjustment');
      insertAudit.run(auditId, 'stock_entries', id, 'adjustment', JSON.stringify({ qty, reason }), user_id || null);
    });
    tx();
    const entry = db.prepare('SELECT * FROM stock_entries WHERE id = ?').get(id);
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally { db.close(); }
});

module.exports = app;

// Start server when run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening on ${port}`));
}
