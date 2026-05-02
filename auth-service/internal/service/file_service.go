package service

import (
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
)

type FileService struct {
	repo *repository.FileRepository
}

func NewFileService(repo *repository.FileRepository) *FileService {
	return &FileService{repo: repo}
}

func (s *FileService) GetByDossierID(dossierID uint) ([]domain.DossierFile, error) {
	return s.repo.GetByDossierID(dossierID)
}

func (s *FileService) GetByID(id uint) (*domain.DossierFile, error) {
	return s.repo.GetByID(id)
}

func (s *FileService) Create(f *domain.DossierFile) error {
	return s.repo.Create(f)
}

func (s *FileService) BulkDelete(ids []uint, dossierID uint) error {
	return s.repo.BulkDelete(ids, dossierID)
}