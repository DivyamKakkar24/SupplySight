const express = require('express');
const Inventory = require('../models/Inventory');
const Store = require('../models/Store');
const { populateStores } = require('../utils/populateHelper');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get all items (public) — supports ?search= to filter by name or category
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const items = await Inventory.findAll({ search });
    await populateStores(items, 'name address');
    res.json({ items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get items by store (public)
router.get('/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const items = await Inventory.findByStoreId(storeId);
    await populateStores(items, 'name address');
    res.json({ items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get item by ID (public)
router.get('/:itemId', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.itemId);
    if (!item || !item.isActive) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await populateStores([item], 'name address');
    res.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create item (manager only, store owner only)
router.post('/store/:storeId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, description, price, quantity, reorderThreshold, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        error: 'Name and price are required'
      });
    }

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only add items to your own stores' });
    }

    const item = await Inventory.create({
      name,
      description,
      price,
      quantity: quantity || 0,
      reorderThreshold: reorderThreshold || 10,
      category,
      storeId: store._id.toString(),
      storeName: store.name
    });

    await populateStores([item], 'name address');

    res.status(201).json({
      message: 'Item created successfully',
      item
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item (manager only, store owner only)
router.put('/:itemId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, price, quantity, reorderThreshold, category } = req.body;

    let item = await Inventory.findById(itemId);
    if (!item || !item.isActive) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await populateStores([item]);
    if (!item.store || item.store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only update items in your own stores' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (reorderThreshold !== undefined) updateData.reorderThreshold = reorderThreshold;
    if (category !== undefined) updateData.category = category;

    item = await Inventory.update(itemId, updateData);
    await populateStores([item], 'name address');

    res.json({
      message: 'Item updated successfully',
      item
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item (manager only, store owner only)
router.delete('/:itemId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Inventory.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await populateStores([item]);
    if (!item.store || item.store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete items from your own stores' });
    }

    await Inventory.softDelete(itemId);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get items by manager (all stores they own)
router.get('/manager/my-items', authenticateToken, requireManager, async (req, res) => {
  try {
    const stores = await Store.find({
      manager: req.user._id,
      isActive: true
    });
    const storeIds = stores.map(store => store._id.toString());

    const items = await Inventory.findByStoreIds(storeIds);
    await populateStores(items, 'name address');
    res.json({ items });
  } catch (error) {
    console.error('Get manager items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get low stock items for manager
router.get('/manager/low-stock', authenticateToken, requireManager, async (req, res) => {
  try {
    const stores = await Store.find({
      manager: req.user._id,
      isActive: true
    });
    const storeIds = stores.map(store => store._id.toString());

    const lowStockItems = await Inventory.findLowStock(storeIds);
    await populateStores(lowStockItems, 'name address');
    res.json({ items: lowStockItems });
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

module.exports = router;
