package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/services"
)

// ============================================
// Cluster Handlers
// ============================================

// ListClusters returns all clusters
func ListClusters(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		filters := make(map[string]interface{})
		if status := c.Query("status"); status != "" {
			filters["status"] = status
		}
		if environment := c.Query("environment"); environment != "" {
			filters["environment"] = environment
		}
		if clusterType := c.Query("type"); clusterType != "" {
			filters["cluster_type"] = clusterType
		}

		result, err := svc.Cluster.List(c.Request.Context(), orgID, page, pageSize, filters)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to list clusters")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// GetCluster returns a single cluster
func GetCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		cluster, err := svc.Cluster.GetByID(c.Request.Context(), id)
		if err != nil {
			if errors.Is(err, services.ErrClusterNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Cluster not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get cluster")
			return
		}

		respondSuccess(c, cluster)
	}
}

// CreateCluster creates a new cluster
func CreateCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateClusterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		cluster, err := svc.Cluster.Create(c.Request.Context(), actx, req)
		if err != nil {
			if errors.Is(err, services.ErrClusterNameExists) {
				respondErrorStr(c, http.StatusConflict, "Cluster with this name already exists")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to create cluster")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: cluster})
	}
}

// UpdateCluster updates a cluster
func UpdateCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateClusterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		cluster, err := svc.Cluster.Update(c.Request.Context(), actx, id, req)
		if err != nil {
			if errors.Is(err, services.ErrClusterNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Cluster not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to update cluster")
			return
		}

		respondSuccess(c, cluster)
	}
}

// DeleteCluster deletes a cluster
func DeleteCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := getAuditContext(c)

		if err := svc.Cluster.Delete(c.Request.Context(), id, actx); err != nil {
			if errors.Is(err, services.ErrClusterNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Cluster not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to delete cluster")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// SyncCluster triggers cluster sync
func SyncCluster(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := getAuditContext(c)

		if err := svc.Cluster.Sync(c.Request.Context(), id, actx); err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to sync cluster")
			return
		}

		respondSuccess(c, gin.H{"message": "Cluster sync initiated"})
	}
}

// GetClusterStats returns cluster statistics
func GetClusterStats(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)

		stats, err := svc.Cluster.GetStats(c.Request.Context(), orgID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get cluster stats")
			return
		}

		respondSuccess(c, stats)
	}
}

// ListClusterNamespaces returns namespaces for a cluster
func ListClusterNamespaces(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		page, pageSize := getPageParams(c)
		filters := map[string]interface{}{
			"cluster_id": id,
		}

		result, err := svc.Namespace.List(c.Request.Context(), uuid.Nil, page, pageSize, filters)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to list cluster namespaces")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// ============================================
// Business Unit Handlers
// ============================================

// ListBusinessUnits returns all business units
func ListBusinessUnits(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		result, err := svc.BusinessUnit.List(c.Request.Context(), orgID, page, pageSize)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to list business units")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// GetBusinessUnit returns a single business unit
func GetBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		bu, err := svc.BusinessUnit.GetByID(c.Request.Context(), id)
		if err != nil {
			if errors.Is(err, services.ErrBusinessUnitNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Business unit not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get business unit")
			return
		}

		respondSuccess(c, bu)
	}
}

// CreateBusinessUnit creates a new business unit
func CreateBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateBusinessUnitRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID, _ := middleware.GetOrganizationID(c)
		actx := getAuditContext(c)

		bu, err := svc.BusinessUnit.Create(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to create business unit")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: bu})
	}
}

// UpdateBusinessUnit updates a business unit
func UpdateBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateBusinessUnitRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		bu, err := svc.BusinessUnit.Update(c.Request.Context(), id, req, actx)
		if err != nil {
			if errors.Is(err, services.ErrBusinessUnitNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Business unit not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to update business unit")
			return
		}

		respondSuccess(c, bu)
	}
}

// DeleteBusinessUnit deletes a business unit
func DeleteBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := getAuditContext(c)

		if err := svc.BusinessUnit.Delete(c.Request.Context(), id, actx); err != nil {
			if errors.Is(err, services.ErrBusinessUnitNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Business unit not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to delete business unit")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// ============================================
// Dashboard Handlers
// ============================================

// GetDashboardStats returns dashboard statistics
func GetDashboardStats(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)

		stats, err := svc.Dashboard.GetStats(c.Request.Context(), orgID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get dashboard stats")
			return
		}

		respondSuccess(c, stats)
	}
}

// GetRecentActivities returns recent activities
func GetRecentActivities(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

		activities, err := svc.Dashboard.GetRecentActivities(c.Request.Context(), orgID, limit)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get recent activities")
			return
		}

		respondSuccess(c, activities)
	}
}

// GetMissingInfo returns resources with missing information
func GetMissingInfo(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)

		info, err := svc.Dashboard.GetMissingInfo(c.Request.Context(), orgID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get missing info")
			return
		}

		respondSuccess(c, info)
	}
}

// ============================================
// Internal Dependency Handlers
// ============================================

