package handler

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/service"
)

type FileHandler struct {
	service *service.FileService
}

func NewFileHandler(s *service.FileService) *FileHandler {
	return &FileHandler{service: s}
}

// GET /dossiers/:id/files
func (h *FileHandler) GetByDossier(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	files, err := h.service.GetByDossierID(uint(id))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب الملفات"})
	}

	result := make([]fiber.Map, len(files))
	for i, f := range files {
		result[i] = fiber.Map{
			"id":           f.ID,
			"file_name":    f.FileName,
			"file_type":    f.FileType,
			"mime_type":    f.MimeType,
			"file_size":    f.FileSize,
			"created_at":   f.CreatedAt,
			"url":          fmt.Sprintf("http://localhost:3000/files/%d/view", f.ID),
			"download_url": fmt.Sprintf("http://localhost:3000/files/%d/download", f.ID),
		}
	}
	return c.JSON(fiber.Map{"data": result})
}

// POST /files — رفع ملف
func (h *FileHandler) Upload(c fiber.Ctx) error {
	dossierIDStr := c.FormValue("dossier_id")
	dossierID, err := strconv.ParseUint(dossierIDStr, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "dossier_id مطلوب"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "الملف مطلوب"})
	}

	// اقرأ محتوى الملف
	f, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل قراءة الملف"})
	}
	defer f.Close()

	fileData := make([]byte, file.Size)
	if _, err := f.Read(fileData); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل قراءة محتوى الملف"})
	}

	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	fileType := detectFileType(file.Filename, mimeType)

	dossierFile := &domain.DossierFile{
		DossierID: uint(dossierID),
		FileName:  file.Filename,
		FileType:  fileType,
		FileData:  fileData,
		MimeType:  mimeType,
		FileSize:  file.Size,
	}

	if err := h.service.Create(dossierFile); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل حفظ الملف"})
	}

	return c.Status(201).JSON(fiber.Map{
		"data": fiber.Map{
			"id":           dossierFile.ID,
			"file_name":    dossierFile.FileName,
			"file_type":    dossierFile.FileType,
			"mime_type":    dossierFile.MimeType,
			"file_size":    dossierFile.FileSize,
			"url":          fmt.Sprintf("http://localhost:3000/files/%d/view", dossierFile.ID),
			"download_url": fmt.Sprintf("http://localhost:3000/files/%d/download", dossierFile.ID),
		},
	})
}

// GET /files/:id/view
func (h *FileHandler) View(c fiber.Ctx) error {
    id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
    file, err := h.service.GetByID(uint(id))
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "الملف غير موجود"})
    }

    mimeType := file.MimeType
    if mimeType == "" {
        mimeType = detectMimeFromName(file.FileName)
    }

    c.Set("Content-Type", mimeType)
    c.Set("Content-Disposition", "inline")   // بدون filename
    c.Set("Access-Control-Allow-Origin", "*")
    c.Set("Cache-Control", "no-cache")

    return c.Send(file.FileData)
}

// GET /files/:id/download — تحميل الملف
func (h *FileHandler) Download(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	file, err := h.service.GetByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الملف غير موجود"})
	}

	mimeType := file.MimeType
	if mimeType == "" {
		mimeType = detectMimeFromName(file.FileName)
	}

	c.Set("Content-Type", mimeType)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, file.FileName))
	c.Set("Access-Control-Allow-Origin", "*")
	return c.Send(file.FileData)
}

// POST /files/bulk-delete
func (h *FileHandler) BulkDelete(c fiber.Ctx) error {
	var body struct {
		IDs       []uint `json:"ids"`
		DossierID uint   `json:"dossier_id"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}

	if len(body.IDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "يجب تحديد ملف واحد على الأقل"})
	}

	if err := h.service.BulkDelete(body.IDs, body.DossierID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل الحذف"})
	}

	return c.JSON(fiber.Map{"message": "تم الحذف بنجاح"})
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func detectFileType(filename, mimeType string) string {
	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".pdf"):
		return "pdf"
	case strings.HasSuffix(lower, ".xlsx") || strings.HasSuffix(lower, ".xls"):
		return "excel"
	case strings.HasSuffix(lower, ".docx") || strings.HasSuffix(lower, ".doc"):
		return "word"
	case strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg") ||
		strings.HasSuffix(lower, ".png") || strings.HasSuffix(lower, ".webp") ||
		strings.HasSuffix(lower, ".gif"):
		return "image"
	default:
		if strings.HasPrefix(mimeType, "image/") {
			return "image"
		}
		return "file"
	}
}

func detectMimeFromName(filename string) string {
	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".pdf"):
		return "application/pdf"
	case strings.HasSuffix(lower, ".xlsx"):
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case strings.HasSuffix(lower, ".xls"):
		return "application/vnd.ms-excel"
	case strings.HasSuffix(lower, ".docx"):
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case strings.HasSuffix(lower, ".doc"):
		return "application/msword"
	case strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lower, ".gif"):
		return "image/gif"
	default:
		return "application/octet-stream"
	}
}