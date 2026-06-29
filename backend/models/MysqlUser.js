const pool = require('../config/mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function formatUser(row) {
  if (!row) return null;
  const { password, resetPasswordToken, resetPasswordExpires, ...safe } = row;
  return { ...safe, _id: String(row.id) };
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return formatUser(rows[0]);
}

async function findByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
  return rows.map(formatUser);
}

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findByEmailAndRole(email, role) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
  return rows[0] || null;
}

async function comparePassword(rawUser, candidatePassword) {
  return bcrypt.compare(candidatePassword, rawUser.password);
}

function generateToken(user) {
  return jwt.sign(
    { userId: Number(user.id ?? user._id), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function create({ email, password, name, role = 'customer', phone, address, city, state, pincode }) {
  const hashed = await bcrypt.hash(password, 10);
  const [result] = await pool.execute(
    `INSERT INTO users (email, password, name, role, phone, address, city, state, pincode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [email.toLowerCase().trim(), hashed, name, role, phone || null, address || null, city || null, state || null, pincode || null]
  );
  return findById(result.insertId);
}

async function updateProfile(id, data) {
  const allowedFields = ['name', 'phone', 'address', 'city', 'state', 'pincode'];
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
  await pool.execute(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function deleteAll() {
  await pool.execute('DELETE FROM users');
}

async function count() {
  const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM users');
  return rows[0].cnt;
}

module.exports = {
  findById,
  findByIds,
  findByEmail,
  findByEmailAndRole,
  comparePassword,
  generateToken,
  create,
  updateProfile,
  deleteAll,
  count
};
