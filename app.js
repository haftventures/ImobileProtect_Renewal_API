// app.js
const express = require('express');
const dotenv = require('dotenv');
require('dotenv').config({ path: './config/config.env' });
const { connectDB } = require('./config/connectdatabase');

// ✅ Import your router file directly
const PolicyRenewalRoutes = require('./routes/Policy_renewal');
const RenewalRoutes = require('./routes/renewal');
const app = express();
app.use(express.json());

// ✅ Mount the router
app.use('/api', PolicyRenewalRoutes);
app.use('/api', RenewalRoutes);

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';

// ✅ Root test (optional)
app.get('/', (req, res) => {
  res.send('Server is running ✅');
});


async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, HOST, () => {
      console.log(`✅ Server running at http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to DB:', err.message);
  }
}

startServer();
