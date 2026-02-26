#!/bin/bash
# ==============================================
# KubeAtlas OpenShift Installation Script
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${KUBEATLAS_NAMESPACE:-kubeatlas}"
RELEASE_NAME="${KUBEATLAS_RELEASE:-kubeatlas}"
DOMAIN="${KUBEATLAS_DOMAIN:-apps.ocp.example.com}"
STORAGE_CLASS="${KUBEATLAS_STORAGE_CLASS:-ocs-storagecluster-ceph-rbd}"
STORAGE_CLASS_RWX="${KUBEATLAS_STORAGE_CLASS_RWX:-ocs-storagecluster-cephfs}"

echo -e "${BLUE}=============================================="
echo "KubeAtlas OpenShift Installation"
echo -e "==============================================${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}[1/8] Checking prerequisites...${NC}"
    
    if ! command -v oc &> /dev/null; then
        echo -e "${RED}Error: oc CLI not found. Please install OpenShift CLI.${NC}"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        echo -e "${RED}Error: helm not found. Please install Helm 3.${NC}"
        exit 1
    fi
    
    # Check if logged in
    if ! oc whoami &> /dev/null; then
        echo -e "${RED}Error: Not logged in to OpenShift. Run 'oc login' first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Prerequisites OK${NC}"
    echo "  - oc version: $(oc version --client -o json | jq -r '.clientVersion.gitVersion')"
    echo "  - helm version: $(helm version --short)"
    echo "  - Logged in as: $(oc whoami)"
    echo "  - Server: $(oc whoami --show-server)"
}

# Create namespace
create_namespace() {
    echo -e "\n${YELLOW}[2/8] Creating namespace...${NC}"
    
    if oc get namespace "$NAMESPACE" &> /dev/null; then
        echo "  Namespace '$NAMESPACE' already exists"
    else
        oc create namespace "$NAMESPACE"
        echo -e "${GREEN}✓ Namespace '$NAMESPACE' created${NC}"
    fi
    
    # Set current project
    oc project "$NAMESPACE"
}

# Create secrets
create_secrets() {
    echo -e "\n${YELLOW}[3/8] Creating secrets...${NC}"
    
    # Generate random passwords if not provided
    DB_PASSWORD="${KUBEATLAS_DB_PASSWORD:-$(openssl rand -base64 24)}"
    JWT_SECRET="${KUBEATLAS_JWT_SECRET:-$(openssl rand -base64 32)}"
    ENCRYPTION_KEY="${KUBEATLAS_ENCRYPTION_KEY:-$(openssl rand -base64 32)}"
    
    # Database secret
    if oc get secret kubeatlas-db-secret -n "$NAMESPACE" &> /dev/null; then
        echo "  Secret 'kubeatlas-db-secret' already exists"
    else
        oc create secret generic kubeatlas-db-secret \
            --from-literal=postgres-password="$DB_PASSWORD" \
            --from-literal=password="$DB_PASSWORD" \
            -n "$NAMESPACE"
        echo -e "${GREEN}✓ Database secret created${NC}"
    fi
    
    # Application secret
    if oc get secret kubeatlas-app-secret -n "$NAMESPACE" &> /dev/null; then
        echo "  Secret 'kubeatlas-app-secret' already exists"
    else
        oc create secret generic kubeatlas-app-secret \
            --from-literal=jwt-secret="$JWT_SECRET" \
            --from-literal=encryption-key="$ENCRYPTION_KEY" \
            -n "$NAMESPACE"
        echo -e "${GREEN}✓ Application secret created${NC}"
    fi
    
    # Save credentials to file (for reference)
    echo -e "\n${YELLOW}Credentials saved to: kubeatlas-credentials.txt${NC}"
    cat > kubeatlas-credentials.txt << EOF
# KubeAtlas Credentials
# Generated: $(date)
# KEEP THIS FILE SECURE!

Database Password: $DB_PASSWORD
JWT Secret: $JWT_SECRET
Encryption Key: $ENCRYPTION_KEY

Admin Login:
  URL: https://kubeatlas.${DOMAIN}
  Email: admin@kubeatlas.local
  Password: admin123 (CHANGE THIS!)
EOF
    chmod 600 kubeatlas-credentials.txt
}

# Deploy PostgreSQL
deploy_postgresql() {
    echo -e "\n${YELLOW}[4/8] Deploying PostgreSQL...${NC}"
    
    # Add Bitnami repo
    helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
    helm repo update
    
    # Check if already installed
    if helm status postgresql -n "$NAMESPACE" &> /dev/null; then
        echo "  PostgreSQL already installed, upgrading..."
        HELM_CMD="upgrade"
    else
        HELM_CMD="install"
    fi
    
    helm $HELM_CMD postgresql bitnami/postgresql \
        --namespace "$NAMESPACE" \
        --set auth.database=kubeatlas \
        --set auth.username=kubeatlas \
        --set auth.existingSecret=kubeatlas-db-secret \
        --set auth.secretKeys.adminPasswordKey=postgres-password \
        --set auth.secretKeys.userPasswordKey=password \
        --set primary.persistence.enabled=true \
        --set primary.persistence.size=20Gi \
        --set primary.persistence.storageClass="$STORAGE_CLASS" \
        --set primary.podSecurityContext.enabled=false \
        --set primary.containerSecurityContext.enabled=false \
        --wait --timeout 5m
    
    echo -e "${GREEN}✓ PostgreSQL deployed${NC}"
}

