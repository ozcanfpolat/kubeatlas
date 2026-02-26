package models

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestCluster_Validate(t *testing.T) {
	tests := []struct {
		name    string
		cluster Cluster
		wantErr bool
	}{
		{
			name: "valid cluster",
			cluster: Cluster{
				Name:         "test-cluster",
				APIServerURL: "https://api.cluster.local:6443",
				ClusterType:  "openshift",
				Environment:  "production",
			},
			wantErr: false,
		},
		{
			name: "missing name",
			cluster: Cluster{
				APIServerURL: "https://api.cluster.local:6443",
				ClusterType:  "openshift",
				Environment:  "production",
			},
			wantErr: true,
		},
		{
			name: "missing api server url",
			cluster: Cluster{
				Name:        "test-cluster",
				ClusterType: "openshift",
				Environment: "production",
			},
			wantErr: true,
		},
		{
			name: "invalid cluster type",
			cluster: Cluster{
				Name:         "test-cluster",
				APIServerURL: "https://api.cluster.local:6443",
				ClusterType:  "invalid",
				Environment:  "production",
			},
			wantErr: true,
		},
		{
			name: "invalid environment",
			cluster: Cluster{
				Name:         "test-cluster",
				APIServerURL: "https://api.cluster.local:6443",
				ClusterType:  "openshift",
				Environment:  "invalid",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cluster.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Cluster.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestNamespace_Validate(t *testing.T) {
	clusterID := uuid.New()

	tests := []struct {
		name      string
		namespace Namespace
		wantErr   bool
	}{
		{
			name: "valid namespace",
			namespace: Namespace{
				ClusterID:   clusterID,
				Name:        "test-namespace",
				Criticality: "tier-1",
			},
			wantErr: false,
		},
		{
			name: "missing cluster id",
			namespace: Namespace{
				Name:        "test-namespace",
				Criticality: "tier-1",
			},
			wantErr: true,
		},
		{
			name: "missing name",
			namespace: Namespace{
				ClusterID:   clusterID,
				Criticality: "tier-1",
			},
			wantErr: true,
		},
		{
			name: "invalid criticality",
			namespace: Namespace{
				ClusterID:   clusterID,
				Name:        "test-namespace",
				Criticality: "invalid",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.namespace.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Namespace.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestUser_Validate(t *testing.T) {
	orgID := uuid.New()

	tests := []struct {
		name    string
		user    User
		wantErr bool
	}{
		{
			name: "valid user",
			user: User{
				OrganizationID: orgID,
				Email:          "test@example.com",
				Role:           "admin",
			},
			wantErr: false,
		},
		{
			name: "invalid email",
			user: User{
				OrganizationID: orgID,
				Email:          "invalid-email",
				Role:           "admin",
			},
			wantErr: true,
		},
		{
			name: "invalid role",
			user: User{
				OrganizationID: orgID,
				Email:          "test@example.com",
				Role:           "superadmin",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.user.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("User.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestTeam_Validate(t *testing.T) {
	orgID := uuid.New()

	tests := []struct {
		name    string
		team    Team
		wantErr bool
	}{
		{
			name: "valid team",
			team: Team{
				OrganizationID: orgID,
				Name:           "Platform Team",
				Slug:           "platform-team",
				TeamType:       "team",
			},
			wantErr: false,
		},
		{
			name: "missing name",
			team: Team{
				OrganizationID: orgID,
				Slug:           "platform-team",
				TeamType:       "team",
			},
			wantErr: true,
		},
		{
			name: "missing slug",
			team: Team{
				OrganizationID: orgID,
				Name:           "Platform Team",
				TeamType:       "team",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.team.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Team.Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestBaseModel_Timestamps(t *testing.T) {
	now := time.Now()
	
	base := BaseModel{
		ID:        uuid.New(),
		CreatedAt: now,
		UpdatedAt: now,
	}

	if base.ID == uuid.Nil {
		t.Error("ID should not be nil")
	}

	if base.CreatedAt.IsZero() {
		t.Error("CreatedAt should not be zero")
	}

	if base.UpdatedAt.IsZero() {
		t.Error("UpdatedAt should not be zero")
	}
}

func TestClusterStatus_IsValid(t *testing.T) {
	validStatuses := []string{"active", "inactive", "error", "syncing", "pending"}
	
	for _, status := range validStatuses {
		c := Cluster{
			Name:         "test",
			APIServerURL: "https://test:6443",
			ClusterType:  "openshift",
			Environment:  "production",
			Status:       status,
		}
		if err := c.Validate(); err != nil {
			t.Errorf("Cluster with status %s should be valid", status)
		}
	}
}

func TestCriticality_IsValid(t *testing.T) {
	validCriticalities := []string{"tier-1", "tier-2", "tier-3"}
	clusterID := uuid.New()
	
	for _, crit := range validCriticalities {
		n := Namespace{
			ClusterID:   clusterID,
			Name:        "test",
			Criticality: crit,
		}
		if err := n.Validate(); err != nil {
			t.Errorf("Namespace with criticality %s should be valid", crit)
		}
	}

	// Test invalid criticality
	n := Namespace{
		ClusterID:   clusterID,
		Name:        "test",
		Criticality: "tier-4",
	}
	if err := n.Validate(); err == nil {
		t.Error("Namespace with criticality 'tier-4' should be invalid")
	}
}
