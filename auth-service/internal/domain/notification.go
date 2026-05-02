package domain

import "time"

type Notification struct {
	ID          string     `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Type        string     `json:"type" gorm:"type:varchar(50)"` // entry, file, system
	Title       string     `json:"title"`
	Description string     `json:"description"`
	UserID      string     `json:"user_id"`    // مين عمل الأكشن
	UserName    string     `json:"user"`       // اسمه
	ReadAt      *time.Time `json:"read_at"`
	CreatedAt   time.Time  `json:"timestamp"`
}

func (n *Notification) IsRead() bool {
	return n.ReadAt != nil
}

