const express = require('express');
const Notification = require('../models/Notification');
const Inventory = require('../models/Inventory');
const MysqlOrder = require('../models/MysqlOrder');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications for user (with optional since parameter for polling)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { since, limit = 50, unreadOnly = false } = req.query;

    let query = { recipient: req.user._id };

    if (req.user.role === 'manager') {
      const Store = require('../models/Store');
      const managerStores = await Store.find({
        manager: req.user._id,
        isActive: true
      });
      const storeIds = managerStores.map(store => store._id);
      query.store = { $in: storeIds };
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    }

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('store', 'name address')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Cross-DB populate for items (now in MySQL)
    const itemIds = [...new Set(notifications.map(n => n.item).filter(Boolean))];
    const itemMap = {};
    if (itemIds.length > 0) {
      const items = await Inventory.findByIds(itemIds.map(Number));
      for (const i of items) {
        itemMap[String(i._id)] = { _id: i._id, name: i.name, sku: i.sku };
      }
    }

    // Cross-DB populate for orders (now in MySQL)
    const orderIds = [...new Set(notifications.map(n => n.order).filter(Boolean))];
    const orderMap = {};
    if (orderIds.length > 0) {
      const orders = await MysqlOrder.findByIds(orderIds.map(Number));
      for (const o of orders) {
        orderMap[String(o._id)] = { _id: o._id, totalAmount: o.totalAmount };
      }
    }

    const result = notifications.map(n => {
      const obj = n.toObject();
      if (obj.item) obj.item = itemMap[String(obj.item)] || null;
      if (obj.order) obj.order = orderMap[String(obj.order)] || null;
      return obj;
    });

    res.json({ notifications: result });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only mark your own notifications as read' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get unread count
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own notifications' });
    }

    await notification.deleteOne();

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications for user
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });

    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

module.exports = router;
