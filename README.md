<div align="center">

<h1>☸️ KubeAtlas</h1>

<p><strong>Kubernetes Inventory & Governance Platform</strong></p>

<p>
  <a href="https://github.com/ozcanfpolat/kubeatlas/actions/workflows/ci.yml">
    <img src="https://github.com/ozcanfpolat/kubeatlas/actions/workflows/ci.yml/badge.svg" alt="CI/CD">
  </a>
  <a href="https://github.com/ozcanfpolat/kubeatlas/releases">
    <img src="https://img.shields.io/github/v/release/ozcanfpolat/kubeatlas" alt="Release">
  </a>
  <a href="https://github.com/ozcanfpolat/kubeatlas/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
  </a>
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white" alt="React">
</p>

<p>
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-screenshots">Screenshots</a>
</p>

</div>

---

## 📖 Overview

**KubeAtlas** is a comprehensive governance platform designed to bring clarity and ownership visibility to Kubernetes/OpenShift estates. Unlike observability tools that focus on metrics and logs, KubeAtlas centers on **operational ownership**, **accountability**, and **governance**.

### The Problem

Managing multiple Kubernetes clusters across different teams and environments often leads to:

| Challenge | Impact |
|-----------|--------|
| 🔍 Unknown ownership | "Who owns this namespace?" |
| 📋 Missing documentation | "Where are the runbooks?" |
| 🔗 Hidden dependencies | "What breaks if this changes?" |
| 📊 No governance visibility | "Are we compliant?" |

### The Solution

KubeAtlas provides a **central source of truth** for all your Kubernetes resources with:

- **Ownership tracking** at namespace, team, and business unit levels
- **Dependency mapping** for internal and external services
- **Document management** for runbooks, SLAs, and architecture docs
- **Complete audit trail** of all changes
- **Multi-cluster support** with auto-discovery
- **LDAP/SSO integration** for enterprise authentication

---

## ✨ Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **📊 Dashboard** | Real-time overview of clusters, namespaces, ownership coverage |
| **🔐 Ownership Management** | Track owners, teams, and business units |
| **📦 Cluster Inventory** | Multi-cluster support with auto-discovery |
| **🔗 Dependency Mapping** | Visualize internal & external dependencies |
| **📄 Document Management** | Centralize runbooks, SLAs, architecture docs |
| **📝 Audit Trail** | Complete history of all changes |
| **🌍 Multi-language** | English and Turkish UI support |
| **🎨 Theme Support** | Light, dark, and system themes |

### Enterprise Features

| Feature | Description |
|---------|-------------|
| **🔒 LDAP/Active Directory** | Enterprise SSO with group-based roles |
| **👥 Role-Based Access** | Admin, Editor, Viewer roles |
| **📊 Reports & Export** | Excel export for compliance reporting |
| **🔐 Encryption** | AES-256-GCM for sensitive data |

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### One-Command Start

```bash
# Clone repository
git clone https://github.com/ozcanfpolat/kubeatlas.git
cd kubeatlas

# Create environment file
cp .env.example .env

# Generate secure secrets
sed -i "s/CHANGE_ME_secure_password_here/$(openssl rand -base64 16)/g" .env
sed -i "s/CHANGE_ME_generate_with_openssl_rand_base64_32/$(openssl rand -base64 32)/g" .env
sed -i "s/CHANGE_ME_generate_with_openssl_rand_hex_32/$(openssl rand -hex 32)/g" .env

# Start with database
docker-compose --profile with-db up -d

# Wait for services to be ready
sleep 30

# Access the application
echo "Open: http://localhost"
echo "Login: admin@kubeatlas.local / admin123"
```

---

## 📦 Installation

### Option 1: Kubernetes (Helm) - Recommended

```bash
# Add Helm repository
helm repo add kubeatlas https://ozcanfpolat.github.io/kubeatlas
helm repo update

# Create namespace
kubectl create namespace kubeatlas

# Create secrets
kubectl create secret generic kubeatlas-secrets \
  --namespace kubeatlas \
  --from-literal=DB_PASSWORD='your-secure-password' \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=ENCRYPTION_KEY=$(openssl rand -hex 32)

# Install with PostgreSQL
helm install kubeatlas kubeatlas/kubeatlas \
  --namespace kubeatlas \
  --set postgresql.enabled=true \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=kubeatlas.example.com

# Get the URL
kubectl get ingress -n kubeatlas
```

