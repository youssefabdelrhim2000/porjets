package repository

import (
	"github.com/youssef/auth-service/internal/domain"
	"gorm.io/gorm"
)

type NotebookRepository struct {
	db *gorm.DB
}

func NewNotebookRepository(db *gorm.DB) *NotebookRepository {
	return &NotebookRepository{db: db}
}

func (r *NotebookRepository) GetAll() ([]domain.Notebook, error) {
	var notebooks []domain.Notebook
	err := r.db.Find(&notebooks).Error
	return notebooks, err
}

func (r *NotebookRepository) GetByID(id string) (*domain.Notebook, error) {
	var notebook domain.Notebook
	err := r.db.First(&notebook, "id = ?", id).Error
	return &notebook, err
}

func (r *NotebookRepository) Create(notebook *domain.Notebook) error {
	return r.db.Create(notebook).Error
}

func (r *NotebookRepository) Update(notebook *domain.Notebook) error {
	return r.db.Save(notebook).Error
}

func (r *NotebookRepository) Delete(id string) error {
	return r.db.Delete(&domain.Notebook{}, "id = ?", id).Error
}