const express = require('express');
const router = express.Router();
const RenewalController = require('../Controller/renewalController');

// ✅ Router test
router.post('/renewal/get_upload_data_list', RenewalController.get_upload_data_list);
router.post('/renewal/selected_sms_ids', RenewalController.selected_sms_ids);
router.post('/renewal/KYC_process', RenewalController.KYC_process);
router.post('/renewal/support_process', RenewalController.support_process);
router.post('/renewal/support_report', RenewalController.support_report);
router.post('/renewal/show_policy_count', RenewalController.show_policy_count);
router.post('/renewal/massive_update_ids', RenewalController.massive_update_ids);
router.post('/renewal/support_reply', RenewalController.support_reply);
router.post('/renewal/support_reply_view', RenewalController.support_reply_view);
router.post('/renewal/dashboard_list', RenewalController.dashboard_list);
router.get('/renewal/report_policy_done_details', RenewalController.report_policy_done_details);
router.post('/renewal/report_policy_done_excel', RenewalController.report_policy_done_excel);
router.post('/renewal/policy_details_save', RenewalController.policy_details_save);

module.exports = router;    