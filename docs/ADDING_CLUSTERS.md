# KubeAtlas - Cluster Ekleme Rehberi

Bu rehber, KubeAtlas'a Kubernetes/OpenShift cluster'larını nasıl ekleyeceğinizi adım adım açıklar.

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Yöntem 1: ServiceAccount Token (Önerilen)](#yöntem-1-serviceaccount-token-önerilen)
3. [Yöntem 2: Kubeconfig](#yöntem-2-kubeconfig)
4. [Kendini (Self) Cluster Ekleme](#kendini-self-cluster-ekleme)
5. [Uzak Cluster Ekleme](#uzak-cluster-ekleme)
6. [OpenShift Özel Ayarlar](#openshift-özel-ayarlar)
7. [Sorun Giderme](#sorun-giderme)

---

## Genel Bakış

KubeAtlas, cluster'lara bağlanmak için iki yöntem destekler:

| Yöntem | Kullanım | Güvenlik |
|--------|----------|----------|
| **ServiceAccount Token** | Önerilen, production | Yüksek (scoped permissions) |
| **Kubeconfig** | Development, test | Orta (user credentials) |

Her iki yöntemde de KubeAtlas **read-only** erişim gerektirir:
- Namespace'leri listeleme
- Node'ları görüntüleme
- Workload'ları sayma (Deployment, StatefulSet, vb.)

---

## Yöntem 1: ServiceAccount Token (Önerilen)

### Adım 1: Agent YAML'ını Hedef Cluster'a Uygula

Her cluster'da aşağıdaki YAML'ı uygulayın:

```bash
# KubeAtlas agent manifest'ini indir veya kopyala
kubectl apply -f deploy/cluster-agent.yaml

# veya doğrudan:
cat << 'EOF' | kubectl apply -f -
---
apiVersion: v1
kind: Namespace
metadata:
  name: kubeatlas-agent
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kubeatlas-agent
  namespace: kubeatlas-agent
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kubeatlas-agent
rules:
  - apiGroups: [""]
    resources: ["namespaces", "nodes", "pods", "services", "configmaps", "secrets", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["get", "list", "watch"]
  - nonResourceURLs: ["/version", "/healthz"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubeatlas-agent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kubeatlas-agent
subjects:
  - kind: ServiceAccount
    name: kubeatlas-agent
    namespace: kubeatlas-agent
---
apiVersion: v1
kind: Secret
metadata:
  name: kubeatlas-agent-token
  namespace: kubeatlas-agent
  annotations:
    kubernetes.io/service-account.name: kubeatlas-agent
type: kubernetes.io/service-account-token
EOF
```

### Adım 2: Token'ı Al

**Kubernetes 1.24+:**
```bash
# Token'ı al
kubectl get secret kubeatlas-agent-token -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d
```

**Kubernetes 1.23 ve öncesi:**
```bash
# Secret adını bul
SECRET_NAME=$(kubectl get sa kubeatlas-agent -n kubeatlas-agent -o jsonpath='{.secrets[0].name}')

# Token'ı al
kubectl get secret $SECRET_NAME -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d
```

### Adım 3: API Server URL'ini Al

```bash
# Cluster API endpoint
kubectl cluster-info | grep "Kubernetes control plane"

# veya
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

### Adım 4: KubeAtlas'a Ekle

1. KubeAtlas UI'a giriş yapın
2. Sol menüden **Clusters** → **Add Cluster** tıklayın
3. Formu doldurun:

| Alan | Değer |
|------|-------|
| Name | `prod-ocp-cluster-1` |
| Display Name | `Production OpenShift Cluster 1` |
| Cluster Type | `openshift` |
| Environment | `production` |
| API Server URL | `https://api.ocp.example.com:6443` |
| Auth Method | `Service Account Token` |
| Token | (Adım 2'den aldığınız token) |
| Skip TLS Verify | ❌ (production'da false) |

4. **Test Connection** ile bağlantıyı test edin
5. **Create** ile cluster'ı ekleyin

---

## Yöntem 2: Kubeconfig

⚠️ **Not:** Bu yöntem development/test için önerilir. Production'da ServiceAccount kullanın.

### Adım 1: Kubeconfig Dosyasını Hazırla

```bash
# Mevcut kubeconfig'i export et
kubectl config view --flatten --minify > cluster-kubeconfig.yaml
```

### Adım 2: KubeAtlas'a Ekle

1. **Clusters** → **Add Cluster**
2. Auth Method: `Kubeconfig`
3. Kubeconfig içeriğini yapıştırın

---

## Kendini (Self) Cluster Ekleme

KubeAtlas'ın çalıştığı cluster'ı eklemek için:

### OpenShift'te:

```bash
# KubeAtlas'ın çalıştığı cluster'da agent'ı kur
oc apply -f deploy/cluster-agent.yaml

# API Server URL'ini al
oc whoami --show-server
# Örnek: https://api.ocp.example.com:6443

# Token'ı al
oc get secret kubeatlas-agent-token -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d
```

**Önemli:** Self cluster için `Skip TLS Verify` seçeneğini **false** tutun, çünkü internal CA zaten güvenilir.

---

## Uzak Cluster Ekleme

### Farklı Network'teki Cluster

Uzak cluster'a erişim için:

1. **Network Connectivity:** KubeAtlas pod'larının uzak cluster'ın API Server'ına erişebilmesi gerekir
   - VPN
   - Peering
   - Public endpoint

2. **Firewall Kuralları:**
   ```
   KubeAtlas Namespace → Remote API Server (6443/tcp)
   ```

3. **TLS Sertifikası:**
   - Self-signed CA kullanıyorsanız: `Skip TLS Verify: true` (önerilmez)
   - Proper CA kullanıyorsanız: `Skip TLS Verify: false`

### Örnek: EKS Cluster Ekleme

```bash
# EKS'te agent kur
aws eks update-kubeconfig --name my-eks-cluster --region eu-west-1
kubectl apply -f deploy/cluster-agent.yaml

# API endpoint
aws eks describe-cluster --name my-eks-cluster --query 'cluster.endpoint' --output text

# Token al
kubectl get secret kubeatlas-agent-token -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d
```

### Örnek: RKE2 Cluster Ekleme

```bash
# RKE2 cluster'a bağlan
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
kubectl apply -f deploy/cluster-agent.yaml

# API endpoint (genelde control plane node IP:6443)
kubectl cluster-info

# Token al
kubectl get secret kubeatlas-agent-token -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d
```

---

## OpenShift Özel Ayarlar

### SCC (Security Context Constraints)

KubeAtlas agent'ı için özel SCC gerekmez, varsayılan `restricted` SCC yeterlidir.

### OAuth Proxy (Opsiyonel)

OpenShift OAuth ile entegrasyon için:

```yaml
# Gelecek versiyonda desteklenecek
```

### OpenShift Specific Namespaces

KubeAtlas varsayılan olarak şu namespace'leri **hariç tutar**:
- `openshift-*`
- `kube-*`
- `default` (opsiyonel)

Bu ayarı değiştirmek için cluster düzenleme ekranında "Include System Namespaces" seçeneğini kullanın.

---

## Sorun Giderme

### Bağlantı Hatası: "connection refused"

```bash
# KubeAtlas pod'undan API Server'a erişimi test et
oc exec -it deployment/kubeatlas-api -n kubeatlas -- \
  curl -k https://api.remote-cluster.example.com:6443/healthz
```

### Token Geçersiz

```bash
# Token'ın doğru olduğunu kontrol et
TOKEN="eyJhbGc..."
curl -k -H "Authorization: Bearer $TOKEN" \
  https://api.cluster.example.com:6443/api/v1/namespaces
```

### TLS Sertifika Hatası

```bash
# Sertifikayı kontrol et
openssl s_client -connect api.cluster.example.com:6443 -showcerts

# Skip TLS geçici çözüm (önerilmez)
# Cluster düzenle → Skip TLS Verify: true
```

### Namespace'ler Görünmüyor

```bash
# Agent'ın yetkilerini kontrol et
kubectl auth can-i list namespaces --as=system:serviceaccount:kubeatlas-agent:kubeatlas-agent

# ClusterRoleBinding'i kontrol et
kubectl get clusterrolebinding kubeatlas-agent -o yaml
```

### Sync Başarısız

1. KubeAtlas loglarını kontrol et:
   ```bash
   oc logs -f deployment/kubeatlas-api -n kubeatlas | grep -i sync
   ```

2. Manual sync tetikle:
   - UI'da Cluster detayına git
   - "Sync Now" butonuna tıkla

---

## Özet Komutlar

```bash
# === HEDEF CLUSTER'DA ===

# 1. Agent'ı kur
kubectl apply -f deploy/cluster-agent.yaml

# 2. Token'ı al
TOKEN=$(kubectl get secret kubeatlas-agent-token -n kubeatlas-agent -o jsonpath='{.data.token}' | base64 -d)
echo "Token: $TOKEN"

# 3. API URL'ini al
API_URL=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
echo "API URL: $API_URL"

# 4. Bağlantıyı test et
curl -k -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/namespaces" | jq '.items[].metadata.name'
```

---

## İleri Düzey

### Multi-Cluster Federation

Çok sayıda cluster için batch ekleme:

```bash
# clusters.csv formatı:
# name,display_name,type,environment,api_url,token

while IFS=, read -r name display type env url token; do
  curl -X POST https://kubeatlas.example.com/api/v1/clusters \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$name\",
      \"display_name\": \"$display\",
      \"cluster_type\": \"$type\",
      \"environment\": \"$env\",
      \"api_server_url\": \"$url\",
      \"service_account_token\": \"$token\"
    }"
done < clusters.csv
```

### Otomatik Sync Yapılandırma

Varsayılan sync interval: 30 dakika

Değiştirmek için:
```bash
oc set env deployment/kubeatlas-api SYNC_INTERVAL_MINUTES=15 -n kubeatlas
```
