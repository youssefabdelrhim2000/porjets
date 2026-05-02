package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/service"
)

type SearchHandler struct {
	service *service.SearchService
}

func NewSearchHandler(s *service.SearchService) *SearchHandler {
	return &SearchHandler{service: s}
}

// GET /search/global?q=...
func (h *SearchHandler) GlobalSearch(c fiber.Ctx) error {
	q := c.Query("q", "")
	if len(q) < 2 {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}

	results, err := h.service.GlobalSearch(q)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل البحث"})
	}

	return c.JSON(fiber.Map{"data": results})
}