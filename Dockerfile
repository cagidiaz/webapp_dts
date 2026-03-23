# ========================================================
# dTS Instruments - Unifed Production Dockerfile
# This builds both Frontend and Backend into a single image.
# NestJS serves the static React files.
# ========================================================

# --- Stage 1: Build Frontend (React + Vite) ---
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ .
# Inject build variables for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
# Connect to the same host's /api
ENV VITE_API_BASE_URL=/api
RUN npm run build

# --- Stage 2: Build Backend (NestJS + Prisma) ---
FROM node:22-alpine AS backend-builder
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY backend/ .
# Prisma generation requires DATABASE_URL to resolve config
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
RUN npm run build

# --- Stage 3: Runner (Production Image) ---
FROM node:22-alpine
WORKDIR /app

# 1. Copy Backend build
COPY --from=backend-builder /build/backend/dist ./backend/dist
COPY --from=backend-builder /build/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /build/backend/package*.json ./backend/
COPY --from=backend-builder /build/backend/prisma ./backend/prisma

# 2. Copy Frontend build into the location NestJS Expects (see app.module.ts)
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# 3. Final entrypoint
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "backend/dist/main.js"]
