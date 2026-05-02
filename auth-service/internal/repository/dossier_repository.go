package repository

import (
	"github.com/youssef/auth-service/internal/domain"
	"gorm.io/gorm"
)

type DossierRepository struct {
	db *gorm.DB
}

func NewDossierRepository(db *gorm.DB) *DossierRepository {
	return &DossierRepository{db: db}
}

func (r *DossierRepository) GetAll() ([]domain.Dossier, error) {
	var dossiers []domain.Dossier
	err := r.db.Order("created_at DESC").Find(&dossiers).Error
	return dossiers, err
}

func (r *DossierRepository) Create(d *domain.Dossier) error {
	return r.db.Create(d).Error
}

func (r *DossierRepository) Update(d *domain.Dossier) error {
	return r.db.Save(d).Error
}

func (r *DossierRepository) Delete(id uint) error {
	// احذف الملفات الأول
	r.db.Where("dossier_id = ?", id).Delete(&domain.DossierFile{})
	return r.db.Delete(&domain.Dossier{}, id).Error
}

func (r *DossierRepository) GetByID(id uint) (*domain.Dossier, error) {
	var d domain.Dossier
	err := r.db.First(&d, id).Error
	return &d, err
}