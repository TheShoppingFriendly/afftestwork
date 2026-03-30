require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { WebSocketServer } = require('ws');

const authRoutes    = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes    = require('./routes/tasks');
const miscRoutes    = require('./routes/misc');
const uploadRoutes  = require('./routes/upload');
const searchRoutes  = require('./routes/search');
const exportRoutes  = require('./routes/export');
const { errorHandler, notFound } = require('./middleware/error');

const app = express();
const server = http.createServer(app);

// ── Security ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  /\.github\.io$/,  // allow all github pages
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser requests
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    cb(allowed ? null : new Error('Not allowed by CORS'), allowed);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true,
});

app.use(limiter);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks',    taskRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/export',   exportRoutes);
app.use('/api',          miscRoutes);

// ── 404 + Error Handler ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── WebSocket (real-time notifications) ──────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Map(); // userId → Set<ws>

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.split('?')[1]);
  const userId = params.get('userId');
  if (!userId) return ws.close();

  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(ws);
  console.log(`WS: user ${userId} connected (${clients.get(userId).size} connections)`);

  ws.on('close', () => {
    clients.get(userId)?.delete(ws);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  });

  ws.on('error', () => {});
  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time connected' }));
});

// Broadcast to specific user
global.notifyUser = (userId, payload) => {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const msg = JSON.stringify(payload);
  userClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  });
};

// Broadcast to all connected
global.broadcast = (payload) => {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  });
};

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Flo API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   WS:     ws://localhost:${PORT}/ws`);
});

module.exports = { app, server };
