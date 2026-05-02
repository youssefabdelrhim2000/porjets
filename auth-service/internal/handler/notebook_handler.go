package handler

import (
	"encoding/json"

	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/service"
)

type NotebookHandler struct {
	service *service.NotebookService
}

func NewNotebookHandler(s *service.NotebookService) *NotebookHandler {
	return &NotebookHandler{service: s}
}

// ← التحويل بيحصل هنا
func notebookResponse(n *domain.Notebook) fiber.Map {
	var fields []interface{}
	if n.Fields != "" {
		json.Unmarshal([]byte(n.Fields), &fields)
	}
	if fields == nil {
		fields = []interface{}{}
	}
	return fiber.Map{
		"id":          n.ID,
		"name":        n.Name,
		"description": n.Description,
		"icon":        n.Icon,
		"color":       n.Color,
		"fields":      fields,
		"created_at":  n.CreatedAt,
		"updated_at":  n.UpdatedAt,
	}
}

func (h *NotebookHandler) GetAll(c fiber.Ctx) error {
	notebooks, err := h.service.GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل في جلب الدفاتر"})
	}
	result := make([]fiber.Map, len(notebooks))
	for i, n := range notebooks {
		nb := n
		result[i] = notebookResponse(&nb)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *NotebookHandler) GetByID(c fiber.Ctx) error {
	id := c.Params("id")
	notebook, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الدفتر غير موجود"})
	}
	return c.JSON(fiber.Map{"data": notebookResponse(notebook)})
}

func (h *NotebookHandler) Create(c fiber.Ctx) error {
	var req domain.NotebookRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}
	notebook, err := h.service.Create(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل في إنشاء الدفتر"})
	}
	return c.Status(201).JSON(fiber.Map{"data": notebookResponse(notebook)})
}

// PUT /notebooks/:id
func (h *NotebookHandler) Update(c fiber.Ctx) error {
	id := c.Params("id")

	// استقبل كـ raw map عشان fields ممكن تيجي array أو string
	var body map[string]interface{}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	// حوّل fields لـ JSON string لو جت array
	var fieldsStr string
	if fieldsRaw, ok := body["fields"]; ok {
		switch v := fieldsRaw.(type) {
		case string:
			fieldsStr = v
		default:
			b, err := json.Marshal(v)
			if err != nil {
				return c.Status(400).JSON(fiber.Map{"error": "خطأ في معالجة الحقول"})
			}
			fieldsStr = string(b)
		}
	}

	req := domain.NotebookRequest{
		Name:        getString(body, "name"),
		Description: getString(body, "description"),
		Icon:        getString(body, "icon"),
		Color:       getString(body, "color"),
		Fields:      fieldsStr,
	}

	notebook, err := h.service.Update(id, req)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الدفتر غير موجود"})
	}

	return c.JSON(fiber.Map{"data": notebookResponse(notebook)})
}

// helper صغير
func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func (h *NotebookHandler) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.Delete(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الدفتر غير موجود"})
	}
	return c.Status(204).SendString("")
}