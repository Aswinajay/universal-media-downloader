// =====================================================
// FlashGet — Universal Media Downloader
// Content Script — Platform-aware injection engine
// =====================================================

(function () {
  'use strict';

  // ─── SVG Icons ─────────────────────────────────────
  const DOWNLOAD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

  // ─── Platform Detection ─────────────────────────────
  const PLATFORMS = {
    youtube:    { test: () => /youtube\.com\/watch/.test(location.href) },
    instagram:  { test: () => /instagram\.com\/(p|reel|tv)\//.test(location.href) },
    facebook:   { test: () => /facebook\.com/.test(location.href) },
    twitter:    { test: () => /(twitter\.com|x\.com)\/\w+\/status\//.test(location.href) },
    tiktok:     { test: () => /tiktok\.com\/@.+\/video\//.test(location.href) },
    reddit:     { test: () => /reddit\.com\/r\/.+\/comments\//.test(location.href) },
    vimeo:      { test: () => /vimeo\.com\/\d+/.test(location.href) },
    dailymotion:{ test: () => /dailymotion\.com\/video\//.test(location.href) },
    twitch:     { test: () => /twitch\.tv\/videos\//.test(location.href) },
    pinterest:  { test: () => /pinterest\.com\/pin\//.test(location.href) },
    linkedin:   { test: () => /linkedin\.com\/posts\//.test(location.href) },
  };

  function detectPlatform() {
    for (const [name, platform] of Object.entries(PLATFORMS)) {
      if (platform.test()) return name;
    }
    return 'generic';
  }

  // ─── State ─────────────────────────────────────────
  let currentPlatform = null;
  let injected = false;
  let lastUrl = '';

  // ─── Init ───────────────────────────────────────────
  function init() {
    const platform = detectPlatform();
    const url = location.href;

    if (url === lastUrl && injected) return;
    lastUrl = url;
    injected = false;
    currentPlatform = platform;

    removeExisting();

    if (platform === 'youtube') {
      injectYouTube();
    } else if (platform === 'instagram') {
      injectInstagram();
    } else if (platform === 'facebook') {
      injectFacebook();
    } else if (platform === 'twitter') {
      injectTwitter();
    } else if (platform === 'tiktok') {
      injectTikTok();
    } else if (platform === 'reddit') {
      injectReddit();
    } else {
      injectFAB(); // Generic fallback
    }
  }

  function removeExisting() {
    document.getElementById('flashget-fab')?.remove();
  }

  // ─── YouTube Injection ──────────────────────────────
  function injectYouTube() {
    const tryInject = () => {
      // Try the actions bar (below title)
      const actionsBar = document.querySelector('#actions-inner #menu');
      const altBar = document.querySelector('ytd-watch-metadata #actions');
      const target = actionsBar || altBar;

      if (!target) return false;

      if (target.querySelector('.yt-flashget-wrap')) return true; // already there

      const wrap = document.createElement('div');
      wrap.className = 'yt-flashget-wrap';

      const btn = makeInlineButton('Download');
      btn.id = 'flashget-yt-btn';
      btn.addEventListener('click', () => openModal(location.href));

      wrap.appendChild(btn);
      target.appendChild(wrap);
      injected = true;
      return true;
    };

    waitForElement('#actions-inner, ytd-watch-metadata #actions', tryInject, 8000);
  }

  // ─── Instagram Injection ────────────────────────────
  function injectInstagram() {
    const tryInject = () => {
      // Article on post page
      const article = document.querySelector('article');
      if (!article) return false;

      if (article.querySelector('.flashget-inline-btn')) return true;

      const actionsSection = article.querySelector('section');
      if (!actionsSection) return false;

      const btn = makeInlineButton('Download');
      btn.style.marginTop = '8px';
      btn.addEventListener('click', () => openModal(location.href));

      actionsSection.appendChild(btn);
      injected = true;
      return true;
    };

    waitForElement('article section', tryInject, 8000);
    setTimeout(() => { if (!injected) injectFAB(); }, 8000);
  }

  // ─── Facebook Injection ─────────────────────────────
  function injectFacebook() {
    const tryInject = () => {
      const videoPlayer = document.querySelector('[data-testid="UFI2ReactionsCount/root"]') ||
                          document.querySelector('[aria-label="Like"]')?.closest('[role="group"]');

      if (!videoPlayer) return false;
      if (videoPlayer.querySelector('.flashget-inline-btn')) return true;

      const btn = makeInlineButton('⚡ FlashGet');
      btn.addEventListener('click', () => openModal(location.href));
      videoPlayer.appendChild(btn);
      injected = true;
      return true;
    };

    waitForElement('[aria-label="Like"]', tryInject, 6000);
    setTimeout(() => { if (!injected) injectFAB(); }, 6000);
  }

  // ─── Twitter/X Injection ────────────────────────────
  function injectTwitter() {
    const tryInject = () => {
      // Find tweet action bar
      const actionBars = document.querySelectorAll('[role="group"][aria-label]');
      for (const bar of actionBars) {
        if (bar.querySelector('.flashget-inline-btn')) continue;
        const btn = makeInlineButton('Download');
        btn.style.marginLeft = '0';
        btn.addEventListener('click', () => openModal(location.href));
        bar.appendChild(btn);
        injected = true;
        return true;
      }
      return false;
    };

    waitForElement('[role="group"][aria-label]', tryInject, 6000);
    setTimeout(() => { if (!injected) injectFAB(); }, 6000);
  }

  // ─── TikTok Injection ───────────────────────────────
  function injectTikTok() {
    const tryInject = () => {
      const actionBar = document.querySelector('[class*="DivActionItemContainer"]') ||
                        document.querySelector('[data-e2e="like-icon"]')?.closest('div[class]');

      if (!actionBar) return false;
      if (actionBar.querySelector('.flashget-inline-btn')) return true;

      const btn = makeInlineButton('Download');
      btn.style.marginTop = '12px';
      btn.addEventListener('click', () => openModal(location.href));
      actionBar.appendChild(btn);
      injected = true;
      return true;
    };

    waitForElement('[data-e2e="like-icon"]', tryInject, 6000);
    setTimeout(() => { if (!injected) injectFAB(); }, 6000);
  }

  // ─── Reddit Injection ───────────────────────────────
  function injectReddit() {
    const tryInject = () => {
      const postActions = document.querySelector('[data-test-id="post-content"]') ||
                          document.querySelector('shreddit-post');

      if (!postActions) return false;
      if (postActions.querySelector('.flashget-inline-btn')) return true;

      const btn = makeInlineButton('Download Video');
      btn.addEventListener('click', () => openModal(location.href));
      postActions.appendChild(btn);
      injected = true;
      return true;
    };

    waitForElement('shreddit-post, [data-test-id="post-content"]', tryInject, 6000);
    setTimeout(() => { if (!injected) injectFAB(); }, 6000);
  }

  // ─── Generic FAB Fallback ───────────────────────────
  function injectFAB() {
    if (document.getElementById('flashget-fab')) return;

    // Only show FAB if page has a <video> element
    const hasVideo = !!document.querySelector('video');
    if (!hasVideo && currentPlatform === 'generic') return;

    const fab = document.createElement('button');
    fab.id = 'flashget-fab';
    fab.innerHTML = `${DOWNLOAD_SVG} <span>FlashGet</span> <span class="fg-pulse"></span>`;
    fab.title = 'Download media with FlashGet';
    fab.addEventListener('click', () => openModal(location.href));
    document.body.appendChild(fab);
    injected = true;
  }

  // ─── UI Helpers ─────────────────────────────────────
  function makeInlineButton(label) {
    const btn = document.createElement('button');
    btn.className = 'flashget-inline-btn';
    btn.innerHTML = `${DOWNLOAD_SVG} ${label}`;
    return btn;
  }

  // ─── Download Modal ──────────────────────────────────
  let modalOpen = false;

  function openModal(url) {
    if (modalOpen) return;
    modalOpen = true;

    const overlay = document.createElement('div');
    overlay.id = 'flashget-modal-overlay';

    overlay.innerHTML = `
      <div id="flashget-modal" role="dialog" aria-modal="true" aria-labelledby="fg-modal-title">
        <div class="fg-modal-header">
          <div class="fg-logo-wrap">${LOGO_SVG}</div>
          <div>
            <div class="fg-title" id="fg-modal-title">FlashGet Download</div>
            <div class="fg-subtitle" title="${url}">${url.length > 45 ? url.slice(0, 45) + '…' : url}</div>
          </div>
          <button class="fg-close" id="fg-modal-close" aria-label="Close">✕</button>
        </div>

        <div id="fg-info-card" class="fg-info-card" style="display:none">
          <img class="fg-thumbnail" id="fg-thumbnail" src="" alt="thumbnail" />
          <div class="fg-video-title" id="fg-video-title">Loading...</div>
        </div>

        <div class="fg-section-label">Quality</div>
        <div class="fg-options-row" id="fg-quality-row">
          <button class="fg-option-pill fg-active" data-value="best">Best</button>
          <button class="fg-option-pill" data-value="1080">1080p</button>
          <button class="fg-option-pill" data-value="720">720p</button>
          <button class="fg-option-pill" data-value="480">480p</button>
          <button class="fg-option-pill" data-value="360">360p</button>
        </div>

        <div class="fg-section-label">Format</div>
        <div class="fg-options-row" id="fg-format-row">
          <button class="fg-option-pill fg-active" data-value="mp4">MP4 Video</button>
          <button class="fg-option-pill" data-value="mp3">MP3 Audio</button>
          <button class="fg-option-pill" data-value="webm">WEBM</button>
        </div>

        <button class="fg-download-btn" id="fg-start-download">
          ${DOWNLOAD_SVG} Start Download
        </button>
        <div class="fg-status" id="fg-status"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close button
    document.getElementById('fg-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', escHandler);

    // Quality pills
    setupPillGroup('fg-quality-row');
    setupPillGroup('fg-format-row');

    // Load video info
    fetchVideoInfo(url);

    // Download button
    document.getElementById('fg-start-download').addEventListener('click', () => {
      const quality = getSelectedValue('fg-quality-row');
      const format = getSelectedValue('fg-format-row');
      startDownload(url, quality, format);
    });
  }

  function closeModal() {
    document.getElementById('flashget-modal-overlay')?.remove();
    document.removeEventListener('keydown', escHandler);
    modalOpen = false;
  }

  function escHandler(e) {
    if (e.key === 'Escape') closeModal();
  }

  function setupPillGroup(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.querySelectorAll('.fg-option-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        row.querySelectorAll('.fg-option-pill').forEach(b => b.classList.remove('fg-active'));
        btn.classList.add('fg-active');
      });
    });
  }

  function getSelectedValue(rowId) {
    const active = document.querySelector(`#${rowId} .fg-option-pill.fg-active`);
    return active ? active.dataset.value : 'best';
  }

  function fetchVideoInfo(url) {
    chrome.runtime.sendMessage({ action: 'GET_INFO', url }, (response) => {
      if (chrome.runtime.lastError || !response?.success) return;
      const data = response.data;

      const card = document.getElementById('fg-info-card');
      const thumb = document.getElementById('fg-thumbnail');
      const title = document.getElementById('fg-video-title');
      const subtitle = document.querySelector('#flashget-modal .fg-subtitle');

      if (card && data) {
        card.style.display = 'flex';
        if (thumb && data.thumbnail) thumb.src = data.thumbnail;
        if (title && data.title) title.textContent = data.title;
        if (subtitle && data.title) subtitle.textContent = data.title;
      }
    });
  }

  function startDownload(url, quality, format) {
    const btn = document.getElementById('fg-start-download');
    const status = document.getElementById('fg-status');

    btn.classList.add('loading');
    btn.innerHTML = `<div class="fg-spinner"></div> Processing…`;
    status.className = 'fg-status info';
    status.textContent = 'Contacting FlashGet server…';

    const title = document.getElementById('fg-video-title')?.textContent || 'video';

    chrome.runtime.sendMessage({ action: 'DOWNLOAD', url, quality, format, title }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus('error', 'Extension error. Please reload.');
        resetBtn(btn);
        return;
      }

      if (response?.success) {
        status.className = 'fg-status success';
        status.textContent = '✓ Download started! Check your Downloads folder.';
        btn.innerHTML = `✓ Download Started`;
        setTimeout(closeModal, 2500);
      } else {
        setStatus('error', response?.error || 'Download failed. Server may be unavailable.');
        resetBtn(btn);
      }
    });
  }

  function setStatus(type, msg) {
    const status = document.getElementById('fg-status');
    if (!status) return;
    status.className = `fg-status ${type}`;
    status.textContent = msg;
  }

  function resetBtn(btn) {
    if (!btn) return;
    btn.classList.remove('loading');
    btn.innerHTML = `${DOWNLOAD_SVG} Try Again`;
  }

  // ─── Wait for Element Helper ────────────────────────
  function waitForElement(selector, callback, timeout = 5000) {
    const start = Date.now();
    const check = () => {
      const el = document.querySelector(selector);
      if (el) {
        callback();
        return;
      }
      if (Date.now() - start < timeout) {
        requestAnimationFrame(check);
      }
    };
    check();
  }

  // ─── SPA Navigation Observer ────────────────────────
  const navObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      setTimeout(init, 1000);
    }
  });

  navObserver.observe(document.body, { childList: true, subtree: true });

  // ─── Kick off ───────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }

})();
