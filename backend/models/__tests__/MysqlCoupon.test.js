jest.mock('../../config/mysql', () => ({
  execute: jest.fn()
}));

const pool = require('../../config/mysql');
const MysqlCoupon = require('../MysqlCoupon');

function couponRow(overrides = {}) {
  return {
    id: 1,
    storeId: 10,
    code: 'SAVE10',
    usageLimit: 5,
    discountPercent: 10,
    validTill: '2999-01-01',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

beforeEach(() => {
  pool.execute.mockReset();
});

describe('findByStoreId', () => {
  it('formats rows and converts numeric fields', async () => {
    pool.execute.mockResolvedValueOnce([[couponRow()]]);

    const result = await MysqlCoupon.findByStoreId(10);

    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE storeId = ?'),
      [10]
    );
    expect(result).toEqual([
      expect.objectContaining({
        _id: '1',
        storeId: 10,
        usageLimit: 5,
        discountPercent: 10
      })
    ]);
  });

  it('auto-downgrades an active coupon that is past validTill', async () => {
    const expired = couponRow({ validTill: '2000-01-01' });
    pool.execute
      .mockResolvedValueOnce([[expired]]) // SELECT
      .mockResolvedValueOnce([{}]); // UPDATE status -> INACTIVE

    const result = await MysqlCoupon.findByStoreId(10);

    expect(pool.execute).toHaveBeenCalledWith(
      'UPDATE coupons SET status = ? WHERE id = ?',
      ['INACTIVE', 1]
    );
    expect(result[0].status).toBe('INACTIVE');
  });

  it('auto-downgrades an active coupon with no usage left', async () => {
    const exhausted = couponRow({ usageLimit: 0 });
    pool.execute
      .mockResolvedValueOnce([[exhausted]])
      .mockResolvedValueOnce([{}]);

    const result = await MysqlCoupon.findByStoreId(10);

    expect(result[0].status).toBe('INACTIVE');
  });

  it('leaves an already-inactive expired coupon untouched', async () => {
    const inactive = couponRow({ validTill: '2000-01-01', status: 'INACTIVE' });
    pool.execute.mockResolvedValueOnce([[inactive]]);

    const result = await MysqlCoupon.findByStoreId(10);

    expect(pool.execute).toHaveBeenCalledTimes(1);
    expect(result[0].status).toBe('INACTIVE');
  });
});

describe('findActiveByStoreId', () => {
  it('filters out non-active coupons', async () => {
    pool.execute.mockResolvedValueOnce([[
      couponRow({ id: 1, status: 'ACTIVE' }),
      couponRow({ id: 2, status: 'INACTIVE' })
    ]]);

    const result = await MysqlCoupon.findActiveByStoreId(10);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('1');
  });
});

describe('findById', () => {
  it('returns null when no coupon is found', async () => {
    pool.execute.mockResolvedValueOnce([[]]);

    const result = await MysqlCoupon.findById(999);

    expect(result).toBeNull();
  });

  it('returns a formatted coupon when found', async () => {
    pool.execute.mockResolvedValueOnce([[couponRow()]]);

    const result = await MysqlCoupon.findById(1);

    expect(result).toEqual(expect.objectContaining({ _id: '1', code: 'SAVE10' }));
  });
});

describe('findByStoreAndCode', () => {
  it('uppercases the code when querying', async () => {
    pool.execute.mockResolvedValueOnce([[couponRow()]]);

    await MysqlCoupon.findByStoreAndCode(10, 'save10');

    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE storeId = ? AND code = ?'),
      [10, 'SAVE10']
    );
  });

  it('returns undefined/null formatted result when not found', async () => {
    pool.execute.mockResolvedValueOnce([[]]);

    const result = await MysqlCoupon.findByStoreAndCode(10, 'NOPE');

    expect(result).toBeNull();
  });
});

describe('create', () => {
  it('uppercases the code and defaults status to ACTIVE', async () => {
    pool.execute
      .mockResolvedValueOnce([{ insertId: 42 }]) // INSERT
      .mockResolvedValueOnce([[couponRow({ id: 42 })]]); // findById SELECT

    const result = await MysqlCoupon.create({
      storeId: 10,
      code: 'save10',
      usageLimit: 5,
      discountPercent: 10,
      validTill: '2999-01-01'
    });

    expect(pool.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO coupons'),
      [10, 'SAVE10', 5, 10, '2999-01-01', 'ACTIVE']
    );
    expect(result._id).toBe('42');
  });

  it('uses the provided status when given', async () => {
    pool.execute
      .mockResolvedValueOnce([{ insertId: 1 }])
      .mockResolvedValueOnce([[couponRow({ status: 'INACTIVE' })]]);

    await MysqlCoupon.create({
      storeId: 10,
      code: 'X',
      usageLimit: 1,
      discountPercent: 1,
      validTill: '2999-01-01',
      status: 'INACTIVE'
    });

    expect(pool.execute).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      [10, 'X', 1, 1, '2999-01-01', 'INACTIVE']
    );
  });
});

describe('update', () => {
  it('builds a SET clause only for provided fields', async () => {
    pool.execute
      .mockResolvedValueOnce([{}]) // UPDATE
      .mockResolvedValueOnce([[couponRow({ usageLimit: 7 })]]); // findById

    await MysqlCoupon.update(1, { usageLimit: 7 });

    expect(pool.execute).toHaveBeenNthCalledWith(
      1,
      'UPDATE coupons SET usageLimit = ? WHERE id = ?',
      [7, 1]
    );
  });

  it('skips the UPDATE statement entirely when no fields are provided', async () => {
    pool.execute.mockResolvedValueOnce([[couponRow()]]); // findById only

    await MysqlCoupon.update(1, {});

    expect(pool.execute).toHaveBeenCalledTimes(1);
    expect(pool.execute).toHaveBeenCalledWith(
      'SELECT * FROM coupons WHERE id = ?',
      [1]
    );
  });
});

describe('decrementUsage', () => {
  it('throws when the coupon has no usage left', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

    await expect(MysqlCoupon.decrementUsage(1)).rejects.toThrow(
      'Coupon usage limit already exhausted'
    );
  });

  it('decrements usage and marks the coupon inactive once exhausted', async () => {
    pool.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // decrement
      .mockResolvedValueOnce([{}]) // conditional inactive flip
      .mockResolvedValueOnce([[couponRow({ usageLimit: 0, status: 'INACTIVE' })]]); // findById

    const result = await MysqlCoupon.decrementUsage(1);

    expect(pool.execute).toHaveBeenNthCalledWith(
      1,
      'UPDATE coupons SET usageLimit = usageLimit - 1 WHERE id = ? AND usageLimit > 0',
      [1]
    );
    expect(result.usageLimit).toBe(0);
    expect(result.status).toBe('INACTIVE');
  });
});

describe('incrementUsage', () => {
  it('increments usage and returns the updated coupon', async () => {
    pool.execute
      .mockResolvedValueOnce([{}]) // increment
      .mockResolvedValueOnce([[couponRow({ usageLimit: 6 })]]); // findById

    const result = await MysqlCoupon.incrementUsage(1);

    expect(pool.execute).toHaveBeenNthCalledWith(
      1,
      'UPDATE coupons SET usageLimit = usageLimit + 1 WHERE id = ?',
      [1]
    );
    expect(result.usageLimit).toBe(6);
  });
});
