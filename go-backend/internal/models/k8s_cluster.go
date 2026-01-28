package models

import (
	"time"

	"gorm.io/gorm"
)

// K8sCluster K8s集群模型
type K8sCluster struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID uint `gorm:"not null;index" json:"user_id"` // 创建者用户ID

	Name        string `gorm:"size:255;not null" json:"name"`                    // 集群名称
	Type        string `gorm:"size:50;not null" json:"type"`                    // 集群类型：local, aliyun, tencent, mobile
	Description string `gorm:"type:text" json:"description"`                   // 集群描述
	ApiServer   string `gorm:"size:512;not null" json:"api_server"`            // K8s API Server地址
	Config      string `gorm:"type:text;not null" json:"config"`               // Kubeconfig内容（加密存储）
	IsActive    bool   `gorm:"default:true" json:"is_active"`                  // 是否激活
	Status      string `gorm:"size:50;default:'unknown'" json:"status"`        // 连接状态：connected, disconnected, error, unknown
	LastCheckAt *time.Time `json:"last_check_at"`                             // 最后检查时间

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
