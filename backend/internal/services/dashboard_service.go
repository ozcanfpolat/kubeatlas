package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type DashboardService struct {
	repos  *Repositories
	logger *zap.SugaredLogger
}

func NewDashboardService(repos *Repositories, logger *zap.SugaredLogger) *DashboardService {
	return &DashboardService{repos: repos, logger: logger}
}

// DashboardData represents all dashboard data
type DashboardData struct {
	Stats                    map[string]interface{}   `json:"stats"`
	ClusterStats             map[string]interface{}   `json:"cluster_stats"`
	EnvironmentDistribution  []map[string]interface{} `json:"environment_distribution"`
	BusinessUnitDistribution []map[string]interface{} `json:"business_unit_distribution"`
	RecentNamespaces         []map[string]interface{} `json:"recent_namespaces"`
	RecentDocuments          []map[string]interface{} `json:"recent_documents"`
	RecentActivities         []map[string]interface{} `json:"recent_activities"`
	MissingInfo              map[string]interface{}   `json:"missing_info"`
}

// GetDashboardData returns all dashboard data
func (s *DashboardService) GetDashboardData(ctx context.Context, orgID uuid.UUID) (*DashboardData, error) {
	data := &DashboardData{}

	// Namespace stats
	nsStats, err := s.repos.Namespace.GetStats(ctx, orgID)
	if err == nil && nsStats != nil {
		data.Stats = map[string]interface{}{
			"total_namespaces":        nsStats.TotalNamespaces,
			"namespaces_with_owner":   nsStats.NamespacesWithOwner,
			"namespaces_documented":   nsStats.NamespacesDocumented,
			"namespaces_with_deps":    nsStats.NamespacesWithDeps,
			"orphaned_namespaces":     nsStats.OrphanedNamespaces,
			"undocumented_namespaces": nsStats.UndocumentedNamespaces,
			"no_deps_namespaces":      nsStats.NoDepsNamespaces,
			"no_business_unit":        nsStats.NoBusinessUnit,
		}

		data.MissingInfo = map[string]interface{}{
			"orphaned":     nsStats.OrphanedNamespaces,
			"undocumented": nsStats.UndocumentedNamespaces,
			"no_deps":      nsStats.NoDepsNamespaces,
			"no_bu":        nsStats.NoBusinessUnit,
		}
	}

	// Cluster stats
	clusterStats, err := s.repos.Cluster.GetStats(ctx, orgID)
	if err == nil {
		data.ClusterStats = clusterStats
	}

	// Environment distribution
	envDist, err := s.repos.Namespace.GetEnvironmentDistribution(ctx, orgID)
	if err == nil {
		data.EnvironmentDistribution = make([]map[string]interface{}, len(envDist))
		for i, d := range envDist {
			data.EnvironmentDistribution[i] = map[string]interface{}{
				"environment": d.Environment,
				"count":       d.Count,
			}
		}
	}

	// Business unit distribution
	buDist, err := s.repos.Namespace.GetBusinessUnitDistribution(ctx, orgID)
	if err == nil {
		data.BusinessUnitDistribution = make([]map[string]interface{}, len(buDist))
		for i, d := range buDist {
			data.BusinessUnitDistribution[i] = map[string]interface{}{
				"business_unit_id":   d.BusinessUnitID,
				"business_unit_name": d.BusinessUnitName,
				"count":              d.Count,
			}
		}
	}

	// Recent namespaces
	recentNs, err := s.repos.Namespace.GetRecentlyUpdated(ctx, orgID, 10)
	if err == nil {
		data.RecentNamespaces = make([]map[string]interface{}, len(recentNs))
		for i, ns := range recentNs {
			data.RecentNamespaces[i] = map[string]interface{}{
				"id":          ns.ID,
				"name":        ns.Name,
				"cluster_id":  ns.ClusterID,
				"environment": ns.Environment,
				"criticality": ns.Criticality,
				"updated_at":  ns.UpdatedAt,
			}
		}
	}

	// Recent documents
	recentDocs, err := s.repos.Document.GetRecent(ctx, orgID, 5)
	if err == nil {
		data.RecentDocuments = make([]map[string]interface{}, len(recentDocs))
		for i, doc := range recentDocs {
			data.RecentDocuments[i] = map[string]interface{}{
				"id":          doc.ID,
				"name":        doc.Name,
				"file_name":   doc.FileName,
				"file_size":   doc.FileSize,
				"uploaded_at": doc.UploadedAt,
			}
		}
	}

	// Recent activities
	activities, err := s.repos.Audit.GetRecentActivities(ctx, orgID, 10)
	if err == nil {
		data.RecentActivities = make([]map[string]interface{}, len(activities))
		for i, a := range activities {
			item := map[string]interface{}{
				"id":            a.ID,
				"action":        a.Action,
				"resource_type": a.ResourceType,
				"resource_id":   a.ResourceID,
				"created_at":    a.CreatedAt,
			}
			if a.ResourceName.Valid {
				item["resource_name"] = a.ResourceName.String
			}
			if a.User != nil && a.User.FullName.Valid {
				item["user_name"] = a.User.FullName.String
			}
			data.RecentActivities[i] = item
		}
	}

	return data, nil
}

