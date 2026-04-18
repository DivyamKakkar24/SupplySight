const express = require('express');
const Store = require('../models/Store');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get stores based on user role (authenticated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let stores;
    
    if (req.user.role === 'manager') {
      // Managers only see their own stores
      stores = await Store.find({ 
        manager: req.user._id,
        isActive: true 
      })
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });
    } else {
      // Customers see all stores
      stores = await Store.find({ isActive: true })
        .populate('manager', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({ stores });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get all stores (public - for map display)
router.get('/public', async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });

    res.json({ stores });
  } catch (error) {
    console.error('Get public stores error:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get store by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('manager', 'name email');

    if (!store || !store.isActive) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({ store });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// Create store (manager only)
router.post('/', authenticateToken, requireManager, async (req, res) => {
  try {
    const { name, description, address, coordinates } = req.body;

    if (!name || !address || !coordinates) {
      return res.status(400).json({ 
        error: 'Name, address, and coordinates are required' 
      });
    }

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ 
        error: 'Coordinates must be an array with [longitude, latitude]' 
      });
    }

    const store = new Store({
      name,
      description,
      address,
      location: {
        type: 'Point',
        coordinates
      },
      manager: req.user._id
    });

    await store.save();
    await store.populate('manager', 'name email');

    res.status(201).json({
      message: 'Store created successfully',
      store
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// Update store (manager only, owner only)
router.put('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { name, description, address, coordinates } = req.body;
    const storeId = req.params.id;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check if user owns this store
    if (store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only update your own stores' });
    }

    // Update fields
    if (name) store.name = name;
    if (description !== undefined) store.description = description;
    if (address) store.address = address;
    if (coordinates) {
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return res.status(400).json({ 
          error: 'Coordinates must be an array with [longitude, latitude]' 
        });
      }
      store.location.coordinates = coordinates;
    }

    await store.save();
    await store.populate('manager', 'name email');

    res.json({
      message: 'Store updated successfully',
      store
    });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// Delete store (manager only, owner only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const storeId = req.params.id;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Check if user owns this store
    if (store.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own stores' });
    }

    // Soft delete
    store.isActive = false;
    await store.save();

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

// Get stores by manager
router.get('/manager/my-stores', authenticateToken, requireManager, async (req, res) => {
  try {
    const stores = await Store.find({ 
      manager: req.user._id,
      isActive: true 
    })
    .populate('manager', 'name email')
    .sort({ createdAt: -1 });

    res.json({ stores });
  } catch (error) {
    console.error('Get manager stores error:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

module.exports = router; 