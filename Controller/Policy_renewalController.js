const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');
const axios = require('axios');

const OAUTH_TOKEN_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
const CHECKOUT_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay';
const tokenUrl = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';

const AUTH_PAYLOAD = {
    client_id: 'TEST-M22AIQQJG6USL_25090',
    client_version: 1,
    client_secret: 'ZmUyY2YwOWQtYmJjOC00ZjU2LTliMjAtN2VmNGNmZTc4ZGI2',
    grant_type: 'client_credentials',
};
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
            "udf2": orderDetails.mobile,
            "udf3": orderDetails.transactionid,
            "udf4": "dummy value 4",
            "udf5": "addition infor ref1"
        },
        "paymentFlow": {
            "type": "PG_CHECKOUT",
            "message": `Payment for Policy ID: ${orderDetails.id}`,
            "merchantUrls": {
                "redirectUrl": "http://49.207.186.126:8001/success.html" 
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
      return res.status(200).json({
        success: false,
        message: 'Payment already done for this transaction ID',
      });
    }

    // ✅ 2️⃣ If not paid, fetch renewal data
    const [results] = await sequelize.query(
      `
      SELECT TOP 1 
        id, customername, mobile, vehicleno, make, model, year, idv, cc, 
        grosspremium, prev_policyno, transactionid, [email],
        CONVERT(varchar(10), [policyenddate], 103) AS policyenddate,
        (
          SELECT
            [oneyear] AS [1],
            [twoyear] AS [2],
            [threeyear] AS [3]
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) AS PremiumDurations
      FROM [T_Uplodpolicy_excel]
      WHERE transactionid = :transactionid 
      `,
      { replacements: { transactionid: txnid } }
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
      `EXEC operation_policy_prepare @userid = :userid`,
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

    // 🔍 Handle SQL JSON alias quirk
    const jsonKey = Object.keys(results[0] || {}).find(k =>
      k.startsWith('JSON_F52E2B61')
    );

    let parsed = {};
    if (jsonKey) {
      parsed = JSON.parse(results[0][jsonKey]);
    }

    // ✅ Parse JSON safely
    const freshList = parsed.fresh || [];
    const waitingList = parsed.waiting || [];

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
    const { txnid, excelid } = req.body;

    if (!txnid || !excelid) {
      return res.status(400).json({
        success: false,
        message: 'Missing txnid or excelid',
      });
    }

    // 🧩 Step 1: Get Access Token
    const tokenResponse = await axios.post(
      tokenUrl,
      new URLSearchParams(AUTH_PAYLOAD),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse?.data?.access_token;
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get access token from PhonePe',
      });
    }

    // 🧩 Step 2: Fetch pending transactions
    const [transactions] = await sequelize.query(`
      SELECT tg.merchantorderid, tg.transactionid, tg.excelid, tu.customername, 
             tg.amount, tu.vehicleno, tu.mobile 
      FROM T_Payment_getway tg
      INNER JOIN T_Uplodpolicy_excel tu ON tg.excelid = tu.id
      WHERE  tg.transactionid='${txnid}'
        AND tg.excelid='${excelid}'
      ORDER BY tg.id DESC
    `);

    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        message: 'No pending transactions found',
      });
    }

    const insertedIds = [];
    const whatsappResults = [];

    // 🧩 Step 3: Loop through and check payment status
    for (const row of transactions) {
      const { merchantorderid, transactionid, excelid, customername, amount, vehicleno, mobile } = row;
      const statusUrl = `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${merchantorderid}/status`;

      try {
        // ✅ Get payment status
        const response = await axios.get(statusUrl, {
          headers: {
            Authorization: `O-Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        const responseBody = JSON.stringify(response.data).replace(/'/g, "''");

        // ✅ Insert gateway response into DB
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
        const insertedId = spResult?.[0]?.InsertedId || null;
        insertedIds.push({ merchantOrderId: merchantorderid, insertedId });

        // ✅ Only send WhatsApp if DB insert succeeded
        if (insertedId && insertedId !== 0) {
          try 
          {
            const safeAmount = amount ? amount.toString() : '0';
            const safeCustomer = customername || '';
            const safeVehicle = vehicleno || '';
            const whatsappResponse = await axios.post(
              'https://api.aoc-portal.com/v1/whatsapp',
              {
                from: '+919344118986',
                campaignName: 'api-test',
                to: mobile.startsWith('+91') ? mobile : `+91${mobile}`,
                templateName: 'paymentconfirmation',
                components: {
                  body: {
                    params: [safeCustomer, safeAmount, safeVehicle],
                  },
                  header: {
                    type: 'text',
                    text: 'Payment Confirmation',
                  },
                },
                type: 'template',
              },
              {
                headers: {
                  apikey: 'fXsUv7l3Uhxo4YR9ADsx6CTp1TjcX6',
                  'Content-Type': 'application/json',
                },
              }
            );

            whatsappResults.push({
              transactionId: transactionid,
              message: whatsappResponse.data?.message || 'WhatsApp Sent Successfully',
              whatsappResponse: whatsappResponse.data,
            });
          } catch (waErr) {
            console.error(`❌ WhatsApp send failed for ${transactionid}:`, waErr.message);
            whatsappResults.push({
              transactionId: transactionid,
              error: `WhatsApp send failed: ${waErr.message}`,
            });
          }
        } else {
          // 🚫 Record not inserted — skip WhatsApp
          whatsappResults.push({
            transactionId: transactionid,
            message: 'Record not inserted — WhatsApp not sent',
          });
        }
      } catch (err) {
        console.error(`❌ Error checking ${merchantorderid}:`, err.message);
        errorlog(err, req);
      }
    }

    // ✅ Return final summary
    res.json({
      success: true,
      message: 'Payment check completed',
      insertedRecords: insertedIds,
      whatsappResults,
    });
  } catch (err) {
    console.error('❌ payment_success_redirect error:', err);
    errorlog(err, req);
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};
exports.operation_policy_save = async (req, res) => {
  try {
    // ✅ Combine destructuring into one line
    const { policyid, payment_datee, customername, mobile, vehicleno, make, 
      model, idv, amount, transactionid, merchentorderid, regdate, chasisno,
       engineno, createby } = req.body;        

    const payment_datee1=convertDate(payment_datee);
    const regdate1=convertDate(regdate);
    // 🧩 Execute stored procedure with OUTPUT parameter
    const query = `
      DECLARE @InsertedId INT;
      EXEC operation_policy_save
        @policyid = ${policyid},
        @payment_datee = '${payment_datee1}',
        @customername = '${customername}',
        @mobile = '${mobile}',
        @vehicleno = '${vehicleno}',
        @make = '${make}',
        @model = '${model}',
        @idv = ${idv},
        @amount = ${amount},
        @transactionid = '${transactionid}',
        @merchentorderid = '${merchentorderid}',
        @regdate = '${regdate1}',
        @chasisno = '${chasisno}',
        @engineno = '${engineno}',
        @createby = ${createby},
        @insertedid = @InsertedId OUTPUT;
      SELECT @InsertedId AS insertedid;
    `;

    const [result] = await sequelize.query(query);
    const insertedId = result?.[0]?.insertedid || null;

    if (insertedId) {
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

