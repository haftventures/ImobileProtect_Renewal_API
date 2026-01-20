const { sequelize } = require('../config/connectdatabase');
const { convertDate, errorlog } = require('../Models/global_models');
const axios = require('axios');

exports.bulk_data_move_count = async (req, res) => {
  try {
   const { fromdate,todate,city,model,rto,userid } = req.body;
    const date1=convertDate(fromdate);
     const date2=convertDate(todate);
    const result = await sequelize.query(
      "EXEC bulk_data_move_count @fromdate = :fromdate,@todate = :todate,@citylist=:citylist,@modellist = :modellist,@rtolist = :rtolist,@userid = :userid",
      {
        replacements: { fromdate:date1,todate:date2,citylist:city,modellist:model,rtolist:rto,userid },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    const Total_Count=result[0].countt;
    if(Total_Count>0)
    {
    return res.status(200).json({
      success: true,
      message: "Data count fetched successfully.",
      Total_Count
    });  
  }
  else{
      return res.status(200).json({
      success: true,
      message: "No records found.",
      Total_Count
    });  
  }
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.bulk_data_update_table = async (req, res) => {
  try {
    const { date,city,model,rto,userid } = req.body;
    const date1=convertDate(date);
    const result = await sequelize.query(
      "EXEC bulk_data_update_table @date = :date,@city = :city,@model = :model,@rto = :rto,@userid = :userid",
      {
        replacements: { date:date1,city,model,rto,userid },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    return res.status(200).json({
      success: true,
      message: "Data update successfully",
      data:result
    });  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.DB_get_citylist = async (req, res) => {
  try {
    const { fromdate,todate,userid,search_city } = req.body;
    const date1=convertDate(fromdate);
    const date2=convertDate(todate);
    const result = await sequelize.query(
      "EXEC get_citylist @fromdate = :fromdate,@todate = :todate,@userid = :userid,@searchtext = :searchtext",
      {
        replacements: { fromdate:date1,todate:date2,userid,searchtext:search_city },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    return res.status(200).json({
      success: true,
      message: "city data get successfully",
      data:result
    });  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.DB_get_modellist = async (req, res) => {
  try {
    const { fromdate,todate,userid,search_model } = req.body;
    const date1=convertDate(fromdate);
    const date2=convertDate(todate);
    const result = await sequelize.query(
      "EXEC get_modellist @fromdate = :fromdate,@todate = :todate,@userid = :userid,@searchtext = :searchtext",
      {
        replacements: { fromdate:date1,todate:date2,userid,searchtext:search_model },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    return res.status(200).json({
      success: true,
      message: "Model data get successfully",
      data:result
    });  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.DB_get_rtolist = async (req, res) => {
  try {
    const { fromdate,todate,userid,search_rto } = req.body;
    const date1=convertDate(fromdate);
    const date2=convertDate(todate);
    const result = await sequelize.query(
      "EXEC get_rtolist @fromdate = :fromdate,@todate = :todate,@userid = :userid,@searchtext = :searchtext",
      {
        replacements: { fromdate:date1,todate:date2,userid,searchtext:search_rto },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    return res.status(200).json({
      success: true,
      message: "RTO data get successfully",
      data:result
    });  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.bulk_data_move_table = async (req, res) => {
  try {
   const { fromdate,todate,city,model,rto,userid,totalcount } = req.body;
    const date1=convertDate(fromdate);
     const date2=convertDate(todate);
    const result = await sequelize.query(
      "EXEC bulk_data_move_table @fromdate = :fromdate,@todate = :todate,@citylist=:citylist,@modellist = :modellist,@rtolist = :rtolist,@userid = :userid,@countt=:countt",
      {
        replacements: { fromdate:date1,todate:date2,citylist:city,modellist:model,rtolist:rto,userid,countt:totalcount },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    const Total_Count=Object.values(result[0])[0];
    if(Total_Count>0)
    {
    return res.status(200).json({
      success: true,
      message: "Data Moved successfully.",
      Total_Count
    });  
  }
  else{
      return res.status(200).json({
      success: true,
      message: "No Data Moved successfully.",
      Total_Count:0
    });  
  }
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.DB_get_uploadexcel_modellist = async (req, res) => {
  try {
   const { fromdate,todate,model,userid } = req.body;
    const date1=convertDate(fromdate);
     const date2=convertDate(todate);
    const result = await sequelize.query(
      "EXEC get_uploadexcel_modellist @fromdate = :fromdate,@todate = :todate,@searchtext = :searchtext,@userid = :userid",
      {
        replacements: { fromdate:date1,todate:date2,searchtext:model,userid },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    
  
    return res.status(200).json({
      success: true,
      message: "Data Fetched successfully.",
      result
    });  
  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.DB_smssend_viewchk = async (req, res) => {
  try {
   const { fromdate,todate,model,userid } = req.body;
    const date1=convertDate(fromdate);
     const date2=convertDate(todate);
    const result = await sequelize.query(
      "EXEC smssend_viewchk @fromdate = :fromdate,@todate = :todate,@modellist = :modellist,@userid = :userid",
      {
        replacements: { fromdate:date1,todate:date2,modellist:model,userid },
        type: sequelize.QueryTypes.SELECT
      }
    );       
    
  
    return res.status(200).json({
      success: true,
      message: "Data Fetched successfully.",
      result
    });  
  
  } catch (err) {
    console.error(err);
    errorlog(err, req);
    res.status(500).json({ success: false, error: err.message });
  }
};