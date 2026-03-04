<div align="center">

<!-- Logo Placeholder - Replace with actual logo when available -->
<h1 align="center">☸️ KubeAtlas</h1>
<p align="center">
  <strong>Central Kubernetes Inventory & Ownership Platform</strong>
</p>

<p align="center">
  <a href="https://github.com/ozcanfpolat/kubeatlas/actions/workflows/ci.yml">
    <img src="https://github.com/ozcanfpolat/kubeatlas/actions/workflows/ci.yml/badge.svg" alt="CI/CD">
  </a>
  <a href="https://github.com/ozcanfpolat/kubeatlas/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
  </a>
  <a href="https://goreportcard.com/report/github.com/ozcanfpolat/kubeatlas">
    <img src="https://goreportcard.com/badge/github.com/ozcanfpolat/kubeatlas" alt="Go Report Card">
  </a>
  <a href="#helm-installation">
    <img src="https://img.shields.io/badge/Kubernetes-1.26+-326CE5?logo=kubernetes&logoColor=white" alt="Kubernetes">
  </a>
  <a href="#quick-start">
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker">
  </a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Docs</a>
</p>

---

</div>

## 🎯 Overview

**KubeAtlas** is a comprehensive governance platform designed to bring clarity and ownership visibility to Kubernetes/OpenShift estates. Unlike observability tools that focus on metrics and logs, KubeAtlas centers on **operational ownership**, **accountability**, and **governance**.

### Why KubeAtlas?

Managing multiple Kubernetes clusters across different teams and environments often leads to:
- 🔍 **Unknown ownership** - Who owns this namespace?
- 📋 **Missing documentation** - Where are the runbooks?
- 🔗 **Hidden dependencies** - What breaks if this changes?
- 📊 **No governance visibility** - Are we compliant?

KubeAtlas solves these by providing a **central source of truth** for all your Kubernetes resources.

---

## ✨ Features

### 📊 Interactive Dashboard
Get real-time insights into your Kubernetes inventory:

| Metric | Description |
|--------|-------------|
| **Total Clusters** | Overview of all connected Kubernetes clusters |
| **Namespace Count** | Complete inventory of all namespaces |
| **Ownership Coverage** | Track which namespaces have assigned owners |
| **Orphaned Resources** | Identify namespaces without ownership |
| **Environment Distribution** | Visual breakdown by environment (Prod, Staging, Dev) |
| **Recent Activities** | Audit trail of all changes |

