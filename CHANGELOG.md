# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of KubeAtlas
- Multi-cluster Kubernetes inventory management
- Namespace ownership tracking (Team, User, Business Unit)
- Contact information management (Application Manager, Technical Lead, Project Manager)
- SLA configuration (Availability, RTO, RPO)
- Internal dependency mapping between namespaces
- External dependency tracking (APIs, databases, SaaS)
- Dependency graph visualization
- Document management with categories
- Dashboard with coverage metrics
- Audit trail for all changes
- JWT-based authentication
- Role-based access control (Admin, Editor, Viewer)
- Kubernetes namespace auto-discovery
- OpenShift, RKE2, EKS, AKS, GKE support
- Helm chart for Kubernetes deployment
- Docker Compose for development
- OpenShift Route support

### Security
- Service Account based cluster authentication
- Token encryption for stored credentials
- TLS support for cluster connections

## [1.0.0] - 2024-XX-XX

### Added
- First stable release

---

## Release Notes

### Upgrading from 0.x to 1.0

No breaking changes. Simply upgrade using Helm:

```bash
helm upgrade kubeatlas kubeatlas/kubeatlas --version 1.0.0
```

### Known Issues

- Dependency graph may be slow for namespaces with >100 dependencies
- Document upload limited to 50MB

### Deprecations

None in this release.
