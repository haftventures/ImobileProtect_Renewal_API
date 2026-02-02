// routes/Policy_renewal.js
const express = require('express');
const router = express.Router();
const policyRenewalController = require('../Controller/Policy_renewalController');
const multer = require("multer");


// Store PDF in memory → buffer
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // max 20MB
});

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
// router.post('/Policy_renewal/operation_policy_save', policyRenewalController.operation_policy_save);

router.post('/Policy_renewal/login_website', policyRenewalController.login_website);
router.get('/Policy_renewal/policy_status', policyRenewalController.policy_status);
router.post('/Policy_renewal/policy_report', policyRenewalController.policy_report);
router.get('/Policy_renewal/get_pdf_path', policyRenewalController.get_pdf_path);
router.post('/Policy_renewal/not_interested', policyRenewalController.not_interested);
router.get('/Policy_renewal/policy_company_list', policyRenewalController.policy_company_list);
router.post("/Policy_renewal/Policyentry_save",upload.single("pdfFile"),policyRenewalController.Policyentry_save);
router.post("/Policy_renewal/policy_deails_show",policyRenewalController.policy_deails_show);
router.post(
  "/Policy_renewal/operation_policy_save",
  upload.single("pdfFile"),
  policyRenewalController.operation_policy_save
);
router.post(
  "/Policy_renewal/Policyentry_save_ocr",
  upload.single("pdfFile"),
  policyRenewalController.Policyentry_save_ocr
);


module.exports = router;    
