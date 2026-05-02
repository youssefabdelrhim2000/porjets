package domain

import (
	"time"

)

type Notebook struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	Color       string    `json:"color"`
	Fields      string    `json:"fields"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type NotebookRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Color       string `json:"color"`
	Fields      string `json:"fields"`
}