// ListInternalDependencies returns all internal dependencies
func ListInternalDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		result, err := svc.Dependency.ListInternal(c.Request.Context(), orgID, page, pageSize)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to list internal dependencies")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// CreateInternalDependency creates a new internal dependency
func CreateInternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateInternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID, _ := middleware.GetOrganizationID(c)
		actx := getAuditContext(c)

		dep, err := svc.Dependency.CreateInternal(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to create internal dependency")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: dep})
	}
}

// UpdateInternalDependency updates an internal dependency
func UpdateInternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateInternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		dep, err := svc.Dependency.UpdateInternal(c.Request.Context(), id, req, actx)
		if err != nil {
			if errors.Is(err, services.ErrDependencyNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to update internal dependency")
			return
		}

		respondSuccess(c, dep)
	}
}

// DeleteInternalDependency deletes an internal dependency
func DeleteInternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := getAuditContext(c)

		if err := svc.Dependency.DeleteInternal(c.Request.Context(), id, actx); err != nil {
			if errors.Is(err, services.ErrDependencyNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to delete internal dependency")
			return
		}

		respondSuccess(c, gin.H{"message": "Dependency deleted successfully"})
	}
}

// ============================================
// External Dependency Handlers
// ============================================

// ListExternalDependencies returns all external dependencies
func ListExternalDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		result, err := svc.Dependency.ListExternal(c.Request.Context(), orgID, page, pageSize)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to list external dependencies")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// CreateExternalDependency creates a new external dependency
func CreateExternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateExternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID, _ := middleware.GetOrganizationID(c)
		actx := getAuditContext(c)

		dep, err := svc.Dependency.CreateExternal(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to create external dependency")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: dep})
	}
}

// UpdateExternalDependency updates an external dependency
func UpdateExternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateExternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		dep, err := svc.Dependency.UpdateExternal(c.Request.Context(), id, req, actx)
		if err != nil {
			if errors.Is(err, services.ErrDependencyNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to update external dependency")
			return
		}

		respondSuccess(c, dep)
	}
}

// DeleteExternalDependency deletes an external dependency
func DeleteExternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := getAuditContext(c)

		if err := svc.Dependency.DeleteExternal(c.Request.Context(), id, actx); err != nil {
			if errors.Is(err, services.ErrDependencyNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to delete external dependency")
			return
		}

		respondSuccess(c, gin.H{"message": "Dependency deleted successfully"})
	}
}

// ============================================
// Document Handlers
// ============================================

// ListDocuments returns all documents
func ListDocuments(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		filters := make(map[string]interface{})
		if namespaceID := c.Query("namespace_id"); namespaceID != "" {
			if id, err := uuid.Parse(namespaceID); err == nil {
				filters["namespace_id"] = id
			}
		}
		if docType := c.Query("type"); docType != "" {
			filters["document_type"] = docType
		}

		result, err := svc.Document.List(c.Request.Context(), orgID, page, pageSize, filters)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to list documents")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// GetDocument returns a single document
func GetDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		doc, err := svc.Document.GetByID(c.Request.Context(), id)
		if err != nil {
			if errors.Is(err, services.ErrDocumentNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Document not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get document")
			return
		}

		respondSuccess(c, doc)
	}
}

// CreateDocument creates a new document
func CreateDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateDocumentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID, _ := middleware.GetOrganizationID(c)
		actx := getAuditContext(c)

		doc, err := svc.Document.Create(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to create document")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: doc})
	}
}

// UpdateDocument updates a document
func UpdateDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		var req services.UpdateDocumentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := getAuditContext(c)

		doc, err := svc.Document.Update(c.Request.Context(), id, req, actx)
		if err != nil {
			if errors.Is(err, services.ErrDocumentNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Document not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to update document")
			return
		}

		respondSuccess(c, doc)
	}
}

// DeleteDocument deletes a document
func DeleteDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		actx := getAuditContext(c)

		if err := svc.Document.Delete(c.Request.Context(), id, actx); err != nil {
			if errors.Is(err, services.ErrDocumentNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Document not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to delete document")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// ============================================
// Audit Log Handlers
// ============================================

// ListAuditLogs returns all audit logs
func ListAuditLogs(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		filters := make(map[string]interface{})
		if userID := c.Query("user_id"); userID != "" {
			if id, err := uuid.Parse(userID); err == nil {
				filters["user_id"] = id
			}
		}
		if action := c.Query("action"); action != "" {
			filters["action"] = action
		}
		if resourceType := c.Query("resource_type"); resourceType != "" {
			filters["resource_type"] = resourceType
		}

		result, err := svc.Audit.List(c.Request.Context(), orgID, page, pageSize, filters)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to list audit logs")
			return
		}

		respondPaginated(c, result.Items, result.Total, result.Page, result.PageSize, result.TotalPages)
	}
}

