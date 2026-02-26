package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/api/middleware"
	"github.com/kubeatlas/kubeatlas/internal/services"
)

// ============================================
// Internal Dependency Handlers
// ============================================

// ListInternalDependencies returns all internal dependencies
func ListInternalDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		result, err := svc.Dependency.ListInternal(c.Request.Context(), orgID, page, pageSize)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list internal dependencies")
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
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID := middleware.GetOrganizationID(c)
		actx := middleware.GetAuditContext(c)

		dep, err := svc.Dependency.CreateInternal(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to create internal dependency")
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
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := middleware.GetAuditContext(c)

		dep, err := svc.Dependency.UpdateInternal(c.Request.Context(), id, req, actx)
		if err != nil {
			if err == services.ErrDependencyNotFound {
				respondError(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to update internal dependency")
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

		actx := middleware.GetAuditContext(c)

		if err := svc.Dependency.DeleteInternal(c.Request.Context(), id, actx); err != nil {
			if err == services.ErrDependencyNotFound {
				respondError(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to delete internal dependency")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// ============================================
// External Dependency Handlers
// ============================================

// ListExternalDependencies returns all external dependencies for a namespace
func ListExternalDependencies(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		namespaceID := c.Query("namespace_id")
		if namespaceID == "" {
			respondError(c, http.StatusBadRequest, "namespace_id is required")
			return
		}

		id, err := uuid.Parse(namespaceID)
		if err != nil {
			respondError(c, http.StatusBadRequest, "Invalid namespace_id")
			return
		}

		deps, err := svc.Dependency.ListExternalByNamespace(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list external dependencies")
			return
		}

		respondSuccess(c, deps)
	}
}

// CreateExternalDependency creates a new external dependency
func CreateExternalDependency(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.CreateExternalDependencyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		orgID := middleware.GetOrganizationID(c)
		actx := middleware.GetAuditContext(c)

		dep, err := svc.Dependency.CreateExternal(c.Request.Context(), orgID, req, actx)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to create external dependency")
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
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := middleware.GetAuditContext(c)

		dep, err := svc.Dependency.UpdateExternal(c.Request.Context(), id, req, actx)
		if err != nil {
			if err == services.ErrDependencyNotFound {
				respondError(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to update external dependency")
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

		actx := middleware.GetAuditContext(c)

		if err := svc.Dependency.DeleteExternal(c.Request.Context(), id, actx); err != nil {
			if err == services.ErrDependencyNotFound {
				respondError(c, http.StatusNotFound, "Dependency not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to delete external dependency")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// GetDependencyGraph returns the dependency graph for a namespace
func GetDependencyGraph(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "namespaceId")
		if !ok {
			return
		}

		graph, err := svc.Dependency.GetDependencyGraph(c.Request.Context(), id)
		if err != nil {
			if err == services.ErrNamespaceNotFound {
				respondError(c, http.StatusNotFound, "Namespace not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to get dependency graph")
			return
		}

		respondSuccess(c, graph)
	}
}

// ============================================
// Document Handlers
// ============================================

// ListDocuments returns all documents
func ListDocuments(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

		docs, err := svc.Document.GetRecent(c.Request.Context(), orgID, limit)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list documents")
			return
		}

		respondSuccess(c, docs)
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
			if err == services.ErrDocumentNotFound {
				respondError(c, http.StatusNotFound, "Document not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to get document")
			return
		}

		respondSuccess(c, doc)
	}
}

// UploadDocument uploads a new document
func UploadDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			respondError(c, http.StatusBadRequest, "File is required")
			return
		}

		var req services.UploadDocumentRequest
		
		if namespaceID := c.PostForm("namespace_id"); namespaceID != "" {
			if id, err := uuid.Parse(namespaceID); err == nil {
				req.NamespaceID = &id
			}
		}
		if clusterID := c.PostForm("cluster_id"); clusterID != "" {
			if id, err := uuid.Parse(clusterID); err == nil {
				req.ClusterID = &id
			}
		}
		if categoryID := c.PostForm("category_id"); categoryID != "" {
			if id, err := uuid.Parse(categoryID); err == nil {
				req.CategoryID = &id
			}
		}
		
		req.Name = c.PostForm("name")
		req.Description = c.PostForm("description")

		orgID := middleware.GetOrganizationID(c)
		userID := middleware.GetUserID(c)
		actx := middleware.GetAuditContext(c)

		doc, err := svc.Document.Upload(c.Request.Context(), orgID, userID, file, req, actx)
		if err != nil {
			switch err {
			case services.ErrFileTooLarge:
				respondError(c, http.StatusRequestEntityTooLarge, "File too large (max 50MB)")
			case services.ErrInvalidFileType:
				respondError(c, http.StatusBadRequest, "Invalid file type")
			default:
				respondError(c, http.StatusInternalServerError, "Failed to upload document")
			}
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
			respondError(c, http.StatusBadRequest, "Invalid request body")
			return
		}

		actx := middleware.GetAuditContext(c)

		doc, err := svc.Document.Update(c.Request.Context(), id, req, actx)
		if err != nil {
			if err == services.ErrDocumentNotFound {
				respondError(c, http.StatusNotFound, "Document not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to update document")
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

		actx := middleware.GetAuditContext(c)

		if err := svc.Document.Delete(c.Request.Context(), id, actx); err != nil {
			if err == services.ErrDocumentNotFound {
				respondError(c, http.StatusNotFound, "Document not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to delete document")
			return
		}

		c.JSON(http.StatusNoContent, nil)
	}
}

// DownloadDocument downloads a document
func DownloadDocument(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		filePath, fileName, err := svc.Document.GetFilePath(c.Request.Context(), id)
		if err != nil {
			if err == services.ErrDocumentNotFound {
				respondError(c, http.StatusNotFound, "Document not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "Failed to get document")
			return
		}

		c.Header("Content-Disposition", "attachment; filename=\""+fileName+"\"")
		c.File(filePath)
	}
}

// ListDocumentCategories returns all document categories
func ListDocumentCategories(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)

		categories, err := svc.Document.GetCategories(c.Request.Context(), &orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list categories")
			return
		}

		respondSuccess(c, categories)
	}
}

// ============================================
// Business Unit Handlers
// ============================================

// ListBusinessUnits returns all business units
func ListBusinessUnits(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)

		units, err := svc.BusinessUnits.List(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list business units")
			return
		}

		respondSuccess(c, units)
	}
}

// GetBusinessUnit returns a single business unit
func GetBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parseUUID(c, "id")
		if !ok {
			return
		}

		unit, err := svc.BusinessUnits.GetByID(c.Request.Context(), id)
		if err != nil {
			respondError(c, http.StatusNotFound, "Business unit not found")
			return
		}

		respondSuccess(c, unit)
	}
}

// CreateBusinessUnit creates a new business unit
func CreateBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Implementation similar to teams
		respondError(c, http.StatusNotImplemented, "Not implemented")
	}
}

// UpdateBusinessUnit updates a business unit
func UpdateBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		respondError(c, http.StatusNotImplemented, "Not implemented")
	}
}

