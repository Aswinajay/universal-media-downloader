# FlashGet ⚡ — Universal High-Performance Media Downloader Chrome Extension

> **Download anything.** Instant one-click video and audio downloads from **YouTube, Instagram, Facebook, Twitter/X, TikTok, Reddit, Vimeo, Dailymotion**, and 1,000+ other platforms. Built with React-ready JavaScript, Node.js, and powered by the legendary `yt-dlp`.

---

[![GitHub License](https://img.shields.io/github/license/aswinajay949/universal-media-downloader?style=for-the-badge&color=blue)](https://github.com/aswinajay949/universal-media-downloader/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/aswinajay949/universal-media-downloader?style=for-the-badge&color=gold)](https://github.com/aswinajay949/universal-media-downloader/stargazers)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-orange?style=for-the-badge&logo=google-chrome)](https://github.com/aswinajay949/universal-media-downloader)
[![Backend Status](https://img.shields.io/badge/Backend-Render.com-green?style=for-the-badge&logo=render)](https://render.com)

---

## 🎯 The Ultimate Downloader Suite

FlashGet is not just another downloader; it's a **professional-grade media acquisition tool** for developers and power users. Tired of shady downloader websites full of ads and trackers? FlashGet gives you your own private, self-hosted media engine.

### 🌟 Key Features

- **🚀 One-Click Downloads**: Native button injection directly into the UI of major social platforms.
- **🎥 4K/1080p Support**: Download videos in the highest possible quality available (support for MKV, MP4, WEBM).
- **🎧 High-Fidelity Audio**: Extract audio directly into high-bitrate MP3 or AAC with a single click.
- **🔒 Private & Secure**: No third-party data tracking. Your downloads, your backend, your privacy.
- **🛠️ Power of yt-dlp**: Leverage the most robust open-source engine that works even when others fail.
- **☁️ Render.com Integration**: One-click deployment for a serverless-style backend on the free tier.

---

## 🏗️ Architecture & Tech Stack

This project follows a modern **Decoupled Extension Architecture**:

- **Frontend**: Chrome Extension (Manifest V3) using a **Platform-Aware Injection Engine** (MutationObservers).
- **Backend API**: High-concurrency **Express.js** server containerized with **Docker**.
- **Engine**: The latest stable `yt-dlp` and `FFmpeg` for seamless stream merging.
- **Deployment**: `render.yaml` blueprint for instant, free-tier deployment on [Render.com](https://render.com).

---

## 🚀 Rapid Deployment & Installation

### 1. Deploy Private High-Performance Backend
1. Fork this repository.
2. Log in to [Render](https://render.com).
3. Click **New +** > **Blueprint**.
4. Connect your fork.
5. Render will automatically detect the `render.yaml` and provision your Docker container.
6. Copy your unique **Web Service URL** (e.g., `https://flashget-api-xxxx.onrender.com`).

### 2. Configure & Load FlashGet Extension
1. Open the [FlashGet Extension Popup](popup.html).
2. Go to **Backend Server** section and paste your Render URL.
3. Save the settings.
4. Open `chrome://extensions/`.
5. Enable **Developer Mode**.
6. Click **Load unpacked** and select the root directory of this project.

---

## 🌐 Extensibility & Supported Platforms

FlashGet's adaptive engine supports virtually any site with a video element.

| Platform | Injection Type | Speed | High-Res |
|---|---|---|---|
| **YouTube** | Action Bar Button | ⚡⚡⚡ | ✅ |
| **Instagram** | Post Action Injection | ⚡⚡ | ✅ |
| **Facebook** | React Component Wrap | ⚡⚡⚡ | ✅ |
| **Twitter/X** | Card Action Hook | ⚡⚡ | ✅ |
| **TikTok** | Player Overlay | ⚡⚡ | ✅ |
| **Reddit** | Feed Action Bar | ⚡⚡ | ✅ |

---

## 🧪 Search Engine Optimization (SEO) Metadata

This repository is optimized for semantic search engines and LLM-based code discovery:

- **Keywords**: #YouTubeDownloader #InstagramDownloader #FacebookVideo #TiktokDownloader #TwitterVideo #ChromeExtension #yt-dlp #NodeJS #Render #FastMediaDownloader #OpenSource #HighResolution
- **Categories**: Media Acquisition, Web Scraping, Browser Extensions, Automation.

---

## 🛠️ Local Contribution & Development

```bash
# Clone the repository
git clone https://github.com/aswinajay949/universal-media-downloader.git

# Install dependencies for the backend
cd server
npm install

# Start development server with hot-reload
npm run dev
```

---

## 📄 License & Legal

Distributed under the **MIT License**. See `LICENSE` for more information.

> [!CAUTION]
> This tool is intended for personal and educational use only. Please respect the terms of service of the respective platforms and the copyrights of the content creators.
