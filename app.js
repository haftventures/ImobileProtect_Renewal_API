// app.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: './config/config.env' });

const { connectDB } = require('./config/connectdatabase');

// Routes
const PolicyRenewalRoutes = require('./routes/Policy_renewal');
const RenewalRoutes = require('./routes/renewal');
const MakeRoutes = require('./routes/make');
const DB_DataRoutes = require('./routes/DB_Data');
const PaymentRoutes = require('./routes/Payment');
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Static files
app.use('/Gallery', express.static(path.join(__dirname, 'Gallery')));

// Routes
app.use('/api', PolicyRenewalRoutes);
app.use('/api', RenewalRoutes);
app.use('/api', MakeRoutes);
app.use('/api', DB_DataRoutes);
app.use('/api', PaymentRoutes);
// Health check
app.get('/', (req, res) => {
  res.send('Server is running ✅');
});

// ❗ IIS requires PORT only
const PORT = process.env.PORT || 8000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

startServer();
