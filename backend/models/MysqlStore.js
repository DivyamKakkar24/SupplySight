const pool = require('../config/mysql');

function formatStore(row) {
  if (!row) return null;
  const { lat, lng, managerId, ...rest } = row;
  return {
    ...rest,
    _id: String(row.id),
    isActive: Boolean(row.isActive),
    manager: managerId,
    location: {
      type: 'Point',
      coordinates: [Number(lng), Number(lat)]
    }
  };
}

async function findAll({ activeOnly = true } = {}) {
  const sql = activeOnly
    ? 'SELECT * FROM stores WHERE isActive = 1 ORDER BY createdAt DESC'
    : 'SELECT * FROM stores ORDER BY createdAt DESC';
  const [rows] = await pool.execute(sql);
  return rows.map(formatStore);
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM stores WHERE id = ?', [id]);
  return formatStore(rows[0]);
}

async function findByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(`SELECT * FROM stores WHERE id IN (${placeholders})`, ids);
  return rows.map(formatStore);
}

async function findByManagerId(managerId, { activeOnly = true } = {}) {
  const sql = activeOnly
    ? 'SELECT * FROM stores WHERE managerId = ? AND isActive = 1 ORDER BY createdAt DESC'
    : 'SELECT * FROM stores WHERE managerId = ? ORDER BY createdAt DESC';
  const [rows] = await pool.execute(sql, [managerId]);
  return rows.map(formatStore);
}

async function create({ name, description, address, coordinates, managerId }) {
  const [lng, lat] = coordinates;
  const [result] = await pool.execute(
    `INSERT INTO stores (name, description, address, lat, lng, managerId) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description || null, address, lat, lng, managerId]
  );
  return findById(result.insertId);
}

async function update(id, { name, description, address, coordinates }) {
  const setClauses = [];
  const values = [];

  if (name !== undefined) { setClauses.push('name = ?'); values.push(name); }
  if (description !== undefined) { setClauses.push('description = ?'); values.push(description); }
  if (address !== undefined) { setClauses.push('address = ?'); values.push(address); }
  if (coordinates !== undefined) {
    const [lng, lat] = coordinates;
    setClauses.push('lat = ?', 'lng = ?');
    values.push(lat, lng);
  }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  await pool.execute(`UPDATE stores SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function softDelete(id) {
  await pool.execute('UPDATE stores SET isActive = 0 WHERE id = ?', [id]);
}

async function deleteAll() {
  await pool.execute('DELETE FROM stores');
}

async function count() {
  const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM stores WHERE isActive = 1');
  return rows[0].cnt;
}

module.exports = {
  findAll,
  findById,
  findByIds,
  findByManagerId,
  create,
  update,
  softDelete,
  deleteAll,
  count
};
