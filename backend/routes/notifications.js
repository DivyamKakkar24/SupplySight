const express = require('express');
const Notification = require('../models/MysqlNotification');
const Inventory = require('../models/Inventory');
const MysqlOrder = require('../models/MysqlOrder');
const MysqlStore = require('../models/MysqlStore');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications for user (with optional since parameter for polling)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { since, limit = 50, unreadOnly = false } = req.query;

    let storeIds;
    if (req.user.role === 'manager') {
      const managerStores = await MysqlStore.findByManagerId(req.user._id);
      storeIds = managerStores.map(store => Number(store._id));
    }

    let sinceDate;
    if (since) {
      const parsed = new Date(since);
      if (!isNaN(parsed.getTime())) sinceDate = parsed;
    }

    const notifications = await Notification.findForUser({
      recipientId: req.user._id,
      storeIds,
      since: sinceDate,
      unreadOnly: unreadOnly === 'true',
      limit
    });

    // Populate store (now in MySQL)
    const storeIdsToFetch = [...new Set(notifications.map(n => n.store).filter(Boolean))];
    const storeMap = {};
    if (storeIdsToFetch.length > 0) {
      const stores = await MysqlStore.findByIds(storeIdsToFetch);
      for (const s of stores) {
        storeMap[s._id] = { _id: s._id, name: s.name, address: s.address };
      }
    }

    // Cross-DB populate for items (now in MySQL)
    const itemIds = [...new Set(notifications.map(n => n.item).filter(Boolean))];
    const itemMap = {};
    if (itemIds.length > 0) {
      const items = await Inventory.findByIds(itemIds);
      for (const i of items) {
        itemMap[String(i._id)] = { _id: i._id, name: i.name, sku: i.sku };
      }
    }

    // Cross-DB populate for orders (now in MySQL)
    const orderIds = [...new Set(notifications.map(n => n.order).filter(Boolean))];
    const orderMap = {};
    if (orderIds.length > 0) {
      const orders = await MysqlOrder.findByIds(orderIds);
      for (const o of orders) {
        orderMap[String(o._id)] = { _id: o._id, totalAmount: o.totalAmount };
      }
    }

    const result = notifications.map(n => ({
      ...n,
      store: storeMap[String(n.store)] || null,
      item: n.item ? (itemMap[String(n.item)] || null) : null,
      order: n.order ? (orderMap[String(n.order)] || null) : null
    }));

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

    await Notification.markRead(notificationId);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.markAllRead(req.user._id);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get unread count
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countUnread(req.user._id);

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

    await Notification.deleteById(notificationId);

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications for user
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteAllForUser(req.user._id);

    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

module.exports = router;
