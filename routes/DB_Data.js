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


module.exports = router;    