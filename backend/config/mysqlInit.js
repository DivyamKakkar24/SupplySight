const pool = require('./mysql');

async function initializeTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('manager','customer') NOT NULL DEFAULT 'customer',
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      address VARCHAR(500),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      resetPasswordToken VARCHAR(255),
      resetPasswordExpires DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_role (role)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS stores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      address VARCHAR(500) NOT NULL,
      lat DECIMAL(10, 6) NOT NULL DEFAULT 0,
      lng DECIMAL(10, 6) NOT NULL DEFAULT 0,
      managerId INT NOT NULL,
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (managerId) REFERENCES users(id) ON DELETE RESTRICT,
      INDEX idx_managerId (managerId),
      INDEX idx_isActive (isActive)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      quantity INT NOT NULL DEFAULT 0,
      reorderThreshold INT NOT NULL DEFAULT 10,
      storeId INT NOT NULL,
      category VARCHAR(255),
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE RESTRICT,
      INDEX idx_storeId (storeId),
      INDEX idx_isActive (isActive),
      INDEX idx_category (category),
      INDEX idx_createdAt (createdAt)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customerId INT NOT NULL,
      storeId INT NOT NULL,
      totalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      status ENUM('PLACED','CONFIRMED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PLACED',
      phone VARCHAR(20),
      address VARCHAR(500),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE RESTRICT,
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
      changedBy INT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (changedBy) REFERENCES users(id) ON DELETE RESTRICT,
      INDEX idx_orderId (orderId)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('low_stock','out_of_stock','reorder_suggestion','order_placed','order_completed','order_cancelled','order_status_changed') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      storeId INT NOT NULL,
      itemId INT,
      orderId INT,
      recipientId INT NOT NULL,
      isRead TINYINT(1) NOT NULL DEFAULT 0,
      metadata JSON,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_recipient_createdAt (recipientId, createdAt),
      INDEX idx_isRead_createdAt (isRead, createdAt)
    )
  `);
}

module.exports = { initializeTables };
