package handler

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/service"
)

type UserHandler struct {
	service     *service.UserService
	authService *service.AuthService
}

func NewUserHandler(s *service.UserService, as *service.AuthService) *UserHandler {
	return &UserHandler{service: s, authService: as}
}

// GET /users
func (h *UserHandler) GetAll(c fiber.Ctx) error {
	users, err := h.service.GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب المستخدمين"})
	}

	result := make([]fiber.Map, len(users))
	for i, u := range users {
		u := u
		result[i] = formatUser(&u)
	}
	return c.JSON(fiber.Map{"data": result})
}

// POST /users
func (h *UserHandler) Create(c fiber.Ctx) error {
	var body struct {
		Username    string   `json:"username"`
		Password    string   `json:"password"`
		DisplayName string   `json:"display_name"`
		Role        string   `json:"role"`
		Permissions []string `json:"permissions"`
	}

	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	if body.Username == "" || body.Password == "" {
		return c.Status(400).JSON(fiber.Map{"error": "اسم المستخدم وكلمة المرور مطلوبان"})
	}

	hashed, err := h.authService.HashPassword(body.Password)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل تشفير كلمة المرور"})
	}

	permsBytes, _ := json.Marshal(body.Permissions)
	role := body.Role
	if role == "" {
		role = "user"
	}

	user := &domain.User{
		Username:     body.Username,
		Password:     body.Password,
		PasswordHash: hashed,
		DisplayName:  body.DisplayName,
		Role:         role,
		Permissions:  string(permsBytes),
	}

	if err := h.service.Create(user); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "فشل إضافة المستخدم",
			"message": err.Error(),
		})
	}

	return c.Status(201).JSON(fiber.Map{"data": formatUser(user)})
}

// PUT /users/:id
func (h *UserHandler) Update(c fiber.Ctx) error {
	id := c.Params("id")

	user, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "المستخدم غير موجود"})
	}

	var body map[string]interface{}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	if v, ok := body["display_name"].(string); ok && v != "" {
		user.DisplayName = v
	}
	if v, ok := body["username"].(string); ok && v != "" {
		user.Username = v
	}
	if v, ok := body["role"].(string); ok && v != "" {
		user.Role = v
	}
	if v, ok := body["password"].(string); ok && v != "" {
		hashed, err := h.authService.HashPassword(v)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "فشل تشفير كلمة المرور"})
		}
		user.Password = v
		user.PasswordHash = hashed
	}
	if v, ok := body["permissions"]; ok {
		permsBytes, _ := json.Marshal(v)
		user.Permissions = string(permsBytes)
	}

	if err := h.service.Update(user); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل التحديث"})
	}

	return c.JSON(fiber.Map{"data": formatUser(user)})
}

// DELETE /users/:id
func (h *UserHandler) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.Delete(id); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "المستخدم غير موجود"})
	}
	return c.Status(204).SendString("")
}

func formatUser(u *domain.User) fiber.Map {
	var permissions []string
	json.Unmarshal([]byte(u.Permissions), &permissions)
	if permissions == nil {
		permissions = []string{}
	}
	return fiber.Map{
		"id":           fmt.Sprintf("%d", u.ID),
		"username":     u.Username,
		"password":     u.Password,
		"display_name": u.DisplayName,
		"role":         u.Role,
		"permissions":  permissions,
		"created_at":   u.CreatedAt,
	}
}