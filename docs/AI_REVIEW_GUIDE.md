# 🎯 KubeAtlas - AI Model Sorgulama ve İnceleme Rehberi

## Projeyi Tanıtma (Her Modele İlk Verilecek Bağlam)

```
# KubeAtlas Projesi Hakkında

## Ne İşe Yarar?
KubeAtlas, birden fazla Kubernetes cluster'ını merkezi olarak yöneten bir envanter ve governance platformudur.

## Temel Özellikler:
- Multi-cluster Kubernetes inventory management
- Namespace ownership tracking (Team, User, Business Unit)  
- Internal/External dependency mapping
- Document management
- Audit trail
- JWT-based authentication with RBAC

## Tech Stack:
- Backend: Go 1.21, Gin Framework, PostgreSQL (pgx driver)
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Database: PostgreSQL 15+
- Infrastructure: Docker, Kubernetes, Helm
- CI/CD: GitHub Actions

## Proje Yapısı:
kubeatlas/
├── backend/           # Go API server
│   ├── cmd/api/       # Entry point
│   └── internal/      # Core business logic
├── frontend/          # React SPA
│   └── src/           # Source code
├── database/          # SQL schemas
├── helm/              # Kubernetes deployment
├── docker/            # Container configs
└── docs/              # Documentation

## GitHub: https://github.com/ozcanfpolat/kubeatlas
```

---

# 📋 BÖLÜM 1: BACKEND İNCELEME

## 1.1 Backend Entry Point & Configuration

### Sorgu Şablonu:
```
KubeAtlas Go backend'inin entry point ve configuration dosyalarını inceleni istiyorum.

Dosyalar:
1. backend/cmd/api/main.go - Ana giriş noktası
2. backend/internal/config/config.go - Konfigürasyon yönetimi

Kontrol edilecekler:
- [ ] Graceful shutdown implement edilmiş mi?
- [ ] Environment variable'lar doğru okunuyor mu?
- [ ] Production/Development mode ayrımı var mı?
- [ ] Dependency injection doğru mu?
- [ ] Server timeout'ları uygun mu?
- [ ] Logger initialization doğru mu?
- [ ] Database connection pooling konfigüre edilmiş mi?
- [ ] Middleware'ler doğru sırada mı?

Beklenen çıktı:
1. Bulunan hatalar (satır numarası ile)
2. Security açıkları
3. Performance sorunları
4. Düzeltme kodları
5. Best practice önerileri
```

---

## 1.2 Authentication & Authorization

### Sorgu Şablonu:
```
KubeAtlas authentication sistemini incele.

Dosyalar:
1. backend/internal/api/middleware/auth.go - JWT middleware
2. backend/internal/services/auth_service.go - Auth business logic

Kontrol edilecekler:
- [ ] JWT token generation güvenli mi?
- [ ] Token validation doğru mu?
- [ ] Token expiry kontrolü var mı?
- [ ] Refresh token mekanizması çalışıyor mu?
- [ ] Password hashing (bcrypt) doğru mu?
- [ ] Brute force protection var mı?
- [ ] Logout token invalidation var mı?
- [ ] RBAC (admin, editor, viewer) doğru implement edilmiş mi?
- [ ] Organization isolation sağlanıyor mu?

Security kontrolleri:
- JWT secret minimum 32 karakter mi?
- Token'da sensitive bilgi var mı?
- Timing attack koruması var mı?

Beklenen çıktı:
1. Security vulnerabilities (CRITICAL/HIGH/MEDIUM/LOW)
2. Düzeltme kodları
3. Eksik özellikler listesi
```

---

## 1.3 API Handlers

### Sorgu Şablonu:
```
KubeAtlas API handler'larını incele.

Dosyalar:
1. backend/internal/api/handlers/handlers.go - Ana handler'lar
2. backend/internal/api/handlers/other_handlers.go - Diğer handler'lar
3. backend/internal/api/handlers/namespace_team_handlers.go - Namespace/Team handler'ları

Kontrol edilecekler:
- [ ] Tüm handler'lar doğru HTTP method kullanıyor mu?
- [ ] Request body validation var mı?
- [ ] Error response'lar tutarlı mı?
- [ ] Authorization kontrolü her endpoint'te var mı?
- [ ] Pagination implement edilmiş mi?
- [ ] Input sanitization yapılıyor mu?

Her handler için kontrol:
- HTTP status code'ları doğru mu?
- Response format tutarlı mı?
- Error handling proper mı?

Beklenen çıktı:
1. Handler signature hataları
2. Eksik validation'lar
3. Tutarsız response format'ları
4. Düzeltme kodları
```

