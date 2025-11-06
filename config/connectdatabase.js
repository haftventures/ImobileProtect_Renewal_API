// config/connectdatabase.js
const { Sequelize } = require('sequelize');
const { errorlog } = require('../Models/global_models'); // 👈 relative path adjusted

const connectionString = process.env.DB_URL1;

if (!connectionString) {
  console.error('❌ FATAL ERROR: DB_URL1 environment variable is not set.');
  process.exit(1);
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'mssql',
  logging: false,
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const connectDB = async () => {
  try {
    
    await sequelize.authenticate();
    
  } catch (err) {
    const errorDetails = {
      error_type: 'DB Connection Error',
      api_endpoint: 'Sequelize MSSQL Authentication',
      http_method: 'STARTUP',
      status_code: 500,
      error_message: err.message,
      stack_trace: err.stack || 'No stack trace',
    };
    console.error('❌ Sequelize MSSQL connection error:', err.message);
    errorlog(errorDetails);
    throw new Error('Database connection failed.');
  }
};

module.exports = { sequelize, connectDB };
