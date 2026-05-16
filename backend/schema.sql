-- Schema for POS Parfum Refill

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT,
  size_ml INTEGER NOT NULL,
  concentration TEXT,
  price_cents INTEGER DEFAULT 0,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_entries (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  batch TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  source TEXT,
  FOREIGN KEY(variant_id) REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  product_menu_variant_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  ingredient_variant_id TEXT NOT NULL,
  qty_ml INTEGER NOT NULL,
  FOREIGN KEY(recipe_id) REFERENCES recipes(id),
  FOREIGN KEY(ingredient_variant_id) REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  total_cents INTEGER NOT NULL,
  paid_cents INTEGER NOT NULL,
  payment_method TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  user_id TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transaction_lines (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  waste_ml INTEGER DEFAULT 0,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id),
  FOREIGN KEY(variant_id) REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS waste_records (
  id TEXT PRIMARY KEY,
  transaction_id TEXT,
  variant_id TEXT,
  amount_ml INTEGER NOT NULL,
  reason TEXT,
  recorded_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  location TEXT
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  vendor_id TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  expected_at TEXT,
  FOREIGN KEY(vendor_id) REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS po_lines (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price_cents INTEGER,
  FOREIGN KEY(po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY(variant_id) REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS audit_trail (
  id TEXT PRIMARY KEY,
  entity TEXT,
  entity_id TEXT,
  action TEXT,
  changes TEXT,
  user_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
