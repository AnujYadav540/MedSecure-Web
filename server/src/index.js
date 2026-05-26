require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const routes = require('./routes');
const fs = require('fs');
const { errorMonitor } = require('./utils/errorMonitor');

const app = express();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Make upload middleware available globally
app.locals.upload = upload;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    /^http:\/\/127\.0\.0\.1:\d+$/,  // Allow any port on 127.0.0.1
    /^http:\/\/localhost:\d+$/      // Allow any port on localhost
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create temp directory for file uploads if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Connect to MongoDB with graceful fallback and retry
const connectDB = async (retryCount = 0) => {
  const maxRetries = 3;
  const retryDelay = 3000; // 3 seconds
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medsecure', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('MongoDB connection failed:', err.message);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying connection in ${retryDelay/1000} seconds... (attempt ${retryCount + 1}/${maxRetries})`);
      setTimeout(() => connectDB(retryCount + 1), retryDelay);
    } else {
      console.log('Max retries reached. Server will run without database functionality');
    }
  }
};

connectDB();

// Health check endpoint (for deployment monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'MedSecure API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  // Clean up any temporary files
  if (req.file) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }
  }

  // Use error monitoring
  errorMonitor(err, req, res, next);
});

const PORT = process.env.PORT || 5000;

// Start cleanup job for unverified accounts
const { startCleanupJob } = require('./utils/cleanupUnverifiedAccounts');
startCleanupJob();

// Check if port is in use and handle gracefully
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port or close the application using this port.`);
    process.exit(1);
  } else {
    console.error('Error starting server:', err);
  }
});
