# KubeAtlas - OpenShift Kurulum Rehberi

Bu rehber, KubeAtlas'ı OpenShift Container Platform üzerinde kurmanızı adım adım açıklar.

## Gereksinimler

### Minimum Gereksinimler

| Bileşen | Minimum | Önerilen |
|---------|---------|----------|
| OpenShift | 4.12+ | 4.14+ |
| CPU | 2 vCPU | 4 vCPU |
| Memory | 4 GB | 8 GB |
| Storage | 50 GB | 100 GB |

### Araçlar

- `oc` CLI (OpenShift CLI)
- `helm` 3.x
- `kubectl` (opsiyonel)

### Erişim Yetkileri

- `cluster-admin` veya namespace admin yetkisi
- Storage class oluşturma/kullanma yetkisi

---

## Kurulum Adımları

### Adım 1: OpenShift'e Giriş

```bash
# OpenShift'e giriş yap
oc login https://api.ocp.example.com:6443 -u admin

# Doğrula
oc whoami
# admin

oc whoami --show-server
# https://api.ocp.example.com:6443
```

### Adım 2: Namespace Oluştur

```bash
# KubeAtlas için namespace oluştur
oc new-project kubeatlas

# veya
oc create namespace kubeatlas
oc project kubeatlas
```

### Adım 3: Storage Class Kontrolü

```bash
# Mevcut storage class'ları listele
oc get storageclass

# ODF (OpenShift Data Foundation) kullanıyorsanız:
# - Block storage: ocs-storagecluster-ceph-rbd
# - File storage (RWX): ocs-storagecluster-cephfs

# NFS kullanıyorsanız:
# - nfs-client veya managed-nfs-storage
```

### Adım 4: Secret'ları Oluştur

```bash
# Database şifresi (güçlü bir şifre kullanın)
DB_PASSWORD=$(openssl rand -base64 24)

# JWT secret (API authentication için)
JWT_SECRET=$(openssl rand -base64 32)

# Encryption key (sensitive data için)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Database secret
oc create secret generic kubeatlas-db-secret \
    --from-literal=postgres-password="$DB_PASSWORD" \
    --from-literal=password="$DB_PASSWORD" \
    -n kubeatlas

# Application secret
oc create secret generic kubeatlas-app-secret \
    --from-literal=jwt-secret="$JWT_SECRET" \
    --from-literal=encryption-key="$ENCRYPTION_KEY" \
    -n kubeatlas

# Şifreleri kaydet (güvenli bir yerde saklayın!)
echo "DB_PASSWORD: $DB_PASSWORD"
echo "JWT_SECRET: $JWT_SECRET"
echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
```

### Adım 5: PostgreSQL Kur

```bash
# Bitnami Helm repo ekle
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# PostgreSQL kur
helm install postgresql bitnami/postgresql \
    --namespace kubeatlas \
    --set auth.database=kubeatlas \
    --set auth.username=kubeatlas \
    --set auth.existingSecret=kubeatlas-db-secret \
    --set auth.secretKeys.adminPasswordKey=postgres-password \
    --set auth.secretKeys.userPasswordKey=password \
    --set primary.persistence.enabled=true \
    --set primary.persistence.size=20Gi \
    --set primary.persistence.storageClass="ocs-storagecluster-ceph-rbd" \
    --set primary.podSecurityContext.enabled=false \
    --set primary.containerSecurityContext.enabled=false \
    --wait

# PostgreSQL'in hazır olmasını bekle
oc wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n kubeatlas --timeout=300s
```

### Adım 6: Database'i Hazırla

