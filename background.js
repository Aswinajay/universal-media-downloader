// =====================================================
// FlashGet — Universal Media Downloader
// Background Service Worker
// =====================================================

const DEFAULT_BACKEND_URL = 'https://flashget-api.onrender.com'; // Update after Render deploy

// ─── Messaging ───────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_INFO') {
    handleGetInfo(message.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async
  }

  if (message.action === 'DOWNLOAD') {
    handleDownload(message.url, message.quality, message.format, message.title)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'GET_BACKEND_URL') {
    chrome.storage.sync.get(['backendUrl'], (result) => {
      sendResponse({ url: result.backendUrl || DEFAULT_BACKEND_URL });
    });
    return true;
  }
});

// ─── Get Video Info ───────────────────────────────────
async function handleGetInfo(videoUrl) {
  const backendUrl = await getBackendUrl();
  const endpoint = `${backendUrl}/api/info?url=${encodeURIComponent(videoUrl)}`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error: ${response.status}`);
  }

  return await response.json();
}

// ─── Download Handler ─────────────────────────────────
async function handleDownload(videoUrl, quality = 'best', format = 'mp4', title = 'video') {
  const backendUrl = await getBackendUrl();
  const endpoint = `${backendUrl}/api/download`;

  // Request the download URL from backend
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: videoUrl, quality, format })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to process: ${response.status}`);
  }

  const data = await response.json();

  if (!data.downloadUrl) {
    throw new Error('Backend did not return a download URL.');
  }

  // Trigger browser download
  const safeTitle = sanitizeFilename(title || data.title || 'flashget_video');
  const ext = format === 'mp3' ? 'mp3' : (format === 'webm' ? 'webm' : 'mp4');
  const filename = `${safeTitle}.${ext}`;

  chrome.downloads.download({
    url: data.downloadUrl,
    filename: filename,
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('[FlashGet] Download error:', chrome.runtime.lastError);
    } else {
      console.log('[FlashGet] Download started, ID:', downloadId);
      showNotification('Download Started!', `Saving: ${filename}`);
    }
  });

  return { downloadId: 'initiated', filename };
}

// ─── Helpers ──────────────────────────────────────────
async function getBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['backendUrl'], (result) => {
      resolve(result.backendUrl || DEFAULT_BACKEND_URL);
    });
  });
}

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `⚡ FlashGet — ${title}`,
    message: message,
    priority: 1
  });
}
