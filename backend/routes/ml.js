const express = require('express');
const axios = require('axios');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Configure axios to force IPv4
const axiosInstance = axios.create({
  family: 4, // Force IPv4
  timeout: 10000
});

// Get ML suggestions for store item
router.get('/suggestions/:storeId/:itemId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    
    // Call ML service - use IPv4 address to avoid IPv6 issues
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log(`Calling ML service: ${mlServiceUrl}/forecast`);
    
    const response = await axiosInstance.post(`${mlServiceUrl}/forecast`, {
      storeId,
      itemId
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('ML service error:', error.message);
    
    if (error.response) {
      // ML service returned an error
      res.status(error.response.status).json(error.response.data);
    } else {
      // Network or other error
      res.status(500).json({ 
        error: 'ML service unavailable',
        message: 'Unable to get inventory suggestions at this time'
      });
    }
  }
});

// Get ML suggestions for all items in a store
router.get('/suggestions/:storeId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // Call ML service for all items in store - use IPv4 address
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log(`Calling ML service: ${mlServiceUrl}/forecast/store`);
    
    const response = await axiosInstance.post(`${mlServiceUrl}/forecast/store`, {
      storeId
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('ML service error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'ML service unavailable',
        message: 'Unable to get inventory suggestions at this time'
      });
    }
  }
});

// Health check for ML service
router.get('/health', async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log(`Checking ML service health: ${mlServiceUrl}/health`);
    
    const response = await axiosInstance.get(`${mlServiceUrl}/health`);
    
    res.json({
      status: 'connected',
      mlService: response.data
    });
  } catch (error) {
    console.error('ML service health check failed:', error.message);
    res.json({
      status: 'disconnected',
      error: 'ML service unavailable'
    });
  }
});

module.exports = router; 