```bash
# Schema'yı uygula
oc exec -i postgresql-0 -n kubeatlas -- psql -U kubeatlas -d kubeatlas << 'EOSQL'
-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    role VARCHAR(20) DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, email)
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES teams(id),
    team_type VARCHAR(50) DEFAULT 'team',
    contact_email VARCHAR(255),
    contact_slack VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, slug)
);

-- Business Units
CREATE TABLE IF NOT EXISTS business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    director_name VARCHAR(255),
    director_email VARCHAR(255),
    cost_center VARCHAR(100),
    parent_id UUID REFERENCES business_units(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, code)
);

-- Clusters
CREATE TABLE IF NOT EXISTS clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    api_server_url VARCHAR(512) NOT NULL,
    cluster_type VARCHAR(50) NOT NULL,
    version VARCHAR(50),
    platform VARCHAR(100),
    region VARCHAR(100),
    environment VARCHAR(50) NOT NULL,
    auth_method VARCHAR(50) DEFAULT 'serviceaccount',
    kubeconfig_encrypted BYTEA,
    service_account_token_encrypted BYTEA,
    skip_tls_verify BOOLEAN DEFAULT false,
    owner_team_id UUID REFERENCES teams(id),
    responsible_user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    node_count INTEGER DEFAULT 0,
    namespace_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- Namespaces
CREATE TABLE IF NOT EXISTS namespaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    cluster_id UUID NOT NULL REFERENCES clusters(id),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    environment VARCHAR(50),
    criticality VARCHAR(20) DEFAULT 'tier-3',
    infrastructure_owner_team_id UUID REFERENCES teams(id),
    infrastructure_owner_user_id UUID REFERENCES users(id),
    business_unit_id UUID REFERENCES business_units(id),
    application_manager_name VARCHAR(255),
    application_manager_email VARCHAR(255),
    application_manager_phone VARCHAR(50),
    technical_lead_name VARCHAR(255),
    technical_lead_email VARCHAR(255),
    project_manager_name VARCHAR(255),
    project_manager_email VARCHAR(255),
    sla_availability VARCHAR(20),
    sla_rto VARCHAR(50),
    sla_rpo VARCHAR(50),
    support_hours VARCHAR(100),
    escalation_path TEXT,
    status VARCHAR(50) DEFAULT 'active',
    discovered_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    k8s_uid VARCHAR(255),
    k8s_labels JSONB DEFAULT '{}',
    k8s_annotations JSONB DEFAULT '{}',
    k8s_created_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(cluster_id, name)
);

-- Document Categories
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    namespace_id UUID REFERENCES namespaces(id),
    cluster_id UUID REFERENCES clusters(id),
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64),
    category_id UUID REFERENCES document_categories(id),
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Internal Dependencies
CREATE TABLE IF NOT EXISTS internal_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    source_namespace_id UUID NOT NULL REFERENCES namespaces(id),
    source_resource_type VARCHAR(50),
    source_resource_name VARCHAR(255),
    target_namespace_id UUID NOT NULL REFERENCES namespaces(id),
    target_resource_type VARCHAR(50),
    target_resource_name VARCHAR(255),
    dependency_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_critical BOOLEAN DEFAULT false,
    is_auto_discovered BOOLEAN DEFAULT false,
    discovery_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- External Dependencies
CREATE TABLE IF NOT EXISTS external_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    namespace_id UUID NOT NULL REFERENCES namespaces(id),
    name VARCHAR(255) NOT NULL,
    system_type VARCHAR(50) NOT NULL,
    provider VARCHAR(255),
    endpoint VARCHAR(512),
    description TEXT,
    is_critical BOOLEAN DEFAULT false,
    expected_availability VARCHAR(20),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    documentation_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_ip VARCHAR(45),
    user_agent TEXT,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    resource_name VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_clusters_org ON clusters(organization_id);
CREATE INDEX IF NOT EXISTS idx_namespaces_cluster ON namespaces(cluster_id);
CREATE INDEX IF NOT EXISTS idx_namespaces_org ON namespaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
EOSQL

# Seed data'yı uygula
oc exec -i postgresql-0 -n kubeatlas -- psql -U kubeatlas -d kubeatlas << 'EOSQL'
-- Default Organization
INSERT INTO organizations (id, name, slug, settings) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'default',
    '{"theme": "dark"}'
) ON CONFLICT (id) DO NOTHING;

-- Admin User (password: admin123)
INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@kubeatlas.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqKnBBmMQ/UYXF1VLZ1tBbXKJVdCy',
    'System Administrator',
    'admin',
    true
) ON CONFLICT (id) DO NOTHING;

-- Document Categories
INSERT INTO document_categories (id, organization_id, name, slug, description, color, icon, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000030', NULL, 'Architecture', 'architecture', 'Architecture diagrams', '#3b82f6', 'layout', 1),
    ('00000000-0000-0000-0000-000000000031', NULL, 'Runbook', 'runbook', 'Operational runbooks', '#22c55e', 'book-open', 2),
    ('00000000-0000-0000-0000-000000000032', NULL, 'SLA', 'sla', 'Service Level Agreements', '#ef4444', 'file-check', 3),
    ('00000000-0000-0000-0000-000000000033', NULL, 'API Documentation', 'api-docs', 'API specifications', '#8b5cf6', 'code', 4),
    ('00000000-0000-0000-0000-000000000034', NULL, 'Security', 'security', 'Security policies', '#f97316', 'shield', 5),
    ('00000000-0000-0000-0000-000000000035', NULL, 'Other', 'other', 'Other documents', '#6b7280', 'file', 99)
ON CONFLICT (id) DO NOTHING;
EOSQL

echo "Database initialized!"
```

