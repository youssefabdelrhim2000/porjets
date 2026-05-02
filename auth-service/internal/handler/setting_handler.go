package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/domain"
	"gorm.io/gorm"
)

type SettingHandler struct {
	db *gorm.DB
}

func NewSettingHandler(db *gorm.DB) *SettingHandler {
	return &SettingHandler{db: db}
}

// GET /settings/theme
func (h *SettingHandler) GetTheme(c fiber.Ctx) error {
	var setting domain.Setting
	err := h.db.First(&setting, "key = ?", "theme").Error
	if err != nil {
		return c.JSON(fiber.Map{"theme": "dark"}) // default
	}
	return c.JSON(fiber.Map{"theme": setting.Value})
}

// POST /settings/theme
func (h *SettingHandler) SetTheme(c fiber.Ctx) error {
	var body struct {
		Theme string `json:"theme"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}
	if body.Theme != "light" && body.Theme != "dark" {
		return c.Status(400).JSON(fiber.Map{"error": "قيمة غير صالحة"})
	}

	setting := domain.Setting{Key: "theme", Value: body.Theme}
	h.db.Save(&setting) // upsert

	return c.JSON(fiber.Map{"theme": body.Theme})
}