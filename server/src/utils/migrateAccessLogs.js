/**
 * Migration script to fix access logs timestamp field
 * 
 * Problem: Some access logs have 'accessedAt' field instead of 'timestamp'
 * Solution: Rename 'accessedAt' to 'timestamp' for all access logs
 */

const mongoose = require('mongoose');
const MedicalRecord = require('../models/MedicalRecord');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateAccessLogs() {
  try {
    console.log('🔄 Starting access logs migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find all records with access logs
    const records = await MedicalRecord.find({ 
      'accessLogs.0': { $exists: true } 
    });

    console.log(`📊 Found ${records.length} records with access logs`);

    let totalFixed = 0;
    let totalLogs = 0;

    for (const record of records) {
      let recordModified = false;
      
      for (const log of record.accessLogs) {
        totalLogs++;
        
        // Check if log has 'accessedAt' instead of 'timestamp'
        if (log.accessedAt && !log.timestamp) {
          log.timestamp = log.accessedAt;
          delete log.accessedAt;
          recordModified = true;
          totalFixed++;
        }
      }

      if (recordModified) {
        await record.save();
        console.log(`✅ Fixed ${record.accessLogs.length} logs in record: ${record.recordId}`);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Total records processed: ${records.length}`);
    console.log(`   Total access logs: ${totalLogs}`);
    console.log(`   Access logs fixed: ${totalFixed}`);
    console.log('✅ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAccessLogs();
}

module.exports = migrateAccessLogs;
