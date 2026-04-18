const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Store = require('./models/Store');
const Inventory = require('./models/Inventory');
const MysqlOrder = require('./models/MysqlOrder');
const Notification = require('./models/Notification');
const mysqlPool = require('./config/mysql');
const { initializeTables } = require('./config/mysqlInit');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fast-commerce';

function generateSKU(storeName, itemName) {
  const timestamp = Date.now().toString().slice(-6);
  const storePrefix = storeName.replace(/\s+/g, '').toUpperCase().slice(0, 3);
  const itemPrefix = itemName.replace(/\s+/g, '').toUpperCase().slice(0, 3);
  return `${storePrefix}-${itemPrefix}-${timestamp}`;
}

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Initializing MySQL tables...');
    await initializeTables();
    console.log('MySQL tables initialized');

    // Clear all data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Store.deleteMany({});
    await Notification.deleteMany({});
    await MysqlOrder.deleteAll();
    await Inventory.deleteAll();
    console.log('Database cleared');

    // Create test users
    console.log('Creating test users...');
    const manager1 = await User.create({
      name: 'Rahul Manager',
      email: 'manager1@test.com',
      password: 'password123',
      role: 'manager'
    });

    const manager2 = await User.create({
      name: 'Priya Store Owner',
      email: 'manager2@test.com',
      password: 'password123',
      role: 'manager'
    });

    const customer1 = await User.create({
      name: 'Amit Customer',
      email: 'customer1@test.com',
      password: 'password123',
      role: 'customer'
    });

    const customer2 = await User.create({
      name: 'Neha Shopper',
      email: 'customer2@test.com',
      password: 'password123',
      role: 'customer'
    });

    console.log('Users created:', [manager1.email, manager2.email, customer1.email, customer2.email]);

    // Create test stores with Indian coordinates
    console.log('Creating test stores with Indian locations...');
    const store1 = await Store.create({
      name: 'Mumbai Electronics Hub',
      description: 'Premium electronics and gadgets in the heart of Mumbai',
      address: '123 Marine Drive, Colaba, Mumbai, Maharashtra 400001',
      location: { type: 'Point', coordinates: [72.8777, 18.9220] },
      manager: manager1._id,
      isActive: true
    });

    const store2 = await Store.create({
      name: 'Delhi Fashion Boutique',
      description: 'Trendy fashion and accessories in Delhi',
      address: '456 Connaught Place, New Delhi, Delhi 110001',
      location: { type: 'Point', coordinates: [77.2184, 28.6287] },
      manager: manager1._id,
      isActive: true
    });

    const store3 = await Store.create({
      name: 'Bangalore Grocery Market',
      description: 'Fresh groceries and organic products',
      address: '789 MG Road, Bangalore, Karnataka 560001',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      manager: manager2._id,
      isActive: true
    });

    const store4 = await Store.create({
      name: 'Hyderabad Hardware Store',
      description: 'Tools, hardware, and home improvement supplies',
      address: '321 Banjara Hills, Hyderabad, Telangana 500034',
      location: { type: 'Point', coordinates: [78.4719, 17.3993] },
      manager: manager2._id,
      isActive: true
    });

    console.log('Stores created with Indian locations:', [store1.name, store2.name, store3.name, store4.name]);

    // Create test items in MySQL
    console.log('Creating test items...');

    const electronicsItemsData = [
      { name: 'iPhone 15 Pro', description: 'Latest iPhone with advanced camera system', price: 999.99, quantity: 3, reorderThreshold: 5, category: 'Electronics' },
      { name: 'MacBook Air M2', description: 'Lightweight laptop with powerful M2 chip', price: 1199.99, quantity: 15, reorderThreshold: 3, category: 'Electronics' },
      { name: 'Sony WH-1000XM5', description: 'Premium noise-canceling headphones', price: 349.99, quantity: 8, reorderThreshold: 2, category: 'Electronics' },
      { name: 'Samsung 65" QLED TV', description: '4K QLED Smart TV with stunning picture quality', price: 1299.99, quantity: 1, reorderThreshold: 1, category: 'Electronics' }
    ];

    const electronicsItems = [];
    for (const data of electronicsItemsData) {
      const item = await Inventory.create({ ...data, storeId: store1._id.toString(), storeName: store1.name });
      electronicsItems.push(item);
    }

    const fashionItemsData = [
      { name: 'Designer Handbag', description: 'Luxury leather handbag with gold accents', price: 299.99, quantity: 12, reorderThreshold: 4, category: 'Fashion' },
      { name: 'Premium Denim Jeans', description: 'High-quality denim jeans with perfect fit', price: 89.99, quantity: 45, reorderThreshold: 10, category: 'Fashion' },
      { name: 'Silk Blouse', description: 'Elegant silk blouse for professional wear', price: 79.99, quantity: 20, reorderThreshold: 5, category: 'Fashion' },
      { name: 'Leather Boots', description: 'Stylish leather boots for all seasons', price: 149.99, quantity: 15, reorderThreshold: 3, category: 'Fashion' }
    ];

    const fashionItems = [];
    for (const data of fashionItemsData) {
      const item = await Inventory.create({ ...data, storeId: store2._id.toString(), storeName: store2.name });
      fashionItems.push(item);
    }

    const groceryItemsData = [
      { name: 'Organic Bananas', description: 'Fresh organic bananas from local farms', price: 2.99, quantity: 100, reorderThreshold: 20, category: 'Grocery' },
      { name: 'Whole Grain Bread', description: 'Fresh whole grain bread baked daily', price: 4.99, quantity: 30, reorderThreshold: 8, category: 'Grocery' },
      { name: 'Organic Milk', description: 'Fresh organic milk from local dairy', price: 3.99, quantity: 50, reorderThreshold: 15, category: 'Grocery' },
      { name: 'Fresh Tomatoes', description: 'Fresh red tomatoes from local farms', price: 1.99, quantity: 80, reorderThreshold: 25, category: 'Grocery' }
    ];

    const groceryItems = [];
    for (const data of groceryItemsData) {
      const item = await Inventory.create({ ...data, storeId: store3._id.toString(), storeName: store3.name });
      groceryItems.push(item);
    }

    const hardwareItemsData = [
      { name: 'Cordless Drill', description: 'Professional cordless drill with battery', price: 89.99, quantity: 25, reorderThreshold: 5, category: 'Hardware' },
      { name: 'Paint Brush Set', description: 'Professional paint brush set with various sizes', price: 19.99, quantity: 60, reorderThreshold: 15, category: 'Hardware' },
      { name: 'Safety Glasses', description: 'Professional safety glasses for construction', price: 12.99, quantity: 40, reorderThreshold: 10, category: 'Hardware' },
      { name: 'Measuring Tape', description: 'Professional measuring tape 25ft', price: 8.99, quantity: 35, reorderThreshold: 8, category: 'Hardware' }
    ];

    for (const data of hardwareItemsData) {
      await Inventory.create({ ...data, storeId: store4._id.toString(), storeName: store4.name });
    }

    console.log('Items created for all stores');

    // Create edge case items
    console.log('Creating edge case items...');
    await Inventory.create({
      name: 'Out of Stock Item', description: 'Item for testing out of stock alerts',
      price: 99.99, quantity: 0, reorderThreshold: 5, category: 'Electronics',
      storeId: store1._id.toString(), storeName: store1.name
    });
    await Inventory.create({
      name: 'High Demand Product', description: 'Item with high sales for ML testing',
      price: 49.99, quantity: 50, reorderThreshold: 10, category: 'Electronics',
      storeId: store1._id.toString(), storeName: store1.name
    });
    await Inventory.create({
      name: 'Low Stock Alert Item', description: 'Item for testing low stock notifications',
      price: 29.99, quantity: 2, reorderThreshold: 5, category: 'Electronics',
      storeId: store1._id.toString(), storeName: store1.name
    });
    console.log('Edge case items created');

    // Create test orders in MySQL
    console.log('Creating test orders...');

    const order1 = await MysqlOrder.createForSeed({
      customerId: customer1._id.toString(),
      storeId: store1._id.toString(),
      items: [{ itemId: Number(electronicsItems[0]._id), quantity: 1, price: 999.99 }],
      status: 'DELIVERED',
      changedBy: customer1._id.toString()
    });

    const order2 = await MysqlOrder.createForSeed({
      customerId: customer2._id.toString(),
      storeId: store2._id.toString(),
      items: [
        { itemId: Number(fashionItems[0]._id), quantity: 1, price: 299.99 },
        { itemId: Number(fashionItems[1]._id), quantity: 2, price: 89.99 }
      ],
      status: 'DELIVERED',
      changedBy: customer2._id.toString()
    });

    const order3 = await MysqlOrder.createForSeed({
      customerId: customer1._id.toString(),
      storeId: store3._id.toString(),
      items: [
        { itemId: Number(groceryItems[0]._id), quantity: 3, price: 2.99 },
        { itemId: Number(groceryItems[1]._id), quantity: 2, price: 4.99 }
      ],
      status: 'DELIVERED',
      changedBy: customer1._id.toString()
    });

    console.log('Orders created:', [order1._id, order2._id, order3._id]);

    // Create additional orders for ML testing
    console.log('Creating additional orders for ML analysis...');

    const orderDates = [
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ];

    for (let i = 0; i < 15; i++) {
      const orderDate = orderDates[i % orderDates.length];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const itemIndex = Math.floor(Math.random() * electronicsItems.length);

      await MysqlOrder.createForSeed({
        customerId: customer1._id.toString(),
        storeId: store1._id.toString(),
        items: [{
          itemId: Number(electronicsItems[itemIndex]._id),
          quantity: quantity,
          price: electronicsItems[itemIndex].price
        }],
        status: 'DELIVERED',
        changedBy: customer1._id.toString(),
        createdAt: orderDate
      });
    }

    console.log('Additional orders created for ML testing');

    // Create test notifications
    console.log('Creating test notifications...');
    await Notification.create([
      {
        recipient: manager1._id,
        store: store1._id,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: 'iPhone 15 Pro is running low on stock (3 remaining)',
        isRead: false,
        item: Number(electronicsItems[0]._id)
      },
      {
        recipient: manager1._id,
        store: store1._id,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: 'Samsung 65" QLED TV is running low on stock (1 remaining)',
        isRead: false,
        item: Number(electronicsItems[3]._id)
      },
      {
        recipient: manager1._id,
        store: store1._id,
        type: 'order_placed',
        title: 'New Order',
        message: `Order #${order1._id} has been placed with total amount $${order1.totalAmount}`,
        isRead: true,
        order: Number(order1._id)
      },
      {
        recipient: manager1._id,
        store: store2._id,
        type: 'order_placed',
        title: 'New Order',
        message: `Order #${order2._id} has been placed with total amount $${order2.totalAmount}`,
        isRead: true,
        order: Number(order2._id)
      },
      {
        recipient: manager2._id,
        store: store3._id,
        type: 'order_placed',
        title: 'New Order',
        message: `Order #${order3._id} has been placed with total amount $${order3.totalAmount}`,
        isRead: true,
        order: Number(order3._id)
      },
      {
        recipient: customer1._id,
        store: store1._id,
        type: 'order_placed',
        title: 'Order Confirmation',
        message: `Your order #${order1._id} has been confirmed`,
        isRead: false,
        order: Number(order1._id)
      }
    ]);

    console.log('Notifications created');

    console.log('\nDatabase seeding completed successfully!');
    console.log('\nSeeded Data Summary:');
    console.log('4 Users (2 managers, 2 customers)');
    console.log('4 Stores with Indian locations:');
    console.log('   - Mumbai Electronics Hub (Mumbai, 400001)');
    console.log('   - Delhi Fashion Boutique (Delhi, 110001)');
    console.log('   - Bangalore Grocery Market (Bangalore, 560001)');
    console.log('   - Hyderabad Hardware Store (Hyderabad, 500034)');
    console.log('19 Items across all stores in MySQL (including edge cases)');
    console.log('18 Orders with realistic data in MySQL (3 original + 15 for ML)');
    console.log('6 Notifications (including low stock alerts)');
    console.log('Edge case items: Out of stock, High demand, Low stock alert');
    console.log('7-day order history for ML testing');
    console.log('\nAll SKUs generated automatically');
    console.log('All stores positioned in India with accurate coordinates');

  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    await mysqlPool.end();
    console.log('Database connections closed');
  }
}

seedDatabase();