// GetStats returns summary statistics in format expected by frontend
func (s *DashboardService) GetStats(ctx context.Context, orgID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Namespace stats
	nsStats, err := s.repos.Namespace.GetStats(ctx, orgID)
	if err == nil && nsStats != nil {
		stats["total_namespaces"] = nsStats.TotalNamespaces
		stats["namespaces_with_owner"] = nsStats.NamespacesWithOwner
		stats["namespaces_documented"] = nsStats.NamespacesDocumented
		stats["namespaces_with_dependencies"] = nsStats.NamespacesWithDeps
		stats["orphaned_namespaces"] = nsStats.TotalNamespaces - nsStats.NamespacesWithOwner
		stats["undocumented_namespaces"] = nsStats.TotalNamespaces - nsStats.NamespacesDocumented
		
		// Calculate percentages
		if nsStats.TotalNamespaces > 0 {
			stats["ownership_percentage"] = (nsStats.NamespacesWithOwner * 100) / nsStats.TotalNamespaces
			stats["documentation_percentage"] = (nsStats.NamespacesDocumented * 100) / nsStats.TotalNamespaces
		} else {
			stats["ownership_percentage"] = 0
			stats["documentation_percentage"] = 0
		}
	}

	// Cluster stats
	clusterStats, err := s.repos.Cluster.GetStats(ctx, orgID)
	if err == nil && clusterStats != nil {
		stats["total_clusters"] = clusterStats["total"]
		stats["active_clusters"] = clusterStats["active"]
		stats["total_nodes"] = clusterStats["total_nodes"]
	}

	// Environment distribution for chart
	envDist, err := s.repos.Namespace.GetEnvironmentDistribution(ctx, orgID)
	if err == nil {
		envData := make([]map[string]interface{}, len(envDist))
		for i, d := range envDist {
			envData[i] = map[string]interface{}{
				"name":  d.Environment,
				"count": d.Count,
			}
		}
		stats["environment_distribution"] = envData
	}

	return stats, nil
}

// GetMissingInfo returns counts of resources with missing information
func (s *DashboardService) GetMissingInfo(ctx context.Context, orgID uuid.UUID) (map[string]interface{}, error) {
	nsStats, err := s.repos.Namespace.GetStats(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"orphaned_namespaces":     nsStats.OrphanedNamespaces,
		"undocumented_namespaces": nsStats.UndocumentedNamespaces,
		"no_deps_namespaces":      nsStats.NoDepsNamespaces,
		"no_business_unit":        nsStats.NoBusinessUnit,
	}, nil
}

