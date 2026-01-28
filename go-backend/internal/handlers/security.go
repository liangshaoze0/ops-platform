package handlers

import (
	"time"

	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SecurityHandler struct {
	db *gorm.DB
}

func NewSecurityHandler(db *gorm.DB) *SecurityHandler {
	return &SecurityHandler{db: db}
}

// GetAuthorizations 获取授权列表
func (h *SecurityHandler) GetAuthorizations(c *gin.Context) {
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}

	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	var total int64
	h.db.Model(&models.Authorization{}).Count(&total)

	var authorizations []models.Authorization
	offset := (req.Page - 1) * req.PageSize
	if err := h.db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&authorizations).Error; err != nil {
		utils.InternalServerError(c, "获取授权列表失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{
		"data":      authorizations,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// CreateAuthorization 创建授权
func (h *SecurityHandler) CreateAuthorization(c *gin.Context) {
	var req struct {
		UserID   uint   `json:"user_id" binding:"required"`
		Resource string `json:"resource" binding:"required"`
		Action   string `json:"action" binding:"required"`
		Effect   string `json:"effect" binding:"required,oneof=allow deny"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	authorization := models.Authorization{
		UserID:   req.UserID,
		Resource: req.Resource,
		Action:   req.Action,
		Effect:   req.Effect,
	}

	if err := h.db.Create(&authorization).Error; err != nil {
		utils.InternalServerError(c, "创建授权失败: "+err.Error())
		return
	}

	utils.Success(c, authorization)
}

// DeleteAuthorization 删除授权
func (h *SecurityHandler) DeleteAuthorization(c *gin.Context) {
	id := c.Param("id")
	var authorization models.Authorization
	if err := h.db.First(&authorization, id).Error; err != nil {
		utils.NotFound(c, "授权不存在")
		return
	}

	if err := h.db.Delete(&authorization).Error; err != nil {
		utils.InternalServerError(c, "删除授权失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "删除成功"})
}

// GetPolicies 获取策略列表
func (h *SecurityHandler) GetPolicies(c *gin.Context) {
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}

	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	var total int64
	h.db.Model(&models.SecurityPolicy{}).Count(&total)

	var policies []models.SecurityPolicy
	offset := (req.Page - 1) * req.PageSize
	if err := h.db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&policies).Error; err != nil {
		utils.InternalServerError(c, "获取策略列表失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{
		"data":      policies,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// CreatePolicy 创建策略
func (h *SecurityHandler) CreatePolicy(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		PolicyType  string `json:"policy_type" binding:"required"`
		Rules       string `json:"rules" binding:"required"`
		Enabled     bool   `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	policy := models.SecurityPolicy{
		Name:        req.Name,
		Description: req.Description,
		PolicyType:  req.PolicyType,
		Rules:       req.Rules,
		Enabled:     req.Enabled,
	}

	if err := h.db.Create(&policy).Error; err != nil {
		utils.InternalServerError(c, "创建策略失败: "+err.Error())
		return
	}

	utils.Success(c, policy)
}

// UpdatePolicy 更新策略
func (h *SecurityHandler) UpdatePolicy(c *gin.Context) {
	id := c.Param("id")
	var policy models.SecurityPolicy
	if err := h.db.First(&policy, id).Error; err != nil {
		utils.NotFound(c, "策略不存在")
		return
	}

	var req struct {
		Enabled *bool `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if req.Enabled != nil {
		policy.Enabled = *req.Enabled
	}

	if err := h.db.Save(&policy).Error; err != nil {
		utils.InternalServerError(c, "更新策略失败: "+err.Error())
		return
	}

	utils.Success(c, policy)
}

// DeletePolicy 删除策略
func (h *SecurityHandler) DeletePolicy(c *gin.Context) {
	id := c.Param("id")
	var policy models.SecurityPolicy
	if err := h.db.First(&policy, id).Error; err != nil {
		utils.NotFound(c, "策略不存在")
		return
	}

	if err := h.db.Delete(&policy).Error; err != nil {
		utils.InternalServerError(c, "删除策略失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "删除成功"})
}

// GetInspections 获取配置巡检列表
func (h *SecurityHandler) GetInspections(c *gin.Context) {
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}

	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	var total int64
	h.db.Model(&models.ConfigInspection{}).Count(&total)

	var inspections []models.ConfigInspection
	offset := (req.Page - 1) * req.PageSize
	if err := h.db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&inspections).Error; err != nil {
		utils.InternalServerError(c, "获取配置巡检列表失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{
		"data":      inspections,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// RunInspection 执行配置巡检
func (h *SecurityHandler) RunInspection(c *gin.Context) {
	// 这里可以添加实际的巡检逻辑
	// 示例：创建一些示例巡检记录
	inspections := []models.ConfigInspection{
		{
			CheckItem:    "检查密码策略",
			ResourceType: "user",
			ResourceName: "all",
			Severity:     "medium",
			Status:       "passed",
			Message:      "密码策略配置正确",
		},
		{
			CheckItem:    "检查RBAC配置",
			ResourceType: "role",
			ResourceName: "all",
			Severity:     "low",
			Status:       "passed",
			Message:      "RBAC配置正常",
		},
	}

	for _, inspection := range inspections {
		h.db.Create(&inspection)
	}

	utils.Success(c, gin.H{"message": "配置巡检执行成功", "count": len(inspections)})
}

// GetSecurityAlerts 获取安全告警列表
func (h *SecurityHandler) GetSecurityAlerts(c *gin.Context) {
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}

	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	var total int64
	h.db.Model(&models.SecurityAlert{}).Count(&total)

	var alerts []models.SecurityAlert
	offset := (req.Page - 1) * req.PageSize
	if err := h.db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&alerts).Error; err != nil {
		utils.InternalServerError(c, "获取安全告警列表失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{
		"data":      alerts,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// GetSecurityStats 获取安全统计信息
func (h *SecurityHandler) GetSecurityStats(c *gin.Context) {
	var stats struct {
		Total    int64 `json:"total"`
		Critical int64 `json:"critical"`
		High     int64 `json:"high"`
		Medium   int64 `json:"medium"`
		Low      int64 `json:"low"`
	}

	h.db.Model(&models.SecurityAlert{}).Count(&stats.Total)
	h.db.Model(&models.SecurityAlert{}).Where("severity = ?", "critical").Count(&stats.Critical)
	h.db.Model(&models.SecurityAlert{}).Where("severity = ?", "high").Count(&stats.High)
	h.db.Model(&models.SecurityAlert{}).Where("severity = ?", "medium").Count(&stats.Medium)
	h.db.Model(&models.SecurityAlert{}).Where("severity = ?", "low").Count(&stats.Low)

	utils.Success(c, stats)
}

// AcknowledgeAlert 确认告警
func (h *SecurityHandler) AcknowledgeAlert(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	id := c.Param("id")
	var alert models.SecurityAlert
	if err := h.db.First(&alert, id).Error; err != nil {
		utils.NotFound(c, "告警不存在")
		return
	}

	now := time.Now()
	userIDUint := userID.(uint)
	alert.Acknowledged = true
	alert.AcknowledgedAt = &now
	alert.AcknowledgedBy = &userIDUint

	if err := h.db.Save(&alert).Error; err != nil {
		utils.InternalServerError(c, "确认告警失败: "+err.Error())
		return
	}

	utils.Success(c, alert)
}
