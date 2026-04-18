const express = require('express');
const Item = require('../models/Item');
const Store = require('../models/Store');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get all items (public) — supports ?search= to filter by name or category
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    const query = { isActive: true };

    if (search && search.trim().length > 0) {
      // Escape regex special characters in user input
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { name: regex },
        { category: regex },
        { description: regex }
      ];
    }

    const items = await Item.find(query)
      .populate('store', 'name address')
      .sort({ createdAt: -1 });

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

    const items = await Item.find({ 
      store: storeId,
      isActive: true 
    })
    .populate('store', 'name address')
    .sort({ createdAt: -1 });

    res.json({ items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get item by ID (public)
router.get('/:itemId', async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId)
      .populate('store', 'name address');

    if (!item || !item.isActive) {
      return res.status(404).json({ error: 'Item not found' });
    }

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

    // Check if store exists and user owns it
    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only add items to your own stores' });
    }

    const item = new Item({
      name,
      description,
      price,
      quantity: quantity || 0,
      reorderThreshold: reorderThreshold || 10,
      category,
      store: storeId
    });

    await item.save();
    await item.populate('store', 'name address');

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

    const item = await Item.findById(itemId).populate('store');
    if (!item || !item.isActive) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if user owns the store
    if (item.store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only update items in your own stores' });
    }

    // Update fields
    if (name) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    if (quantity !== undefined) item.quantity = quantity;
    if (reorderThreshold !== undefined) item.reorderThreshold = reorderThreshold;
    if (category !== undefined) item.category = category;

    await item.save();
    await item.populate('store', 'name address');

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

    const item = await Item.findById(itemId).populate('store');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if user owns the store
    if (item.store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete items from your own stores' });
    }

    // Soft delete
    item.isActive = false;
    await item.save();

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get items by manager (all stores they own)
router.get('/manager/my-items', authenticateToken, requireManager, async (req, res) => {
  try {
    // Get stores owned by the manager
    const stores = await Store.find({ 
      manager: req.user._id,
      isActive: true 
    });

    const storeIds = stores.map(store => store._id);

    const items = await Item.find({ 
      store: { $in: storeIds },
      isActive: true 
    })
    .populate('store', 'name address')
    .sort({ createdAt: -1 });

    res.json({ items });
  } catch (error) {
    console.error('Get manager items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get low stock items for manager
router.get('/manager/low-stock', authenticateToken, requireManager, async (req, res) => {
  try {
    // Get stores owned by the manager
    const stores = await Store.find({ 
      manager: req.user._id,
      isActive: true 
    });

    const storeIds = stores.map(store => store._id);

    const lowStockItems = await Item.find({ 
      store: { $in: storeIds },
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderThreshold'] }
    })
    .populate('store', 'name address')
    .sort({ quantity: 1 });

    res.json({ items: lowStockItems });
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

module.exports = router; 