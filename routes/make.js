const express = require('express');
const router = express.Router();
const makeController = require('../Controller/Make_Controller');

router.post('/make/make_verify_details', makeController.make_verify_details);
router.post('/make/make_verified_details', makeController.make_verified_details);
router.get('/make/make_permission_list', makeController.make_permission_list);
router.post('/make/make_verified', makeController.make_verified);
router.get('/make/Excel_Makeedit_details', makeController.Excel_Makeedit_details);
router.post('/make/make_search', makeController.make_search);
router.post('/make/make_delete', makeController.make_delete);
router.post('/make/make_save', makeController.make_save);

module.exports = router;    