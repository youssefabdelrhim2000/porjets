package service

import (
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
)

type DossierService struct {
	repo *repository.DossierRepository
}

func NewDossierService(repo *repository.DossierRepository) *DossierService {
	return &DossierService{repo: repo}
}

func (s *DossierService) GetAll() ([]domain.Dossier, error) {
	return s.repo.GetAll()
}

func (s *DossierService) GetByID(id uint) (*domain.Dossier, error) {
	return s.repo.GetByID(id)
}

func (s *DossierService) Create(d *domain.Dossier) error {
	return s.repo.Create(d)
}

func (s *DossierService) Update(d *domain.Dossier) error {
	return s.repo.Update(d)
}

func (s *DossierService) Delete(id uint) error {
	return s.repo.Delete(id)
}