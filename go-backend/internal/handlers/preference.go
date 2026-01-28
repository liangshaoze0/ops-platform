package handlers

import (
	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PreferenceHandler struct {
	db *gorm.DB
}

func NewPreferenceHandler(db *gorm.DB) *PreferenceHandler {
	return &PreferenceHandler{db: db}
}

// GetPreference 获取当前用户的偏好设置
func (h *PreferenceHandler) GetPreference(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var preference models.UserPreference
	if err := h.db.Where("user_id = ?", userID).First(&preference).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// 如果不存在，创建默认偏好设置
			preference = models.UserPreference{
				UserID:   userID.(uint),
				Language: "zh-CN",
				Theme:    "light",
				Unit:     "metric",
			}
			if err := h.db.Create(&preference).Error; err != nil {
				utils.InternalServerError(c, "创建偏好设置失败: "+err.Error())
				return
			}
		} else {
			utils.InternalServerError(c, "获取偏好设置失败: "+err.Error())
			return
		}
	}

	utils.Success(c, preference)
}

// UpdatePreference 更新当前用户的偏好设置
func (h *PreferenceHandler) UpdatePreference(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var req struct {
		Language string `json:"language"`
		Theme    string `json:"theme"`
		Unit     string `json:"unit"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 验证语言选项
	validLanguages := map[string]bool{
		"zh-CN": true,
		"en-US": true,
	}
	if req.Language != "" && !validLanguages[req.Language] {
		utils.BadRequest(c, "无效的语言选项")
		return
	}

	// 验证主题选项
	validThemes := map[string]bool{
		"light": true,
		"dark":  true,
		"auto":  true,
	}
	if req.Theme != "" && !validThemes[req.Theme] {
		utils.BadRequest(c, "无效的主题选项")
		return
	}

	// 验证单位选项
	validUnits := map[string]bool{
		"metric":   true,
		"imperial": true,
	}
	if req.Unit != "" && !validUnits[req.Unit] {
		utils.BadRequest(c, "无效的单位选项")
		return
	}

	// 查找或创建偏好设置
	var preference models.UserPreference
	if err := h.db.Where("user_id = ?", userID).First(&preference).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// 创建新的偏好设置
			preference = models.UserPreference{
				UserID:   userID.(uint),
				Language: "zh-CN",
				Theme:    "light",
				Unit:     "metric",
			}
		} else {
			utils.InternalServerError(c, "获取偏好设置失败: "+err.Error())
			return
		}
	}

	// 更新字段（只更新提供的字段）
	updates := make(map[string]interface{})
	if req.Language != "" {
		updates["language"] = req.Language
	}
	if req.Theme != "" {
		updates["theme"] = req.Theme
	}
	if req.Unit != "" {
		updates["unit"] = req.Unit
	}

	if len(updates) > 0 {
		if err := h.db.Model(&preference).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, "更新偏好设置失败: "+err.Error())
			return
		}
	}

	// 重新加载数据
	h.db.First(&preference, preference.ID)

	utils.Success(c, preference)
}