![Dashboard](https://raw.githubusercontent.com/ozcanfpolat/kubeatlas/main/docs/images/dashboard.svg)

### 🔐 Ownership Management
Define and track ownership at multiple levels:
- **Infrastructure Owner** - Technical team responsible
- **Business Unit** - Organizational department
- **Application Manager** - Primary contact
- **Technical Lead** - Engineering lead
- **Project Manager** - Project oversight

### 📦 Cluster & Namespace Inventory
- **Multi-cluster support** - Connect and manage multiple K8s clusters
- **Auto-discovery** - Automatically discover namespaces and resources
- **Metadata enrichment** - Add custom fields, tags, and labels
- **Environment classification** - Prod, Staging, Dev, Test segregation

### 🔗 Dependency Mapping
Visualize and manage dependencies:
- **Internal Dependencies** - Namespace-to-namespace dependencies
- **External Dependencies** - Third-party service dependencies
- **Dependency Graph** - Interactive visualization
- **Impact Analysis** - Understand change impact

<!-- Dependency Graph Screenshot Placeholder -->
<!-- ![Dependencies](docs/images/dependencies.png) -->

### 📄 Document Management
Centralize your documentation:
- **Architecture diagrams** - Link to architecture docs
- **Runbooks** - Operational procedures
- **SLA documents** - Service level agreements
- **Security policies** - Compliance documentation
- **Custom categories** - Define your own document types

### 📝 Audit Trail
Complete audit history:
- **Change tracking** - Who changed what and when
- **Activity logs** - All user actions
- **Resource history** - Per-resource audit trail
- **Compliance reporting** - Export for audits

---

## 🏗️ Architecture

### Component Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as Go API
    participant Auth as JWT Auth
    participant Service as Cluster Service
    participant DB as PostgreSQL
    participant Agent as K8s Agent
    participant K8s as Kubernetes

    User->>UI: Access Dashboard
    UI->>API: GET /api/v1/dashboard/stats
    API->>Auth: Validate JWT Token
    Auth-->>API: Token Valid
    API->>Service: GetDashboardStats()
    Service->>DB: Query cluster stats
    DB-->>Service: Return data
    Service->>DB: Query namespace stats
    DB-->>Service: Return data
    Service-->>API: Aggregated stats
    API-->>UI: JSON Response
    UI-->>User: Render Dashboard

    User->>UI: Sync Cluster
    UI->>API: POST /api/v1/clusters/{id}/sync
    API->>Auth: Validate JWT + RBAC
    API->>Agent: Trigger sync
    Agent->>K8s: Query resources
    K8s-->>Agent: Return namespace list
    Agent->>API: Send sync results
    API->>Service: Update cluster data
    Service->>DB: Insert/Update records
    Service->>DB: Log audit entry
    API-->>UI: Sync complete
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui | Modern UI with type safety |
| **Backend** | Go 1.21, Gin framework, pgx | High-performance API |
| **Database** | PostgreSQL 14+, Redis | Persistent & cache storage |
| **Auth** | JWT + RBAC + LDAP/OIDC | Secure authentication |
| **Deployment** | Docker, Kubernetes, Helm | Container orchestration |
| **Monitoring** | Prometheus, Grafana | Observability |

---

## 📸 Screenshots & UI Preview

> **Note:** Screenshots below are placeholder descriptions. Replace with actual screenshots after deployment.

### 🎯 Dashboard Overview
The main dashboard provides a comprehensive overview of your Kubernetes inventory with statistics, charts, and recent activities.

![Dashboard](https://raw.githubusercontent.com/ozcanfpolat/kubeatlas/main/docs/images/dashboard.svg)

<details>
<summary>📊 Click to view Dashboard UI Details</summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☸️ KubeAtlas                                                    👤 Admin  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Dashboard  Clusters  Namespaces  Dependencies  Documents  Teams  Settings  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Dashboard                                                                  │
│  Overview of your Kubernetes inventory                                      │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Total        │ │ Total        │ │ Active       │ │ Orphaned     │       │
│  │ Clusters     │ │ Namespaces   │ │ Teams        │ │ Namespaces   │       │
│  │              │ │              │ │              │ │              │       │
│  │     12       │ │    156       │ │     8        │ │     4        │       │
│  │ 10 active    │ │              │ │              │ │              │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                             │
│  ┌──────────────────────────────┐ ┌──────────────────────────────────────┐ │
│  │  Environment Distribution    │ │  Ownership Coverage                  │ │
│  │                              │ │                                      │ │
│  │  ████████████████████  45%   │ │  ████████████████████████  85%      │ │
│  │  ██████████████        28%   │ │  ██                       15%      │ │
│  │  ██████████████████    37%   │ │                                      │ │
│  │  ██████████            19%   │ │  With Owner: 132 namespaces         │ │
│  │                              │ │  Orphaned:    24 namespaces         │ │
│  │  Production Staging Dev Test │ │                                      │ │
│  └──────────────────────────────┘ └──────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────┐ ┌──────────────────────────────────────┐ │
│  │  Recent Activities           │ │  Missing Information                 │ │
│  │                              │ │                                      │ │
│  │  📝 Team updated...    2m    │ │  ⚠️  production-api                  │ │
│  │  🔄 Cluster synced...  15m   │ │      Missing: owner, cost center    │ │
│  │  ➕ Namespace added... 1h     │ │                                      │ │
│  │  📄 Document added...  2h    │ │  ⚠️  staging-database                │ │
│  │                              │ │      Missing: documentation         │ │
│  └──────────────────────────────┘ └──────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

### 🔧 Cluster Management
View and manage all your Kubernetes clusters from a single interface with filtering and search capabilities.

![Clusters](docs/images/clusters.svg)

<details>
<summary>🖥️ Click to view Clusters UI Details</summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Clusters                                                                   │
│  Manage your Kubernetes clusters                                            │
│                                                          [➕ Add Cluster]   │
│                                                                             │
│  ┌──────────────────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ 🔍 Search clusters...    │ │ Status ▼    │ │ Environment ▼│              │
│  └──────────────────────────┘ └─────────────┘ └─────────────┘              │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Name           │ Environment │ Status   │ Namespaces │ Last Sync      │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ production-eks │ Production  │ 🟢 Active│     45     │ 2 minutes ago  │ │
│  │ staging-gke    │ Staging     │ 🟢 Active│     28     │ 5 minutes ago  │ │
│  │ dev-aks        │ Development │ 🟢 Active│     67     │ 1 hour ago     │ │
│  │ test-openshift │ Test        │ 🟡 Syncing│    16     │ In progress    │ │
│  │ legacy-cluster │ Production  │ 🔴 Inactive│    0     │ 3 days ago     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Showing 5 of 12 clusters                                      ← 1 2 3 →    │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

### 📦 Namespace Management
Comprehensive namespace inventory with ownership tracking, cost allocation, and compliance status.

![Namespaces](docs/images/namespaces.svg)

<details>
<summary>📋 Click to view Namespaces UI Details</summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Namespaces                                                                 │
│  156 namespaces across all clusters                                         │
│                                                                   [Export]  │
│                                                                             │
│  🔍 Search    Cluster ▼    Environment ▼    Criticality ▼    ☑ Orphaned   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Namespace       │ Cluster        │ Env        │ Owner      │ Critical │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ payment-service │ production-eks │ Production │ Platform   │ Critical │ │
│  │ user-auth       │ production-eks │ Production │ Security   │ Critical │ │
│  │ frontend-app    │ staging-gke    │ Staging    │ Frontend   │ High     │ │
│  │ data-pipeline   │ staging-gke    │ Staging    │ Data Team  │ Medium   │ │
│  │ test-runner     │ dev-aks        │ Development│ QA Team    │ Low      │ │
│  │ ⚠️ untracked-ns │ production-eks │ Production │ —          │ Unknown  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ← 1 2 3 4 5 ... 16 →                                          Page 1 of 16 │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

### 🔗 Dependency Visualization
Interactive graph showing dependencies between namespaces with drill-down capabilities.

![Dependencies](docs/images/dependencies.svg)

<details>
<summary>🕸️ Click to view Dependencies UI Details</summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dependencies                                                               │
│  Visualize relationships between namespaces                                 │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │                       ┌─────────────────┐                              │ │
│  │                       │  API Gateway    │                              │ │
│  │                       │   (nginx-ingress)│                             │ │
│  │                       └────────┬────────┘                              │ │
│  │                                │                                       │ │
│  │              ┌─────────────────┼─────────────────┐                     │ │
│  │              │                 │                 │                     │ │
│  │              ▼                 ▼                 ▼                     │ │
│  │     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │ │
│  │     │ Auth Service│   │User Service │   │Order Service│               │ │
│  │     │  (Keycloak) │   │   (Node.js) │   │   (Java)    │               │ │
│  │     └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │ │
│  │            │                 │                 │                       │ │
│  │            │                 │                 │                       │ │
│  │            ▼                 ▼                 ▼                       │ │
│  │     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │ │
│  │     │   Redis     │   │ PostgreSQL  │   │  RabbitMQ   │               │ │
│  │     │   Cache     │   │   Primary   │   │   Queue     │               │ │
│  │     └─────────────┘   └─────────────┘   └─────────────┘               │ │
│  │                                                                        │ │
│  │  Legend: ─── HTTP/API  ─ ─ Message Queue  ··· Database               │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Selected: payment-service     [View Details]  [Edit Dependencies]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

### 📄 Document Repository
Centralized documentation management with version control and access permissions.

![Documents](docs/images/documents.svg)

<details>
<summary>📚 Click to view Documents UI Details</summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Documents                                                                  │
│  Centralized documentation repository                                       │
│                                                                    [➕ New] │
│                                                                             │
│  🔍 Search documents...    Category ▼    Type ▼    Sort by: Updated ▼       │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 Payment Service Runbook                                             │ │
│  │    Category: Runbooks        Type: Markdown      Updated: 2 hours ago  │ │
│  │    Owner: Platform Team      Size: 24 KB                             │ │
│  │                                                                        │ │
│  │ 📊 Architecture Diagram - Auth Flow                                    │ │
│  │    Category: Architecture    Type: Draw.io       Updated: 1 day ago    │ │
│  │    Owner: Security Team      Size: 156 KB                            │ │
│  │                                                                        │ │
│  │ 📋 SLA Document - Payment APIs                                         │ │
│  │    Category: SLA             Type: PDF           Updated: 1 week ago   │ │
│  │    Owner: Product Team       Size: 1.2 MB                            │ │
│  │                                                                        │ │
│  │ 🔐 Security Policy - Data Classification                               │ │
│  │    Category: Security        Type: Confluence    Updated: 2 weeks ago  │ │
│  │    Owner: Security Team      Size: Link                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

### 👥 Team Management
Organize teams, assign ownership, and manage access control.

![Teams](docs/images/teams.svg)

<details>
<summary>👤 Click to view Teams UI Details</summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Teams                                                                      │
│  Manage teams and ownership assignments                                     │
│                                                                  [➕ Team]  │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Team Name       │ Members │ Namespaces │ Business Unit    │ Cost Center│ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ 🚀 Platform     │   12    │     24     │ Engineering      │ ENG-001    │ │
│  │ 🔐 Security     │    5    │      8     │ Engineering      │ ENG-002    │ │
│  │ 💳 Payments     │    8    │     12     │ Product          │ PROD-001   │ │
│  │ 📊 Data Team    │    6    │     15     │ Engineering      │ ENG-003    │ │
│  │ 🎨 Frontend     │    9    │     18     │ Product          │ PROD-002   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Selected: Platform Team                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 👤 John Doe (Lead)  👤 Jane Smith  👤 Bob Johnson  👤 Alice Wang      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

### 📝 Audit Logs
Complete audit trail for compliance and troubleshooting.

![Audit Logs](docs/images/audit-logs.svg)

<details>
<summary>📋 Click to view Audit Logs UI Details</summary>

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Audit Logs                                                                 │
│  Complete activity history                                                  │
│                                                                [📥 Export]  │
│                                                                             │
│  Date range: [2024-01-01] to [2024-12-31]    User ▼    Action ▼    Resource│ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Timestamp        │ User        │ Action      │ Resource    │ Status   │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ 2024-12-15 14:32 │ john.doe    │ UPDATE      │ Team        │ ✅ Success│ │
│  │ 2024-12-15 14:30 │ jane.smith  │ CREATE      │ Document    │ ✅ Success│ │
│  │ 2024-12-15 14:15 │ bob.admin   │ DELETE      │ Cluster     │ ✅ Success│ │
│  │ 2024-12-15 13:45 │ alice.dev   │ SYNC        │ Cluster     │ ⚠️ Warning│ │
│  │ 2024-12-15 13:30 │ john.doe    │ UPDATE      │ Namespace   │ ✅ Success│ │
│  │ 2024-12-15 12:00 │ system      │ AUTO_SYNC   │ Cluster     │ ✅ Success│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

</details>

---

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+ and Docker Compose
- (Optional) Go 1.21+ for local development
- (Optional) Node.js 18+ for local frontend development

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/ozcanfpolat/kubeatlas.git
cd kubeatlas

# Start all services
make dev

# Or manually:
# docker compose -f docker-compose.dev.yml up -d
```

### Option 2: Local Development

```bash
# Start infrastructure services
docker compose -f docker-compose.dev.yml up postgres adminer -d

# Backend
cd backend
go mod download
go run cmd/api/main.go

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

### Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| Web UI | http://localhost:3000 | admin@kubeatlas.local / admin123 |
| API | http://localhost:8080 | JWT Token required |
| Database Admin | http://localhost:8081 | See docker-compose.yml |

### Initialize Database

```bash
# Run migrations
make db-migrate

# Seed sample data
make db-seed
```

---

## ☸️ Production Kubernetes Deployment

### Prerequisites

- Kubernetes 1.26+ or OpenShift 4.12+
- Helm 3.12+
- kubectl configured for your cluster
- (Optional) cert-manager for automatic TLS

### Step 1: Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace kubeatlas

# Create required secrets
kubectl create secret generic kubeatlas-db \
  --namespace kubeatlas \
  --from-literal=DB_HOST=your-postgres-host \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_USER=kubeatlas \
  --from-literal=DB_PASSWORD=your-secure-password \
  --from-literal=DB_NAME=kubeatlas

kubectl create secret generic kubeatlas-jwt \
  --namespace kubeatlas \
  --from-literal=secret=$(openssl rand -base64 32)

kubectl create secret generic kubeatlas-encryption \
  --namespace kubeatlas \
  --from-literal=key=$(openssl rand -hex 32)
```

### Step 2: Install with Helm

```bash
# Basic installation
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  --set global.domain=kubeatlas.yourdomain.com \
  --set ingress.enabled=true

# With external PostgreSQL (recommended for production)
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  --set global.domain=kubeatlas.yourdomain.com \
  --set postgresql.enabled=false \
  --set externalDatabase.host=your-postgres-host \
  --set externalDatabase.existingSecret=kubeatlas-db

# For OpenShift with Routes
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  --set ingress.enabled=false \
  --set openshift.route.enabled=true \
  --set openshift.route.host=kubeatlas.apps.yourdomain.com
```

### Step 3: Add Your First Cluster

Once deployed, login and add clusters to manage:

```bash
# Get admin credentials (first-time setup)
kubectl get secret kubeatlas-admin -n kubeatlas -o jsonpath='{.data.password}' | base64 -d

# Or use the default seed credentials:
# Email: admin@kubeatlas.local
# Password: admin123 (change immediately!)
```

### Connecting Target Clusters

KubeAtlas connects to other Kubernetes clusters using **Service Account Tokens**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hub Cluster (KubeAtlas)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ KubeAtlas API → HTTPS (6443) → Target Cluster API       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │ Prod      │       │ Staging   │       │ Dev       │
   │ Cluster   │       │ Cluster   │       │ Cluster   │
   └───────────┘       └───────────┘       └───────────┘
```

#### Network Requirements
- KubeAtlas pod must reach target cluster API server (usually port 6443)
- Outbound HTTPS from KubeAtlas namespace
- No inbound connections required on target clusters

#### Step-by-Step: Add a Target Cluster

**On the TARGET cluster:**

```bash
# 1. Create service account and RBAC
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
  resources: ["namespaces", "pods", "services", "configmaps", "nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/version", "/healthz"]
  verbs: ["get"]
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

# 2. Get the service account token
TOKEN=$(kubectl get secret kubeatlas-agent-token -n kubeatlas-agent \
  -o jsonpath='{.data.token}' | base64 -d)
echo "Token: $TOKEN"

# 3. Get the API server URL
API_URL=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
echo "API URL: $API_URL"

# 4. Get CA certificate (for self-signed clusters)
kubectl get secret kubeatlas-agent-token -n kubeatlas-agent \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > cluster-ca.crt
echo "CA Certificate saved to: cluster-ca.crt"

# 5. Test connectivity
curl -s --cacert cluster-ca.crt -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/v1/namespaces" | head -20
```

**In KubeAtlas UI:**

1. Go to **Clusters** → **Add Cluster**
2. Fill in the form:
   - **Name:** `prod-cluster-01` (lowercase, no spaces)
   - **API Server URL:** The URL from step 3
   - **Auth Method:** Service Account Token
   - **Token:** The token from step 2
3. For **self-signed certificates:**
   - Upload the CA certificate from step 4, OR
   - Enable "Skip TLS Verification" (⚠️ dev only!)
4. Click **Create** then **Sync**

---

## 📁 Repository Structure

```
kubeatlas/
├── backend/                 # Go backend API
│   ├── cmd/                # Application entrypoints
│   ├── internal/           # Internal packages
│   │   ├── api/           # HTTP handlers & middleware
│   │   ├── config/        # Configuration
│   │   ├── database/      # Database connection & migrations
│   │   ├── models/        # Data models
│   │   ├── services/      # Business logic
│   │   └── k8s/          # Kubernetes client
│   └── go.mod
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   └── store/        # State management
│   └── package.json
├── database/              # SQL schemas and migrations
├── helm/                  # Helm charts
├── docker/                # Dockerfiles
└── docs/                  # Documentation
```

---

## 📚 Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Adding Clusters](docs/ADDING_CLUSTERS.md)
- [API Documentation](docs/api/openapi.yaml)
- [Project Structure](docs/PROJECT_STRUCTURE.md)

---

## 🔐 Security Considerations

### Encryption at Rest
- All sensitive data (kubeconfig, service account tokens, CA certificates) is encrypted using **AES-256-GCM**
- Encryption key must be provided via `ENCRYPTION_KEY` environment variable
- **Never** commit encryption keys to version control

### Authentication
- JWT-based authentication with configurable expiration
- RBAC with three roles: `admin`, `editor`, `viewer`
- Optional LDAP/OIDC integration for enterprise SSO

### Network Security
- All API endpoints require authentication (except `/health`, `/ready`)
- Rate limiting enabled by default (100 req/min per IP)
- Login endpoint has stricter limits (5 attempts/15 min per IP)
- CORS configured for specific origins only

### Kubernetes Connections
- **Production**: Always use TLS with CA certificate verification
- **Development only**: `skip_tls_verify` can be enabled
- Service account tokens should have minimal required permissions

### Best Practices
```bash
# Generate strong secrets
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24)
```

---

## 🔧 Troubleshooting

### Cluster Connection Issues

```bash
# Test connectivity from KubeAtlas pod
kubectl exec -it deploy/kubeatlas-api -n kubeatlas -- \
  wget --spider --timeout=5 https://api.target-cluster.com:6443

# Check if token is valid
curl -k -H "Authorization: Bearer $TOKEN" \
  https://api.target-cluster.com:6443/api/v1/namespaces
```

### Database Issues

```bash
# Check database connectivity
kubectl exec -it deploy/kubeatlas-api -n kubeatlas -- \
  nc -zv $DB_HOST $DB_PORT

# View migration status
kubectl logs deploy/kubeatlas-api -n kubeatlas | grep -i migration
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `x509: certificate signed by unknown authority` | Self-signed cert | Upload CA cert or enable skip_tls_verify |
| `401 Unauthorized` | Invalid/expired token | Generate new service account token |
| `connection refused` | Firewall/network | Check network policies and firewall rules |
| `encryption key too short` | ENCRYPTION_KEY < 16 chars | Use `openssl rand -hex 32` |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

- 📧 Email: support@kubeatlas.local
- 🐛 Issues: [GitHub Issues](https://github.com/ozcanfpolat/kubeatlas/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/ozcanfpolat/kubeatlas/discussions)

---

<p align="center">
  Built with ❤️ for the Kubernetes community
</p>
