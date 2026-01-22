const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');
const axios = require('axios');

exports.payment_verify = async (req, res) => {
  try {
    const { date, userid } = req.body;
    const date1 = convertDate(date);

    const result = await sequelize.query(
      "EXEC payment_verify @date = :date, @userid = :userid",
      {
        replacements: { date: date1, userid }
        // ❌ Do NOT use QueryTypes.SELECT
      }
    );

    /*
      result structure:
      result[0] → first SELECT (summary)
      result[1] → second SELECT (details)
    */
    
    const summary = result[0]?.[0] || {};
    const details = result[1] || [];

  const rows = result[0];

const summary1 = rows.length > 0
  ? {
      policy_count: rows[0].Policy_count,
      gateway_amount: rows[0].gateway_amount,
      policy_amount: rows[0].policy_amount,
      policy_excess_amount: rows[0].policy_excess_amount,
      unissued_policy_amount: rows[0].unissued_policy_amount
    }
  : {};

const details1 = rows.slice(1); // removes first row

    if (details1.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Payment details retrieved successfully.",
        policy_count: summary1.policy_count || 0,
        gateway_amount: summary1.gateway_amount || 0,
        policy_amount: summary1.policy_amount || 0,
        policy_excess_amount: summary1.policy_excess_amount || 0,
        unissued_policy_amount: summary1.unissued_policy_amount || 0,
        data: details1
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "No records found.",
        policy_count: 0,
        gateway_amount: 0,
        policy_amount: 0,
        policy_excess_amount: 0,
        unissued_policy_amount: 0,
        data: []
      });
    }

  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
