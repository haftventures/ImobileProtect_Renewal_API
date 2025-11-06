// routes/Policy_renewal.js
const express = require('express');
const router = express.Router();
const policyRenewalController = require('../Controller/Policy_renewalController');

// ✅ Router test
router.get('/Policy_renewal/getrenewaldata', policyRenewalController.getrenewaldata);
router.post('/Policy_renewal/renewalList', policyRenewalController.renewalList);
router.post('/Policy_renewal/paymentsuccess', policyRenewalController.paymentsuccess);
router.post('/Policy_renewal/Report', policyRenewalController.Report);
router.post('/Policy_renewal/duration_based_amount', policyRenewalController.duration_based_amount);
router.post('/Policy_renewal/paymentlink_duration_based', policyRenewalController.paymentlink_duration_based);
router.post('/Policy_renewal/paymentreport', policyRenewalController.paymentreport);

module.exports = router;
