const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const testUsers = {
  manager: {
    email: 'manager@supplysight.com',
    password: 'manager123'
  },
  customer: {
    email: 'customer@supplysight.com',
    password: 'customer123'
  }
};

let authTokens = {};

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
};

const testEndpoint = async (name, method, url, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    log(`Pass ${name} - Status: ${response.status}`, 'success');
    return response.data;
  } catch (error) {
    log(`Fail ${name} - Error: ${error.response?.status || error.message}`, 'error');
    if (error.response?.data) {
      console.log('Response:', error.response.data);
    }
    return null;
  }
};

const testAuthentication = async () => {
  log('Testing Authentication Features...', 'info');

  const managerLogin = await testEndpoint(
    'Manager Login', 'POST', '/api/auth/login',
    { ...testUsers.manager, role: 'manager' }
  );
  if (managerLogin?.token) {
    authTokens.manager = managerLogin.token;
    log('Manager authentication successful', 'success');
  }

  const customerLogin = await testEndpoint(
    'Customer Login', 'POST', '/api/auth/login',
    { ...testUsers.customer, role: 'customer' }
  );
  if (customerLogin?.token) {
    authTokens.customer = customerLogin.token;
    log('Customer authentication successful', 'success');
  }

  await testEndpoint(
    'Invalid Login', 'POST', '/api/auth/login',
    { email: 'invalid@test.com', password: 'wrong', role: 'customer' }
  );

  await testEndpoint(
    'User Registration', 'POST', '/api/auth/register',
    { name: 'Test User', email: 'test@supplysight.com', password: 'test123', role: 'customer' }
  );
};

const testStoreManagement = async () => {
  log('Testing Store Management Features...', 'info');

  await testEndpoint('Get All Stores', 'GET', '/api/stores');

  await testEndpoint(
    'Get Stores (Manager)', 'GET', '/api/stores',
    null, { Authorization: `Bearer ${authTokens.manager}` }
  );

  const stores = await testEndpoint(
    'Get Store Details', 'GET', '/api/stores',
    null, { Authorization: `Bearer ${authTokens.manager}` }
  );

  if (stores?.length > 0) {
    const storeId = stores[0]._id;
    await testEndpoint(
      'Get Single Store', 'GET', `/api/stores/${storeId}`,
      null, { Authorization: `Bearer ${authTokens.manager}` }
    );
  }
};

const testInventoryManagement = async () => {
  log('Testing Inventory Management Features...', 'info');

  await testEndpoint(
    'Get All Items', 'GET', '/api/items',
    null, { Authorization: `Bearer ${authTokens.manager}` }
  );

  const stores = await testEndpoint(
    'Get Stores for Items', 'GET', '/api/stores',
    null, { Authorization: `Bearer ${authTokens.manager}` }
  );

  if (stores?.length > 0) {
    const storeId = stores[0]._id;
    await testEndpoint(
      'Get Items by Store', 'GET', `/api/items/store/${storeId}`,
      null, { Authorization: `Bearer ${authTokens.manager}` }
    );
  }

  if (authTokens.manager) {
    const storesForItem = await testEndpoint(
      'Get Stores for New Item', 'GET', '/api/stores',
      null, { Authorization: `Bearer ${authTokens.manager}` }
    );

    if (storesForItem?.length > 0) {
      await testEndpoint(
        'Create New Item', 'POST', `/api/items/store/${storesForItem[0]._id}`,
        {
          name: 'Test Product',
          description: 'Test product for verification',
          price: 99.99,
          quantity: 10,
          reorderThreshold: 5,
          category: 'Test Category'
        },
        { Authorization: `Bearer ${authTokens.manager}` }
      );
    }
  }
};

