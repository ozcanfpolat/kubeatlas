# KubeAtlas - Hızlı İnceleme Kartı

Bu kart, projenin hızlı bir şekilde incelenmesi için kullanılacak şablon ve komutları içerir.

---

## 🎯 BİLEŞEN HARİTASI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KUBEATLAS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  BACKEND    │    │  FRONTEND   │    │  DATABASE   │    │   DEVOPS    │  │
│  │  (Go/Gin)   │    │  (React/TS) │    │ (PostgreSQL)│    │(Docker/K8s) │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │          │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐  │
│  │ • Handlers  │    │ • Pages     │    │ • Schema    │    │ • Dockerfile│  │
│  │ • Services  │    │ • Components│    │ • Migrations│    │ • Compose   │  │
│  │ • Middleware│    │ • API Client│    │ • Seed Data │    │ • Helm      │  │
│  │ • Repos     │    │ • Types     │    │ • Indexes   │    │ • CI/CD     │  │
│  │ • K8s Mgr   │    │ • Hooks     │    │             │    │             │  │
│  │ • Crypto    │    │             │    │             │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 DOSYA REFERANSI

### Backend Kritik Dosyalar
| Dosya | Amaç | Öncelik |
|-------|------|---------|
| `backend/cmd/api/main.go` | Entry point, router setup | 🔴 Kritik |
| `backend/internal/config/config.go` | Configuration | 🔴 Kritik |
| `backend/internal/api/handlers/handlers.go` | HTTP handlers | 🔴 Kritik |
| `backend/internal/api/middleware/auth.go` | JWT auth | 🔴 Kritik |
| `backend/internal/api/middleware/ratelimit.go` | Rate limiting | 🟡 Önemli |
| `backend/internal/services/cluster_service.go` | Cluster logic | 🔴 Kritik |
| `backend/internal/services/auth_service.go` | Auth logic | 🔴 Kritik |
| `backend/internal/database/repositories/base.go` | Query builder | 🔴 Kritik |
| `backend/internal/k8s/manager.go` | K8s client | 🔴 Kritik |
| `backend/internal/crypto/encryptor.go` | Encryption | 🔴 Kritik |

### Frontend Kritik Dosyalar
| Dosya | Amaç | Öncelik |
|-------|------|---------|
| `frontend/src/api/client.ts` | API client, token refresh | 🔴 Kritik |
| `frontend/src/api/index.ts` | API functions | 🟡 Önemli |
| `frontend/src/types/index.ts` | TypeScript types | 🟡 Önemli |
| `frontend/src/pages/CreateCluster.tsx` | Cluster form | 🔴 Kritik |
| `frontend/src/pages/Login.tsx` | Login page | 🔴 Kritik |

### DevOps Kritik Dosyalar
| Dosya | Amaç | Öncelik |
|-------|------|---------|
| `docker/Dockerfile.api` | Backend image | 🔴 Kritik |
| `docker/Dockerfile.ui` | Frontend image | 🔴 Kritik |
| `docker-compose.yml` | Dev environment | 🟡 Önemli |
| `helm/kubeatlas/values.yaml` | Helm config | 🔴 Kritik |
| `.github/workflows/ci.yml` | CI/CD pipeline | 🔴 Kritik |

---

## 🔍 SORGU ŞABLONLARI

### 1️⃣ Proje Keşfi (İlk Adım)
```
Şu projeyi inceliyorum: KubeAtlas
Önce proje yapısını anlamak için:
1. Dizin yapısını göster (backend/, frontend/, helm/, docker/)
2. README.md'yi oku
3. Ana entry point'leri bul (main.go, App.tsx)
4. Teknoloji stack'i özetle
```

### 2️⃣ Backend Tam İnceleme
```
Backend'i detaylı incele:

A) Entry Point (cmd/api/main.go):
   - Graceful shutdown var mı?
   - Middleware sırası doğru mu?
   - Health endpoint'ler tanımlı mı?

B) Handlers (internal/api/handlers/):
   - Tüm endpoint'leri listele
   - Input validation var mı?
   - Error response format tutarlı mı?

C) Services (internal/services/):
   - Business logic doğru mu?
   - Transaction kullanılıyor mu?
   - Audit logging yapılıyor mu?

D) Repositories (internal/database/repositories/):
   - SQL injection koruması var mı?
   - Soft delete doğru mu?
   - Pagination çalışıyor mu?

E) Middleware (internal/api/middleware/):
   - JWT validation tam mı?
   - Rate limiting çalışıyor mu?
   - CORS policy doğru mu?
```

### 3️⃣ Frontend Tam İnceleme
```
Frontend'i detaylı incele:

A) API Client (src/api/client.ts):
   - Token refresh logic doğru mu?
   - Infinite loop koruması var mı?
   - Error handling tutarlı mı?

B) Pages (src/pages/):
   - Loading state'ler var mı?
   - Error state'ler gösteriliyor mu?
   - Form validation çalışıyor mu?

C) Types (src/types/):
   - Backend ile uyumlu mu?
   - Eksik type var mı?
```

