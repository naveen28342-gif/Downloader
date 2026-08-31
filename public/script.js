/* ═══════════════════════════════════════════════════════════
   LinkGrab — Frontend Logic
   ═══════════════════════════════════════════════════════════ */

// ─── DOM Elements ──────────────────────────────────────────
const urlInput = document.getElementById('urlInput');
const pasteBtn = document.getElementById('pasteBtn');
const fetchBtn = document.getElementById('fetchBtn');
const platformIcon = document.getElementById('platformIcon');
const inputHint = document.getElementById('inputHint');

const previewSection = document.getElementById('previewSection');
const previewThumb = document.getElementById('previewThumb');
const previewTitle = document.getElementById('previewTitle');
const previewDuration = document.getElementById('previewDuration');
const previewAuthorText = document.getElementById('previewAuthorText');
const previewPlatform = document.getElementById('previewPlatform');
const platformBadgeText = document.getElementById('platformBadgeText');
const viewCountText = document.getElementById('viewCountText');

const formatTabs = document.getElementById('formatTabs');
const tabVideo = document.getElementById('tabVideo');
const tabAudio = document.getElementById('tabAudio');
const videoQualityGroup = document.getElementById('videoQualityGroup');
const audioBitrateGroup = document.getElementById('audioBitrateGroup');
const videoQualityPills = document.getElementById('videoQualityPills');
const audioBitratePills = document.getElementById('audioBitratePills');
const downloadBtn = document.getElementById('downloadBtn');
const downloadBtnText = document.getElementById('downloadBtnText');

const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const particlesContainer = document.getElementById('particles');

// ─── State ─────────────────────────────────────────────────
let currentInfo = null;
let currentFormat = 'video';
let currentQuality = '1080';
let currentBitrate = '256';

// ─── URL Patterns ──────────────────────────────────────────
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)/i;
const INSTAGRAM_REGEX = /(?:instagram\.com\/(?:p\/|reel\/|tv\/|stories\/))/i;

function detectPlatform(url) {
  if (YOUTUBE_REGEX.test(url)) return 'youtube';
  if (INSTAGRAM_REGEX.test(url)) return 'instagram';
  return null;
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && detectPlatform(url) !== null;
  } catch {
    return false;
  }
}

// ─── Particles ─────────────────────────────────────────────
function createParticles() {
  const count = window.innerWidth < 600 ? 15 : 30;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (8 + Math.random() * 12) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    particle.style.width = particle.style.height = (2 + Math.random() * 3) + 'px';
    particle.style.opacity = 0.2 + Math.random() * 0.4;

    // Vary colors
    const colors = ['rgba(139,92,246,0.4)', 'rgba(6,182,212,0.3)', 'rgba(236,72,153,0.3)'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];

    particlesContainer.appendChild(particle);
  }
}

// ─── Toast ─────────────────────────────────────────────────
let toastTimeout;
function showToast(message, type = 'error') {
  clearTimeout(toastTimeout);
  toastText.textContent = message;
  toast.className = `toast visible ${type}`;
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 4000);
}

// ─── Format View Count ─────────────────────────────────────
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

