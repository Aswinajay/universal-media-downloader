// =====================================================
// FlashGet — Universal Media Downloader
// Popup Script
// =====================================================

const DEFAULT_BACKEND = 'https://flashget-api.onrender.com';

const PLATFORM_META = {
  youtube:     { name: 'YouTube',     icon: '📺' },
  instagram:   { name: 'Instagram',   icon: '📸' },
  facebook:    { name: 'Facebook',    icon: '👥' },
  twitter:     { name: 'Twitter/X',   icon: '🐦' },
  tiktok:      { name: 'TikTok',      icon: '🎵' },
  reddit:      { name: 'Reddit',      icon: '🤖' },
  vimeo:       { name: 'Vimeo',       icon: '🎬' },
  dailymotion: { name: 'Dailymotion', icon: '▶️' },
  twitch:      { name: 'Twitch',      icon: '🎮' },
  pinterest:   { name: 'Pinterest',   icon: '📌' },
  linkedin:    { name: 'LinkedIn',    icon: '💼' },
  generic:     { name: 'Web Page',    icon: '🌐' },
};

function detectPlatform(url) {
  if (!url) return 'generic';
  if (/youtube\.com|youtu\.be/.test(url))  return 'youtube';
  if (/instagram\.com/.test(url))           return 'instagram';
  if (/facebook\.com/.test(url))            return 'facebook';
  if (/twitter\.com|x\.com/.test(url))      return 'twitter';
  if (/tiktok\.com/.test(url))              return 'tiktok';
  if (/reddit\.com/.test(url))              return 'reddit';
  if (/vimeo\.com/.test(url))               return 'vimeo';
  if (/dailymotion\.com/.test(url))         return 'dailymotion';
  if (/twitch\.tv/.test(url))               return 'twitch';
  if (/pinterest\.com/.test(url))           return 'pinterest';
  if (/linkedin\.com/.test(url))            return 'linkedin';
  return 'generic';
}

// ─── DOM Refs ─────────────────────────────────────
const $id = id => document.getElementById(id);

const els = {
  statusBadge:    $id('status-badge'),
  statusDot:      $id('status-dot'),
  statusText:     $id('status-text'),
  pagePlatIcon:   $id('page-platform-icon'),
  pagePlatform:   $id('page-platform'),
  pageUrl:        $id('page-url'),
  downloadBtn:    $id('download-current-btn'),
  manualUrl:      $id('manual-url'),
  pasteBtn:       $id('paste-btn'),
  manualDlBtn:    $id('download-manual-btn'),
  qualitySel:     $id('default-quality'),
  formatSel:      $id('default-format'),
  backendUrl:     $id('backend-url'),
  saveBackendBtn: $id('save-backend-btn'),
  popupStatus:    $id('popup-status'),
};

// ─── Init ─────────────────────────────────────────
async function init() {
  // Load saved settings
  const saved = await storageGet(['backendUrl', 'defaultQuality', 'defaultFormat']);
  if (saved.backendUrl)     els.backendUrl.value  = saved.backendUrl;
  if (saved.defaultQuality) els.qualitySel.value  = saved.defaultQuality;
  if (saved.defaultFormat)  els.formatSel.value   = saved.defaultFormat;

  // Show current tab info
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const url = tab?.url || '';
  const platform = detectPlatform(url);
  const meta = PLATFORM_META[platform] || PLATFORM_META.generic;

  els.pagePlatIcon.textContent = meta.icon;
  els.pagePlatform.textContent = meta.name;
  els.pageUrl.textContent = url ? (url.length > 48 ? url.slice(0, 48) + '…' : url) : 'No page detected';

  // Check backend health
  checkBackend(saved.backendUrl || DEFAULT_BACKEND);

  // Event listeners
  els.downloadBtn.addEventListener('click', () => downloadCurrent(url));
  els.pasteBtn.addEventListener('click', pasteFromClipboard);
  els.manualDlBtn.addEventListener('click', downloadManual);
  els.saveBackendBtn.addEventListener('click', saveBackend);

  els.qualitySel.addEventListener('change', () => {
    chrome.storage.sync.set({ defaultQuality: els.qualitySel.value });
  });
  els.formatSel.addEventListener('change', () => {
    chrome.storage.sync.set({ defaultFormat: els.formatSel.value });
  });
}

