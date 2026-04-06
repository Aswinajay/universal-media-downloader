// =====================================================
// FlashGet — Universal Media Downloader
// Backend API Server — Express + yt-dlp
// =====================================================

'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const path       = require('path');
const os         = require('os');
const fs         = require('fs');

const execFileAsync = promisify(execFile);
const app  = express();
const PORT = process.env.PORT || 10000;

// ─── yt-dlp binary path ───────────────────────────
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';

// ─── Middleware ────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));

// CORS — allow extension origins
app.use(cors({
  origin: (origin, cb) => {
    // Allow Chrome extensions, browser requests, and direct API calls
    if (!origin || origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
      return cb(null, true);
    }
    cb(null, true); // open for now — restrict if deploying publicly
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', limiter);

// ─── Helpers ──────────────────────────────────────
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch { return false; }
}

function buildQualityArg(quality) {
  if (quality === 'mp3' || quality === 'audio') {
    return '-f bestaudio/best';
  }
  if (quality === 'best' || !quality) {
    return '-f bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
  }
  const h = parseInt(quality, 10);
  if (!isNaN(h)) {
    return `-f bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${h}]+bestaudio/best[height<=${h}]`;
  }
  return '-f bestvideo+bestaudio/best';
}

function ytdlpExec(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP, args, { timeout: 60000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

// ─── Routes ───────────────────────────────────────

// Health check (for Render.com and extension ping)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'FlashGet API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Root
app.get('/', (_req, res) => {
  res.json({
    name: 'FlashGet Universal Media Downloader API',
    version: '2.0.0',
    endpoints: {
      health:   'GET  /health',
      info:     'GET  /api/info?url=<URL>',
      download: 'POST /api/download  { url, quality, format }',
    },
  });
});

// ─── GET /api/info ─────────────────────────────────
// Returns video metadata: title, thumbnail, formats
app.get('/api/info', async (req, res) => {
  const { url } = req.query;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL.' });
  }

  try {
    const rawJson = await ytdlpExec([
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      url,
    ]);

    const info = JSON.parse(rawJson);

    // Extract available quality options
    const formats = (info.formats || [])
      .filter(f => f.vcodec !== 'none' && f.height)
      .map(f => ({ quality: f.height, ext: f.ext, tbr: f.tbr }))
      .sort((a, b) => b.quality - a.quality)
      .filter((f, i, arr) => arr.findIndex(x => x.quality === f.quality) === i)
      .slice(0, 6);

    return res.json({
      title:     info.title     || 'Unknown Title',
      thumbnail: info.thumbnail || null,
      duration:  info.duration  || null,
      uploader:  info.uploader  || null,
      platform:  info.extractor_key || null,
      formats,
    });

  } catch (err) {
    console.error('[/api/info] Error:', err.message);
    return res.status(500).json({
      error: 'Failed to fetch video info.',
      details: err.message.slice(0, 200),
    });
  }
});

// ─── POST /api/download ────────────────────────────
// Returns a direct download URL (or streams the file)
app.post('/api/download', async (req, res) => {
  const { url, quality = 'best', format = 'mp4' } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL.' });
  }

  try {
    // Step 1: Get the direct URL(s) using yt-dlp -g (no download)
    const qualityArg = buildQualityArg(quality);
    const formatArgs = qualityArg.split(' ');

    // Build yt-dlp args to get download URL
    const ytdlpArgs = [
      '-g',                // print URL(s) without downloading
      '--no-playlist',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ...formatArgs,
    ];

    // For audio-only
    if (format === 'mp3') {
      ytdlpArgs[0] = '--get-url';
      ytdlpArgs.push('--extract-audio');
    }

    ytdlpArgs.push(url);

    let dlUrl = await ytdlpExec(ytdlpArgs);

    // yt-dlp may return two lines (video + audio) for merged formats
    // Take the first direct URL
    const urls = dlUrl.split('\n').filter(Boolean);
    const primaryUrl = urls[0];

    if (!primaryUrl) {
      throw new Error('yt-dlp did not return a download URL.');
    }

    // Get title for filename
    let title = 'flashget_video';
    try {
      const titleRaw = await ytdlpExec(['--get-title', '--no-warnings', url]);
      title = titleRaw.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 80) || title;
    } catch { /* use default */ }

    return res.json({
      downloadUrl: primaryUrl,
      title,
      format,
      quality,
    });

  } catch (err) {
    console.error('[/api/download] Error:', err.message);

    // Provide user-friendly error messages
    let errorMsg = 'Failed to get download URL.';
    if (err.message.includes('Private video'))  errorMsg = 'This video is private.';
    if (err.message.includes('age'))            errorMsg = 'Age-restricted content.';
    if (err.message.includes('not available'))  errorMsg = 'Video not available in your region.';
    if (err.message.includes('Sign in'))        errorMsg = 'Login-protected content cannot be downloaded.';

    return res.status(500).json({
      error: errorMsg,
      details: err.message.slice(0, 200),
    });
  }
});

// ─── 404 ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Error Handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n⚡ FlashGet API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   yt-dlp: ${YTDLP}\n`);
});

module.exports = app;
