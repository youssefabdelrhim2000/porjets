package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/service"
)

type NotificationHandler struct {
	service *service.NotificationService
}

func NewNotificationHandler(s *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{service: s}
}

// GET /notifications
func (h *NotificationHandler) GetAll(c fiber.Ctx) error {
	notifications, err := h.service.GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب الإشعارات"})
	}
	return c.JSON(fiber.Map{"data": notifications})
}

// GET /notifications/unread-count
func (h *NotificationHandler) GetUnreadCount(c fiber.Ctx) error {
	count, err := h.service.GetUnreadCount()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب العدد"})
	}
	return c.JSON(fiber.Map{"count": count})
}

// PUT /notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.MarkAsRead(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل التحديث"})
	}
	return c.JSON(fiber.Map{"message": "تم"})
}

// POST /notifications/mark-all-read
func (h *NotificationHandler) MarkAllAsRead(c fiber.Ctx) error {
	if err := h.service.MarkAllAsRead(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل التحديث"})
	}
	return c.JSON(fiber.Map{"message": "تم"})
}

// DELETE /notifications/:id
func (h *NotificationHandler) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.Delete(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل الحذف"})
	}
	return c.Status(204).SendString("")
}

// DELETE /notifications/clear-all
func (h *NotificationHandler) ClearAll(c fiber.Ctx) error {
	if err := h.service.ClearAll(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل المسح"})
	}
	return c.JSON(fiber.Map{"message": "تم مسح الكل"})
}