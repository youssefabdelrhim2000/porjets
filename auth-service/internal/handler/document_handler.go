package handler

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/service"
)

type DocumentHandler struct {
	service *service.DocumentService
}

func NewDocumentHandler(s *service.DocumentService) *DocumentHandler {
	return &DocumentHandler{service: s}
}

// GET /years
func (h *DocumentHandler) GetYears(c fiber.Ctx) error {
	years, err := h.service.GetAllYears()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب السنوات"})
	}
	return c.JSON(fiber.Map{"data": years})
}

// POST /years
func (h *DocumentHandler) CreateYear(c fiber.Ctx) error {
	var body struct {
		Year int `json:"year"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}
	y := &domain.DocumentYear{Year: body.Year}
	if err := h.service.CreateYear(y); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل إضافة السنة"})
	}
	return c.Status(201).JSON(fiber.Map{"data": y})
}

// PUT /years/:id
func (h *DocumentHandler) UpdateYear(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var body struct {
		Year int `json:"year"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}
	y := &domain.DocumentYear{ID: uint(id), Year: body.Year}
	if err := h.service.UpdateYear(y); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل تعديل السنة"})
	}
	return c.JSON(fiber.Map{"data": y})
}

// DELETE /years/:id
func (h *DocumentHandler) DeleteYear(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	if err := h.service.DeleteYear(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل حذف السنة"})
	}
	return c.Status(204).SendString("")
}

// GET /years/:yearId/batches
func (h *DocumentHandler) GetBatches(c fiber.Ctx) error {
	yearID, _ := strconv.ParseUint(c.Params("yearId"), 10, 32)
	batches, err := h.service.GetBatchesByYear(uint(yearID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب الدفعات"})
	}
	return c.JSON(fiber.Map{"data": batches})
}

// POST /batches
func (h *DocumentHandler) CreateBatch(c fiber.Ctx) error {
	var body struct {
		YearID uint   `json:"year_id"`
		Name   string `json:"name"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}
	b := &domain.DocumentBatch{YearID: body.YearID, Name: body.Name}
	if err := h.service.CreateBatch(b); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل إضافة الدفعة"})
	}
	return c.Status(201).JSON(fiber.Map{"data": b})
}

// PUT /batches/:id
func (h *DocumentHandler) UpdateBatch(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var body struct {
		Name string `json:"name"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "بيانات غير صالحة"})
	}
	b := &domain.DocumentBatch{ID: uint(id), Name: body.Name}
	if err := h.service.UpdateBatch(b); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل تعديل الدفعة"})
	}
	return c.JSON(fiber.Map{"data": b})
}

// DELETE /batches/:id
func (h *DocumentHandler) DeleteBatch(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	if err := h.service.DeleteBatch(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل حذف الدفعة"})
	}
	return c.Status(204).SendString("")
}

// GET /documents
func (h *DocumentHandler) GetDocuments(c fiber.Ctx) error {
	category := c.Query("category")
	search := c.Query("search")

	var batchID, yearID *uint

	if b := c.Query("batch_id"); b != "" {
		v, _ := strconv.ParseUint(b, 10, 32)
		u := uint(v)
		batchID = &u
	}
	if y := c.Query("year_id"); y != "" {
		v, _ := strconv.ParseUint(y, 10, 32)
		u := uint(v)
		yearID = &u
	}

	// لو فيه search بس من غير category — ابحث في كل الوثائق
	if search != "" && category == "" {
		docs, err := h.service.SearchAll(search)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "فشل البحث"})
		}
		return c.JSON(fiber.Map{"data": docs})
	}

	docs, err := h.service.GetDocuments(category, batchID, yearID, search)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل جلب الوثائق"})
	}
	return c.JSON(fiber.Map{"data": docs})
}

// POST /documents
func (h *DocumentHandler) CreateDocument(c fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "الملف مطلوب"})
	}

	personName := c.FormValue("person_name")
	category := c.FormValue("category")

	if personName == "" || category == "" {
		return c.Status(400).JSON(fiber.Map{"error": "اسم الشخص والفئة مطلوبان"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل قراءة الملف"})
	}
	defer f.Close()

	fileData := make([]byte, file.Size)
	f.Read(fileData)

	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	doc := &domain.Document{
		Category:   category,
		PersonName: personName,
		FileName:   file.Filename,
		FileType:   detectDocFileType(file.Filename, mimeType),
		FileData:   fileData,
		MimeType:   mimeType,
		FileSize:   file.Size,
	}

	if b := c.FormValue("batch_id"); b != "" {
		v, _ := strconv.ParseUint(b, 10, 32)
		u := uint(v)
		doc.BatchID = &u
	}
	if y := c.FormValue("year_id"); y != "" {
		v, _ := strconv.ParseUint(y, 10, 32)
		u := uint(v)
		doc.YearID = &u
	}

	if err := h.service.Create(doc); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل حفظ الوثيقة"})
	}

	return c.Status(201).JSON(fiber.Map{"data": fiber.Map{
		"id":          doc.ID,
		"person_name": doc.PersonName,
		"file_name":   doc.FileName,
		"file_type":   doc.FileType,
		"category":    doc.Category,
	}})
}

// POST /documents/:id (تعديل)
func (h *DocumentHandler) UpdateDocument(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	doc, err := h.service.GetByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الوثيقة غير موجودة"})
	}

	if personName := c.FormValue("person_name"); personName != "" {
		doc.PersonName = personName
	}

	// لو في ملف جديد
	if file, err := c.FormFile("file"); err == nil {
		f, _ := file.Open()
		defer f.Close()
		fileData := make([]byte, file.Size)
		f.Read(fileData)
		doc.FileName = file.Filename
		doc.FileData = fileData
		doc.FileSize = file.Size
		doc.MimeType = file.Header.Get("Content-Type")
		doc.FileType = detectDocFileType(file.Filename, doc.MimeType)
	}

	if err := h.service.Update(doc); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل التحديث"})
	}

	return c.JSON(fiber.Map{"data": doc})
}

// DELETE /documents/:id
func (h *DocumentHandler) DeleteDocument(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	if err := h.service.Delete(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "فشل الحذف"})
	}
	return c.Status(204).SendString("")
}

// GET /documents/:id/view
func (h *DocumentHandler) ViewDocument(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	doc, err := h.service.GetByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الوثيقة غير موجودة"})
	}

	mimeType := doc.MimeType
	if mimeType == "" {
		mimeType = detectDocMime(doc.FileName)
	}

	c.Set("Content-Type", mimeType)
	c.Set("Access-Control-Allow-Origin", "*")
	return c.Send(doc.FileData)
}

// GET /documents/:id/download
func (h *DocumentHandler) DownloadDocument(c fiber.Ctx) error {
	id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	doc, err := h.service.GetByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "الوثيقة غير موجودة"})
	}

	mimeType := doc.MimeType
	if mimeType == "" {
		mimeType = detectDocMime(doc.FileName)
	}

	c.Set("Content-Type", mimeType)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, doc.FileName))
	c.Set("Access-Control-Allow-Origin", "*")
	return c.Send(doc.FileData)
}

// Helpers
func detectDocFileType(filename, mimeType string) string {
	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".pdf"):
		return "pdf"
	case strings.HasSuffix(lower, ".xlsx") || strings.HasSuffix(lower, ".xls"):
		return "excel"
	case strings.HasSuffix(lower, ".docx") || strings.HasSuffix(lower, ".doc"):
		return "word"
	default:
		return "file"
	}
}

func detectDocMime(filename string) string {
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
	default:
		return "application/octet-stream"
	}
}