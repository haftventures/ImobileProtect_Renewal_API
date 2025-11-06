const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');
const axios = require('axios');

const OAUTH_TOKEN_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
const CHECKOUT_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay';

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
        @idd = @output_id OUTPUT;
    SELECT @output_id AS inserted_id;
`;

const [result] = await sequelize.query(query, {
    replacements: {
        transactionid: orderDetails.transactionid,        
        request: JSON.stringify(requestBody),
        merchantorderid: merchantOrderId,
        excelid: orderDetails.id
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
    res.status(500).json({
      success: false,
      error: err.message || 'Unexpected error',
    });
  }
};