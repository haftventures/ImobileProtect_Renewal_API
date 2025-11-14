const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');
const axios = require('axios');

exports.get_upload_data_list = async (req, res) => {
  try {
    const { fromdate, todate, userid } = req.body;

    if (!fromdate || !todate || !userid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing parameters',
      });
    }
    
    const fromdate1 = convertDate(fromdate); // 2025-11-14
    const todate1 = convertDate(todate);     // 2025-11-14

    const [results] = await sequelize.query(
      `exec get_upload_data_list 
        @userid = :userid,
        @fromdate = :fromdate,
        @todate = :todate`,
      {
        replacements: { userid, fromdate: fromdate1, todate: todate1 }
      }
    );

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });

  } catch (err) {
    console.error('❌ /renewalList controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
exports.selected_sms_ids = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No IDs selected"
      });
    }

    // console.log("Received IDs:", ids);

    const idList = ids.join(',');

    const result = await sequelize.query(
      "EXEC selected_sms_ids @ids = :ids",
      {
        replacements: { ids: idList },
        type: sequelize.QueryTypes.SELECT
      }
    );   
      const response = result[0];
    if(response.status=="Success"){
    return res.status(200).json({
      success: true,
      message: response.status,
      inserted: response.inserted_count
    });
  }
  else{
     return res.status(200).json({
      success: false,
      message: "Failure",
      inserted: 0
    });
  }

  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.KYC_process = async (req, res) => {
  try {
    const { txnid, excelid, pan, dob, name } = req.body;

    if (!txnid || !excelid || !pan || !dob || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const query = `
      DECLARE @output INT;
      EXEC KYC_process 
          @txnid = :txnid,
          @excelid = :excelid,
          @pan = :pan,
          @dob = :dob,
          @name = :name,
          @insertedid = @output OUTPUT;
      SELECT @output AS insertedid;
    `;
    const dob1=convertDate(dob);
    const result = await sequelize.query(query, {
      replacements: { txnid, excelid, pan,dob:dob1, name },
      type: sequelize.QueryTypes.SELECT
    });

    const insertedid = result[0].insertedid;

    // ⭐ Check success or failure based on OUTPUT value
    if (insertedid && insertedid > 0) {
      return res.status(200).json({
        success: true,
        message: "KYC inserted successfully",
        insertedid: insertedid
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "KYC insertion failed",
        insertedid: 0
      });
    }

  } catch (err) {
    console.error(err);
    errorlog(err, req);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message
    });
  }
};

