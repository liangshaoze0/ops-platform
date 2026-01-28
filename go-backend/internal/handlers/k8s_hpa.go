package handlers

import (
	"context"
	"fmt"
	"time"

	"develops-ai/internal/models"
	"develops-ai/internal/utils"
	"develops-ai/pkg/k8s"

	"github.com/gin-gonic/gin"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// GetDeploymentHPA 获取Deployment的HPA列表
func (h *K8sHandler) GetDeploymentHPA(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	// 获取集群配置
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()

	// 获取HPA列表（通过autoscaling API）
	// 注意：需要使用autoscaling/v2 API
	autoscalingClient := client.GetAutoscalingV2Client()
	if autoscalingClient == nil {
		utils.InternalServerError(c, "无法创建autoscaling客户端")
		return
	}

	hpaList, err := autoscalingClient.HorizontalPodAutoscalers(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		// 如果API不存在，返回空列表
		if apierrors.IsNotFound(err) {
			utils.Success(c, []interface{}{})
			return
		}
		utils.InternalServerError(c, "获取HPA列表失败: "+err.Error())
		return
	}

	var result []map[string]interface{}
	for _, hpa := range hpaList.Items {
		// 检查HPA是否关联到指定的Deployment
		if hpa.Spec.ScaleTargetRef.Kind == "Deployment" && hpa.Spec.ScaleTargetRef.Name == deploymentName {
			hpaInfo := map[string]interface{}{
				"name":            hpa.Name,
				"namespace":       hpa.Namespace,
				"minReplicas":     *hpa.Spec.MinReplicas,
				"maxReplicas":    hpa.Spec.MaxReplicas,
				"currentReplicas": hpa.Status.CurrentReplicas,
				"created_at":     hpa.CreationTimestamp.Time,
			}

			// 获取目标使用率和当前使用率
			if len(hpa.Spec.Metrics) > 0 {
				for _, metric := range hpa.Spec.Metrics {
					if metric.Type == autoscalingv2.ResourceMetricSourceType && metric.Resource != nil {
						if metric.Resource.Name == "cpu" {
							if metric.Resource.Target.AverageUtilization != nil {
								hpaInfo["targetUsage"] = *metric.Resource.Target.AverageUtilization
							}
						}
					}
				}
			}

			// 获取当前使用率（从HPA状态中）
			if len(hpa.Status.CurrentMetrics) > 0 {
				for _, metric := range hpa.Status.CurrentMetrics {
					if metric.Type == autoscalingv2.ResourceMetricSourceType && metric.Resource != nil {
						if metric.Resource.Name == "cpu" && metric.Resource.Current.AverageUtilization != nil {
							hpaInfo["currentUsage"] = *metric.Resource.Current.AverageUtilization
						}
					}
				}
			}

			// 设置默认值
			if hpaInfo["targetUsage"] == nil {
				hpaInfo["targetUsage"] = 80
			}
			if hpaInfo["currentUsage"] == nil {
				hpaInfo["currentUsage"] = 0
			}

			result = append(result, hpaInfo)
		}
	}

	utils.Success(c, result)
}

// GetDeploymentCronHPA 获取Deployment的CronHPA列表
func (h *K8sHandler) GetDeploymentCronHPA(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	// 获取集群配置
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()

	// CronHPA通常是通过CRD实现的，需要使用dynamic client
	// 这里使用unstructured来获取CronHPA资源
	gvr := schema.GroupVersionResource{
		Group:    "autoscaling.alibabacloud.com",
		Version:  "v1beta1",
		Resource: "cronhorizontalpodautoscalers",
	}

	cronHpaList, err := client.GetDynamicClient().Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("app=%s", deploymentName),
	})
	if err != nil {
		// 如果资源不存在或API不存在，返回空列表
		if apierrors.IsNotFound(err) {
			utils.Success(c, []interface{}{})
			return
		}
		utils.InternalServerError(c, "获取CronHPA列表失败: "+err.Error())
		return
	}

	var result []map[string]interface{}
	for _, item := range cronHpaList.Items {
		// 检查CronHPA是否关联到指定的Deployment
		spec, found, _ := unstructured.NestedMap(item.Object, "spec")
		if found {
			scaleTargetRef, _ := spec["scaleTargetRef"].(map[string]interface{})
			if scaleTargetRef != nil {
				kind, _ := scaleTargetRef["kind"].(string)
				name, _ := scaleTargetRef["name"].(string)
				if kind == "Deployment" && name == deploymentName {
					cronHpaInfo := map[string]interface{}{
						"name":         item.GetName(),
						"namespace":    item.GetNamespace(),
						"status":        "Active", // 默认状态
						"targetReplicas": 0,
						"created_at":   item.GetCreationTimestamp().Time,
					}

					// 获取任务名称和调度周期
					if schedules, found, _ := unstructured.NestedSlice(spec, "schedules"); found && len(schedules) > 0 {
						if schedule, ok := schedules[0].(map[string]interface{}); ok {
							cronHpaInfo["taskName"] = schedule["name"]
							cronHpaInfo["schedule"] = schedule["schedule"]
							if targetReplicas, ok := schedule["targetReplicas"].(int64); ok {
								cronHpaInfo["targetReplicas"] = targetReplicas
							}
						}
					}

					// 获取状态和最近调度时间
					status, found, _ := unstructured.NestedMap(item.Object, "status")
					if found {
						if lastScheduleTime, ok := status["lastScheduleTime"].(string); ok {
							if t, err := time.Parse(time.RFC3339, lastScheduleTime); err == nil {
								cronHpaInfo["lastScheduled"] = t
							}
						}
						if conditions, found, _ := unstructured.NestedSlice(status, "conditions"); found && len(conditions) > 0 {
							if condition, ok := conditions[0].(map[string]interface{}); ok {
								if statusStr, ok := condition["status"].(string); ok {
									cronHpaInfo["status"] = statusStr
								}
							}
						}
					}

					result = append(result, cronHpaInfo)
				}
			}
		}
	}

	utils.Success(c, result)
}

