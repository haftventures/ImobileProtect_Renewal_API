const express = require('express');
const router = express.Router();
const paymentController = require('../Controller/Payment_Controller');
router.post('/Payment/payment_verify', paymentController.payment_verify);
module.exports = router;    