const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    required: false
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reorderThreshold: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  category: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
itemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Auto-generate SKU before saving
itemSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const store = await mongoose.model('Store').findById(this.store);
    if (!store) {
      throw new Error('Store not found');
    }
    
    // Generate SKU: STORE-NAME-ITEM-NAME-TIMESTAMP
    const timestamp = Date.now().toString().slice(-6);
    const storePrefix = store.name.replace(/\s+/g, '').toUpperCase().slice(0, 3);
    const itemPrefix = this.name.replace(/\s+/g, '').toUpperCase().slice(0, 3);
    this.sku = `${storePrefix}-${itemPrefix}-${timestamp}`;
    
    next();
  } catch (error) {
    next(error);
  }
});

// Check if item needs reorder
itemSchema.methods.needsReorder = function() {
  return this.quantity <= this.reorderThreshold;
};

// Decrement quantity (atomic operation)
itemSchema.methods.decrementQuantity = async function(amount) {
  if (this.quantity < amount) {
    throw new Error('Insufficient inventory');
  }
  this.quantity -= amount;
  return this.save();
};

module.exports = mongoose.model('Item', itemSchema); 