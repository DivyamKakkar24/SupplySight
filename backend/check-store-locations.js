const Store = require('./models/MysqlStore');
const mysqlPool = require('./config/mysql');
require('dotenv').config();

const checkStoreLocations = async () => {
  try {
    const stores = await Store.findAll({ activeOnly: false });

    console.log('\n📍 Store Locations:');
    console.log('==================');

    stores.forEach((store, index) => {
      const coords = store.location.coordinates;
      console.log(`${index + 1}. ${store.name}`);
      console.log(`   Address: ${store.address}`);
      console.log(`   Coordinates: [${coords[1]}, ${coords[0]}] (lat, lng)`);
      console.log(`   Manager ID: ${store.manager}`);
      console.log('');
    });

    console.log('✅ Store location check completed');

  } catch (error) {
    console.error('❌ Error checking store locations:', error);
  } finally {
    await mysqlPool.end();
    console.log('Disconnected from MySQL');
  }
};

checkStoreLocations();
