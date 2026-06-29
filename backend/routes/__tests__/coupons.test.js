jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = JSON.parse(req.headers['x-test-user'] || 'null');
    if (!req.user) return res.status(401).json({ error: 'Access token required' });
    next();
  },
  requireManager: (req, res, next) => {
    if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager access required' });
    next();
  },
  requireCustomer: (req, res, next) => {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Customer access required' });
    next();
  }
}));

jest.mock('../../models/MysqlCoupon');
jest.mock('../../models/MysqlStore');

const express = require('express');
const request = require('supertest');
const MysqlCoupon = require('../../models/MysqlCoupon');
const Store = require('../../models/MysqlStore');
const couponsRouter = require('../coupons');

const app = express();
app.use(express.json());
app.use('/api/coupons', couponsRouter);

const manager = JSON.stringify({ _id: 1, role: 'manager' });
const otherManager = JSON.stringify({ _id: 2, role: 'manager' });
const customer = JSON.stringify({ _id: 5, role: 'customer' });

function activeStore(overrides = {}) {
  return { _id: 10, manager: 1, isActive: true, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/coupons/store/:storeId', () => {
  it('rejects non-managers', async () => {
    const res = await request(app)
      .get('/api/coupons/store/10')
      .set('x-test-user', customer);

    expect(res.status).toBe(403);
  });

  it('rejects a manager who does not own the store', async () => {
    Store.findById.mockResolvedValue(activeStore());

    const res = await request(app)
      .get('/api/coupons/store/10')
      .set('x-test-user', otherManager);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/your own stores/);
  });

  it('returns 404 for a missing or inactive store', async () => {
    Store.findById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/coupons/store/999')
      .set('x-test-user', manager);

    expect(res.status).toBe(404);
  });

  it('returns coupons for the owning manager', async () => {
    Store.findById.mockResolvedValue(activeStore());
    MysqlCoupon.findByStoreId.mockResolvedValue([{ _id: '1', code: 'SAVE10' }]);

    const res = await request(app)
      .get('/api/coupons/store/10')
      .set('x-test-user', manager);

    expect(res.status).toBe(200);
    expect(res.body.coupons).toEqual([{ _id: '1', code: 'SAVE10' }]);
  });
});

describe('GET /api/coupons/store/:storeId/active', () => {
  it('is reachable by any authenticated user, not just the owning manager', async () => {
    Store.findById.mockResolvedValue(activeStore());
    MysqlCoupon.findActiveByStoreId.mockResolvedValue([{ _id: '1', status: 'ACTIVE' }]);

    const res = await request(app)
      .get('/api/coupons/store/10/active')
      .set('x-test-user', customer);

    expect(res.status).toBe(200);
    expect(res.body.coupons).toEqual([{ _id: '1', status: 'ACTIVE' }]);
  });

  it('returns 404 when the store does not exist', async () => {
    Store.findById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/coupons/store/999/active')
      .set('x-test-user', customer);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/coupons/store/:storeId', () => {
  beforeEach(() => {
    Store.findById.mockResolvedValue(activeStore());
  });

  it('requires a coupon code', async () => {
    const res = await request(app)
      .post('/api/coupons/store/10')
      .set('x-test-user', manager)
      .send({ usageLimit: 5, discountPercent: 10, validTill: '2999-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/code is required/);
  });

  it.each([
    [{ usageLimit: -1, discountPercent: 10, validTill: '2999-01-01' }, /Usage limit/],
    [{ usageLimit: 5, discountPercent: 0, validTill: '2999-01-01' }, /Discount/],
    [{ usageLimit: 5, discountPercent: 101, validTill: '2999-01-01' }, /Discount/],
    [{ usageLimit: 5, discountPercent: 10, validTill: 'not-a-date' }, /Valid Till/]
  ])('rejects invalid field combinations', async (fields, expectedMessage) => {
    const res = await request(app)
      .post('/api/coupons/store/10')
      .set('x-test-user', manager)
      .send({ code: 'SAVE10', ...fields });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(expectedMessage);
  });

  it('rejects an invalid status value', async () => {
    const res = await request(app)
      .post('/api/coupons/store/10')
      .set('x-test-user', manager)
      .send({ code: 'SAVE10', usageLimit: 5, discountPercent: 10, validTill: '2999-01-01', status: 'WAT' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Status must be/);
  });

  it('rejects a duplicate coupon code for the same store', async () => {
    MysqlCoupon.findByStoreAndCode.mockResolvedValue({ _id: '1', code: 'SAVE10' });

    const res = await request(app)
      .post('/api/coupons/store/10')
      .set('x-test-user', manager)
      .send({ code: 'SAVE10', usageLimit: 5, discountPercent: 10, validTill: '2999-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/);
  });

  it('creates a coupon when all fields are valid', async () => {
    MysqlCoupon.findByStoreAndCode.mockResolvedValue(null);
    MysqlCoupon.create.mockResolvedValue({ _id: '1', code: 'SAVE10', usageLimit: 5, discountPercent: 10 });

    const res = await request(app)
      .post('/api/coupons/store/10')
      .set('x-test-user', manager)
      .send({ code: 'save10', usageLimit: 5, discountPercent: 10, validTill: '2999-01-01' });

    expect(res.status).toBe(201);
    expect(MysqlCoupon.create).toHaveBeenCalledWith({
      storeId: '10',
      code: 'save10',
      usageLimit: 5,
      discountPercent: 10,
      validTill: '2999-01-01',
      status: undefined
    });
    expect(res.body.coupon.code).toBe('SAVE10');
  });
});

describe('PUT /api/coupons/:couponId', () => {
  it('returns 404 when the coupon does not exist', async () => {
    MysqlCoupon.findById.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/coupons/1')
      .set('x-test-user', manager)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(404);
  });

  it('rejects a manager who does not own the coupon\'s store', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10 });
    Store.findById.mockResolvedValue(activeStore());

    const res = await request(app)
      .put('/api/coupons/1')
      .set('x-test-user', otherManager)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(403);
  });

  it('allows partial updates without requiring every field', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10 });
    Store.findById.mockResolvedValue(activeStore());
    MysqlCoupon.update.mockResolvedValue({ _id: '1', status: 'INACTIVE' });

    const res = await request(app)
      .put('/api/coupons/1')
      .set('x-test-user', manager)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(MysqlCoupon.update).toHaveBeenCalledWith('1', {
      usageLimit: undefined,
      discountPercent: undefined,
      validTill: undefined,
      status: 'INACTIVE'
    });
  });

  it('validates fields that are provided', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10 });
    Store.findById.mockResolvedValue(activeStore());

    const res = await request(app)
      .put('/api/coupons/1')
      .set('x-test-user', manager)
      .send({ discountPercent: 200 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Discount/);
  });
});

