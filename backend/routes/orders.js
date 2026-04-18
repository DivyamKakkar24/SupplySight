const express = require('express');
const MysqlOrder = require('../models/MysqlOrder');
const Inventory = require('../models/Inventory');
const Store = require('../models/Store');
const Notification = require('../models/Notification');
const { populateStores, populateCustomers, populateOrderItems } = require('../utils/populateHelper');
const { authenticateToken, requireCustomer, requireManager } = require('../middleware/auth');

const router = express.Router();

async function populateOrder(order, itemSelectFields) {
  const arr = Array.isArray(order) ? order : [order];
  await populateCustomers(arr, 'name email');
  await populateStores(arr, 'name address');
  await populateOrderItems(arr, itemSelectFields || 'name price sku');
  return order;
}

// Create order (customer only)
router.post('/', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { storeId, items, phone, address, city, state, pincode } = req.body;

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Store ID and items array are required'
      });
    }

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const orderItem of items) {
      const { itemId, quantity } = orderItem;

      if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({
          error: 'Valid item ID and quantity are required for each item'
        });
      }

      const item = await Inventory.findById(itemId);
      if (!item || !item.isActive || item.storeId !== storeId) {
        return res.status(404).json({
          error: `Item ${itemId} not found in this store`
        });
      }

      if (item.quantity < quantity) {
        return res.status(400).json({
          error: `Insufficient inventory for ${item.name}. Available: ${item.quantity}`
        });
      }

      orderItems.push({
        itemId: Number(item._id),
        quantity,
        price: item.price
      });

      totalAmount += item.price * quantity;
    }

    const order = await MysqlOrder.create({
      customerId: req.user._id.toString(),
      storeId,
      items: orderItems,
      changedBy: req.user._id.toString(),
      phone, address, city, state, pincode
    });

    const notification = new Notification({
      type: 'order_placed',
      title: 'New Order Received',
      message: `Order #${order._id} has been placed with total amount $${totalAmount.toFixed(2)}`,
      store: storeId,
      order: Number(order._id),
      recipient: store.manager
    });
    await notification.save();

    await populateOrder(order);

    res.status(201).json({
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get orders based on user role
router.get('/', authenticateToken, async (req, res) => {
  try {
    let orders;

    if (req.user.role === 'manager') {
      const managerStores = await Store.find({
        manager: req.user._id,
        isActive: true
      });
      const storeIds = managerStores.map(store => store._id.toString());
      orders = await MysqlOrder.findByStoreIds(storeIds);
      await populateOrder(orders);
    } else {
      orders = await MysqlOrder.findByCustomerId(req.user._id.toString());
      await populateStores(orders, 'name address');
      await populateOrderItems(orders, 'name price sku');
    }

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get manager's orders (manager only)
router.get('/manager/my-orders', authenticateToken, requireManager, async (req, res) => {
  try {
    const managerStores = await Store.find({
      manager: req.user._id,
      isActive: true
    });
    const storeIds = managerStores.map(store => store._id.toString());

    const orders = await MysqlOrder.findByStoreIds(storeIds);
    await populateOrder(orders);
    res.json({ orders });
  } catch (error) {
    console.error('Get manager orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Public endpoint for ML service to get orders (no authentication required)
router.get('/ml/public', async (req, res) => {
  try {
    const { storeId, since } = req.query;
    const orders = await MysqlOrder.findAll({ storeId, since });
    await populateOrder(orders);
    res.json({ orders });
  } catch (error) {
    console.error('Get public orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID (customer only, their own orders)
router.get('/:orderId', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const order = await MysqlOrder.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await populateOrder(order, 'name price sku description');

    if (!order.customer || order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only view your own orders' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

const ORDER_STATUS_FLOW = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const CANCELLABLE_BEFORE = ['PLACED', 'CONFIRMED', 'PACKED'];

// Update order status (manager only, for their stores)
router.put('/:orderId/status', authenticateToken, requireManager, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !ORDER_STATUS_FLOW.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${ORDER_STATUS_FLOW.join(', ')}`
      });
    }

    let order = await MysqlOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await populateStores([order]);
    if (!order.store || order.store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only update orders for your own stores' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cancelled orders cannot be updated' });
    }
    if (order.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Delivered orders cannot be updated' });
    }

    const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status);
    const nextIdx = ORDER_STATUS_FLOW.indexOf(status);

    if (nextIdx !== currentIdx + 1) {
      return res.status(400).json({
        error: `Invalid transition from ${order.status} to ${status}. Next allowed: ${ORDER_STATUS_FLOW[currentIdx + 1] || 'none'}`
      });
    }

    order = await MysqlOrder.updateStatus(orderId, status, req.user._id.toString());

    const notification = new Notification({
      type: 'order_status_changed',
      title: `Order ${status.replace(/_/g, ' ')}`,
      message: `Your order #${order._id} status has been updated to ${status.replace(/_/g, ' ')}`,
      store: order.storeId,
      order: Number(order._id),
      recipient: order.customerId,
      metadata: { status }
    });
    await notification.save();

    await populateOrder(order);

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order — customer (their own, before shipped) or manager (their store)
router.put('/:orderId/cancel', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    let order = await MysqlOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await populateStores([order]);

    const isManager = req.user.role === 'manager' &&
      order.store && order.store.manager.toString() === req.user._id.toString();
    const isOrderOwner = req.user.role === 'customer' &&
      order.customerId === req.user._id.toString();

    if (!isManager && !isOrderOwner) {
      return res.status(403).json({ error: 'You are not authorized to cancel this order' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    if (isOrderOwner && !CANCELLABLE_BEFORE.includes(order.status)) {
      return res.status(400).json({
        error: `Orders cannot be cancelled after they are ${order.status}`
      });
    }

    if (isManager && order.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Delivered orders cannot be cancelled' });
    }

    const storeObj = order.store;
    const orderCustomerId = order.customerId;
    const orderStoreId = order.storeId;
    const cancelledItems = order.items || [];

    order = await MysqlOrder.updateStatus(orderId, 'CANCELLED', req.user._id.toString());

    for (const oi of cancelledItems) {
      const itemId = typeof oi.item === 'object' ? oi.item._id : oi.item;
      await Inventory.incrementQuantity(Number(itemId), oi.quantity);
    }

    if (isOrderOwner) {
      const notification = new Notification({
        type: 'order_cancelled',
        title: 'Order Cancelled by Customer',
        message: `Order #${order._id} was cancelled by the customer`,
        store: orderStoreId,
        order: Number(order._id),
        recipient: storeObj ? storeObj.manager : orderStoreId
      });
      await notification.save();
    } else {
      const notification = new Notification({
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order #${order._id} has been cancelled`,
        store: orderStoreId,
        order: Number(order._id),
        recipient: orderCustomerId
      });
      await notification.save();
    }

    await populateOrder(order);

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get store orders (manager only, their stores)
router.get('/store/:storeId', authenticateToken, async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (req.user.role !== 'manager' || store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only view orders for your own stores' });
    }

    const orders = await MysqlOrder.findByStoreId(storeId);
    await populateCustomers(orders, 'name email');
    await populateOrderItems(orders, 'name price sku');
    res.json({ orders });
  } catch (error) {
    console.error('Get store orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
