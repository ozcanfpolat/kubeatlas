# ============================================
# KubeAtlas Backend Dockerfile
# Multi-stage build for optimized image
# ============================================

# Stage 1: Build
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=$(git describe --tags --always --dirty 2>/dev/null || echo 'dev')" \
    -o /app/kubeatlas \
    ./cmd/api

# Stage 2: Runtime
FROM alpine:3.23

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 -S kubeatlas && \
    adduser -u 1000 -S kubeatlas -G kubeatlas

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/kubeatlas /app/kubeatlas

# Copy migrations
COPY --from=builder /app/internal/database/migrations /app/migrations

# Create data directory
RUN mkdir -p /app/data && chown -R kubeatlas:kubeatlas /app

# Switch to non-root user
USER kubeatlas

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["/app/kubeatlas"]
