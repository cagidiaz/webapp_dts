# =============================================
# Frontend — Multistage Docker Build
# Stage 1: Build React app with Vite
# Stage 2: Serve static files with Nginx
# =============================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: redirect all routes to index.html
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
