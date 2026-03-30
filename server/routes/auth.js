const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { sql } = require('../db');
const { generateTokens, authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/error');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  validate,
], async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [user] = await sql`
      SELECT id, name, email, password, role, team, avatar, color, is_active
      FROM users WHERE email = ${email}
    `;

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store hashed refresh token
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await sql`UPDATE users SET refresh_token = ${hashedRefresh}, last_login = NOW() WHERE id = ${user.id}`;

    const { password: _, refresh_token: __, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const [user] = await sql`
      SELECT id, refresh_token, is_active FROM users WHERE id = ${decoded.userId}
    `;

    if (!user || !user.is_active || !user.refresh_token) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const valid = await bcrypt.compare(refreshToken, user.refresh_token);
    if (!valid) return res.status(401).json({ error: 'Invalid refresh token' });

    const tokens = generateTokens(user.id);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await sql`UPDATE users SET refresh_token = ${hashedRefresh} WHERE id = ${user.id}`;

    res.json(tokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await sql`UPDATE users SET refresh_token = NULL WHERE id = ${req.user.id}`;
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [user] = await sql`
      SELECT id, name, email, role, team, avatar, color, last_login, created_at
      FROM users WHERE id = ${req.user.id}
    `;
    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, [
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  validate,
], async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [user] = await sql`SELECT password FROM users WHERE id = ${req.user.id}`;

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await sql`UPDATE users SET password = ${hashed}, refresh_token = NULL WHERE id = ${req.user.id}`;

    res.json({ message: 'Password changed. Please login again.' });
  } catch (err) { next(err); }
});

module.exports = router;
