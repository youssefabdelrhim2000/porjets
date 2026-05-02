package service

import (
	"github.com/google/uuid"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
)

type EntryService struct {
	repo *repository.EntryRepository
}

func NewEntryService(repo *repository.EntryRepository) *EntryService {
	return &EntryService{repo: repo}
}

func (s *EntryService) GetByNotebookID(notebookID string, page, perPage int) ([]domain.NotebookEntry, int64, error) {
	return s.repo.GetByNotebookID(notebookID, page, perPage)
}

func (s *EntryService) Create(notebookID, data string) (*domain.NotebookEntry, error) {
	return s.CreateWithCreator(notebookID, data, "")
}

func (s *EntryService) CreateWithCreator(notebookID, data, creatorName string) (*domain.NotebookEntry, error) {
	entry := &domain.NotebookEntry{
		ID:          uuid.New().String(),
		NotebookID:  notebookID,
		Data:        data,
		CreatorName: creatorName,
	}
	err := s.repo.Create(entry)
	return entry, err
}

func (s *EntryService) Update(id, data string) (*domain.NotebookEntry, error) {
	entry, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	entry.Data = data
	err = s.repo.Update(entry)
	return entry, err
}

func (s *EntryService) Delete(id string) error {
	return s.repo.Delete(id)
}