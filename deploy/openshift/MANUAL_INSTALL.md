# KubeAtlas OpenShift Manuel Kurulum Rehberi

## Ön Gereksinimler
- OpenShift CLI (`oc`) kurulu
- Helm 3.x kurulu
- OpenShift cluster'a erişim
- GitHub Personal Access Token (PAT) - packages okuma izinli

---

## ADIM 1: OpenShift'e Login

```bash
oc login --token=<TOKEN> --server=https://<API_SERVER>:6443
```

---

## ADIM 2: Proje Oluştur

```bash
oc new-project kubeatlas
```

---

## ADIM 3: GitHub Container Registry Secret Oluştur

GitHub'dan image çekmek için PAT token gerekli. 
GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token
Gerekli izin: `read:packages`

```bash
oc create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=ozcanfpolat \
  --docker-password=<GITHUB_PAT_TOKEN> \
  --docker-email=your-email@example.com

# Secret'ı default service account'a bağla
oc secrets link default ghcr-secret --for=pull
```

---

## ADIM 4: Uygulama Secret'larını Oluştur

```bash
oc create secret generic kubeatlas-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=ENCRYPTION_KEY=$(openssl rand -hex 32) \
  --from-literal=DB_PASSWORD=$(openssl rand -hex 16)
```

---

## ADIM 5: PostgreSQL Kur

```bash
# Helm repo ekle
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# DB Password'u al
DB_PASSWORD=$(oc get secret kubeatlas-secrets -o jsonpath='{.data.DB_PASSWORD}' | base64 -d)

# PostgreSQL kur
helm install kubeatlas-db bitnami/postgresql \
  --set auth.postgresPassword=$DB_PASSWORD \
  --set auth.username=kubeatlas \
  --set auth.password=$DB_PASSWORD \
  --set auth.database=kubeatlas \
  --set primary.persistence.size=10Gi \
  --set primary.podSecurityContext.enabled=false \
  --set primary.containerSecurityContext.enabled=false

# Hazır olmasını bekle
oc wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql --timeout=300s
```

---

## ADIM 6: KubeAtlas Uygulamasını Kur

```bash
# YAML dosyasını uygula
oc apply -f deploy/openshift/manual-install.yaml
```

---

## ADIM 7: Durumu Kontrol Et

```bash
# Pod'ları kontrol et
oc get pods

# Beklenen çıktı:
# NAME                             READY   STATUS    RESTARTS   AGE
# kubeatlas-api-xxx                1/1     Running   0          1m
# kubeatlas-db-postgresql-0        1/1     Running   0          3m
# kubeatlas-ui-xxx                 1/1     Running   0          1m

# Route'u al
oc get route kubeatlas

# Service'leri kontrol et
oc get svc
```

---

## ADIM 8: Uygulamaya Eriş

```bash
# Route URL'ini al
ROUTE_URL=$(oc get route kubeatlas -o jsonpath='{.spec.host}')
echo "KubeAtlas URL: https://$ROUTE_URL"
```

**Varsayılan Giriş Bilgileri:**
- Email: `admin@kubeatlas.local`
- Password: `admin123`

---

## Sorun Giderme

### Pod başlamıyorsa:
```bash
oc describe pod <pod-name>
oc logs <pod-name>
```

### Image çekilemiyorsa:
```bash
# Secret'ı kontrol et
oc get secret ghcr-secret -o yaml

# Service account'a bağlı mı kontrol et
oc get sa default -o yaml
```

### Database bağlantı hatası:
```bash
# PostgreSQL pod'unu kontrol et
oc logs kubeatlas-db-postgresql-0

# Service'i kontrol et
oc get svc kubeatlas-db-postgresql
```

---

## Temizlik (Opsiyonel)

Uygulamayı kaldırmak için:

```bash
oc delete -f deploy/openshift/manual-install.yaml
helm uninstall kubeatlas-db
oc delete secret kubeatlas-secrets ghcr-secret
oc delete project kubeatlas
```
