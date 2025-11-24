const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');
const axios = require('axios');
const kyc_url = "https://api.aoc-portal.com/v1/whatsapp";

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
    const { ids,userid } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No IDs selected"
      });
    }

    // console.log("Received IDs:", ids);

    const idList = ids.join(',');

    const result = await sequelize.query(
      "EXEC selected_sms_ids @ids = :ids, @userid = :userid",
      {
        replacements: { ids: idList, userid },
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
        message: "Thanks! Your KYC details are now updated.",
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
exports.support_process = async (req, res) => {
  try {
    const { txnid, excelid,name,description } = req.body;

    if (!txnid || !excelid || !name || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const query = `
      DECLARE @output INT;
      EXEC support_process 
          @txnid = :txnid,
          @excelid = :excelid,
          @name = :name,
          @description = :description,          
          @insertedid = @output OUTPUT;
      SELECT @output AS insertedid;
    `;
    
    const result = await sequelize.query(query, {
      replacements: { txnid, excelid, name,description },
      type: sequelize.QueryTypes.SELECT
    });

    const insertedid = result[0].insertedid;

    // ⭐ Check success or failure based on OUTPUT value
    if (insertedid && insertedid > 0) {
      return res.status(200).json({
        success: true,
        message: "Your Support details updated — our team will review shortly.",
        insertedid: insertedid
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Support insertion failed",
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
exports.support_report = async (req, res) => {
  try {
    const { fromdate, todate,userid } = req.body;
    
    // Validation
    if (!fromdate || !todate || !userid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing parameters',
      });
    }

   
    const fromdate1 = convertDate(fromdate);
    const todate1 = convertDate(todate);

    // Query
   const [results] = await sequelize.query(
  `EXEC support_report @fromDate = :fromdate, @toDate = :todate, @userid = :userid`,
  {
    replacements: {
      fromdate: fromdate1, // e.g. '2025-01-01'
      todate: todate1,     // e.g. '2025-11-01'
      userid: userid
    },
  }
);
    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error('❌ /support_report controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.show_policy_count = async (req, res) => {
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
      `exec get_policy_count 
        @userid = :userid,
        @fromdate = :fromdate,
        @todate = :todate`,
      {
        replacements: { userid, fromdate: fromdate1, todate: todate1 }
      }
    );

    res.status(200).json({
      success: true,      
      data: results,
      message: 'Data count fetched successfully',
    });

  } catch (err) {
    console.error('❌ /show_policy_count controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
exports.massive_update_ids = async (req, res) => {
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
      `exec massive_update_ids 
        @userid = :userid,
        @fromdate = :fromdate,
        @todate = :todate`,
      {
        replacements: { userid, fromdate: fromdate1, todate: todate1 }
      }
    );

     const response = results[0];
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
    console.error('❌ /massive_update_ids controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};