// ─── Backend Health Check ─────────────────────────
async function checkBackend(backendUrl) {
  const url = (backendUrl || DEFAULT_BACKEND).replace(/\/$/, '');
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      setStatusBadge('online', '● Online');
    } else {
      setStatusBadge('offline', '● Offline');
    }
  } catch {
    setStatusBadge('offline', '● Offline');
  }
}

function setStatusBadge(state, text) {
  els.statusBadge.className = `status-badge ${state}`;
  els.statusText.textContent = text;
}

// ─── Download Current Tab ─────────────────────────
async function downloadCurrent(url) {
  if (!url || url.startsWith('chrome://')) {
    showStatus('error', 'Cannot download from this page.');
    return;
  }

  const quality = els.qualitySel.value || 'best';
  const format  = els.formatSel.value  || 'mp4';

  setDownloadBtnState(true);
  showStatus('info', 'Contacting FlashGet server…');

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tabs[0].id, {
      action: 'TRIGGER_DOWNLOAD',
      url, quality, format
    });
    showStatus('success', '✓ Download initiated! Check the page.');
  } catch (err) {
    // Fallback: send directly via background
    chrome.runtime.sendMessage({ action: 'DOWNLOAD', url, quality, format }, (res) => {
      if (res?.success) {
        showStatus('success', '✓ Download started! Check Downloads folder.');
      } else {
        showStatus('error', res?.error || 'Download failed. Is backend deployed?');
      }
    });
  } finally {
    setDownloadBtnState(false);
  }
}

// ─── Manual URL Download ──────────────────────────
async function downloadManual() {
  const url = els.manualUrl.value.trim();
  if (!url) { showStatus('error', 'Please enter or paste a URL first.'); return; }

  try { new URL(url); } catch {
    showStatus('error', 'Invalid URL. Please enter a valid link.');
    return;
  }

  const quality = els.qualitySel.value || 'best';
  const format  = els.formatSel.value  || 'mp4';

  els.manualDlBtn.textContent = '⏳ Processing…';
  els.manualDlBtn.disabled = true;
  showStatus('info', 'Sending to FlashGet server…');

  chrome.runtime.sendMessage({ action: 'DOWNLOAD', url, quality, format }, (res) => {
    els.manualDlBtn.textContent = '⚡ Get Media';
    els.manualDlBtn.disabled = false;

    if (res?.success) {
      showStatus('success', '✓ Download started! Check your Downloads folder.');
      els.manualUrl.value = '';
    } else {
      showStatus('error', res?.error || 'Download failed. Check your backend URL.');
    }
  });
}

// ─── Paste from Clipboard ─────────────────────────
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) els.manualUrl.value = text;
  } catch {
    showStatus('info', 'Please paste manually (Cmd+V).');
  }
}

// ─── Save Backend URL ─────────────────────────────
function saveBackend() {
  const url = els.backendUrl.value.trim().replace(/\/$/, '');
  if (!url) { showStatus('error', 'Please enter your Render backend URL.'); return; }

  chrome.storage.sync.set({ backendUrl: url }, () => {
    showStatus('success', '✓ Backend URL saved!');
    checkBackend(url);
  });
}

// ─── UI Helpers ───────────────────────────────────
function showStatus(type, msg) {
  els.popupStatus.className = `popup-status ${type} visible`;
  els.popupStatus.textContent = msg;
  if (type !== 'info') {
    setTimeout(() => {
      els.popupStatus.className = 'popup-status';
      els.popupStatus.textContent = '';
    }, 4000);
  }
}

function setDownloadBtnState(loading) {
  if (loading) {
    els.downloadBtn.innerHTML = `<span class="spinner"></span> Processing…`;
    els.downloadBtn.disabled = true;
  } else {
    els.downloadBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Download Current Page`;
    els.downloadBtn.disabled = false;
  }
}

function storageGet(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

// ─── Boot ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
