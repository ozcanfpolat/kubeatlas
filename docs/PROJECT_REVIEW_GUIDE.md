# KubeAtlas - Kapsamlı Proje İnceleme ve Geliştirme Rehberi

> Bu döküman, KubeAtlas projesinin tüm bileşenlerini incelemek, hataları bulmak ve production-ready hale getirmek için kullanılacak kapsamlı bir rehberdir.

---

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Mimari Genel Bakış](#2-mimari-genel-bakış)
3. [Bileşen Listesi](#3-bileşen-listesi)
4. [İnceleme Yol Haritası](#4-inceleme-yol-haritası)
5. [Bileşen Bazlı Sorgular](#5-bileşen-bazlı-sorgular)
6. [Test Stratejisi](#6-test-stratejisi)
7. [Güvenlik Kontrol Listesi](#7-güvenlik-kontrol-listesi)
8. [Production Readiness Checklist](#8-production-readiness-checklist)
9. [Kurulum ve Çalıştırma](#9-kurulum-ve-çalıştırma)
10. [Sık Karşılaşılan Sorunlar](#10-sık-karşılaşılan-sorunlar)

---

## 1. Proje Özeti

### 1.1 KubeAtlas Nedir?

KubeAtlas, birden fazla Kubernetes cluster'ını tek bir arayüzden yönetmek ve izlemek için tasarlanmış bir **Multi-Cluster Kubernetes Inventory Management** sistemidir.

### 1.2 Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| **Multi-Cluster Yönetimi** | Birden fazla K8s cluster'ını tek noktadan yönetme |
| **Namespace Envanteri** | Tüm namespace'lerin sahiplik, SLA, bağımlılık bilgileri |
| **Bağımlılık Haritası** | İç ve dış bağımlılıkların görselleştirilmesi |
| **Doküman Yönetimi** | Cluster/namespace bazlı doküman saklama |
| **Audit Trail** | Tüm değişikliklerin loglanması |
| **RBAC** | Admin, Editor, Viewer rolleri |

### 1.3 Hedef Kullanıcılar

- Platform Engineering ekipleri
- DevOps mühendisleri
- SRE ekipleri
- Kubernetes cluster yöneticileri

### 1.4 Deployment Modeli

```
┌─────────────────────────────────────────────────────────────┐
│                    MANAGEMENT CLUSTER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ KubeAtlas   │  │ KubeAtlas   │  │ PostgreSQL  │          │
│  │ Backend     │  │ Frontend    │  │ Database    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Target     │    │  Target     │    │  Target     │
│  Cluster 1  │    │  Cluster 2  │    │  Cluster N  │
│  (Prod)     │    │  (Staging)  │    │  (Dev)      │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 2. Mimari Genel Bakış

### 2.1 Teknoloji Stack

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| **Backend** | Go (Gin Framework) | 1.21+ |
| **Frontend** | React + TypeScript | 18+ |
| **UI Library** | Tailwind CSS + Radix UI | - |
| **Database** | PostgreSQL | 15+ |
| **Container** | Docker | 24+ |
| **Orchestration** | Kubernetes + Helm | 1.28+ |
| **CI/CD** | GitHub Actions | - |

### 2.2 Backend Mimari

```
backend/
├── cmd/
│   └── api/
│       └── main.go              # Entry point
├── internal/
│   ├── api/
│   │   ├── handlers/            # HTTP handlers
│   │   └── middleware/          # Auth, logging, rate limit
│   ├── config/                  # Configuration management
│   ├── crypto/                  # AES-256-GCM encryption
│   ├── database/
│   │   ├── migrations/          # SQL migrations
│   │   └── repositories/        # Data access layer
│   ├── k8s/                     # Kubernetes client manager
│   ├── models/                  # Domain models
│   └── services/                # Business logic
├── go.mod
└── go.sum
```

### 2.3 Frontend Mimari

```
frontend/
├── src/
│   ├── api/                     # API client & endpoints
│   ├── components/
│   │   └── ui/                  # Reusable UI components
│   ├── contexts/                # React contexts (Auth)
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Utilities
│   ├── pages/                   # Page components
│   └── types/                   # TypeScript types
├── package.json
└── vite.config.ts
```

### 2.4 Veri Akışı

```
[User] → [Frontend] → [Backend API] → [Service Layer] → [Repository] → [PostgreSQL]
                                            ↓
                                    [K8s Manager] → [Target Clusters]
```

---

## 3. Bileşen Listesi

### 3.1 Backend Bileşenleri

| # | Dosya/Klasör | Açıklama | Öncelik |
|---|--------------|----------|---------|
| 1 | `cmd/api/main.go` | Ana giriş noktası, router setup | 🔴 Kritik |
| 2 | `internal/config/config.go` | Konfigürasyon yönetimi | 🔴 Kritik |
| 3 | `internal/api/handlers/handlers.go` | HTTP handler'ları | 🔴 Kritik |
| 4 | `internal/api/middleware/auth.go` | JWT authentication | 🔴 Kritik |
| 5 | `internal/api/middleware/ratelimit.go` | Rate limiting | 🟡 Önemli |
| 6 | `internal/api/middleware/validation.go` | Input validation | 🟡 Önemli |
| 7 | `internal/api/middleware/logger.go` | Request logging | 🟢 Normal |
| 8 | `internal/crypto/encryptor.go` | AES-256-GCM encryption | 🔴 Kritik |
| 9 | `internal/database/database.go` | DB connection pool | 🔴 Kritik |
| 10 | `internal/database/repositories/base.go` | Query builder | 🔴 Kritik |
| 11 | `internal/database/repositories/cluster_repo.go` | Cluster CRUD | 🔴 Kritik |
| 12 | `internal/database/repositories/namespace_repo.go` | Namespace CRUD | 🟡 Önemli |
| 13 | `internal/database/repositories/team_user_repo.go` | Team/User CRUD | 🟡 Önemli |
| 14 | `internal/database/repositories/audit_repo.go` | Audit logging | 🟢 Normal |
| 15 | `internal/k8s/manager.go` | K8s client manager | 🔴 Kritik |
| 16 | `internal/models/*.go` | Domain models | 🔴 Kritik |
| 17 | `internal/services/auth_service.go` | Authentication logic | 🔴 Kritik |
| 18 | `internal/services/cluster_service.go` | Cluster business logic | 🔴 Kritik |
| 19 | `internal/services/namespace_service.go` | Namespace logic | 🟡 Önemli |
| 20 | `internal/services/org_services.go` | User/Team/BU logic | 🟡 Önemli |
| 21 | `internal/services/audit_service.go` | Audit logging | 🟢 Normal |

### 3.2 Frontend Bileşenleri

| # | Dosya/Klasör | Açıklama | Öncelik |
|---|--------------|----------|---------|
| 1 | `src/api/client.ts` | Axios client, token refresh | 🔴 Kritik |
| 2 | `src/api/index.ts` | API endpoint functions | 🔴 Kritik |
| 3 | `src/contexts/AuthContext.tsx` | Auth state management | 🔴 Kritik |
| 4 | `src/types/index.ts` | TypeScript type definitions | 🔴 Kritik |
| 5 | `src/pages/Login.tsx` | Login page | 🔴 Kritik |
| 6 | `src/pages/Dashboard.tsx` | Dashboard page | 🟡 Önemli |
| 7 | `src/pages/Clusters.tsx` | Cluster list page | 🟡 Önemli |
| 8 | `src/pages/CreateCluster.tsx` | Cluster creation form | 🔴 Kritik |
| 9 | `src/pages/ClusterDetail.tsx` | Cluster detail page | 🟡 Önemli |
| 10 | `src/pages/Namespaces.tsx` | Namespace list | 🟡 Önemli |
| 11 | `src/pages/NamespaceDetail.tsx` | Namespace detail | 🟡 Önemli |
| 12 | `src/components/ui/*.tsx` | Reusable components | 🟢 Normal |

### 3.3 Infrastructure Bileşenleri

| # | Dosya/Klasör | Açıklama | Öncelik |
|---|--------------|----------|---------|
| 1 | `docker/Dockerfile.api` | Backend Docker image | 🔴 Kritik |
| 2 | `docker/Dockerfile.ui` | Frontend Docker image | 🔴 Kritik |
| 3 | `docker-compose.yml` | Production compose | 🔴 Kritik |
| 4 | `docker-compose.dev.yml` | Development compose | 🟡 Önemli |
| 5 | `helm/kubeatlas/` | Helm chart | 🔴 Kritik |
| 6 | `.github/workflows/ci.yml` | CI/CD pipeline | 🔴 Kritik |
| 7 | `database/migrations/` | SQL migrations | 🔴 Kritik |
| 8 | `database/seed.sql` | Initial data | 🟡 Önemli |

---

## 4. İnceleme Yol Haritası

### Faz 1: Temel Altyapı (Öncelik: 🔴 Kritik)

```
┌─────────────────────────────────────────────────────────────┐
│ ADIM 1: Compile ve Build Kontrolü                           │
├─────────────────────────────────────────────────────────────┤
│ □ Backend Go build başarılı mı?                             │
│ □ Frontend npm build başarılı mı?                           │
│ □ Docker image'lar build ediliyor mu?                       │
│ □ Tüm dependency'ler güncel mi?                             │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 2: Konfigürasyon ve Environment                        │
├─────────────────────────────────────────────────────────────┤
│ □ .env.example tüm değişkenleri içeriyor mu?                │
│ □ Production için zorunlu secret'lar validate ediliyor mu?  │
│ □ Database connection string güvenli mi?                    │
│ □ JWT ve Encryption key'ler yeterince uzun mu?              │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 3: Database ve Migration                               │
├─────────────────────────────────────────────────────────────┤
│ □ Migration'lar sıralı ve tutarlı mı?                       │
│ □ Tüm foreign key'ler doğru tanımlı mı?                     │
│ □ Index'ler performans için yeterli mi?                     │
│ □ Soft delete düzgün çalışıyor mu?                          │
└─────────────────────────────────────────────────────────────┘
```

### Faz 2: Güvenlik (Öncelik: 🔴 Kritik)

```
┌─────────────────────────────────────────────────────────────┐
│ ADIM 4: Authentication & Authorization                      │
├─────────────────────────────────────────────────────────────┤
│ □ JWT token generation güvenli mi?                          │
│ □ Token expiry ve refresh düzgün çalışıyor mu?              │
│ □ Password hashing bcrypt ile mi?                           │
│ □ RBAC (Admin/Editor/Viewer) doğru uygulanmış mı?           │
│ □ Route protection middleware çalışıyor mu?                 │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 5: Data Güvenliği                                      │
├─────────────────────────────────────────────────────────────┤
│ □ SQL injection koruması var mı?                            │
│ □ XSS koruması var mı?                                      │
│ □ CSRF koruması var mı?                                     │
│ □ Sensitive data (kubeconfig, token) encrypt ediliyor mu?   │
│ □ AES-256-GCM encryption doğru implement edilmiş mi?        │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 6: API Güvenliği                                       │
├─────────────────────────────────────────────────────────────┤
│ □ Rate limiting aktif mi?                                   │
│ □ Input validation yapılıyor mu?                            │
│ □ Error message'lar sensitive bilgi içermiyor mu?           │
│ □ CORS doğru configure edilmiş mi?                          │
│ □ HTTPS enforce ediliyor mu?                                │
└─────────────────────────────────────────────────────────────┘
```

### Faz 3: İş Mantığı (Öncelik: 🟡 Önemli)

```
┌─────────────────────────────────────────────────────────────┐
│ ADIM 7: Cluster Yönetimi                                    │
├─────────────────────────────────────────────────────────────┤
│ □ Cluster CRUD işlemleri çalışıyor mu?                      │
│ □ Cluster connection test başarılı mı?                      │
│ □ Self-signed CA certificate desteği var mı?                │
│ □ Kubeconfig ve ServiceAccount auth çalışıyor mu?           │
│ □ Cluster sync (namespace discovery) çalışıyor mu?          │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 8: Namespace Yönetimi                                  │
├─────────────────────────────────────────────────────────────┤
│ □ Namespace listeleme ve filtreleme çalışıyor mu?           │
│ □ Ownership (Team, User, BusinessUnit) atanabiliyor mu?     │
│ □ SLA bilgileri (RTO, RPO) kaydedilebiliyor mu?             │
│ □ Contact bilgileri güncellenebiliyor mu?                   │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 9: Bağımlılık Yönetimi                                 │
├─────────────────────────────────────────────────────────────┤
│ □ Internal dependency (namespace→namespace) çalışıyor mu?   │
│ □ External dependency (API, DB, SaaS) çalışıyor mu?         │
│ □ Dependency graph visualization çalışıyor mu?              │
└─────────────────────────────────────────────────────────────┘
```

### Faz 4: Frontend (Öncelik: 🟡 Önemli)

```
┌─────────────────────────────────────────────────────────────┐
│ ADIM 10: UI/UX Kontrolü                                     │
├─────────────────────────────────────────────────────────────┤
│ □ Login/Logout flow çalışıyor mu?                           │
│ □ Dashboard istatistikleri doğru gösteriliyor mu?           │
│ □ Cluster ekleme formu tüm alanları içeriyor mu?            │
│ □ Namespace detay sayfası tüm bilgileri gösteriyor mu?      │
│ □ Error handling ve loading states var mı?                  │
│ □ Responsive tasarım çalışıyor mu?                          │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 11: API Entegrasyonu                                   │
├─────────────────────────────────────────────────────────────┤
│ □ API client token refresh çalışıyor mu?                    │
│ □ API error handling tutarlı mı?                            │
│ □ TypeScript types backend ile uyumlu mu?                   │
│ □ React Query cache invalidation çalışıyor mu?              │
└─────────────────────────────────────────────────────────────┘
```

### Faz 5: Deployment (Öncelik: 🔴 Kritik)

```
┌─────────────────────────────────────────────────────────────┐
│ ADIM 12: Docker & Docker Compose                            │
├─────────────────────────────────────────────────────────────┤
│ □ Dockerfile'lar multi-stage build kullanıyor mu?           │
│ □ Non-root user ile çalışıyor mu?                           │
│ □ Health check'ler tanımlı mı?                              │
│ □ docker-compose.yml production-ready mi?                   │
│ □ Volume mount'lar doğru mu?                                │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 13: Helm Chart                                         │
├─────────────────────────────────────────────────────────────┤
│ □ values.yaml tüm konfigürasyonları içeriyor mu?            │
│ □ Secret management doğru mu?                               │
│ □ Resource limits tanımlı mı?                               │
│ □ Ingress/Service configuration doğru mu?                   │
│ □ RBAC (ServiceAccount, Role, RoleBinding) tanımlı mı?      │
│ □ PersistentVolumeClaim doğru mu?                           │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ADIM 14: CI/CD Pipeline                                     │
├─────────────────────────────────────────────────────────────┤
│ □ Build job'ları başarılı mı?                               │
│ □ Test job'ları çalışıyor mu?                               │
│ □ Lint job'ları geçiyor mu?                                 │
│ □ Security scan yapılıyor mu?                               │
│ □ Docker push otomatik mi?                                  │
│ □ Deployment otomatik mi?                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Bileşen Bazlı Sorgular

> Aşağıdaki sorguları AI modeline (Claude, GPT, vb.) sorarak her bileşeni detaylı inceleyebilirsiniz.

### 5.1 Backend İnceleme Sorguları

#### main.go İncelemesi
```
Şu dosyayı incele: backend/cmd/api/main.go

Kontrol et:
1. Server timeout'ları production için uygun mu? (Read, Write, Idle)
2. Graceful shutdown implement edilmiş mi?
3. Logger düzgün initialize ediliyor mu?
4. Database connection pool ayarları doğru mu?
5. Middleware'ler doğru sırada mı?
6. Health check endpoint'leri var mı?
7. Rate limiting uygulanmış mı?
8. CORS ayarları güvenli mi?

Hata varsa düzelt ve production-ready hale getir.
```

#### Authentication İncelemesi
```
Şu dosyaları incele:
- backend/internal/api/middleware/auth.go
- backend/internal/services/auth_service.go

Kontrol et:
1. JWT token generation güvenli mi?
2. Token expiry süresi makul mü?
3. Refresh token implementasyonu var mı?
4. Password hashing bcrypt ile mi?
5. Brute force koruması var mı?
6. Token blacklisting/invalidation var mı?
7. Claims validation yapılıyor mu?
8. Issuer ve audience validation var mı?

Eksik güvenlik önlemleri varsa ekle.
```

#### Database Repository İncelemesi
```
Şu dosyaları incele:
- backend/internal/database/repositories/base.go
- backend/internal/database/repositories/cluster_repo.go

Kontrol et:
1. SQL injection koruması var mı?
2. Parameterized queries kullanılıyor mu?
3. Query builder güvenli mi?
4. Sort field whitelist kontrolü var mı?
5. Pagination doğru implement edilmiş mi?
6. Soft delete çalışıyor mu?
7. Transaction kullanımı doğru mu?
8. Connection pool optimizasyonu yapılmış mı?

Güvenlik açığı varsa düzelt.
```

#### Kubernetes Manager İncelemesi
```
Şu dosyayı incele: backend/internal/k8s/manager.go

Kontrol et:
1. TLS/SSL doğru configure edilmiş mi?
2. Self-signed CA certificate desteği var mı?
3. Skip TLS verify seçeneği var mı?
4. Client timeout'lar makul mü?
5. Client caching implement edilmiş mi?
6. Credential encryption yapılıyor mu?
7. Error handling tutarlı mı?
8. Resource cleanup yapılıyor mu?

Multi-cluster bağlantı senaryolarını test et.
```

#### Encryption İncelemesi
```
Şu dosyayı incele: backend/internal/crypto/encryptor.go

Kontrol et:
1. AES-256-GCM doğru implement edilmiş mi?
2. Nonce/IV random mı?
3. Key derivation güvenli mi?
4. Encryption key yeterince uzun mu (32 byte)?
5. Memory'de key güvenli saklanıyor mu?
6. Error handling sensitive bilgi leak ediyor mu?

Kriptografik hatalar çok kritik, dikkatli incele.
```

### 5.2 Frontend İnceleme Sorguları

#### API Client İncelemesi
```
Şu dosyayı incele: frontend/src/api/client.ts

Kontrol et:
1. Base URL doğru configure edilmiş mi?
2. Token interceptor çalışıyor mu?
3. Token refresh logic doğru mu?
4. Infinite refresh loop koruması var mı?
5. Error handling tutarlı mı?
6. Request timeout var mı?
7. Retry logic gerekli mi?

Token refresh edge case'lerini test et.
```

#### Auth Context İncelemesi
```
Şu dosyayı incele: frontend/src/contexts/AuthContext.tsx

Kontrol et:
1. Login/logout state management doğru mu?
2. Token storage güvenli mi (localStorage vs memory)?
3. Auto-logout on token expiry var mı?
4. Protected route redirection çalışıyor mu?
5. User data caching yapılıyor mu?

State management best practice'leri uygula.
```

#### TypeScript Types İncelemesi
```
Şu dosyayı incele: frontend/src/types/index.ts

Kontrol et:
1. Backend model'leri ile uyumlu mu?
2. Optional/required field'lar doğru mu?
3. API response type'ları tanımlı mı?
4. Enum'lar backend ile aynı mı?
5. Generic type'lar doğru kullanılmış mı?

Type mismatch hataları runtime'da sorun yaratır.
```

#### Cluster Form İncelemesi
```
Şu dosyayı incele: frontend/src/pages/CreateCluster.tsx

Kontrol et:
1. Form validation yapılıyor mu?
2. File upload (kubeconfig, CA cert) çalışıyor mu?
3. Base64 encoding doğru mu?
4. Error handling ve display var mı?
5. Loading state gösteriliyor mu?
6. Success/error notification var mı?
7. Form reset çalışıyor mu?

UX best practice'lerini uygula.
```

### 5.3 Infrastructure İnceleme Sorguları

#### Dockerfile İncelemesi
```
Şu dosyaları incele:
- docker/Dockerfile.api
- docker/Dockerfile.ui

Kontrol et:
1. Multi-stage build kullanılmış mı?
2. Non-root user ile mi çalışıyor?
3. Alpine veya distroless base image mi?
4. Gereksiz dosyalar .dockerignore'da mı?
5. Health check tanımlı mı?
6. Security best practice'ler uygulanmış mı?
7. Image size optimize mi?

Container security hardening yap.
```

#### Helm Chart İncelemesi
```
Şu klasörü incele: helm/kubeatlas/

Kontrol et:
1. values.yaml tüm konfigürasyonları içeriyor mu?
2. Secret'lar Kubernetes Secret olarak mı yönetiliyor?
3. ConfigMap kullanımı doğru mu?
4. Resource limits/requests tanımlı mı?
5. Liveness/readiness probe'lar var mı?
6. PDB (PodDisruptionBudget) tanımlı mı?
7. HPA (HorizontalPodAutoscaler) var mı?
8. NetworkPolicy tanımlı mı?
9. ServiceAccount ve RBAC doğru mu?
10. Ingress/Service konfigürasyonu doğru mu?

Production deployment için hazırla.
```

#### CI/CD Pipeline İncelemesi
```
Şu dosyayı incele: .github/workflows/ci.yml

Kontrol et:
1. Build job'ları paralel mi?
2. Test job'ları var mı?
3. Lint job'ları var mı?
4. Security scan (Trivy, gosec) var mı?
5. Docker build ve push otomatik mi?
6. Environment separation (staging/prod) var mı?
7. Rollback stratejisi var mı?
8. Notification (Slack, email) var mı?

CI/CD best practice'leri uygula.
```

### 5.4 Database İnceleme Sorguları

#### Migration İncelemesi
```
Şu dosyaları incele: database/migrations/

Kontrol et:
1. Migration'lar idempotent mi?
2. Rollback (down) migration'lar var mı?
3. Foreign key'ler doğru tanımlı mı?
4. Index'ler performans için yeterli mi?
5. Constraint'ler (unique, check) tanımlı mı?
6. Default value'lar makul mü?
7. Enum type'lar tutarlı mı?

Schema design best practice'leri uygula.
```

---

## 6. Test Stratejisi

### 6.1 Backend Test Kapsamı

| Test Türü | Dosya Pattern | Kapsam |
|-----------|---------------|--------|
| Unit Test | `*_test.go` | Service, Repository, Crypto |
| Integration Test | `*_integration_test.go` | Database, API |
| E2E Test | `e2e/` | Full flow |

#### Unit Test Sorgusu
```
Backend için unit test'ler yaz:

Öncelik 1 (Kritik):
- internal/crypto/encryptor_test.go - Encryption/decryption
- internal/services/auth_service_test.go - Login, token generation
- internal/services/cluster_service_test.go - CRUD operations

Öncelik 2 (Önemli):
- internal/database/repositories/base_test.go - Query builder
- internal/api/middleware/auth_test.go - JWT validation

Test coverage hedefi: %80+
Mock kullan: database, K8s client
```

### 6.2 Frontend Test Kapsamı

| Test Türü | Tool | Kapsam |
|-----------|------|--------|
| Unit Test | Vitest | Components, Hooks |
| Integration Test | Vitest + MSW | API calls |
| E2E Test | Cypress | User flows |

#### Frontend Test Sorgusu
```
Frontend için test'ler yaz:

Öncelik 1:
- AuthContext.test.tsx - Login/logout
- api/client.test.ts - Token refresh
- pages/CreateCluster.test.tsx - Form validation

Öncelik 2:
- pages/Dashboard.test.tsx - Stats display
- pages/Clusters.test.tsx - List rendering

MSW ile API mock'la.
```

---

## 7. Güvenlik Kontrol Listesi

### 7.1 Authentication & Authorization

- [ ] JWT secret en az 32 karakter
- [ ] Token expiry maksimum 1 saat
- [ ] Refresh token rotation var
- [ ] Password en az 8 karakter, büyük/küçük harf, rakam
- [ ] Bcrypt cost faktör en az 10
- [ ] Failed login attempt limiting
- [ ] Account lockout after N attempts
- [ ] Session invalidation on password change
- [ ] Multi-factor authentication (MFA) - opsiyonel

### 7.2 Data Security

- [ ] SQL injection koruması (parameterized queries)
- [ ] XSS koruması (output encoding)
- [ ] CSRF koruması (token)
- [ ] Sensitive data encryption (AES-256-GCM)
- [ ] Encryption at rest (database)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] PII data masking in logs
- [ ] Secure secret storage (Vault, K8s Secrets)

### 7.3 API Security

- [ ] Rate limiting (100 req/min)
- [ ] Request size limiting (10MB max)
- [ ] Input validation (whitelist)
- [ ] Output sanitization
- [ ] CORS configuration (specific origins)
- [ ] Security headers (HSTS, CSP, X-Frame-Options)
- [ ] API versioning
- [ ] Deprecation headers

### 7.4 Infrastructure Security

- [ ] Non-root container
- [ ] Read-only filesystem
- [ ] Resource limits
- [ ] Network policies
- [ ] Pod security policies
- [ ] Image vulnerability scanning
- [ ] Secret rotation
- [ ] Audit logging

---

## 8. Production Readiness Checklist

### 8.1 Reliability

- [ ] Health check endpoints (/health, /ready)
- [ ] Graceful shutdown
- [ ] Circuit breaker pattern
- [ ] Retry with exponential backoff
- [ ] Timeout configuration
- [ ] Connection pooling
- [ ] Database connection retry
- [ ] K8s client connection retry

### 8.2 Observability

- [ ] Structured logging (JSON)
- [ ] Request ID tracing
- [ ] Metrics endpoint (/metrics)
- [ ] Prometheus integration
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Alerting rules
- [ ] Dashboard (Grafana)

### 8.3 Scalability

- [ ] Horizontal pod autoscaling
- [ ] Database connection pool limits
- [ ] Stateless application design
- [ ] Cache layer (Redis) - opsiyonel
- [ ] CDN for static assets
- [ ] Load balancer configuration

### 8.4 Documentation

- [ ] README.md güncel
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Architecture diagrams
- [ ] Runbook for incidents

---

## 9. Kurulum ve Çalıştırma

### 9.1 Geliştirme Ortamı

```bash
# Repository clone
git clone https://github.com/ozcanfpolat/kubeatlas.git
cd kubeatlas

# Environment dosyası
cp .env.example .env
# .env dosyasını düzenle

# Docker ile başlat
make dev

# Veya manuel:
docker-compose -f docker-compose.dev.yml up -d

# Seed data
make db-seed

# Frontend erişim: http://localhost:3000
# Backend erişim: http://localhost:8080
# Default login: admin@kubeatlas.local / admin123
```

### 9.2 Production Deployment (Docker Compose)

```bash
# Secret'ları oluştur
export DB_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 48)
export ENCRYPTION_KEY=$(openssl rand -hex 32)

# Production başlat
docker-compose -f docker-compose.yml up -d
```

### 9.3 Production Deployment (Kubernetes)

```bash
# Namespace oluştur
kubectl create namespace kubeatlas

# Secret'ları oluştur
kubectl create secret generic kubeatlas-secrets \
  --from-literal=db-password=$(openssl rand -base64 32) \
  --from-literal=jwt-secret=$(openssl rand -base64 48) \
  --from-literal=encryption-key=$(openssl rand -hex 32) \
  -n kubeatlas

# Helm install
helm install kubeatlas ./helm/kubeatlas \
  -n kubeatlas \
  -f values-production.yaml
```

### 9.4 Target Cluster Ekleme

```bash
# Target cluster'da ServiceAccount oluştur
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubeatlas-reader
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubeatlas-reader
rules:
- apiGroups: [""]
  resources: ["namespaces", "pods", "services", "nodes"]
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
  name: kubeatlas-reader
  namespace: kube-system
EOF

# Token al
kubectl get secret $(kubectl get sa kubeatlas-reader -n kube-system -o jsonpath='{.secrets[0].name}') \
  -n kube-system -o jsonpath='{.data.token}' | base64 -d

# CA certificate al
kubectl get secret $(kubectl get sa kubeatlas-reader -n kube-system -o jsonpath='{.secrets[0].name}') \
  -n kube-system -o jsonpath='{.data.ca\.crt}' | base64 -d
```

---

## 10. Sık Karşılaşılan Sorunlar

### 10.1 Build Hataları

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `undefined: X` | Import eksik | `go mod tidy` |
| `cannot find module` | Dependency eksik | `go mod download` |
| `type mismatch` | Function signature uyumsuz | Handler ve service'leri eşle |
| `npm ERR!` | Node dependency sorunu | `rm -rf node_modules && npm ci` |

### 10.2 Runtime Hataları

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `connection refused` | Database bağlantısı yok | DB container'ı kontrol et |
| `401 Unauthorized` | Token expired/invalid | Yeni login yap |
| `certificate signed by unknown authority` | Self-signed cert | CA cert ekle veya skip_tls_verify |
| `context deadline exceeded` | Timeout | Timeout değerini artır |

### 10.3 CI/CD Hataları

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `golangci-lint failed` | Linter kuralı ihlali | Kodu düzelt veya rule'u gevşet |
| `npm test failed` | Test başarısız | Test'i düzelt |
| `trivy found vulnerabilities` | Güvenlik açığı | Dependency güncelle |

---

## 📝 Notlar

### Bu Rehberi Kullanırken:

1. **Sırayla ilerle**: Faz 1'den başla, her adımı tamamla
2. **Her bileşeni ayrı incele**: Tek seferde hepsini yapmaya çalışma
3. **Test et**: Her değişiklikten sonra compile/build/test yap
4. **Commit sık**: Küçük, anlamlı commit'ler yap
5. **Dokümante et**: Yaptığın değişiklikleri CHANGELOG'a ekle

### AI Modeline Sorgu Şablonu:

```
KubeAtlas projesinde [BİLEŞEN ADI] bileşenini inceliyorum.

Dosya yolu: [DOSYA YOLU]

Şunları kontrol et:
1. [KONTROL 1]
2. [KONTROL 2]
...

Hata varsa düzelt, eksik varsa ekle, production-ready hale getir.

Değişiklikleri commit message formatında özetle.
```

---

**Son Güncelleme**: Mart 2026
**Versiyon**: 1.0.0
**Yazar**: Claude AI + Özcan Polat
