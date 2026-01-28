package models

import (
	"time"

	"gorm.io/gorm"
)

// Authorization 授权模型
type Authorization struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID   uint   `gorm:"not null;index" json:"user_id"`   // 用户ID
	Resource string `gorm:"size:255;not null" json:"resource"` // 资源路径
	Action   string `gorm:"size:50;not null" json:"action"`   // 操作：GET, POST, PUT, DELETE, *
	Effect   string `gorm:"size:10;not null;default:'allow'" json:"effect"` // 效果：allow, deny
}

// SecurityPolicy 安全策略模型
type SecurityPolicy struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name        string `gorm:"size:100;not null" json:"name"`        // 策略名称
	Description string `gorm:"type:text" json:"description"`         // 策略描述
	PolicyType  string `gorm:"size:50;not null" json:"policy_type"`  // 策略类型：access, network, resource, security
	Rules       string `gorm:"type:text;not null" json:"rules"`      // 规则（JSON格式）
	Enabled     bool   `gorm:"default:true" json:"enabled"`          // 是否启用
}

// ConfigInspection 配置巡检模型
type ConfigInspection struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	CheckItem    string `gorm:"size:255;not null" json:"check_item"`    // 检查项
	ResourceType string `gorm:"size:100" json:"resource_type"`         // 资源类型
	ResourceName string `gorm:"size:255" json:"resource_name"`        // 资源名称
	Severity     string `gorm:"size:20;not null" json:"severity"`      // 严重程度：critical, high, medium, low, info
	Status       string `gorm:"size:20;not null" json:"status"`       // 状态：passed, failed
	Message      string `gorm:"type:text" json:"message"`              // 检查消息
}

// SecurityAlert 安全告警模型
type SecurityAlert struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	AlertType    string    `gorm:"size:100;not null" json:"alert_type"`    // 告警类型
	Severity     string    `gorm:"size:20;not null" json:"severity"`       // 严重程度：critical, high, medium, low
	Description  string    `gorm:"type:text" json:"description"`           // 描述
	Acknowledged bool      `gorm:"default:false" json:"acknowledged"`     // 是否已确认
	AcknowledgedAt *time.Time `json:"acknowledged_at"`                    // 确认时间
	AcknowledgedBy *uint      `json:"acknowledged_by"`                    // 确认人ID
}
