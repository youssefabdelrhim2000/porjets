package handler

import (
	"encoding/json"
	"log"
	"strconv"

	jwt "github.com/golang-jwt/jwt/v5"
	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/service"
)

type EntryHandler struct {
	service *service.EntryService
}

func NewEntryHandler(s *service.EntryService) *EntryHandler {
	return &EntryHandler{service: s}
}

// GET /notebooks/:notebookId/entries
func (h *EntryHandler) GetByNotebook(c fiber.Ctx) error {
	notebookID := c.Params("notebookId")

	pageStr := c.Query("page", "1")
	perPageStr := c.Query("per_page", "50")

	page, _ := strconv.Atoi(pageStr)
	perPage, _ := strconv.Atoi(perPageStr)

	if page < 1 { page = 1 }
	if perPage < 1 || perPage > 500 { perPage = 50 }

	entries, total, err := h.service.GetByNotebookID(notebookID, page, perPage)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل في جلب السجلات"})
	}

	return c.JSON(fiber.Map{
		"data": entries,
		"meta": fiber.Map{
			"total":     total,
			"page":      page,
			"per_page":  perPage,
			"last_page": (total + int64(perPage) - 1) / int64(perPage),
		},
	})
}

// POST /notebooks/:notebookId/entries
func (h *EntryHandler) Create(c fiber.Ctx) error {
	notebookID := c.Params("notebookId")

	var body map[string]interface{}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	dataField, ok := body["data"]
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "حقل data مطلوب"})
	}

	dataBytes, err := json.Marshal(dataField)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "فشل في معالجة البيانات"})
	}

    creatorName := "غير معروف"
    localUser := c.Locals("user")
    log.Printf("🔍 Locals user type: %T, value: %+v", localUser, localUser)
    
    if token, ok := localUser.(*jwt.Token); ok && token != nil {
        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            log.Printf("✅ JWT Claims: %+v", claims)
            if name, ok := claims["display_name"].(string); ok && name != "" {
                creatorName = name
            } else if name, ok := claims["username"].(string); ok {
                creatorName = name
            }
        }
    }

	entry, err := h.service.CreateWithCreator(notebookID, string(dataBytes), creatorName)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل في إضافة السجل"})
	}

	return c.Status(201).JSON(entry)
}

// PUT /entries/:id
func (h *EntryHandler) Update(c fiber.Ctx) error {
	id := c.Params("id")

	var body map[string]interface{}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	dataField, ok := body["data"]
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "حقل data مطلوب"})
	}

	dataBytes, err := json.Marshal(dataField)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "فشل في معالجة البيانات"})
	}

	entry, err := h.service.Update(id, string(dataBytes))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "السجل غير موجود"})
	}

	return c.JSON(entry)
}

// DELETE /entries/:id
func (h *EntryHandler) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.Delete(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "السجل غير موجود"})
	}
	return c.Status(204).SendString("")
}