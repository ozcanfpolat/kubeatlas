<p align="center">
  <img src="docs/images/kubeatlas-logo.png" alt="KubeAtlas Logo" width="180"/>
</p>

<h1 align="center">KubeAtlas</h1>
<p align="center"><strong>Central Kubernetes Inventory & Ownership Platform</strong></p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#core-capabilities">Core Capabilities</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start-local-development">Quick Start</a> •
  <a href="#helm-installation">Helm Installation</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Overview

KubeAtlas is designed as a **central inventory application** for Kubernetes/OpenShift estates.
You install KubeAtlas once, then connect clusters to manage and govern:

- cluster and namespace inventory,
- ownership and responsibility metadata,
- dependency maps,
- documentation and audit history.

This is intentionally different from observability stacks: the primary goal is **governance + operational ownership visibility**.

## Core Capabilities

- **Multi-cluster inventory**: maintain a central source of truth for clusters and namespaces.
- **Ownership model**: infra owner, business unit, technical lead, manager roles.
- **Dependency management**: internal and external dependency records.
- **Documentation management**: attach architecture/runbook/SLA documents.
- **Audit trail**: track changes with actor and timestamp context.

## Architecture

```text
Web UI (React)  --->  API (Go/Gin)  ---> PostgreSQL
                         |
                         +---- Kubernetes connectors (multi-cluster)
```

## Repository Structure (high-level)

- `backend/` → Go API and business/domain services
- `frontend/` → React + TypeScript UI
- `database/` → SQL schema + seed
- `docker/` → container build files
- `helm/kubeatlas/` → Helm chart
- `docs/` → installation, cluster onboarding, API artifacts

## Quick Start (Local Development)

### Prerequisites

- Docker + Docker Compose
- Go 1.21+ (optional if running fully in containers)
- Node.js 18+ (optional if running fully in containers)

### 1) Start local stack

```bash
make dev
```

or

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2) Initialize database (schema + sample data)

```bash
make db-migrate
make db-seed
```

### 3) Access

- UI: `http://localhost:3000`
- API health: `http://localhost:8080/health`
- Adminer: `http://localhost:8081`

## Helm Installation

Use the local chart in this repository:

```bash
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  --create-namespace
```

For OpenShift-specific values:

```bash
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  --create-namespace \
  -f deploy/values-openshift.yaml
```

## Cluster Onboarding Model

Recommended enterprise rollout:

1. Deploy KubeAtlas to the central management cluster.
2. Register target clusters in KubeAtlas.
3. Configure secure credentials per cluster.
4. Sync namespaces/resources.
5. Assign ownership, dependencies and documents.

See: [Adding Clusters](docs/ADDING_CLUSTERS.md).

## API

OpenAPI definitions:

- `docs/openapi.yaml`
- `docs/api/openapi.yaml`

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Adding Clusters](docs/ADDING_CLUSTERS.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

## Build, Test, Lint

```bash
make test
make lint
make build
```

## License

MIT License. See [LICENSE](LICENSE).
