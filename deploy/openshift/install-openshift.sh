#!/bin/bash
# ============================================
# KubeAtlas OpenShift Installation Script
# ============================================
# Usage: ./install-openshift.sh
# 
# Prerequisites:
#   - oc CLI installed and logged in
#   - helm CLI installed
#   - Access to OpenShift cluster with admin rights

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - CHANGE THESE!
NAMESPACE="kubeatlas"
CLUSTER_DOMAIN=""  # Will be auto-detected

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           KubeAtlas OpenShift Installation                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# Step 0: Pre-flight checks
# ============================================
echo -e "${YELLOW}[Step 0] Pre-flight checks...${NC}"

# Check oc
if ! command -v oc &> /dev/null; then
    echo -e "${RED}ERROR: oc CLI not found. Please install OpenShift CLI.${NC}"
    exit 1
fi

# Check helm
if ! command -v helm &> /dev/null; then
    echo -e "${RED}ERROR: helm CLI not found. Please install Helm 3.${NC}"
    exit 1
fi

# Check login
if ! oc whoami &> /dev/null; then
    echo -e "${RED}ERROR: Not logged into OpenShift. Run 'oc login' first.${NC}"
    exit 1
fi

CURRENT_USER=$(oc whoami)
echo -e "${GREEN}✓ Logged in as: ${CURRENT_USER}${NC}"

# Auto-detect cluster domain
CLUSTER_DOMAIN=$(oc get ingresses.config.openshift.io cluster -o jsonpath='{.spec.domain}' 2>/dev/null || echo "")
if [ -z "$CLUSTER_DOMAIN" ]; then
    echo -e "${YELLOW}WARNING: Could not auto-detect cluster domain.${NC}"
    read -p "Enter your apps domain (e.g., apps.mycluster.com): " CLUSTER_DOMAIN
fi
echo -e "${GREEN}✓ Cluster domain: ${CLUSTER_DOMAIN}${NC}"

KUBEATLAS_DOMAIN="kubeatlas.${CLUSTER_DOMAIN}"
echo -e "${GREEN}✓ KubeAtlas will be available at: https://${KUBEATLAS_DOMAIN}${NC}"
echo ""

# ============================================
# Step 1: Create namespace
# ============================================
echo -e "${YELLOW}[Step 1] Creating namespace...${NC}"

if oc get project ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✓ Namespace '${NAMESPACE}' already exists${NC}"
else
    oc new-project ${NAMESPACE} --display-name="KubeAtlas" --description="Kubernetes Inventory Management"
    echo -e "${GREEN}✓ Created namespace '${NAMESPACE}'${NC}"
fi
oc project ${NAMESPACE}
echo ""

# ============================================
# Step 2: Create secrets
# ============================================
echo -e "${YELLOW}[Step 2] Creating secrets...${NC}"

# Check if secrets already exist
if oc get secret kubeatlas-secrets -n ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✓ Secrets already exist, skipping...${NC}"
    DB_PASSWORD=$(oc get secret kubeatlas-secrets -n ${NAMESPACE} -o jsonpath='{.data.db-password}' | base64 -d)
else
    # Generate secure random values
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
    
    oc create secret generic kubeatlas-secrets \
        --from-literal=jwt-secret="${JWT_SECRET}" \
        --from-literal=encryption-key="${ENCRYPTION_KEY}" \
        --from-literal=db-password="${DB_PASSWORD}" \
        -n ${NAMESPACE}
    
    echo -e "${GREEN}✓ Created kubeatlas-secrets${NC}"
fi

# Create app secrets for env vars
if oc get secret kubeatlas-app-secrets -n ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✓ App secrets already exist${NC}"
else
    JWT_SECRET=$(oc get secret kubeatlas-secrets -n ${NAMESPACE} -o jsonpath='{.data.jwt-secret}' | base64 -d)
    ENCRYPTION_KEY=$(oc get secret kubeatlas-secrets -n ${NAMESPACE} -o jsonpath='{.data.encryption-key}' | base64 -d)
    DB_PASSWORD=$(oc get secret kubeatlas-secrets -n ${NAMESPACE} -o jsonpath='{.data.db-password}' | base64 -d)
    
    oc create secret generic kubeatlas-app-secrets \
        --from-literal=JWT_SECRET="${JWT_SECRET}" \
        --from-literal=ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
        --from-literal=DB_PASSWORD="${DB_PASSWORD}" \
        -n ${NAMESPACE}
    
    echo -e "${GREEN}✓ Created kubeatlas-app-secrets${NC}"
fi
echo ""

# ============================================
# Step 3: Install PostgreSQL
# ============================================
echo -e "${YELLOW}[Step 3] Installing PostgreSQL...${NC}"

# Add Bitnami repo
helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
helm repo update

# Check if already installed
if helm status kubeatlas-db -n ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL already installed${NC}"
else
    DB_PASSWORD=$(oc get secret kubeatlas-secrets -n ${NAMESPACE} -o jsonpath='{.data.db-password}' | base64 -d)
    
    helm install kubeatlas-db bitnami/postgresql \
        --namespace ${NAMESPACE} \
        --set global.postgresql.auth.username=kubeatlas \
        --set global.postgresql.auth.password="${DB_PASSWORD}" \
        --set global.postgresql.auth.database=kubeatlas \
        --set primary.persistence.size=20Gi \
        --set primary.podSecurityContext.enabled=true \
        --set primary.podSecurityContext.fsGroup=null \
        --set primary.containerSecurityContext.enabled=true \
        --set primary.containerSecurityContext.runAsUser=null \
        --set primary.containerSecurityContext.runAsNonRoot=true \
        --set architecture=standalone \
        --wait --timeout=5m
    
    echo -e "${GREEN}✓ PostgreSQL installed${NC}"
