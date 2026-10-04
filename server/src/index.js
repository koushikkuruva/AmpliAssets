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

// Database readiness helper (with retry reset on failure)
let dbInitialized = false;
let dbInitPromise = null;

export async function ensureDbReady() {
  if (dbInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = initDatabase()
      .then(() => {
        dbInitialized = true;
      })
      .catch(err => {
        dbInitPromise = null; // reset so subsequent requests can retry
        dbInitialized = false;
        throw err;
      });
  }
  await dbInitPromise;
}

// 10-second timeout wrapper to prevent infinite hangs
const withTimeout = (promise, ms, message) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

app.use(async (req, res, next) => {
  try {
    await withTimeout(ensureDbReady(), 10000, 'Database initialization timed out after 10s');
    next();
  } catch (err) {
    console.error('Database initialization error:', err);
    return res.status(500).json({
      error: 'Database initialization failed',
      details: err.message
    });
  }
});

// Dedicated apiRouter mounted at BOTH '/api' and '/'
// Guarantees compatibility whether Vercel preserves or strips the /api prefix
const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Indian Equity & IPO Portfolio Analyzer API',
    timestamp: new Date().toISOString()
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/equities', equitiesRouter);
apiRouter.use('/ipos', iposRouter);
apiRouter.use('/mf', mfRouter);
apiRouter.use('/portfolio', portfolioRouter);
apiRouter.use('/overlap', overlapRouter);
apiRouter.use('/cash', cashRouter);

app.use('/api', apiRouter);
app.use('/', apiRouter);

// Production Static Serving & SPA Fallback (only for local full-stack production runs)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
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

// Only bind server port locally; on Vercel, the app is exported directly
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
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
