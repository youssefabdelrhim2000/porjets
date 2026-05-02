package repository

import (
	"github.com/youssef/auth-service/internal/domain"
	"gorm.io/gorm"
)

type FileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) *FileRepository {
	return &FileRepository{db: db}
}

func (r *FileRepository) GetByDossierID(dossierID uint) ([]domain.DossierFile, error) {
	var files []domain.DossierFile
	err := r.db.Where("dossier_id = ?", dossierID).
		Select("id, dossier_id, file_name, file_type, mime_type, file_size, created_at").
		Order("created_at DESC").
		Find(&files).Error
	return files, err
}

func (r *FileRepository) GetByID(id uint) (*domain.DossierFile, error) {
	var f domain.DossierFile
	err := r.db.First(&f, id).Error
	return &f, err
}

func (r *FileRepository) Create(f *domain.DossierFile) error {
	return r.db.Create(f).Error
}

func (r *FileRepository) BulkDelete(ids []uint, dossierID uint) error {
	return r.db.Where("id IN ? AND dossier_id = ?", ids, dossierID).
		Delete(&domain.DossierFile{}).Error
}