### Adım 7: Image Build (veya Pull)

**Option A: Hazır Image Kullan (önerilen)**
```bash
# Quay.io veya Docker Hub'dan pull
# (Henüz publish edilmedi - local build yapın)
```

**Option B: Local Build**
```bash
# Backend build
cd backend
podman build -t kubeatlas-api:1.0.0 .

# Frontend build
cd ../frontend
podman build -t kubeatlas-ui:1.0.0 .

# Internal registry'ye push
oc registry login
podman tag kubeatlas-api:1.0.0 image-registry.openshift-image-registry.svc:5000/kubeatlas/kubeatlas-api:1.0.0
podman push image-registry.openshift-image-registry.svc:5000/kubeatlas/kubeatlas-api:1.0.0

podman tag kubeatlas-ui:1.0.0 image-registry.openshift-image-registry.svc:5000/kubeatlas/kubeatlas-ui:1.0.0
podman push image-registry.openshift-image-registry.svc:5000/kubeatlas/kubeatlas-ui:1.0.0
```

### Adım 8: KubeAtlas Deploy

```bash
# API Deployment
cat << 'EOF' | oc apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubeatlas-api
  namespace: kubeatlas
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kubeatlas-api
  template:
    metadata:
      labels:
        app: kubeatlas-api
    spec:
      containers:
        - name: api
          image: image-registry.openshift-image-registry.svc:5000/kubeatlas/kubeatlas-api:1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_HOST
              value: "postgresql.kubeatlas.svc.cluster.local"
            - name: DATABASE_PORT
              value: "5432"
            - name: DATABASE_NAME
              value: "kubeatlas"
            - name: DATABASE_USER
              value: "kubeatlas"
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: kubeatlas-db-secret
                  key: password
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: kubeatlas-app-secret
                  key: jwt-secret
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: kubeatlas-app-secret
                  key: encryption-key
            - name: GIN_MODE
              value: "release"
            - name: LOG_LEVEL
              value: "info"
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: kubeatlas-api
  namespace: kubeatlas
spec:
  selector:
    app: kubeatlas-api
  ports:
    - port: 8080
      targetPort: 8080
EOF

# UI Deployment
cat << 'EOF' | oc apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubeatlas-ui
  namespace: kubeatlas
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kubeatlas-ui
  template:
    metadata:
      labels:
        app: kubeatlas-ui
    spec:
      containers:
        - name: ui
          image: image-registry.openshift-image-registry.svc:5000/kubeatlas/kubeatlas-ui:1.0.0
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: kubeatlas-ui
  namespace: kubeatlas
spec:
  selector:
    app: kubeatlas-ui
  ports:
    - port: 80
      targetPort: 80
EOF
```

### Adım 9: Route Oluştur

```bash
# OpenShift Route
oc create route edge kubeatlas \
    --service=kubeatlas-ui \
    --port=80 \
    --insecure-policy=Redirect \
    -n kubeatlas

# Route URL'ini al
ROUTE_URL=$(oc get route kubeatlas -n kubeatlas -o jsonpath='{.spec.host}')
echo "KubeAtlas URL: https://$ROUTE_URL"
```