// GetResourceAuditLogs returns audit logs for a specific resource
func GetResourceAuditLogs(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		resourceType := c.Param("resourceType")
		resourceID, ok := parseUUID(c, "resourceId")
		if !ok {
			return
		}

		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

		history, err := svc.Audit.GetByResource(c.Request.Context(), resourceType, resourceID, limit)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get resource audit logs")
			return
		}

		respondSuccess(c, history)
	}
}

// ============================================
// Dependency Graph Handler
// ============================================

// GetDependencyGraph returns the dependency graph for a namespace
func GetDependencyGraph(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		namespaceID, ok := parseUUID(c, "namespaceId")
		if !ok {
			return
		}

		graph, err := svc.Dependency.GetGraph(c.Request.Context(), namespaceID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get dependency graph")
			return
		}

		respondSuccess(c, graph)
	}
}

// ============================================
// Document Category Handler
// ============================================

// ListDocumentCategories returns all document categories
func ListDocumentCategories(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		categories := []map[string]string{
			{"id": "architecture", "name": "Architecture", "description": "Architecture diagrams and documentation"},
			{"id": "runbook", "name": "Runbook", "description": "Operational runbooks and procedures"},
			{"id": "sla", "name": "SLA", "description": "Service Level Agreements"},
			{"id": "security", "name": "Security", "description": "Security documentation and policies"},
			{"id": "compliance", "name": "Compliance", "description": "Compliance and audit documentation"},
			{"id": "other", "name": "Other", "description": "Other documentation"},
		}
		respondSuccess(c, categories)
	}
}

// DownloadDocument handles document download
func DownloadDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		doc, content, err := svc.Document.Download(c.Request.Context(), id)
		if err != nil {
			if errors.Is(err, services.ErrDocumentNotFound) {
				respondErrorStr(c, http.StatusNotFound, "Document not found")
				return
			}
			respondErrorStr(c, http.StatusInternalServerError, "Failed to download document")
			return
		}

		c.Header("Content-Disposition", "attachment; filename=\""+doc.Filename+"\"")
		c.Data(http.StatusOK, doc.ContentType, content)
	}
}

// UploadDocument handles document upload
func UploadDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Parse multipart form
		if err := c.Request.ParseMultipartForm(32 << 20); err != nil { // 32 MB max
			respondErrorStr(c, http.StatusBadRequest, "Failed to parse form")
			return
		}

		file, header, err := c.Request.FormFile("file")
		if err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Failed to get file")
			return
		}
		defer file.Close()

		namespaceID, _ := uuid.Parse(c.PostForm("namespace_id"))
		documentType := c.PostForm("document_type")
		description := c.PostForm("description")

		req := services.UploadDocumentRequest{
			Filename:     header.Filename,
			Content:      file,
			Size:         header.Size,
			ContentType:  header.Header.Get("Content-Type"),
			NamespaceID:  namespaceID,
			DocumentType: documentType,
			Description:  description,
		}

		orgID, _ := middleware.GetOrganizationID(c)
		actx := getAuditContext(c)

		doc, err := svc.Document.Upload(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to upload document")
			return
		}

		c.JSON(http.StatusCreated, SuccessResponse{Data: doc})
	}
}

// ============================================
// Report Handlers
// ============================================

// OwnershipCoverageReport returns ownership coverage report
func OwnershipCoverageReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)

		report, err := svc.Dashboard.GetOwnershipCoverage(c.Request.Context(), orgID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to generate ownership coverage report")
			return
		}

		respondSuccess(c, report)
	}
}

// OrphanedResourcesReport returns orphaned resources report
func OrphanedResourcesReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)

		report, err := svc.Dashboard.GetOrphanedResources(c.Request.Context(), orgID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to generate orphaned resources report")
			return
		}

		respondSuccess(c, report)
	}
}

// DependencyMatrixReport returns dependency matrix report
func DependencyMatrixReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)

		report, err := svc.Dependency.GetDependencyMatrix(c.Request.Context(), orgID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to generate dependency matrix report")
			return
		}

		respondSuccess(c, report)
	}
}

// ExportReport handles report export
func ExportReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)
		reportType := c.Query("type")
		format := c.DefaultQuery("format", "csv")

		data, contentType, filename, err := svc.Dashboard.ExportReport(c.Request.Context(), orgID, reportType, format)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to export report")
			return
		}

		c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
		c.Data(http.StatusOK, contentType, data)
	}
}

// ============================================
// Settings Handlers
// ============================================

// GetSettings returns organization settings
func GetSettings(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, _ := middleware.GetOrganizationID(c)

		settings, err := svc.User.GetOrganizationSettings(c.Request.Context(), orgID)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to get settings")
			return
		}

		respondSuccess(c, settings)
	}
}

// UpdateSettings updates organization settings
func UpdateSettings(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.UpdateSettingsRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondErrorStr(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID, _ := middleware.GetOrganizationID(c)
		actx := getAuditContext(c)

		settings, err := svc.User.UpdateOrganizationSettings(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondErrorStr(c, http.StatusInternalServerError, "Failed to update settings")
			return
		}

		respondSuccess(c, settings)
	}
}
