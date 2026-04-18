const pool = require('../config/mysql');

function formatItem(row) {
  if (!row) return null;
  return { ...row, _id: String(row.id), isActive: Boolean(row.isActive), price: Number(row.price) };
}

async function findAll({ search } = {}) {
  if (search && search.trim().length > 0) {
    const like = `%${search.trim()}%`;
    const [rows] = await pool.execute(
      `SELECT * FROM inventory WHERE isActive = 1 AND (name LIKE ? OR category LIKE ? OR description LIKE ?)
       ORDER BY createdAt DESC`,
      [like, like, like]
    );
    return rows.map(formatItem);
  }
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE isActive = 1 ORDER BY createdAt DESC'
  );
  return rows.map(formatItem);
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM inventory WHERE id = ?', [id]);
  return formatItem(rows[0]);
}

async function findByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT * FROM inventory WHERE id IN (${placeholders})`,
    ids
  );
  return rows.map(formatItem);
}

async function findByStoreId(storeId) {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE storeId = ? AND isActive = 1 ORDER BY createdAt DESC',
    [String(storeId)]
  );
  return rows.map(formatItem);
}

async function findByStoreIds(storeIds) {
  if (!storeIds || storeIds.length === 0) return [];
  const ids = storeIds.map(String);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT * FROM inventory WHERE storeId IN (${placeholders}) AND isActive = 1 ORDER BY createdAt DESC`,
    ids
  );
  return rows.map(formatItem);
}

async function findLowStock(storeIds) {
  if (!storeIds || storeIds.length === 0) return [];
  const ids = storeIds.map(String);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT * FROM inventory WHERE storeId IN (${placeholders}) AND isActive = 1 AND quantity <= reorderThreshold ORDER BY quantity ASC`,
    ids
  );
  return rows.map(formatItem);
}

async function findAllLowStock() {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE isActive = 1 AND quantity <= reorderThreshold'
  );
  return rows.map(formatItem);
}

async function findOutOfStock() {
  const [rows] = await pool.execute(
    'SELECT * FROM inventory WHERE isActive = 1 AND quantity = 0'
  );
  return rows.map(formatItem);
}

async function create({ name, description, price, quantity, reorderThreshold, storeId, category, storeName }) {
  const timestamp = Date.now().toString().slice(-6);
  const storePrefix = (storeName || '').replace(/\s+/g, '').toUpperCase().slice(0, 3);
  const itemPrefix = (name || '').replace(/\s+/g, '').toUpperCase().slice(0, 3);
  const sku = `${storePrefix}-${itemPrefix}-${timestamp}`;

  const [result] = await pool.execute(
    `INSERT INTO inventory (name, sku, description, price, quantity, reorderThreshold, storeId, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, sku, description || null, price, quantity || 0, reorderThreshold || 10, String(storeId), category || null]
  );
  return findById(result.insertId);
}

async function createWithSku({ name, sku, description, price, quantity, reorderThreshold, storeId, category, createdAt }) {
  const params = [name, sku, description || null, price, quantity || 0, reorderThreshold || 10, String(storeId), category || null];
  let sql = `INSERT INTO inventory (name, sku, description, price, quantity, reorderThreshold, storeId, category`;
  if (createdAt) {
    sql += `, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    params.push(createdAt);
  } else {
    sql += `) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  }
  const [result] = await pool.execute(sql, params);
  return findById(result.insertId);
}

async function update(id, data) {
  const allowedFields = ['name', 'description', 'price', 'quantity', 'reorderThreshold', 'category'];
  const setClauses = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  await pool.execute(
    `UPDATE inventory SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );
  return findById(id);
}

async function softDelete(id) {
  await pool.execute('UPDATE inventory SET isActive = 0 WHERE id = ?', [id]);
}

async function decrementQuantity(id, amount) {
  const [result] = await pool.execute(
    'UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
    [amount, id, amount]
  );
  if (result.affectedRows === 0) {
    throw new Error('Insufficient inventory');
  }
  return findById(id);
}

async function incrementQuantity(id, amount) {
  await pool.execute(
    'UPDATE inventory SET quantity = quantity + ? WHERE id = ?',
    [amount, id]
  );
  return findById(id);
}

async function deleteAll() {
  await pool.execute('DELETE FROM inventory');
}

async function count() {
  const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM inventory WHERE isActive = 1');
  return rows[0].cnt;
}

module.exports = {
  findAll,
  findById,
  findByIds,
  findByStoreId,
  findByStoreIds,
  findLowStock,
  findAllLowStock,
  findOutOfStock,
  create,
  createWithSku,
  update,
  softDelete,
  decrementQuantity,
  incrementQuantity,
  deleteAll,
  count
};
