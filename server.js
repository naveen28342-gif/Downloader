const express = require('express');
const cors = require('cors');
const path = require('path');
const contentDisposition = require('content-disposition');
const compression = require('compression');
const helmet = require('helmet');
const { spawn } = require('child_process');
const ytdlp = require('youtube-dl-exec');
const { constants: ytdlpConstants } = require('youtube-dl-exec');

// Resolve yt-dlp binary path from the bundled package
const YTDLP_PATH = ytdlpConstants.YOUTUBE_DL_PATH;

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Technical SEO: Compression (gzip) ─────────────────────
// Reduces transfer size by ~70%, improves Core Web Vitals LCP/FCP
app.use(compression());

// ─── Technical SEO: Security Headers ───────────────────────
// Google ranks HTTPS + secure headers higher
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());
app.use(express.json());

// ─── Technical SEO: Cache-Control for Static Assets ────────
// Long cache = faster repeat visits = better Core Web Vitals
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // HTML should not be cached aggressively (for updates)
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
    // Immutable for hashed assets
    if (filePath.match(/\.(css|js|png|jpg|svg|woff2?)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// ─── Helpers ───────────────────────────────────────────────

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed.href;
  } catch {
    return null;
  }
}

function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return 'unknown';
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function extractQualities(formats) {
  if (!formats || !Array.isArray(formats)) return ['1080', '720', '480', '360'];

  const qualities = new Set();
  for (const f of formats) {
    if (f.height && f.vcodec && f.vcodec !== 'none') {
      qualities.add(String(f.height));
    }
  }

  const sorted = [...qualities].map(Number).sort((a, b) => b - a).map(String);
  return sorted.length > 0 ? sorted : ['1080', '720', '480', '360'];
}

// ─── POST /api/info ────────────────────────────────────────

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return res.status(400).json({ error: 'Invalid URL' });

  const platform = detectPlatform(safeUrl);
  if (platform === 'unknown') {
    return res.status(400).json({ error: 'Only YouTube and Instagram links are supported' });
  }

  try {
    const info = await ytdlp(safeUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
    });

    const qualities = extractQualities(info.formats);

    res.json({
      success: true,
      platform,
      data: {
        title: info.title || 'Untitled',
        thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url || '',
        duration: formatDuration(info.duration),
        durationRaw: info.duration || 0,
        author: info.uploader || info.channel || info.creator || 'Unknown',
        description: (info.description || '').slice(0, 200),
        viewCount: info.view_count || 0,
        likeCount: info.like_count || 0,
        qualities,
        url: safeUrl,
      },
    });
  } catch (err) {
    console.error('Info error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch video info. Make sure yt-dlp is installed and the URL is valid.',
    });
  }
});

// ─── POST /api/download ───────────────────────────────────

app.post('/api/download', async (req, res) => {
  const { url, format = 'video', quality = '720', audioBitrate = '128' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return res.status(400).json({ error: 'Invalid URL' });

  try {
    // First get the title for the filename
    const info = await ytdlp(safeUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
    });

    const safeTitle = (info.title || 'download')
      .replace(/[^\w\s\-()]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80);

    let args = [safeUrl, '-o', '-', '--no-check-certificates', '--no-warnings'];

    if (format === 'audio') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', audioBitrate + 'k');
      // For piping audio, we need a different approach
      args = [
        safeUrl,
        '-f', 'bestaudio',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', audioBitrate + 'k',
        '-o', '-',
        '--no-check-certificates',
        '--no-warnings',
      ];
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', contentDisposition(`${safeTitle}.mp3`));
    } else {
      // Video download
      const formatStr = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`;
      args = [
        safeUrl,
        '-f', formatStr,
        '--merge-output-format', 'mp4',
        '-o', '-',
        '--no-check-certificates',
        '--no-warnings',
      ];
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', contentDisposition(`${safeTitle}.mp4`));
    }

    const proc = spawn(YTDLP_PATH, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let hasError = false;
    let stderrData = '';

    proc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    proc.stdout.pipe(res);

    proc.on('error', (err) => {
      hasError = true;
      if (!res.headersSent) {
        res.status(500).json({ error: 'yt-dlp not found. Please install it.' });
      }
    });

    proc.on('close', (code) => {
      if (code !== 0 && !hasError && !res.headersSent) {
        res.status(500).json({ error: `Download failed: ${stderrData}` });
      }
    });

    req.on('close', () => {
      proc.kill();
    });
  } catch (err) {
    console.error('Download error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed. Please try again.' });
    }
  }
});

// ─── Serve frontend ────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  🚀 Link Downloader running at http://localhost:${PORT}\n`);
});
