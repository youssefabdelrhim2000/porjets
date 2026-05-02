package middleware

import (
	"github.com/gofiber/fiber/v3"
	jwtware "github.com/gofiber/contrib/v3/jwt"
)

func JWTProtected(secret []byte) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: secret},
		ErrorHandler: func(c fiber.Ctx, err error) error {
			return c.Status(401).JSON(fiber.Map{"error": "غير مصرح لك بالدخول"})
		},
	})
}
