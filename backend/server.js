const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const storeRoutes = require('./routes/stores');
const itemRoutes = require('./routes/items');
const orderRoutes = require('./routes/orders');
const notificationRoutes = require('./routes/notifications');
const mlRoutes = require('./routes/ml');
const { enhancedInventoryMonitoring, testMLServiceConnection } = require('./utils/cronJobs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fast-commerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ml', mlRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test ML service connection on startup
app.get('/api/test-ml', async (req, res) => {
  try {
    const isConnected = await testMLServiceConnection();
    res.json({ 
      mlServiceConnected: isConnected,
      message: isConnected ? 'ML service is accessible' : 'ML service is not accessible'
    });
  } catch (error) {
    res.json({ 
      mlServiceConnected: false,
      error: error.message 
    });
  }
});

// Test cron job endpoint
app.post('/api/test-cron', async (req, res) => {
  try {
    await enhancedInventoryMonitoring();
    res.json({
      success: true,
      message: 'Cron job executed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cron job execution failed',
      error: error.message
    });
  }
});

// Cron job for enhanced inventory monitoring (runs every hour by default)
const cronSchedule = process.env.CRON_SCHEDULE || '0 * * * *'; // Every hour
cron.schedule(cronSchedule, async () => {
  console.log('Running enhanced inventory monitoring cron job...');
  await enhancedInventoryMonitoring();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
  }
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`ML service test: http://localhost:${PORT}/api/test-ml`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 