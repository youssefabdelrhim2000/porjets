package domain

import "time"

type Dossier struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Icon        string    `gorm:"default:'folder'" json:"icon"`
	Description string    `json:"description"`
	Color       string    `json:"color"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type DossierFile struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	DossierID   uint      `gorm:"not null" json:"dossier_id"`
	FileName    string    `json:"file_name"`
	FileType    string    `json:"file_type"` // image, pdf, excel, word
	FileData    []byte    `gorm:"type:bytea" json:"-"` // الملف نفسه في الداتابيز
	MimeType    string    `json:"mime_type"`
	FileSize    int64     `json:"file_size"`
	CreatedAt   time.Time `json:"created_at"`
}