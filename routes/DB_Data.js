const express = require('express');
const router = express.Router();
const DB_DataController = require('../Controller/DB_Data_Controller');

router.post('/DB_Data/bulk_data_move_count', DB_DataController.bulk_data_move_count);
router.post('/DB_Data/bulk_data_update_table', DB_DataController.bulk_data_update_table);
router.post('/DB_Data/DB_get_citylist', DB_DataController.DB_get_citylist);
router.post('/DB_Data/DB_get_modellist', DB_DataController.DB_get_modellist);
router.post('/DB_Data/DB_get_rtolist', DB_DataController.DB_get_rtolist);
router.post('/DB_Data/bulk_data_move_table', DB_DataController.bulk_data_move_table);
router.post('/DB_Data/DB_get_uploadexcel_modellist', DB_DataController.DB_get_uploadexcel_modellist);
router.post('/DB_Data/DB_smssend_viewchk', DB_DataController.DB_smssend_viewchk);
router.post('/DB_Data/DB_get_uploadexcel_citylist', DB_DataController.DB_get_uploadexcel_citylist);
router.post('/DB_Data/DB_get_uploadexcel_rtolist', DB_DataController.DB_get_uploadexcel_rtolist);
router.post('/DB_Data/DB_uploadexcel_bulk_data_move_count', DB_DataController.DB_uploadexcel_bulk_data_move_count);
router.post('/DB_Data/DB_uploadexcel_bulk_data_move_table', DB_DataController.DB_uploadexcel_bulk_data_move_table);

router.post('/DB_Data/DB_get_statelist', DB_DataController.DB_get_statelist);
router.post('/DB_Data/DB_get_uploadexcel_statelist', DB_DataController.DB_get_uploadexcel_statelist);

router.post('/DB_Data/DB_get_statelist_amount', DB_DataController.DB_get_statelist_amount);
router.post('/DB_Data/DB_get_citylist_amount', DB_DataController.DB_get_citylist_amount);
router.post('/DB_Data/DB_get_modellist_amount', DB_DataController.DB_get_modellist_amount);
router.post('/DB_Data/DB_get_rtolist_amount', DB_DataController.DB_get_rtolist_amount);
router.post('/DB_Data/bulk_data_amount_count', DB_DataController.bulk_data_amount_count);
router.post('/DB_Data/bulk_amount_update', DB_DataController.bulk_amount_update);
router.post('/DB_Data/bulk_sms_status_update', DB_DataController.bulk_sms_status_update);

module.exports = router;    