---

## 1.4 Services (Business Logic)

### Sorgu Şablonu:
```
KubeAtlas service layer'ını incele.

Dosyalar:
1. backend/internal/services/cluster_service.go - Cluster yönetimi
2. backend/internal/services/namespace_service.go - Namespace yönetimi
3. backend/internal/services/org_services.go - Team/User/BusinessUnit
4. backend/internal/services/dependency_service.go - Dependency mapping
5. backend/internal/services/document_service.go - Document yönetimi
6. backend/internal/services/dashboard_service.go - Dashboard stats
7. backend/internal/services/audit_service.go - Audit logging

Her service için kontrol:
- [ ] Business logic doğru mu?
- [ ] Error handling proper mı?
- [ ] Transaction management var mı?
- [ ] Audit logging yapılıyor mu?
- [ ] Input validation var mı?
- [ ] Concurrent access handling var mı?

Özellikle cluster_service.go için:
- Kubernetes client bağlantısı güvenli mi?
- Credential encryption çalışıyor mu?
- Multi-cluster sync doğru mu?

Beklenen çıktı:
1. Logic hataları
2. Missing validation
3. Transaction sorunları
4. Düzeltme kodları
```

---

## 1.5 Database Layer

### Sorgu Şablonu:
```
KubeAtlas database layer'ını incele.

Dosyalar:
1. backend/internal/database/database.go - DB connection
2. backend/internal/database/repositories/base.go - Query builder
3. backend/internal/database/repositories/cluster_repo.go - Cluster repo
4. backend/internal/database/repositories/namespace_repo.go - Namespace repo
5. backend/internal/database/repositories/team_user_repo.go - Team/User/BU repos
6. database/schema.sql - Full schema
7. database/seed.sql - Sample data

Kontrol edilecekler:
- [ ] SQL injection koruması var mı?
- [ ] Prepared statements kullanılıyor mu?
- [ ] Connection pooling konfigüre mi?
- [ ] Transaction management doğru mu?
- [ ] Soft delete tutarlı mı?
- [ ] Index'ler optimize mi?

Schema kontrolleri:
- Foreign key constraints var mı?
- Data types optimal mi?
- Nullable fields doğru mu?

Beklenen çıktı:
1. SQL injection riskleri
2. Performance sorunları (missing indexes)
3. Schema iyileştirmeleri
4. Düzeltme kodları
```

---

## 1.6 Kubernetes Integration

### Sorgu Şablonu:
```
KubeAtlas Kubernetes entegrasyonunu incele.

Dosyalar:
1. backend/internal/k8s/manager.go - K8s client manager

Kontrol edilecekler:
- [ ] Multi-cluster bağlantı çalışıyor mu?
- [ ] TLS/SSL konfigürasyonu doğru mu?
- [ ] Self-signed certificate desteği var mı?
- [ ] Service account token encryption var mı?
- [ ] Client caching implement edilmiş mi?
- [ ] Connection timeout'lar uygun mu?
- [ ] Error handling proper mı?
- [ ] Retry logic var mı?

Security kontrolleri:
- Kubeconfig encryption AES-256-GCM mi?
- CA certificate handling doğru mu?
- skip_tls_verify sadece development için mi?

Beklenen çıktı:
1. Security vulnerabilities
2. Connection sorunları
3. Performance iyileştirmeleri
4. Düzeltme kodları
```

---

## 1.7 Middleware

### Sorgu Şablonu:
```
KubeAtlas middleware'lerini incele.

Dosyalar:
1. backend/internal/api/middleware/auth.go - Authentication
2. backend/internal/api/middleware/ratelimit.go - Rate limiting
3. backend/internal/api/middleware/logger.go - Request logging
4. backend/internal/api/middleware/validation.go - Input validation

Kontrol edilecekler:
- [ ] Auth middleware tüm protected route'larda mı?
- [ ] Rate limiting düzgün çalışıyor mu?
- [ ] Request logging structured mı?
- [ ] Panic recovery var mı?
- [ ] CORS doğru konfigüre edilmiş mi?
- [ ] Request ID tracking var mı?

Her middleware için:
- Middleware chain sırası doğru mu?
- Error handling proper mı?
- Performance overhead kabul edilebilir mi?

Beklenen çıktı:
1. Syntax hataları
2. Logic hataları
3. Security açıkları
4. Düzeltme kodları
```

---

## 1.8 Crypto & Security Utilities

