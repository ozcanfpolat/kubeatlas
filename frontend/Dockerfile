# ============================================
# KubeAtlas Frontend Dockerfile
# Multi-stage build with nginx (OpenShift compatible)
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else npm install; \
    fi

# Copy source code
COPY . .

# Build the application
# API URL is /api - nginx will proxy to backend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Production with unprivileged nginx
FROM nginxinc/nginx-unprivileged:alpine

# Switch to root temporarily to set up files
USER root

# Install envsubst (part of gettext)
RUN apk add --no-cache gettext

# Copy nginx config template
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create required directories with proper permissions
RUN mkdir -p /tmp/client_body /tmp/proxy /tmp/fastcgi /tmp/uwsgi /tmp/scgi && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /tmp && \
    chown -R nginx:nginx /etc/nginx

# Switch to non-root user
USER nginx

# Expose port 8080 (non-privileged)
EXPOSE 8080

# Environment variables
ENV BACKEND_HOST=kubeatlas-api

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start nginx via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
