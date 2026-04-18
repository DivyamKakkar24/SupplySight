const mongoose = require('mongoose');
const Store = require('./models/Store');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fast-commerce';

const checkStoreLocations = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const stores = await Store.find({}).populate('manager', 'name');
    
    console.log('\n📍 Store Locations:');
    console.log('==================');
    
    stores.forEach((store, index) => {
      const coords = store.location.coordinates;
      console.log(`${index + 1}. ${store.name}`);
      console.log(`   Address: ${store.address}`);
      console.log(`   Coordinates: [${coords[1]}, ${coords[0]}] (lat, lng)`);
      console.log(`   Manager: ${store.manager?.name || 'None'}`);
      console.log('');
    });
    
    console.log('✅ Store location check completed');
    
  } catch (error) {
    console.error('❌ Error checking store locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

checkStoreLocations(); 