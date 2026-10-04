import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';
import { seedDatabase } from '../seed.js';

const router = express.Router();

// Helper to issue JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, defaultBroker = 'Zerodha' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `);

    const result = await insertUser.run(name.trim(), email.toLowerCase().trim(), passwordHash);
    const userId = result.lastInsertRowid;

    // Create default primary demat portfolio
    const insertPortfolio = db.prepare(`
      INSERT INTO portfolios (user_id, profile_name, broker_name)
      VALUES (?, ?, ?)
    `);
    await insertPortfolio.run(userId, 'Primary Demat Portfolio', defaultBroker);

    const user = { id: userId, name: name.trim(), email: email.toLowerCase().trim() };
    const portfolios = await db.prepare('SELECT id, profile_name, broker_name FROM portfolios WHERE user_id = ?').all(userId);
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user,
      portfolios
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    // Auto-seed if demo user was cleared or missing
    if (!user && normalizedEmail === 'demo@investor.in') {
      await seedDatabase();
      user = await db.prepare('SELECT * FROM users WHERE email = ?').get('demo@investor.in');
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const portfolios = await db.prepare('SELECT id, profile_name, broker_name FROM portfolios WHERE user_id = ?').all(user.id);
    const token = generateToken(user);

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      portfolios
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/sandbox-reset (Restore demo sample portfolio)
router.post('/sandbox-reset', async (req, res) => {
  try {
    await seedDatabase();

    const demoUser = await db.prepare('SELECT id, name, email FROM users WHERE email = ?').get('demo@investor.in');
    if (!demoUser) {
      return res.status(500).json({ error: 'Failed to restore sandbox account' });
    }

    const portfolios = await db.prepare('SELECT id, profile_name, broker_name FROM portfolios WHERE user_id = ?').all(demoUser.id);
    const token = generateToken(demoUser);

    return res.json({
      message: 'Sandbox restored to sample portfolio state',
      token,
      user: demoUser,
      portfolios
    });
  } catch (err) {
    console.error('Sandbox reset error:', err);
    return res.status(500).json({ error: 'Internal server error during sandbox reset' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const portfolios = await db.prepare('SELECT id, profile_name, broker_name, created_at FROM portfolios WHERE user_id = ?').all(user.id);

    return res.json({
      user,
      portfolios
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/portfolios (Add family sub-profile)
router.post('/portfolios', authenticateToken, async (req, res) => {
  try {
    const { profile_name, broker_name = 'Zerodha' } = req.body;

    if (!profile_name || !profile_name.trim()) {
      return res.status(400).json({ error: 'Profile name is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO portfolios (user_id, profile_name, broker_name)
      VALUES (?, ?, ?)
    `);

    const result = await stmt.run(req.user.id, profile_name.trim(), broker_name.trim());
    const newPortfolio = await db.prepare('SELECT id, profile_name, broker_name FROM portfolios WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Family profile created successfully',
      portfolio: newPortfolio
    });
  } catch (err) {
    console.error('Add portfolio error:', err);
    return res.status(500).json({ error: 'Failed to add portfolio' });
  }
});

export default router;
