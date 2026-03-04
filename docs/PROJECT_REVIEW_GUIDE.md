# KubeAtlas - Kapsamlı Proje İnceleme ve Sorgulama Rehberi

> **Amaç:** Bu doküman, KubeAtlas projesinin tüm bileşenlerini sistematik olarak incelemek, hataları bulmak ve production-ready hale getirmek için kullanılacak kapsamlı bir rehberdir.

---

## 📋 İÇİNDEKİLER

1. [Proje Genel Bakış](#1-proje-genel-bakış)
2. [Mimari Yapı](#2-mimari-yapı)
3. [Bileşen Listesi ve Sorumlulukları](#3-bileşen-listesi-ve-sorumlulukları)
4. [İnceleme Metodolojisi](#4-inceleme-metodolojisi)
5. [Bileşen Bazlı Sorgulama Şablonları](#5-bileşen-bazlı-sorgulama-şablonları)
6. [Kurulum ve Test Rehberi](#6-kurulum-ve-test-rehberi)
7. [Production Readiness Checklist](#7-production-readiness-checklist)
8. [Bilinen Sorunlar ve Çözümler](#8-bilinen-sorunlar-ve-çözümler)

---

## 1. PROJE GENEL BAKIŞ

### 1.1 KubeAtlas Nedir?

KubeAtlas, **çoklu Kubernetes cluster'larını tek bir arayüzden yönetmek** için tasarlanmış bir envanter yönetim sistemidir.

### 1.2 Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| **Multi-Cluster Yönetimi** | Birden fazla K8s cluster'ını tek noktadan izleme |
| **Namespace Envanteri** | Tüm namespace'lerin sahiplik, SLA, bağımlılık bilgileri |
| **Ekip/Organizasyon Yapısı** | Team, Business Unit, User hiyerarşisi |
| **Bağımlılık Haritası** | Internal (namespace-to-namespace) ve External (API, DB) bağımlılıklar |
| **Doküman Yönetimi** | Runbook, architecture diagram vb. dosya yönetimi |
| **Audit Trail** | Tüm değişikliklerin kaydı |
| **Dashboard & Raporlar** | Coverage metrikleri, eksik bilgi raporları |

### 1.3 Teknoloji Stack'i

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui     │
│  React Query (TanStack) + React Router + Recharts           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  Go 1.21 + Gin Framework + pgx (PostgreSQL driver)          │
│  JWT Auth + AES-256-GCM Encryption + Zap Logger             │
│  client-go (Kubernetes client)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                              │
│  PostgreSQL 15 + Embedded Migrations                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE                           │
│  Docker + Docker Compose + Helm Charts + GitHub Actions      │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Klasör Yapısı

```
kubeatlas/
├── backend/                    # Go Backend API
│   ├── cmd/api/               # Main entry point
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handlers/      # HTTP handlers
│   │   │   └── middleware/    # Auth, CORS, Rate limit, Logging
│   │   ├── config/            # Configuration loading
│   │   ├── crypto/            # AES-256-GCM encryption
│   │   ├── database/
│   │   │   ├── migrations/    # SQL migrations (embedded)
│   │   │   └── repositories/  # Data access layer
│   │   ├── k8s/               # Kubernetes client manager
│   │   ├── models/            # Domain models
│   │   └── services/          # Business logic
│   ├── go.mod
│   ├── go.sum
│   └── .golangci.yml          # Linter configuration
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── api/               # API client & endpoints
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities
│   │   └── types/             # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
├── helm/kubeatlas/            # Helm Chart
│   ├── templates/             # K8s manifests
│   ├── values.yaml            # Default values
│   └── Chart.yaml
│
├── docker/                    # Dockerfiles
│   ├── Dockerfile.api
│   └── Dockerfile.ui
│
├── database/                  # Database scripts
│   └── seed.sql               # Sample data
│
├── docs/                      # Documentation
│   ├── DEPLOYMENT.md
│   └── PROJECT_REVIEW_GUIDE.md (bu dosya)
│
├── .github/workflows/         # CI/CD
│   └── ci.yml
│
├── docker-compose.yml         # Production compose
├── docker-compose.dev.yml     # Development compose
├── Makefile                   # Build automation
├── README.md
└── CHANGELOG.md
```

---

## 2. MİMARİ YAPI

### 2.1 Veri Akışı

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Frontend │────▶│ Backend  │────▶│ Database │
│ Browser  │◀────│  React   │◀────│   Go     │◀────│ PostgreSQL│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │  Kubernetes  │
                                 │  Clusters    │
                                 │ (Target)     │
                                 └──────────────┘
```

### 2.2 Authentication Flow

```
1. User Login → POST /api/v1/auth/login
2. Backend validates credentials against PostgreSQL
3. Backend generates JWT (access + refresh tokens)
4. Frontend stores tokens in memory/localStorage
5. All subsequent requests include Authorization: Bearer <token>
6. Token refresh: POST /api/v1/auth/refresh
```

### 2.3 Cluster Connection Flow

```
1. Admin adds cluster via UI (API URL + Service Account Token + CA Cert)
2. Backend encrypts sensitive data (AES-256-GCM)
3. Backend stores encrypted data in PostgreSQL
4. On sync: Backend decrypts → Creates K8s client → Fetches namespaces
5. Namespace metadata stored in PostgreSQL
```

### 2.4 Data Model (ER Diagram)

```
┌─────────────────┐       ┌─────────────────┐
│  organizations  │───1:N─│     users       │
└─────────────────┘       └─────────────────┘
         │                         │
         │ 1:N                     │ N:M
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│    clusters     │       │  team_members   │
└─────────────────┘       └─────────────────┘
         │                         │
         │ 1:N                     │
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   namespaces    │◀──N:1─│     teams       │
└─────────────────┘       └─────────────────┘
         │                         │
         │ 1:N                     │ N:1
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│  dependencies   │       │ business_units  │
│  (internal/     │       └─────────────────┘
│   external)     │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   documents     │       │   audit_logs    │
└─────────────────┘       └─────────────────┘
```

---

## 3. BİLEŞEN LİSTESİ VE SORUMLULUKLARI

### 3.1 Backend Bileşenleri

| # | Bileşen | Dosya Yolu | Sorumluluk | Kritiklik |
|---|---------|------------|------------|-----------|
| 1 | **Main Entry** | `cmd/api/main.go` | Server başlatma, router setup | 🔴 Kritik |
| 2 | **Config** | `internal/config/config.go` | Environment variables yükleme | 🔴 Kritik |
| 3 | **Database** | `internal/database/database.go` | Connection pool, migrations | 🔴 Kritik |
| 4 | **Auth Middleware** | `internal/api/middleware/auth.go` | JWT validation, RBAC | 🔴 Kritik |
| 5 | **Rate Limiter** | `internal/api/middleware/ratelimit.go` | Brute force koruması | 🟡 Yüksek |
| 6 | **Handlers** | `internal/api/handlers/handlers.go` | HTTP endpoint logic | 🔴 Kritik |
| 7 | **Auth Service** | `internal/services/auth_service.go` | Login, token generation | 🔴 Kritik |
| 8 | **Cluster Service** | `internal/services/cluster_service.go` | Cluster CRUD, sync | 🔴 Kritik |
| 9 | **Namespace Service** | `internal/services/namespace_service.go` | Namespace management | 🟡 Yüksek |
| 10 | **K8s Manager** | `internal/k8s/manager.go` | Kubernetes client factory | 🔴 Kritik |
| 11 | **Encryptor** | `internal/crypto/encryptor.go` | AES-256-GCM encryption | 🔴 Kritik |
| 12 | **Repositories** | `internal/database/repositories/*.go` | Data access layer | 🟡 Yüksek |
| 13 | **Models** | `internal/models/*.go` | Domain structs | 🟢 Normal |
| 14 | **Logger** | `internal/api/middleware/logger.go` | Request logging | 🟢 Normal |
| 15 | **Validation** | `internal/api/middleware/validation.go` | Input validation | 🟡 Yüksek |

### 3.2 Frontend Bileşenleri

| # | Bileşen | Dosya Yolu | Sorumluluk | Kritiklik |
|---|---------|------------|------------|-----------|
| 1 | **API Client** | `src/api/client.ts` | Axios config, token refresh | 🔴 Kritik |
| 2 | **API Endpoints** | `src/api/index.ts` | API function definitions | 🔴 Kritik |
| 3 | **Types** | `src/types/index.ts` | TypeScript interfaces | 🟡 Yüksek |
| 4 | **Auth Context** | `src/context/AuthContext.tsx` | Auth state management | 🔴 Kritik |
| 5 | **Login Page** | `src/pages/Login.tsx` | Login form | 🔴 Kritik |
| 6 | **Dashboard** | `src/pages/Dashboard.tsx` | Main dashboard | 🟡 Yüksek |
| 7 | **Clusters Page** | `src/pages/Clusters.tsx` | Cluster list | 🟡 Yüksek |
| 8 | **CreateCluster** | `src/pages/CreateCluster.tsx` | Cluster creation form | 🔴 Kritik |
| 9 | **Namespaces** | `src/pages/Namespaces.tsx` | Namespace list | 🟡 Yüksek |
| 10 | **UI Components** | `src/components/ui/*.tsx` | shadcn/ui components | 🟢 Normal |

### 3.3 Infrastructure Bileşenleri

| # | Bileşen | Dosya Yolu | Sorumluluk | Kritiklik |
|---|---------|------------|------------|-----------|
| 1 | **API Dockerfile** | `docker/Dockerfile.api` | Backend container | 🔴 Kritik |
| 2 | **UI Dockerfile** | `docker/Dockerfile.ui` | Frontend container | 🔴 Kritik |
| 3 | **Docker Compose** | `docker-compose.yml` | Production orchestration | 🔴 Kritik |
| 4 | **Dev Compose** | `docker-compose.dev.yml` | Development setup | 🟡 Yüksek |
| 5 | **Helm Chart** | `helm/kubeatlas/*` | Kubernetes deployment | 🔴 Kritik |
| 6 | **CI/CD** | `.github/workflows/ci.yml` | Automated testing | 🟡 Yüksek |
| 7 | **Makefile** | `Makefile` | Build automation | 🟢 Normal |

---

## 4. İNCELEME METODOLOJİSİ

### 4.1 İnceleme Sırası (Önerilen)

```
Aşama 1: Temel Altyapı (önce çalışır hale getir)
├── 1.1 Database schema ve migrations
├── 1.2 Config loading
├── 1.3 Main entry point
└── 1.4 Docker/Compose setup

Aşama 2: Güvenlik Katmanı (en kritik)
├── 2.1 Encryption (crypto/encryptor.go)
├── 2.2 Authentication (auth middleware + service)
├── 2.3 Rate limiting
└── 2.4 Input validation

Aşama 3: Core Business Logic
├── 3.1 Cluster service + K8s manager
├── 3.2 Namespace service
├── 3.3 User/Team/BusinessUnit services
└── 3.4 Dependency service

Aşama 4: API Layer
├── 4.1 Handlers (endpoint logic)
├── 4.2 Request/Response models
└── 4.3 Error handling

Aşama 5: Frontend
├── 5.1 API client
├── 5.2 Auth context
├── 5.3 Core pages
└── 5.4 Form validations

Aşama 6: Deployment
├── 6.1 Dockerfiles
├── 6.2 Helm charts
├── 6.3 CI/CD pipeline
└── 6.4 Documentation
```

### 4.2 Her Bileşen İçin Kontrol Listesi

```
□ Kod compile oluyor mu?
□ Tüm import'lar kullanılıyor mu?
□ Fonksiyon imzaları doğru mu?
□ Error handling var mı?
□ Logging yeterli mi?
□ Unit test var mı?
□ Güvenlik açığı var mı?
□ Performance sorunu var mı?
□ Documentation yeterli mi?
```

---

## 5. BİLEŞEN BAZLI SORGULAMA ŞABLONLARI

> **Kullanım:** Her bileşen için aşağıdaki şablonu AI modeline verin.

---

### 5.1 BACKEND: Main Entry Point

```markdown
## İnceleme Talebi: Backend Main Entry Point

**Dosya:** `backend/cmd/api/main.go`

**Beklenen İşlevler:**
1. Environment variables'dan config yükleme
2. Logger initialization
3. Database connection
4. Encryption service initialization
5. Kubernetes manager initialization
6. All services initialization
7. Router setup with middleware
8. Graceful shutdown handling

**Kontrol Edilecekler:**
- [ ] Config validation (production'da secret'lar kontrol ediliyor mu?)
- [ ] Database connection error handling
- [ ] Logger error handling
- [ ] Server timeouts (read, write, idle)
- [ ] Graceful shutdown (SIGINT, SIGTERM)
- [ ] Health check endpoint (/health, /ready)
- [ ] Metrics endpoint (/metrics)
- [ ] Rate limiting uygulanmış mı?
- [ ] CORS configuration

**Sorular:**
1. Tüm error'lar loglaniyor mu?
2. Production/Development mode ayrımı var mı?
3. Panic recovery var mı?

**İstenen Çıktı:**
- Bulunan hatalar listesi
- Düzeltme önerileri
- Kod değişiklikleri (varsa)
```

---

### 5.2 BACKEND: Config

```markdown
## İnceleme Talebi: Configuration Management

**Dosya:** `backend/internal/config/config.go`

**Beklenen İşlevler:**
1. Environment variables okuma
2. Default değerler
3. Validation (özellikle production'da)
4. Type-safe config struct

**Kontrol Edilecekler:**
- [ ] DB_PASSWORD boş olabilir mi production'da?
- [ ] JWT_SECRET minimum uzunluk kontrolü (32+ karakter)
- [ ] ENCRYPTION_KEY validation (32 veya 64 hex karakter)
- [ ] API_URL validation (valid URL mi?)
- [ ] Port number validation (1-65535)
- [ ] SSL/TLS config options

**Environment Variables:**
```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSLMODE
JWT_SECRET, JWT_EXPIRY, JWT_REFRESH_EXPIRY
ENCRYPTION_KEY
API_PORT, API_HOST
LOG_LEVEL, LOG_FORMAT
CORS_ORIGINS
```

**İstenen Çıktı:**
- Eksik validasyonlar
- Güvenlik açıkları
- Önerilen default değerler
```

---

### 5.3 BACKEND: Database Layer

```markdown
## İnceleme Talebi: Database Layer

**Dosyalar:**
- `backend/internal/database/database.go`
- `backend/internal/database/migrations/*.sql`
- `backend/internal/database/repositories/*.go`

**Beklenen İşlevler:**
1. Connection pool management
2. Embedded SQL migrations
3. Transaction support
4. Parameterized queries (SQL injection koruması)
5. Soft delete support
6. Pagination

**Kontrol Edilecekler:**
- [ ] SQL injection koruması (tüm sorgular parameterized mi?)
- [ ] Connection pool settings (max connections, idle timeout)
- [ ] Migration versioning
- [ ] Foreign key constraints
- [ ] Index'ler tanımlı mı?
- [ ] Soft delete (deleted_at) tüm tablolarda var mı?
- [ ] created_at, updated_at otomatik mi?

**Repository Pattern Kontrolü:**
Her repository için:
- [ ] Create - ID generation, timestamps
- [ ] GetByID - deleted_at IS NULL kontrolü
- [ ] List - Pagination, filters, sorting
- [ ] Update - updated_at güncelleme
- [ ] Delete - Soft delete

**İstenen Çıktı:**
- SQL injection riskleri
- Eksik index'ler
- Migration sorunları
- Performance önerileri
```

---

### 5.4 BACKEND: Authentication & Authorization

```markdown
## İnceleme Talebi: Auth System

**Dosyalar:**
- `backend/internal/api/middleware/auth.go`
- `backend/internal/services/auth_service.go`

**Beklenen İşlevler:**
1. JWT token generation (access + refresh)
2. JWT validation
3. Token refresh mechanism
4. Password hashing (bcrypt)
5. Role-based access control (RBAC)
6. Logout functionality

**Kontrol Edilecekler:**
- [ ] JWT secret minimum uzunluk
- [ ] Token expiry süreleri makul mü?
- [ ] Refresh token rotation var mı?
- [ ] Token blacklist (logout sonrası invalidation)
- [ ] Password hash algorithm (bcrypt cost)
- [ ] Brute force protection (rate limiting)
- [ ] RBAC kontrolleri (admin, editor, viewer)

**Security Checklist:**
- [ ] Timing attack koruması (constant time comparison)
- [ ] Token claims validation (issuer, expiry, etc.)
- [ ] Sensitive data logging yapılmıyor mu?
- [ ] HTTP-only cookies (opsiyonel)

**İstenen Çıktı:**
- Güvenlik açıkları
- Eksik özellikler
- Best practice önerileri
```

---

### 5.5 BACKEND: Encryption Service

```markdown
## İnceleme Talebi: Encryption Service

**Dosya:** `backend/internal/crypto/encryptor.go`

**Beklenen İşlevler:**
1. AES-256-GCM encryption
2. Unique nonce per encryption
3. Key validation
4. Encrypt/Decrypt for:
   - Kubeconfig files
   - Service account tokens
   - CA certificates

**Kontrol Edilecekler:**
- [ ] Nonce generation (crypto/rand kullanılıyor mu?)
- [ ] Key size validation (32 bytes for AES-256)
- [ ] GCM tag included in ciphertext
- [ ] Error handling (key rotation scenarios)
- [ ] Memory cleanup (sensitive data zeroing)

**Test Senaryoları:**
1. Encrypt → Decrypt → Original data eşleşiyor mu?
2. Tampered ciphertext detect ediliyor mu?
3. Wrong key → Error dönüyor mu?

**İstenen Çıktı:**
- Kriptografik zayıflıklar
- Eksik validasyonlar
- Unit test coverage
```

---

### 5.6 BACKEND: Kubernetes Manager

```markdown
## İnceleme Talebi: Kubernetes Client Manager

**Dosya:** `backend/internal/k8s/manager.go`

**Beklenen İşlevler:**
1. Kubernetes client factory
2. Multiple authentication methods:
   - Service Account Token
   - Kubeconfig file
3. TLS configuration:
   - Skip TLS verify (dev only)
   - Custom CA certificate
   - System CA pool
4. Client caching
5. Namespace listing
6. Node listing

**Kontrol Edilecekler:**
- [ ] TLS configuration doğru mu?
- [ ] CA certificate PEM parsing
- [ ] Client timeout settings
- [ ] Connection error handling
- [ ] Client cache invalidation
- [ ] Context cancellation support

**Security Checklist:**
- [ ] skip_tls_verify sadece dev'de kullanılmalı
- [ ] Token/kubeconfig decrypt ediliyor mu?
- [ ] Credentials memory'de temizleniyor mu?

**İstenen Çıktı:**
- Bağlantı hataları
- TLS sorunları
- Performance önerileri
```

---

### 5.7 BACKEND: Cluster Service

```markdown
## İnceleme Talebi: Cluster Service

**Dosya:** `backend/internal/services/cluster_service.go`

**Beklenen İşlevler:**
1. Cluster CRUD operations
2. Credential encryption before storage
3. Connection test on create
4. Sync (namespace discovery)
5. Input validation

**Kontrol Edilecekler:**
- [ ] Name validation (K8s naming convention)
- [ ] URL validation (must be HTTPS)
- [ ] Environment validation
- [ ] Cluster type validation
- [ ] Duplicate name check
- [ ] Encryption before save
- [ ] Decryption on read
- [ ] Async connection test

**Validation Rules:**
- Cluster name: 1-63 chars, alphanumeric + dash
- API URL: Must start with https://
- Environment: production, staging, development, test
- Cluster type: kubernetes, openshift, rke2, eks, aks, gke

**İstenen Çıktı:**
- Validation eksiklikleri
- Encryption sorunları
- Error handling gaps
```

---

### 5.8 BACKEND: Handlers

```markdown
## İnceleme Talebi: HTTP Handlers

**Dosya:** `backend/internal/api/handlers/handlers.go`

**Beklenen İşlevler:**
1. Request parsing (JSON binding)
2. Input validation
3. Service calls
4. Response formatting
5. Error handling

**Kontrol Edilecekler:**
- [ ] Tüm service fonksiyon imzaları doğru mu?
- [ ] Request binding error handling
- [ ] UUID parsing error handling
- [ ] Consistent response format
- [ ] Proper HTTP status codes
- [ ] Audit context creation

**Response Format:**
```json
{
  "data": { ... },
  "error": null,
  "message": "success"
}
```

**Pagination Response:**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

**İstenen Çıktı:**
- Fonksiyon imza uyumsuzlukları
- Eksik error handling
- Response format tutarsızlıkları
```

---

### 5.9 FRONTEND: API Client

```markdown
## İnceleme Talebi: Frontend API Client

**Dosyalar:**
- `frontend/src/api/client.ts`
- `frontend/src/api/index.ts`

**Beklenen İşlevler:**
1. Axios instance configuration
2. Request interceptor (auth token injection)
3. Response interceptor (error handling)
4. Token refresh on 401
5. Request queue during refresh

**Kontrol Edilecekler:**
- [ ] Base URL configuration
- [ ] Auth header injection
- [ ] 401 handling (token refresh)
- [ ] Infinite refresh loop prevention
- [ ] Request retry after refresh
- [ ] Error response parsing
- [ ] Timeout configuration

**API Functions:**
Her endpoint için kontrol:
- [ ] Correct HTTP method
- [ ] Correct URL path
- [ ] Request body format
- [ ] Response type

**İstenen Çıktı:**
- Type mismatches
- Missing endpoints
- Error handling gaps
```

---

### 5.10 FRONTEND: Pages & Components

```markdown
## İnceleme Talebi: Frontend Pages

**Dosyalar:** `frontend/src/pages/*.tsx`

**Her Sayfa İçin Kontrol:**
- [ ] Data fetching (useQuery)
- [ ] Mutations (useMutation)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Form validation
- [ ] TypeScript types
- [ ] Responsive design

**Önemli Sayfalar:**
1. Login.tsx - Auth flow
2. Dashboard.tsx - Stats display
3. Clusters.tsx - List + actions
4. CreateCluster.tsx - Complex form
5. Namespaces.tsx - List + filters
6. NamespaceDetail.tsx - Detail view

**Form Validation (CreateCluster):**
- [ ] Required fields
- [ ] Format validation
- [ ] Error messages
- [ ] File upload (kubeconfig, CA cert)
- [ ] Base64 encoding

**İstenen Çıktı:**
- UI/UX sorunları
- Type errors
- Missing validations
- Accessibility issues
```

---

### 5.11 INFRASTRUCTURE: Docker

```markdown
## İnceleme Talebi: Docker Configuration

**Dosyalar:**
- `docker/Dockerfile.api`
- `docker/Dockerfile.ui`
- `docker-compose.yml`
- `docker-compose.dev.yml`

**Dockerfile Kontrolleri:**
- [ ] Multi-stage build
- [ ] Non-root user
- [ ] Minimal base image (alpine/distroless)
- [ ] Health check
- [ ] Proper COPY order (cache optimization)
- [ ] No secrets in image

**Docker Compose Kontrolleri:**
- [ ] Required environment variables
- [ ] Health checks
- [ ] Restart policy
- [ ] Volume mounts
- [ ] Network configuration
- [ ] Resource limits

**Security Checklist:**
- [ ] No hardcoded passwords
- [ ] Secrets via environment or files
- [ ] Read-only root filesystem (optional)
- [ ] Dropped capabilities

**İstenen Çıktı:**
- Security issues
- Build optimization suggestions
- Missing configurations
```

---

### 5.12 INFRASTRUCTURE: Helm Chart

```markdown
## İnceleme Talebi: Helm Chart

**Dosyalar:** `helm/kubeatlas/*`

**Kontrol Edilecekler:**
- [ ] Chart.yaml metadata
- [ ] values.yaml defaults
- [ ] Secret management
- [ ] ConfigMap management
- [ ] Deployment specs
- [ ] Service specs
- [ ] Ingress specs
- [ ] RBAC (if needed)
- [ ] PodSecurityPolicy/PodSecurityStandard
- [ ] Resource limits/requests
- [ ] Liveness/Readiness probes
- [ ] HPA (optional)

**Template Kontrolleri:**
- [ ] Proper indentation
- [ ] Value references correct
- [ ] Conditional logic works
- [ ] Labels consistent

**helm lint ve helm template Çalıştır:**
```bash
helm lint helm/kubeatlas
helm template kubeatlas helm/kubeatlas --debug
```

**İstenen Çıktı:**
- Template errors
- Missing configurations
- Security improvements
```

---

### 5.13 INFRASTRUCTURE: CI/CD

```markdown
## İnceleme Talebi: GitHub Actions CI/CD

**Dosya:** `.github/workflows/ci.yml`

**Kontrol Edilecekler:**
- [ ] Trigger conditions (push, PR)
- [ ] Job dependencies
- [ ] Caching (Go modules, npm)
- [ ] Test execution
- [ ] Linting
- [ ] Security scanning
- [ ] Docker build
- [ ] Artifact upload
- [ ] Deployment steps

**Jobs:**
1. backend-ci: lint, test, build
2. frontend-ci: lint, type-check, test, build
3. security-scan: Trivy
4. docker-build: images
5. deploy-staging: optional
6. deploy-production: optional

**İstenen Çıktı:**
- Eksik steps
- Security improvements
- Performance optimizations
```

---

## 6. KURULUM VE TEST REHBERİ

### 6.1 Development Ortamı Kurulumu

```bash
# 1. Repository'yi clone et
git clone https://github.com/ozcanfpolat/kubeatlas.git
cd kubeatlas

# 2. Environment variables
cp .env.example .env
# .env dosyasını düzenle

# 3. Development ortamını başlat
make dev

# 4. Seed data yükle
make db-seed

# 5. Erişim
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
# Adminer:  http://localhost:8081
# Default login: admin@kubeatlas.local / admin123
```

### 6.2 Manuel Test Senaryoları

```markdown
## Test 1: Authentication
1. Login with valid credentials → Success
2. Login with invalid password → 401 Error
3. Access protected route without token → 401 Error
4. Refresh token → New access token
5. Logout → Token invalidated (if implemented)

## Test 2: Cluster Management
1. Create cluster with valid data → Success
2. Create cluster with duplicate name → Error
3. Create cluster with invalid URL → Validation error
4. Sync cluster → Namespaces discovered
5. Delete cluster → Soft deleted

## Test 3: Namespace Management
1. List namespaces → Paginated list
2. Filter by cluster → Filtered list
3. Update namespace ownership → Success
4. View namespace dependencies → Graph displayed

## Test 4: API Rate Limiting
1. Send 100 requests in 1 minute → Success
2. Send 101st request → 429 Too Many Requests
```

### 6.3 Backend Test Komutları

```bash
cd backend

# Tüm testleri çalıştır
go test -v ./...

# Coverage ile
go test -v -race -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Belirli package
go test -v ./internal/services/...

# Belirli test
go test -v -run TestEncryption ./internal/crypto/...
```

### 6.4 Frontend Test Komutları

```bash
cd frontend

# Testleri çalıştır
npm run test

# Coverage ile
npm run test:coverage

# E2E testler (Cypress)
npm run test:e2e
```

### 6.5 Linting

```bash
# Backend
cd backend && golangci-lint run --timeout=5m

# Frontend
cd frontend && npm run lint && npm run type-check
```

---

## 7. PRODUCTION READINESS CHECKLIST

### 7.1 Security

```
□ JWT secret en az 32 karakter
□ ENCRYPTION_KEY en az 32 karakter (hex)
□ Database password güçlü
□ HTTPS enforced (production'da)
□ CORS properly configured
□ Rate limiting active
□ Input validation on all endpoints
□ SQL injection protection verified
□ XSS protection (frontend)
□ CSRF protection (if using cookies)
□ Secrets not in code/logs
□ Audit logging enabled
```

### 7.2 Reliability

```
□ Health check endpoints working
□ Graceful shutdown implemented
□ Database connection pooling
□ Retry logic for external calls
□ Circuit breaker (optional)
□ Error handling comprehensive
□ Logging structured (JSON)
□ Metrics exposed
```

### 7.3 Performance

```
□ Database indexes defined
□ Query optimization
□ Connection pool tuned
□ Response compression
□ Static asset caching
□ API pagination
□ Lazy loading (frontend)
```

### 7.4 Observability

```
□ Structured logging
□ Request ID tracing
□ Error tracking
□ Metrics (Prometheus)
□ Dashboards (Grafana)
□ Alerting rules
```

### 7.5 Documentation

```
□ README comprehensive
□ API documentation (OpenAPI)
□ Deployment guide
□ Architecture diagrams
□ Runbook for operations
□ Changelog maintained
```

### 7.6 Testing

```
□ Unit tests (>70% coverage)
□ Integration tests
□ E2E tests
□ Security tests
□ Load tests
□ CI/CD pipeline green
```

---

## 8. BİLİNEN SORUNLAR VE ÇÖZÜMLER

### 8.1 Düzeltilmiş Sorunlar (Mart 2026)

| # | Sorun | Dosya | Çözüm |
|---|-------|-------|-------|
| 1 | Missing imports (crypto/tls, net/http) | k8s/manager.go | Import'lar eklendi |
| 2 | SQL injection in OrderBy | repositories/base.go | Whitelist validation |
| 3 | JWT secret not validated | config/config.go | Min 32 char validation |
| 4 | Missing Logout function | auth_service.go | Function implemented |
| 5 | OrganizationID vs OrgID | handlers.go | Field name fixed |
| 6 | Function signature mismatches | handlers.go | Aligned with services |
| 7 | Syntax error in CORS | logger.go | Duplicate code removed |
| 8 | Magic numbers | validation.go, cluster_service.go | Constants added |

### 8.2 Bilinen Kısıtlamalar

| # | Kısıtlama | Etki | Workaround |
|---|-----------|------|------------|
| 1 | Token blacklist yok | Logout sonrası token hala valid | Short expiry kullan |
| 2 | Refresh token rotation yok | Token reuse mümkün | Single device kullan |
| 3 | Redis yok | Rate limit memory-based | Single instance için OK |
| 4 | Prometheus metrics basic | Sadece uptime | prometheus/client_golang ekle |

### 8.3 Planlanan İyileştirmeler

| # | İyileştirme | Öncelik | Effort |
|---|-------------|---------|--------|
| 1 | Redis-based token blacklist | Yüksek | Orta |
| 2 | Refresh token rotation | Yüksek | Düşük |
| 3 | Prometheus metrics | Orta | Orta |
| 4 | OpenTelemetry tracing | Düşük | Yüksek |
| 5 | WebSocket for real-time | Düşük | Yüksek |

---

## 📝 KULLANIM NOTU

Bu dokümanı bir AI modeline verirken:

1. **Bileşen seçin:** Hangi bileşeni incelemek istiyorsanız ilgili şablonu kopyalayın
2. **Dosyaları paylaşın:** İlgili kaynak dosyaları da sohbete ekleyin
3. **Spesifik sorun:** Varsa bilinen bir sorunu belirtin
4. **Çıktı formatı:** İstenen çıktı formatını netleştirin

**Örnek Prompt:**
```
Bu projenin backend authentication sistemini incelemeni istiyorum.

[PROJECT_REVIEW_GUIDE.md'den 5.4 Authentication şablonunu yapıştır]

İşte ilgili dosyalar:
- backend/internal/api/middleware/auth.go
- backend/internal/services/auth_service.go

Lütfen güvenlik açıklarını ve eksiklikleri bul.
```

---

**Son Güncelleme:** Mart 2026  
**Versiyon:** 1.0  
**Yazar:** Claude (Anthropic) & Özcan
