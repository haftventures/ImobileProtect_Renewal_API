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
    if (insertedid > 0) {
      return res.status(200).json({
        success: true,
        message: "Thanks! Your KYC details are now updated.",
        insertedid: insertedid
      });
    }
    else  if (insertedid == 0) {
      return res.status(200).json({
        success: true,
        message: "Thanks! Your KYC details are already submitted.",
        insertedid: insertedid
      });
    }    
    else {
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
exports.support_reply = async (req, res) => {
  try {
    // ✅ Combine destructuring into one line
    const { supportid, message,createby,mobileno } = req.body;         
  
    const query = `
  DECLARE @insertedid INT;
  EXEC support_reply
      @createby = :createby,
      @support_id = :supportid,
      @message = :message,
      @mobile = :mobile,
      @insertedid = @insertedid OUTPUT;
  SELECT @insertedid AS insertedid;
`;

const results = await sequelize.query(query, {
  replacements: {
    createby,
    supportid,
    message,
    mobile: mobileno
  },
  type: sequelize.QueryTypes.SELECT
});

// results is an array like: [ { insertedid: 12 } ]
const insertedId = results?.[0]?.insertedid ?? null;

    if (insertedId > 0) {

    let whatsappResponse = null;

      try {
        const url = "https://api.aoc-portal.com/v1/whatsapp";

        const payload = {
          from: "+919344118986",
          campaignName: "api-test",
          to: `+91${mobileno}`,
          templateName: "support_reply",
          components: {
            body: {
              params: ["Customer.", message]
            },
            header: {
              type: "text",
              text: "text value"
            }
          },
          type: "template"
        };

        const headers = {
          apikey: "fXsUv7l3Uhxo4YR9ADsx6CTp1TjcX6",
          "Content-Type": "application/json"
        };

        const response = await axios.post(url, payload, { headers });
        whatsappResponse = response.data;

      } catch (whatsErr) {
        whatsappResponse = {
          success: false,
          error: whatsErr.response?.data || whatsErr.message
        };
      }

      return res.json({
        success: true,
        message: "Your support reply has been sent successfully.",
        insertedId,
        whatsapp: whatsappResponse
      });    
    }
    else if (insertedId == 0) {
      return res.status(200).json({
        success: false,
        message: "This support response is already recorded",
        insertedid: insertedId
      });
    }    
    else {
      return res.json({
        success: false,
        message: 'Support Reply failed to inserted',
      });
    }
  } catch (err) {
    console.error('❌ operation_policy_save error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};
exports.support_reply_view = async (req, res) => {
  try {
    // ✅ Combine destructuring into one line
    const { transactionid } = req.body;      
     
     // Query
   const [results] = await sequelize.query(
  `EXEC support_reply_view @transactionid = :transactionid`,
  {
    replacements: {
      transactionid: transactionid     
    },
  }
); 
res.status(200).json({
      success: true,
      message: 'Support Data fetched successfully',
      count: results.length,
      data: results,
    });
    
  } catch (err) {
    console.error('❌ operation_policy_save error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
};
exports.dashboard_list = async (req, res) => {
  try {

    // Get inputs
    const { month, year, userid } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "month and year are required"
      });
    }

   
    // Stored Procedure call
    const query = `
      EXEC dashboard_list 
        @month = :month,
        @year   = :year,
        @userid   = :userid
    `;

    const results = await sequelize.query(query, {
      replacements: { month,year, userid },
      type: sequelize.QueryTypes.SELECT
    });

    // SQL returns multiple resultsets → Sequelize flattens them
    // So we must group them manually
    
    const response = {
      today: {
        linkopen: results[0]?.today_linkopen ?? 0,
        payment_success: results[1]?.today_Payment_Success ?? 0,
        payment_failed: results[2]?.today_Payment_Failed ?? 0,
        kyc: results[3]?.today_KYC ?? 0,
        policy_open: results[4]?.today_Policy_Open ?? 0,
        policy_waiting: results[5]?.today_Policy_waiting ?? 0,
        policy: results[6]?.today_Policy ?? 0
      },
      month: {
        linkopen: results[7]?.month_linkopen ?? 0,
        payment_success: results[8]?.month_Payment_Success ?? 0,
        payment_failed: results[9]?.month_Payment_Failed ?? 0,
        kyc: results[10]?.month_KYC ?? 0,
        policy_open: results[11]?.month_Policy_Open ?? 0,
        policy_waiting: results[12]?.month_Policy_waiting ?? 0,
        policy: results[13]?.month_Policy ?? 0
      }
    };

    return res.json({
      success: true,
      message: "Dashboard data loaded successfully",
      data: response
    });

  } catch (err) {
    console.error("❌ dashboard_list error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};
exports.report_policy_done_details = async (req, res) => {
  try {

    // Get inputs
    const { report_id } = req.query;

    // Stored Procedure call
    const query = `
      EXEC report_policy_done_details 
        @report_id = :report_id       
    `;

    const results = await sequelize.query(query, {
      replacements: { report_id },
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      success: true,
      message: "data loaded successfully",
      data: results
    });

  } catch (err) {
    console.error("❌ report_policy_done_details error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};
exports.report_policy_done_excel = async (req, res) => {
  try {

    // Get inputs
    const { userid,status,fromdate,todate } = req.body;
    const fromdate1=convertDate(fromdate);
    const todate1=convertDate(todate);
    // Stored Procedure call
    const query = `
      EXEC report_policy_done_excel 
        @userid = :userid,
        @status = :status,
        @fromdate = :fromdate,
        @todate = :todate
    `;

    const results = await sequelize.query(query, {
      replacements: { userid,status,fromdate:fromdate1,todate:todate1 },
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      success: true,
      message: "data loaded successfully",
      data: results
    });

  } catch (err) {
    console.error("❌ report_policy_done_excel error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};