// GetCronHPAStatus 检查CronHPA组件是否安装
func (h *K8sHandler) GetCronHPAStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")

	// 获取集群配置
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()

	// 检查CronHPA CRD是否存在
	gvr := schema.GroupVersionResource{
		Group:    "apiextensions.k8s.io",
		Version:  "v1",
		Resource: "customresourcedefinitions",
	}

	_, err = client.GetDynamicClient().Resource(gvr).Get(ctx, "cronhorizontalpodautoscalers.autoscaling.alibabacloud.com", metav1.GetOptions{})
	installed := err == nil

	utils.Success(c, map[string]interface{}{
		"installed": installed,
	})
}

// InstallCronHPA 安装CronHPA组件
func (h *K8sHandler) InstallCronHPA(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")

	// 获取集群配置
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	// 这里应该实现实际的安装逻辑
	// 由于CronHPA的安装通常需要部署operator和CRD，这里只是示例
	utils.Success(c, map[string]interface{}{
		"message": "CronHPA组件安装功能待实现",
	})
}

// DeleteDeploymentHPA 删除HPA
func (h *K8sHandler) DeleteDeploymentHPA(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	hpaName := c.Param("hpaName")

	// 获取集群配置
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()

	autoscalingClient := client.GetAutoscalingV2Client()
	if autoscalingClient == nil {
		utils.InternalServerError(c, "无法创建autoscaling客户端")
		return
	}

	err = autoscalingClient.HorizontalPodAutoscalers(namespace).Delete(ctx, hpaName, metav1.DeleteOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "HPA不存在")
			return
		}
		utils.InternalServerError(c, "删除HPA失败: "+err.Error())
		return
	}

	utils.Success(c, map[string]interface{}{
		"message": "HPA删除成功",
	})
}

// DeleteDeploymentCronHPA 删除CronHPA
func (h *K8sHandler) DeleteDeploymentCronHPA(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	cronHpaName := c.Param("cronHpaName")

	// 获取集群配置
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()

	gvr := schema.GroupVersionResource{
		Group:    "autoscaling.alibabacloud.com",
		Version:  "v1beta1",
		Resource: "cronhorizontalpodautoscalers",
	}

	err = client.GetDynamicClient().Resource(gvr).Namespace(namespace).Delete(ctx, cronHpaName, metav1.DeleteOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "CronHPA不存在")
			return
		}
		utils.InternalServerError(c, "删除CronHPA失败: "+err.Error())
		return
	}

	utils.Success(c, map[string]interface{}{
		"message": "CronHPA删除成功",
	})
}
