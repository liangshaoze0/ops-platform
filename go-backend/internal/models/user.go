package models

import (
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Username string `gorm:"size:255;uniqueIndex;not null" json:"username"`
	Email    string `gorm:"size:255;uniqueIndex" json:"email"`
	Password string `gorm:"size:255;not null" json:"-"` // bcrypt哈希，60字符足够
	Name     string `gorm:"size:255" json:"name"`
	AvatarURL string `gorm:"size:512" json:"avatar_url"`
	Bio      string `gorm:"type:text" json:"bio"`
	IsActive bool   `gorm:"default:true" json:"is_active"` // 是否激活

	// 关联关系
	UserRoles []UserRole `gorm:"foreignKey:UserID" json:"user_roles,omitempty"`
}

// Session 会话模型
type Session struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Token     string    `gorm:"size:255;uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expires_at"`
	UserAgent string    `gorm:"size:512" json:"user_agent"`
	IPAddress string    `gorm:"size:45" json:"ip_address"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// AIImage AI生成的图片模型
type AIImage struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID      uint   `gorm:"not null;index" json:"user_id"`
	Type        string `gorm:"size:50;not null" json:"type"` // background, avatar, etc.
	Prompt      string `gorm:"type:text" json:"prompt"`
	ImageURL    string `gorm:"type:text;not null" json:"image_url"`
	ThumbnailURL string `gorm:"type:text" json:"thumbnail_url"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
