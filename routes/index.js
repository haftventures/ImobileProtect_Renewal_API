const express = require('express');
const router = express.Router();

// Grouping similar route files together
const routeFiles = [  
  './Policy_renewal',
  './renewal',
  './make',
];

// Import and use all route modules
routeFiles.forEach(routePath => {
  const routeModule = require(routePath);
  router.use('/', routeModule);  // all subroutes will be handled inside
});

module.exports = router;
