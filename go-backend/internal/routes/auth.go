package routes

import (
	"develops-ai/internal/config"
	"develops-ai/internal/handlers"
	"develops-ai/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	// 初始化处理器
	authHandler := handlers.NewAuthHandler(db, cfg)
	aiImageHandler := handlers.NewAIImageHandler(db)
	userHandler := handlers.NewUserHandler(db)
	roleHandler := handlers.NewRoleHandler(db)

	// API路由组
	api := r.Group("/api")
	{
		// 认证路由（不需要认证）
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// 需要认证的路由
		authenticated := api.Group("")
		authenticated.Use(middleware.AuthMiddleware())
		{
			// 用户相关
			authenticated.GET("/user", authHandler.GetCurrentUser)
			authenticated.POST("/logout", authHandler.Logout)

			// AI图片相关
			ai := authenticated.Group("/ai")
			{
				ai.POST("/background", aiImageHandler.GenerateBackground)
				ai.POST("/background/set", aiImageHandler.SetActiveBackground)
				ai.GET("/images", aiImageHandler.GetUserImages)
				ai.GET("/background/active", aiImageHandler.GetActiveBackground)
			}

			// 用户管理（管理员）
			users := authenticated.Group("/users")
			users.Use(middleware.RequireRole(db, "admin"))
			{
				users.GET("", userHandler.GetUsers)
				users.POST("", userHandler.CreateUser)
				users.PUT("/:id", userHandler.UpdateUser)
				users.DELETE("/:id", userHandler.DeleteUser)
			}

			// 角色管理（管理员）
			roles := authenticated.Group("/roles")
			roles.Use(middleware.RequireRole(db, "admin"))
			{
				roles.GET("", roleHandler.GetRoles)
			}

			// 用户偏好设置
			preferenceHandler := handlers.NewPreferenceHandler(db)
			preference := authenticated.Group("/preference")
			{
				preference.GET("", preferenceHandler.GetPreference)
				preference.PUT("", preferenceHandler.UpdatePreference)
			}

			// 审计日志相关（管理员）
			auditHandler := handlers.NewAuditHandler(db)
			audit := authenticated.Group("/audit")
			audit.Use(middleware.RequireRole(db, "admin"))
			{
				audit.GET("/logs", auditHandler.GetAuditLogs)
				audit.GET("/logs/:id", auditHandler.GetAuditLog)
			}

			// 安全管理相关（管理员）
			securityHandler := handlers.NewSecurityHandler(db)
			security := authenticated.Group("/security")
			security.Use(middleware.RequireRole(db, "admin"))
			{
				// 授权管理
				authorizations := security.Group("/authorizations")
				{
					authorizations.GET("", securityHandler.GetAuthorizations)
					authorizations.POST("", securityHandler.CreateAuthorization)
					authorizations.DELETE("/:id", securityHandler.DeleteAuthorization)
				}

				// 策略管理
				policies := security.Group("/policies")
				{
					policies.GET("", securityHandler.GetPolicies)
					policies.POST("", securityHandler.CreatePolicy)
					policies.PUT("/:id", securityHandler.UpdatePolicy)
					policies.DELETE("/:id", securityHandler.DeletePolicy)
				}

				// 配置巡检
				inspections := security.Group("/inspections")
				{
					inspections.GET("", securityHandler.GetInspections)
					inspections.POST("/run", securityHandler.RunInspection)
				}

				// 安全监控
				monitoring := security.Group("/monitoring")
				{
					monitoring.GET("/alerts", securityHandler.GetSecurityAlerts)
					monitoring.GET("/stats", securityHandler.GetSecurityStats)
					monitoring.PUT("/alerts/:id/acknowledge", securityHandler.AcknowledgeAlert)
				}
			}

			// K8s集群管理
			k8sHandler := handlers.NewK8sHandler(db)
			k8s := authenticated.Group("/k8s")
			{
				k8s.GET("/clusters", k8sHandler.GetClusters)
				k8s.POST("/clusters", k8sHandler.CreateCluster)
				k8s.GET("/clusters/:id", k8sHandler.GetCluster)
				k8s.PUT("/clusters/:id", k8sHandler.UpdateCluster)
				k8s.DELETE("/clusters/:id", k8sHandler.DeleteCluster)
				k8s.POST("/clusters/:id/test", k8sHandler.TestConnection)
				k8s.GET("/clusters/:id/info", k8sHandler.GetClusterInfo)
				k8s.GET("/clusters/:id/nodes", k8sHandler.GetNodes)
				k8s.GET("/clusters/:id/nodes/:nodeName", k8sHandler.GetNode)
				k8s.GET("/clusters/:id/namespaces", k8sHandler.GetNamespaces)
				k8s.POST("/clusters/:id/namespaces", k8sHandler.CreateNamespace)
				k8s.GET("/clusters/:id/namespaces/:namespace", k8sHandler.GetNamespace)
				k8s.PUT("/clusters/:id/namespaces/:namespace", k8sHandler.UpdateNamespace)
				k8s.DELETE("/clusters/:id/namespaces/:namespace", k8sHandler.DeleteNamespace)
				k8s.GET("/clusters/:id/namespaces/:namespace/yaml", k8sHandler.GetNamespaceYAML)
				k8s.PUT("/clusters/:id/namespaces/:namespace/yaml", k8sHandler.UpdateNamespaceYAML)
				k8s.GET("/clusters/:id/pods", k8sHandler.GetPods)
				k8s.GET("/clusters/:id/namespaces/:namespace/pods/:podName", k8sHandler.GetPodDetail)
				k8s.GET("/clusters/:id/namespaces/:namespace/pods/:podName/yaml", k8sHandler.GetPodYAML)
				k8s.PUT("/clusters/:id/namespaces/:namespace/pods/:podName/yaml", k8sHandler.UpdatePodYAML)
				k8s.GET("/clusters/:id/namespaces/:namespace/pods/:podName/logs", k8sHandler.GetPodLogs)
				k8s.DELETE("/clusters/:id/namespaces/:namespace/pods/:podName", k8sHandler.DeletePodHandler)
				k8s.PUT("/clusters/:id/namespaces/:namespace/pods/:podName/labels", k8sHandler.UpdatePodLabels)
				k8s.PUT("/clusters/:id/namespaces/:namespace/pods/:podName/annotations", k8sHandler.UpdatePodAnnotations)
				k8s.POST("/clusters/:id/namespaces/:namespace/pods/:podName/restart", k8sHandler.RestartPod)
				k8s.GET("/clusters/:id/services", k8sHandler.GetServices)
				k8s.GET("/clusters/:id/configmaps", k8sHandler.GetConfigMaps)
				k8s.GET("/clusters/:id/secrets", k8sHandler.GetSecrets)
				k8s.GET("/clusters/:id/pvcs", k8sHandler.GetPVCs)
				k8s.GET("/clusters/:id/deployments", k8sHandler.GetDeployments)
				k8s.POST("/clusters/:id/deployments", k8sHandler.CreateDeployment)
				// 将更具体的路由放在通用路由之前，确保正确匹配
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/cost", k8sHandler.GetDeploymentCost)
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/pods", k8sHandler.GetDeploymentPods)
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/hpa", k8sHandler.GetDeploymentHPA)
				k8s.DELETE("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/hpa/:hpaName", k8sHandler.DeleteDeploymentHPA)
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/cronhpa", k8sHandler.GetDeploymentCronHPA)
				k8s.DELETE("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/cronhpa/:cronHpaName", k8sHandler.DeleteDeploymentCronHPA)
				k8s.GET("/clusters/:id/cronhpa/status", k8sHandler.GetCronHPAStatus)
				k8s.POST("/clusters/:id/cronhpa/install", k8sHandler.InstallCronHPA)
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/history", k8sHandler.GetDeploymentHistory)
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/history/:revision", k8sHandler.GetDeploymentHistoryRevision)
				k8s.POST("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/rollback", k8sHandler.RollbackDeployment)
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/yaml", k8sHandler.GetDeploymentYAML)
				k8s.PUT("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/yaml", k8sHandler.UpdateDeploymentYAML)
				k8s.PUT("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/scale", k8sHandler.ScaleDeployment)
				k8s.POST("/clusters/:id/namespaces/:namespace/deployments/:deploymentName/redeploy", k8sHandler.RedeployDeployment)
				k8s.DELETE("/clusters/:id/namespaces/:namespace/deployments/:deploymentName", k8sHandler.DeleteDeployment)
				k8s.PUT("/clusters/:id/namespaces/:namespace/deployments/:deploymentName", k8sHandler.UpdateDeployment)
				k8s.GET("/clusters/:id/namespaces/:namespace/deployments/:deploymentName", k8sHandler.GetDeploymentDetail)
				k8s.GET("/clusters/:id/statefulsets", k8sHandler.GetStatefulSets)
				k8s.GET("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName", k8sHandler.GetStatefulSetDetail)
				k8s.PUT("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName", k8sHandler.UpdateStatefulSet)
				k8s.PUT("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName/scale", k8sHandler.ScaleStatefulSet)
				k8s.GET("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName/yaml", k8sHandler.GetStatefulSetYAML)
				k8s.PUT("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName/yaml", k8sHandler.UpdateStatefulSetYAML)
				k8s.POST("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName/redeploy", k8sHandler.RedeployStatefulSet)
				k8s.DELETE("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName", k8sHandler.DeleteStatefulSet)
				k8s.GET("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName/pods", k8sHandler.GetStatefulSetPods)
				k8s.GET("/clusters/:id/namespaces/:namespace/statefulsets/:statefulSetName/cost", k8sHandler.GetStatefulSetCost)
				k8s.GET("/clusters/:id/daemonsets", k8sHandler.GetDaemonSets)
				k8s.GET("/clusters/:id/jobs", k8sHandler.GetJobs)
				k8s.GET("/clusters/:id/cronjobs", k8sHandler.GetCronJobs)
				k8s.POST("/clusters/:id/workloads/create", k8sHandler.CreateWorkloadFromYAML)
			}
		}
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 调试接口（仅开发环境）
	if cfg.Environment == "development" {
		debugHandler := handlers.DebugCheckAdmin(db)
		r.GET("/debug/admin", debugHandler)
	}
}
