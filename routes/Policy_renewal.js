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
router.post('/Policy_renewal/userdetails', policyRenewalController.userdetails);
router.post('/Policy_renewal/single_userdetails', policyRenewalController.single_userdetails);
router.post('/Policy_renewal/operation_policy_prepare', policyRenewalController.operation_policy_prepare);
router.post('/Policy_renewal/user_insert', policyRenewalController.user_insert);
router.post('/Policy_renewal/policy_prepare_pending', policyRenewalController.policy_prepare_pending);
router.post('/Policy_renewal/policy_prepare_list', policyRenewalController.policy_prepare_list);
router.post('/Policy_renewal/payment_success_redirect', policyRenewalController.payment_success_redirect);
router.post('/Policy_renewal/operation_policy_save', policyRenewalController.operation_policy_save);
module.exports = router;
