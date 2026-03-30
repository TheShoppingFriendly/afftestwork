const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql } = require('../db');
const { authenticate } = require('../middleware/auth');

// Store uploads in /uploads dir (use cloud storage in production)
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/gif','image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain','text/csv',
      'application/zip',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});

router.use(authenticate);

// POST /api/upload/task/:taskId
router.post('/task/:taskId', upload.array('files', 5), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    // In production, upload to S3/Cloudinary here instead of local disk
    // For now track in DB and serve locally
    const attachments = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
      url: `/api/upload/file/${f.filename}`,
    }));

    // Increment attachment count on task
    await sql`UPDATE tasks SET attachments = attachments + ${attachments.length} WHERE id = ${req.params.taskId}`;

    res.json({ uploaded: attachments });
  } catch (err) { next(err); }
});

// GET /api/upload/file/:filename  (serve uploaded file)
router.get('/file/:filename', (req, res) => {
  const safe = path.basename(req.params.filename); // prevent path traversal
  const filepath = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filepath);
});

module.exports = router;
