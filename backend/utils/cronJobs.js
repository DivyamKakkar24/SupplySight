const Item = require('../models/Item');
const Store = require('../models/Store');
const Notification = require('../models/Notification');
const axios = require('axios');

// Configure axios for ML service calls
const mlServiceClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  timeout: 10000,
  family: 4 // Force IPv4
});

// Check inventory levels and create notifications
const checkInventoryLevels = async () => {
  try {
    console.log('Starting inventory level check...');
    
    // Find all items that need reorder
    const lowStockItems = await Item.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderThreshold'] }
    }).populate('store');
    
    console.log(`Found ${lowStockItems.length} items with low stock`);
    
    for (const item of lowStockItems) {
      // Check if notification already exists for this item
      const existingNotification = await Notification.findOne({
        item: item._id,
        type: 'low_stock',
        isRead: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });
      
      if (!existingNotification) {
        // Create notification for store manager
        const notification = new Notification({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${item.name} (SKU: ${item.sku}) is running low on stock. Current quantity: ${item.quantity}, Threshold: ${item.reorderThreshold}`,
          store: item.store._id,
          item: item._id,
          recipient: item.store.manager,
          metadata: {
            currentQuantity: item.quantity,
            reorderThreshold: item.reorderThreshold,
            suggestedReorder: item.reorderThreshold * 2
          }
        });
        
        await notification.save();
        console.log(`Created low stock notification for ${item.name}`);
      }
    }
    
    // Check for out of stock items
    const outOfStockItems = await Item.find({
      isActive: true,
      quantity: 0
    }).populate('store');
    
    console.log(`Found ${outOfStockItems.length} out of stock items`);
    
    for (const item of outOfStockItems) {
      // Check if notification already exists for this item
      const existingNotification = await Notification.findOne({
        item: item._id,
        type: 'out_of_stock',
        isRead: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });
      
      if (!existingNotification) {
        // Create notification for store manager
        const notification = new Notification({
          type: 'out_of_stock',
          title: 'Out of Stock Alert',
          message: `${item.name} (SKU: ${item.sku}) is completely out of stock!`,
          store: item.store._id,
          item: item._id,
          recipient: item.store.manager,
          metadata: {
            currentQuantity: 0,
            reorderThreshold: item.reorderThreshold,
            suggestedReorder: item.reorderThreshold * 3
          }
        });
        
        await notification.save();
        console.log(`Created out of stock notification for ${item.name}`);
      }
    }
    
    console.log('Inventory level check completed');
  } catch (error) {
    console.error('Error in inventory level check:', error);
  }
};

// Generate reorder suggestions using ML service
const generateReorderSuggestions = async () => {
  try {
    console.log('Starting ML-powered reorder suggestions generation...');
    
    // Get all stores
    const stores = await Store.find({ isActive: true });
    
    for (const store of stores) {
      try {
        // Get low stock items for this store
        const lowStockItems = await Item.find({
          store: store._id,
          isActive: true,
          $expr: { $lte: ['$quantity', '$reorderThreshold'] }
        });
        
        if (lowStockItems.length === 0) {
          console.log(`No low stock items found for store: ${store.name}`);
          continue;
        }
        
        console.log(`Processing ${lowStockItems.length} low stock items for store: ${store.name}`);
        
        for (const item of lowStockItems) {
          try {
            // Check if ML suggestion notification already exists
            const existingNotification = await Notification.findOne({
              item: item._id,
              type: 'reorder_suggestion',
              isRead: false,
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            });
            
            if (!existingNotification) {
              // Get ML suggestion for this item
              let suggestedQuantity = item.reorderThreshold * 2; // Default fallback
              let mlReasoning = 'Based on current stock levels';
              
              try {
                // Call ML service for forecasting
                const mlResponse = await mlServiceClient.post('/forecast', {
                  storeId: store._id,
                  itemId: item._id
                });
                
                if (mlResponse.data && mlResponse.data.suggestedQty) {
                  suggestedQuantity = mlResponse.data.suggestedQty;
                  mlReasoning = mlResponse.data.reasoning || 'ML-powered suggestion';
                  console.log(`ML suggestion for ${item.name}: ${suggestedQuantity} units`);
                }
              } catch (mlError) {
                console.error(`ML service error for item ${item.name}:`, mlError.message);
                // Fall back to basic suggestion
                suggestedQuantity = Math.ceil(item.reorderThreshold * 2);
                mlReasoning = 'Basic suggestion (ML service unavailable)';
              }
              
              const notification = new Notification({
                type: 'reorder_suggestion',
                title: 'ML-Powered Reorder Suggestion',
                message: `Consider reordering ${item.name} (SKU: ${item.sku}). Suggested quantity: ${suggestedQuantity}`,
                store: store._id,
                item: item._id,
                recipient: store.manager,
                metadata: {
                  currentQuantity: item.quantity,
                  suggestedQuantity,
                  reason: mlReasoning,
                  mlPowered: true
                }
              });
              
              await notification.save();
              console.log(`Created ML-powered reorder suggestion for ${item.name} in ${store.name}`);
            }
          } catch (itemError) {
            console.error(`Error processing item ${item.name}:`, itemError.message);
          }
        }
      } catch (storeError) {
        console.error(`Error processing store ${store.name}:`, storeError.message);
      }
    }
    
    console.log('ML-powered reorder suggestions generation completed');
  } catch (error) {
    console.error('Error in reorder suggestions generation:', error);
  }
};

// Enhanced inventory monitoring with ML integration
const enhancedInventoryMonitoring = async () => {
  try {
    console.log('Starting enhanced inventory monitoring with ML integration...');
    
    // Run basic inventory check
    await checkInventoryLevels();
    
    // Run ML-powered suggestions
    await generateReorderSuggestions();
    
    console.log('Enhanced inventory monitoring completed');
  } catch (error) {
    console.error('Error in enhanced inventory monitoring:', error);
  }
};

// Clean up old notifications (older than 30 days)
const cleanupOldNotifications = async () => {
  try {
    console.log('Starting notification cleanup...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error('Error in notification cleanup:', error);
  }
};

// Test ML service connectivity
const testMLServiceConnection = async () => {
  try {
    console.log('Testing ML service connection...');
    
    const response = await mlServiceClient.get('/health');
    
    if (response.data.status === 'healthy') {
      console.log('✅ ML service is healthy and accessible');
      return true;
    } else {
      console.log('⚠️ ML service health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ ML service connection failed:', error.message);
    return false;
  }
};

module.exports = {
  checkInventoryLevels,
  generateReorderSuggestions,
  enhancedInventoryMonitoring,
  cleanupOldNotifications,
  testMLServiceConnection
}; 