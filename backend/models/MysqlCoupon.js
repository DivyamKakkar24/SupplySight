const pool = require('../config/mysql');

function formatCoupon(row) {
  if (!row) return null;
  return {
    ...row,
    _id: String(row.id),
    storeId: Number(row.storeId),
    usageLimit: Number(row.usageLimit),
    discountPercent: Number(row.discountPercent)
  };
}

function isExpiredOrExhausted(row) {
  const validTill = new Date(row.validTill);
  validTill.setHours(23, 59, 59, 999);
  return Number(row.usageLimit) <= 0 || validTill < new Date();
}

async function autoDowngradeIfExpired(row) {
  if (row.status === 'ACTIVE' && isExpiredOrExhausted(row)) {
    await pool.execute('UPDATE coupons SET status = ? WHERE id = ?', ['INACTIVE', row.id]);
    row = { ...row, status: 'INACTIVE' };
  }
  return row;
}

async function findByStoreId(storeId) {
  const [rows] = await pool.execute(
    'SELECT * FROM coupons WHERE storeId = ? ORDER BY createdAt DESC',
    [storeId]
  );
  const checked = await Promise.all(rows.map(autoDowngradeIfExpired));
  return checked.map(formatCoupon);
}

async function findActiveByStoreId(storeId) {
  const all = await findByStoreId(storeId);
  return all.filter(c => c.status === 'ACTIVE');
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const checked = await autoDowngradeIfExpired(rows[0]);
  return formatCoupon(checked);
}

async function findByStoreAndCode(storeId, code) {
  const [rows] = await pool.execute(
    'SELECT * FROM coupons WHERE storeId = ? AND code = ?',
    [storeId, code.toUpperCase()]
  );
  return formatCoupon(rows[0]);
}

async function create({ storeId, code, usageLimit, discountPercent, validTill, status }) {
  const [result] = await pool.execute(
    `INSERT INTO coupons (storeId, code, usageLimit, discountPercent, validTill, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [storeId, code.toUpperCase(), usageLimit, discountPercent, validTill, status || 'ACTIVE']
  );
  return findById(result.insertId);
}

async function update(id, { usageLimit, discountPercent, validTill, status }) {
  const setClauses = [];
  const values = [];

  if (usageLimit !== undefined) { setClauses.push('usageLimit = ?'); values.push(usageLimit); }
  if (discountPercent !== undefined) { setClauses.push('discountPercent = ?'); values.push(discountPercent); }
  if (validTill !== undefined) { setClauses.push('validTill = ?'); values.push(validTill); }
  if (status !== undefined) { setClauses.push('status = ?'); values.push(status); }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  await pool.execute(`UPDATE coupons SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function decrementUsage(id) {
  const [result] = await pool.execute(
    'UPDATE coupons SET usageLimit = usageLimit - 1 WHERE id = ? AND usageLimit > 0',
    [id]
  );
  if (result.affectedRows === 0) {
    throw new Error('Coupon usage limit already exhausted');
  }
  await pool.execute(
    "UPDATE coupons SET status = 'INACTIVE' WHERE id = ? AND usageLimit <= 0",
    [id]
  );
  return findById(id);
}

async function incrementUsage(id) {
  await pool.execute('UPDATE coupons SET usageLimit = usageLimit + 1 WHERE id = ?', [id]);
  return findById(id);
}

module.exports = {
  findByStoreId,
  findActiveByStoreId,
  findById,
  findByStoreAndCode,
  create,
  update,
  decrementUsage,
  incrementUsage
};
