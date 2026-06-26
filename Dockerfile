# lalaBye — API + frontend in one container (Hamravesh Darkube / Docker)
FROM node:22-bookworm-slim

WORKDIR /app

# ffmpeg-static needs a glibc-based image (Debian), not Alpine.
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force

COPY backend ./backend
COPY frontend ./frontend

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/storytelling.sqlite \
    BACKUP_DIR=/data/backups \
    AUDIO_STORAGE_DIR=/data/audio \
    VOICE_UPLOAD_DIR=/data/voice-uploads

RUN mkdir -p /data/backups /data/audio /data/voice-uploads \
    && chown -R node:node /app /data

WORKDIR /app/backend

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
