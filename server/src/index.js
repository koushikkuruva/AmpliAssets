import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import equitiesRouter from './routes/equities.js';
import iposRouter from './routes/ipos.js';
import mfRouter from './routes/mf.js';
import portfolioRouter from './routes/portfolio.js';
import overlapRouter from './routes/overlap.js';
import cashRouter from './routes/cash.js';
import { initDatabase } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database readiness helper (supports both long-running servers and serverless invocations)
let dbInitialized = false;
let initPromise = null;

export async function ensureDbReady() {
  if (!dbInitialized) {
    if (!initPromise) {
      initPromise = initDatabase().then(() => {
        dbInitialized = true;
      });
    }
    await initPromise;
  }
}

app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error('Database initialization error:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/equities', equitiesRouter);
app.use('/api/ipos', iposRouter);
app.use('/api/mf', mfRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/overlap', overlapRouter);
app.use('/api/cash', cashRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Indian Equity & IPO Portfolio Analyzer API',
    timestamp: new Date().toISOString()
  });
});

// Production Static Serving & SPA Fallback
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
  ensureDbReady()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT} (http://localhost:${PORT})`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    })
    .catch(err => {
      console.error('Startup database error:', err);
    });
}

export default app;
