# =====================================================
# FlashGet — Universal Media Downloader
# Root-level Dockerfile for Render.com Blueprint
# Base: Python (for yt-dlp) + Node.js 20 + FFmpeg
# =====================================================

FROM python:3.12-slim

# ── System Dependencies ──────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Install Node.js 20 LTS ───────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Install yt-dlp (latest stable) ──────────────
RUN pip install --no-cache-dir --upgrade yt-dlp

# ── Verify installs ──────────────────────────────
RUN node --version && npm --version && yt-dlp --version && ffmpeg -version | head -1

# ── App Setup  (server/ is the Node app root) ───
WORKDIR /app

# Copy only server's package files first for layer caching
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server source code into working dir
COPY server/ .

# ── Environment ──────────────────────────────────
ENV NODE_ENV=production
ENV PORT=10000
ENV YTDLP_PATH=yt-dlp

# ── Expose & Run ─────────────────────────────────
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

CMD ["node", "index.js"]
