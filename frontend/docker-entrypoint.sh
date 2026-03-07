#!/bin/sh
set -e

# Default backend host if not set
export BACKEND_HOST=${BACKEND_HOST:-kubeatlas-api}

echo "Starting KubeAtlas UI..."
echo "Backend host: $BACKEND_HOST"

# Generate nginx config from template
envsubst '${BACKEND_HOST}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf

# Start nginx with the generated config
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