### Sorgu Şablonu:
```
KubeAtlas encryption utilities'i incele.

Dosyalar:
1. backend/internal/crypto/encryptor.go - AES-256-GCM encryption

Kontrol edilecekler:
- [ ] AES-256-GCM doğru implement edilmiş mi?
- [ ] IV/Nonce generation secure random mı?
- [ ] Key derivation doğru mu?
- [ ] Error handling proper mı?
- [ ] Memory'de key güvenli mi?

Beklenen çıktı:
1. Cryptographic vulnerabilities
2. Implementation hataları
3. Düzeltme kodları
```

---

# 📋 BÖLÜM 2: FRONTEND İNCELEME

## 2.1 API Client & State Management

### Sorgu Şablonu:
```
KubeAtlas frontend API client ve state management'ı incele.

Dosyalar:
1. frontend/src/api/client.ts - Axios client
2. frontend/src/api/index.ts - API functions
3. frontend/src/store/authStore.ts - Auth state (Zustand)

Kontrol edilecekler:
- [ ] Token refresh otomatik mi?
- [ ] 401 handling doğru mu?
- [ ] Request/Response interceptors var mı?
- [ ] Error handling tutarlı mı?
- [ ] Loading states handle ediliyor mu?
- [ ] Token storage güvenli mi?

Beklenen çıktı:
1. Security sorunları
2. Race condition riskleri
3. Düzeltme kodları
```

---

## 2.2 TypeScript Types

### Sorgu Şablonu:
```
KubeAtlas TypeScript type definitions'ı incele.

Dosyalar:
1. frontend/src/types/index.ts - All TypeScript types

Kontrol edilecekler:
- [ ] Backend API response'ları ile uyumlu mu?
- [ ] Optional fields doğru işaretlenmiş mi?
- [ ] Generic types kullanılıyor mu?
- [ ] Enum'lar doğru tanımlı mı?
- [ ] any kullanımı minimize mi?

Beklenen çıktı:
1. Type uyumsuzlukları
2. Missing types
3. Düzeltme kodları
```

---

## 2.3 Pages (React Components)

### Sorgu Şablonu:
```
KubeAtlas React sayfalarını incele.

Dosyalar:
1. frontend/src/pages/Login.tsx
2. frontend/src/pages/Dashboard.tsx
3. frontend/src/pages/Clusters.tsx
4. frontend/src/pages/CreateCluster.tsx
5. frontend/src/pages/ClusterDetail.tsx
6. frontend/src/pages/Namespaces.tsx
7. frontend/src/pages/NamespaceDetail.tsx
8. frontend/src/pages/Teams.tsx
9. frontend/src/pages/Dependencies.tsx
10. frontend/src/pages/Documents.tsx
11. frontend/src/pages/AuditLogs.tsx
12. frontend/src/pages/Settings.tsx

Her sayfa için kontrol:
- [ ] Loading states var mı?
- [ ] Error handling var mı?
- [ ] Empty states var mı?
- [ ] Form validation var mı?
- [ ] Responsive design var mı?
- [ ] Accessibility (a11y) uyumlu mu?

Beklenen çıktı:
1. UI/UX sorunları
2. Missing error handling
3. Performance sorunları
4. Düzeltme kodları
```

---

## 2.4 App Structure & Routing

### Sorgu Şablonu:
```
KubeAtlas React app structure ve routing'i incele.

Dosyalar:
1. frontend/src/App.tsx - Main app
2. frontend/src/main.tsx - Entry point
3. frontend/src/components/layout/* - Layout components

Kontrol edilecekler:
- [ ] Protected routes doğru mu?
- [ ] Lazy loading implement edilmiş mi?
- [ ] Error boundaries var mı?
- [ ] Route guards çalışıyor mu?

Beklenen çıktı:
1. Routing hataları
2. Missing guards
3. Düzeltme kodları
```

---

# 📋 BÖLÜM 3: INFRASTRUCTURE İNCELEME

## 3.1 Docker Configuration

### Sorgu Şablonu:
```
KubeAtlas Docker konfigürasyonlarını incele.

Dosyalar:
1. docker/Dockerfile.api - Backend production
2. docker/Dockerfile.ui - Frontend production
3. docker/Dockerfile.api.dev - Backend development
4. docker/Dockerfile.ui.dev - Frontend development
5. docker/nginx.conf - Nginx config
6. docker-compose.yml - Main compose
7. docker-compose.dev.yml - Development
8. docker-compose.prod.yml - Production

Kontrol edilecekler:
- [ ] Multi-stage build kullanılıyor mu?
- [ ] Non-root user ile çalışıyor mu?
- [ ] Image size optimize mi?
- [ ] Health check tanımlı mı?
- [ ] Security best practices uygulanmış mı?
- [ ] Environment variables doğru mu?

Beklenen çıktı:
1. Security vulnerabilities
2. Build optimization önerileri
3. Düzeltme kodları
```

