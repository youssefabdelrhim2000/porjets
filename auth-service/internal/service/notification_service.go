package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
)

type NotificationService struct {
	repo *repository.NotificationRepository
}

func NewNotificationService(repo *repository.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) GetAll() ([]map[string]interface{}, error) {
	notifications, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	result := make([]map[string]interface{}, len(notifications))
	for i, n := range notifications {
		result[i] = map[string]interface{}{
			"id":          n.ID,
			"type":        n.Type,
			"title":       n.Title,
			"description": n.Description,
			"user":        n.UserName,
			"timestamp":   n.CreatedAt,
			"read":        n.IsRead(),
		}
	}
	return result, nil
}

func (s *NotificationService) GetUnreadCount() (int64, error) {
	return s.repo.GetUnreadCount()
}

// CreateEntryNotification - لما حد يضيف سجل
func (s *NotificationService) CreateEntryNotification(userName, notebookName string) error {
	n := &domain.Notification{
		ID:          uuid.New().String(),
		Type:        "entry",
		Title:       "سجل جديد",
		Description: fmt.Sprintf("قام %s بإضافة سجل جديد في دفتر «%s» في %s",
			userName, notebookName, time.Now().Format("2006-01-02 15:04")),
		UserName:  userName,
		CreatedAt: time.Now(),
	}
	return s.repo.Create(n)
}

// CreateFileNotification - لما حد يرفع ملف
func (s *NotificationService) CreateFileNotification(userName, fileName string) error {
	n := &domain.Notification{
		ID:          uuid.New().String(),
		Type:        "file",
		Title:       "ملف جديد",
		Description: fmt.Sprintf("قام %s برفع ملف «%s» في %s",
			userName, fileName, time.Now().Format("2006-01-02 15:04")),
		UserName:  userName,
		CreatedAt: time.Now(),
	}
	return s.repo.Create(n)
}

func (s *NotificationService) MarkAsRead(id string) error {
	return s.repo.MarkAsRead(id)
}

func (s *NotificationService) MarkAllAsRead() error {
	return s.repo.MarkAllAsRead()
}

func (s *NotificationService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *NotificationService) ClearAll() error {
	return s.repo.ClearAll()
}