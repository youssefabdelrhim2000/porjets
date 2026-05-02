package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	resp, err := h.authService.Login(req)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}