describe('POST /api/coupons/:couponId/apply', () => {
  it('requires storeId and a numeric subtotal', async () => {
    const res = await request(app)
      .post('/api/coupons/1/apply')
      .set('x-test-user', customer)
      .send({ storeId: 10 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when the coupon does not belong to the given store', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10, status: 'ACTIVE' });

    const res = await request(app)
      .post('/api/coupons/1/apply')
      .set('x-test-user', customer)
      .send({ storeId: 99, subtotal: 100 });

    expect(res.status).toBe(404);
  });

  it('rejects an inactive coupon', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10, status: 'INACTIVE' });

    const res = await request(app)
      .post('/api/coupons/1/apply')
      .set('x-test-user', customer)
      .send({ storeId: 10, subtotal: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer active/);
  });

  it('decrements usage and returns the discounted total', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10, status: 'ACTIVE', discountPercent: 25 });
    MysqlCoupon.decrementUsage.mockResolvedValue({ _id: '1', usageLimit: 4 });

    const res = await request(app)
      .post('/api/coupons/1/apply')
      .set('x-test-user', customer)
      .send({ storeId: 10, subtotal: 200 });

    expect(res.status).toBe(200);
    expect(res.body.discountAmount).toBe(50);
    expect(res.body.total).toBe(150);
    expect(MysqlCoupon.decrementUsage).toHaveBeenCalledWith('1');
  });

  it('surfaces an exhausted-usage error from the model as a 400', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10, status: 'ACTIVE', discountPercent: 10 });
    MysqlCoupon.decrementUsage.mockRejectedValue(new Error('Coupon usage limit already exhausted'));

    const res = await request(app)
      .post('/api/coupons/1/apply')
      .set('x-test-user', customer)
      .send({ storeId: 10, subtotal: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Coupon usage limit already exhausted');
  });
});

describe('POST /api/coupons/:couponId/release', () => {
  it('returns 404 when the coupon does not belong to the given store', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10 });

    const res = await request(app)
      .post('/api/coupons/1/release')
      .set('x-test-user', customer)
      .send({ storeId: 99 });

    expect(res.status).toBe(404);
  });

  it('increments usage back', async () => {
    MysqlCoupon.findById.mockResolvedValue({ _id: '1', storeId: 10 });
    MysqlCoupon.incrementUsage.mockResolvedValue({ _id: '1', usageLimit: 6 });

    const res = await request(app)
      .post('/api/coupons/1/release')
      .set('x-test-user', customer)
      .send({ storeId: 10 });

    expect(res.status).toBe(200);
    expect(MysqlCoupon.incrementUsage).toHaveBeenCalledWith('1');
    expect(res.body.coupon.usageLimit).toBe(6);
  });
});
