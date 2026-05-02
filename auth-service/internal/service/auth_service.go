package service

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/repository"
	"golang.org/x/crypto/argon2"
)

type AuthService struct {
	repo      *repository.UserRepository
	jwtSecret []byte
}

func NewAuthService(repo *repository.UserRepository, jwtSecret []byte) *AuthService {
	return &AuthService{repo: repo, jwtSecret: jwtSecret}
}

func (s *AuthService) HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)
	encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, 64*1024, 3, 4,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash))
	return encoded, nil
}

func (s *AuthService) VerifyPassword(password, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false, errors.New("invalid hash")
	}
	salt, _ := base64.RawStdEncoding.DecodeString(parts[4])
	storedHash, _ := base64.RawStdEncoding.DecodeString(parts[5])
	computed := argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)
	if subtle.ConstantTimeCompare(storedHash, computed) == 1 {
		return true, nil
	}
	return false, nil
}

func (s *AuthService) Login(req domain.LoginRequest) (*domain.AuthResponse, error) {
	user, err := s.repo.FindByUsername(req.Username)
	if err != nil {
		return nil, errors.New("اسم المستخدم أو كلمة المرور غير صحيحة")
	}

	ok, err := s.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !ok {
		return nil, errors.New("اسم المستخدم أو كلمة المرور غير صحيحة")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"username":     user.Username,    
        "display_name": user.DisplayName,
		"exp":  time.Now().Add(24 * time.Hour).Unix(),
	})

	signedToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: signedToken,
		User:  *user,
	}, nil
}