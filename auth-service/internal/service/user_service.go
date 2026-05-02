package service

import (
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
)

type UserService struct {
	repo *repository.UserRepository
}

func NewUserService(repo *repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) GetAll() ([]domain.User, error) {
	return s.repo.GetAll()
}

func (s *UserService) GetByID(id string) (*domain.User, error) {
	return s.repo.GetByID(id)
}

func (s *UserService) Create(user *domain.User) error {
	return s.repo.Create(user)
}

func (s *UserService) Update(user *domain.User) error {
	return s.repo.Update(user)
}

func (s *UserService) Delete(id string) error {
	return s.repo.Delete(id)
}