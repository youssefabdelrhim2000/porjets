package repository

import (
	"time"

	"github.com/youssef/auth-service/internal/domain"
	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) GetAll() ([]domain.Notification, error) {
	var notifications []domain.Notification
	err := r.db.Order("created_at DESC").Find(&notifications).Error
	return notifications, err
}

func (r *NotificationRepository) GetUnreadCount() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Notification{}).Where("read_at IS NULL").Count(&count).Error
	return count, err
}

func (r *NotificationRepository) Create(n *domain.Notification) error {
	return r.db.Create(n).Error
}

func (r *NotificationRepository) MarkAsRead(id string) error {
	now := time.Now()
	return r.db.Model(&domain.Notification{}).
		Where("id = ?", id).
		Update("read_at", now).Error
}

func (r *NotificationRepository) MarkAllAsRead() error {
	now := time.Now()
	return r.db.Model(&domain.Notification{}).
		Where("read_at IS NULL").
		Update("read_at", now).Error
}

func (r *NotificationRepository) Delete(id string) error {
	return r.db.Delete(&domain.Notification{}, "id = ?", id).Error
}

func (r *NotificationRepository) ClearAll() error {
	return r.db.Where("1 = 1").Delete(&domain.Notification{}).Error
}