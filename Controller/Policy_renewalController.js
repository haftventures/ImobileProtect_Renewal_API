const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');
const axios = require('axios');
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Store PDF in memory → buffer
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // max 20MB
});


// ---------------------------- testing links ----------------------------

const OAUTH_TOKEN_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
const CHECKOUT_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay';
const tokenUrl = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
const phonepe_success_Url ='https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order';

const AUTH_PAYLOAD = {
    client_id: 'TEST-M22AIQQJG6USL_25090',
    client_version: 1,
    client_secret: 'ZmUyY2YwOWQtYmJjOC00ZjU2LTliMjAtN2VmNGNmZTc4ZGI2',
    grant_type: 'client_credentials',
};

// --------------------------------------------------------------------

// ---------------------------- live links ----------------------------

// const OAUTH_TOKEN_URL = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
// const CHECKOUT_URL = 'https://api.phonepe.com/apis/pg/checkout/v2/pay';
// const tokenUrl = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
// const phonepe_success_Url ='https://api.phonepe.com/apis/pg/checkout/v2/order';
// const kyc_url = "https://api.aoc-portal.com/v1/whatsapp";

// const AUTH_PAYLOAD = {
//     client_id: 'SU2511111525407992747471',
//     client_version: 1,
//     client_secret: '6aa255b8-59f2-457d-aa02-c96bdbcfd532',
//     grant_type: 'client_credentials',
// };

// --------------------------------------------------------------------