<details>
<summary>📋 Custom values.yaml example</summary>

```yaml
# values.yaml
replicaCount: 2

image:
  api:
    repository: ghcr.io/ozcanfpolat/kubeatlas-api
    tag: latest
  ui:
    repository: ghcr.io/ozcanfpolat/kubeatlas-ui
    tag: latest

postgresql:
  enabled: true
  auth:
    database: kubeatlas
    username: kubeatlas

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: kubeatlas.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubeatlas-tls
      hosts:
        - kubeatlas.example.com

resources:
  api:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

</details>

### Option 2: Docker Compose

```bash
# Clone repository
git clone https://github.com/ozcanfpolat/kubeatlas.git
cd kubeatlas

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start services
docker-compose --profile with-db up -d

# View logs
docker-compose logs -f
```

### Option 3: OpenShift

```bash
# Create project
oc new-project kubeatlas

# Create GitHub registry secret
oc create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN

# Create application secrets
oc create secret generic kubeatlas-secrets \
  --from-literal=DB_PASSWORD='your-password' \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=ENCRYPTION_KEY=$(openssl rand -hex 32)

# Install PostgreSQL (Bitnami Helm chart)
helm install kubeatlas-db bitnami/postgresql \
  --set auth.username=kubeatlas \
  --set auth.password=YOUR_PASSWORD \
  --set auth.database=kubeatlas

# Deploy KubeAtlas
oc apply -f deploy/openshift/manual-install.yaml

# Get route URL
oc get route kubeatlas -o jsonpath='{.spec.host}'
```

---

## 🔐 Authentication

### Default Credentials

After installation, login with:

| Field | Value |
|-------|-------|
| Email | `admin@kubeatlas.local` |
| Password | `admin123` |

> ⚠️ **Change the default password immediately after first login!**

### LDAP / Active Directory Integration

KubeAtlas supports enterprise LDAP authentication with automatic role mapping:

1. Navigate to **Settings → LDAP**
2. Configure your LDAP server:

| Setting | Example |
|---------|---------|
| Server URL | `ldaps://ldap.example.com:636` |
| Bind DN | `cn=service,ou=services,dc=example,dc=com` |
| Search Base | `ou=users,dc=example,dc=com` |
| Search Filter | `(uid={username})` |

3. Configure group-to-role mapping:

| LDAP Group | KubeAtlas Role |
|------------|----------------|
| `kubeatlas-admins` | Admin |
| `kubeatlas-editors` | Editor |
| `kubeatlas-viewers` | Viewer |

4. Click **Test Connection** then **Save**

Users authenticating via LDAP are automatically synced to the local database with roles determined by group membership.

### Role Permissions

| Role | Read | Create/Update | Delete | Admin |
|------|------|---------------|--------|-------|
| **Viewer** | ✅ | ❌ | ❌ | ❌ |
| **Editor** | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |

---

## 🔗 Adding Kubernetes Clusters

### Step 1: Create Service Account in Target Cluster

```bash
# Create namespace and service account
kubectl apply -f - <<EOF
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
  name: kubeatlas-reader
rules:
- apiGroups: [""]
  resources: ["namespaces", "pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
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
```

### Step 2: Get Credentials

```bash
# Get token
TOKEN=$(kubectl get secret kubeatlas-agent-token -n kubeatlas-agent \
  -o jsonpath='{.data.token}' | base64 -d)
echo "Token: $TOKEN"

# Get API server URL
API_URL=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
echo "API URL: $API_URL"

# Get CA certificate (for self-signed)
kubectl get secret kubeatlas-agent-token -n kubeatlas-agent \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > cluster-ca.crt
```

### Step 3: Add Cluster in KubeAtlas

1. Navigate to **Clusters → Add Cluster**
2. Fill in the form:
   - **Name:** `production-cluster`
   - **API Server URL:** The URL from step 2
   - **Auth Method:** Service Account Token
   - **Token:** The token from step 2
3. Upload CA certificate or enable "Skip TLS Verification" (dev only)
4. Click **Create** then **Sync**

---

## 📁 Project Structure

