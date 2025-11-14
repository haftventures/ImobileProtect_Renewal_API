const express = require('express');
const router = express.Router();
const RenewalController = require('../Controller/renewalController');

// ✅ Router test
router.post('/renewal/get_upload_data_list', RenewalController.get_upload_data_list);
router.post('/renewal/selected_sms_ids', RenewalController.selected_sms_ids);
router.post('/renewal/KYC_process', RenewalController.KYC_process);

module.exports = router;    