package service

import (
	"github.com/youssef/auth-service/internal/repository"
)

type SearchService struct {
	repo *repository.SearchRepository
}

func NewSearchService(repo *repository.SearchRepository) *SearchService {
	return &SearchService{repo: repo}
}

func (s *SearchService) GlobalSearch(q string) ([]repository.NotebookMatch, error) {
	return s.repo.GlobalSearch(q)
}