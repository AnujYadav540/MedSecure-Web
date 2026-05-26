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
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medsecure';
    
    // Log connection attempt (hide password for security)
    const safeURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log('Attempting MongoDB connection to:', safeURI);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Start cleanup job ONLY after successful MongoDB connection
    const { startCleanupJob } = require('./utils/cleanupUnverifiedAccounts');
    startCleanupJob();
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    
    // Additional diagnostic info
    if (err.message.includes('ENOTFOUND') || err.message.includes('querySrv')) {
      console.error('💡 DNS lookup failed. Please verify:');
      console.error('   1. Your MongoDB Atlas cluster hostname is correct');
      console.error('   2. The MONGODB_URI environment variable is set correctly');
      console.error('   3. Your network allows DNS SRV lookups');
    }
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying connection in ${retryDelay/1000} seconds... (attempt ${retryCount + 1}/${maxRetries})`);
      setTimeout(() => connectDB(retryCount + 1), retryDelay);
    } else {
      console.error('⚠️  Max retries reached. Server will run without database functionality');
      console.error('⚠️  Please check your MONGODB_URI environment variable in Render');
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
