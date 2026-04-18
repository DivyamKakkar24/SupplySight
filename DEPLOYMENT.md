# SupplySight - Deployment & Testing Guide

## 🚀 Quick Start

This guide will help you deploy and test the SupplySight inventory management system with all its features.

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Python (v3.8 or higher) - for ML service
- Git

## 🛠️ Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd SupplySight

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install ML service dependencies
cd ../ml-service
pip install -r requirements.txt
```

### 2. Environment Setup

Create a `.env` file in the backend directory:

```bash
cd backend
touch .env
```

Add the following environment variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/supplysight

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# ML Service URL
ML_SERVICE_URL=http://localhost:8000
```

### 3. Database Setup

```bash
# Start MongoDB (if not running)
mongod

# In a new terminal, navigate to backend and seed the database
cd backend
npm run seed
```

## 🎯 Demo Data

The seed script creates comprehensive demo data including:

- **5 Users**: 2 managers, 3 customers
- **3 Stores**: Different locations with geospatial data
- **17 Items**: Various categories (smartphones, laptops, audio, gaming, etc.)
- **50+ Orders**: Historical order data for ML analysis
- **Multiple Notifications**: Low stock, out of stock, and ML suggestions

### Demo Credentials

**Manager Account:**
- Email: `manager1@test.com`
- Password: `password123`

**Customer Account:**
- Email: `customer1@test.com`
- Password: `password123`

## 🚀 Running the Application

### 1. Start Backend Server

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:5000`

### 2. Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### 3. Start ML Service (Optional)

```bash
cd ml-service
python api.py
```

The ML service will start on `http://localhost:8000`

## 🧪 Testing Features

### Automated Testing

Run the comprehensive feature verification:

```bash
cd backend
npm run verify
```

This will test:
- ✅ Authentication & Authorization
- ✅ Store Management
- ✅ Inventory Management
- ✅ Order Processing
- ✅ Notification System
- ✅ ML Service Integration
- ✅ Frontend Routing

### Manual Testing Checklist

#### 1. Landing Page
- [ ] Visit `http://localhost:5173`
- [ ] Verify professional design and responsive layout
- [ ] Test "Get Started" button navigation
- [ ] Check demo credentials display

#### 2. Authentication
- [ ] Test manager login with demo credentials
- [ ] Test customer login with demo credentials
- [ ] Test invalid login attempts
- [ ] Test user registration
- [ ] Verify role-based access control

#### 3. Store Management
- [ ] View all stores on the map
- [ ] Click on store markers for details
- [ ] Navigate to store detail pages
- [ ] Verify geospatial data display

#### 4. Inventory Management
- [ ] Browse items by store
- [ ] View item details and stock levels
- [ ] Test item creation (manager only)
- [ ] Verify SKU auto-generation
- [ ] Check reorder threshold functionality

#### 5. Order Processing
- [ ] Place orders as customer
- [ ] View order history
- [ ] Test order status tracking
- [ ] Verify inventory decrement on orders

#### 6. Notifications
- [ ] Check real-time notification polling
- [ ] View low stock alerts
- [ ] View out of stock alerts
- [ ] Test ML reorder suggestions
- [ ] Mark notifications as read

#### 7. ML Features
- [ ] Access ML forecasting (manager dashboard)
- [ ] View demand predictions
- [ ] Check reorder suggestions
- [ ] Verify confidence scoring

#### 8. Analytics & Dashboards
- [ ] View manager dashboard with analytics
- [ ] Check customer dashboard
- [ ] Verify order analytics
- [ ] Test inventory reports

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Ensure MongoDB is running
mongod

# Check connection string in .env file
MONGODB_URI=mongodb://localhost:27017/supplysight
```

#### 2. JWT Token Issues
```bash
# Regenerate JWT secret
JWT_SECRET=your-new-super-secret-key-here
```

#### 3. CORS Issues
- Check that frontend is running on correct port
- Verify backend CORS configuration
- Clear browser cache

#### 4. ML Service Not Responding
```bash
# Check if ML service is running
curl http://localhost:8000/health

# Start ML service if needed
cd ml-service
python api.py
```

### Database Reset

To reset the database and reseed:

```bash
cd backend
npm run seed
```

## 📊 Feature Overview

### Core Features Tested

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control
   - Password hashing with bcrypt
   - Session management

2. **Store Management**
   - Multi-location store support
   - Geospatial indexing
   - Interactive mapping with Leaflet
   - Store-specific inventory

3. **Inventory Management**
   - Real-time stock tracking
   - Automatic SKU generation
   - Reorder threshold monitoring
   - Category organization

4. **Order Processing**
   - Customer order placement
   - Atomic quantity decrement
   - Order history tracking
   - Manager order management

5. **ML-Powered Forecasting**
   - 7-day sales analysis
   - Demand prediction
   - Reorder suggestions
   - Confidence scoring

6. **Smart Notifications**
   - Real-time polling
   - Low stock alerts
   - Out of stock alerts
   - ML reorder suggestions

7. **Interactive Maps**
   - Store visualization
   - Interactive markers
   - Geospatial queries
   - Responsive design

## 🎉 Success Indicators

When all features are working correctly, you should see:

- ✅ Professional landing page with demo credentials
- ✅ Successful login for both manager and customer roles
- ✅ Interactive store map with 3 locations
- ✅ 17+ items across multiple categories
- ✅ Real-time notifications for low stock items
- ✅ ML forecasting with confidence scores
- ✅ Order processing with inventory updates
- ✅ Comprehensive analytics dashboards

## 📝 Next Steps

After successful deployment and testing:

1. **Customize the application** for your specific needs
2. **Add more stores and inventory** using the admin interface
3. **Configure email notifications** for production use
4. **Deploy to production** with proper security measures
5. **Set up monitoring** for the ML service and database

## 🆘 Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all services are running on correct ports
3. Ensure MongoDB is accessible
4. Check environment variables are properly set
5. Run the verification script: `npm run verify`

---

**SupplySight** - Modern inventory management powered by AI and real-time analytics.


