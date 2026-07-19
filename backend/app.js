import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import appConfig from './config/app.js';
import sequelize from './config/database.js';
import publicRoutes from './routes/public.js';
import authenticatedRoutes from './routes/authenticated.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || appConfig.corsOrigins.includes(origin) || appConfig.corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/storage', express.static(path.join(__dirname, 'public', 'storage')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api', publicRoutes);
app.use('/api', authenticatedRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: appConfig.name, timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large' });
  }
  if (err.message?.includes('File type not allowed') || err.message?.includes('Only image files')) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error' });
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }

  app.listen(appConfig.port, () => {
    console.log(`${appConfig.name} API running on port ${appConfig.port}`);
  });
};

if (process.env.VERCEL !== '1') {
  start();
}

export default app;