const testOrderManagement = async () => {
  log('Testing Order Management Features...', 'info');

  await testEndpoint(
    'Get All Orders (Manager)', 'GET', '/api/orders',
    null, { Authorization: `Bearer ${authTokens.manager}` }
  );

  await testEndpoint(
    'Get Customer Orders', 'GET', '/api/orders',
    null, { Authorization: `Bearer ${authTokens.customer}` }
  );

  const stores = await testEndpoint(
    'Get Stores for Order', 'GET', '/api/stores',
    null, { Authorization: `Bearer ${authTokens.customer}` }
  );

  const itemsResp = await testEndpoint(
    'Get Items for Order', 'GET', '/api/items',
    null, { Authorization: `Bearer ${authTokens.customer}` }
  );

  const items = itemsResp?.items || itemsResp;

  if (stores?.length > 0 && items?.length > 0) {
    await testEndpoint(
      'Create Test Order', 'POST', '/api/orders',
      {
        storeId: stores[0]._id,
        items: [{
          itemId: items[0]._id,
          quantity: 1,
          price: items[0].price
        }]
      },
      { Authorization: `Bearer ${authTokens.customer}` }
    );
  }
};

const testNotifications = async () => {
  log('Testing Notification Features...', 'info');

  await testEndpoint(
    'Get Manager Notifications', 'GET', '/api/notifications',
    null, { Authorization: `Bearer ${authTokens.manager}` }
  );

  await testEndpoint(
    'Get Customer Notifications', 'GET', '/api/notifications',
    null, { Authorization: `Bearer ${authTokens.customer}` }
  );

  const notifResp = await testEndpoint(
    'Get Notifications for Marking', 'GET', '/api/notifications',
    null, { Authorization: `Bearer ${authTokens.manager}` }
  );

  const notifications = notifResp?.notifications || notifResp;

  if (notifications?.length > 0) {
    await testEndpoint(
      'Mark Notification as Read', 'PUT', `/api/notifications/${notifications[0]._id}/read`,
      null, { Authorization: `Bearer ${authTokens.manager}` }
    );
  }
};

const testMLService = async () => {
  log('Testing ML Service Features...', 'info');

  try {
    const healthResponse = await axios.get(`${ML_SERVICE_URL}/health`);
    log(`ML Service Health - Status: ${healthResponse.status}`, 'success');

    const stores = await testEndpoint(
      'Get Stores for ML Test', 'GET', '/api/stores',
      null, { Authorization: `Bearer ${authTokens.manager}` }
    );

    if (stores?.length > 0) {
      await testEndpoint(
        'ML Forecasting', 'POST', '/api/ml/forecast',
        { storeId: stores[0]._id },
        { Authorization: `Bearer ${authTokens.manager}` }
      );
    }
  } catch (error) {
    log(`ML Service Test - Error: ${error.message}`, 'error');
    log('Note: ML service might not be running. This is expected if not deployed.', 'warning');
  }
};

const testDatabaseConnection = async () => {
  log('Testing Database Connection...', 'info');

  try {
    const healthResp = await axios.get(`${BASE_URL}/api/health`);
    log(`MongoDB: ${healthResp.data.mongodb}`, 'info');
    log(`MySQL: ${healthResp.data.mysql}`, 'info');

    if (healthResp.data.mongodb === 'connected' && healthResp.data.mysql === 'connected') {
      log('Both databases connected successfully', 'success');
    }
  } catch (error) {
    log(`Database connection check failed: ${error.message}`, 'error');
  }
};

const testFrontendRoutes = async () => {
  log('Testing Frontend Routes...', 'info');

  const routes = ['/', '/login', '/register', '/dashboard', '/stores', '/orders', '/notifications', '/profile'];

  for (const route of routes) {
    try {
      const response = await axios.get(`${BASE_URL.replace('/api', '')}${route}`, {
        validateStatus: () => true
      });
      log(`Route ${route} - Status: ${response.status}`, 'success');
    } catch (error) {
      log(`Route ${route} - Error: ${error.message}`, 'error');
    }
  }
};

const verifyFeatures = async () => {
  log('Starting SupplySight Feature Verification...', 'info');

  try {
    await testDatabaseConnection();
    await testAuthentication();
    await testStoreManagement();
    await testInventoryManagement();
    await testOrderManagement();
    await testNotifications();
    await testMLService();
    await testFrontendRoutes();

    log('Feature verification completed!', 'success');
    log('Demo Credentials:', 'info');
    log('Manager: manager@supplysight.com / manager123', 'info');
    log('Customer: customer@supplysight.com / customer123', 'info');
  } catch (error) {
    log(`Verification failed: ${error.message}`, 'error');
    process.exit(1);
  }
};

if (require.main === module) {
  verifyFeatures();
}

module.exports = { verifyFeatures };
