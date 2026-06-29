const express = require('express');
const MysqlCoupon = require('../models/MysqlCoupon');
const Store = require('../models/MysqlStore');
const { authenticateToken, requireManager, requireCustomer } = require('../middleware/auth');

const router = express.Router();

function validateCouponFields({ usageLimit, discountPercent, validTill }, { requireAll }) {
  if (requireAll || usageLimit !== undefined) {
    if (usageLimit === undefined || isNaN(usageLimit) || Number(usageLimit) < 0) {
      return 'Usage limit must be a non-negative number';
    }
  }
  if (requireAll || discountPercent !== undefined) {
    const pct = Number(discountPercent);
    if (discountPercent === undefined || isNaN(pct) || pct <= 0 || pct > 100) {
      return 'Discount % must be a number between 0 and 100';
    }
  }
  if (requireAll || validTill !== undefined) {
    if (!validTill || isNaN(new Date(validTill).getTime())) {
      return 'Valid Till must be a valid date';
    }
  }
  return null;
}

async function verifyStoreOwnership(storeId, userId) {
  const store = await Store.findById(storeId);
  if (!store || !store.isActive) {
    return { error: { status: 404, message: 'Store not found' } };
  }
  if (store.manager.toString() !== userId.toString()) {
    return { error: { status: 403, message: 'You can only manage coupons for your own stores' } };
  }
  return { store };
}

// Get all coupons for a store (manager only, store owner)
router.get('/store/:storeId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { error } = await verifyStoreOwnership(storeId, req.user._id);
    if (error) return res.status(error.status).json({ error: error.message });

    const coupons = await MysqlCoupon.findByStoreId(storeId);
    res.json({ coupons });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Get active coupons for a store (any authenticated customer, for checkout)
router.get('/store/:storeId/active', authenticateToken, async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const coupons = await MysqlCoupon.findActiveByStoreId(storeId);
    res.json({ coupons });
  } catch (error) {
    console.error('Get active coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch active coupons' });
  }
});

// Create coupon (manager only, store owner)
router.post('/store/:storeId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { code, usageLimit, discountPercent, validTill, status } = req.body;

    const { error } = await verifyStoreOwnership(storeId, req.user._id);
    if (error) return res.status(error.status).json({ error: error.message });

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }
    const fieldError = validateCouponFields({ usageLimit, discountPercent, validTill }, { requireAll: true });
    if (fieldError) {
      return res.status(400).json({ error: fieldError });
    }
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }

    const existing = await MysqlCoupon.findByStoreAndCode(storeId, code);
    if (existing) {
      return res.status(400).json({ error: 'A coupon with this code already exists for this store' });
    }

    const coupon = await MysqlCoupon.create({
      storeId,
      code,
      usageLimit: Number(usageLimit),
      discountPercent: Number(discountPercent),
      validTill,
      status
    });

    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// Update coupon (manager only, store owner) — code is immutable
router.put('/:couponId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { usageLimit, discountPercent, validTill, status } = req.body;

    const coupon = await MysqlCoupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const { error } = await verifyStoreOwnership(coupon.storeId, req.user._id);
    if (error) return res.status(error.status).json({ error: error.message });

    const fieldError = validateCouponFields({ usageLimit, discountPercent, validTill }, { requireAll: false });
    if (fieldError) {
      return res.status(400).json({ error: fieldError });
    }
    if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }

    const updated = await MysqlCoupon.update(couponId, {
      usageLimit: usageLimit !== undefined ? Number(usageLimit) : undefined,
      discountPercent: discountPercent !== undefined ? Number(discountPercent) : undefined,
      validTill,
      status
    });

    res.json({ message: 'Coupon updated successfully', coupon: updated });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// Apply coupon (customer only) — decrements usage limit and returns the discounted preview total
router.post('/:couponId/apply', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { storeId, subtotal } = req.body;

    if (!storeId || subtotal === undefined || isNaN(subtotal)) {
      return res.status(400).json({ error: 'storeId and subtotal are required' });
    }

    const coupon = await MysqlCoupon.findById(couponId);
    if (!coupon || String(coupon.storeId) !== String(storeId)) {
      return res.status(404).json({ error: 'Coupon not found for this store' });
    }
    if (coupon.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This coupon is no longer active' });
    }

    const updatedCoupon = await MysqlCoupon.decrementUsage(couponId);

    const discountAmount = Math.round(Number(subtotal) * coupon.discountPercent) / 100;
    const total = Number(subtotal) - discountAmount;

    res.json({ coupon: updatedCoupon, discountAmount, total });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(400).json({ error: error.message || 'Failed to apply coupon' });
  }
});

// Release coupon (customer only) — increments usage limit back
router.post('/:couponId/release', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { storeId } = req.body;

    const coupon = await MysqlCoupon.findById(couponId);
    if (!coupon || String(coupon.storeId) !== String(storeId)) {
      return res.status(404).json({ error: 'Coupon not found for this store' });
    }

    const updatedCoupon = await MysqlCoupon.incrementUsage(couponId);
    res.json({ coupon: updatedCoupon });
  } catch (error) {
    console.error('Release coupon error:', error);
    res.status(500).json({ error: 'Failed to release coupon' });
  }
});

module.exports = router;
