package service

import (
	"github.com/google/uuid"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
)

type NotebookService struct {
	repo *repository.NotebookRepository
}

func NewNotebookService(repo *repository.NotebookRepository) *NotebookService {
	return &NotebookService{repo: repo}
}

func (s *NotebookService) GetAll() ([]domain.Notebook, error) {
	return s.repo.GetAll()
}

func (s *NotebookService) GetByID(id string) (*domain.Notebook, error) {
	return s.repo.GetByID(id)
}

func (s *NotebookService) Create(req domain.NotebookRequest) (*domain.Notebook, error) {
	notebook := &domain.Notebook{
		ID:          uuid.New().String(),   // ← التصليح هنا
		Name:        req.Name,
		Description: req.Description,
		Icon:        req.Icon,
		Color:       req.Color,
		Fields:      req.Fields,
	}

	err := s.repo.Create(notebook)
	return notebook, err
}

func (s *NotebookService) Update(id string, req domain.NotebookRequest) (*domain.Notebook, error) {
	notebook, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	notebook.Name = req.Name
	notebook.Description = req.Description
	notebook.Icon = req.Icon
	notebook.Color = req.Color
	notebook.Fields = req.Fields

	err = s.repo.Update(notebook)
	return notebook, err
}

func (s *NotebookService) Delete(id string) error {
	return s.repo.Delete(id)
}