```
kubeatlas/
├── backend/                    # Go API server
│   ├── cmd/server/            # Application entrypoint
│   └── internal/
│       ├── api/               # HTTP handlers & middleware
│       ├── config/            # Configuration
│       ├── database/          # Database repositories
│       ├── models/            # Data models
│       ├── services/          # Business logic
│       └── k8s/               # Kubernetes client
├── frontend/                   # React TypeScript UI
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── i18n/             # Internationalization
│   │   └── store/            # State management
│   ├── nginx.conf.template   # Nginx configuration
│   └── Dockerfile
├── database/                   # SQL schemas
│   ├── schema.sql            # Database schema
│   └── seed.sql              # Initial data
├── deploy/
│   └── openshift/            # OpenShift manifests
├── helm/kubeatlas/           # Helm chart
├── docker-compose.yml        # Docker Compose config
└── docs/                     # Documentation
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `kubeatlas` |
| `DB_PASSWORD` | Database password | **required** |
| `DB_NAME` | Database name | `kubeatlas` |
| `JWT_SECRET` | JWT signing secret | **required** |
| `JWT_EXPIRATION_HOURS` | Token expiration | `24` |
| `ENCRYPTION_KEY` | AES-256 key (hex) | **required** |
| `STORAGE_LOCAL_PATH` | Upload storage path | `/app/data/uploads` |

### Generating Secrets

```bash
# JWT Secret (base64, 32+ chars)
openssl rand -base64 32

# Encryption Key (hex, 64 chars)
openssl rand -hex 32

# Database Password
openssl rand -base64 16
```

---

## 📸 Screenshots

<details>
<summary>📊 Dashboard</summary>

The main dashboard provides a comprehensive overview:
- Cluster and namespace counts
- Ownership coverage metrics
- Environment distribution chart
- Recent activity feed
- Alerts and warnings

</details>

<details>
<summary>📦 Cluster Management</summary>

- View all connected clusters
- Sync namespaces automatically
- Monitor cluster health
- Manage cluster credentials

</details>

<details>
<summary>🔗 Dependency Visualization</summary>

- Interactive D3.js force-directed graph
- Internal namespace-to-namespace dependencies
- External service dependencies
- Drag-and-drop node positioning

</details>

<details>
<summary>⚙️ Settings</summary>

- User management (create, edit, delete)
- LDAP/Active Directory configuration
- Theme selection (light/dark/system)
- Language preferences (EN/TR)

</details>

---

## 🔒 Security

### Encryption

- All sensitive data (tokens, kubeconfig, passwords) encrypted with **AES-256-GCM**
- Encryption key must be provided via `ENCRYPTION_KEY` environment variable

### Authentication

- JWT-based authentication with configurable expiration
- RBAC with three roles: Admin, Editor, Viewer
- Optional LDAP/Active Directory integration
- Rate limiting on login endpoints

### Best Practices

1. **Never commit secrets** to version control
2. **Use TLS** for all connections in production
3. **Rotate secrets** regularly
4. **Minimal permissions** for Kubernetes service accounts
5. **Enable LDAP** for enterprise deployments

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid/expired token | Regenerate service account token |
| `x509: certificate signed by unknown authority` | Self-signed cert | Upload CA cert or enable skip_tls_verify |
| `connection refused` | Network/firewall | Check network policies |
| Login fails | Password hash issue | Reset password in database |

### Checking Logs

```bash
# Docker Compose
docker-compose logs -f kubeatlas-api
docker-compose logs -f kubeatlas-ui

# Kubernetes
kubectl logs -f deployment/kubeatlas-api -n kubeatlas
kubectl logs -f deployment/kubeatlas-ui -n kubeatlas

# OpenShift
oc logs -f deployment/kubeatlas-api
oc logs -f deployment/kubeatlas-ui
```

### Database Connection Test

```bash
# Docker Compose
docker exec kubeatlas-api nc -zv postgres 5432

# Kubernetes
kubectl exec -it deployment/kubeatlas-api -n kubeatlas -- nc -zv $DB_HOST 5432
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone
git clone https://github.com/ozcanfpolat/kubeatlas.git
cd kubeatlas

# Backend
cd backend
go mod download
go run cmd/server/main.go

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

---

## 📬 Support

- 🐛 **Issues:** [GitHub Issues](https://github.com/ozcanfpolat/kubeatlas/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/ozcanfpolat/kubeatlas/discussions)
- 📧 **Email:** support@kubeatlas.io

---

<p align="center">
  Built with ❤️ for the Kubernetes community
</p>
