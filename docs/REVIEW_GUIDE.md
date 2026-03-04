# KubeAtlas - Kapsamlı İnceleme ve Sorgulama Rehberi

Bu doküman, KubeAtlas projesinin tüm bileşenlerini sistematik olarak incelemek için hazırlanmış bir yol haritasıdır. AI modelleri veya geliştiriciler bu rehberi kullanarak projenin production-ready durumda olup olmadığını değerlendirebilir.

---

## 📋 İÇİNDEKİLER

1. [Proje Genel Bakış](#1-proje-genel-bakış)
2. [Mimari Yapı](#2-mimari-yapı)
3. [Backend İnceleme Rehberi](#3-backend-inceleme-rehberi)
4. [Frontend İnceleme Rehberi](#4-frontend-inceleme-rehberi)
5. [Veritabanı İnceleme Rehberi](#5-veritabanı-inceleme-rehberi)
6. [Güvenlik İnceleme Rehberi](#6-güvenlik-inceleme-rehberi)
7. [DevOps/Deployment İnceleme Rehberi](#7-devopsdeployment-inceleme-rehberi)
8. [Test İnceleme Rehberi](#8-test-inceleme-rehberi)
9. [Dokümantasyon İnceleme Rehberi](#9-dokümantasyon-inceleme-rehberi)
10. [Production Readiness Checklist](#10-production-readiness-checklist)

---

## 1. PROJE GENEL BAKIŞ

### 1.1 Proje Amacı
KubeAtlas, birden fazla Kubernetes cluster'ını tek bir arayüzden yönetmek ve envanterini tutmak için geliştirilmiş bir platformdur.

### 1.2 Temel Özellikler
- Multi-cluster Kubernetes inventory yönetimi
- Namespace ownership tracking (Team, User, Business Unit)
- Contact information management
- SLA configuration (Availability, RTO, RPO)
- Internal/External dependency mapping
- Document management
- Audit trail
- RBAC (Role-Based Access Control)

### 1.3 Teknoloji Stack
| Katman | Teknoloji |
|--------|-----------|
| Backend | Go 1.21, Gin Framework |
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Database | PostgreSQL 15 |
| Cache | Redis (opsiyonel) |
| Container | Docker, Docker Compose |
| Orchestration | Kubernetes, Helm |
| CI/CD | GitHub Actions |

### 1.4 Dizin Yapısı
```
kubeatlas/
├── backend/                 # Go API server
│   ├── cmd/api/            # Main entry point
│   ├── internal/           # Internal packages
│   │   ├── api/           # HTTP handlers, middleware
│   │   ├── config/        # Configuration
│   │   ├── crypto/        # Encryption utilities
│   │   ├── database/      # DB connection, repositories
│   │   ├── k8s/           # Kubernetes client
│   │   ├── models/        # Data models
│   │   └── services/      # Business logic
│   └── migrations/        # SQL migrations
├── frontend/               # React application
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── types/         # TypeScript types
│   └── public/
├── helm/kubeatlas/         # Helm chart
├── docker/                 # Dockerfiles
├── database/               # SQL scripts
└── docs/                   # Documentation
```

---

## 2. MİMARİ YAPI

### 2.1 Sistem Mimarisi
```
┌─────────────────────────────────────────────────────────────────┐
│                         KULLANICI                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                         │
│  • Dashboard, Cluster List, Namespace Detail                     │
│  • JWT Token Management                                          │
│  • API Client with Retry/Refresh                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Go/Gin)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Handlers    │  │  Middleware  │  │  Services    │          │
│  │  (REST API)  │──│  (Auth/CORS) │──│  (Business)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│          │                                    │                  │
│          ▼                                    ▼                  │
│  ┌──────────────┐                    ┌──────────────┐          │
│  │ Repositories │                    │  K8s Manager │          │
│  │   (Data)     │                    │  (Clients)   │          │
│  └──────────────┘                    └──────────────┘          │
└─────────┬───────────────────────────────────┬───────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────────────┐
│    PostgreSQL       │           │   Target Kubernetes         │
│    (Encrypted)      │           │   Clusters (TLS/mTLS)       │
└─────────────────────┘           └─────────────────────────────┘
```

### 2.2 Veri Akışı
```
1. Cluster Ekleme:
   User → Frontend → Backend → Encrypt Credentials → PostgreSQL
                          └→ Test Connection → K8s Cluster

2. Cluster Sync:
   Scheduler/Manual → Backend → K8s Manager → Get Namespaces
                                    └→ Update PostgreSQL

3. Authentication:
   User → Frontend → Backend → Verify Password → Generate JWT
                                    └→ Return Access + Refresh Token
```

---

## 3. BACKEND İNCELEME REHBERİ

### 3.1 İncelenecek Dosyalar ve Sorgulanacak Konular

#### 3.1.1 Entry Point
**Dosya:** `backend/cmd/api/main.go`

**Sorgulanacak Konular:**
- [ ] Logger initialization hata kontrolü var mı?
- [ ] Graceful shutdown implementasyonu var mı?
- [ ] Health/Ready endpoint'leri tanımlı mı?
- [ ] Rate limiting middleware uygulanmış mı?
- [ ] CORS konfigürasyonu doğru mu?
- [ ] Server timeout'ları yeterli mi? (Read, Write, Idle)
- [ ] Environment-based configuration kullanılıyor mu?

**Örnek Sorgular:**
```
"main.go dosyasını incele. Graceful shutdown var mı? Logger error handling yapılıyor mu?"
"Server timeout değerleri nedir? Production için yeterli mi?"
"Rate limiting hangi endpoint'lere uygulanmış?"
```

#### 3.1.2 Configuration
**Dosya:** `backend/internal/config/config.go`

**Sorgulanacak Konular:**
- [ ] Tüm environment variable'lar tanımlı mı?
- [ ] Production mode için secret validation var mı?
- [ ] Default değerler güvenli mi?
- [ ] Database connection string doğru oluşturuluyor mu?
- [ ] JWT secret minimum uzunluk kontrolü var mı?
- [ ] Encryption key validation var mı?

**Örnek Sorgular:**
```
"config.go dosyasını incele. Production mode'da hangi validation'lar yapılıyor?"
"Hangi environment variable'lar zorunlu, hangileri opsiyonel?"
"Default değerler güvenlik açısından risk oluşturuyor mu?"
```

#### 3.1.3 API Handlers
**Dosya:** `backend/internal/api/handlers/handlers.go`

**Sorgulanacak Konular:**
- [ ] Input validation yapılıyor mu?
- [ ] Error handling tutarlı mı?
- [ ] Response format standart mı?
- [ ] Pagination doğru implement edilmiş mi?
- [ ] Audit context doğru oluşturuluyor mu?
- [ ] Service method imzaları uyumlu mu?

**Örnek Sorgular:**
```
"handlers.go dosyasındaki tüm handler fonksiyonlarını listele."
"Input validation eksik olan handler'lar var mı?"
"Error response formatı tutarlı mı?"
```

#### 3.1.4 Middleware
**Dosyalar:**
- `backend/internal/api/middleware/auth.go`
- `backend/internal/api/middleware/ratelimit.go`
- `backend/internal/api/middleware/logger.go`
- `backend/internal/api/middleware/validation.go`

**Sorgulanacak Konular:**
- [ ] JWT validation doğru mu? (issuer, expiry, signature)
- [ ] RBAC kontrolleri çalışıyor mu?
- [ ] Rate limiting algoritması (token bucket) doğru mu?
- [ ] Request logging yeterli mi?
- [ ] Panic recovery var mı?
- [ ] Input sanitization yapılıyor mu?

**Örnek Sorgular:**
```
"auth.go'daki JWT validation sürecini incele. Hangi claim'ler kontrol ediliyor?"
"Rate limiting nasıl çalışıyor? Memory leak riski var mı?"
"Panic recovery middleware'i tüm hataları yakalıyor mu?"
```

#### 3.1.5 Services (Business Logic)
**Dosyalar:**
- `backend/internal/services/auth_service.go`
- `backend/internal/services/cluster_service.go`
- `backend/internal/services/namespace_service.go`
- `backend/internal/services/org_services.go`
- `backend/internal/services/audit_service.go`

**Sorgulanacak Konular:**
- [ ] Business logic doğru mu?
- [ ] Transaction kullanılması gereken yerlerde kullanılıyor mu?
- [ ] Error handling ve error types tanımlı mı?
- [ ] Encryption/Decryption doğru yapılıyor mu?
- [ ] Audit logging yapılıyor mu?
- [ ] Input validation service katmanında da var mı?

**Örnek Sorgular:**
```
"cluster_service.go'daki Create fonksiyonunu incele. Validation adımları neler?"
"Şifreli veriler (kubeconfig, token, CA cert) nasıl saklanıyor?"
"Audit logging hangi işlemlerde yapılıyor?"
```

#### 3.1.6 Database Repositories
**Dosyalar:**
- `backend/internal/database/repositories/base.go`
- `backend/internal/database/repositories/cluster_repo.go`
- `backend/internal/database/repositories/namespace_repo.go`
- `backend/internal/database/repositories/team_user_repo.go`

**Sorgulanacak Konular:**
- [ ] SQL injection koruması var mı? (parameterized queries)
- [ ] Soft delete implementasyonu doğru mu?
- [ ] Pagination doğru çalışıyor mu?
- [ ] Query builder güvenli mi?
- [ ] Connection pooling ayarları yeterli mi?
- [ ] Transaction management var mı?

**Örnek Sorgular:**
```
"base.go'daki QueryBuilder SQL injection'a karşı güvenli mi?"
"Soft delete nasıl implement edilmiş? deleted_at kontrolü tüm query'lerde var mı?"
"Pagination implementasyonunu incele. Büyük veri setlerinde performans sorunu olur mu?"
```

#### 3.1.7 Kubernetes Manager
**Dosya:** `backend/internal/k8s/manager.go`

**Sorgulanacak Konular:**
- [ ] TLS/mTLS konfigürasyonu doğru mu?
- [ ] Self-signed CA certificate desteği var mı?
- [ ] skip_tls_verify seçeneği çalışıyor mu?
- [ ] Client caching yapılıyor mu?
- [ ] Timeout değerleri uygun mu?
- [ ] Error handling yeterli mi?

**Örnek Sorgular:**
```
"k8s/manager.go'daki TLS konfigürasyonunu incele. CA certificate nasıl kullanılıyor?"
"Kubernetes client'ları cache'leniyor mu? Memory leak riski var mı?"
"Hangi Kubernetes API'ları kullanılıyor?"
```

#### 3.1.8 Encryption
**Dosya:** `backend/internal/crypto/encryptor.go`

**Sorgulanacak Konular:**
- [ ] AES-256-GCM doğru implement edilmiş mi?
- [ ] Nonce/IV random mı ve yeterli uzunlukta mı?
- [ ] Key derivation güvenli mi?
- [ ] Encryption/Decryption hataları handle ediliyor mu?

**Örnek Sorgular:**
```
"encryptor.go'daki AES-256-GCM implementasyonunu incele. Güvenli mi?"
"Nonce nasıl oluşturuluyor? Her encryption için unique mi?"
```

### 3.2 Backend Compile Test
```bash
cd backend && go build -o /tmp/test-build ./cmd/api
```

### 3.3 Backend Unit Test
```bash
cd backend && go test -v -race ./...
```

---

## 4. FRONTEND İNCELEME REHBERİ

### 4.1 İncelenecek Dosyalar

#### 4.1.1 API Client
**Dosya:** `frontend/src/api/client.ts`

**Sorgulanacak Konular:**
- [ ] Token refresh logic doğru mu?
- [ ] Infinite refresh loop koruması var mı?
- [ ] Error handling tutarlı mı?
- [ ] Request/Response interceptors çalışıyor mu?
- [ ] Base URL konfigürasyonu doğru mu?

**Örnek Sorgular:**
```
"client.ts'deki token refresh mekanizmasını incele. 401 hatalarını nasıl handle ediyor?"
"Birden fazla concurrent request aynı anda 401 alırsa ne oluyor?"
```

#### 4.1.2 API Functions
**Dosya:** `frontend/src/api/index.ts`

**Sorgulanacak Konular:**
- [ ] Tüm API endpoint'leri tanımlı mı?
- [ ] Response type'ları doğru mu?
- [ ] Error handling var mı?
- [ ] Pagination parametreleri doğru mu?

**Örnek Sorgular:**
```
"api/index.ts'deki tüm API fonksiyonlarını listele."
"Backend API response formatıyla frontend type'ları uyumlu mu?"
```

#### 4.1.3 TypeScript Types
**Dosya:** `frontend/src/types/index.ts`

**Sorgulanacak Konular:**
- [ ] Backend model'leriyle uyumlu mu?
- [ ] Optional/Required field'lar doğru mu?
- [ ] Enum/Union type'lar tutarlı mı?

**Örnek Sorgular:**
```
"types/index.ts'deki Cluster type'ını backend model'iyle karşılaştır."
"Eksik veya yanlış tanımlanmış type'lar var mı?"
```

#### 4.1.4 Pages
**Dosyalar:**
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Clusters.tsx`
- `frontend/src/pages/CreateCluster.tsx`
- `frontend/src/pages/ClusterDetail.tsx`
- `frontend/src/pages/Namespaces.tsx`
- `frontend/src/pages/NamespaceDetail.tsx`
- `frontend/src/pages/Login.tsx`

**Sorgulanacak Konular:**
- [ ] Loading states handle ediliyor mu?
- [ ] Error states gösteriliyor mu?
- [ ] Form validation var mı?
- [ ] Responsive design uygulanmış mı?
- [ ] Accessibility (a11y) düşünülmüş mü?

**Örnek Sorgular:**
```
"CreateCluster.tsx'deki form validation'ı incele. Hangi alanlar validate ediliyor?"
"Error state'leri kullanıcıya nasıl gösteriliyor?"
```

#### 4.1.5 Components
**Dizin:** `frontend/src/components/`

**Sorgulanacak Konular:**
- [ ] Component'ler reusable mı?
- [ ] Props type'ları tanımlı mı?
- [ ] State management doğru mu?
- [ ] Memory leak riskleri var mı? (useEffect cleanup)

### 4.2 Frontend Build Test
```bash
cd frontend && npm ci && npm run build
```

### 4.3 Frontend Lint/Type Check
```bash
cd frontend && npm run lint && npm run type-check
```

---

## 5. VERİTABANI İNCELEME REHBERİ

### 5.1 İncelenecek Dosyalar

#### 5.1.1 Schema
**Dosya:** `database/migrations/001_initial_schema.sql`

**Sorgulanacak Konular:**
- [ ] Tüm tablolar tanımlı mı?
- [ ] Primary key'ler UUID mi?
- [ ] Foreign key'ler tanımlı mı?
- [ ] Index'ler yeterli mi?
- [ ] BYTEA column'ları encrypted data için var mı?
- [ ] Soft delete için deleted_at column'ları var mı?
- [ ] Audit tablosu var mı?

**Örnek Sorgular:**
```
"001_initial_schema.sql'deki tüm tabloları listele."
"clusters tablosunda hangi index'ler var? Yeterli mi?"
"Encrypted data için hangi column'lar kullanılıyor?"
```

#### 5.1.2 Seed Data
**Dosya:** `database/seed.sql`

**Sorgulanacak Konular:**
- [ ] Default organization tanımlı mı?
- [ ] Default admin user var mı?
- [ ] Test data production-safe mı?

### 5.2 Database Connection Test
```bash
psql -h localhost -U kubeatlas -d kubeatlas -c "SELECT 1"
```

### 5.3 Migration Test
```bash
# Check pending migrations
cd backend && go run ./cmd/migrate status
```

---

## 6. GÜVENLİK İNCELEME REHBERİ

### 6.1 Authentication & Authorization

**Kontrol Listesi:**
- [ ] JWT secret minimum 32 karakter mi?
- [ ] JWT expiry süresi uygun mu? (access: 15-60 dk, refresh: 7-30 gün)
- [ ] Password hashing bcrypt kullanıyor mu?
- [ ] Bcrypt cost yeterli mi? (minimum 10)
- [ ] RBAC kontrolleri tüm endpoint'lerde var mı?
- [ ] Token refresh işlemi güvenli mi?
- [ ] Logout token invalidation yapıyor mu?

**Örnek Sorgular:**
```
"JWT token'ın expiry süresi nedir? Refresh token nasıl çalışıyor?"
"Password hashing için hangi algoritma kullanılıyor? Cost faktörü nedir?"
"Admin-only endpoint'ler hangileri? RBAC kontrolü nasıl yapılıyor?"
```

### 6.2 Data Security

**Kontrol Listesi:**
- [ ] Sensitive data (kubeconfig, token) encrypt ediliyor mu?
- [ ] Encryption key güvenli bir şekilde saklanıyor mu?
- [ ] TLS/HTTPS zorunlu mu?
- [ ] Database connection SSL kullanıyor mu?
- [ ] Logs'da sensitive data var mı?

**Örnek Sorgular:**
```
"Hangi veriler encrypt ediliyor? Encryption algoritması nedir?"
"Database connection SSL kullanıyor mu?"
"Log dosyalarında password veya token yazdırılıyor mu?"
```

### 6.3 Input Validation

**Kontrol Listesi:**
- [ ] SQL injection koruması var mı?
- [ ] XSS koruması var mı?
- [ ] Path traversal koruması var mı?
- [ ] File upload validation var mı?
- [ ] Request body size limiti var mı?

**Örnek Sorgular:**
```
"SQL query'leri parameterized mi? String concatenation kullanılıyor mu?"
"User input'ları sanitize ediliyor mu?"
"File upload için hangi validation'lar var?"
```

### 6.4 Network Security

**Kontrol Listesi:**
- [ ] CORS policy doğru mu?
- [ ] Rate limiting var mı?
- [ ] Helmet-style security headers var mı?
- [ ] HTTPS redirect var mı?

---

## 7. DEVOPS/DEPLOYMENT İNCELEME REHBERİ

### 7.1 Docker

#### 7.1.1 Dockerfiles
**Dosyalar:**
- `docker/Dockerfile.api`
- `docker/Dockerfile.ui`

**Sorgulanacak Konular:**
- [ ] Multi-stage build kullanılıyor mu?
- [ ] Non-root user ile çalışıyor mu?
- [ ] Minimal base image kullanılıyor mu? (alpine, distroless)
- [ ] HEALTHCHECK tanımlı mı?
- [ ] .dockerignore dosyası var mı?
- [ ] Secret'lar build-time'da expose edilmiyor mu?

**Örnek Sorgular:**
```
"Dockerfile.api'yi incele. Multi-stage build var mı? Final image boyutu ne kadar?"
"Container non-root user ile mi çalışıyor?"
"Health check nasıl yapılıyor?"
```

#### 7.1.2 Docker Compose
**Dosyalar:**
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`

**Sorgulanacak Konular:**
- [ ] Environment variable'lar doğru mu?
- [ ] Volume mount'lar güvenli mi?
- [ ] Network isolation var mı?
- [ ] Health check'ler tanımlı mı?
- [ ] Logging konfigürasyonu var mı?
- [ ] Resource limits tanımlı mı?

**Örnek Sorgular:**
```
"docker-compose.prod.yml'daki tüm environment variable'ları listele."
"Production için hangi secret'lar gerekli?"
"Container'lar arası network izolasyonu var mı?"
```

### 7.2 Kubernetes/Helm

#### 7.2.1 Helm Chart
**Dizin:** `helm/kubeatlas/`

**Sorgulanacak Konular:**
- [ ] values.yaml varsayılan değerleri güvenli mi?
- [ ] Secret'lar Kubernetes Secret olarak mı saklanıyor?
- [ ] Resource requests/limits tanımlı mı?
- [ ] Liveness/Readiness probe'ları var mı?
- [ ] NetworkPolicy var mı?
- [ ] PodSecurityPolicy/PodSecurityStandards var mı?
- [ ] ServiceAccount RBAC'ı minimum privilege mı?
- [ ] Ingress TLS konfigürasyonu doğru mu?

**Örnek Sorgular:**
```
"values.yaml'daki tüm konfigürasyon seçeneklerini listele."
"Deployment'ta hangi probe'lar tanımlı?"
"RBAC konfigürasyonu ne kadar restrictive?"
```

**İncelenecek Dosyalar:**
- `helm/kubeatlas/values.yaml`
- `helm/kubeatlas/templates/deployment.yaml`
- `helm/kubeatlas/templates/service.yaml`
- `helm/kubeatlas/templates/ingress.yaml`
- `helm/kubeatlas/templates/secrets.yaml`
- `helm/kubeatlas/templates/configmap.yaml`

### 7.3 CI/CD

#### 7.3.1 GitHub Actions
**Dosya:** `.github/workflows/ci.yml`

**Sorgulanacak Konular:**
- [ ] Lint step var mı?
- [ ] Test step var mı?
- [ ] Security scan var mı?
- [ ] Build step var mı?
- [ ] Deploy step var mı?
- [ ] Secret'lar güvenli mi? (GitHub Secrets)
- [ ] Branch protection rules var mı?

**Örnek Sorgular:**
```
"CI/CD pipeline'daki tüm job'ları ve step'leri listele."
"Security scan hangi tool'u kullanıyor?"
"Docker image'lar hangi registry'ye push ediliyor?"
```

---

## 8. TEST İNCELEME REHBERİ

### 8.1 Backend Tests

**Dosyalar:**
- `backend/internal/crypto/encryptor_test.go`
- `backend/internal/models/models_test.go`
- `backend/internal/services/auth_service_test.go`

**Sorgulanacak Konular:**
- [ ] Unit test coverage yeterli mi? (hedef: %70+)
- [ ] Integration test'ler var mı?
- [ ] Mock'lar doğru kullanılıyor mu?
- [ ] Edge case'ler test ediliyor mu?
- [ ] Error case'ler test ediliyor mu?

**Örnek Sorgular:**
```
"auth_service_test.go'daki test case'leri listele."
"Hangi fonksiyonların unit test'i yok?"
"Test coverage raporu nasıl çıkarılıyor?"
```

### 8.2 Frontend Tests

**Dosyalar:**
- `frontend/src/utils.test.ts`
- `frontend/vitest.config.ts`

**Sorgulanacak Konular:**
- [ ] Component test'leri var mı?
- [ ] Hook test'leri var mı?
- [ ] API mock'ları var mı?
- [ ] E2E test'ler var mı?

**Örnek Sorgular:**
```
"Frontend'de hangi dosyaların test'i var?"
"Vitest konfigürasyonu coverage raporlama yapıyor mu?"
```

### 8.3 Test Komutları
```bash
# Backend
cd backend && go test -v -race -coverprofile=coverage.out ./...
go tool cover -func=coverage.out

# Frontend
cd frontend && npm run test:coverage
```

---

## 9. DOKÜMANTASYON İNCELEME REHBERİ

### 9.1 İncelenecek Dosyalar

| Dosya | İçerik |
|-------|--------|
| `README.md` | Proje tanıtımı, kurulum, kullanım |
| `docs/DEPLOYMENT.md` | Production deployment rehberi |
| `docs/API.md` | API dokümantasyonu |
| `CHANGELOG.md` | Versiyon geçmişi |
| `CONTRIBUTING.md` | Katkı rehberi |
| `.env.example` | Environment variable örnekleri |

**Sorgulanacak Konular:**
- [ ] README.md güncel mi?
- [ ] Kurulum adımları çalışıyor mu?
- [ ] API dokümantasyonu tam mı?
- [ ] Environment variable'lar açıklanmış mı?
- [ ] Troubleshooting bölümü var mı?

---

## 10. PRODUCTION READINESS CHECKLIST

### 10.1 Kritik Kontroller

#### Security
- [ ] JWT secret production'da değiştirildi
- [ ] Encryption key production'da değiştirildi
- [ ] Database password güçlü
- [ ] TLS/HTTPS aktif
- [ ] Rate limiting aktif
- [ ] CORS policy restrictive

#### Reliability
- [ ] Health check endpoint'leri çalışıyor
- [ ] Graceful shutdown implement edilmiş
- [ ] Database connection pooling ayarlanmış
- [ ] Timeout'lar production-uygun
- [ ] Error handling kapsamlı

#### Observability
- [ ] Structured logging aktif
- [ ] Metrics endpoint var
- [ ] Request tracing var
- [ ] Audit logging aktif

#### Scalability
- [ ] Stateless backend (horizontal scaling uygun)
- [ ] Database connection limitleri ayarlanmış
- [ ] Cache stratejisi belirlenmiş
- [ ] Kubernetes HPA konfigüre edilebilir

#### Backup & Recovery
- [ ] Database backup stratejisi var
- [ ] Disaster recovery planı var
- [ ] Encryption key backup'ı var

### 10.2 Deployment Checklist

```
PRE-DEPLOYMENT:
□ Tüm testler geçiyor
□ Security scan temiz
□ Docker image'lar build ediliyor
□ Helm chart lint geçiyor
□ Secrets oluşturuldu
□ Database migration'lar hazır

DEPLOYMENT:
□ Database migration çalıştırıldı
□ Helm install/upgrade başarılı
□ Pod'lar Running durumunda
□ Health check'ler geçiyor
□ Ingress erişilebilir

POST-DEPLOYMENT:
□ Smoke test geçiyor
□ Login çalışıyor
□ Cluster ekleme çalışıyor
□ Logs normal
□ Metrics toplanıyor
```

---

## 11. SORGULAMA ŞABLONLARI

### 11.1 Genel İnceleme Başlatma
```
"KubeAtlas projesini inceliyorum. Önce dizin yapısını göster:
- Backend: backend/ dizini
- Frontend: frontend/ dizini
- Database: database/ dizini
- Helm: helm/ dizini
Her dizinin içeriğini listele."
```

### 11.2 Belirli Bir Bileşeni İnceleme
```
"[DOSYA_ADI] dosyasını incele:
1. Dosyanın amacı nedir?
2. Hangi fonksiyonlar/class'lar var?
3. Error handling nasıl yapılıyor?
4. Security açısından risk var mı?
5. Improvement önerilerin neler?"
```

### 11.3 Güvenlik Taraması
```
"Güvenlik açısından şu dosyaları incele:
- backend/internal/api/middleware/auth.go
- backend/internal/crypto/encryptor.go
- backend/internal/services/auth_service.go

Özellikle şunlara bak:
1. JWT validation
2. Password hashing
3. Encryption/Decryption
4. SQL injection
5. Input validation"
```

### 11.4 Hata Arama
```
"[DOSYA_ADI] dosyasında şunları kontrol et:
1. Syntax hatası var mı?
2. Import'lar doğru mu?
3. Fonksiyon imzaları uyumlu mu?
4. Error handling eksik mi?
5. Memory leak riski var mı?"
```

### 11.5 Production Readiness
```
"Projenin production-ready olup olmadığını değerlendir:
1. Security checklist
2. Error handling
3. Logging
4. Monitoring
5. Documentation
6. Test coverage
Her kategori için puan ver (1-10) ve eksikleri listele."
```

---

## 12. SORUN GİDERME REHBERİ

### 12.1 Yaygın Hatalar

| Hata | Olası Sebep | Çözüm |
|------|-------------|-------|
| `undefined: services.XxxRequest` | Type tanımı eksik | services/ dizininde type'ı tanımla |
| `too many arguments in call` | Fonksiyon imzası uyumsuz | Service ve handler imzalarını karşılaştır |
| `cannot use X as Y` | Type mismatch | Type dönüşümü veya imza düzeltmesi |
| `expected ';', found '('` | Syntax hatası | Eksik/fazla parantez veya noktalı virgül |
| `SQL injection detected` | String concatenation | Parameterized query kullan |

### 12.2 Debug Komutları
```bash
# Go syntax check
cd backend && go build ./...

# Go vet
cd backend && go vet ./...

# Lint
cd backend && golangci-lint run ./...

# TypeScript check
cd frontend && npx tsc --noEmit

# ESLint
cd frontend && npm run lint
```

---

## 13. VERSİYON GEÇMİŞİ

| Tarih | Değişiklik |
|-------|------------|
| 2026-03-04 | İlk versiyon oluşturuldu |

---

**Not:** Bu rehber sürekli güncellenmektedir. Yeni özellikler eklendikçe ilgili bölümler güncellenmelidir.
