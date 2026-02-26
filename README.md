<p align="center">
  <img src="docs/images/kubeatlas-logo.png" alt="KubeAtlas Logo" width="200"/>
</p>

<h1 align="center">KubeAtlas</h1>

<p align="center">
  <strong>Kubernetes Inventory & Asset Management Platform</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <a href="https://github.com/kubeatlas/kubeatlas/actions/workflows/ci.yml">
    <img src="https://github.com/kubeatlas/kubeatlas/actions/workflows/ci.yml/badge.svg" alt="CI"/>
  </a>
  <a href="https://github.com/kubeatlas/kubeatlas/releases">
    <img src="https://img.shields.io/github/v/release/kubeatlas/kubeatlas?include_prereleases" alt="Release"/>
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"/>
  </a>
  <a href="https://goreportcard.com/report/github.com/kubeatlas/kubeatlas">
    <img src="https://goreportcard.com/badge/github.com/kubeatlas/kubeatlas" alt="Go Report Card"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/go-1.21+-00ADD8?logo=go" alt="Go"/>
  <img src="https://img.shields.io/badge/react-18+-61DAFB?logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/kubernetes-1.25+-326CE5?logo=kubernetes" alt="Kubernetes"/>
  <img src="https://img.shields.io/badge/openshift-4.12+-EE0000?logo=redhatopenshift" alt="OpenShift"/>
</p>

---

## 🌍 Overview

**KubeAtlas** is a comprehensive Kubernetes inventory and asset management platform designed for enterprise environments. It provides complete visibility into your Kubernetes resources with ownership tracking, dependency mapping, and documentation management.

Unlike monitoring tools that focus on metrics and alerts, KubeAtlas focuses on **inventory management** - answering questions like:
- Who owns this namespace?
- What are the dependencies of this application?
- Which business unit is responsible for this resource?
- Where is the documentation for this service?

## ✨ Features

### 🔍 Auto-Discovery
- Automatic discovery of Kubernetes resources (Namespaces, Deployments, Services, etc.)
- Multi-cluster support
- Real-time synchronization with cluster state
- Support for OpenShift, RKE2, EKS, AKS, GKE

### 👥 Ownership Management
- **Infrastructure Owner** - Platform/DevOps team responsibility
- **Business Unit** - Department/cost center assignment
- **Application Manager** - Application-level ownership
- **Technical Lead** - Technical responsibility
- **Project Manager** - Project oversight
- Custom ownership fields support

### 🔗 Dependency Tracking
- Internal dependencies (within cluster)
- External dependencies (third-party APIs, databases)
- Visual dependency graph
- Impact analysis (what breaks if X goes down?)

### 📄 Documentation Management
- Upload and manage documents per namespace
- Support for PDF, DOCX, images, markdown
- Version history
- Category tagging (Architecture, Runbook, SLA, etc.)

### 📊 Reporting & Compliance
- Ownership coverage reports
- Orphaned resources detection
- Export to Excel/CSV/PDF
- Audit trail for all changes
- Compliance dashboards

### 🔐 Enterprise Security
- LDAP/Active Directory integration
- OIDC/SAML SSO support
- Role-based access control (RBAC)
- Audit logging
- Data encryption at rest

## 🚀 Quick Start

### Prerequisites
- Kubernetes 1.25+ or OpenShift 4.12+
- Helm 3.x
- PostgreSQL 14+ (included in Helm chart)

### Installation with Helm

```bash
# Add KubeAtlas Helm repository
helm repo add kubeatlas https://charts.kubeatlas.io
helm repo update

# Install KubeAtlas
helm install kubeatlas kubeatlas/kubeatlas \
  --namespace kubeatlas \
  --create-namespace \
  --set global.domain=kubeatlas.example.com
```

### Access the UI

```bash
# Get the admin password
kubectl get secret kubeatlas-admin -n kubeatlas -o jsonpath='{.data.password}' | base64 -d

# Port forward (development)
kubectl port-forward svc/kubeatlas 8080:80 -n kubeatlas

# Open browser
open http://localhost:8080
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Installation Guide](docs/installation.md) | Detailed installation instructions |
| [Configuration](docs/configuration.md) | Configuration options and environment variables |
| [User Guide](docs/user-guide.md) | How to use KubeAtlas |
| [API Reference](docs/api-reference.md) | REST API documentation |
| [Architecture](docs/architecture.md) | System architecture and design |
| [Contributing](CONTRIBUTING.md) | How to contribute to KubeAtlas |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KubeAtlas                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web UI    │  │   REST API  │  │  K8s Agent  │             │
│  │   (React)   │  │    (Go)     │  │    (Go)     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                   ┌──────┴──────┐                               │
│                   │  PostgreSQL │                               │
│                   │   Database  │                               │
│                   └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
          │                                       │
          ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│ Kubernetes      │                   │ External        │
│ Cluster 1       │                   │ Systems         │
│ (OpenShift)     │                   │ (LDAP, SSO)     │
└─────────────────┘                   └─────────────────┘
```

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Backend API | Go 1.21+ |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Database | PostgreSQL 14+ |
| Cache | Redis 7+ |
| Authentication | Keycloak / Dex |
| Container | Docker |
| Orchestration | Kubernetes / OpenShift |
| Package Manager | Helm 3 |

## 📊 Screenshots

<p align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard" width="800"/>
  <br/>
  <em>Dashboard - Overview of all resources and ownership status</em>
</p>

<p align="center">
  <img src="docs/images/namespace-detail.png" alt="Namespace Detail" width="800"/>
  <br/>
  <em>Namespace Detail - Ownership, dependencies, and documentation</em>
</p>

## 🗺️ Roadmap

### v1.0 (Current)
- [x] Multi-cluster support
- [x] Namespace inventory
- [x] Ownership management
- [x] Dependency tracking
- [x] Document management
- [x] Basic reporting

### v1.1 (Q2 2025)
- [ ] Visual dependency graph
- [ ] Slack/Teams notifications
- [ ] Custom fields support
- [ ] API webhooks

### v1.2 (Q3 2025)
- [ ] Cost tracking integration
- [ ] Terraform provider
- [ ] GitOps integration (ArgoCD, Flux)
- [ ] Mobile app

### v2.0 (Q4 2025)
- [ ] AI-powered insights
- [ ] Automated ownership suggestions
- [ ] Compliance frameworks (SOC2, ISO27001)
- [ ] Multi-tenancy (SaaS mode)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/kubeatlas/kubeatlas.git
cd kubeatlas

# Start development environment
make dev

# Run tests
make test

# Build
make build
```

## 📄 License

KubeAtlas is licensed under the [Apache License 2.0](LICENSE).

## 🙏 Acknowledgments

- [Kubernetes](https://kubernetes.io/) - Container orchestration
- [OpenShift](https://www.redhat.com/en/technologies/cloud-computing/openshift) - Enterprise Kubernetes
- [Backstage](https://backstage.io/) - Inspiration for developer portal concepts

---

<p align="center">
  Made with ❤️ by the KubeAtlas Team
</p>

<p align="center">
  <a href="https://kubeatlas.io">Website</a> •
  <a href="https://docs.kubeatlas.io">Documentation</a> •
  <a href="https://twitter.com/kubeatlas">Twitter</a>
</p>
