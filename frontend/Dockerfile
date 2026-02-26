# ============================================
# KubeAtlas Frontend Dockerfile
# Multi-stage build with nginx
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
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

# Build arguments for environment
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1000 -S kubeatlas && \
    adduser -u 1000 -S kubeatlas -G kubeatlas && \
    chown -R kubeatlas:kubeatlas /usr/share/nginx/html && \
    chown -R kubeatlas:kubeatlas /var/cache/nginx && \
    chown -R kubeatlas:kubeatlas /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R kubeatlas:kubeatlas /var/run/nginx.pid

# Switch to non-root user
USER kubeatlas

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
