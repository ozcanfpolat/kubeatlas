# KubeAtlas AI Assistant

The AI Assistant is an **optional addon** for KubeAtlas that provides a natural language chat interface powered by your own local LLM. Ask questions about your clusters, namespaces, teams, and dependencies in plain English or Turkish.

> **Important:** This addon does not affect the core KubeAtlas installation. It runs as a separate pod and can be added or removed at any time.

## How It Works

```
You (Browser)
    ↕ HTTPS
AI Assistant Pod (:8090)
    ├── → Your LLM (LiteLLM/vLLM/Ollama) — function calling / tool use
    └── → KubeAtlas API (:8080, internal) — authenticated REST calls
```

1. You ask a question in the chat UI
2. The assistant sends your question + available tools to your LLM
3. The LLM decides which KubeAtlas API calls to make (function calling)
4. Tools execute against the KubeAtlas API and return results
5. The LLM summarizes the results in natural language
6. You see the answer in the chat

**No data leaves your network.** The LLM is yours, the API is yours, everything stays internal.

## Prerequisites

- KubeAtlas deployed and running
- An OpenAI-compatible LLM endpoint with **tool/function calling** support:
  - [LiteLLM](https://github.com/BerriAI/litellm) (recommended — proxies to any backend)
  - [vLLM](https://github.com/vllm-project/vllm) (direct, needs compatible model)
  - [Ollama](https://ollama.com) (simple local setup)
- A model that supports tool calling: Qwen 2.5 (7B+), Llama 3.1 (8B+), Mistral (7B+)

## Quick Start (OpenShift)

### 1. Edit the Secret

Open `deploy/openshift/ai-assistant.yaml` and update the Secret values:

| Value | Description | Example |
|-------|-------------|---------|
| `LITELLM_BASE_URL` | Your LLM endpoint + `/v1` | `https://litellm.apps.example.com/v1` |
| `LITELLM_API_KEY` | API key for the LLM endpoint | `sk-...` |
| `LITELLM_MODEL` | Model name in your LLM config | `qwen2.5-72b` |
| `KUBEATLAS_API_PASSWORD` | KubeAtlas admin password | (your password) |

### 2. Deploy

```bash
# Deploy the AI Assistant alongside KubeAtlas
oc apply -f deploy/openshift/ai-assistant.yaml -n kubeatlas

# Wait for rollout
oc rollout status deployment/kubeatlas-ai -n kubeatlas

# Get the URL
echo "https://$(oc get route kubeatlas-ai -n kubeatlas -o jsonpath='{.spec.host}')"
```

### 3. Use It

Open the URL in your browser. You'll see a chat interface with quick action buttons and a text input. Ask anything about your KubeAtlas data:

- "Show me dashboard statistics"
- "List production clusters"
- "Are there any orphaned namespaces?"
- "Summarize recent audit logs"
- "What is the dependency matrix?"

The UI supports both English and Turkish — toggle with the 🌐 button.

## Quick Start (Helm)

```bash
helm upgrade --install kubeatlas ./helm/kubeatlas \
  --namespace kubeatlas \
  --set ai.enabled=true \
  --set ai.litellm.baseUrl="https://your-litellm-url/v1" \
  --set ai.litellm.apiKey="your-api-key" \
  --set ai.litellm.model="qwen2.5-72b" \
  --set ai.kubeatlas.password="your-kubeatlas-admin-password"
```

## Available Tools

The AI Assistant has access to these KubeAtlas capabilities:

| Tool | Description |
|------|-------------|
| `get_dashboard_stats` | Dashboard statistics (clusters, namespaces, teams count) |
| `get_recent_activities` | Recent changes and events |
| `get_missing_info` | Resources with incomplete information |
| `list_clusters` | List clusters (filterable by environment/status) |
| `get_cluster` | Cluster details |
| `get_cluster_stats` | Cluster statistics by environment/type |
| `sync_cluster` | Trigger manual cluster sync |
| `list_namespaces` | List namespaces (filterable by cluster/environment) |
| `get_namespace` | Namespace details |
| `list_teams` | List teams and members |
| `list_dependencies` | Internal/external dependencies |
| `list_users` | List users |
| `list_audit_logs` | Search audit logs |
| `get_ownership_report` | Ownership coverage report |
| `get_orphaned_resources` | Orphaned resources report |
| `get_dependency_matrix` | Full dependency matrix |

## Configuration Reference

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `LITELLM_BASE_URL` | Yes | - | LLM endpoint URL (must end with `/v1`) |
| `LITELLM_API_KEY` | Yes | - | API key for LLM endpoint |
| `LITELLM_MODEL` | Yes | - | Model name in LLM config |
| `KUBEATLAS_API_URL` | No | `http://kubeatlas-api:8080/api/v1` | KubeAtlas API URL |
| `KUBEATLAS_API_EMAIL` | No | `admin@kubeatlas.local` | KubeAtlas login email |
| `KUBEATLAS_API_PASSWORD` | Yes | - | KubeAtlas login password |
| `SERVER_PORT` | No | `8090` | HTTP server port |
| `TLS_SKIP_VERIFY` | No | `false` | Skip TLS verification |

## LLM Endpoint Examples

### LiteLLM (Recommended)

LiteLLM proxies to any backend (vLLM, Ollama, HuggingFace, etc.):

```yaml
LITELLM_BASE_URL: "https://litellm.apps.example.com/v1"
LITELLM_MODEL: "qwen2.5-72b"  # model_name from LiteLLM config
```

### vLLM (Direct)

```yaml
LITELLM_BASE_URL: "http://vllm-service:8000/v1"
LITELLM_MODEL: "Qwen/Qwen2.5-72B-Instruct"
```

### Ollama

```yaml
LITELLM_BASE_URL: "http://ollama-service:11434/v1"
LITELLM_MODEL: "qwen2.5:72b"
```

## Removing the AI Assistant

```bash
# OpenShift manual install
oc delete -f deploy/openshift/ai-assistant.yaml -n kubeatlas

# Helm
helm upgrade kubeatlas ./helm/kubeatlas --set ai.enabled=false -n kubeatlas
```

This will remove only the AI Assistant. Your core KubeAtlas installation remains untouched.

## Troubleshooting

### Pod won't start
```bash
oc logs deployment/kubeatlas-ai -n kubeatlas
oc describe pod -l app.kubernetes.io/name=kubeatlas-ai -n kubeatlas
```

### LLM connection error
```bash
# Test from pod
oc exec deployment/kubeatlas-ai -n kubeatlas -- \
  python -c "import httpx; print(httpx.get('YOUR_LLM_URL/health').status_code)"
```

### Tool calling not working
Ensure your model supports function/tool calling. Recommended: Qwen 2.5 (7B+), Llama 3.1 (8B+), Mistral (7B+). Smaller models or older versions may not support this.

### KubeAtlas API error
```bash
# Test internal API access
oc exec deployment/kubeatlas-ai -n kubeatlas -- \
  python -c "import httpx; print(httpx.get('http://kubeatlas-api:8080/health').json())"
```
