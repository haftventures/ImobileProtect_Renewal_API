const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');

exports.make_verify_details = async (req, res) => {
  try {

    // Get inputs
    const { userid,status } = req.body;
    
    // Stored Procedure call
    const query = `
      EXEC make_verify_details 
        @userid = :userid,
        @status = :status     
    `;

    const results = await sequelize.query(query, {
      replacements: { userid,status },
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      success: true,
      message: "data loaded successfully",
      count:results.length,
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
exports.make_verified_details = async (req, res) => {
  try {

    // Get inputs
    const { userid,status } = req.body;
    
    // Stored Procedure call
    const query = `
      EXEC make_verified_details 
        @userid = :userid,
        @status = :status     
    `;

    const results = await sequelize.query(query, {
      replacements: { userid,status },
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      success: true,
      message: "data loaded successfully",
      count:results.length,
      data: results      
    });

  } catch (err) {
    console.error("❌ make_verified_details error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};
exports.make_permission_list = async (req, res) => {
  try {
    // Get inputs
    const { userid } = req.query;    
    // Stored Procedure call
    const query = `
      EXEC make_permission_list 
        @userid = :userid       
    `;

    const results = await sequelize.query(query, {
      replacements: { userid },
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      success: true,
      message: "make permission list loaded successfully",      
      data: results      
    });

  } catch (err) {
    console.error("❌ make_permission_list error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};
exports.make_verified = async (req, res) => {
  try {
    const { ids,userid,status,stage_position,insert_method } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No IDs selected"
      });
    }

    // console.log("Received IDs:", ids);

    const idList = ids.join(',');

    const result = await sequelize.query(
      "EXEC make_verified @ids = :ids,@status = :status, @userid = :userid, @stage_position = :stage_position, @insert_method = :insert_method",
      {
        replacements: { ids: idList,status, userid, stage_position, insert_method },
        type: sequelize.QueryTypes.SELECT
      }
    );   

      const response = result[0];
    if(response.status=="Success"){
    return res.status(200).json({
      success: true,
      message: response.status,
      inserted_count: response.inserted_count
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
exports.Excel_Makeedit_details = async (req, res) => {
  try {
    // Get inputs
    const { userid } = req.query;    
    // Stored Procedure call
    const query = `
      EXEC Excel_Makeedit_details 
        @userid = :userid       
    `;

    const results = await sequelize.query(query, {
      replacements: { userid },
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      success: true,
      message: "Excel Makeedit details loaded successfully", 
      count:results.length,     
      data: results      
    });

  } catch (err) {
    console.error("❌ Excel_Makeedit_details error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};
exports.make_search = async (req, res) => {
  try {
    const { make, companyid } = req.body;

    const result = await sequelize.query(
      "EXEC usp_getoutput_vehiclemake_details @inpstr = :inpstr, @companyid = :companyid",
      {
        replacements: { inpstr: make, companyid },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // console.log("Raw Result:", result);

    const response = result[0]; // ✅ correct extraction

    
      return res.status(200).json({
        success: true,
        message: "Make search completed successfully",
        result
      });
    o
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.make_delete = async (req, res) => {
  try {
    const { userid,excelid } = req.body;

    

    const result = await sequelize.query(
      "EXEC Excel_Make_delete @userid = :userid,@excelid = :excelid",
      {
        replacements: { userid,excelid },
        type: sequelize.QueryTypes.SELECT
      }
    );   

    
    return res.status(200).json({
      success: true,
      message: "Make deleted successfully",
      
    });
 
  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.make_save = async (req, res) => {
  try {
    const { userid,excelid,vehiclemakeid,oneyear,twoyear,threeyear,idv } = req.body;

    

    const result = await sequelize.query(
      "EXEC Excel_Make_edit_save @userid = :userid,@excelid = :excelid,@vehiclemakeid = :vehiclemakeid,@oneyear = :oneyear,@twoyear = :twoyear,@threeyear = :threeyear,@idv = :idv",
      {
        replacements: { userid,excelid,vehiclemakeid,oneyear,twoyear,threeyear,idv },
        type: sequelize.QueryTypes.SELECT
      }
    );   

    
    return res.status(200).json({
      success: true,
      message: "Make saved successfully",
      data:result
    });
 
  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};