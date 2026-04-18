const pool = require('../config/mysql');

function formatOrder(row) {
  if (!row) return null;
  return {
    ...row,
    _id: String(row.id),
    customer: row.customerId,
    store: row.storeId,
    items: row.items || [],
    statusHistory: row.statusHistory || []
  };
}

async function assembleOrders(orderRows) {
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map(o => o.id);
  const placeholders = orderIds.map(() => '?').join(',');

  const [allItems] = await pool.execute(
    `SELECT * FROM order_items WHERE orderId IN (${placeholders})`,
    orderIds
  );
  const [allHistory] = await pool.execute(
    `SELECT * FROM order_status_history WHERE orderId IN (${placeholders}) ORDER BY changedAt ASC`,
    orderIds
  );

  const itemsByOrder = {};
  for (const oi of allItems) {
    (itemsByOrder[oi.orderId] ??= []).push(oi);
  }
  const historyByOrder = {};
  for (const sh of allHistory) {
    (historyByOrder[sh.orderId] ??= []).push(sh);
  }

  return orderRows.map(row => ({
    ...row,
    _id: String(row.id),
    totalAmount: Number(row.totalAmount),
    customer: row.customerId,
    store: row.storeId,
    items: (itemsByOrder[row.id] || []).map(oi => ({
      _id: String(oi.id),
      item: String(oi.itemId),
      quantity: oi.quantity,
      price: Number(oi.price)
    })),
    statusHistory: (historyByOrder[row.id] || []).map(sh => ({
      _id: String(sh.id),
      status: sh.status,
      changedAt: sh.changedAt,
      changedBy: sh.changedBy
    }))
  }));
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const assembled = await assembleOrders(rows);
  return assembled[0];
}

async function findByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT * FROM orders WHERE id IN (${placeholders})`,
    ids
  );
  return assembleOrders(rows);
}

async function findByCustomerId(customerId) {
  const [rows] = await pool.execute(
    'SELECT * FROM orders WHERE customerId = ? ORDER BY createdAt DESC',
    [String(customerId)]
  );
  return assembleOrders(rows);
}

async function findByStoreIds(storeIds) {
  if (!storeIds || storeIds.length === 0) return [];
  const ids = storeIds.map(String);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT * FROM orders WHERE storeId IN (${placeholders}) ORDER BY createdAt DESC`,
    ids
  );
  return assembleOrders(rows);
}

async function findByStoreId(storeId) {
  const [rows] = await pool.execute(
    'SELECT * FROM orders WHERE storeId = ? ORDER BY createdAt DESC',
    [String(storeId)]
  );
  return assembleOrders(rows);
}

async function findAll({ storeId, since } = {}) {
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (storeId) {
    sql += ' AND storeId = ?';
    params.push(String(storeId));
  }
  if (since) {
    sql += ' AND createdAt >= ?';
    params.push(new Date(since));
  }

  sql += ' ORDER BY createdAt DESC';
  const [rows] = await pool.execute(sql, params);
  return assembleOrders(rows);
}

async function create({ customerId, storeId, items, changedBy, phone, address, city, state, pincode }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (customerId, storeId, totalAmount, status, phone, address, city, state, pincode) VALUES (?, ?, ?, 'PLACED', ?, ?, ?, ?, ?)`,
      [String(customerId), String(storeId), totalAmount, phone || null, address || null, city || null, state || null, pincode || null]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.execute(
        'INSERT INTO order_items (orderId, itemId, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.itemId, item.quantity, item.price]
      );
    }

    await connection.execute(
      `INSERT INTO order_status_history (orderId, status, changedAt, changedBy) VALUES (?, 'PLACED', NOW(), ?)`,
      [orderId, String(changedBy)]
    );

    for (const item of items) {
      const [result] = await connection.execute(
        'UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
        [item.quantity, item.itemId, item.quantity]
      );
      if (result.affectedRows === 0) {
        throw new Error(`Insufficient inventory for item ${item.itemId}`);
      }
    }

    await connection.commit();
    return findById(orderId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function createForSeed({ customerId, storeId, items, status, changedBy, createdAt }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    let orderSql, orderParams;
    if (createdAt) {
      orderSql = 'INSERT INTO orders (customerId, storeId, totalAmount, status, createdAt) VALUES (?, ?, ?, ?, ?)';
      orderParams = [String(customerId), String(storeId), totalAmount, status || 'PLACED', createdAt];
    } else {
      orderSql = 'INSERT INTO orders (customerId, storeId, totalAmount, status) VALUES (?, ?, ?, ?)';
      orderParams = [String(customerId), String(storeId), totalAmount, status || 'PLACED'];
    }
    const [orderResult] = await connection.execute(orderSql, orderParams);
    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.execute(
        'INSERT INTO order_items (orderId, itemId, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.itemId, item.quantity, item.price]
      );
    }

    const historyTime = createdAt || new Date();
    await connection.execute(
      'INSERT INTO order_status_history (orderId, status, changedAt, changedBy) VALUES (?, ?, ?, ?)',
      [orderId, status || 'PLACED', historyTime, String(changedBy)]
    );

    await connection.commit();
    return findById(orderId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateStatus(id, status, changedBy) {
  await pool.execute(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, id]
  );
  await pool.execute(
    'INSERT INTO order_status_history (orderId, status, changedAt, changedBy) VALUES (?, ?, NOW(), ?)',
    [id, status, String(changedBy)]
  );
  return findById(id);
}

async function deleteAll() {
  await pool.execute('DELETE FROM order_status_history');
  await pool.execute('DELETE FROM order_items');
  await pool.execute('DELETE FROM orders');
}

async function count() {
  const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM orders');
  return rows[0].cnt;
}

module.exports = {
  findById,
  findByIds,
  findByCustomerId,
  findByStoreIds,
  findByStoreId,
  findAll,
  create,
  createForSeed,
  updateStatus,
  deleteAll,
  count
};