### Adım 10: Doğrulama

```bash
# Pod'ları kontrol et
oc get pods -n kubeatlas

# Beklenen çıktı:
# NAME                             READY   STATUS    RESTARTS   AGE
# kubeatlas-api-xxx-yyy            1/1     Running   0          1m
# kubeatlas-api-xxx-zzz            1/1     Running   0          1m
# kubeatlas-ui-xxx-yyy             1/1     Running   0          1m
# kubeatlas-ui-xxx-zzz             1/1     Running   0          1m
# postgresql-0                     1/1     Running   0          5m

# Logları kontrol et
oc logs -f deployment/kubeatlas-api -n kubeatlas

# Route'u kontrol et
oc get route kubeatlas -n kubeatlas
```

---

## İlk Giriş ve Cluster Ekleme

### 1. Web UI'a Giriş

```
URL: https://kubeatlas.apps.ocp.example.com
Email: admin@kubeatlas.local
Password: admin123
```

**⚠️ İlk iş olarak admin şifresini değiştirin!**

### 2. Self Cluster Ekleme (KubeAtlas'ın Çalıştığı Cluster)

```bash
# Agent'ı kur
oc apply -f - << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: kubeatlas-agent
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubeatlas-agent
  namespace: kubeatlas-agent
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubeatlas-agent
rules:
  - apiGroups: [""]
    resources: ["namespaces", "nodes", "pods", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]
  - nonResourceURLs: ["/version"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubeatlas-agent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kubeatlas-agent
subjects:
  - kind: ServiceAccount
    name: kubeatlas-agent
    namespace: kubeatlas-agent
---
apiVersion: v1
kind: Secret
metadata:
  name: kubeatlas-agent-token
  namespace: kubeatlas-agent
  annotations:
    kubernetes.io/service-account.name: kubeatlas-agent
type: kubernetes.io/service-account-token
EOF

# Token'ı al
TOKEN=$(oc get secret kubeatlas-agent-token -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d)
echo "Token: $TOKEN"

# API Server URL
API_URL=$(oc whoami --show-server)
echo "API URL: $API_URL"
```

### 3. UI'da Cluster Ekle

1. Sol menü → **Clusters** → **Add Cluster**
2. Form:
   - Name: `ocp-production`
   - Display Name: `Production OpenShift`
   - Cluster Type: `openshift`
   - Environment: `production`
   - API Server URL: `https://api.ocp.example.com:6443`
   - Auth Method: `Service Account Token`
   - Token: (yukarıdan aldığınız token)
   - Skip TLS Verify: ❌ (false)
3. **Test Connection** → Başarılı
4. **Create**

### 4. Namespace'leri Senkronize Et

1. Eklenen cluster'ın detayına git
2. **Sync Now** butonuna tıkla
3. Namespace'ler listelenecek

---

## Sonraki Adımlar

1. ✅ Admin şifresini değiştirin
2. ✅ Self cluster'ı ekleyin
3. 📝 Namespace'lere sahip atayın
4. 📝 Dependency'leri tanımlayın
5. 📝 Dokümanları yükleyin
6. 📝 Diğer cluster'ları ekleyin

---

## Sorun Giderme

### Pod CrashLoopBackOff

```bash
# Logları kontrol et
oc logs deployment/kubeatlas-api -n kubeatlas --previous
```

### Database Bağlantı Hatası

```bash
# PostgreSQL'e bağlanabildiğini test et
oc exec -it deployment/kubeatlas-api -n kubeatlas -- \
  nc -zv postgresql.kubeatlas.svc.cluster.local 5432
```

### Route Erişilemiyor

```bash
# Route durumunu kontrol et
oc describe route kubeatlas -n kubeatlas

# Service'i kontrol et
oc get svc -n kubeatlas

# Pod'ların endpoint'e eklendiğini kontrol et
oc get endpoints kubeatlas-ui -n kubeatlas
```