---

## 3.2 Helm Chart

### Sorgu Şablonu:
```
KubeAtlas Helm chart'ını incele.

Dosyalar:
1. helm/kubeatlas/Chart.yaml
2. helm/kubeatlas/values.yaml
3. helm/kubeatlas/templates/api-deployment.yaml
4. helm/kubeatlas/templates/ui-deployment.yaml
5. helm/kubeatlas/templates/service.yaml
6. helm/kubeatlas/templates/ingress.yaml
7. helm/kubeatlas/templates/secrets.yaml
8. helm/kubeatlas/templates/configmap.yaml
9. helm/kubeatlas/templates/hpa.yaml
10. helm/kubeatlas/templates/pdb.yaml
11. helm/kubeatlas/templates/networkpolicy.yaml
12. helm/kubeatlas/templates/serviceaccount.yaml
13. helm/kubeatlas/templates/_helpers.tpl

Kontrol edilecekler:
- [ ] Resource limits tanımlı mı?
- [ ] Liveness/Readiness probes var mı?
- [ ] Secret management doğru mu?
- [ ] RBAC tanımlı mı?
- [ ] Network policies var mı?
- [ ] HPA konfigüre edilmiş mi?
- [ ] PDB tanımlı mı?
- [ ] Values properly documented mı?

Beklenen çıktı:
1. Kubernetes best practices ihlalleri
2. Security sorunları
3. High availability sorunları
4. Düzeltme kodları
```

---

## 3.3 CI/CD Pipeline

### Sorgu Şablonu:
```
KubeAtlas CI/CD pipeline'ını incele.

Dosyalar:
1. .github/workflows/ci.yml

Kontrol edilecekler:
- [ ] Backend build & test var mı?
- [ ] Frontend build & test var mı?
- [ ] Lint checks var mı?
- [ ] Security scanning var mı?
- [ ] Docker build var mı?
- [ ] Helm lint var mı?
- [ ] Cache kullanılıyor mu?
- [ ] Parallel jobs optimize mi?
- [ ] Secrets güvenli mi?

Beklenen çıktı:
1. Pipeline hataları
2. Optimization önerileri
3. Missing steps
4. Düzeltme kodları
```

---

# 📋 BÖLÜM 4: DATABASE İNCELEME

## 4.1 Schema & Migrations

### Sorgu Şablonu:
```
KubeAtlas database schema ve migrations'ı incele.

Dosyalar:
1. database/schema.sql - Full schema
2. database/seed.sql - Sample data
3. backend/internal/database/migrations/001_initial_schema.sql

Kontrol edilecekler:
- [ ] Normalization doğru mu?
- [ ] Foreign keys tanımlı mı?
- [ ] Index'ler uygun mu?
- [ ] Data types optimal mi?
- [ ] Soft delete tutarlı mı?
- [ ] Constraints doğru mu?
- [ ] Default values mantıklı mı?

Performance kontrolleri:
- Query pattern'lere göre index'ler var mı?
- Composite index gerekli mi?
- Partition gerekli mi?

Beklenen çıktı:
1. Schema design sorunları
2. Missing indexes
3. Performance önerileri
4. Düzeltme SQL'leri
```

---

# 📋 BÖLÜM 5: TESTING İNCELEME

## 5.1 Test Coverage

### Sorgu Şablonu:
```
KubeAtlas test coverage'ını incele ve eksikleri belirle.

Mevcut test dosyaları:
1. backend/internal/crypto/encryptor_test.go
2. backend/internal/models/models_test.go
3. backend/internal/services/auth_service_test.go
4. frontend/src/lib/utils.test.ts

Eksik testleri belirle:
1. Unit tests - hangi fonksiyonlar test edilmemiş?
2. Integration tests - hangi API endpoint'leri test edilmemiş?
3. E2E tests - hangi user flow'lar test edilmemiş?

Her eksik test için:
- Test edilmesi gereken fonksiyon/component
- Test senaryoları (happy path, edge cases, error cases)
- Mock requirements
- Örnek test kodu

Hedef coverage: %80+

Beklenen çıktı:
1. Eksik test listesi (öncelikli)
2. Test senaryoları
3. Örnek test kodları
```

---

# 📋 BÖLÜM 6: DOCUMENTATION İNCELEME

## 6.1 Documentation Review

