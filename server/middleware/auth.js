const jwt = require('jsonwebtoken');
const { sql } = require('../db');

// ── Verify Access Token ───────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user] = await sql`
      SELECT id, name, email, role, team, avatar, color, is_active
      FROM users WHERE id = ${decoded.userId} AND is_active = true
    `;

    if (!user) return res.status(401).json({ error: 'User not found or deactivated' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Role Authorization ────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// ── Project Access (member or above role) ─────────────────────
const projectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const { role, id: userId } = req.user;

    if (['admin', 'manager'].includes(role)) return next();

    const [member] = await sql`
      SELECT 1 FROM project_members
      WHERE project_id = ${projectId} AND user_id = ${userId}
    `;

    if (!member) return res.status(403).json({ error: 'Access denied to this project' });
    next();
  } catch (err) {
    next(err);
  }
};

// ── Generate Tokens ───────────────────────────────────────────
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

module.exports = { authenticate, authorize, projectAccess, generateTokens };
