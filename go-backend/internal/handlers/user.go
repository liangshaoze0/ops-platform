package handlers

import (
	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

// GetUsers 获取用户列表（支持分页）
func (h *UserHandler) GetUsers(c *gin.Context) {
	var req struct {
		Page     int    `form:"page" binding:"omitempty,min=1"`
		PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
		Search   string `form:"search"`
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
	query := h.db.Model(&models.User{}).Preload("UserRoles.Role")

	// 搜索功能
	if req.Search != "" {
		searchPattern := "%" + req.Search + "%"
		query = query.Where("username LIKE ? OR email LIKE ? OR name LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	// 获取总数
	var total int64
	query.Count(&total)

	// 分页查询
	var users []models.User
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&users).Error; err != nil {
		utils.InternalServerError(c, "获取用户列表失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{
		"data":      users,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// CreateUser 创建用户
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Name     string `json:"name"`
		RoleID   uint   `json:"role_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 检查用户名是否已存在
	var existingUser models.User
	if err := h.db.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, "用户名已存在")
		return
	}

	// 检查邮箱是否已存在
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.BadRequest(c, "邮箱已存在")
		return
	}

	// 加密密码
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.InternalServerError(c, "密码加密失败: "+err.Error())
		return
	}

	// 创建用户
	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		IsActive: true,
	}

	if err := h.db.Create(&user).Error; err != nil {
		utils.InternalServerError(c, "创建用户失败: "+err.Error())
		return
	}

	// 如果指定了角色，分配角色
	if req.RoleID > 0 {
		var role models.Role
		if err := h.db.First(&role, req.RoleID).Error; err != nil {
			utils.BadRequest(c, "角色不存在")
			return
		}

		userRole := models.UserRole{
			UserID: user.ID,
			RoleID: role.ID,
		}
		if err := h.db.Create(&userRole).Error; err != nil {
			utils.InternalServerError(c, "分配角色失败: "+err.Error())
			return
		}
	}

	// 重新加载用户数据（包含角色）
	h.db.Preload("UserRoles.Role").First(&user, user.ID)

	utils.Success(c, user)
}

// UpdateUser 更新用户
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	var user models.User
	if err := h.db.Preload("UserRoles.Role").First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "用户不存在")
		} else {
			utils.InternalServerError(c, "获取用户信息失败: "+err.Error())
		}
		return
	}

	var req struct {
		Username *string `json:"username"`
		Email    *string `json:"email"`
		Password string  `json:"password"`
		Name     *string `json:"name"`
		RoleID   *uint   `json:"role_id"` // 使用指针以区分0值和未提供
		IsActive *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Username != nil && *req.Username != user.Username {
		// 检查用户名是否已被其他用户使用
		var existingUser models.User
		if err := h.db.Where("username = ? AND id != ?", *req.Username, userID).First(&existingUser).Error; err == nil {
			utils.BadRequest(c, "用户名已存在")
			return
		}
		updates["username"] = *req.Username
	}

	if req.Email != nil && *req.Email != user.Email {
		// 检查邮箱是否已被其他用户使用
		var existingUser models.User
		if err := h.db.Where("email = ? AND id != ?", *req.Email, userID).First(&existingUser).Error; err == nil {
			utils.BadRequest(c, "邮箱已存在")
			return
		}
		updates["email"] = *req.Email
	}

	if req.Password != "" {
		// 加密新密码
		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			utils.InternalServerError(c, "密码加密失败: "+err.Error())
			return
		}
		updates["password"] = hashedPassword
	}

	if req.Name != nil {
		updates["name"] = *req.Name
	}

	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	// 更新用户基本信息
	if len(updates) > 0 {
		if err := h.db.Model(&user).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, "更新用户失败: "+err.Error())
			return
		}
	}

	// 更新角色（如果提供了 role_id）
	if req.RoleID != nil {
		// 删除现有角色
		h.db.Where("user_id = ?", user.ID).Delete(&models.UserRole{})

		// 如果 role_id > 0，添加新角色
		if *req.RoleID > 0 {
			var role models.Role
			if err := h.db.First(&role, *req.RoleID).Error; err != nil {
				utils.BadRequest(c, "角色不存在")
				return
			}

			userRole := models.UserRole{
				UserID: user.ID,
				RoleID: role.ID,
			}
			if err := h.db.Create(&userRole).Error; err != nil {
				utils.InternalServerError(c, "分配角色失败: "+err.Error())
				return
			}
		}
		// 如果 role_id == 0，则只删除角色，不添加新角色
	}

	// 重新加载用户数据（包含角色）
	h.db.Preload("UserRoles.Role").First(&user, user.ID)

	utils.Success(c, user)
}

// DeleteUser 删除用户
func (h *UserHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "用户不存在")
		} else {
			utils.InternalServerError(c, "获取用户信息失败: "+err.Error())
		}
		return
	}

	// 删除用户角色关联
	h.db.Where("user_id = ?", user.ID).Delete(&models.UserRole{})

	// 删除用户（软删除）
	if err := h.db.Delete(&user).Error; err != nil {
		utils.InternalServerError(c, "删除用户失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "删除成功"})
}