async function getAccessToken() {
   

    const requestBody = new URLSearchParams(AUTH_PAYLOAD).toString();

    const options = {
        method: 'POST',
        url: OAUTH_TOKEN_URL,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: requestBody
    };

    try {
        const response = await axios.request(options);
        const { access_token, token_type } = response.data;
        
        //console.log(`✅ Token successfully fetched. Token Type: ${token_type}`);
        return access_token;
        
    } catch (error) {
        if (error.response) {
            console.error('PhonePe Token Error:', error.response.data);
        } else {
            console.error('Network or Request Error:', error.message);
        }
        throw new Error('Failed to obtain access token.'); 
    }
}
async function initiatePayment(accessToken, orderDetails) {   
    
    const amountInPaise = Math.round(orderDetails.amount * 100); 
    const merchantOrderId = orderDetails.transactionid + '-' + Math.random().toString(36).substring(2, 8);

    const requestBody = {
        "merchantOrderId": merchantOrderId,
        "amount": amountInPaise, 
        "expireAfter": 1200,
        "metaInfo": {
            "udf1": orderDetails.customername,
            "udf2": "",
            "udf3": orderDetails.transactionid,
            "udf4": orderDetails.amount,
            "udf5": orderDetails.id
        },
        "paymentFlow": {
            "type": "PG_CHECKOUT",
            "message": `Payment for Policy ID: ${orderDetails.id}`,
            "merchantUrls": {
                "redirectUrl": "https://renewal.jipolicy.com/success.html?txnid=" + orderDetails.transactionid + "&excelid=" + orderDetails.id+ "&merchantOrderId=" + merchantOrderId,
            },
            // "paymentModeConfig": {
            //     "disabledPaymentModes": [
            //         { "type": "UPI_INTENT" },
            //         { "type": "UPI_COLLECT" },
            //         { "type": "NET_BANKING" },
            //         { 
            //             "type": "CARD",
            //             "cardTypes": ["DEBIT_CARD", "CREDIT_CARD"]
            //         }
            //     ]
            // }
        }
    };
const query = `
    DECLARE @output_id INT;
    EXEC [dbo].[payment_getway]
        @transactionid = :transactionid,       
        @request = :request,
        @merchantorderid = :merchantorderid,     
        @excelid = :excelid,
        @amount=:amount,
        @idd = @output_id OUTPUT;
    SELECT @output_id AS inserted_id;
`;

const [result] = await sequelize.query(query, {
    replacements: {
        transactionid: orderDetails.transactionid,        
        request: JSON.stringify(requestBody),
        merchantorderid: merchantOrderId,
        excelid: orderDetails.id,
        amount: orderDetails.amount
    },
});
    try {
        const response = await axios.post(CHECKOUT_URL, requestBody, {
            headers: {
                'Authorization': `O-Bearer ${accessToken}`, 
                'Content-Type': 'application/json' 
            }
        });

        //console.log(`✅ Payment Initiation Successful. Status: ${response.status}`);
        return { paymentResponse: response.data, merchantOrderId, requestBody };
        
    } catch (error) {
        if (error.response) {
            console.error('PhonePe Checkout Error Response:', error.response.data);
            throw new Error(`PhonePe Checkout failed with status ${error.response.status}`);
        } else {
            console.error('Network Error during Checkout:', error.message);
            throw new Error('Failed to initiate payment with PhonePe.');
        }
    }
}
exports.getrenewaldata = async (req, res) => {
  try {
    const { txnid } = req.query;

    // ✅ Validate transaction ID
    if (!txnid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing Transaction ID parameter',
      });
    }

    // ✅ 1️⃣ Check if payment is already completed
    const checkQuery = `
      SELECT COUNT(*) AS countt
      FROM [T_Payment_getway]
      WHERE transactionid = :transactionid and statuss=2
    `;

    const [checkResult] = await sequelize.query(checkQuery, {
      replacements: { transactionid: txnid },
      type: sequelize.QueryTypes.SELECT,
    });

    if (checkResult.countt > 0) {

  const [resultss] = await sequelize.query(
    `EXEC payment_done @transactionid = :transactionid`,
  {
    replacements: {
      transactionid: txnid       
    },
  }
  );

  return res.status(200).json({
    success: false,
    message: "Payment already done for this transaction ID",
    renewalDatas: resultss[0]  // This is correct ✔
  });
}


    // ✅ 2️⃣ If not paid, fetch renewal data
    const [results] = await sequelize.query(
      `EXEC [getrenewaldata] @transactionid = :transactionid`,
  {
    replacements: {
      transactionid: txnid       
    },
  }
    );

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Renewal record not found.' });
    }

    const renewalData = results[0];

    // ✅ 3️⃣ Send response
    res.status(200).json({
      success: true,
      message: 'Renewal data fetched successfully.',
      renewalData,
    });
  } catch (err) {
    console.error('❌ /getrenewaldata controller error:', err.message);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
// exports.getrenewaldata = async (req, res) => {
//   try {
//     const { id } = req.query;
//     if (!id || isNaN(id)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid or missing ID parameter',
//       });
//     }

//     const [results] = await sequelize.query(
//       `SELECT TOP 10 id, customername, mobile, vehicleno, make, model, year, idv, cc, grosspremium, prev_policyno,transactionid,[oneyear]
//        FROM [T_Uplodpolicy_excel]
//        WHERE id = :id`,
//       { replacements: { id } }
//     );

//     res.status(200).json({
//       success: true,
//       message: 'Data fetched successfully unsdf',
//       count: results.length,
//       data: results,
//     });
//   } catch (err) {
//     console.error('❌ /getrenewaldata controller error:', err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
exports.renewalList = async (req, res) => {
  try {
    const { fromdate, todate } = req.body;
    
    // Validation
    if (!fromdate || !todate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing date parameters',
      });
    }

    // Convert dd/mm/yyyy → yyyy-mm-dd
    const convertDate = (d) => {
      const [day, month, year] = d.split('/');
      return `${year}-${month}-${day}`;
    };

    const fromdate1 = convertDate(fromdate);
    const todate1 = convertDate(todate);

    // Query
    const [results] = await sequelize.query(
      `SELECT id, customername, mobile, vehicleno, make, model, year, idv, cc, 
              prev_policyno, od, tp, netpremium, grosspremium, CONVERT(varchar(10),datee,103) as datee,transactionid,[oneyear]
       FROM [T_Uplodpolicy_excel]
       WHERE CAST(datee AS DATE) BETWEEN :fromdate AND :todate
       ORDER BY datee DESC`,
      {
        replacements: { fromdate: fromdate1, todate: todate1 },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error('❌ /renewalList controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.paymentsuccess = async (req, res) => {
  try {
    const {
      policyid, payment_status, transaction_id, upi_id, upi_name, amount,
       payment_date, createby} = req.body;
       const payment_date1=convertDate(payment_date)
    // 🧾 Validation
    if (!policyid || !payment_status || !transaction_id || !upi_id || !upi_name || !amount || !payment_date || !createby) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid parameters',
      });
    }

    // 🧠 SQL Query to call stored procedure
    const query = `
      DECLARE @output_id INT;
      EXEC [dbo].[policy_payment]
        @policyid = :policyid,
        @payment_status = :payment_status,
        @transaction_id = :transaction_id,
        @upi_id = :upi_id,
        @upi_name = :upi_name,
        @amount = :amount,
        @payment_date = :payment_date1,
        @createby = :createby,
        @idd = @output_id OUTPUT;
      SELECT @output_id AS inserted_id;
    `;

    // 🔥 Execute stored procedure
    const [result] = await sequelize.query(query, {
      replacements: {
        policyid,
        payment_status,
        transaction_id,
        upi_id,
        upi_name,
        amount,
        payment_date1,
        createby
      },
    });

    // 🧩 Extract inserted id
    const inserted_id = result[0]?.inserted_id || null;

    if (inserted_id) {
      return res.status(200).json({
        success: true,
        message: 'Payment details saved successfully',
        inserted_id,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Payment details not saved — no ID returned',
      });
    }
  } catch (err) {
    console.error('❌ Error in paymentsuccess:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      message: err.message || 'Unexpected error occurred',
    });
  }
};
exports.Report = async (req, res) => {
  try {
    const { fromdate, todate } = req.body;
    
    // Validation
    if (!fromdate || !todate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing date parameters',
      });
    }

    // Convert dd/mm/yyyy → yyyy-mm-dd
    const convertDate = (d) => {
      const [day, month, year] = d.split('/');
      return `${year}-${month}-${day}`;
    };

    const fromdate1 = convertDate(fromdate);
    const todate1 = convertDate(todate);

    // Query
    const [results] = await sequelize.query(
      `  select te.id,te.customername,te.mobile,te.vehicleno,te.make,te.model,
      te.year,te.idv,te.cc,te.od,te.tp,te.netpremium,te.grosspremium,
      tp.transaction_id as Payment_trans_id,tp.amount as paymentamount,
      CONVERT(varchar(10),tp.payment_date,103) as payment_date,tp.payment_status
      ,convert(varchar(10),tp.datee,103) as date,transactionid from [dbo].[T_Policy] tp,
      T_Uplodpolicy_excel te where te.id=tp.policyid and CAST(tp.datee AS DATE) 
      BETWEEN :fromdate AND :todate`,
      {
        replacements: { fromdate: fromdate1, todate: todate1 },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error('❌ /renewalList controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.duration_based_amount = async (req, res) => {
    try {
        const { year, transaction_id } = req.body;

        if (!year || !transaction_id) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or missing parameters (year and transaction_id are required)',
            });
        }

        const yearCondition = parseInt(year, 10); 

        const [results] = await sequelize.query(
            `SELECT
                CASE :yearCondition
                    WHEN 1 THEN [oneyear]     
                    WHEN 2 THEN [twoyear]     
                    WHEN 3 THEN [threeyear]  
                    ELSE NULL
                END AS premium_amount
            FROM [dbo].[T_Uplodpolicy_excel]
            WHERE transactionid = :transaction_id`,
            {
                replacements: { 
                    transaction_id, 
                    yearCondition 
                },
            }
        );
        
        const premiumValue = results.length > 0 ? results[0].premium_amount : null;

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction ID not found.',
            });
        }
        
        res.status(200).json({
            success: true,
            message: `Saved successfully`,
            data: { 
                transaction_id, 
                year_duration: yearCondition,
                premium_amount: premiumValue 
            },
        });
    } catch (err) {
        console.error('❌ /duration_based_amount controller error:', err);
        errorlog(err, req);
        res.status(500).json({
            success: false,
            error: err.message || 'Unexpected error',
        });
    }
};
exports.paymentlink_duration_based = async (req, res) => {
  try {
    const { customername, mobile, transactionid, id, amount, year } = req.body;

    // ✅ Validate input
    if (!customername || !transactionid || !mobile || !id || !amount || !year) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid or missing parameters (customername, mobile, transactionid, id, amount, and year are required)',
      });
    }

    // ✅ 1️⃣ Check if payment already done for this transactionid
    const checkQuery = `
      SELECT COUNT(*) AS countt 
      FROM [T_Payment_getway] 
      WHERE transactionid = :transactionid and statuss=2
    `;
    const [checkResult] = await sequelize.query(checkQuery, {
      replacements: { transactionid },
      type: sequelize.QueryTypes.SELECT,
    });

    if (checkResult.countt > 0) {
      return res.status(200).json({
        success: false,
        message: 'Payment already done for this transaction ID',
      });
    }

    // ✅ 2️⃣ Proceed with payment if not done already
    const accessToken = await getAccessToken();

    const renewalData = {
      customername,
      mobile,
      transactionid,
      id,
      amount,
      year,
    };

    const { paymentResponse, merchantOrderId } = await initiatePayment(
      accessToken,
      renewalData
    );

    // ✅ 3️⃣ Insert payment gateway response
    const query = `
      EXEC [dbo].[payment_getway_response]
        @transactionid = :transactionid,
        @orderid = :orderid,
        @response = :response,
        @merchantorderid = :merchantorderid;
    `;

    const [result] = await sequelize.query(query, {
      replacements: {
        transactionid,
        orderid: paymentResponse.orderId,
        response: JSON.stringify(paymentResponse),
        merchantorderid: merchantOrderId,
      },
    });

    // 🧩 Optional: Extract inserted ID
    const inserted_id = result?.[0]?.inserted_id || null;

    // ✅ 4️⃣ Send success response
    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: paymentResponse,      
    });
  } catch (err) {
    console.error('❌ /duration_based_amount controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.paymentreport = async (req, res) => {
  try {
    const { fromdate, todate,status } = req.body;
    
    // Validation
    if (!fromdate || !todate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing date parameters',
      });
    }

    // Convert dd/mm/yyyy → yyyy-mm-dd
    const convertDate = (d) => {
      const [day, month, year] = d.split('/');
      return `${year}-${month}-${day}`;
    };

    const fromdate1 = convertDate(fromdate);
    const todate1 = convertDate(todate);

    // Query
   const [results] = await sequelize.query(
  `EXEC get_payment_status @fromDate = :fromdate, @toDate = :todate, @status = :status`,
  {
    replacements: {
      fromdate: fromdate1, // e.g. '2025-01-01'
      todate: todate1,     // e.g. '2025-11-01'
      status: status
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
    console.error('❌ /paymentreport controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.userdetails = async (req, res) => {
  try {
    const { userid, status } = req.body;

    // 🧩 Input validation
    if (!userid || !status) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID or status',
      });
    }

    // 🧠 Run your stored procedure
    const [results] = await sequelize.query(
      `EXEC get_user_details @userid = :userid, @status = :status`,
      {
        replacements: { userid, status },
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found',
      });
    }

    // 🧩 Parse the JSON string
    const rawJson = results[0]['FullJson'];
    const EmpCode = results[0]['EmpCode'];
    const parsedData = JSON.parse(rawJson);

    // 🧾 Separate the lists
    const { BranchList = [], RoleList = [], UserList = [] } = parsedData;

    // ✅ Send clean structured output
    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      count: UserList.length,
      BranchList,
      RoleList,
      UserList,
      EmpCode,
    });

  } catch (err) {
    console.error('❌ /userdetails controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.single_userdetails = async (req, res) => {
  try {
    const { userid } = req.body;

    // 🧩 Input validation
    if (!userid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    // 🧠 Run your stored procedure
    const [results] = await sequelize.query(
      `EXEC get_particular_user_details @userid = :userid`,
      {
        replacements: { userid },
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found',
      });
    }

    // ✅ Send clean structured output
    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      count: results.length,
      results,
    });

  } catch (err) {
    console.error('❌ /single_userdetails controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.operation_policy_prepare = async (req, res) => {
  try {
    const { id } = req.body;

    // 🧩 Input validation
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing ID',
      });
    }

    // 🧠 Run your stored procedure
    const [results] = await sequelize.query(
      `EXEC operation_policy_prepare @id = :id`,
      {
        replacements: { id },
      }
    );

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found',
      });
    }

    // ✅ Send clean structured output
    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      count: results.length,
      results,
    });

  } catch (err) {
    console.error('❌ /operation_policy_prepare controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.user_insert = async (req, res) => {
  try {
    // 🧠 Step 1: Extract data from request body
    const {
      name,
      qualification,
      fatersname,
      dob,
      fatheroccupation,
      address,
      permanentaddress,
      mobile,
      altmobile1,
      altmobile2,
      bloodgroup,
      emailid,
      jointdate,
      salary,
      pf,
      esi,
      td,
      deduction,
      bankname,
      accno,
      ifsccode,
      branchid,
      roleid,
      username,
      password,
      statuss,
      insertstatus,
      userid,
      createdid
    } = req.body;

    // 🧩 Step 2: Validate mandatory fields
    if (!username || !address || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, emailid, or mobile"
      });
    }
    
    const dob1=convertDate(dob);
    const jointdate1=convertDate(jointdate);

    // 🧠 Step 3: Prepare SQL query
    const query = `
      DECLARE @outputstatus INT;
      EXEC [dbo].[user_insert_update]
        @name = :name,
        @qualification = :qualification,
        @fatersname = :fatersname,
        @dob = :dob,
        @fatheroccupation = :fatheroccupation,
        @address = :address,
        @permanentaddress = :permanentaddress,
        @mobile = :mobile,
        @altmobile1 = :altmobile1,
        @altmobile2 = :altmobile2,
        @bloodgroup = :bloodgroup,
        @emailid = :emailid,
        @jointdate = :jointdate,
        @salary = :salary,
        @pf = :pf,
        @esi = :esi,
        @td = :td,
        @deduction = :deduction,
        @bankname = :bankname,
        @accno = :accno,
        @ifsccode = :ifsccode,
        @branchid = :branchid,
        @roleid = :roleid,
        @username = :username,
        @password = :password,
        @statuss = :statuss,
        @insertstatus = :insertstatus,
        @userid = :userid,
        @createdid = :createdid,
        @outputstatus = @outputstatus OUTPUT;
      SELECT @outputstatus AS outputstatus;
    `;

    // 🧩 Step 4: Execute stored procedure
    const [result] = await sequelize.query(query, {
      replacements: {
        name,
        qualification,
        fatersname,
        dob: dob1,
        fatheroccupation,
        address,
        permanentaddress,
        mobile,
        altmobile1,
        altmobile2,
        bloodgroup,
        emailid,
        jointdate: jointdate1,
        salary,
        pf,
        esi,
        td,
        deduction,
        bankname,
        accno,
        ifsccode,
        branchid,
        roleid,
        username,
        password,
        statuss,
        insertstatus,
        userid,
        createdid
      },
      type: sequelize.QueryTypes.SELECT
    });

    // 🧠 Step 5: Get output status value
    const outputstatus = result?.outputstatus ?? null;

    // ✅ Step 6: Send success response
    if(insertstatus=="1"){
    res.status(200).json({
      success: true,
      message: "User saved successfully",
      outputstatus
    });
  }else{
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      outputstatus
    });
  }
  } catch (err) {
    console.error("❌ /user_insert_update error:", err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || "Unexpected error occurred"
    });
  }
};
exports.policy_prepare_pending = async (req, res) => {
  try {
    const { userid, id, policystatus } = req.body;

    // 🧩 Input validation
    if (!userid || !id || !policystatus) {
      return res.status(400).json({
        success: false,
        message: 'Missing user ID, id, or policystatus',
      });
    }

    // 🧠 Execute stored procedure (UPDATE)
    const [results] = await sequelize.query(
      `EXEC policy_prepare_pending @userid = :userid, @id = :id, @policystatus = :policystatus`,
      { replacements: { userid, id, policystatus } }
    );

    // ✅ Check for any message returned from the SP (optional)
    const message =
      results?.[0]?.message || 'Policy status updated successfully';

    // ✅ Send proper success response
    res.status(200).json({
      success: true,
      message,
    });
  } catch (err) {
    console.error('❌ /policy_prepare_pending error:', err);
    errorlog(err, req);

    res.status(500).json({
      success: false,
      message: 'Failed to update policy status',
      error: err.message,
    });
  }
};
exports.policy_prepare_list = async (req, res) => {
  try {
    const { userid } = req.body;

    if (!userid) {
      return res.status(400).json({
        success: false,
        message: 'Missing user ID',
      });
    }

    const [results] = await sequelize.query(
      `EXEC policy_prepare_list @userid = :userid`,
      { replacements: { userid }, raw: true }
    );

   const freshList = results.filter(r => r.list_type === 'fresh');
    const waitingList = results.filter(r => r.list_type === 'waiting');

    res.status(200).json({
      success: true,
      message: 'Policy lists fetched successfully',
      fresh_count: freshList.length,
      waiting_count: waitingList.length,
      fresh: freshList,
      waiting: waitingList,
    });
  } catch (err) {
    console.error('❌ /policy_prepare_list error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch policy list',
      error: err.message,
    });
  }
};
exports.payment_success_redirect = async (req, res) => {
  try {
    const { txnid, excelid,merchantOrderId } = req.body;
    let  responseObj_status="";
    if (!txnid || !excelid || !merchantOrderId) {
      return res.status(400).json({
        success: false,
        message: "Missing txnid, excelid, or merchantOrderId",
      });
    }

    // ⭐ Step 1: Get Access Token
    const tokenResponse = await axios.post(
      tokenUrl,
      new URLSearchParams(AUTH_PAYLOAD),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        message: "Failed to get access token from PhonePe",
      });
    }

    // ⭐ Step 2: Fetch transaction details
    const [transactions] = await sequelize.query(`
      SELECT 
        tg.merchantorderid, 
        tg.transactionid, 
        tg.excelid, 
        tu.customername,
        tg.amount, 
        tu.vehicleno, 
        tu.mobile 
      FROM T_Payment_getway tg
      INNER JOIN T_Uplodpolicy_excel tu ON tg.excelid = tu.id
      WHERE tg.transactionid='${txnid}'
        AND tg.excelid='${excelid}'
        and tg.merchantorderid='${merchantOrderId}'
      ORDER BY tg.id DESC
    `);

    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        message: "No pending transactions found",
      });
    }

    const insertedIds = [];
    const whatsappResults = [];

    // ⭐ Step 3: Loop & process each transaction
    for (const row of transactions) {
      const {
        merchantorderid,
        transactionid,
        excelid,
        customername,
        amount,
        vehicleno,
        mobile
      } = row;

      const statusUrl = `${phonepe_success_Url}/${merchantorderid}/status`;

      try {
        // ⭐ Get payment status from PhonePe
        const response = await axios.get(statusUrl, {
          headers: {
            Authorization: `O-Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        const responseObj = response.data;  // 👉 JSON Object (use for binding values)
        const responseBody = JSON.stringify(response.data).replace(/'/g, "''");
        responseObj_status = responseObj.state;
        // ⭐ Insert gateway response
        const query = `
          DECLARE @InsertedId INT;

          EXEC getway_response 
              @transactionId='${transactionid}', 
              @merchantOrderId='${merchantorderid}', 
              @json='${responseBody}', 
              @excelid=${excelid}, 
              @InsertedId=@InsertedId OUTPUT;

          SELECT @InsertedId AS InsertedId;
        `;

        const [spResult] = await sequelize.query(query);
        const insertedId = spResult?.[0]?.InsertedId || 0;

        insertedIds.push({
          merchantOrderId: merchantorderid,
          insertedId,
        });

        // ⭐ If DB insert success → send success WhatsApp
        if (responseObj_status =="COMPLETED"){
          try {
            const safeAmount = amount ? amount.toString() : "0";
            const safeCustomer = customername || "";
            const safeVehicle = vehicleno || "";

            const waSuccess = await axios.post(
              kyc_url,
              {
                from: "+919344118986",
                campaignName: "api-test",
                to: mobile.startsWith("+91") ? mobile : `+91${mobile}`,
                templateName: "paymentconfirmation",
                components: {
                  body: { params: [safeCustomer, safeAmount, safeVehicle] },
                  header: { type: "text", text: "Payment Confirmation" },
                },
                type: "template",
              },
              {
                headers: {
                  apikey: "fXsUv7l3Uhxo4YR9ADsx6CTp1TjcX6",
                  "Content-Type": "application/json",
                },
              }
            );

            whatsappResults.push({
              transactionId: transactionid,
              status: "success",
              message: waSuccess.data?.message || "WhatsApp sent successfully",
              response: waSuccess.data,
            });
          } catch (waErr) {
            console.error(`❌ WhatsApp send failed for ${transactionid}:`, waErr.message);
            whatsappResults.push({
              transactionId: transactionid,
              status: "success_whatsapp_failed",
              error: waErr.message,
            });
          }


            const safeCustomer = customername || "";
            const safeVehicle = vehicleno || "";
          const payload = {
    from: "+919344118986",
    campaignName: "api-test",
    to: mobile.startsWith("+91") ? mobile : `+91${mobile}`,
    templateName: "kyc_update",
    components: {
      body: {
        params: [
          safeCustomer,
          safeVehicle,
          `https://pa1innovsource.com/kyc.html?tnxid=${transactionid}&excelid=${excelid}`
        ]
      },
      header: {
        type: "text",
        text: "text value"
      }
    },
    type: "template"
  };

  try {
    const response = await axios.post(kyc_url, payload, {
      headers: {
        apikey: "fXsUv7l3Uhxo4YR9ADsx6CTp1TjcX6",
        "Content-Type": "application/json"
      }
    });

    console.log("API Response:", response.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
        // ⭐ If DB insert failed → send failure WhatsApp
        else {
          try {
            const safeCustomer = customername || "";
            const paymentLink = `https://pa1innovsource.com/payment?txnid=${transactionid}`;

            const waFail = await axios.post(
              kyc_url,
              {
                from: "+919344118986",
                campaignName: "api-test",
                to: mobile.startsWith("+91") ? mobile : `+91${mobile}`,
                templateName: "payment_faied",
                components: {
                  body: { params: [safeCustomer, paymentLink] },
                  header: { type: "text", text: "text value" },
                },
                type: "template",
              },
              {
                headers: {
                  apikey: "fXsUv7l3Uhxo4YR9ADsx6CTp1TjcX6",
                  "Content-Type": "application/json",
                },
              }
            );

            whatsappResults.push({
              transactionId: transactionid,
              status: "failed_insertid_whatsapp_sent",
              message: "Payment failed WhatsApp sent",
              response: waFail.data,
            });
          } catch (waErr) {
            console.error(`❌ WhatsApp failure message failed for ${transactionid}:`, waErr.message);

            whatsappResults.push({
              transactionId: transactionid,
              status: "failed_insertid_whatsapp_failed",
              error: waErr.message,
            });
          }
        }
      } catch (err) {
        console.error(`❌ Error checking ${merchantorderid}:`, err.message);
        errorlog(err, req);
      }
    }

    // ⭐ Final API Response
    if (responseObj_status =="COMPLETED"){
    res.json({
      success: true,
      message: "Payment check completed",
      insertedRecords: insertedIds,
      whatsappResults,
    });
  }
  else{
     res.json({
      success: false,
      message: "Payment not completed",      
    });
  }
  } catch (err) {
    console.error("❌ payment_success_redirect error:", err);
    errorlog(err, req);

    res.status(500).json({
      success: false,
      error: err.message || "Unexpected error",
    });
  }
};
exports.operation_policy_save = async (req, res) => {
  try {
    // ✅ Combine destructuring into one line
    const { policyid, amount, transactionid, merchentorderid,
      od,tp,netpremium,grosspremium,
      company,policyno,ncb,policystartdate,policyenddate,remarks, createby,mobile } = req.body;    
      
      const pdfFile = req.file; 

    const policystartdate1=convertDate(policystartdate);
    const policyendate1=convertDate(policyenddate);    
    const amount1 = amount === "" || amount == null ? 0 : amount;
    const query = `
  DECLARE @insertedid INT;

  EXEC operation_policy_save
      @policyid = ${policyid},
      @amount = ${amount1},
      @transactionid = '${transactionid}',
      @merchentorderid = '${merchentorderid}',
      @od = ${od},
      @tp = ${tp},
      @netpremium = ${netpremium},
      @grosspremium = ${grosspremium},
      @company = '${company}',
      @policyno = '${policyno}',
      @ncb = '${ncb}',
      @startdate = '${policystartdate1}',
      @enddate = '${policyendate1}',
      @remarks = '${remarks}',
      @createby = ${createby},
      @insertedid = @insertedid OUTPUT;

  SELECT @insertedid AS insertedid;
`;

   var json = JSON.stringify({ query });


    const [result] = await sequelize.query(query);
    const insertedId = result?.[0]?.insertedid || null;

     // 1️⃣ Save Base64 PDF
     // 2️⃣ Save actual PDF on server
    if (pdfFile) {
      const folderPath = path.join(__dirname, "../Gallery/Policy_pdf/", String(insertedId));

      // Create folder if not exists
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filename = `${insertedId}.pdf`;
      const filepath = path.join(folderPath, filename);

      // Save the binary PDF file
      fs.writeFileSync(filepath, pdfFile.buffer);

      // console.log("PDF Saved:", filepath);
    }
    if (insertedId) {


  const finalRedirectUrl = `https://pa1innovsource.com/pdfdownload.html?policyid=${insertedId}`;
  const whatsappPayload = {
    from: "+919344118986",
    campaignName: "api-test",
   to: mobile.startsWith("+91") ? mobile : `+91${mobile}`,
    templateName: "policy_pdf",
    components: {
      body: {
        params: ["Customer", finalRedirectUrl]
      },
      header: {
        type: "text",
        text: "Policy PDF"
      }
    },
    type: "template"
  };

  try {
    await axios.post(
      kyc_url,
      whatsappPayload,
      {
        headers: {
          apikey: "fXsUv7l3Uhxo4YR9ADsx6CTp1TjcX6",
          "Content-Type": "application/json"
        }
      }
    );

    // console.log("📩 WhatsApp Redirect Link sent");
  } catch (err) {
    console.error("❌ WhatsApp sending failed:", err.message);
  }

      return res.json({
        success: true,
        message: 'Policy saved successfully',
        insertedId,
      });
    } else {
      return res.json({
        success: false,
        message: 'Policy save failed or returned no ID',
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
exports.login_website = async (req, res) => {
  try {
    const { username, password } = req.body;

    // ✅ Input validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // ✅ Execute stored procedure
    const [result] = await sequelize.query(
      `
      DECLARE @userid INT, @roleid INT, @branchid INT, @name VARCHAR(60);
      EXEC login_website 
        @username = :username,
        @password = :password,
        @userid = @userid OUTPUT,
        @roleid = @roleid OUTPUT,
        @branchid = @branchid OUTPUT,
        @name = @name OUTPUT;
      `,
      {
        replacements: { username, password },
      }
    );

    // ✅ Handle SQL output
    const row = result?.[0];

    if (!row) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    if (row.message == 'Login successful') {
      return res.status(200).json({
        success: true,
        message: row.message,
        userid: row.userid,
        roleid: row.roleid,
        branchid: row.branchid,
        name: row.name,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: row.message || 'Invalid login credentials',
      });
    }
  } catch (err) {
    console.error('Error in login_website:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while logging in',
      error: err.message,
    });
  }
};
exports.policy_status = async (req, res) => {
  try {   
    
    const [results] = await sequelize.query(
      `select id,policy_status from M_Policy_Status where statuss=1 `     
    );

    res.status(200).json({
      success: true,
      message: 'Policy Status fetched successfully',
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error('❌ /policy_status controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.policy_report = async (req, res) => {
  try {
    const { fromdate, todate,status } = req.body;
    
    // Validation
    if (!fromdate || !todate || !status) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing date parameters or status',
      });
    }   
    const fromdate1 = convertDate(fromdate);
    const todate1 = convertDate(todate);

    // Query
    const [results] = await sequelize.query(
      ` exec [policy_report] @fromdate = :fromdate, @todate = :todate, @status = :status`,      
      {
        replacements: { fromdate: fromdate1, todate: todate1,status:status  },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error('❌ /renewalList controller error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.get_pdf_path = async (req, res) => {
  try {
    const policyid = req.query.policyid;
    if (!policyid) {
      return res.json({ success: false, message: "Policy ID required" });
    }

    const fileName = `${policyid}.pdf`;
    const pdfRoot = process.env.PDF_ROOT;
    const localPath = path.join(pdfRoot, policyid.toString(), fileName);

    if (!fs.existsSync(localPath)) {
      return res.json({ success: false, message: "PDF file not found" });
    }

    const fileBuffer = fs.readFileSync(localPath);
    const base64Pdf = fileBuffer.toString("base64");

    return res.json({
      success: true,
      base64Pdf,
      fileName
    });

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};


