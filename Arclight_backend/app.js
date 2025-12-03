import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import AppError from './utils/AppError.js';
import authRoutes from './routes/authRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import geminiRoutes from './routes/geminiRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import globalErrorHandler from './utils/globalErrorHandler.js';


const app = express();

// CORS configuration - Allow requests from frontend
app.use(cors({
  origin: [
    'http://localhost:9000',  // Expo web dev server
    'http://localhost:8081',  // Alternative Expo port
    'http://10.200.193.109:9000',  // Network IP (if needed)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Development logging
if ((process.env.NODE_ENV || "").trim() === "development") {
    app.use(morgan('dev'));
}

// Custom request logger for debugging
app.use((req, res, next) => {
    console.log('=== Incoming Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Path:', req.path);
    console.log('Body:', req.body);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('========================');
    next();
});

// Sample route
app.get('/', (req, res) => {
    res.json({
        message: 'hello from Adobe PS backend!!',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Auth routes
app.use('/api/v1/adobe-ps/auth', authRoutes);

// Image routes
app.use('/api/v1/adobe-ps/images', imageRoutes);

// AI routes
app.use('/api/v1/adobe-ps/ai', aiRoutes);

// Gemini AI routes
app.use('/api/v1/adobe-ps/gemini', geminiRoutes);

// Project routes
app.use('/api/v1/adobe-ps/projects', projectRoutes);

// Settings routes
app.use('/api/v1/adobe-ps/settings', settingsRoutes);



// 404 handler
app.all('/{*any}', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!!`, 404));
});

app.use(globalErrorHandler);

export { app };