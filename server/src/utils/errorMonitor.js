// Simple error monitoring utility
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Error logging function
const logError = (error, context = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    context: context
  };

  // Log to console
  console.error('Error logged:', errorLog);

  // Log to file
  const logFile = path.join(logsDir, 'errors.log');
  const logEntry = JSON.stringify(errorLog) + '\n';
  
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (writeError) {
    console.error('Failed to write to error log:', writeError.message);
  }
};

// Request error monitoring middleware
const errorMonitor = (error, req, res, next) => {
  // Log error with context
  logError(error, {
    url: req.url,
    method: req.method,
    user: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // Determine appropriate response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  res.status(statusCode).json({
    message,
    error: process.env.NODE_ENV === 'development' ? error : {},
    timestamp: new Date().toISOString()
  });
};

// Health check function
const getSystemHealth = () => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform
  };
  
  return health;
};

module.exports = { 
  logError, 
  errorMonitor, 
  getSystemHealth 
};
