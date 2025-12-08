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

module.exports = router;    