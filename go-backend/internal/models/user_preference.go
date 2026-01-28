package models

import (
	"time"

	"gorm.io/gorm"
)

// UserPreference 用户偏好设置模型
type UserPreference struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID uint `gorm:"not null;uniqueIndex" json:"user_id"` // 每个用户只有一条偏好设置记录

	Language string `gorm:"size:10;default:'zh-CN'" json:"language"` // 语言：zh-CN, en-US等
	Theme    string `gorm:"size:20;default:'light'" json:"theme"`    // 主题：light, dark, auto
	Unit     string `gorm:"size:20;default:'metric'" json:"unit"`     // 单位：metric(公制), imperial(英制)

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
