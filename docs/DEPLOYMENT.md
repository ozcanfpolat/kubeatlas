# KubeAtlas Production Deployment Guide

Bu kılavuz, KubeAtlas'ı production ortamına dağıtmak ve self-signed sertifika ile multi-cluster yapılandırması yapmak için tüm adımları içerir.

## İçindekiler

1. [Ön Gereksinimler](#ön-gereksinimler)
2. [Deployment Seçenekleri](#deployment-seçenekleri)
3. [Kubernetes/Helm ile Deployment](#kuberneteshelm-ile-deployment)
4. [Docker Compose ile Deployment](#docker-compose-ile-deployment)
5. [Self-Signed Sertifika Kurulumu](#self-signed-sertifika-kurulumu)
6. [Multi-Cluster Yapılandırması](#multi-cluster-yapılandırması)
7. [Güvenlik Yapılandırması](#güvenlik-yapılandırması)
8. [Yedekleme ve Recovery](#yedekleme-ve-recovery)
9. [Monitoring](#monitoring)

---

## Ön Gereksinimler

### Minimum Sistem Gereksinimleri

| Bileşen | CPU | RAM | Disk |
|---------|-----|-----|------|
| API Server | 2 core | 2 GB | 10 GB |
| Frontend | 1 core | 512 MB | 1 GB |
| PostgreSQL | 2 core | 2 GB | 20 GB |
| Redis (opsiyonel) | 1 core | 512 MB | 5 GB |

### Gerekli Araçlar

```bash
# Kubernetes deployment için
kubectl version --client  # v1.28+
helm version              # v3.12+

# Docker Compose deployment için
docker --version          # v24+
docker-compose --version  # v2.20+
```

---

## Deployment Seçenekleri

### A) Kubernetes + Helm (Önerilen)
- Production-grade
- High availability
- Auto-scaling
- Self-healing

### B) Docker Compose
- Basit kurulum
- Tek sunucu
- Geliştirme/test ortamları

---

## Kubernetes/Helm ile Deployment

### 1. Namespace Oluşturma

```bash
kubectl create namespace kubeatlas
```

### 2. Secrets Oluşturma

```bash
# JWT Secret (32+ karakter)
JWT_SECRET=$(openssl rand -hex 32)

# Encryption Key (hassas verilerin şifrelenmesi için)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Database Password
DB_PASSWORD=$(openssl rand -base64 24)

# Secrets oluştur
kubectl create secret generic kubeatlas-secrets \
  --namespace kubeatlas \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=encryption-key="${ENCRYPTION_KEY}" \
  --from-literal=db-password="${DB_PASSWORD}"
```

### 3. Self-Signed TLS Sertifikası Oluşturma

```bash
# CA oluştur
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=KubeAtlas CA/O=YourOrganization"

# Server sertifikası oluştur
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
  -subj "/CN=kubeatlas.example.com/O=YourOrganization"

# SAN (Subject Alternative Names) ile imzala
cat > san.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = kubeatlas.example.com
DNS.2 = kubeatlas.local
DNS.3 = localhost
IP.1 = 10.0.0.100
EOF

openssl x509 -req -days 365 -in server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -extfile san.cnf -extensions v3_req

# Kubernetes secret olarak yükle
kubectl create secret tls kubeatlas-tls \
  --namespace kubeatlas \
  --cert=server.crt \
  --key=server.key
```

### 4. Helm Values Dosyası Oluşturma

```yaml
# values-production.yaml
global:
  domain: kubeatlas.example.com
  tls:
    enabled: true
    secretName: kubeatlas-tls

api:
  replicaCount: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10

ui:
  replicaCount: 2

postgresql:
  enabled: true
  auth:
    existingSecret: kubeatlas-secrets
    secretKeys:
      adminPasswordKey: db-password
      userPasswordKey: db-password
  primary:
    persistence:
      size: 50Gi

auth:
  jwt:
    existingSecret: kubeatlas-secrets
    secretKey: jwt-secret

encryption:
  existingSecret: kubeatlas-secrets
  secretKey: encryption-key

ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
  hosts:
    - host: kubeatlas.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubeatlas-tls
      hosts:
        - kubeatlas.example.com
```

### 5. Helm ile Deploy

```bash
# Repo ekle (eğer yayınlandıysa)
helm repo add kubeatlas https://charts.kubeatlas.io
helm repo update

# Veya local chart ile
cd helm/kubeatlas

# Deploy
helm upgrade --install kubeatlas . \
  --namespace kubeatlas \
  --values values-production.yaml \
  --wait --timeout 10m
```

### 6. Deployment Doğrulama

```bash
# Pod durumlarını kontrol et
kubectl get pods -n kubeatlas

# Logları kontrol et
kubectl logs -n kubeatlas -l app.kubernetes.io/component=api -f

# Health check
kubectl port-forward -n kubeatlas svc/kubeatlas-api 8080:8080
curl http://localhost:8080/health
```

---

## Docker Compose ile Deployment

### 1. Environment Dosyası Oluşturma

```bash
# .env dosyası oluştur
cat > .env << 'EOF'
# Version
VERSION=1.0.0

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=kubeatlas
DB_PASSWORD=$(openssl rand -base64 24)
DB_NAME=kubeatlas
DB_SSLMODE=prefer

# JWT (minimum 32 karakter)
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRATION_HOURS=24

# Encryption (hassas verilerin şifrelenmesi)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# CORS
CORS_ORIGINS=https://kubeatlas.example.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF
```

### 2. SSL Sertifikası Oluşturma

```bash
mkdir -p docker/ssl
cd docker/ssl

# Self-signed sertifika oluştur
openssl req -x509 -nodes -days 365 \
  -newkey rsa:4096 \
  -keyout server.key \
  -out server.crt \
  -subj "/CN=kubeatlas.example.com/O=YourOrganization" \
  -addext "subjectAltName=DNS:kubeatlas.example.com,DNS:localhost,IP:127.0.0.1"

cd ../..
```

### 3. Nginx Yapılandırması

```nginx
# docker/nginx.conf
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name kubeatlas.example.com;

        ssl_certificate /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API
        location /api/ {
            proxy_pass http://backend:8080/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check
        location /health {
            proxy_pass http://backend:8080/health;
        }
    }
}
```

### 4. Deploy

```bash
# Production modunda başlat
docker-compose -f docker-compose.prod.yml up -d

# Migration çalıştır
docker-compose -f docker-compose.prod.yml --profile migrate up migrate

# Logları kontrol et
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## Multi-Cluster Yapılandırması

KubeAtlas'ı bir cluster'a kurduktan sonra, diğer cluster'larınızı eklemek için aşağıdaki adımları izleyin:

### 1. Hedef Cluster'da ServiceAccount Oluşturma

Her eklemek istediğiniz cluster'da aşağıdaki RBAC yapılandırmasını uygulayın:

```yaml
# kubeatlas-rbac.yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: kubeatlas-agent

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubeatlas-reader
  namespace: kubeatlas-agent

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubeatlas-reader
rules:
  # Namespace okuma
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  
  # Node bilgileri
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  
  # Pod bilgileri (opsiyonel - detaylı inventory için)
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  
  # Deployment/StatefulSet bilgileri
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["get", "list", "watch"]
  
  # Network bilgileri
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubeatlas-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kubeatlas-reader
subjects:
  - kind: ServiceAccount
    name: kubeatlas-reader
    namespace: kubeatlas-agent

---
# Long-lived token için Secret (Kubernetes 1.24+)
apiVersion: v1
kind: Secret
metadata:
  name: kubeatlas-reader-token
  namespace: kubeatlas-agent
  annotations:
    kubernetes.io/service-account.name: kubeatlas-reader
type: kubernetes.io/service-account-token
```

Uygula:
```bash
kubectl apply -f kubeatlas-rbac.yaml
```

### 2. Token ve CA Sertifikası Alma

```bash
# Token'ı al
TOKEN=$(kubectl get secret kubeatlas-reader-token -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d)
echo "Token: $TOKEN"

# CA sertifikasını al
CA_CERT=$(kubectl get secret kubeatlas-reader-token -n kubeatlas-agent -o jsonpath='{.data.ca\.crt}')
echo "CA Certificate (base64): $CA_CERT"

# API Server URL
API_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
echo "API Server: $API_SERVER"
```

### 3. KubeAtlas UI'dan Cluster Ekleme

1. KubeAtlas web arayüzüne giriş yapın
2. **Clusters** > **Add Cluster** butonuna tıklayın
3. Formu doldurun:
   - **Name**: cluster-prod-01
   - **Display Name**: Production Cluster 01
   - **API Server URL**: https://kubernetes.example.com:6443
   - **Cluster Type**: Kubernetes
   - **Environment**: Production
   - **Authentication**: Service Account Token
   - **Token**: (Yukarıda aldığınız token)
   - **CA Certificate**: (Base64 encoded CA sertifikası)
   - **Skip TLS Verify**: ❌ (Self-signed sertifika varsa CA yükleyin)

### 4. API ile Cluster Ekleme

```bash
# API ile cluster ekle
curl -X POST https://kubeatlas.example.com/api/v1/clusters \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cluster-prod-01",
    "display_name": "Production Cluster 01",
    "api_server_url": "https://kubernetes.example.com:6443",
    "cluster_type": "kubernetes",
    "environment": "production",
    "auth_method": "serviceaccount",
    "service_account_token": "'"${TOKEN}"'",
    "ca_certificate": "'"${CA_CERT}"'",
    "skip_tls_verify": false
  }'
```

---

## Güvenlik Yapılandırması

### 1. Network Policy

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kubeatlas-api
  namespace: kubeatlas
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/component: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Database
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Kubernetes API (cluster bağlantıları için)
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 6443
```

### 2. Pod Security Standards

```yaml
# pod-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kubeatlas
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 3. Secret Rotation

```bash
# JWT Secret rotation
NEW_JWT_SECRET=$(openssl rand -hex 32)
kubectl patch secret kubeatlas-secrets -n kubeatlas \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/jwt-secret", "value": "'$(echo -n $NEW_JWT_SECRET | base64)'"}]'

# Rolling restart
kubectl rollout restart deployment/kubeatlas-api -n kubeatlas
```

---

## Yedekleme ve Recovery

### PostgreSQL Backup

```bash
# Manuel backup
kubectl exec -n kubeatlas kubeatlas-postgresql-0 -- \
  pg_dump -U kubeatlas kubeatlas > backup-$(date +%Y%m%d).sql

# Otomatik backup cronjob
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kubeatlas-backup
  namespace: kubeatlas
spec:
  schedule: "0 2 * * *"  # Her gün 02:00
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15-alpine
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h kubeatlas-postgresql -U kubeatlas kubeatlas | \
                  gzip > /backups/kubeatlas-\$(date +%Y%m%d-%H%M%S).sql.gz
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: kubeatlas-secrets
                      key: db-password
              volumeMounts:
                - name: backups
                  mountPath: /backups
          volumes:
            - name: backups
              persistentVolumeClaim:
                claimName: kubeatlas-backups
          restartPolicy: OnFailure
EOF
```

### Recovery

```bash
# Backup'tan restore
kubectl exec -i kubeatlas-postgresql-0 -n kubeatlas -- \
  psql -U kubeatlas kubeatlas < backup-20240101.sql
```

---

## Monitoring

### Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubeatlas
  namespace: kubeatlas
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: kubeatlas
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

### Önemli Metrikler

- `kubeatlas_clusters_total` - Toplam cluster sayısı
- `kubeatlas_namespaces_total` - Toplam namespace sayısı
- `kubeatlas_sync_duration_seconds` - Sync süresi
- `kubeatlas_api_requests_total` - API istek sayısı
- `kubeatlas_api_request_duration_seconds` - API yanıt süresi

---

## Sorun Giderme

### Cluster Bağlantı Hataları

```bash
# API loglarını kontrol et
kubectl logs -n kubeatlas -l app.kubernetes.io/component=api --tail=100

# Network bağlantısını test et
kubectl exec -n kubeatlas deployment/kubeatlas-api -- \
  curl -k https://TARGET_CLUSTER_API:6443/healthz
```

### Database Bağlantı Sorunları

```bash
# Database pod durumu
kubectl get pods -n kubeatlas -l app.kubernetes.io/name=postgresql

# Bağlantı testi
kubectl exec -n kubeatlas deployment/kubeatlas-api -- \
  pg_isready -h kubeatlas-postgresql -U kubeatlas
```

### TLS/Sertifika Sorunları

```bash
# Sertifika bilgilerini kontrol et
kubectl get secret kubeatlas-tls -n kubeatlas -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout

# Sertifika süresini kontrol et
kubectl get secret kubeatlas-tls -n kubeatlas -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -enddate -noout
```

---

## Destek

Sorularınız için:
- GitHub Issues: https://github.com/kubeatlas/kubeatlas/issues
- Documentation: https://docs.kubeatlas.io
