package domain

import "time"

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"unique;not null" json:"username"`
	Password     string    `gorm:"column:password;not null" json:"password"`
	PasswordHash string    `gorm:"column:password_hash" json:"-"`
	DisplayName  string    `json:"display_name"`
	Role         string    `json:"role"`
	Permissions  string    `gorm:"type:text" json:"permissions"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}