// DeleteBusinessUnit deletes a business unit
func DeleteBusinessUnit(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		respondError(c, http.StatusNotImplemented, "Not implemented")
	}
}

// ============================================
// Report Handlers
// ============================================

// OwnershipCoverageReport generates ownership coverage report
func OwnershipCoverageReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)

		stats, err := svc.Namespace.GetStats(c.Request.Context(), orgID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to generate report")
			return
		}

		respondSuccess(c, stats)
	}
}

// OrphanedResourcesReport generates orphaned resources report
func OrphanedResourcesReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

		namespaces, err := svc.Namespace.GetOrphaned(c.Request.Context(), orgID, limit)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to generate report")
			return
		}

		respondSuccess(c, namespaces)
	}
}

// DependencyMatrixReport generates dependency matrix report
func DependencyMatrixReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		respondError(c, http.StatusNotImplemented, "Not implemented")
	}
}

// ExportReport exports data in various formats
func ExportReport(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		respondError(c, http.StatusNotImplemented, "Not implemented")
	}
}

// ============================================
// Audit Handlers
// ============================================

// ListAuditLogs returns audit logs
func ListAuditLogs(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := middleware.GetOrganizationID(c)
		page, pageSize := getPageParams(c)

		filters := make(map[string]interface{})
		if action := c.Query("action"); action != "" {
			filters["action"] = action
		}
		if resourceType := c.Query("resource_type"); resourceType != "" {
			filters["resource_type"] = resourceType
		}

		result, err := svc.Audit.List(c.Request.Context(), orgID, page, pageSize, filters)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to list audit logs")
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

		logs, err := svc.Audit.GetByResource(c.Request.Context(), resourceType, resourceID, limit)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "Failed to get audit logs")
			return
		}

		respondSuccess(c, logs)
	}
}

// ============================================
// Settings Handlers
// ============================================

// GetSettings returns organization settings
func GetSettings(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Return default settings for now
		respondSuccess(c, gin.H{
			"theme": "dark",
			"notifications": gin.H{
				"email":   true,
				"slack":   false,
				"webhook": false,
			},
		})
	}
}

// UpdateSettings updates organization settings
func UpdateSettings(svc *services.Services) gin.HandlerFunc {
	return func(c *gin.Context) {
		respondError(c, http.StatusNotImplemented, "Not implemented")
	}
}
