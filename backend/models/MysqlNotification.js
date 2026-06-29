const pool = require('../config/mysql');

function formatNotification(row) {
  if (!row) return null;
  const { storeId, itemId, orderId, recipientId, isRead, metadata, ...rest } = row;
  return {
    ...rest,
    _id: String(row.id),
    store: storeId,
    item: itemId,
    order: orderId,
    recipient: recipientId,
    isRead: Boolean(isRead),
    metadata: metadata || {}
  };
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [id]);
  return formatNotification(rows[0]);
}

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM notifications ORDER BY createdAt DESC');
  return rows.map(formatNotification);
}

async function findForUser({ recipientId, storeIds, since, unreadOnly, limit = 50 }) {
  let sql = 'SELECT * FROM notifications WHERE recipientId = ?';
  const params = [recipientId];

  if (storeIds && storeIds.length > 0) {
    sql += ` AND storeId IN (${storeIds.map(() => '?').join(',')})`;
    params.push(...storeIds);
  }
  if (since) {
    sql += ' AND createdAt > ?';
    params.push(since);
  }
  if (unreadOnly) {
    sql += ' AND isRead = 0';
  }

  const safeLimit = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
  sql += ` ORDER BY createdAt DESC LIMIT ${safeLimit}`;

  const [rows] = await pool.execute(sql, params);
  return rows.map(formatNotification);
}

async function findRecentByItemAndType(itemId, type, since) {
  const [rows] = await pool.execute(
    'SELECT * FROM notifications WHERE itemId = ? AND type = ? AND isRead = 0 AND createdAt >= ? LIMIT 1',
    [itemId, type, since]
  );
  return formatNotification(rows[0]);
}

async function create(data) {
  const items = Array.isArray(data) ? data : [data];
  let lastId;
  for (const n of items) {
    const [result] = await pool.execute(
      `INSERT INTO notifications (type, title, message, storeId, itemId, orderId, recipientId, isRead, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        n.type,
        n.title,
        n.message,
        Number(n.store),
        n.item != null ? Number(n.item) : null,
        n.order != null ? Number(n.order) : null,
        Number(n.recipient),
        n.isRead ? 1 : 0,
        n.metadata ? JSON.stringify(n.metadata) : null
      ]
    );
    lastId = result.insertId;
  }
  return findById(lastId);
}

async function markRead(id) {
  await pool.execute('UPDATE notifications SET isRead = 1 WHERE id = ?', [id]);
  return findById(id);
}

async function markAllRead(recipientId) {
  await pool.execute('UPDATE notifications SET isRead = 1 WHERE recipientId = ? AND isRead = 0', [recipientId]);
}

async function deleteById(id) {
  await pool.execute('DELETE FROM notifications WHERE id = ?', [id]);
}

async function deleteAllForUser(recipientId) {
  await pool.execute('DELETE FROM notifications WHERE recipientId = ?', [recipientId]);
}

async function deleteOlderThan(date) {
  const [result] = await pool.execute('DELETE FROM notifications WHERE createdAt < ?', [date]);
  return result.affectedRows;
}

async function countUnread(recipientId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as cnt FROM notifications WHERE recipientId = ? AND isRead = 0',
    [recipientId]
  );
  return rows[0].cnt;
}

async function deleteAll() {
  await pool.execute('DELETE FROM notifications');
}

module.exports = {
  findById,
  findAll,
  findForUser,
  findRecentByItemAndType,
  create,
  markRead,
  markAllRead,
  deleteById,
  deleteAllForUser,
  deleteOlderThan,
  countUnread,
  deleteAll
};
