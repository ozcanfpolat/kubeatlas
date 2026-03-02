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

### Fixed (Security Review - March 2026)
- **[CRITICAL]** Fixed missing `crypto/tls` and `net/http` imports in `k8s/manager.go` that caused compilation errors
- **[CRITICAL]** Added SQL injection protection with whitelist validation in `QueryBuilder.OrderBy()` function
- **[CRITICAL]** Added mandatory JWT secret validation for production mode (minimum 32 characters required)
- **[SECURITY]** Added JWT issuer validation in auth middleware to prevent token confusion attacks
- **[SECURITY]** Added encryption key validation for production deployments
- **[ENHANCEMENT]** Development mode now uses safe default secrets with clear warnings

### Added (Production Ready Update - March 2026)
- **[FEATURE]** Self-signed CA certificate support for cluster connections
- **[FEATURE]** Full encryption of kubeconfig, service account tokens, and CA certificates using AES-256-GCM
- **[FEATURE]** Cluster connection test on creation with async status update
- **[FEATURE]** Frontend cluster creation form with full authentication options
- **[FEATURE]** Comprehensive production deployment guide (docs/DEPLOYMENT.md)
- **[SECURITY]** ENCRYPTION_KEY configuration for sensitive data encryption
- **[HELM]** Encryption key secret management in Helm chart
- **[HELM]** Self-signed TLS certificate deployment instructions
- **[DB]** Added `ca_certificate_encrypted` column for self-signed cluster support
- **[DOCS]** Multi-cluster setup guide with ServiceAccount RBAC configuration
- **[DOCS]** Kubernetes and Docker Compose production deployment instructions

### Fixed (Production Ready Update - March 2026)
- **[CRITICAL]** Fixed TODO in cluster_service.go - kubeconfig and tokens are now properly encrypted before storage
- **[BUG]** Fixed parameter order mismatch in Cluster.Update handler call
- **[CONFIG]** Added ENCRYPTION_KEY to .env.example and docker-compose.prod.yml

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
