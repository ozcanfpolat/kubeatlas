# KubeAtlas - Proje Yapısı

```
kubeatlas/
│
├── README.md                          # Ana dokümantasyon
├── LICENSE                            # Apache 2.0 lisansı
├── CONTRIBUTING.md                    # Katkı rehberi
├── CHANGELOG.md                       # Değişiklik geçmişi
├── Makefile                           # Build ve development komutları
├── docker-compose.dev.yml             # Development ortamı
│
├── backend/                           # Go Backend
│   ├── cmd/
│   │   ├── api/
│   │   │   └── main.go               # API sunucusu entry point
│   │   ├── agent/
│   │   │   └── main.go               # Kubernetes agent entry point
│   │   ├── migrate/
│   │   │   └── main.go               # Database migration tool
│   │   └── seed/
│   │       └── main.go               # Database seeder
│   │
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handlers/             # HTTP handlers
│   │   │   │   ├── auth.go
│   │   │   │   ├── clusters.go
│   │   │   │   ├── namespaces.go
│   │   │   │   ├── dependencies.go
│   │   │   │   ├── documents.go
│   │   │   │   ├── teams.go
│   │   │   │   ├── users.go
│   │   │   │   ├── reports.go
│   │   │   │   └── dashboard.go
│   │   │   │
│   │   │   ├── middleware/           # HTTP middleware
│   │   │   │   ├── auth.go
│   │   │   │   ├── logger.go
│   │   │   │   ├── requestid.go
│   │   │   │   └── ratelimit.go
│   │   │   │
│   │   │   └── dto/                  # Data Transfer Objects
│   │   │       ├── requests.go
│   │   │       └── responses.go
│   │   │
│   │   ├── config/
│   │   │   └── config.go             # Configuration management
│   │   │
│   │   ├── database/
│   │   │   ├── database.go           # Database connection
│   │   │   ├── migrations/           # SQL migrations
│   │   │   └── repositories/         # Data access layer
│   │   │       ├── cluster_repo.go
│   │   │       ├── namespace_repo.go
│   │   │       ├── dependency_repo.go
│   │   │       ├── document_repo.go
│   │   │       ├── team_repo.go
│   │   │       ├── user_repo.go
│   │   │       └── audit_repo.go
│   │   │
│   │   ├── models/
│   │   │   └── models.go             # Data models
│   │   │
│   │   ├── services/
│   │   │   ├── services.go           # Service container
│   │   │   ├── auth_service.go
│   │   │   ├── cluster_service.go
│   │   │   ├── namespace_service.go
│   │   │   ├── dependency_service.go
│   │   │   ├── document_service.go
│   │   │   ├── report_service.go
│   │   │   └── notification_service.go
│   │   │
│   │   ├── k8s/
│   │   │   ├── manager.go            # Kubernetes client manager
│   │   │   ├── discovery.go          # Resource discovery
│   │   │   └── sync.go               # Cluster sync logic
│   │   │
│   │   ├── storage/
│   │   │   ├── storage.go            # Storage interface
│   │   │   ├── local.go              # Local file storage
│   │   │   └── s3.go                 # S3/MinIO storage
│   │   │
│   │   └── utils/
│   │       ├── crypto.go             # Encryption utilities
│   │       ├── validator.go          # Input validation
│   │       └── pagination.go         # Pagination helpers
│   │
│   ├── go.mod
│   ├── go.sum
│   └── .air.toml                     # Hot reload config
│
├── frontend/                          # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── main.tsx                  # Entry point
│   │   ├── App.tsx                   # Root component
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── api/                      # API client
│   │   │   ├── client.ts
│   │   │   ├── clusters.ts
│   │   │   ├── namespaces.ts
│   │   │   ├── dependencies.ts
│   │   │   ├── documents.ts
│   │   │   ├── teams.ts
│   │   │   └── auth.ts
│   │   │
│   │   ├── components/               # Reusable components
│   │   │   ├── ui/                   # Base UI components (shadcn)
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── clusters/
│   │   │   ├── namespaces/
│   │   │   ├── dependencies/
│   │   │   ├── documents/
│   │   │   └── common/
│   │   │       ├── DataTable.tsx
│   │   │       ├── SearchInput.tsx
│   │   │       ├── StatusBadge.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   │
│   │   ├── pages/                    # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Clusters.tsx
│   │   │   ├── ClusterDetail.tsx
│   │   │   ├── Namespaces.tsx
│   │   │   ├── NamespaceDetail.tsx
│   │   │   ├── Dependencies.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── Teams.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Login.tsx
│   │   │
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useClusters.ts
│   │   │   ├── useNamespaces.ts
│   │   │   └── useTheme.ts
│   │   │
│   │   ├── store/                    # State management (Zustand)
│   │   │   ├── authStore.ts
│   │   │   └── uiStore.ts
│   │   │
│   │   ├── types/                    # TypeScript types
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   │
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── helm/                              # Helm Chart
│   └── kubeatlas/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── templates/
│       │   ├── _helpers.tpl
│       │   ├── deployment-api.yaml
│       │   ├── deployment-ui.yaml
│       │   ├── deployment-agent.yaml
│       │   ├── service-api.yaml
│       │   ├── service-ui.yaml
│       │   ├── ingress.yaml
│       │   ├── route.yaml               # OpenShift Route
│       │   ├── configmap.yaml
│       │   ├── secret.yaml
│       │   ├── pvc.yaml
│       │   ├── serviceaccount.yaml
│       │   ├── clusterrole.yaml
│       │   ├── clusterrolebinding.yaml
│       │   ├── servicemonitor.yaml
│       │   └── NOTES.txt
│       └── charts/                      # Subcharts
│
├── database/                          # Database files
│   ├── schema.sql                    # Full schema
│   └── migrations/                   # Incremental migrations
│       ├── 001_initial.sql
│       ├── 002_add_indexes.sql
│       └── ...
│
├── docker/                            # Docker files
│   ├── Dockerfile.api
│   ├── Dockerfile.api.dev
│   ├── Dockerfile.agent
│   ├── Dockerfile.ui
│   ├── Dockerfile.ui.dev
│   └── nginx.conf
│
├── docs/                              # Documentation
│   ├── images/
│   ├── installation.md
│   ├── configuration.md
│   ├── user-guide.md
│   ├── api-reference.md
│   ├── architecture.md
│   └── mkdocs.yml
│
├── scripts/                           # Utility scripts
│   ├── setup-dev.sh
│   ├── build.sh
│   ├── release.sh
│   └── generate-certs.sh
│
├── .github/                           # GitHub Actions
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── security.yml
│
├── .gitignore
├── .editorconfig
└── .pre-commit-config.yaml
```

## Teknoloji Stack

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Backend | Go | 1.21+ |
| Frontend | React + TypeScript | 18.x |
| UI Framework | Tailwind CSS + shadcn/ui | 3.x |
| Database | PostgreSQL | 14+ |
| Cache | Redis | 7+ |
| API Framework | Gin | 1.9+ |
| State Management | Zustand | 4.x |
| Charts | Recharts | 2.x |
| Container | Docker | 24+ |
| Orchestration | Kubernetes | 1.25+ |
| Package | Helm | 3.x |

## Geliştirme Komutları

```bash
# Development ortamını başlat
make dev

# Backend build
make build-backend

# Frontend build
make build-frontend

# Tüm testleri çalıştır
make test

# Docker image build
make docker-build

# Helm chart install
make helm-install
```