// ─── Update Platform Icon ──────────────────────────────────
function updatePlatformIcon(url) {
  const platform = detectPlatform(url);
  platformIcon.className = 'input-icon';

  if (platform === 'youtube') {
    platformIcon.classList.add('youtube');
    platformIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>`;
  } else if (platform === 'instagram') {
    platformIcon.classList.add('instagram');
    platformIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>`;
  } else {
    platformIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M13.5 2a1.5 1.5 0 0 0-1.5 1.5v17a1.5 1.5 0 0 0 3 0v-17A1.5 1.5 0 0 0 13.5 2zm-5 4A1.5 1.5 0 0 0 7 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 8.5 6zm10 2a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 18.5 8zm-15 2A1.5 1.5 0 0 0 2 11.5v1a1.5 1.5 0 0 0 3 0v-1A1.5 1.5 0 0 0 3.5 10z"/>
    </svg>`;
  }
}

// ─── Populate Quality Pills ────────────────────────────────
function populateQualityPills(qualities) {
  videoQualityPills.innerHTML = '';

  const labelMap = {
    '4320': '8K',
    '2160': '4K',
    '1440': '2K',
    '1080': '1080p',
    '720': '720p',
    '480': '480p',
    '360': '360p',
    '240': '240p',
    '144': '144p',
  };

  qualities.forEach((q, i) => {
    const pill = document.createElement('button');
    pill.className = 'quality-pill' + (i === 0 ? ' active' : '');
    pill.dataset.value = q;
    pill.textContent = labelMap[q] || q + 'p';
    pill.addEventListener('click', () => selectQualityPill(pill, 'video'));
    videoQualityPills.appendChild(pill);
  });

  currentQuality = qualities[0] || '1080';
}

function selectQualityPill(pill, type) {
  const container = type === 'video' ? videoQualityPills : audioBitratePills;
  container.querySelectorAll('.quality-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');

  if (type === 'video') {
    currentQuality = pill.dataset.value;
  } else {
    currentBitrate = pill.dataset.value;
  }
}

// ─── Setup Audio Bitrate Pills ─────────────────────────────
function setupAudioPills() {
  audioBitratePills.querySelectorAll('.quality-pill').forEach(pill => {
    pill.addEventListener('click', () => selectQualityPill(pill, 'audio'));
  });
}

// ─── Fetch Info ────────────────────────────────────────────
async function fetchInfo() {
  const url = urlInput.value.trim();
  if (!url) return;

  fetchBtn.classList.add('loading');
  fetchBtn.disabled = true;
  inputHint.textContent = 'Fetching video info...';
  inputHint.className = 'input-hint';
  previewSection.classList.add('hidden');

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to fetch info');
    }

    currentInfo = data.data;
    displayPreview(data);
    inputHint.textContent = '✓ Video found!';
    inputHint.className = 'input-hint success';
    showToast('Video info loaded successfully!', 'success');
  } catch (err) {
    inputHint.textContent = err.message;
    inputHint.className = 'input-hint error';
    showToast(err.message, 'error');
  } finally {
    fetchBtn.classList.remove('loading');
    fetchBtn.disabled = !isValidUrl(urlInput.value.trim());
  }
}

// ─── Display Preview ───────────────────────────────────────
function displayPreview(data) {
  const { platform } = data;
  const info = data.data;

  previewThumb.src = info.thumbnail;
  previewThumb.alt = info.title;
  previewTitle.textContent = info.title;
  previewDuration.textContent = info.duration;
  previewAuthorText.textContent = info.author;
  viewCountText.textContent = formatNumber(info.viewCount);

  platformBadgeText.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
  previewPlatform.className = `preview-card__platform-badge ${platform}`;

  populateQualityPills(info.qualities);
  previewSection.classList.remove('hidden');

  // Smooth scroll to preview
  setTimeout(() => {
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

// ─── Download ──────────────────────────────────────────────
async function downloadMedia() {
  if (!currentInfo) return;

  downloadBtn.classList.add('loading');
  downloadBtn.disabled = true;

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentInfo.url,
        format: currentFormat,
        quality: currentQuality,
        audioBitrate: currentBitrate,
      }),
    });

    if (!res.ok) {
      let errorMsg = 'Download failed';
      try {
        const err = await res.json();
        errorMsg = err.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    // Get filename from Content-Disposition header
    const disposition = res.headers.get('Content-Disposition');
    let filename = currentFormat === 'audio' ? 'audio.mp3' : 'video.mp4';
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i);
      if (match) filename = decodeURIComponent(match[1]);
    }

    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    showToast('Download started!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    downloadBtn.classList.remove('loading');
    downloadBtn.disabled = false;
  }
}

// ─── Event Listeners ───────────────────────────────────────

// URL input
urlInput.addEventListener('input', () => {
  const url = urlInput.value.trim();
  const valid = isValidUrl(url);
  fetchBtn.disabled = !valid;
  updatePlatformIcon(url);

  if (url && !valid) {
    inputHint.textContent = 'Please enter a valid YouTube or Instagram URL';
    inputHint.className = 'input-hint error';
  } else {
    inputHint.textContent = 'Supports YouTube & Instagram links';
    inputHint.className = 'input-hint';
  }
});

// Enter key
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !fetchBtn.disabled) {
    fetchInfo();
  }
});

// Paste button
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    urlInput.value = text;
    urlInput.dispatchEvent(new Event('input'));

    // Auto-fetch if valid
    if (isValidUrl(text)) {
      setTimeout(fetchInfo, 300);
    }
  } catch {
    showToast('Unable to access clipboard. Try Ctrl+V instead.', 'error');
  }
});

// Auto-detect paste
urlInput.addEventListener('paste', (e) => {
  setTimeout(() => {
    urlInput.dispatchEvent(new Event('input'));
    if (isValidUrl(urlInput.value.trim())) {
      setTimeout(fetchInfo, 300);
    }
  }, 50);
});

// Fetch button
fetchBtn.addEventListener('click', fetchInfo);

// Format tabs
tabVideo.addEventListener('click', () => {
  currentFormat = 'video';
  tabVideo.classList.add('active');
  tabAudio.classList.remove('active');
  videoQualityGroup.classList.remove('hidden');
  audioBitrateGroup.classList.add('hidden');
  downloadBtnText.textContent = 'Download MP4';
});

tabAudio.addEventListener('click', () => {
  currentFormat = 'audio';
  tabAudio.classList.add('active');
  tabVideo.classList.remove('active');
  videoQualityGroup.classList.add('hidden');
  audioBitrateGroup.classList.remove('hidden');
  downloadBtnText.textContent = 'Download MP3';
});

// Download button
downloadBtn.addEventListener('click', downloadMedia);

// ─── PWA & Service Worker ─────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

let deferredPrompt = null;
const pwaInstallBtn = document.getElementById('pwaInstallBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (pwaInstallBtn) {
    pwaInstallBtn.style.display = 'inline-flex';
  }
});

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        pwaInstallBtn.style.display = 'none';
      }
      deferredPrompt = null;
    } else {
      showToast('To install LinkGrab, use your browser menu -> "Install" or "Add to Home screen"', 'success');
    }
  });
}

// ─── Init ──────────────────────────────────────────────────
createParticles();
setupAudioPills();

// Handle preset format if defined by specific landing page
if (window.DEFAULT_FORMAT === 'audio' && tabAudio) {
  tabAudio.click();
}

// Focus input on load
setTimeout(() => {
  if (urlInput) urlInput.focus();
}, 500);