# Initialize database
init_database() {
    echo -e "\n${YELLOW}[5/8] Initializing database...${NC}"
    
    # Wait for PostgreSQL to be ready
    echo "  Waiting for PostgreSQL..."
    oc wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n "$NAMESPACE" --timeout=300s
    
    # Get password
    DB_PASSWORD=$(oc get secret kubeatlas-db-secret -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d)
    
    # Run schema.sql
    echo "  Running schema.sql..."
    oc exec -it postgresql-0 -n "$NAMESPACE" -- psql -U kubeatlas -d kubeatlas -c "\i /dev/stdin" < database/schema.sql 2>/dev/null || \
    cat database/schema.sql | oc exec -i postgresql-0 -n "$NAMESPACE" -- psql -U kubeatlas -d kubeatlas
    
    # Run seed.sql
    echo "  Running seed.sql..."
    cat database/seed.sql | oc exec -i postgresql-0 -n "$NAMESPACE" -- psql -U kubeatlas -d kubeatlas 2>/dev/null || true
    
    echo -e "${GREEN}✓ Database initialized${NC}"
}

# Deploy KubeAtlas
deploy_kubeatlas() {
    echo -e "\n${YELLOW}[6/8] Deploying KubeAtlas...${NC}"
    
    # Create values file
    cat > /tmp/kubeatlas-values.yaml << EOF
global:
  domain: "${DOMAIN}"
  storageClass: "${STORAGE_CLASS}"
  openshift:
    enabled: true

api:
  replicaCount: 2
  env:
    DATABASE_HOST: "postgresql.${NAMESPACE}.svc.cluster.local"
    DATABASE_PORT: "5432"
    DATABASE_NAME: "kubeatlas"
    DATABASE_USER: "kubeatlas"
    DATABASE_SSL_MODE: "disable"
    LOG_LEVEL: "info"
    GIN_MODE: "release"
    CORS_ORIGINS: "https://kubeatlas.${DOMAIN}"
  envFrom:
    - secretRef:
        name: kubeatlas-db-secret
    - secretRef:
        name: kubeatlas-app-secret

ui:
  replicaCount: 2
  env:
    VITE_API_URL: "/api/v1"

postgresql:
  enabled: false  # Using external PostgreSQL

storage:
  type: pvc
  pvc:
    size: 50Gi
    storageClass: "${STORAGE_CLASS_RWX}"
    accessMode: ReadWriteMany

route:
  enabled: true
  host: "kubeatlas.${DOMAIN}"
  tls:
    enabled: true
    termination: edge

ingress:
  enabled: false
EOF
    
    # Deploy with Helm
    if helm status "$RELEASE_NAME" -n "$NAMESPACE" &> /dev/null; then
        echo "  KubeAtlas already installed, upgrading..."
        helm upgrade "$RELEASE_NAME" ./helm/kubeatlas \
            --namespace "$NAMESPACE" \
            -f /tmp/kubeatlas-values.yaml \
            --wait --timeout 5m
    else
        helm install "$RELEASE_NAME" ./helm/kubeatlas \
            --namespace "$NAMESPACE" \
            -f /tmp/kubeatlas-values.yaml \
            --wait --timeout 5m
    fi
    
    echo -e "${GREEN}✓ KubeAtlas deployed${NC}"
}

# Create OpenShift Route
create_route() {
    echo -e "\n${YELLOW}[7/8] Creating OpenShift Route...${NC}"
    
    # Check if route already exists
    if oc get route kubeatlas -n "$NAMESPACE" &> /dev/null; then
        echo "  Route already exists"
    else
        cat << EOF | oc apply -f -
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: kubeatlas
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: kubeatlas
spec:
  host: kubeatlas.${DOMAIN}
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
EOF
        echo -e "${GREEN}✓ Route created${NC}"
    fi
}

# Print summary
print_summary() {
    echo -e "\n${YELLOW}[8/8] Installation Summary${NC}"
    echo -e "${GREEN}=============================================="
    echo "KubeAtlas Installation Complete!"
    echo -e "==============================================${NC}"
    
    ROUTE_URL=$(oc get route kubeatlas -n "$NAMESPACE" -o jsonpath='{.spec.host}' 2>/dev/null || echo "kubeatlas.${DOMAIN}")
    
    echo -e "\n${BLUE}Access URL:${NC} https://${ROUTE_URL}"
    echo -e "\n${BLUE}Default Login:${NC}"
    echo "  Email: admin@kubeatlas.local"
    echo "  Password: admin123"
    echo -e "\n${RED}⚠ IMPORTANT: Change the admin password after first login!${NC}"
    
    echo -e "\n${BLUE}Credentials:${NC}"
    echo "  Saved to: kubeatlas-credentials.txt"
    
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "  1. Login to KubeAtlas"
    echo "  2. Change admin password"
    echo "  3. Add your clusters (see: docs/ADDING_CLUSTERS.md)"
    
    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo "  # Check pods"
    echo "  oc get pods -n $NAMESPACE"
    echo ""
    echo "  # View logs"
    echo "  oc logs -f deployment/kubeatlas-api -n $NAMESPACE"
    echo ""
    echo "  # Get route URL"
    echo "  oc get route kubeatlas -n $NAMESPACE"
}

# Main
main() {
    check_prerequisites
    create_namespace
    create_secrets
    deploy_postgresql
    init_database
    deploy_kubeatlas
    create_route
    print_summary
}

# Run
main "$@"