### Sorgu Şablonu:
```
KubeAtlas documentation'ını incele.

Dosyalar:
1. README.md - Ana dokümantasyon
2. CONTRIBUTING.md - Contribution guide
3. SECURITY.md - Security policy
4. CHANGELOG.md - Değişiklik günlüğü
5. docs/DEPLOYMENT.md - Deployment guide
6. docs/INSTALLATION.md - Installation guide
7. docs/ADDING_CLUSTERS.md - Cluster ekleme
8. docs/PROJECT_STRUCTURE.md - Proje yapısı
9. docs/api/openapi.yaml - API documentation

Kontrol edilecekler:
- [ ] README güncel ve kapsamlı mı?
- [ ] Quick start guide çalışıyor mu?
- [ ] API documentation güncel mi?
- [ ] Troubleshooting guide var mı?
- [ ] Architecture diagrams var mı?
- [ ] Environment variables documented mı?
- [ ] Deployment options documented mı?

Beklenen çıktı:
1. Eksik dokümantasyon
2. Güncellenecek bölümler
3. Yeni eklenmesi gereken docs
```

---

# 🔄 İNCELEME SIRASI (Önerilen)

## Faz 1: Critical Path (Öncelikli)
1. ✅ Backend - main.go & config.go
2. ✅ Backend - auth middleware & service
3. ✅ Backend - handlers (function signatures)
4. ✅ Backend - middleware (logger.go fix)
5. 🔄 CI/CD Pipeline (şu an fix ediliyor)

## Faz 2: Core Functionality
6. ⬜ Backend - cluster_service.go (K8s integration)
7. ⬜ Backend - repositories (SQL queries)
8. ⬜ Frontend - API client & types
9. ⬜ Frontend - pages (form validation, error handling)

## Faz 3: Infrastructure
10. ⬜ Docker configurations
11. ⬜ Helm chart
12. ⬜ Database schema optimization

## Faz 4: Quality Assurance
13. ⬜ Unit tests
14. ⬜ Integration tests
15. ⬜ E2E tests

## Faz 5: Polish
16. ⬜ Documentation update
17. ⬜ Security audit
18. ⬜ Performance optimization

---

# 📊 DURUM TAKİP TABLOSU

| # | Bileşen | Dosya Sayısı | Durum | Notlar |
|---|---------|--------------|-------|--------|
| 1 | Backend Entry | 2 | ✅ | main.go, config.go |
| 2 | Backend Auth | 2 | ✅ | auth.go, auth_service.go |
| 3 | Backend Handlers | 3 | 🔄 | Signature fixes done |
| 4 | Backend Services | 7 | 🔄 | Validation added |
| 5 | Backend DB | 5 | ⬜ | Needs review |
| 6 | Backend K8s | 1 | ✅ | Encryption added |
| 7 | Backend Middleware | 4 | 🔄 | Logger fixed |
| 8 | Backend Crypto | 1 | ✅ | AES-256-GCM working |
| 9 | Frontend API | 2 | 🔄 | Needs type fixes |
| 10 | Frontend Types | 1 | ⬜ | Needs review |
| 11 | Frontend Pages | 12 | 🔄 | CreateCluster fixed |
| 12 | Frontend Layout | 3 | ⬜ | Needs review |
| 13 | Database Schema | 3 | ✅ | Schema complete |
| 14 | Docker | 8 | ⬜ | Needs review |
| 15 | Helm | 12 | ⬜ | Needs review |
| 16 | CI/CD | 1 | 🔄 | Fixing errors |
| 17 | Tests | 4 | ⬜ | Low coverage |
| 18 | Docs | 9 | 🔄 | Updating |

**Semboller:**
- ✅ Tamamlandı
- 🔄 Devam ediyor
- ⬜ Bekliyor

---

# 🚀 HIZLI BAŞLANGIÇ SORGUSU

Herhangi bir AI modele projeyi tanıtmak için:

```
KubeAtlas adlı bir multi-cluster Kubernetes inventory management projesi üzerinde çalışıyorum.

GitHub: https://github.com/ozcanfpolat/kubeatlas

Tech Stack:
- Backend: Go 1.21, Gin Framework, PostgreSQL
- Frontend: React 18, TypeScript, Tailwind CSS
- Infrastructure: Docker, Kubernetes, Helm

Şu anda production-ready hale getirmek için code review yapıyoruz.

[SPECIFIC_REQUEST]

Lütfen:
1. Tüm hataları bul (satır numarası ile)
2. Security açıklarını belirle
3. Performance sorunlarını listele
4. Her sorun için düzeltme kodu ver
5. Best practice önerileri sun
```

---

*Bu döküman KubeAtlas production-ready sürecinde kullanılmak üzere hazırlanmıştır.*
*Son güncelleme: 2026-03-04*
