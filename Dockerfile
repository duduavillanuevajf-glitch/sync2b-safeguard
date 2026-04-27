# ── Stage 1: dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S safeguard -u 1001 -G nodejs
USER safeguard

COPY --from=deps --chown=safeguard:nodejs /app/node_modules ./node_modules
COPY --chown=safeguard:nodejs . .

EXPOSE 3000

# Health check using Node.js built-in http (no curl dependency)
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/healthz',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