// GetRecentActivities returns recent audit activities
func (s *DashboardService) GetRecentActivities(ctx context.Context, orgID uuid.UUID, limit int) ([]map[string]interface{}, error) {
	activities, err := s.repos.Audit.GetRecentActivities(ctx, orgID, limit)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, len(activities))
	for i, a := range activities {
		item := map[string]interface{}{
			"id":            a.ID,
			"action":        a.Action,
			"resource_type": a.ResourceType,
			"resource_id":   a.ResourceID,
			"created_at":    a.CreatedAt,
		}
		if a.ResourceName.Valid {
			item["resource_name"] = a.ResourceName.String
		}
		if a.Description.Valid {
			item["description"] = a.Description.String
		}
		if a.User != nil && a.User.FullName.Valid {
			item["user_name"] = a.User.FullName.String
		}
		result[i] = item
	}

	return result, nil
}

// GetOwnershipCoverage returns ownership coverage report
func (s *DashboardService) GetOwnershipCoverage(ctx context.Context, orgID uuid.UUID) (map[string]interface{}, error) {
	nsStats, err := s.repos.Namespace.GetStats(ctx, orgID)
	if err != nil {
		return nil, err
	}

	total := nsStats.TotalNamespaces
	if total == 0 {
		total = 1 // avoid division by zero
	}

	return map[string]interface{}{
		"total_namespaces":      nsStats.TotalNamespaces,
		"namespaces_with_owner": nsStats.NamespacesWithOwner,
		"coverage_percentage":   float64(nsStats.NamespacesWithOwner) / float64(total) * 100,
		"orphaned_namespaces":   nsStats.OrphanedNamespaces,
	}, nil
}

// GetOrphanedResources returns orphaned resources report
func (s *DashboardService) GetOrphanedResources(ctx context.Context, orgID uuid.UUID) (map[string]interface{}, error) {
	nsStats, err := s.repos.Namespace.GetStats(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"orphaned_namespaces":     nsStats.OrphanedNamespaces,
		"undocumented_namespaces": nsStats.UndocumentedNamespaces,
		"no_deps_namespaces":      nsStats.NoDepsNamespaces,
		"no_business_unit":        nsStats.NoBusinessUnit,
	}, nil
}

// ExportReport exports report data
func (s *DashboardService) ExportReport(ctx context.Context, orgID uuid.UUID, reportType, format string) ([]byte, string, string, error) {
	// Simple CSV export implementation
	var filename string
	var contentType string

	switch format {
	case "csv":
		contentType = "text/csv"
		filename = reportType + "_report.csv"
	case "json":
		contentType = "application/json"
		filename = reportType + "_report.json"
	default:
		contentType = "text/csv"
		filename = reportType + "_report.csv"
	}

	// Get data based on report type
	var data []byte
	var err error

	switch reportType {
	case "ownership":
		report, err := s.GetOwnershipCoverage(ctx, orgID)
		if err != nil {
			return nil, "", "", err
		}
		if format == "json" {
			data = []byte(`{"report": "ownership", "data": ` + stringifyMap(report) + `}`)
		} else {
			data = []byte("ReportType,Total,WithOwner,Coverage\nownership," +
				stringify(report["total_namespaces"]) + "," +
				stringify(report["namespaces_with_owner"]) + "," +
				stringify(report["coverage_percentage"]) + "\n")
		}
	case "orphaned":
		report, err := s.GetOrphanedResources(ctx, orgID)
		if err != nil {
			return nil, "", "", err
		}
		if format == "json" {
			data = []byte(`{"report": "orphaned", "data": ` + stringifyMap(report) + `}`)
		} else {
			data = []byte("ReportType,Orphaned,Undocumented,NoDeps,NoBU\norphaned," +
				stringify(report["orphaned_namespaces"]) + "," +
				stringify(report["undocumented_namespaces"]) + "," +
				stringify(report["no_deps_namespaces"]) + "," +
				stringify(report["no_business_unit"]) + "\n")
		}
	default:
		data = []byte("Report not implemented")
	}

	return data, contentType, filename, err
}

// Helper functions
func stringify(v interface{}) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%v", v)
}

func stringifyMap(m map[string]interface{}) string {
	result := "{"
	first := true
	for k, v := range m {
		if !first {
			result += ","
		}
		result += `"` + k + `":` + stringify(v)
		first = false
	}
	result += "}"
	return result
}
