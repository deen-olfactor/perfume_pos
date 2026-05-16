const request = require('supertest');
const app = require('../src/index');

describe('API integration', () => {
  let prodId, varId, stockId;

  beforeAll(async () => {
    await request(app).post('/api/init-db').send();
  });

  test('create product -> variant -> stock and check total', async () => {
    const prodResp = await request(app).post('/api/products').send({ name: 'TEST_PRODUCT', description: 'for test' });
    expect(prodResp.status).toBe(201);
    prodId = prodResp.body.id;

    const varResp = await request(app).post('/api/variants').send({ product_id: prodId, size_ml: 100, price_cents: 10000 });
    expect(varResp.status).toBe(201);
    varId = varResp.body.id;

    const stockResp = await request(app).post('/api/stock_entries').send({ variant_id: varId, qty: 50 });
    expect(stockResp.status).toBe(201);
    stockId = stockResp.body.id;

    const totalResp = await request(app).get(`/api/stock/variant/${varId}`);
    expect(totalResp.status).toBe(200);
    expect(totalResp.body.qty).toBeGreaterThanOrEqual(50);
  }, 20000);

});
