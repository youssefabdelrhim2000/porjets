package domain

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)


// ==========================================
// NotebookEntry
// ==========================================
type NotebookEntry struct {
	ID         string          `json:"id" gorm:"primaryKey;type:varchar(36)"`
	NotebookID string          `json:"notebook_id" gorm:"not null"`
	Data       string          `json:"-" gorm:"type:text"`   // محفوظ في DB كـ string
	DataParsed json.RawMessage `json:"data" gorm:"-"`        // بيرجع للفرونت كـ object
	CreatorName string          `json:"creator_name" gorm:"type:varchar(100)"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

// بيتفعل تلقائياً بعد كل SELECT
func (e *NotebookEntry) AfterFind(tx *gorm.DB) error {
	if e.Data != "" {
		e.DataParsed = json.RawMessage(e.Data)
	}
	return nil
}

type EntryRequest struct {
	NotebookID string                 `json:"notebook_id"`
	Data       map[string]interface{} `json:"data"`
}