package repository

import (
	"github.com/youssef/auth-service/internal/domain"
	"gorm.io/gorm"
)

type EntryRepository struct {
	db *gorm.DB
}

func NewEntryRepository(db *gorm.DB) *EntryRepository {
	return &EntryRepository{db: db}
}

func (r *EntryRepository) GetByNotebookID(notebookID string, page, perPage int) ([]domain.NotebookEntry, int64, error) {
	var entries []domain.NotebookEntry
	var total int64

	offset := (page - 1) * perPage

	r.db.Model(&domain.NotebookEntry{}).Where("notebook_id = ?", notebookID).Count(&total)

	err := r.db.Where("notebook_id = ?", notebookID).
		Order("created_at desc").
		Offset(offset).
		Limit(perPage).
		Find(&entries).Error

	return entries, total, err
}

func (r *EntryRepository) Create(entry *domain.NotebookEntry) error {
	return r.db.Create(entry).Error
}

func (r *EntryRepository) Update(entry *domain.NotebookEntry) error {
	return r.db.Save(entry).Error
}

func (r *EntryRepository) Delete(id string) error {
	return r.db.Delete(&domain.NotebookEntry{}, "id = ?", id).Error
}

// GetByID - جلب سجل واحد بـ ID (مستخدمة في Update)
func (r *EntryRepository) GetByID(id string) (*domain.NotebookEntry, error) {
	var entry domain.NotebookEntry
	err := r.db.First(&entry, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &entry, nil
}