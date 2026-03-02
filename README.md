<div align="center">

<!-- Logo Placeholder - Replace with actual logo when available -->
<h1 align="center">☸️ KubeAtlas</h1>
<p align="center">
  <strong>Central Kubernetes Inventory & Ownership Platform</strong>
</p>

<p align="center">
  <a href="https://github.com/ozcanfpolat/kubeatlas/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
  </a>
  <a href="#quick-start">
    <img src="https://img.shields.io/badge/Quick%20Start-Docker-green" alt="Quick Start">
  </a>
  <a href="#helm-installation">
    <img src="https://img.shields.io/badge/Deploy-Helm-blueviolet" alt="Helm">
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

<!-- Dashboard Screenshot Placeholder -->
<!-- ![Dashboard](docs/images/dashboard.png) -->

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

```
┌─────────────────────────────────────────────────────────────┐
│                     KubeAtlas Platform                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web UI     │  │   REST API   │  │   Database   │      │
│  │   (React)    │  │    (Go)      │  │ (PostgreSQL) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                 │                                 │
│         └─────────────────┘                                 │
│                   │                                          │
│         ┌─────────▼─────────┐                               │
│         │  Kubernetes Agent │  ← Connects to K8s clusters   │
│         └───────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Go 1.21, Gin framework, pgx (PostgreSQL driver) |
| **Database** | PostgreSQL 14+ |
| **Auth** | JWT-based authentication |
| **Deployment** | Docker, Docker Compose, Helm |

---

## 📸 Screenshots

> **Note:** Screenshots below are placeholder descriptions. Replace with actual screenshots after deployment.

### Dashboard Overview
The main dashboard provides a comprehensive overview of your Kubernetes inventory with statistics, charts, and recent activities.

<!-- ![Dashboard Overview](docs/images/dashboard.png) -->

### Cluster Management
View and manage all your Kubernetes clusters from a single interface.

<!-- ![Clusters](docs/images/clusters.png) -->

### Namespace Details
Detailed view of each namespace with complete ownership information.

<!-- ![Namespace Detail](docs/images/namespace-detail.png) -->

### Dependency Visualization
Interactive graph showing dependencies between namespaces.

<!-- ![Dependencies](docs/images/dependencies.png) -->

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

## ☸️ Helm Installation

Deploy KubeAtlas to your Kubernetes cluster:

```bash
# Add namespace
kubectl create namespace kubeatlas

# Install with Helm
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  --set ingress.enabled=true \
  --set ingress.host=kubeatlas.yourdomain.com

# For OpenShift
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  -f deploy/values-openshift.yaml
```

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
- [Adding Clusters](docs/ADDING_CLUSTERS.md)
- [API Documentation](docs/api/openapi.yaml)
- [Project Structure](docs/PROJECT_STRUCTURE.md)

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
