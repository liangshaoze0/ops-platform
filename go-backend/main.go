package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"develops-ai/internal/config"
	"develops-ai/internal/routes"
	"develops-ai/pkg/database"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 根据环境设置 Gin 模式
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// 初始化数据库
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	// 创建 Gin 引擎
	r := gin.New()

	// 添加中间件
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS 中间件
	r.Use(corsMiddleware(cfg))

	// 设置路由
	routes.SetupRoutes(r, db, cfg)

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:           ":" + cfg.Server.Port,
		Handler:        r,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	// 在 goroutine 中启动服务器
	go func() {
		log.Printf("服务器启动在端口 %s", cfg.Server.Port)
		log.Printf("环境: %s", cfg.Environment)
		log.Printf("前端URL: %s", cfg.FrontendURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务器启动失败: %v", err)
		}
	}()

	// 等待中断信号以优雅地关闭服务器
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("正在关闭服务器...")

	// 创建一个5秒的超时上下文用于关闭服务器
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("服务器强制关闭: %v", err)
	}

	log.Println("服务器已优雅关闭")
}

// corsMiddleware 返回 CORS 中间件
func corsMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 开发环境允许所有来源
		if cfg.Environment == "development" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			// 生产环境只允许配置的前端URL
			if origin == cfg.FrontendURL {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length")
		c.Writer.Header().Set("Access-Control-Max-Age", "43200") // 12小时

		// 处理预检请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
