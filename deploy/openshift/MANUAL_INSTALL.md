# KubeAtlas OpenShift Manual Installation Guide

This guide provides step-by-step instructions for deploying KubeAtlas on OpenShift.

## Prerequisites

- OpenShift 4.10+ cluster access
- `oc` CLI tool configured
- GitHub Personal Access Token (for pulling images from ghcr.io)

## Installation Steps

### 1. Create Project

```bash
oc new-project kubeatlas
```

### 2. Create GitHub Container Registry Secret

Generate a Personal Access Token at https://github.com/settings/tokens with `read:packages` scope.

```bash
oc create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN
```

### 3. Install PostgreSQL

Using Bitnami Helm chart:

```bash
# Add Bitnami repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install PostgreSQL
helm install kubeatlas-db bitnami/postgresql \
  --set auth.username=kubeatlas \
  --set auth.password=YOUR_SECURE_PASSWORD \
  --set auth.database=kubeatlas \
  --set primary.persistence.size=10Gi \
  --set primary.podSecurityContext.enabled=false \
  --set primary.containerSecurityContext.enabled=false

# Wait for PostgreSQL to be ready
oc wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql --timeout=300s
```

### 4. Initialize Database Schema

```bash
# Get PostgreSQL pod name
PG_POD=$(oc get pod -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].metadata.name}')

# Copy schema
oc cp database/schema.sql $PG_POD:/tmp/schema.sql
oc cp database/seed.sql $PG_POD:/tmp/seed.sql

# Apply schema
oc exec $PG_POD -- psql -U kubeatlas -d kubeatlas -f /tmp/schema.sql
oc exec $PG_POD -- psql -U kubeatlas -d kubeatlas -f /tmp/seed.sql
```

### 5. Create Application Secrets

```bash
oc create secret generic kubeatlas-secrets \
  --from-literal=DB_PASSWORD='YOUR_DB_PASSWORD' \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 6. Deploy KubeAtlas

```bash
oc apply -f deploy/openshift/manual-install.yaml
```

### 7. Wait for Deployment

```bash
oc wait --for=condition=ready pod -l app=kubeatlas --timeout=300s
```

### 8. Get Route URL

```bash
oc get route kubeatlas -o jsonpath='{.spec.host}'
```

## Verification

### Check Pod Status

```bash
oc get pods -l app=kubeatlas
```

Expected output:
```
NAME                             READY   STATUS    RESTARTS   AGE
kubeatlas-api-xxx-xxx            1/1     Running   0          2m
kubeatlas-ui-xxx-xxx             1/1     Running   0          2m
```

### Check Logs

```bash
# API logs
oc logs -l app=kubeatlas,component=api --tail=50

# UI logs
oc logs -l app=kubeatlas,component=ui --tail=50
```

### Test Health Endpoints

```bash
ROUTE=$(oc get route kubeatlas -o jsonpath='{.spec.host}')

# Test UI
curl -k https://$ROUTE/health

# Test API (through UI proxy)
curl -k https://$ROUTE/api/health
```

## Default Login

| Field | Value |
|-------|-------|
| Email | `admin@kubeatlas.local` |
| Password | `admin123` |

> ⚠️ **Change the default password immediately after first login!**

## Troubleshooting

### Image Pull Errors

```bash
# Check secret exists
oc get secret ghcr-secret

# Verify secret is linked to default service account
oc secrets link default ghcr-secret --for=pull
```

### Database Connection Errors

```bash
# Check DB connectivity from API pod
oc exec deployment/kubeatlas-api -- nc -zv kubeatlas-db-postgresql 5432

# Check environment variables
oc exec deployment/kubeatlas-api -- env | grep DB_
```

### Pod Not Starting

```bash
# Check events
oc get events --sort-by=.lastTimestamp

# Check pod description
oc describe pod -l app=kubeatlas
```

## Updating

To update to a new version:

```bash
# Pull latest images
oc delete pod -l app=kubeatlas,component=api
oc delete pod -l app=kubeatlas,component=ui

# Wait for new pods
oc wait --for=condition=ready pod -l app=kubeatlas --timeout=180s
```

## AI Assistant (Optional Addon)

Deploy an AI-powered chat interface that uses your local LLM to query KubeAtlas data in natural language. Supports English and Turkish.

### Prerequisites

- KubeAtlas running in the `kubeatlas` namespace (steps above)
- An OpenAI-compatible LLM endpoint with tool/function calling support (LiteLLM, vLLM, or Ollama)
- A model that supports tool calling: Qwen 2.5 (7B+), Llama 3.1 (8B+), Mistral (7B+)

### Step 1: Create the Secret

```bash
oc create secret generic kubeatlas-ai-secret \
  --from-literal=LITELLM_BASE_URL="https://YOUR_LLM_ENDPOINT/v1" \
  --from-literal=LITELLM_API_KEY="YOUR_API_KEY" \
  --from-literal=LITELLM_MODEL="your-model-name" \
  --from-literal=KUBEATLAS_API_EMAIL="admin@kubeatlas.local" \
  --from-literal=KUBEATLAS_API_PASSWORD="YOUR_ADMIN_PASSWORD" \
  -n kubeatlas \
  --dry-run=client -o yaml | oc apply -f -
```

### Step 2: Deploy

```bash
oc apply -f deploy/openshift/ai-assistant.yaml -n kubeatlas
oc rollout status deployment/kubeatlas-ai -n kubeatlas
```

### Step 3: Access

```bash
# Get the route URL
echo "https://$(oc get route kubeatlas-ai -n kubeatlas -o jsonpath='{.spec.host}')"
```

Open the URL in your browser. Ask questions like:
- "Show dashboard statistics"
- "List production clusters"
- "Are there any orphaned namespaces?"

Toggle language (EN/TR) with the 🌐 button in the top right.

### Remove AI Assistant

```bash
oc delete -f deploy/openshift/ai-assistant.yaml -n kubeatlas
```

This only removes the AI Assistant. Your core KubeAtlas installation is not affected.

For more details, see [docs/AI_ASSISTANT.md](../../docs/AI_ASSISTANT.md).

---

## Uninstallation

```bash
# Delete KubeAtlas resources
oc delete -f deploy/openshift/manual-install.yaml

# Delete secrets
oc delete secret kubeatlas-secrets ghcr-secret

# Delete PostgreSQL (WARNING: This deletes all data!)
helm uninstall kubeatlas-db

# Delete PVC (WARNING: This deletes all data!)
oc delete pvc kubeatlas-uploads data-kubeatlas-db-postgresql-0

# Delete project
oc delete project kubeatlas
```

## Custom Route Hostname

To use a custom hostname, edit the Route resource:

```bash
oc edit route kubeatlas
```

Add `host` field under `spec`:

```yaml
spec:
  host: kubeatlas.your-domain.com
  to:
    kind: Service
    name: kubeatlas-ui
```

Make sure DNS is configured to point to your OpenShift router.
