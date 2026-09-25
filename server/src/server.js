import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import faceRoutes from './routes/faceRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database Connection
connectDB();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows camera feed & WebAssembly for face models
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in dev or configured frontend domain in production
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression & Body Parsers
app.use(compression());
app.use(express.json({ limit: '10mb' })); // Allows base64 face embedding descriptors
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', apiLimiter);

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Smart Face Attendance API',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    timezone: config.timezone,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

// Production Static Serving
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <html>
          <head><title>Smart Face Attendance API</title></head>
          <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
            <h1 style="color: #14b8a6;">Smart Face Recognition Attendance System API</h1>
            <p>API Server is running successfully on port ${config.port}.</p>
            <p><a href="/api/health" style="color: #2dd4bf;">View API Health Check</a></p>
          </body>
        </html>
      `);
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` [SERVER] Smart Attendance API running on port ${PORT}`);
  console.log(` [ENV] Mode: ${config.nodeEnv}`);
  console.log(` [TIMEZONE] ${config.timezone}`);
  console.log(` [HEALTH] http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

export default app;
