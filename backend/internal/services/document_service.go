package services

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/kubeatlas/kubeatlas/internal/database/repositories"
	"github.com/kubeatlas/kubeatlas/internal/models"
	"go.uber.org/zap"
)

var ErrDocumentNotFound = errors.New("document not found")

type DocumentService struct {
	repo       *repositories.DocumentRepository
	auditSvc   *AuditService
	logger     *zap.SugaredLogger
	uploadPath string
}

func NewDocumentService(repo *repositories.DocumentRepository, auditSvc *AuditService, logger *zap.SugaredLogger) *DocumentService {
	uploadPath := os.Getenv("STORAGE_LOCAL_PATH")
	if uploadPath == "" {
		uploadPath = "./data/uploads"
	}
	os.MkdirAll(uploadPath, 0755)
	
	return &DocumentService{repo: repo, auditSvc: auditSvc, logger: logger, uploadPath: uploadPath}
}

type UploadDocumentRequest struct {
	NamespaceID *uuid.UUID `form:"namespace_id"`
	ClusterID   *uuid.UUID `form:"cluster_id"`
	Name        string     `form:"name" binding:"required"`
	Description string     `form:"description"`
	CategoryID  *uuid.UUID `form:"category_id"`
	Tags        []string   `form:"tags"`
}

func (s *DocumentService) Upload(ctx context.Context, ac AuditContext, req UploadDocumentRequest, file *multipart.FileHeader) (*models.Document, error) {
	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	uniqueName := uuid.New().String() + ext
	filePath := filepath.Join(s.uploadPath, uniqueName)

	// Save file
	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(filePath)
		return nil, err
	}

	// Detect MIME type
	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	// Create document record
	doc := &models.Document{
		OrganizationID: ac.OrgID,
		NamespaceID:    req.NamespaceID,
		ClusterID:      req.ClusterID,
		Name:           req.Name,
		FileName:       file.Filename,
		FilePath:       filePath,
		FileSize:       file.Size,
		MimeType:       mimeType,
		CategoryID:     req.CategoryID,
		Tags:           req.Tags,
		Version:        1,
		UploadedBy:     *ac.UserID,
		Status:         "active",
		Metadata:       make(models.JSONMap),
	}

	if req.Description != "" {
		doc.Description = sql.NullString{String: req.Description, Valid: true}
	}

	if err := s.repo.Create(ctx, doc); err != nil {
		os.Remove(filePath)
		return nil, err
	}

	s.auditSvc.LogCreate(ctx, ac, "document", doc.ID, doc.Name, nil)
	s.logger.Infow("Document uploaded", "id", doc.ID, "name", doc.Name, "size", doc.FileSize)

	return doc, nil
}

func (s *DocumentService) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if doc == nil {
		return nil, ErrDocumentNotFound
	}
	return doc, nil
}

func (s *DocumentService) ListByNamespace(ctx context.Context, namespaceID uuid.UUID) ([]models.Document, error) {
	return s.repo.ListByNamespace(ctx, namespaceID)
}

func (s *DocumentService) GetRecent(ctx context.Context, orgID uuid.UUID, limit int) ([]models.Document, error) {
	return s.repo.GetRecent(ctx, orgID, limit)
}

func (s *DocumentService) GetCategories(ctx context.Context, orgID *uuid.UUID) ([]models.DocumentCategory, error) {
	return s.repo.GetCategories(ctx, orgID)
}

func (s *DocumentService) Delete(ctx context.Context, ac AuditContext, id uuid.UUID) error {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if doc == nil {
		return ErrDocumentNotFound
	}

	// Delete file
	if doc.FilePath != "" {
		os.Remove(doc.FilePath)
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	s.auditSvc.LogDelete(ctx, ac, "document", id, doc.Name)
	return nil
}

func (s *DocumentService) GetFilePath(ctx context.Context, id uuid.UUID) (string, string, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", "", err
	}
	if doc == nil {
		return "", "", ErrDocumentNotFound
	}
	return doc.FilePath, doc.FileName, nil
}
