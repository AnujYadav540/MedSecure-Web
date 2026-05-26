const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medsecure', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const MedicalRecord = require('../models/MedicalRecord');

async function verifyPermissions() {
  try {
    console.log('🔍 Checking download permissions...\n');

    const records = await MedicalRecord.find({ 'accessGranted.doctor': { $exists: true } })
      .select('title recordId accessGranted')
      .lean();

    records.forEach(record => {
      console.log(`📄 Record: ${record.title}`);
      console.log(`   ID: ${record.recordId}`);
      record.accessGranted.forEach((access, index) => {
        console.log(`   Doctor ${index + 1}:`);
        console.log(`     - canView: ${access.permissions?.canView || false}`);
        console.log(`     - canDownload: ${access.permissions?.canDownload || false}`);
      });
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyPermissions();
