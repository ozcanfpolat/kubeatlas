package k8s

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/kubeatlas/kubeatlas/internal/crypto"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// Manager manages Kubernetes client connections
type Manager struct {
	clients   map[string]*Client
	mu        sync.RWMutex
	logger    *zap.SugaredLogger
	encryptor *crypto.Encryptor
}

// ManagerOption is a functional option for Manager
type ManagerOption func(*Manager)

// WithEncryptor sets the encryptor for the manager
func WithEncryptor(encryptor *crypto.Encryptor) ManagerOption {
	return func(m *Manager) {
		m.encryptor = encryptor
	}
}

// Client wraps kubernetes clientset with additional functionality
type Client struct {
	clientset *kubernetes.Clientset
	config    *rest.Config
	cluster   *models.Cluster
	logger    *zap.SugaredLogger
}

// DiscoveredNamespace represents a namespace discovered from Kubernetes
type DiscoveredNamespace struct {
	Name        string
	UID         string
	Labels      map[string]interface{}
	Annotations map[string]interface{}
	CreatedAt   time.Time
	Status      string
}

// DiscoveredNode represents a node discovered from Kubernetes
type DiscoveredNode struct {
	Name           string
	UID            string
	Labels         map[string]interface{}
	Annotations    map[string]interface{}
	CreatedAt      time.Time
	Status         string
	Roles          []string
	KubeletVersion string
	OSImage        string
	Architecture   string
	Capacity       map[string]string
	Allocatable    map[string]string
}

// NewManager creates a new Kubernetes client manager
func NewManager(logger *zap.SugaredLogger, opts ...ManagerOption) *Manager {
	m := &Manager{
		clients: make(map[string]*Client),
		logger:  logger,
	}

	for _, opt := range opts {
		opt(m)
	}

	return m
}

// GetClient returns a Kubernetes client for the given cluster
func (m *Manager) GetClient(cluster *models.Cluster) (*Client, error) {
	m.mu.RLock()
	if client, exists := m.clients[cluster.ID.String()]; exists {
		m.mu.RUnlock()
		return client, nil
	}
	m.mu.RUnlock()

	// Create new client
	client, err := m.createClient(cluster)
	if err != nil {
		return nil, err
	}

	// Cache client
	m.mu.Lock()
	m.clients[cluster.ID.String()] = client
	m.mu.Unlock()

	return client, nil
}

// RemoveClient removes a cached client
func (m *Manager) RemoveClient(clusterID string) {
	m.mu.Lock()
	delete(m.clients, clusterID)
	m.mu.Unlock()
}

// createClient creates a new Kubernetes client for the cluster
func (m *Manager) createClient(cluster *models.Cluster) (*Client, error) {
	var config *rest.Config
	var err error

	switch cluster.AuthMethod {
	case "kubeconfig":
		if len(cluster.KubeconfigEncrypted) > 0 {
			// Decrypt kubeconfig if encryptor is available
			kubeconfig := cluster.KubeconfigEncrypted
			if m.encryptor != nil {
				decrypted, err := m.encryptor.Decrypt(kubeconfig)
				if err != nil {
					return nil, fmt.Errorf("failed to decrypt kubeconfig: %w", err)
				}
				kubeconfig = decrypted
			}
			config, err = clientcmd.RESTConfigFromKubeConfig(kubeconfig)
			if err != nil {
				return nil, fmt.Errorf("failed to parse kubeconfig: %w", err)
			}
		} else {
			return nil, fmt.Errorf("kubeconfig not provided")
		}

	case "serviceaccount", "token":
		if len(cluster.ServiceAccountTokenEncrypted) > 0 {
			// Decrypt token if encryptor is available
			token := string(cluster.ServiceAccountTokenEncrypted)
			if m.encryptor != nil {
				decrypted, err := m.encryptor.DecryptToken(cluster.ServiceAccountTokenEncrypted)
				if err != nil {
					return nil, fmt.Errorf("failed to decrypt service account token: %w", err)
				}
				token = decrypted
			}
			config = &rest.Config{
				Host:        cluster.APIServerURL,
				BearerToken: token,
			}
		} else {
			return nil, fmt.Errorf("service account token not provided")
		}

	default:
		// Try in-cluster config first
		config, err = rest.InClusterConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to create in-cluster config: %w", err)
		}
		config.Host = cluster.APIServerURL
	}

	// Configure TLS
	if cluster.SkipTLSVerify {
		// SECURITY WARNING: Only use in development environments
		m.logger.Warnw("TLS verification disabled for cluster - this is insecure", "cluster_id", cluster.ID, "cluster_name", cluster.Name)
		config.TLSClientConfig = rest.TLSClientConfig{
			Insecure: true,
		}
	} else {
		// Use CA certificate if provided (for self-signed clusters)
		if len(cluster.CACertificateEncrypted) > 0 && m.encryptor != nil {
			caCert, err := m.encryptor.Decrypt(cluster.CACertificateEncrypted)
			if err != nil {
				return nil, fmt.Errorf("failed to decrypt CA certificate: %w", err)
			}
			config.TLSClientConfig = rest.TLSClientConfig{
				Insecure: false,
				CAData:   caCert,
			}
			m.logger.Infow("Using custom CA certificate for cluster", "cluster_id", cluster.ID, "cluster_name", cluster.Name)
		} else {
			// Use system CA pool
			config.TLSClientConfig = rest.TLSClientConfig{
				Insecure: false,
			}
		}
	}

	// Set timeouts
	config.Timeout = 30 * time.Second

	// Create clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes clientset: %w", err)
	}

	return &Client{
		clientset: clientset,
		config:    config,
		cluster:   cluster,
		logger:    m.logger,
	}, nil
}

