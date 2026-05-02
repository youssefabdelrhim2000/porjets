package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/service"
)

type DossierHandler struct {
	service *service.DossierService
}

func NewDossierHandler(s *service.DossierService) *DossierHandler {
	return &DossierHandler{service: s}
}

// GET /dossiers
func (h *DossierHandler) GetAll(c fiber.Ctx) error {
	dossiers, err := h.service.GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب الدوسيهات"})
	}
	return c.JSON(fiber.Map{"data": dossiers})
}

// POST /dossiers
func (h *DossierHandler) Create(c fiber.Ctx) error {
	var body struct {
		Name        string `json:"name"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}
	if body.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "اسم الدوسيه مطلوب"})
	}

	d := &domain.Dossier{
		Name:        body.Name,
		Icon:        body.Icon,
		Description: body.Description,
		Color:       body.Color,
	}
	if d.Icon == "" {
		d.Icon = "folder"
	}

	if err := h.service.Create(d); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل إنشاء الدوسيه"})
	}
	return c.Status(201).JSON(fiber.Map{"data": d})
}

// PUT /dossiers/:id
func (h *DossierHandler) Update(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	d, err := h.service.GetByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الدوسيه غير موجود"})
	}

	var body struct {
		Name  string `json:"name"`
		Icon  string `json:"icon"`
		Color string `json:"color"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	if body.Name != "" {
		d.Name = body.Name
	}
	if body.Icon != "" {
		d.Icon = body.Icon
	}
	if body.Color != "" {
		d.Color = body.Color
	}

	if err := h.service.Update(d); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل التحديث"})
	}
	return c.JSON(fiber.Map{"data": d})
}

// DELETE /dossiers/:id
func (h *DossierHandler) Delete(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	if err := h.service.Delete(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل الحذف"})
	}
	return c.Status(204).SendString("")
}

