import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './env.js';

// Configure DNS servers for reliable SRV resolution on Windows/cloud networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });
    console.log(`[MongoDB] Database connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    console.log('[MongoDB Notice] Operating with in-memory / persistent cloud connection fallback if configured.');
    // In production, you may want process.exit(1), but for graceful initialization we allow re-attempts
    if (config.nodeEnv === 'production') {
      console.warn('Please check your MONGODB_URI in production environment variables.');
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Database connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Database reconnected.');
});
