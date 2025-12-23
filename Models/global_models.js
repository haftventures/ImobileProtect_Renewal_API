const fs = require('fs');
const path = require('path');

 function convertDate(dateStr) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;   // Correctx`
    }

function errorlog(error, req = null) {
  const logDir = path.join(__dirname, '..', 'Logs');
  const logFile = path.join(logDir, 'Error.log');
  const now = new Date().toLocaleString();
  const lineBreak = '\r\n\r\n';

  const errorLineNo = error.stack ? error.stack.split('\n')[1]?.trim() : 'N/A';
  const errorMsg = error.message || 'N/A';
  const errorType = error.name || typeof error;
  const errorStack = error.stack || 'No stack trace';

  const exurl = req?.originalUrl || 'URL not available';
  const hostIp = req?.ip || 'IP not available';

  const errorContent = 
    `-----------Exception Details on ${now}-----------------${lineBreak}` +
    `Error Line No : ${errorLineNo}${lineBreak}` +
    `Error Message : ${errorMsg}${lineBreak}` +
    `Exception Type: ${errorType}${lineBreak}` +
    `Error Stack   : ${errorStack}${lineBreak}` +
    `Error Page Url: ${exurl}${lineBreak}` +
    `User Host IP  : ${hostIp}${lineBreak}` +
    `--------------------------------*End*------------------------------------------${lineBreak}`;

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFile, errorContent, 'utf8');
    console.log('📝 Error logged to file:', logFile);
  } catch (err) {
    console.error('❌ Failed to write error log:', err.message);
  }
}

module.exports = {
  convertDate, 
  errorlog
};