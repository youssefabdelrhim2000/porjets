package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/youssef/auth-service/internal/config"
	"github.com/youssef/auth-service/internal/domain"
	"github.com/youssef/auth-service/internal/handler"
	"github.com/youssef/auth-service/internal/middleware"
	"github.com/youssef/auth-service/internal/repository"
	"github.com/youssef/auth-service/internal/service"
)

func main() {
	cfg := config.LoadConfig()

	// الاتصال بقاعدة البيانات
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("فشل الاتصال بقاعدة البيانات:", err)
	}

	// إنشاء الجداول
	err = db.AutoMigrate(&domain.User{}, &domain.Notebook{}, &domain.NotebookEntry{}, &domain.Notification{}, &domain.Setting{})
	if err != nil {
		log.Fatal("فشل في إنشاء الجداول:", err)
	}
	// AutoMigrate
    db.AutoMigrate(
        &domain.User{}, &domain.Notebook{}, &domain.NotebookEntry{},
        &domain.Notification{}, &domain.Setting{},
        &domain.Dossier{}, &domain.DossierFile{}, // ← ضيف دول
		&domain.DocumentYear{}, &domain.DocumentBatch{}, &domain.Document{},
    )
	

	// Seed admin user
	var count int64
	db.Model(&domain.User{}).Count(&count)
    if count == 0 {
        authSvc := service.NewAuthService(nil, nil)
        hashed, _ := authSvc.HashPassword("123456")
        db.Create(&domain.User{
            Username:     "admin",
            Password:     "123456",
            PasswordHash: hashed,    // ← ده المهم
            DisplayName:  "المدير",
            Role:         "admin",
            Permissions:  `[]`,
        })
        fmt.Println("✅ admin / 123456")
    }

	// ====================== Repositories ======================
	userRepo := repository.NewUserRepository(db)
	notebookRepo := repository.NewNotebookRepository(db)
	entryRepo := repository.NewEntryRepository(db)
	searchRepo := repository.NewSearchRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	userService := service.NewUserService(userRepo)
	dossierRepo := repository.NewDossierRepository(db)
    fileRepo    := repository.NewFileRepository(db)
	documentRepo    := repository.NewDocumentRepository(db)

	// ====================== Services ======================
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	notebookService := service.NewNotebookService(notebookRepo)
	entryService := service.NewEntryService(entryRepo)
    searchService := service.NewSearchService(searchRepo)
	notificationService := service.NewNotificationService(notificationRepo)
	dossierService := service.NewDossierService(dossierRepo)
    fileService    := service.NewFileService(fileRepo)
	documentService := service.NewDocumentService(documentRepo)


	// ====================== Handlers ======================
	authHandler := handler.NewAuthHandler(authService)
	notebookHandler := handler.NewNotebookHandler(notebookService)
	entryHandler := handler.NewEntryHandler(entryService)
	searchHandler := handler.NewSearchHandler(searchService)
	notificationHandler := handler.NewNotificationHandler(notificationService)
	settingHandler := handler.NewSettingHandler(db)
	userHandler := handler.NewUserHandler(userService, authService)
	dossierHandler := handler.NewDossierHandler(dossierService)
    fileHandler    := handler.NewFileHandler(fileService)
	documentHandler := handler.NewDocumentHandler(documentService)
	 

	// ====================== Fiber App ======================
    app := fiber.New(fiber.Config{
        BodyLimit: 50 * 1024 * 1024, // 50MB عشان الملفات الكبيرة
    })
    
    // CORS أولاً
    app.Use(cors.New(cors.Config{
        AllowOrigins:  []string{"http://localhost:5173", "http://localhost:3000"},
        AllowMethods:  []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:  []string{"Origin", "Content-Type", "Accept", "Authorization"},
        ExposeHeaders: []string{"Content-Disposition"},
    }))
	app.Get("/files/:id/view", fileHandler.View)
    app.Get("/files/:id/download", fileHandler.Download)

	// Rate Limiter
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 60,
	}))

	// ====================== Routes ======================

	// Auth
	app.Post("/auth/login", authHandler.Login)
	app.Get("/users", middleware.JWTProtected(cfg.JWTSecret), userHandler.GetAll)
    app.Post("/users", middleware.JWTProtected(cfg.JWTSecret), userHandler.Create)
    app.Put("/users/:id", middleware.JWTProtected(cfg.JWTSecret), userHandler.Update)
    app.Delete("/users/:id", middleware.JWTProtected(cfg.JWTSecret), userHandler.Delete)

	// Notebooks
	app.Get("/search/global", searchHandler.GlobalSearch)
	app.Get("/notebooks", middleware.JWTProtected(cfg.JWTSecret), notebookHandler.GetAll)
	app.Get("/notebooks/:id", middleware.JWTProtected(cfg.JWTSecret), notebookHandler.GetByID)
	app.Post("/notebooks", middleware.JWTProtected(cfg.JWTSecret), notebookHandler.Create)
	app.Put("/notebooks/:id", middleware.JWTProtected(cfg.JWTSecret), notebookHandler.Update)
	app.Delete("/notebooks/:id", middleware.JWTProtected(cfg.JWTSecret), notebookHandler.Delete)

	// Entries (المهمة لـ NotebookView)
	app.Get("/notebooks/:notebookId/entries", middleware.JWTProtected(cfg.JWTSecret), entryHandler.GetByNotebook)
	app.Post("/notebooks/:notebookId/entries", middleware.JWTProtected(cfg.JWTSecret), entryHandler.Create)
	app.Put("/entries/:id", middleware.JWTProtected(cfg.JWTSecret), entryHandler.Update)
	app.Delete("/entries/:id", middleware.JWTProtected(cfg.JWTSecret), entryHandler.Delete)
	app.Get("/notifications/unread-count", middleware.JWTProtected(cfg.JWTSecret), notificationHandler.GetUnreadCount)
    app.Get("/notifications", middleware.JWTProtected(cfg.JWTSecret), notificationHandler.GetAll)
    app.Put("/notifications/:id/read", middleware.JWTProtected(cfg.JWTSecret), notificationHandler.MarkAsRead)
    app.Post("/notifications/mark-all-read", middleware.JWTProtected(cfg.JWTSecret), notificationHandler.MarkAllAsRead)
    app.Delete("/notifications/clear-all", middleware.JWTProtected(cfg.JWTSecret), notificationHandler.ClearAll)
    app.Delete("/notifications/:id", middleware.JWTProtected(cfg.JWTSecret), notificationHandler.Delete)
	// app.Get("/search/global", middleware.JWTProtected(cfg.JWTSecret), searchHandler.GlobalSearch)
	app.Get("/settings/theme", middleware.JWTProtected(cfg.JWTSecret), settingHandler.GetTheme)
    app.Post("/settings/theme", middleware.JWTProtected(cfg.JWTSecret), settingHandler.SetTheme)
	app.Get("/dossiers", middleware.JWTProtected(cfg.JWTSecret), dossierHandler.GetAll)
    app.Post("/dossiers", middleware.JWTProtected(cfg.JWTSecret), dossierHandler.Create)
    app.Put("/dossiers/:id", middleware.JWTProtected(cfg.JWTSecret), dossierHandler.Update)
    app.Delete("/dossiers/:id", middleware.JWTProtected(cfg.JWTSecret), dossierHandler.Delete)
    
    app.Get("/dossiers/:id/files", middleware.JWTProtected(cfg.JWTSecret), fileHandler.GetByDossier)
    app.Post("/files", middleware.JWTProtected(cfg.JWTSecret), fileHandler.Upload)
    app.Post("/files/bulk-delete", middleware.JWTProtected(cfg.JWTSecret), fileHandler.BulkDelete)
	app.Get("/years", middleware.JWTProtected(cfg.JWTSecret), documentHandler.GetYears)
    app.Post("/years", middleware.JWTProtected(cfg.JWTSecret), documentHandler.CreateYear)
    app.Put("/years/:id", middleware.JWTProtected(cfg.JWTSecret), documentHandler.UpdateYear)
    app.Delete("/years/:id", middleware.JWTProtected(cfg.JWTSecret), documentHandler.DeleteYear)
    
    app.Get("/years/:yearId/batches", middleware.JWTProtected(cfg.JWTSecret), documentHandler.GetBatches)
    app.Post("/batches", middleware.JWTProtected(cfg.JWTSecret), documentHandler.CreateBatch)
    app.Put("/batches/:id", middleware.JWTProtected(cfg.JWTSecret), documentHandler.UpdateBatch)
    app.Delete("/batches/:id", middleware.JWTProtected(cfg.JWTSecret), documentHandler.DeleteBatch)
    
    app.Get("/documents", middleware.JWTProtected(cfg.JWTSecret), documentHandler.GetDocuments)
    app.Post("/documents", middleware.JWTProtected(cfg.JWTSecret), documentHandler.CreateDocument)
    app.Post("/documents/:id", middleware.JWTProtected(cfg.JWTSecret), documentHandler.UpdateDocument)
    app.Delete("/documents/:id", middleware.JWTProtected(cfg.JWTSecret), documentHandler.DeleteDocument)
    app.Get("/documents/:id/view", documentHandler.ViewDocument)
    app.Get("/documents/:id/download", documentHandler.DownloadDocument)
	
    
	// Test Route
	app.Get("/profile", middleware.JWTProtected(cfg.JWTSecret), func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "مرحبا بك في النظام الأمني"})
	})

	log.Printf("🚀 السيرفر شغال على http://localhost:%s", cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))

}