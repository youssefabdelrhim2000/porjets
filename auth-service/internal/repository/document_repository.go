package repository

import (
	"github.com/youssef/auth-service/internal/domain"
	"gorm.io/gorm"
)

type DocumentRepository struct {
	db *gorm.DB
}

func NewDocumentRepository(db *gorm.DB) *DocumentRepository {
	return &DocumentRepository{db: db}
}

// Years
func (r *DocumentRepository) GetAllYears() ([]domain.DocumentYear, error) {
	var years []domain.DocumentYear
	err := r.db.Order("year DESC").Find(&years).Error
	return years, err
}

func (r *DocumentRepository) CreateYear(y *domain.DocumentYear) error {
	return r.db.Create(y).Error
}

func (r *DocumentRepository) UpdateYear(y *domain.DocumentYear) error {
	return r.db.Save(y).Error
}

func (r *DocumentRepository) DeleteYear(id uint) error {
	// احذف الدفعات والوثائق المرتبطة
	var batches []domain.DocumentBatch
	r.db.Where("year_id = ?", id).Find(&batches)
	for _, b := range batches {
		r.db.Where("batch_id = ?", b.ID).Delete(&domain.Document{})
	}
	r.db.Where("year_id = ?", id).Delete(&domain.DocumentBatch{})
	return r.db.Delete(&domain.DocumentYear{}, id).Error
}

// Batches
func (r *DocumentRepository) GetBatchesByYear(yearID uint) ([]domain.DocumentBatch, error) {
	var batches []domain.DocumentBatch
	err := r.db.Where("year_id = ?", yearID).Order("batch_number ASC").Find(&batches).Error
	return batches, err
}

func (r *DocumentRepository) CreateBatch(b *domain.DocumentBatch) error {
	// احسب الـ batch_number
	var count int64
	r.db.Model(&domain.DocumentBatch{}).Where("year_id = ?", b.YearID).Count(&count)
	b.BatchNumber = int(count) + 1
	return r.db.Create(b).Error
}

func (r *DocumentRepository) UpdateBatch(b *domain.DocumentBatch) error {
	return r.db.Save(b).Error
}

func (r *DocumentRepository) DeleteBatch(id uint) error {
	r.db.Where("batch_id = ?", id).Delete(&domain.Document{})
	return r.db.Delete(&domain.DocumentBatch{}, id).Error
}

// Documents
func (r *DocumentRepository) GetDocuments(category string, batchID, yearID *uint, search string) ([]domain.Document, error) {
	var docs []domain.Document
	q := r.db.Where("category = ?", category).
		Select("id, category, batch_id, year_id, person_name, file_name, file_type, mime_type, file_size, created_at")

	if batchID != nil {
		q = q.Where("batch_id = ?", *batchID)
	}
	if yearID != nil {
		q = q.Where("year_id = ?", *yearID)
	}
	if search != "" {
		q = q.Where("person_name ILIKE ?", "%"+search+"%")
	}

	err := q.Order("created_at DESC").Find(&docs).Error
	return docs, err
}

func (r *DocumentRepository) SearchAll(search string) ([]domain.Document, error) {
	var docs []domain.Document
	err := r.db.Where("person_name ILIKE ?", "%"+search+"%").
		Select("id, category, batch_id, year_id, person_name, file_name, file_type, mime_type, file_size, created_at").
		Order("created_at DESC").
		Limit(50).
		Find(&docs).Error
	return docs, err
}

func (r *DocumentRepository) GetByID(id uint) (*domain.Document, error) {
	var doc domain.Document
	err := r.db.First(&doc, id).Error
	return &doc, err
}

func (r *DocumentRepository) Create(doc *domain.Document) error {
	return r.db.Create(doc).Error
}

func (r *DocumentRepository) Update(doc *domain.Document) error {
	return r.db.Save(doc).Error
}

func (r *DocumentRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Document{}, id).Error
}