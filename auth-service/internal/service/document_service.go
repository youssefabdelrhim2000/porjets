package service

import (
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
)

type DocumentService struct {
	repo *repository.DocumentRepository
}

func NewDocumentService(repo *repository.DocumentRepository) *DocumentService {
	return &DocumentService{repo: repo}
}

func (s *DocumentService) GetAllYears() ([]domain.DocumentYear, error) {
	return s.repo.GetAllYears()
}

func (s *DocumentService) CreateYear(y *domain.DocumentYear) error {
	return s.repo.CreateYear(y)
}

func (s *DocumentService) UpdateYear(y *domain.DocumentYear) error {
	return s.repo.UpdateYear(y)
}

func (s *DocumentService) DeleteYear(id uint) error {
	return s.repo.DeleteYear(id)
}

func (s *DocumentService) GetBatchesByYear(yearID uint) ([]domain.DocumentBatch, error) {
	return s.repo.GetBatchesByYear(yearID)
}

func (s *DocumentService) CreateBatch(b *domain.DocumentBatch) error {
	return s.repo.CreateBatch(b)
}

func (s *DocumentService) UpdateBatch(b *domain.DocumentBatch) error {
	return s.repo.UpdateBatch(b)
}

func (s *DocumentService) DeleteBatch(id uint) error {
	return s.repo.DeleteBatch(id)
}

func (s *DocumentService) GetDocuments(category string, batchID, yearID *uint, search string) ([]domain.Document, error) {
	return s.repo.GetDocuments(category, batchID, yearID, search)
}

func (s *DocumentService) SearchAll(search string) ([]domain.Document, error) {
	return s.repo.SearchAll(search)
}

func (s *DocumentService) GetByID(id uint) (*domain.Document, error) {
	return s.repo.GetByID(id)
}

func (s *DocumentService) Create(doc *domain.Document) error {
	return s.repo.Create(doc)
}

func (s *DocumentService) Update(doc *domain.Document) error {
	return s.repo.Update(doc)
}

func (s *DocumentService) Delete(id uint) error {
	return s.repo.Delete(id)
}