fi

# Wait for PostgreSQL to be ready
echo -e "${BLUE}Waiting for PostgreSQL to be ready...${NC}"
oc wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n ${NAMESPACE} --timeout=300s
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
echo ""

# ============================================
# Step 4: Build & Deploy KubeAtlas (from source)
# ============================================
echo -e "${YELLOW}[Step 4] Deploying KubeAtlas...${NC}"

# Option A: Deploy from pre-built images (if available)
# Option B: Build from source using OpenShift BuildConfig

# For now, we'll create deployments directly
# In production, use Helm chart or Operator

# Create Backend Deployment
cat <<EOF | oc apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubeatlas-api
  namespace: ${NAMESPACE}
  labels:
    app: kubeatlas
    component: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kubeatlas
      component: api
  template:
    metadata:
      labels:
        app: kubeatlas
        component: api
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: api
        image: ghcr.io/ozcanfpolat/kubeatlas-api:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: SERVER_MODE
          value: "release"
        - name: SERVER_PORT
          value: "8080"
        - name: DB_HOST
          value: "kubeatlas-db-postgresql"
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: "kubeatlas"
        - name: DB_NAME
          value: "kubeatlas"
        - name: DB_SSLMODE
          value: "disable"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: kubeatlas-app-secrets
              key: DB_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: kubeatlas-app-secrets
              key: JWT_SECRET
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: kubeatlas-app-secrets
              key: ENCRYPTION_KEY
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          seccompProfile:
            type: RuntimeDefault
          capabilities:
            drop:
            - ALL
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
EOF

echo -e "${GREEN}✓ API Deployment created${NC}"

# Create Backend Service
cat <<EOF | oc apply -f -
apiVersion: v1
kind: Service
metadata:
  name: kubeatlas-api
  namespace: ${NAMESPACE}
  labels:
    app: kubeatlas
    component: api
spec:
  selector:
    app: kubeatlas
    component: api
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  type: ClusterIP
EOF

echo -e "${GREEN}✓ API Service created${NC}"

# Create Frontend Deployment
cat <<EOF | oc apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubeatlas-ui
  namespace: ${NAMESPACE}
  labels:
    app: kubeatlas
    component: ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kubeatlas
      component: ui
  template:
    metadata:
      labels:
        app: kubeatlas
        component: ui
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: ui
        image: ghcr.io/ozcanfpolat/kubeatlas-ui:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: API_URL
          value: "http://kubeatlas-api:8080"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          seccompProfile:
            type: RuntimeDefault
          capabilities:
            drop:
            - ALL
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
EOF

echo -e "${GREEN}✓ UI Deployment created${NC}"

# Create Frontend Service
cat <<EOF | oc apply -f -
apiVersion: v1
kind: Service
metadata:
  name: kubeatlas-ui
  namespace: ${NAMESPACE}
  labels:
    app: kubeatlas
    component: ui
spec:
  selector:
    app: kubeatlas
    component: ui
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  type: ClusterIP
EOF

echo -e "${GREEN}✓ UI Service created${NC}"

# Create OpenShift Route
cat <<EOF | oc apply -f -
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: kubeatlas
  namespace: ${NAMESPACE}
  labels:
    app: kubeatlas
  annotations:
    haproxy.router.openshift.io/timeout: 120s
spec:
  host: ${KUBEATLAS_DOMAIN}
  to:
    kind: Service
    name: kubeatlas-ui
    weight: 100
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  wildcardPolicy: None
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: kubeatlas-api
  namespace: ${NAMESPACE}
  labels:
    app: kubeatlas
  annotations:
    haproxy.router.openshift.io/timeout: 120s
spec:
  host: ${KUBEATLAS_DOMAIN}
  path: /api
  to:
    kind: Service
    name: kubeatlas-api
    weight: 100
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  wildcardPolicy: None
EOF

echo -e "${GREEN}✓ OpenShift Routes created${NC}"
echo ""

# ============================================
# Step 5: Wait for deployment
# ============================================
echo -e "${YELLOW}[Step 5] Waiting for deployments...${NC}"

echo -e "${BLUE}Waiting for API pods...${NC}"
oc wait --for=condition=available deployment/kubeatlas-api -n ${NAMESPACE} --timeout=300s || true

echo -e "${BLUE}Waiting for UI pods...${NC}"
oc wait --for=condition=available deployment/kubeatlas-ui -n ${NAMESPACE} --timeout=300s || true

echo ""

# ============================================
# Summary
# ============================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Installation Complete! 🎉                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}KubeAtlas URL:${NC} https://${KUBEATLAS_DOMAIN}"
echo ""
echo -e "${BLUE}Default Credentials:${NC}"
echo -e "  Email:    admin@kubeatlas.local"
echo -e "  Password: admin123"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change the default password after first login!${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  oc get pods -n ${NAMESPACE}              # Check pod status"
echo "  oc logs -f deploy/kubeatlas-api -n ${NAMESPACE}   # API logs"
echo "  oc logs -f deploy/kubeatlas-ui -n ${NAMESPACE}    # UI logs"
echo "  oc get routes -n ${NAMESPACE}            # Get URLs"
echo ""
echo -e "${BLUE}To add clusters, see:${NC} docs/ADDING_CLUSTERS.md"