### 4️⃣ Güvenlik Taraması
```
Güvenlik açısından şunları kontrol et:

1. AUTHENTICATION:
   - JWT secret minimum 32 char mı?
   - Token expiry uygun mu?
   - Password bcrypt ile mi hash'leniyor?

2. ENCRYPTION:
   - Sensitive data encrypt ediliyor mu?
   - AES-256-GCM doğru mu?
   - Nonce unique mi?

3. INPUT VALIDATION:
   - SQL injection koruması var mı?
   - XSS koruması var mı?
   - Request body limit var mı?

4. NETWORK:
   - CORS policy restrictive mi?
   - Rate limiting aktif mi?
   - TLS zorunlu mu?
```

### 5️⃣ Compile/Build Test
```
Projenin derlenmesini test et:

BACKEND:
cd backend && go build ./cmd/api

FRONTEND:
cd frontend && npm ci && npm run build

HELM:
helm lint helm/kubeatlas

Hata varsa:
1. Hata mesajını oku
2. İlgili dosyayı bul
3. Satır numarasına git
4. Düzelt ve tekrar dene
```

### 6️⃣ Hata Ayıklama
```
[DOSYA_ADI] dosyasında hata var. İncele:

1. Syntax hatası var mı?
2. Import'lar doğru mu?
3. Fonksiyon imzaları uyumlu mu?
4. Type'lar doğru mu?
5. Null/nil check eksik mi?

Hata mesajı: [HATA_MESAJI]
Satır: [SATIR_NO]
```

### 7️⃣ Production Readiness
```
Projenin production-ready olup olmadığını değerlendir:

CHECKLIST:
□ JWT secret değiştirildi
□ Encryption key değiştirildi  
□ Database password güçlü
□ TLS aktif
□ Rate limiting aktif
□ Health check'ler çalışıyor
□ Logging yeterli
□ Test coverage %70+
□ Documentation tam
□ CI/CD pipeline çalışıyor

Her madde için PASS/FAIL belirt.
```

---

## ⚡ HIZLI KOMUTLAR

### Backend
```bash
# Build
cd backend && go build -o /tmp/test ./cmd/api

# Test
cd backend && go test -v ./...

# Test with coverage
cd backend && go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out

# Lint
cd backend && golangci-lint run ./...

# Vet
cd backend && go vet ./...
```

### Frontend
```bash
# Install
cd frontend && npm ci

# Build
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Type check
cd frontend && npx tsc --noEmit

# Test
cd frontend && npm run test:run
```

### Docker
```bash
# Build images
docker build -t kubeatlas-api -f docker/Dockerfile.api .
docker build -t kubeatlas-ui -f docker/Dockerfile.ui .

# Start dev environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f
```

### Helm
```bash
# Lint
helm lint helm/kubeatlas

# Template (dry-run)
helm template kubeatlas helm/kubeatlas --debug

# Install
helm install kubeatlas helm/kubeatlas -n kubeatlas --create-namespace

# Upgrade
helm upgrade kubeatlas helm/kubeatlas -n kubeatlas
```

---

## 🚨 YAYGIN HATALAR VE ÇÖZÜMLERİ

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `undefined: services.XxxRequest` | Type tanımı yok | org_services.go'da type tanımla |
| `too many arguments in call` | Fonksiyon imzası uyumsuz | Service ve handler'ı karşılaştır |
| `cannot use X as Y` | Type mismatch | Type dönüşümü yap |
| `expected ';', found '('` | Syntax hatası | Parantez/noktalı virgül kontrol |
| `golint: exported function should have comment` | Comment eksik | Fonksiyona godoc comment ekle |
| `gomnd: magic number` | Hardcoded sayı | Constant tanımla |
| `duplicate key value violates unique constraint` | Aynı kayıt var | Veriyi kontrol et |

---

## 📊 KALİTE METRİKLERİ

| Metrik | Hedef | Ölçüm Komutu |
|--------|-------|--------------|
| Test Coverage | %70+ | `go tool cover -func=coverage.out` |
| Lint Errors | 0 | `golangci-lint run` |
| TypeScript Errors | 0 | `npx tsc --noEmit` |
| Security Vulns | 0 Critical | `trivy fs .` |
| Build Time | <2 dk | `time go build ./...` |

---

## 🔄 İNCELEME SIRASI

```
1. README.md → Projeyi anla
2. main.go → Entry point'i incele
3. config.go → Konfigürasyonu anla
4. handlers.go → API endpoint'lerini gör
5. *_service.go → Business logic'i incele
6. *_repo.go → Data layer'ı kontrol et
7. middleware/*.go → Security'yi doğrula
8. Dockerfile* → Container'ları incele
9. ci.yml → CI/CD'yi kontrol et
10. Test dosyaları → Coverage'ı değerlendir
```

---

## 📝 RAPOR ŞABLONU

```markdown
# KubeAtlas İnceleme Raporu
Tarih: [TARİH]
İnceleyen: [İSİM/MODEL]

## Özet
- Toplam dosya: X
- İncelenen dosya: Y
- Bulunan hata: Z
- Kritik hata: N

## Bulgular

### 🔴 Kritik
1. [DOSYA:SATIR] - [AÇIKLAMA]

### 🟡 Orta
1. [DOSYA:SATIR] - [AÇIKLAMA]

### 🟢 Düşük
1. [DOSYA:SATIR] - [AÇIKLAMA]

## Öneriler
1. [ÖNERİ 1]
2. [ÖNERİ 2]

## Sonuç
Production Ready: EVET/HAYIR
Gerekli Aksiyonlar: [LİSTE]
```

---

**Son Güncelleme:** 2026-03-04
