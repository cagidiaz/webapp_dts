# =============================================
# Backend — Multistage Docker Build
# Stage 1: Build NestJS app
# Stage 2: Run with minimal Node.js image
# =============================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Stage 2: Run ---
FROM node:22-alpine AS runner
WORKDIR /app

# Copy only production dependencies + built app
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production --legacy-peer-deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