// TestConnection tests the connection to the Kubernetes cluster
func (c *Client) TestConnection(ctx context.Context) error {
	_, err := c.clientset.Discovery().ServerVersion()
	if err != nil {
		return fmt.Errorf("failed to connect to cluster: %w", err)
	}
	return nil
}

// GetServerVersion returns the Kubernetes server version
func (c *Client) GetServerVersion(ctx context.Context) (string, error) {
	version, err := c.clientset.Discovery().ServerVersion()
	if err != nil {
		return "", err
	}
	return version.GitVersion, nil
}

// DiscoverNamespaces discovers all namespaces in the cluster
func (c *Client) DiscoverNamespaces(ctx context.Context) ([]DiscoveredNamespace, error) {
	namespaces, err := c.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	result := make([]DiscoveredNamespace, 0, len(namespaces.Items))
	for _, ns := range namespaces.Items {
		// Convert labels and annotations to map[string]interface{}
		labels := make(map[string]interface{})
		for k, v := range ns.Labels {
			labels[k] = v
		}
		annotations := make(map[string]interface{})
		for k, v := range ns.Annotations {
			annotations[k] = v
		}

		result = append(result, DiscoveredNamespace{
			Name:        ns.Name,
			UID:         string(ns.UID),
			Labels:      labels,
			Annotations: annotations,
			CreatedAt:   ns.CreationTimestamp.Time,
			Status:      string(ns.Status.Phase),
		})
	}

	return result, nil
}

// GetNodeCount returns the number of nodes in the cluster
func (c *Client) GetNodeCount(ctx context.Context) (int, error) {
	nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return 0, fmt.Errorf("failed to list nodes: %w", err)
	}
	return len(nodes.Items), nil
}

// DiscoverNodes discovers all nodes in the cluster
func (c *Client) DiscoverNodes(ctx context.Context) ([]DiscoveredNode, error) {
	nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	result := make([]DiscoveredNode, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		// Convert labels and annotations
		labels := make(map[string]interface{})
		for k, v := range node.Labels {
			labels[k] = v
		}
		annotations := make(map[string]interface{})
		for k, v := range node.Annotations {
			annotations[k] = v
		}

		// Get node roles
		roles := []string{}
		for k := range node.Labels {
			if k == "node-role.kubernetes.io/master" || k == "node-role.kubernetes.io/control-plane" {
				roles = append(roles, "master")
			}
			if k == "node-role.kubernetes.io/worker" {
				roles = append(roles, "worker")
			}
			if k == "node-role.kubernetes.io/infra" {
				roles = append(roles, "infra")
			}
		}
		if len(roles) == 0 {
			roles = append(roles, "worker")
		}

		// Get node status
		status := "Unknown"
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady {
				if condition.Status == corev1.ConditionTrue {
					status = "Ready"
				} else {
					status = "NotReady"
				}
				break
			}
		}

		// Get capacity
		capacity := make(map[string]string)
		for k, v := range node.Status.Capacity {
			capacity[string(k)] = v.String()
		}
		allocatable := make(map[string]string)
		for k, v := range node.Status.Allocatable {
			allocatable[string(k)] = v.String()
		}

		result = append(result, DiscoveredNode{
			Name:           node.Name,
			UID:            string(node.UID),
			Labels:         labels,
			Annotations:    annotations,
			CreatedAt:      node.CreationTimestamp.Time,
			Status:         status,
			Roles:          roles,
			KubeletVersion: node.Status.NodeInfo.KubeletVersion,
			OSImage:        node.Status.NodeInfo.OSImage,
			Architecture:   node.Status.NodeInfo.Architecture,
			Capacity:       capacity,
			Allocatable:    allocatable,
		})
	}

	return result, nil
}

// GetNamespaceResources returns resources in a namespace
func (c *Client) GetNamespaceResources(ctx context.Context, namespace string) (map[string]interface{}, error) {
	resources := make(map[string]interface{})

	// Get deployments
	deployments, err := c.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["deployments"] = len(deployments.Items)
	}

	// Get statefulsets
	statefulsets, err := c.clientset.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["statefulsets"] = len(statefulsets.Items)
	}

	// Get daemonsets
	daemonsets, err := c.clientset.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["daemonsets"] = len(daemonsets.Items)
	}

	// Get services
	services, err := c.clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["services"] = len(services.Items)
	}

	// Get pods
	pods, err := c.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["pods"] = len(pods.Items)
	}

	// Get configmaps
	configmaps, err := c.clientset.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["configmaps"] = len(configmaps.Items)
	}

	// Get secrets
	secrets, err := c.clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["secrets"] = len(secrets.Items)
	}

	// Get PVCs
	pvcs, err := c.clientset.CoreV1().PersistentVolumeClaims(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		resources["pvcs"] = len(pvcs.Items)
	}

	return resources, nil
}

// CreateHTTPClientWithTLS creates an HTTP client with proper TLS configuration
func CreateHTTPClientWithTLS(skipTLSVerify bool) *http.Client {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: skipTLSVerify,
		},
	}

	return &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
	}
}
