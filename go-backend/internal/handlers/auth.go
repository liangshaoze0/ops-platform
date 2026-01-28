package handlers

import (
	"time"

	"develops-ai/internal/config"
	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db     *gorm.DB
	config *config.Config
}

func NewAuthHandler(db *gorm.DB, cfg *config.Config) *AuthHandler {
	// 初始化JWT
	utils.InitJWT(cfg.JWT.Secret)

	return &AuthHandler{
		db:     db,
		config: cfg,
	}
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Register 用户注册
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
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
	if req.Email != "" {
		if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			utils.BadRequest(c, "邮箱已被注册")
			return
		}
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
		AvatarURL: "", // 默认头像，可以后续添加
	}

	if err := h.db.Create(&user).Error; err != nil {
		utils.InternalServerError(c, "创建用户失败: "+err.Error())
		return
	}

	// 生成JWT token
	jwtToken, err := utils.GenerateToken(user.ID, user.Username, h.config.JWT.Expiration)
	if err != nil {
		utils.InternalServerError(c, "生成token失败: "+err.Error())
		return
	}

	// 创建会话
	session := models.Session{
		UserID:    user.ID,
		Token:     jwtToken,
		ExpiresAt: time.Now().Add(time.Duration(h.config.JWT.Expiration) * time.Hour),
		UserAgent: c.GetHeader("User-Agent"),
		IPAddress: c.ClientIP(),
	}
	if err := h.db.Create(&session).Error; err != nil {
		utils.InternalServerError(c, "创建会话失败: "+err.Error())
		return
	}

	// 为新用户分配默认角色（user）
	var userRole models.Role
	if err := h.db.Where("name = ?", "user").First(&userRole).Error; err == nil {
		userRoleRelation := models.UserRole{
			UserID: user.ID,
			RoleID: userRole.ID,
		}
		h.db.Create(&userRoleRelation)
	}

	// 记录审计日志
	go utils.LogRegister(h.db, user.ID, user.Username, c.ClientIP(), c.GetHeader("User-Agent"))

	// 返回用户信息和token
	utils.Success(c, gin.H{
		"user":  user,
		"token": jwtToken,
	})
}

// Login 用户登录
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 查找用户（支持用户名或邮箱登录）
	var user models.User
	result := h.db.Where("username = ? OR email = ?", req.Username, req.Username).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		utils.Unauthorized(c, "用户名或密码错误")
		return
	} else if result.Error != nil {
		utils.InternalServerError(c, "查询用户失败: "+result.Error.Error())
		return
	}

	// 检查用户是否激活
	if !user.IsActive {
		utils.Unauthorized(c, "用户账号已被禁用")
		return
	}

	// 验证密码
	if !utils.CheckPassword(req.Password, user.Password) {
		// 如果密码验证失败，检查密码哈希是否有效
		if len(user.Password) == 0 {
			utils.InternalServerError(c, "用户密码未设置，请联系管理员")
			return
		}
		utils.Unauthorized(c, "用户名或密码错误")
		return
	}

	// 生成JWT token
	jwtToken, err := utils.GenerateToken(user.ID, user.Username, h.config.JWT.Expiration)
	if err != nil {
		utils.InternalServerError(c, "生成token失败: "+err.Error())
		return
	}

	// 创建会话
	session := models.Session{
		UserID:    user.ID,
		Token:     jwtToken,
		ExpiresAt: time.Now().Add(time.Duration(h.config.JWT.Expiration) * time.Hour),
		UserAgent: c.GetHeader("User-Agent"),
		IPAddress: c.ClientIP(),
	}
	if err := h.db.Create(&session).Error; err != nil {
		utils.InternalServerError(c, "创建会话失败: "+err.Error())
		return
	}

	// 记录审计日志
	go utils.LogLogin(h.db, user.ID, user.Username, c.ClientIP(), c.GetHeader("User-Agent"))

	// 返回用户信息和token
	utils.Success(c, gin.H{
		"user":  user,
		"token": jwtToken,
	})
}

// GetCurrentUser 获取当前用户信息
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	utils.Success(c, user)
}

// Logout 登出
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := authHeader[len("Bearer "):]
		// 删除会话
		h.db.Where("token = ?", parts).Delete(&models.Session{})
	}

	// 记录审计日志
	if userID != nil && username != nil {
		go utils.LogLogout(h.db, userID.(uint), username.(string), c.ClientIP(), c.GetHeader("User-Agent"))
	}

	utils.SuccessWithMessage(c, "登出成功", nil)
}
