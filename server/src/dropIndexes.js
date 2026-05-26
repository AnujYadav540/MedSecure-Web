require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medsecure');
    console.log('Connected to MongoDB');

    const collections = await mongoose.connection.db.collections();
    
    for (let collection of collections) {
      await collection.dropIndexes();
      console.log(`Dropped indexes for collection: ${collection.collectionName}`);
    }

    console.log('All indexes dropped successfully');
  } catch (error) {
    console.error('Error dropping indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

dropIndexes(); 