#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:3000}
LOG=/tmp/perfume_pos_test.log

# Start server in background
node backend/src/index.js > "$LOG" 2>&1 &
SERVER_PID=$!
trap 'echo "Killing server $SERVER_PID"; kill $SERVER_PID >/dev/null 2>&1 || true' EXIT

# wait for health
for i in {1..20}; do
  if curl -s "$BASE_URL/health" | grep -q '"ok"'; then
    echo "Server healthy"
    break
  fi
  sleep 0.5
done

# init db
echo "Initializing DB..."
init_resp=$(curl -s -X POST "$BASE_URL/api/init-db")
echo "$init_resp"
if ! echo "$init_resp" | grep -q '"ok"'; then
  echo "init-db failed"; exit 2
fi

# create product
echo "Creating product..."
prod_resp=$(curl -s -H "Content-Type: application/json" -d '{"name":"TEST_PRODUCT","description":"for local test"}' "$BASE_URL/api/products")
prod_id=$(echo "$prod_resp" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p')
if [ -z "$prod_id" ]; then echo "create product failed: $prod_resp"; exit 3; fi
echo "Product id: $prod_id"

# create variant
echo "Creating variant..."
var_resp=$(curl -s -H "Content-Type: application/json" -d "{\"product_id\":\"$prod_id\", \"size_ml\":100, \"price_cents\":10000}" "$BASE_URL/api/variants")
var_id=$(echo "$var_resp" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p')
if [ -z "$var_id" ]; then echo "create variant failed: $var_resp"; exit 4; fi
echo "Variant id: $var_id"

# add stock
echo "Adding stock..."
stock_resp=$(curl -s -H "Content-Type: application/json" -d "{\"variant_id\":\"$var_id\", \"qty\":100}" "$BASE_URL/api/stock_entries")
stock_id=$(echo "$stock_resp" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p')
if [ -z "$stock_id" ]; then echo "create stock failed: $stock_resp"; exit 5; fi

echo "Stock entry id: $stock_id"

# check aggregated stock
echo "Checking stock total..."
stock_total=$(curl -s "$BASE_URL/api/stock/variant/$var_id" | sed -n 's/.*"qty"[[:space:]]*:[[:space:]]*\([0-9]\+\).*/\1/p')
if [ -z "$stock_total" ]; then echo "failed to get stock total"; exit 6; fi

if [ "$stock_total" -lt 1 ]; then echo "stock total unexpected: $stock_total"; exit 7; fi

echo "Stock total: $stock_total"

echo "All local tests passed. Logs at $LOG"

# cleanup
kill $SERVER_PID || true
trap - EXIT
exit 0
