package models

import (
	"time"

	"gorm.io/gorm"
)

// Role 角色模型
type Role struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name        string `gorm:"size:100;uniqueIndex;not null" json:"name"`        // 角色名称：admin, user等
	DisplayName string `gorm:"size:100;not null" json:"display_name"`            // 显示名称
	Description string `gorm:"type:text" json:"description"`                    // 角色描述
	Permissions string `gorm:"type:text" json:"permissions"`                    // 权限列表，JSON格式
	IsSystem    bool   `gorm:"default:false" json:"is_system"`                  // 是否为系统角色

	// 关联关系
	UserRoles []UserRole `gorm:"foreignKey:RoleID" json:"user_roles,omitempty"`
}

// UserRole 用户角色关联表
type UserRole struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID uint `gorm:"not null;uniqueIndex:idx_user_role" json:"user_id"`
	RoleID uint `gorm:"not null;uniqueIndex:idx_user_role" json:"role_id"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Role Role `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

// AuditLog 审计日志模型
type AuditLog struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID    uint   `gorm:"index" json:"user_id"`                              // 操作用户ID，0表示系统操作
	Username  string `gorm:"size:255;index" json:"username"`                     // 操作用户名
	Action    string `gorm:"size:100;not null;index" json:"action"`              // 操作类型：login, logout, create, update, delete等
	Resource  string `gorm:"size:100;index" json:"resource"`                    // 资源类型：user, role, ai_image等
	ResourceID uint  `gorm:"index" json:"resource_id"`                           // 资源ID
	Method    string `gorm:"size:10" json:"method"`                             // HTTP方法：GET, POST, PUT, DELETE
	Path      string `gorm:"size:255" json:"path"`                              // 请求路径
	IPAddress string `gorm:"size:45;index" json:"ip_address"`                   // IP地址
	UserAgent string `gorm:"size:512" json:"user_agent"`                        // 用户代理
	Request   string `gorm:"type:text" json:"request"`                          // 请求内容（JSON）
	Response  string `gorm:"type:text" json:"response"`                         // 响应内容（JSON）
	Status    int    `gorm:"index" json:"status"`                                // HTTP状态码
	Message   string `gorm:"type:text" json:"message"`                           // 操作结果消息
}
