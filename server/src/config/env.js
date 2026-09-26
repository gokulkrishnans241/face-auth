import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://gokul:gokul@cluster0.kbfn1fd.mongodb.net/smart_attendance_db?retryWrites=true&w=majority&appName=Cluster0',
  jwtSecret: process.env.JWT_SECRET || 'smart_attendance_jwt_super_secret_production_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  faceMatchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.26'), // Strict Euclidean distance threshold (<= 0.26)
};
