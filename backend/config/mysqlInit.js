const pool = require('./mysql');

async function initializeTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      quantity INT NOT NULL DEFAULT 0,
      reorderThreshold INT NOT NULL DEFAULT 10,
      storeId VARCHAR(24) NOT NULL,
      category VARCHAR(255),
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_storeId (storeId),
      INDEX idx_isActive (isActive),
      INDEX idx_category (category),
      INDEX idx_createdAt (createdAt)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customerId VARCHAR(24) NOT NULL,
      storeId VARCHAR(24) NOT NULL,
      totalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      status ENUM('PLACED','CONFIRMED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PLACED',
      phone VARCHAR(20),
      address VARCHAR(500),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_customerId (customerId),
      INDEX idx_storeId (storeId),
      INDEX idx_status (status),
      INDEX idx_createdAt (createdAt)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderId INT NOT NULL,
      itemId INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (itemId) REFERENCES inventory(id) ON DELETE RESTRICT,
      INDEX idx_orderId (orderId)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderId INT NOT NULL,
      status ENUM('PLACED','CONFIRMED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED') NOT NULL,
      changedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      changedBy VARCHAR(24) NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX idx_orderId (orderId)
    )
  `);
  // Add address columns to existing orders table if missing
  const addressColumns = ['phone', 'address', 'city', 'state', 'pincode'];
  for (const col of addressColumns) {
    try {
      await pool.execute(`ALTER TABLE orders ADD COLUMN ${col} VARCHAR(500)`);
    } catch (e) {
      // Column already exists — ignore
    }
  }
}

module.exports = { initializeTables };
