import sequelize from '../config/database.js';
import '../models/index.js';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    await sequelize.sync({ alter: true });
    console.log('All tables synced successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
