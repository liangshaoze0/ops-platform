package handlers

import (
	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuditHandler struct {
	db *gorm.DB
}

func NewAuditHandler(db *gorm.DB) *AuditHandler {
	return &AuditHandler{db: db}
}

// GetAuditLogs 获取审计日志列表（管理员）
func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	var req struct {
		Page     int    `form:"page" binding:"omitempty,min=1"`
		PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
		Action   string `form:"action"`
		Resource string `form:"resource"`
		Username string `form:"username"`
		StartDate string `form:"start_date"`
		EndDate   string `form:"end_date"`
	}

	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 默认分页
	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	// 构建查询
	query := h.db.Model(&models.AuditLog{})

	if req.Action != "" {
		query = query.Where("action = ?", req.Action)
	}
	if req.Resource != "" {
		query = query.Where("resource = ?", req.Resource)
	}
	if req.Username != "" {
		query = query.Where("username LIKE ?", "%"+req.Username+"%")
	}
	if req.StartDate != "" {
		query = query.Where("created_at >= ?", req.StartDate)
	}
	if req.EndDate != "" {
		query = query.Where("created_at <= ?", req.EndDate)
	}

	// 获取总数
	var total int64
	query.Count(&total)

	// 分页查询
	var logs []models.AuditLog
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&logs).Error; err != nil {
		utils.InternalServerError(c, "查询审计日志失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{
		"logs":      logs,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// GetAuditLog 获取单条审计日志详情
func (h *AuditHandler) GetAuditLog(c *gin.Context) {
	var log models.AuditLog
	id := c.Param("id")

	if err := h.db.First(&log, id).Error; err != nil {
		utils.NotFound(c, "审计日志不存在")
		return
	}

	utils.Success(c, log)
}
