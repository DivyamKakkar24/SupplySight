const mysqlPool = require('./config/mysql');

const checkUsers = async () => {
  try {
    const [users] = await mysqlPool.execute('SELECT name, email, role FROM users');
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mysqlPool.end();
  }
};

checkUsers();
