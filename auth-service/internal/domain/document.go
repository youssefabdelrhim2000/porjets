package domain

import "time"

type DocumentYear struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Year      int       `gorm:"not null;unique" json:"year"`
	CreatedAt time.Time `json:"created_at"`
}

type DocumentBatch struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	YearID      uint      `gorm:"not null" json:"year_id"`
	BatchNumber int       `json:"batch_number"`
	Name        string    `json:"name"`
	CreatedAt   time.Time `json:"created_at"`
}

type Document struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Category   string    `gorm:"not null" json:"category"` // افراد, معاونين, مجندين
	BatchID    *uint     `json:"batch_id"`
	YearID     *uint     `json:"year_id"`
	PersonName string    `gorm:"not null" json:"person_name"`
	FileName   string    `json:"file_name"`
	FileType   string    `json:"file_type"`
	FileData   []byte    `gorm:"type:bytea" json:"-"`
	MimeType   string    `json:"mime_type"`
	FileSize   int64     `json:"file_size"`
	CreatedAt  time.Time `json:"created_at"`
}