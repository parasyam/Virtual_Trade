const mongoose = require('mongoose');

async function connectDB(uri) {
  try {
    await mongoose.connect(uri);
    console.log('DB CONNECTED');
  } catch (error) {
    console.error('DB CONNECTION ERROR:', error);
    process.exit(1);  // Optional: Exit app on DB connection failure
  }
}

module.exports = { connectDB };
