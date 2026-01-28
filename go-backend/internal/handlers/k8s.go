package handlers

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"develops-ai/internal/models"
	"develops-ai/internal/utils"
	"develops-ai/pkg/k8s"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// paginateSlice 对切片进行内存分页
func paginateSlice(data []map[string]interface{}, page, pageSize int) ([]map[string]interface{}, int64) {
	total := int64(len(data))
	start := (page - 1) * pageSize
	end := start + pageSize
	
	if start > len(data) {
		return []map[string]interface{}{}, total
	} else if end > len(data) {
		return data[start:], total
	} else {
		return data[start:end], total
	}
}

type K8sHandler struct {
	db *gorm.DB
}

func NewK8sHandler(db *gorm.DB) *K8sHandler {
	return &K8sHandler{db: db}
}

// GetClusters 获取当前用户的K8s集群列表（支持分页）
func (h *K8sHandler) GetClusters(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

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
	query := h.db.Model(&models.K8sCluster{}).Where("user_id = ?", userID)

	// 搜索功能
	if req.Search != "" {
		searchPattern := "%" + req.Search + "%"
		query = query.Where("name LIKE ? OR description LIKE ? OR api_server LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	// 获取总数
	var total int64
	query.Count(&total)

	// 分页查询
	var clusters []models.K8sCluster
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&clusters).Error; err != nil {
		utils.InternalServerError(c, "获取集群列表失败: "+err.Error())
		return
	}

	// 隐藏敏感信息（config字段）
	for i := range clusters {
		clusters[i].Config = ""
	}

	utils.Success(c, gin.H{
		"data":      clusters,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// GetCluster 获取单个集群详情
func (h *K8sHandler) GetCluster(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 隐藏敏感信息
	cluster.Config = ""

	utils.Success(c, cluster)
}

// CreateCluster 创建K8s集群
func (h *K8sHandler) CreateCluster(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Description string `json:"description"`
		ApiServer   string `json:"api_server" binding:"required"`
		Config      string `json:"config" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 验证集群类型
	validTypes := map[string]bool{
		"local":   true,
		"aliyun":  true,
		"tencent": true,
		"mobile":  true,
	}
	if !validTypes[req.Type] {
		utils.BadRequest(c, "无效的集群类型")
		return
	}

	cluster := models.K8sCluster{
		UserID:      userID.(uint),
		Name:        req.Name,
		Type:        req.Type,
		Description: req.Description, // 允许为空
		ApiServer:   req.ApiServer,
		Config:      req.Config, // TODO: 加密存储
		IsActive:    true,
		Status:      "unknown",
	}

	if err := h.db.Create(&cluster).Error; err != nil {
		// 提供更详细的错误信息
		errorMsg := "创建集群失败: " + err.Error()
		utils.InternalServerError(c, errorMsg)
		return
	}

	// 隐藏敏感信息
	cluster.Config = ""

	utils.Success(c, cluster)
}

// UpdateCluster 更新K8s集群
func (h *K8sHandler) UpdateCluster(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	var req struct {
		Name        string `json:"name"`
		Type        string `json:"type"`
		Description string `json:"description"`
		ApiServer   string `json:"api_server"`
		Config      string `json:"config"`
		IsActive    *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Type != "" {
		// 验证集群类型
		validTypes := map[string]bool{
			"local":   true,
			"aliyun":  true,
			"tencent": true,
			"mobile":  true,
		}
		if !validTypes[req.Type] {
			utils.BadRequest(c, "无效的集群类型")
			return
		}
		updates["type"] = req.Type
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.ApiServer != "" {
		updates["api_server"] = req.ApiServer
	}
	if req.Config != "" {
		updates["config"] = req.Config // TODO: 加密存储
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		if err := h.db.Model(&cluster).Updates(updates).Error; err != nil {
			utils.InternalServerError(c, "更新集群失败: "+err.Error())
			return
		}
	}

	// 重新加载数据
	h.db.First(&cluster, cluster.ID)

	// 隐藏敏感信息
	cluster.Config = ""

	utils.Success(c, cluster)
}

// DeleteCluster 删除K8s集群
func (h *K8sHandler) DeleteCluster(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	if err := h.db.Delete(&cluster).Error; err != nil {
		utils.InternalServerError(c, "删除集群失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "删除成功"})
}

// TestConnection 测试集群连接
func (h *K8sHandler) TestConnection(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端并测试连接
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		h.db.Model(&cluster).Updates(map[string]interface{}{
			"status":       "error",
			"last_check_at": gorm.Expr("NOW()"),
		})
		utils.BadRequest(c, "连接失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := client.TestConnection(ctx); err != nil {
		h.db.Model(&cluster).Updates(map[string]interface{}{
			"status":       "error",
			"last_check_at": gorm.Expr("NOW()"),
		})
		utils.BadRequest(c, "连接测试失败: "+err.Error())
		return
	}

	// 更新集群状态
	h.db.Model(&cluster).Updates(map[string]interface{}{
		"status":       "connected",
		"last_check_at": gorm.Expr("NOW()"),
	})

	utils.Success(c, gin.H{
		"status":  "connected",
		"message": "连接成功",
	})
}

// GetClusterInfo 获取集群信息
func (h *K8sHandler) GetClusterInfo(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	info, err := client.GetClusterInfo(ctx)
	if err != nil {
		utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		return
	}

	// 添加集群基本信息
	info["name"] = cluster.Name
	info["type"] = cluster.Type
	info["api_server"] = cluster.ApiServer
	info["status"] = cluster.Status

	utils.Success(c, info)
}

// GetNodes 获取节点列表（支持分页）
func (h *K8sHandler) GetNodes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
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

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	nodes, err := client.GetNodes(ctx)
	if err != nil {
		utils.InternalServerError(c, "获取节点列表失败: "+err.Error())
		return
	}

	// 转换为简化的节点信息
	var nodeList []map[string]interface{}
	for _, node := range nodes {
		nodeInfo := map[string]interface{}{
			"name":       node.Name,
			"status":     getNodeStatus(&node),
			"roles":      getNodeRoles(&node),
			"version":    node.Status.NodeInfo.KubeletVersion,
			"os":         node.Status.NodeInfo.OperatingSystem,
			"arch":       node.Status.NodeInfo.Architecture,
			"cpu":        node.Status.Capacity.Cpu().String(),
			"memory":     node.Status.Capacity.Memory().String(),
			"pods":       node.Status.Capacity.Pods().String(),
			"created_at": node.CreationTimestamp.Time,
		}
		nodeList = append(nodeList, nodeInfo)
	}

	// 内存分页
	total := int64(len(nodeList))
	start := (req.Page - 1) * req.PageSize
	end := start + req.PageSize
	if start > len(nodeList) {
		nodeList = []map[string]interface{}{}
	} else if end > len(nodeList) {
		nodeList = nodeList[start:]
	} else {
		nodeList = nodeList[start:end]
	}

	utils.Success(c, gin.H{
		"data":      nodeList,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// GetNode 获取单个节点详情
func (h *K8sHandler) GetNode(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	nodeName := c.Param("nodeName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	node, err := client.GetNode(ctx, nodeName)
	if err != nil {
		utils.NotFound(c, "节点不存在: "+err.Error())
		return
	}

	utils.Success(c, node)
}

// GetNamespaces 获取命名空间列表
func (h *K8sHandler) GetNamespaces(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	namespaces, err := client.GetNamespaces(ctx)
	if err != nil {
		utils.InternalServerError(c, "获取命名空间列表失败: "+err.Error())
		return
	}

	// 转换为简化的命名空间信息
	var nsList []map[string]interface{}
	for _, ns := range namespaces {
		nsInfo := map[string]interface{}{
			"name":        ns.Name,
			"status":      string(ns.Status.Phase),
			"created_at":  ns.CreationTimestamp.Time,
			"labels":      ns.Labels,
			"annotations": ns.Annotations,
		}
		nsList = append(nsList, nsInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(nsList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, nsList)
	}
}

// GetNamespace 获取单个命名空间详情
func (h *K8sHandler) GetNamespace(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	namespaceObj, err := client.GetNamespace(ctx, namespace)
	if err != nil {
		utils.NotFound(c, "命名空间不存在: "+err.Error())
		return
	}

	utils.Success(c, namespaceObj)
}

// 辅助函数：获取节点状态
func getNodeStatus(node *corev1.Node) string {
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			if condition.Status == corev1.ConditionTrue {
				return "Ready"
			}
			return "NotReady"
		}
	}
	return "Unknown"
}

// GetPods 获取指定命名空间的Pod列表（支持分页）
func (h *K8sHandler) GetPods(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	var req struct {
		Page      int    `form:"page" binding:"omitempty,min=1"`
		PageSize  int    `form:"page_size" binding:"omitempty,min=1,max=100"`
		Namespace string `form:"namespace"`
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

	clusterID := c.Param("id")
	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	pods, err := client.GetPods(ctx, req.Namespace)
	if err != nil {
		utils.InternalServerError(c, "获取Pod列表失败: "+err.Error())
		return
	}

	// 转换为简化的Pod信息
	var podList []map[string]interface{}
	for _, pod := range pods {
		// 获取容器镜像列表
		images := make([]string, 0)
		for _, container := range pod.Spec.Containers {
			images = append(images, container.Image)
		}
		
		// 获取更新时间（使用StartTime或CreationTimestamp）
		updatedAt := pod.CreationTimestamp.Time
		if pod.Status.StartTime != nil {
			updatedAt = pod.Status.StartTime.Time
		}

		// 获取节点IP（如果节点名称存在，尝试获取节点信息）
		nodeIP := ""
		nodeInternalIP := ""
		nodeExternalIP := ""
		if pod.Spec.NodeName != "" {
			node, err := client.GetNode(ctx, pod.Spec.NodeName)
			if err == nil {
				for _, addr := range node.Status.Addresses {
					switch addr.Type {
					case corev1.NodeInternalIP:
						nodeInternalIP = addr.Address
					case corev1.NodeExternalIP:
						nodeExternalIP = addr.Address
					}
				}
				// 优先使用内部IP，如果没有则使用外部IP
				if nodeInternalIP != "" {
					nodeIP = nodeInternalIP
				} else if nodeExternalIP != "" {
					nodeIP = nodeExternalIP
				}
			}
		}

		// 计算CPU和内存使用（从资源请求中获取，实际使用需要metrics server）
		var cpuRequest float64
		var memoryRequest int64
		for _, container := range pod.Spec.Containers {
			if container.Resources.Requests != nil {
				if cpuReq, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
					cpuRequest += float64(cpuReq.MilliValue()) / 1000.0
				}
				if memReq, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
					memoryRequest += memReq.Value()
				}
			}
		}

		// 安全处理Pod信息
		podInfo := map[string]interface{}{
			"name":         pod.Name,
			"namespace":    pod.Namespace,
			"status":       string(pod.Status.Phase),
			"node":         pod.Spec.NodeName,
			"nodeIP":       nodeIP,
			"nodeInternalIP": nodeInternalIP,
			"nodeExternalIP": nodeExternalIP,
			"podIP":        pod.Status.PodIP,
			"restarts":     getPodRestartCount(&pod),
			"age":          getPodAge(pod.CreationTimestamp.Time),
			"created_at":   pod.CreationTimestamp.Time,
			"updated_at":   updatedAt,
			"labels":       pod.Labels,
			"annotations":  pod.Annotations,
			"containers":  len(pod.Spec.Containers),
			"images":       images,
			"ready":        getPodReadyStatus(&pod),
			"cpuRequest":   cpuRequest,
			"memoryRequest": memoryRequest,
		}
		podList = append(podList, podInfo)
	}

	// 内存分页
	total := int64(len(podList))
	start := (req.Page - 1) * req.PageSize
	end := start + req.PageSize
	if start > len(podList) {
		podList = []map[string]interface{}{}
	} else if end > len(podList) {
		podList = podList[start:]
	} else {
		podList = podList[start:end]
	}

	utils.Success(c, gin.H{
		"data":      podList,
		"total":     total,
		"page":      req.Page,
		"page_size": req.PageSize,
	})
}

// RestartPod 重启Pod
func (h *K8sHandler) RestartPod(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	
	// 删除Pod以触发重启（Deployment/StatefulSet会自动重新创建）
	err = client.DeletePod(ctx, namespace, podName)
	if err != nil {
		utils.InternalServerError(c, "重启Pod失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "Pod重启成功"})
}

// GetPodYAML 获取Pod的YAML格式
func (h *K8sHandler) GetPodYAML(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	pod, err := client.GetPod(ctx, namespace, podName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Pod不存在")
		} else {
			utils.InternalServerError(c, "获取Pod失败: "+err.Error())
		}
		return
	}

	// 转换为YAML
	podYAML, err := podToYAML(pod)
	if err != nil {
		utils.InternalServerError(c, "转换为YAML失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"yaml": podYAML})
}

// UpdatePodYAML 通过YAML更新Pod
func (h *K8sHandler) UpdatePodYAML(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")

	var req struct {
		YAML string `json:"yaml" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	// 先获取现有Pod以保留资源版本等信息
	ctx := context.Background()
	existingPod, err := client.GetPod(ctx, namespace, podName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Pod不存在")
		} else {
			utils.InternalServerError(c, "获取Pod失败: "+err.Error())
		}
		return
	}

	// 解析YAML
	var updatedPod corev1.Pod
	if err := yaml.Unmarshal([]byte(req.YAML), &updatedPod); err != nil {
		utils.BadRequest(c, "YAML格式错误: "+err.Error())
		return
	}

	// Kubernetes只允许修改以下字段：
	// - spec.containers[*].image
	// - spec.initContainers[*].image
	// - spec.activeDeadlineSeconds
	// - spec.tolerations (只能添加)
	// - spec.terminationGracePeriodSeconds (如果之前是负数，允许设置为1)
	
	// 创建新的Pod对象，从现有Pod复制所有字段
	finalPod := existingPod.DeepCopy()
	
	// 只更新允许的字段
	// 1. 更新容器镜像
	if len(updatedPod.Spec.Containers) > 0 {
		for i := range finalPod.Spec.Containers {
			if i < len(updatedPod.Spec.Containers) {
				finalPod.Spec.Containers[i].Image = updatedPod.Spec.Containers[i].Image
			}
		}
	}
	
	// 2. 更新初始化容器镜像
	if len(updatedPod.Spec.InitContainers) > 0 {
		if finalPod.Spec.InitContainers == nil {
			finalPod.Spec.InitContainers = make([]corev1.Container, 0)
		}
		for i := range finalPod.Spec.InitContainers {
			if i < len(updatedPod.Spec.InitContainers) {
				finalPod.Spec.InitContainers[i].Image = updatedPod.Spec.InitContainers[i].Image
			}
		}
	}
	
	// 3. 更新 activeDeadlineSeconds
	if updatedPod.Spec.ActiveDeadlineSeconds != nil {
		finalPod.Spec.ActiveDeadlineSeconds = updatedPod.Spec.ActiveDeadlineSeconds
	}
	
	// 4. 更新 tolerations (合并，只添加新的)
	if len(updatedPod.Spec.Tolerations) > 0 {
		existingTolerations := make(map[string]bool)
		for _, tol := range finalPod.Spec.Tolerations {
			key := fmt.Sprintf("%s:%s:%s", tol.Key, tol.Operator, tol.Value)
			existingTolerations[key] = true
		}
		for _, tol := range updatedPod.Spec.Tolerations {
			key := fmt.Sprintf("%s:%s:%s", tol.Key, tol.Operator, tol.Value)
			if !existingTolerations[key] {
				finalPod.Spec.Tolerations = append(finalPod.Spec.Tolerations, tol)
			}
		}
	}
	
	// 5. 更新 terminationGracePeriodSeconds (如果之前是负数，允许设置为1)
	if updatedPod.Spec.TerminationGracePeriodSeconds != nil {
		if existingPod.Spec.TerminationGracePeriodSeconds != nil && *existingPod.Spec.TerminationGracePeriodSeconds < 0 {
			// 如果之前是负数，允许设置为1
			if *updatedPod.Spec.TerminationGracePeriodSeconds == 1 {
				finalPod.Spec.TerminationGracePeriodSeconds = updatedPod.Spec.TerminationGracePeriodSeconds
			}
		} else if existingPod.Spec.TerminationGracePeriodSeconds == nil || *existingPod.Spec.TerminationGracePeriodSeconds >= 0 {
			// 如果之前不是负数，不允许修改
			// 这里我们保持原值不变
		}
	}

	// 更新Pod
	_, err = client.UpdatePod(ctx, namespace, finalPod)
	if err != nil {
		// 检查是否是字段限制错误
		if strings.Contains(err.Error(), "Forbidden: pod updates may not change fields") {
			utils.BadRequest(c, "Pod更新失败: Kubernetes限制Pod只能修改以下字段：容器镜像、初始化容器镜像、activeDeadlineSeconds、tolerations（仅添加）、terminationGracePeriodSeconds（特定条件）。资源限制（CPU/内存）等字段需要通过Deployment或StatefulSet进行修改。")
		} else {
			utils.InternalServerError(c, "更新Pod失败: "+err.Error())
		}
		return
	}

	utils.Success(c, gin.H{"message": "Pod更新成功"})
}

// podToYAML 将Pod转换为YAML字符串
func podToYAML(pod *corev1.Pod) (string, error) {
	// 移除一些运行时字段，使YAML更清晰
	podCopy := pod.DeepCopy()
	podCopy.ResourceVersion = ""
	podCopy.UID = ""
	podCopy.CreationTimestamp = metav1.Time{}
	podCopy.ManagedFields = nil

	// 转换为YAML
	yamlBytes, err := yaml.Marshal(podCopy)
	if err != nil {
		return "", fmt.Errorf("序列化YAML失败: %w", err)
	}

	return string(yamlBytes), nil
}

// GetPodDetail 获取Pod详情
func (h *K8sHandler) GetPodDetail(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	pod, err := client.GetPod(ctx, namespace, podName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Pod不存在")
		} else {
			utils.InternalServerError(c, "获取Pod失败: "+err.Error())
		}
		return
	}

	// 获取节点IP
	nodeIP := ""
	nodeInternalIP := ""
	nodeExternalIP := ""
	if pod.Spec.NodeName != "" {
		node, err := client.GetNode(ctx, pod.Spec.NodeName)
		if err == nil {
			for _, addr := range node.Status.Addresses {
				switch addr.Type {
				case corev1.NodeInternalIP:
					nodeInternalIP = addr.Address
				case corev1.NodeExternalIP:
					nodeExternalIP = addr.Address
				}
			}
			if nodeInternalIP != "" {
				nodeIP = nodeInternalIP
			} else if nodeExternalIP != "" {
				nodeIP = nodeExternalIP
			}
		}
	}

	// 获取容器信息
	containers := make([]map[string]interface{}, 0)
	for _, container := range pod.Spec.Containers {
		containerStatus := getContainerStatus(pod, container.Name)
		ports := make([]string, 0)
		for _, port := range container.Ports {
			ports = append(ports, fmt.Sprintf("%s %d", port.Protocol, port.ContainerPort))
		}
		containers = append(containers, map[string]interface{}{
			"name":   container.Name,
			"image":  container.Image,
			"status": containerStatus,
			"ports":  ports,
		})
	}

	// 获取初始化容器信息
	initContainers := make([]map[string]interface{}, 0)
	for _, container := range pod.Spec.InitContainers {
		containerStatus := getContainerStatus(pod, container.Name)
		initContainers = append(initContainers, map[string]interface{}{
			"name":   container.Name,
			"image":  container.Image,
			"status": containerStatus,
		})
	}

	// 获取Pod条件
	conditions := make([]map[string]interface{}, 0)
	for _, condition := range pod.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":            string(condition.Type),
			"status":          string(condition.Status),
			"lastUpdateTime":  condition.LastTransitionTime.Time,
			"reason":          condition.Reason,
			"message":         condition.Message,
		})
	}

	// 获取创建者信息
	ownerRefs := make([]map[string]interface{}, 0)
	for _, ownerRef := range pod.OwnerReferences {
		ownerRefs = append(ownerRefs, map[string]interface{}{
			"kind": ownerRef.Kind,
			"name": ownerRef.Name,
			"uid":  ownerRef.UID,
		})
	}

	podInfo := map[string]interface{}{
		"metadata": map[string]interface{}{
			"name":              pod.Name,
			"namespace":         pod.Namespace,
			"creationTimestamp": pod.CreationTimestamp.Time,
			"labels":            pod.Labels,
			"annotations":       pod.Annotations,
		},
		"status": map[string]interface{}{
			"phase":     string(pod.Status.Phase),
			"podIP":     pod.Status.PodIP,
			"hostIP":    pod.Status.HostIP,
			"nodeName":  pod.Spec.NodeName,
			"nodeIP":    nodeIP,
			"conditions": conditions,
		},
		"spec": map[string]interface{}{
			"nodeName": pod.Spec.NodeName,
		},
		"containers":     containers,
		"initContainers": initContainers,
		"ownerRefs":      ownerRefs,
	}

	utils.Success(c, podInfo)
}

// getContainerStatus 获取容器状态
func getContainerStatus(pod *corev1.Pod, containerName string) string {
	for _, status := range pod.Status.ContainerStatuses {
		if status.Name == containerName {
			if status.State.Running != nil {
				return "Running"
			} else if status.State.Waiting != nil {
				return "Waiting"
			} else if status.State.Terminated != nil {
				return "Terminated"
			}
		}
	}
	return "Unknown"
}

// GetPodLogs 获取Pod日志
func (h *K8sHandler) GetPodLogs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")
	containerName := c.Query("container") // 可选
	tailLines := int64(100)               // 默认100行

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	logs, err := client.GetPodLogs(ctx, namespace, podName, containerName, tailLines)
	if err != nil {
		utils.InternalServerError(c, "获取Pod日志失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"logs": logs})
}

// DeletePodHandler 删除Pod
func (h *K8sHandler) DeletePodHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	err = client.DeletePod(ctx, namespace, podName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Pod不存在")
		} else {
			utils.InternalServerError(c, "删除Pod失败: "+err.Error())
		}
		return
	}

	utils.Success(c, gin.H{"message": "Pod删除成功"})
}

// UpdatePodLabels 更新Pod标签
func (h *K8sHandler) UpdatePodLabels(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")

	var req struct {
		Labels map[string]string `json:"labels" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	pod, err := client.GetPod(ctx, namespace, podName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Pod不存在")
		} else {
			utils.InternalServerError(c, "获取Pod失败: "+err.Error())
		}
		return
	}

	// 更新标签
	pod.Labels = req.Labels
	_, err = client.UpdatePod(ctx, namespace, pod)
	if err != nil {
		utils.InternalServerError(c, "更新Pod标签失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "Pod标签更新成功"})
}

// UpdatePodAnnotations 更新Pod注解
func (h *K8sHandler) UpdatePodAnnotations(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	podName := c.Param("podName")

	var req struct {
		Annotations map[string]string `json:"annotations" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx := context.Background()
	pod, err := client.GetPod(ctx, namespace, podName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Pod不存在")
		} else {
			utils.InternalServerError(c, "获取Pod失败: "+err.Error())
		}
		return
	}

	// 更新注解
	pod.Annotations = req.Annotations
	_, err = client.UpdatePod(ctx, namespace, pod)
	if err != nil {
		utils.InternalServerError(c, "更新Pod注解失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "Pod注解更新成功"})
}

// GetServices 获取Service列表
func (h *K8sHandler) GetServices(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	services, err := client.GetServices(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取Service列表失败: "+err.Error())
		return
	}

	var serviceList []map[string]interface{}
	for _, svc := range services {
		ports := make([]string, 0)
		for _, port := range svc.Spec.Ports {
			ports = append(ports, fmt.Sprintf("%d/%s", port.Port, port.Protocol))
		}

		serviceInfo := map[string]interface{}{
			"name":       svc.Name,
			"namespace":  svc.Namespace,
			"type":       string(svc.Spec.Type),
			"clusterIP":  svc.Spec.ClusterIP,
			"ports":      strings.Join(ports, ", "),
			"created_at": svc.CreationTimestamp.Time,
		}
		serviceList = append(serviceList, serviceInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(serviceList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, serviceList)
	}
}

// GetConfigMaps 获取ConfigMap列表
func (h *K8sHandler) GetConfigMaps(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	configMaps, err := client.GetConfigMaps(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取ConfigMap列表失败: "+err.Error())
		return
	}

	var cmList []map[string]interface{}
	for _, cm := range configMaps {
		dataKeys := make([]string, 0)
		for k := range cm.Data {
			dataKeys = append(dataKeys, k)
		}

		cmInfo := map[string]interface{}{
			"name":       cm.Name,
			"namespace":  cm.Namespace,
			"dataKeys":   strings.Join(dataKeys, ", "),
			"created_at": cm.CreationTimestamp.Time,
		}
		cmList = append(cmList, cmInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(cmList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, cmList)
	}
}

// GetSecrets 获取Secret列表
func (h *K8sHandler) GetSecrets(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	secrets, err := client.GetSecrets(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取Secret列表失败: "+err.Error())
		return
	}

	var secretList []map[string]interface{}
	for _, secret := range secrets {
		secretInfo := map[string]interface{}{
			"name":       secret.Name,
			"namespace":  secret.Namespace,
			"type":       string(secret.Type),
			"created_at": secret.CreationTimestamp.Time,
		}
		secretList = append(secretList, secretInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(secretList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, secretList)
	}
}

// GetPVCs 获取PVC列表
func (h *K8sHandler) GetPVCs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pvcs, err := client.GetPersistentVolumeClaims(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取PVC列表失败: "+err.Error())
		return
	}

	var pvcList []map[string]interface{}
	for _, pvc := range pvcs {
		accessModes := make([]string, 0)
		for _, mode := range pvc.Spec.AccessModes {
			accessModes = append(accessModes, string(mode))
		}

		capacity := ""
		if pvc.Status.Capacity != nil {
			if storage, ok := pvc.Status.Capacity[corev1.ResourceStorage]; ok {
				capacity = storage.String()
			}
		}

		pvcInfo := map[string]interface{}{
			"name":         pvc.Name,
			"namespace":    pvc.Namespace,
			"status":       string(pvc.Status.Phase),
			"capacity":     capacity,
			"accessModes":  strings.Join(accessModes, ", "),
			"storageClass": pvc.Spec.StorageClassName,
			"created_at":   pvc.CreationTimestamp.Time,
		}
		pvcList = append(pvcList, pvcInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(pvcList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, pvcList)
	}
}

// GetDeployments 获取Deployment列表
func (h *K8sHandler) GetDeployments(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	deployments, err := client.GetDeployments(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取Deployment列表失败: "+err.Error())
		return
	}

	var deploymentList []map[string]interface{}
	for _, deployment := range deployments {
		readyReplicas := int32(0)
		if deployment.Status.ReadyReplicas > 0 {
			readyReplicas = deployment.Status.ReadyReplicas
		}
		replicas := int32(0)
		if deployment.Spec.Replicas != nil {
			replicas = *deployment.Spec.Replicas
		}
		// 实际启动数量：优先使用AvailableReplicas，如果没有则使用ReadyReplicas
		// AvailableReplicas表示已经启动并运行正常的Pod数量
		availableReplicas := deployment.Status.AvailableReplicas
		if availableReplicas == 0 {
			// 如果没有AvailableReplicas，使用ReadyReplicas作为实际启动数量
			availableReplicas = readyReplicas
		}

		// 获取容器镜像（取第一个容器的镜像）
		image := ""
		if len(deployment.Spec.Template.Spec.Containers) > 0 {
			image = deployment.Spec.Template.Spec.Containers[0].Image
		}
		// 如果镜像为空，尝试从InitContainers获取
		if image == "" && len(deployment.Spec.Template.Spec.InitContainers) > 0 {
			image = deployment.Spec.Template.Spec.InitContainers[0].Image
		}

		// 获取更新时间：优先使用Status.Conditions中的最新时间，否则使用CreationTimestamp
		updatedAt := deployment.CreationTimestamp.Time
		if deployment.Status.Conditions != nil && len(deployment.Status.Conditions) > 0 {
			for _, condition := range deployment.Status.Conditions {
				// 检查所有条件的最新更新时间
				if condition.LastUpdateTime.After(updatedAt) {
					updatedAt = condition.LastUpdateTime.Time
				}
				// 也检查LastTransitionTime
				if condition.LastTransitionTime.After(updatedAt) {
					updatedAt = condition.LastTransitionTime.Time
				}
			}
		}
		// 如果Deployment有Generation变化，说明有更新，使用当前时间作为参考
		// 但这里我们主要依赖Conditions的时间戳

		deploymentInfo := map[string]interface{}{
			"name":              deployment.Name,
			"namespace":         deployment.Namespace,
			"replicas":           replicas,
			"readyReplicas":     readyReplicas,
			"availableReplicas": availableReplicas,
			"available":         deployment.Status.AvailableReplicas,
			"updated":           deployment.Status.UpdatedReplicas,
			"age":                getPodAge(deployment.CreationTimestamp.Time),
			"created_at":         deployment.CreationTimestamp.Time,
			"updated_at":         updatedAt,
			"image":              image,
			"labels":             deployment.Labels,
		}
		deploymentList = append(deploymentList, deploymentInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(deploymentList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, deploymentList)
	}
}

// GetDeploymentDetail 获取单个Deployment详情
func (h *K8sHandler) GetDeploymentDetail(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	deployment, err := client.GetDeployment(ctx, namespace, deploymentName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "获取Deployment详情失败: "+err.Error())
		}
		return
	}

	readyReplicas := int32(0)
	if deployment.Status.ReadyReplicas > 0 {
		readyReplicas = deployment.Status.ReadyReplicas
	}
	replicas := int32(0)
	if deployment.Spec.Replicas != nil {
		replicas = *deployment.Spec.Replicas
	}

	// 获取容器镜像
	images := make([]string, 0)
	if len(deployment.Spec.Template.Spec.Containers) > 0 {
		for _, container := range deployment.Spec.Template.Spec.Containers {
			images = append(images, container.Image)
		}
	}

	// 获取更新时间：优先使用Status.Conditions中的最新时间，否则使用CreationTimestamp
	updatedAt := deployment.CreationTimestamp.Time
	if deployment.Status.Conditions != nil && len(deployment.Status.Conditions) > 0 {
		for _, condition := range deployment.Status.Conditions {
			// 检查所有条件的最新更新时间
			if condition.LastUpdateTime.After(updatedAt) {
				updatedAt = condition.LastUpdateTime.Time
			}
			// 也检查LastTransitionTime
			if condition.LastTransitionTime.After(updatedAt) {
				updatedAt = condition.LastTransitionTime.Time
			}
		}
	}
	// 如果Deployment有Generation变化，说明有更新，但这里我们主要依赖Conditions的时间戳

	// 获取选择器
	selector := make(map[string]string)
	if deployment.Spec.Selector != nil && deployment.Spec.Selector.MatchLabels != nil {
		selector = deployment.Spec.Selector.MatchLabels
	}

	// 获取滚动升级策略
	strategy := "RollingUpdate"
	maxSurge := "25%"
	maxUnavailable := "25%"
	if deployment.Spec.Strategy.Type == appsv1.RollingUpdateDeploymentStrategyType {
		if deployment.Spec.Strategy.RollingUpdate != nil {
			if deployment.Spec.Strategy.RollingUpdate.MaxSurge != nil {
				maxSurge = deployment.Spec.Strategy.RollingUpdate.MaxSurge.String()
			}
			if deployment.Spec.Strategy.RollingUpdate.MaxUnavailable != nil {
				maxUnavailable = deployment.Spec.Strategy.RollingUpdate.MaxUnavailable.String()
			}
		}
	} else {
		strategy = string(deployment.Spec.Strategy.Type)
	}

	image := ""
	if len(images) > 0 {
		image = images[0]
	}

	deploymentInfo := map[string]interface{}{
		"name":              deployment.Name,
		"namespace":         deployment.Namespace,
		"replicas":          replicas,
		"readyReplicas":     readyReplicas,
		"available":         deployment.Status.AvailableReplicas,
		"updated":           deployment.Status.UpdatedReplicas,
		"age":               getPodAge(deployment.CreationTimestamp.Time),
		"created_at":        deployment.CreationTimestamp.Time,
		"updated_at":        updatedAt,
		"image":             image,
		"images":            images,
		"labels":            deployment.Labels,
		"annotations":       deployment.Annotations,
		"selector":          selector,
		"strategy":          strategy,
		"maxSurge":          maxSurge,
		"maxUnavailable":    maxUnavailable,
	}

	utils.Success(c, deploymentInfo)
}

// GetDeploymentPods 获取Deployment关联的Pod列表
func (h *K8sHandler) GetDeploymentPods(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 先获取Deployment以获取selector
	deployment, deploymentErr := client.GetDeployment(ctx, namespace, deploymentName)
	if deploymentErr != nil {
		if apierrors.IsNotFound(deploymentErr) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "获取Deployment失败: "+deploymentErr.Error())
		}
		return
	}

	// 使用selector获取关联的Pods
	selector := make(map[string]string)
	if deployment.Spec.Selector != nil && deployment.Spec.Selector.MatchLabels != nil {
		selector = deployment.Spec.Selector.MatchLabels
		fmt.Printf("[GetDeploymentPods] 使用Deployment的Selector: %v\n", selector)
	}

	// 如果selector为空，尝试使用Deployment的标签作为selector
	if len(selector) == 0 {
		fmt.Printf("[GetDeploymentPods] Selector为空，尝试使用Deployment标签作为fallback\n")
		if deployment.Labels != nil {
			// 使用Deployment的标签，但通常应该使用selector
			// 这里作为fallback，尝试匹配Deployment名称相关的标签
			selector = make(map[string]string)
			// 尝试常见的标签模式
			if appLabel, ok := deployment.Labels["app"]; ok {
				selector["app"] = appLabel
				fmt.Printf("[GetDeploymentPods] 使用app标签: %v\n", selector)
			} else if appName, ok := deployment.Labels["app.kubernetes.io/name"]; ok {
				selector["app.kubernetes.io/name"] = appName
				fmt.Printf("[GetDeploymentPods] 使用app.kubernetes.io/name标签: %v\n", selector)
			} else {
				// 如果都没有，尝试使用deployment名称作为app标签
				selector["app"] = deploymentName
				fmt.Printf("[GetDeploymentPods] 使用Deployment名称作为app标签: %v\n", selector)
			}
		}
	}

	var pods []corev1.Pod

	// 如果selector不为空，尝试通过selector获取
	if len(selector) > 0 {
		fmt.Printf("[GetDeploymentPods] 尝试通过selector获取Pods: %v\n", selector)
		selectedPods, err := client.GetPodsBySelector(ctx, namespace, selector)
		if err != nil {
			// 如果通过selector获取失败，记录错误但继续fallback
			fmt.Printf("[GetDeploymentPods] 通过selector获取Pods失败: %v, selector: %v\n", err, selector)
		} else {
			pods = selectedPods
			fmt.Printf("[GetDeploymentPods] 通过selector找到 %d 个Pods\n", len(pods))
		}
	}

	// 如果通过selector没有找到pods，或者selector为空，尝试fallback方法
	if len(pods) == 0 {
		fmt.Printf("[GetDeploymentPods] 通过selector未找到Pods，尝试fallback方法\n")
		// 获取命名空间下的所有pods，然后手动过滤
		allPods, err2 := client.GetPods(ctx, namespace)
		if err2 != nil {
			fmt.Printf("[GetDeploymentPods] 获取所有Pods失败: %v\n", err2)
			if len(selector) > 0 {
				// 如果selector存在但获取失败，返回错误
				utils.InternalServerError(c, fmt.Sprintf("获取Pod列表失败: %v", err2))
				return
			}
			// 如果selector为空且获取失败，返回空列表
			fmt.Printf("[GetDeploymentPods] Selector为空且获取失败，返回空列表\n")
			utils.Success(c, []map[string]interface{}{})
			return
		}
		fmt.Printf("[GetDeploymentPods] 获取到命名空间 %s 下的 %d 个Pods\n", namespace, len(allPods))

		// 手动过滤：检查pod的标签是否匹配selector
		pods = []corev1.Pod{}
		if len(selector) > 0 {
			// 如果有selector，使用selector匹配
			for _, pod := range allPods {
				match := true
				for key, value := range selector {
					if pod.Labels == nil || pod.Labels[key] != value {
						match = false
						break
					}
				}
				if match {
					pods = append(pods, pod)
				}
			}
		} else {
			// 如果selector为空，尝试通过ReplicaSet查找关联的Pods
			// Deployment -> ReplicaSet -> Pod
			// 首先获取所有ReplicaSet，找到属于该Deployment的ReplicaSet
			replicaSets, err3 := client.GetReplicaSets(ctx, namespace)
			if err3 == nil {
				// 找到属于该Deployment的ReplicaSet
				var targetReplicaSetNames []string
				for _, rs := range replicaSets {
					if rs.OwnerReferences != nil {
						for _, owner := range rs.OwnerReferences {
							if owner.Kind == "Deployment" && owner.Name == deploymentName {
								targetReplicaSetNames = append(targetReplicaSetNames, rs.Name)
								break
							}
						}
					}
				}
				
				// 通过ReplicaSet名称匹配Pod
				if len(targetReplicaSetNames) > 0 {
					for _, pod := range allPods {
						if pod.OwnerReferences != nil {
							for _, owner := range pod.OwnerReferences {
								if owner.Kind == "ReplicaSet" {
									for _, rsName := range targetReplicaSetNames {
										if owner.Name == rsName {
											pods = append(pods, pod)
											break
										}
									}
								}
							}
						}
					}
				} else {
					// 如果找不到ReplicaSet，尝试通过Pod名称前缀匹配（Pod名称通常以Deployment名称开头）
					for _, pod := range allPods {
						if strings.HasPrefix(pod.Name, deploymentName) {
							pods = append(pods, pod)
						}
					}
				}
			} else {
				// 如果获取ReplicaSet失败，尝试通过Pod名称前缀匹配
				for _, pod := range allPods {
					if strings.HasPrefix(pod.Name, deploymentName) {
						pods = append(pods, pod)
					}
				}
			}
		}
	}

	var podList []map[string]interface{}
	for _, pod := range pods {
		images := make([]string, 0)
		for _, container := range pod.Spec.Containers {
			images = append(images, container.Image)
		}

		// 获取更新时间（使用StartTime或CreationTimestamp）
		updatedAt := pod.CreationTimestamp.Time
		if pod.Status.StartTime != nil {
			updatedAt = pod.Status.StartTime.Time
		}

		// 获取节点IP（如果节点名称存在，尝试获取节点信息）
		nodeIP := ""
		nodeInternalIP := ""
		nodeExternalIP := ""
		if pod.Spec.NodeName != "" {
			node, nodeErr := client.GetNode(ctx, pod.Spec.NodeName)
			if nodeErr == nil {
				for _, addr := range node.Status.Addresses {
					switch addr.Type {
					case corev1.NodeInternalIP:
						nodeInternalIP = addr.Address
					case corev1.NodeExternalIP:
						nodeExternalIP = addr.Address
					}
				}
				// 优先使用内部IP，如果没有则使用外部IP
				if nodeInternalIP != "" {
					nodeIP = nodeInternalIP
				} else if nodeExternalIP != "" {
					nodeIP = nodeExternalIP
				}
			} else {
				fmt.Printf("[GetDeploymentPods] 获取节点 %s 信息失败: %v\n", pod.Spec.NodeName, nodeErr)
			}
		}

		// 确保Pod名称不为空
		podName := pod.Name
		if podName == "" {
			fmt.Printf("[GetDeploymentPods] 警告: Pod名称为空，使用默认值\n")
			podName = "unknown-pod"
		}

		podInfo := map[string]interface{}{
			"name":         podName,
			"namespace":    pod.Namespace,
			"status":       string(pod.Status.Phase),
			"node":         pod.Spec.NodeName,
			"nodeIP":       nodeIP,
			"podIP":        pod.Status.PodIP,
			"restarts":     getPodRestartCount(&pod),
			"age":          getPodAge(pod.CreationTimestamp.Time),
			"created_at":   pod.CreationTimestamp.Time,
			"updated_at":   updatedAt,
			"labels":       pod.Labels,
			"annotations":  pod.Annotations,
			"containers":  len(pod.Spec.Containers),
			"images":       images,
			"ready":        getPodReadyStatus(&pod),
		}
		
		// 调试日志：确保name字段正确设置（仅第一个Pod）
		if len(podList) == 0 {
			fmt.Printf("[GetDeploymentPods] 第一个Pod信息: name=%s, namespace=%s, status=%s, images=%v\n", 
				podName, pod.Namespace, string(pod.Status.Phase), images)
		}
		
		podList = append(podList, podInfo)
	}

	fmt.Printf("[GetDeploymentPods] 最终返回 %d 个Pods给前端\n", len(podList))
	utils.Success(c, podList)
}

// GetDeploymentCost 获取Deployment成本信息
func (h *K8sHandler) GetDeploymentCost(c *gin.Context) {
	fmt.Printf("[GetDeploymentCost] 收到请求: %s %s\n", c.Request.Method, c.Request.URL.Path)
	
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")
	
	fmt.Printf("[GetDeploymentCost] 参数: clusterID=%s, namespace=%s, deploymentName=%s\n", clusterID, namespace, deploymentName)

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取Deployment详情
	deployment, err := client.GetDeployment(ctx, namespace, deploymentName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "获取Deployment失败: "+err.Error())
		}
		return
	}

	// 计算资源使用量
	var totalCPU float64
	var totalMemory float64
	var totalStorage float64

	replicas := int32(1)
	if deployment.Spec.Replicas != nil {
		replicas = *deployment.Spec.Replicas
	}

	// 计算每个容器的资源请求
	for _, container := range deployment.Spec.Template.Spec.Containers {
		// CPU资源
		if container.Resources.Requests != nil {
			if cpuReq, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
				cpuValue := cpuReq.MilliValue() / 1000.0 // 转换为cores
				totalCPU += float64(cpuValue) * float64(replicas)
			}
			// 内存资源
			if memReq, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
				memValue := memReq.Value() / (1024 * 1024 * 1024) // 转换为Gi
				totalMemory += float64(memValue) * float64(replicas)
			}
		}
	}

	// 计算存储（从PVC获取，这里简化处理）
	// 实际应该从PVC获取，这里使用默认值
	totalStorage = 0

	// 计算成本（这里使用示例价格，实际应该从配置或外部服务获取）
	// CPU成本：假设每core每小时0.1元
	cpuCostPerHour := 0.1
	cpuCost := totalCPU * cpuCostPerHour * 24 * 30 // 月成本

	// 内存成本：假设每Gi每小时0.05元
	memoryCostPerHour := 0.05
	memoryCost := totalMemory * memoryCostPerHour * 24 * 30 // 月成本

	// 存储成本：假设每Gi每月0.1元
	storageCostPerMonth := 0.1
	storageCost := totalStorage * storageCostPerMonth

	// 网络成本：假设每月固定10元
	networkCost := 10.0

	// 总成本
	totalCost := cpuCost + memoryCost + storageCost + networkCost

	costInfo := map[string]interface{}{
		"totalCost":    totalCost,
		"cpuCost":      cpuCost,
		"memoryCost":   memoryCost,
		"storageCost":  storageCost,
		"networkCost":  networkCost,
		"cpuUsage":     totalCPU,
		"memoryUsage":  totalMemory,
		"storageUsage": totalStorage,
		"costBreakdown": map[string]interface{}{
			"daily":   totalCost / 30,
			"monthly": totalCost,
			"yearly":  totalCost * 12,
		},
	}

	utils.Success(c, costInfo)
}

// UpdateDeployment 更新Deployment
func (h *K8sHandler) UpdateDeployment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var req struct {
		Replicas    *int32           `json:"replicas"`
		Image       string           `json:"image"`
		Labels      map[string]string `json:"labels"`
		Annotations map[string]string `json:"annotations"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取现有Deployment
	deployment, err := client.GetDeployment(ctx, namespace, deploymentName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "获取Deployment失败: "+err.Error())
		}
		return
	}

	// 更新副本数
	if req.Replicas != nil {
		deployment.Spec.Replicas = req.Replicas
	}

	// 更新镜像（更新第一个容器）
	if req.Image != "" && len(deployment.Spec.Template.Spec.Containers) > 0 {
		deployment.Spec.Template.Spec.Containers[0].Image = req.Image
	}

	// 更新标签
	if req.Labels != nil {
		if deployment.Labels == nil {
			deployment.Labels = make(map[string]string)
		}
		for k, v := range req.Labels {
			if v == "" {
				delete(deployment.Labels, k)
			} else {
				deployment.Labels[k] = v
			}
		}
		// 同时更新selector（如果存在）
		if deployment.Spec.Selector != nil {
			if deployment.Spec.Selector.MatchLabels == nil {
				deployment.Spec.Selector.MatchLabels = make(map[string]string)
			}
			for k, v := range req.Labels {
				if v == "" {
					delete(deployment.Spec.Selector.MatchLabels, k)
				} else {
					deployment.Spec.Selector.MatchLabels[k] = v
				}
			}
		}
		// 更新Pod模板标签
		if deployment.Spec.Template.Labels == nil {
			deployment.Spec.Template.Labels = make(map[string]string)
		}
		for k, v := range req.Labels {
			if v == "" {
				delete(deployment.Spec.Template.Labels, k)
			} else {
				deployment.Spec.Template.Labels[k] = v
			}
		}
	}

	// 更新注解
	if req.Annotations != nil {
		if deployment.Annotations == nil {
			deployment.Annotations = make(map[string]string)
		}
		for k, v := range req.Annotations {
			if v == "" {
				delete(deployment.Annotations, k)
			} else {
				deployment.Annotations[k] = v
			}
		}
		// 更新Pod模板注解
		if deployment.Spec.Template.Annotations == nil {
			deployment.Spec.Template.Annotations = make(map[string]string)
		}
		for k, v := range req.Annotations {
			if v == "" {
				delete(deployment.Spec.Template.Annotations, k)
			} else {
				deployment.Spec.Template.Annotations[k] = v
			}
		}
	}

	// 更新Deployment
	_, err = client.UpdateDeployment(ctx, namespace, deployment)
	if err != nil {
		utils.InternalServerError(c, "更新Deployment失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "Deployment更新成功"})
}

// ScaleDeployment 伸缩Deployment（修改副本数）
func (h *K8sHandler) ScaleDeployment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var req struct {
		Replicas int32 `json:"replicas" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 验证副本数（允许0）
	if req.Replicas < 0 {
		utils.BadRequest(c, "副本数不能为负数")
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 伸缩Deployment
	err = client.ScaleDeployment(ctx, namespace, deploymentName, req.Replicas)
	if err != nil {
		utils.InternalServerError(c, "伸缩Deployment失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "Deployment伸缩成功", "replicas": req.Replicas})
}

// GetDeploymentYAML 获取Deployment的YAML
func (h *K8sHandler) GetDeploymentYAML(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	deployment, err := client.GetDeployment(ctx, namespace, deploymentName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "获取Deployment失败: "+err.Error())
		}
		return
	}

	// 转换为YAML
	yamlBytes, err := yaml.Marshal(deployment)
	if err != nil {
		utils.InternalServerError(c, "转换为YAML失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"yaml": string(yamlBytes)})
}

// UpdateDeploymentYAML 通过YAML更新Deployment
func (h *K8sHandler) UpdateDeploymentYAML(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var req struct {
		YAML string `json:"yaml" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 解析YAML
	var deployment appsv1.Deployment
	if err := yaml.Unmarshal([]byte(req.YAML), &deployment); err != nil {
		utils.BadRequest(c, "YAML格式错误: "+err.Error())
		return
	}

	// 确保名称和命名空间匹配
	deployment.Name = deploymentName
	deployment.Namespace = namespace

	// 更新Deployment
	_, err = client.UpdateDeployment(ctx, namespace, &deployment)
	if err != nil {
		utils.InternalServerError(c, "更新Deployment失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "Deployment更新成功"})
}

// RedeployDeployment 重新部署Deployment
func (h *K8sHandler) RedeployDeployment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取现有Deployment
	deployment, err := client.GetDeployment(ctx, namespace, deploymentName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "获取Deployment失败: "+err.Error())
		}
		return
	}

	// 通过更新注解来触发重新部署
	if deployment.Spec.Template.Annotations == nil {
		deployment.Spec.Template.Annotations = make(map[string]string)
	}
	deployment.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	// 更新Deployment
	_, err = client.UpdateDeployment(ctx, namespace, deployment)
	if err != nil {
		utils.InternalServerError(c, "重新部署Deployment失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "Deployment重新部署成功"})
}

// DeleteDeployment 删除Deployment
func (h *K8sHandler) DeleteDeployment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 删除Deployment
	err = client.DeleteDeployment(ctx, namespace, deploymentName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "删除Deployment失败: "+err.Error())
		}
		return
	}

	utils.Success(c, gin.H{"message": "Deployment删除成功"})
}

// CreateWorkloadFromYAML 从YAML创建工作负载资源
func (h *K8sHandler) CreateWorkloadFromYAML(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")

	var req struct {
		YAML string `json:"yaml" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	// 创建K8s客户端
	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 从YAML创建资源
	if err := client.CreateResourceFromYAML(ctx, req.YAML); err != nil {
		utils.InternalServerError(c, "创建资源失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "资源创建成功"})
}

// GetStatefulSets 获取StatefulSet列表
func (h *K8sHandler) GetStatefulSets(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	statefulSets, err := client.GetStatefulSets(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取StatefulSet列表失败: "+err.Error())
		return
	}

	var statefulSetList []map[string]interface{}
	for _, sts := range statefulSets {
		readyReplicas := int32(0)
		if sts.Status.ReadyReplicas > 0 {
			readyReplicas = sts.Status.ReadyReplicas
		}
		replicas := int32(0)
		if sts.Spec.Replicas != nil {
			replicas = *sts.Spec.Replicas
		}
		// 实际启动数量：优先使用AvailableReplicas，如果没有则使用ReadyReplicas
		availableReplicas := sts.Status.ReadyReplicas
		if sts.Status.ReadyReplicas == 0 {
			availableReplicas = readyReplicas
		}

		// 获取容器镜像（取第一个容器的镜像）
		image := ""
		if len(sts.Spec.Template.Spec.Containers) > 0 {
			image = sts.Spec.Template.Spec.Containers[0].Image
		}
		// 如果镜像为空，尝试从InitContainers获取
		if image == "" && len(sts.Spec.Template.Spec.InitContainers) > 0 {
			image = sts.Spec.Template.Spec.InitContainers[0].Image
		}

	// 获取更新时间：优先使用Status.Conditions中的最新时间，否则使用CreationTimestamp
	updatedAt := sts.CreationTimestamp.Time
	if sts.Status.Conditions != nil && len(sts.Status.Conditions) > 0 {
		for _, condition := range sts.Status.Conditions {
			// StatefulSetCondition只有LastTransitionTime，没有LastUpdateTime
			if condition.LastTransitionTime.After(updatedAt) {
				updatedAt = condition.LastTransitionTime.Time
			}
		}
	}

		statefulSetInfo := map[string]interface{}{
			"name":              sts.Name,
			"namespace":         sts.Namespace,
			"replicas":           replicas,
			"readyReplicas":     readyReplicas,
			"availableReplicas": availableReplicas,
			"age":                getPodAge(sts.CreationTimestamp.Time),
			"created_at":         sts.CreationTimestamp.Time,
			"updated_at":         updatedAt,
			"image":              image,
			"labels":             sts.Labels,
		}
		statefulSetList = append(statefulSetList, statefulSetInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(statefulSetList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, statefulSetList)
	}
}

// GetStatefulSetDetail 获取单个StatefulSet详情
func (h *K8sHandler) GetStatefulSetDetail(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	statefulSet, err := client.GetStatefulSet(ctx, namespace, statefulSetName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "StatefulSet不存在")
		} else {
			utils.InternalServerError(c, "获取StatefulSet失败: "+err.Error())
		}
		return
	}

	readyReplicas := int32(0)
	if statefulSet.Status.ReadyReplicas > 0 {
		readyReplicas = statefulSet.Status.ReadyReplicas
	}
	replicas := int32(0)
	if statefulSet.Spec.Replicas != nil {
		replicas = *statefulSet.Spec.Replicas
	}

	// 获取容器镜像
	images := make([]string, 0)
	if len(statefulSet.Spec.Template.Spec.Containers) > 0 {
		for _, container := range statefulSet.Spec.Template.Spec.Containers {
			images = append(images, container.Image)
		}
	}

	// 获取更新时间：优先使用Status.Conditions中的最新时间，否则使用CreationTimestamp
	updatedAt := statefulSet.CreationTimestamp.Time
	if statefulSet.Status.Conditions != nil && len(statefulSet.Status.Conditions) > 0 {
		for _, condition := range statefulSet.Status.Conditions {
			// StatefulSetCondition只有LastTransitionTime，没有LastUpdateTime
			if condition.LastTransitionTime.After(updatedAt) {
				updatedAt = condition.LastTransitionTime.Time
			}
		}
	}

	// 获取选择器
	selector := make(map[string]string)
	if statefulSet.Spec.Selector != nil && statefulSet.Spec.Selector.MatchLabels != nil {
		selector = statefulSet.Spec.Selector.MatchLabels
	}

	// 获取滚动升级策略
	strategy := "RollingUpdate"
	if statefulSet.Spec.UpdateStrategy.Type == appsv1.RollingUpdateStatefulSetStrategyType {
		if statefulSet.Spec.UpdateStrategy.RollingUpdate != nil && statefulSet.Spec.UpdateStrategy.RollingUpdate.Partition != nil {
			strategy = fmt.Sprintf("RollingUpdate (Partition: %d)", *statefulSet.Spec.UpdateStrategy.RollingUpdate.Partition)
		}
	} else {
		strategy = string(statefulSet.Spec.UpdateStrategy.Type)
	}

	image := ""
	if len(images) > 0 {
		image = images[0]
	}

	statefulSetInfo := map[string]interface{}{
		"name":          statefulSet.Name,
		"namespace":     statefulSet.Namespace,
		"replicas":      replicas,
		"readyReplicas": readyReplicas,
		"available":     statefulSet.Status.ReadyReplicas,
		"updated":       statefulSet.Status.UpdatedReplicas,
		"age":           getPodAge(statefulSet.CreationTimestamp.Time),
		"created_at":    statefulSet.CreationTimestamp.Time,
		"updated_at":    updatedAt,
		"image":         image,
		"images":        images,
		"labels":        statefulSet.Labels,
		"annotations":   statefulSet.Annotations,
		"selector":      selector,
		"strategy":      strategy,
	}

	utils.Success(c, statefulSetInfo)
}

// GetStatefulSetPods 获取StatefulSet关联的Pod列表
func (h *K8sHandler) GetStatefulSetPods(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 先获取StatefulSet以获取selector
	statefulSet, deploymentErr := client.GetStatefulSet(ctx, namespace, statefulSetName)
	if deploymentErr != nil {
		if apierrors.IsNotFound(deploymentErr) {
			utils.NotFound(c, "StatefulSet不存在")
		} else {
			utils.InternalServerError(c, "获取StatefulSet失败: "+deploymentErr.Error())
		}
		return
	}

	// 使用selector获取关联的Pods
	selector := make(map[string]string)
	if statefulSet.Spec.Selector != nil && statefulSet.Spec.Selector.MatchLabels != nil {
		selector = statefulSet.Spec.Selector.MatchLabels
	}

	var pods []corev1.Pod

	// 如果selector不为空，尝试通过selector获取
	if len(selector) > 0 {
		selectedPods, err := client.GetPodsBySelector(ctx, namespace, selector)
		if err != nil {
			fmt.Printf("通过selector获取Pods失败: %v, selector: %v\n", err, selector)
		} else {
			pods = selectedPods
		}
	}

	// 如果通过selector没有找到pods，或者selector为空，尝试fallback方法
	if len(pods) == 0 {
		allPods, err2 := client.GetPods(ctx, namespace)
		if err2 != nil {
			if len(selector) > 0 {
				utils.InternalServerError(c, fmt.Sprintf("获取Pod列表失败: %v", err2))
				return
			}
			utils.Success(c, []map[string]interface{}{})
			return
		}

		pods = []corev1.Pod{}
		if len(selector) > 0 {
			for _, pod := range allPods {
				match := true
				for key, value := range selector {
					if pod.Labels == nil || pod.Labels[key] != value {
						match = false
						break
					}
				}
				if match {
					pods = append(pods, pod)
				}
			}
		} else {
			// 如果selector为空，尝试通过Pod名称前缀匹配（StatefulSet的Pod名称格式：{statefulSetName}-{ordinal}）
			for _, pod := range allPods {
				if strings.HasPrefix(pod.Name, statefulSetName+"-") {
					pods = append(pods, pod)
				}
			}
		}
	}

	var podList []map[string]interface{}
	for _, pod := range pods {
		images := make([]string, 0)
		for _, container := range pod.Spec.Containers {
			images = append(images, container.Image)
		}

		updatedAt := pod.CreationTimestamp.Time
		if pod.Status.StartTime != nil {
			updatedAt = pod.Status.StartTime.Time
		}

		nodeIP := ""

		podInfo := map[string]interface{}{
			"name":         pod.Name,
			"namespace":    pod.Namespace,
			"status":       string(pod.Status.Phase),
			"node":         pod.Spec.NodeName,
			"nodeIP":       nodeIP,
			"podIP":        pod.Status.PodIP,
			"restarts":     getPodRestartCount(&pod),
			"age":          getPodAge(pod.CreationTimestamp.Time),
			"created_at":   pod.CreationTimestamp.Time,
			"updated_at":   updatedAt,
			"labels":       pod.Labels,
			"annotations":  pod.Annotations,
			"containers":  len(pod.Spec.Containers),
			"images":       images,
			"ready":        getPodReadyStatus(&pod),
		}
		podList = append(podList, podInfo)
	}

	utils.Success(c, podList)
}

// UpdateStatefulSet 更新StatefulSet
func (h *K8sHandler) UpdateStatefulSet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var req struct {
		Replicas    *int32           `json:"replicas"`
		Image       string           `json:"image"`
		Labels      map[string]string `json:"labels"`
		Annotations map[string]string `json:"annotations"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	statefulSet, err := client.GetStatefulSet(ctx, namespace, statefulSetName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "StatefulSet不存在")
		} else {
			utils.InternalServerError(c, "获取StatefulSet失败: "+err.Error())
		}
		return
	}

	// 更新副本数
	if req.Replicas != nil {
		statefulSet.Spec.Replicas = req.Replicas
	}

	// 更新镜像（更新第一个容器）
	if req.Image != "" && len(statefulSet.Spec.Template.Spec.Containers) > 0 {
		statefulSet.Spec.Template.Spec.Containers[0].Image = req.Image
	}

	// 更新标签
	if req.Labels != nil {
		if statefulSet.Labels == nil {
			statefulSet.Labels = make(map[string]string)
		}
		for k, v := range req.Labels {
			if v == "" {
				delete(statefulSet.Labels, k)
			} else {
				statefulSet.Labels[k] = v
			}
		}
		if statefulSet.Spec.Selector != nil {
			if statefulSet.Spec.Selector.MatchLabels == nil {
				statefulSet.Spec.Selector.MatchLabels = make(map[string]string)
			}
			for k, v := range req.Labels {
				if v == "" {
					delete(statefulSet.Spec.Selector.MatchLabels, k)
				} else {
					statefulSet.Spec.Selector.MatchLabels[k] = v
				}
			}
		}
		if statefulSet.Spec.Template.Labels == nil {
			statefulSet.Spec.Template.Labels = make(map[string]string)
		}
		for k, v := range req.Labels {
			if v == "" {
				delete(statefulSet.Spec.Template.Labels, k)
			} else {
				statefulSet.Spec.Template.Labels[k] = v
			}
		}
	}

	// 更新注解
	if req.Annotations != nil {
		if statefulSet.Annotations == nil {
			statefulSet.Annotations = make(map[string]string)
		}
		for k, v := range req.Annotations {
			if v == "" {
				delete(statefulSet.Annotations, k)
			} else {
				statefulSet.Annotations[k] = v
			}
		}
		if statefulSet.Spec.Template.Annotations == nil {
			statefulSet.Spec.Template.Annotations = make(map[string]string)
		}
		for k, v := range req.Annotations {
			if v == "" {
				delete(statefulSet.Spec.Template.Annotations, k)
			} else {
				statefulSet.Spec.Template.Annotations[k] = v
			}
		}
	}

	_, err = client.UpdateStatefulSet(ctx, namespace, statefulSet)
	if err != nil {
		utils.InternalServerError(c, "更新StatefulSet失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "StatefulSet更新成功"})
}

// ScaleStatefulSet 伸缩StatefulSet（修改副本数）
func (h *K8sHandler) ScaleStatefulSet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var req struct {
		Replicas int32 `json:"replicas" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if req.Replicas < 0 {
		utils.BadRequest(c, "副本数不能为负数")
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = client.ScaleStatefulSet(ctx, namespace, statefulSetName, req.Replicas)
	if err != nil {
		utils.InternalServerError(c, "伸缩StatefulSet失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "StatefulSet伸缩成功", "replicas": req.Replicas})
}

// GetStatefulSetYAML 获取StatefulSet的YAML
func (h *K8sHandler) GetStatefulSetYAML(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	statefulSet, err := client.GetStatefulSet(ctx, namespace, statefulSetName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "StatefulSet不存在")
		} else {
			utils.InternalServerError(c, "获取StatefulSet失败: "+err.Error())
		}
		return
	}

	yamlBytes, err := yaml.Marshal(statefulSet)
	if err != nil {
		utils.InternalServerError(c, "转换为YAML失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"yaml": string(yamlBytes)})
}

// UpdateStatefulSetYAML 通过YAML更新StatefulSet
func (h *K8sHandler) UpdateStatefulSetYAML(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var req struct {
		YAML string `json:"yaml" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var statefulSet appsv1.StatefulSet
	if err := yaml.Unmarshal([]byte(req.YAML), &statefulSet); err != nil {
		utils.BadRequest(c, "YAML格式错误: "+err.Error())
		return
	}

	statefulSet.Name = statefulSetName
	statefulSet.Namespace = namespace

	_, err = client.UpdateStatefulSet(ctx, namespace, &statefulSet)
	if err != nil {
		utils.InternalServerError(c, "更新StatefulSet失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "StatefulSet更新成功"})
}

// RedeployStatefulSet 重新部署StatefulSet
func (h *K8sHandler) RedeployStatefulSet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	statefulSet, err := client.GetStatefulSet(ctx, namespace, statefulSetName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "StatefulSet不存在")
		} else {
			utils.InternalServerError(c, "获取StatefulSet失败: "+err.Error())
		}
		return
	}

	if statefulSet.Spec.Template.Annotations == nil {
		statefulSet.Spec.Template.Annotations = make(map[string]string)
	}
	statefulSet.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	_, err = client.UpdateStatefulSet(ctx, namespace, statefulSet)
	if err != nil {
		utils.InternalServerError(c, "重新部署StatefulSet失败: "+err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "StatefulSet重新部署成功"})
}

// DeleteStatefulSet 删除StatefulSet
func (h *K8sHandler) DeleteStatefulSet(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = client.DeleteStatefulSet(ctx, namespace, statefulSetName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "StatefulSet不存在")
		} else {
			utils.InternalServerError(c, "删除StatefulSet失败: "+err.Error())
		}
		return
	}

	utils.Success(c, gin.H{"message": "StatefulSet删除成功"})
}

// GetStatefulSetCost 获取StatefulSet成本信息
func (h *K8sHandler) GetStatefulSetCost(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	statefulSetName := c.Param("statefulSetName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	statefulSet, err := client.GetStatefulSet(ctx, namespace, statefulSetName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "StatefulSet不存在")
		} else {
			utils.InternalServerError(c, "获取StatefulSet失败: "+err.Error())
		}
		return
	}

	var totalCPU float64
	var totalMemory float64
	var totalStorage float64

	replicas := int32(1)
	if statefulSet.Spec.Replicas != nil {
		replicas = *statefulSet.Spec.Replicas
	}

	for _, container := range statefulSet.Spec.Template.Spec.Containers {
		if container.Resources.Requests != nil {
			if cpuReq, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
				cpuValue := cpuReq.MilliValue() / 1000.0
				totalCPU += float64(cpuValue) * float64(replicas)
			}
			if memReq, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
				memValue := memReq.Value() / (1024 * 1024 * 1024)
				totalMemory += float64(memValue) * float64(replicas)
			}
		}
	}

	cpuCostPerHour := 0.1
	cpuCost := totalCPU * cpuCostPerHour * 24 * 30

	memoryCostPerHour := 0.05
	memoryCost := totalMemory * memoryCostPerHour * 24 * 30

	storageCostPerMonth := 0.1
	storageCost := totalStorage * storageCostPerMonth

	networkCost := 10.0

	totalCost := cpuCost + memoryCost + storageCost + networkCost

	costInfo := map[string]interface{}{
		"totalCost":    totalCost,
		"cpuCost":      cpuCost,
		"memoryCost":   memoryCost,
		"storageCost":  storageCost,
		"networkCost":  networkCost,
		"cpuUsage":     totalCPU,
		"memoryUsage":  totalMemory,
		"storageUsage": totalStorage,
		"costBreakdown": map[string]interface{}{
			"daily":   totalCost / 30,
			"monthly": totalCost,
			"yearly":  totalCost * 12,
		},
	}

	utils.Success(c, costInfo)
}

// GetDaemonSets 获取DaemonSet列表
func (h *K8sHandler) GetDaemonSets(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	daemonSets, err := client.GetDaemonSets(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取DaemonSet列表失败: "+err.Error())
		return
	}

	var daemonSetList []map[string]interface{}
	for _, ds := range daemonSets {
		daemonSetInfo := map[string]interface{}{
			"name":            ds.Name,
			"namespace":       ds.Namespace,
			"desired":         ds.Status.DesiredNumberScheduled,
			"current":         ds.Status.CurrentNumberScheduled,
			"ready":           ds.Status.NumberReady,
			"available":       ds.Status.NumberAvailable,
			"age":             getPodAge(ds.CreationTimestamp.Time),
			"created_at":      ds.CreationTimestamp.Time,
		}
		daemonSetList = append(daemonSetList, daemonSetInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(daemonSetList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, daemonSetList)
	}
}

// GetJobs 获取Job列表
func (h *K8sHandler) GetJobs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jobs, err := client.GetJobs(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取Job列表失败: "+err.Error())
		return
	}

	var jobList []map[string]interface{}
	for _, job := range jobs {
		completions := int32(0)
		if job.Spec.Completions != nil {
			completions = *job.Spec.Completions
		}
		succeeded := int32(0)
		if job.Status.Succeeded > 0 {
			succeeded = job.Status.Succeeded
		}

		jobInfo := map[string]interface{}{
			"name":        job.Name,
			"namespace":   job.Namespace,
			"completions": completions,
			"succeeded":   succeeded,
			"active":      job.Status.Active,
			"failed":      job.Status.Failed,
			"age":         getPodAge(job.CreationTimestamp.Time),
			"created_at":  job.CreationTimestamp.Time,
		}
		jobList = append(jobList, jobInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(jobList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, jobList)
	}
}

// GetCronJobs 获取CronJob列表
func (h *K8sHandler) GetCronJobs(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Query("namespace") // 可选参数

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFound(c, "集群不存在")
		} else {
			utils.InternalServerError(c, "获取集群信息失败: "+err.Error())
		}
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.BadRequest(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cronJobs, err := client.GetCronJobs(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取CronJob列表失败: "+err.Error())
		return
	}

	var cronJobList []map[string]interface{}
	for _, cj := range cronJobs {
		lastScheduleTime := ""
		if cj.Status.LastScheduleTime != nil {
			lastScheduleTime = cj.Status.LastScheduleTime.Time.Format(time.RFC3339)
		}
		lastSuccessfulTime := ""
		if cj.Status.LastSuccessfulTime != nil {
			lastSuccessfulTime = cj.Status.LastSuccessfulTime.Time.Format(time.RFC3339)
		}

		cronJobInfo := map[string]interface{}{
			"name":               cj.Name,
			"namespace":          cj.Namespace,
			"schedule":            cj.Spec.Schedule,
			"lastScheduleTime":   lastScheduleTime,
			"lastSuccessfulTime": lastSuccessfulTime,
			"active":             len(cj.Status.Active),
			"suspend":            cj.Spec.Suspend != nil && *cj.Spec.Suspend,
			"age":                getPodAge(cj.CreationTimestamp.Time),
			"created_at":         cj.CreationTimestamp.Time,
		}
		cronJobList = append(cronJobList, cronJobInfo)
	}

	// 内存分页
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
	}
	if err := c.ShouldBindQuery(&req); err == nil {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.PageSize == 0 {
			req.PageSize = 20
		}
		pagedList, total := paginateSlice(cronJobList, req.Page, req.PageSize)
		utils.Success(c, gin.H{
			"data":      pagedList,
			"total":     total,
			"page":      req.Page,
			"page_size": req.PageSize,
		})
	} else {
		utils.Success(c, cronJobList)
	}
}

// 辅助函数：获取节点角色
func getNodeRoles(node *corev1.Node) []string {
	var roles []string
	for key := range node.Labels {
		if key == "node-role.kubernetes.io/master" || key == "node-role.kubernetes.io/control-plane" {
			roles = append(roles, "master")
		} else if key == "node-role.kubernetes.io/worker" {
			roles = append(roles, "worker")
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker")
	}
	return roles
}

// 辅助函数：获取Pod重启次数
func getPodRestartCount(pod *corev1.Pod) int32 {
	var restarts int32
	if pod.Status.ContainerStatuses != nil {
		for _, containerStatus := range pod.Status.ContainerStatuses {
			restarts += containerStatus.RestartCount
		}
	}
	return restarts
}

// 辅助函数：获取Pod年龄
func getPodAge(createdAt time.Time) string {
	age := time.Since(createdAt)
	if age.Hours() >= 24 {
		return fmt.Sprintf("%.0fd", age.Hours()/24)
	} else if age.Hours() >= 1 {
		return fmt.Sprintf("%.0fh", age.Hours())
	} else {
		return fmt.Sprintf("%.0fm", age.Minutes())
	}
}

// 辅助函数：获取Pod就绪状态
func getPodReadyStatus(pod *corev1.Pod) string {
	readyCount := 0
	totalCount := len(pod.Spec.Containers)
	if pod.Status.ContainerStatuses != nil {
		for _, containerStatus := range pod.Status.ContainerStatuses {
			if containerStatus.Ready {
				readyCount++
			}
		}
	}
	if totalCount == 0 {
		return "0/0"
	}
	return fmt.Sprintf("%d/%d", readyCount, totalCount)
}

// GetDeploymentHistory 获取Deployment的历史版本
func (h *K8sHandler) GetDeploymentHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取所有ReplicaSet
	replicaSets, err := client.GetReplicaSets(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取ReplicaSet列表失败: "+err.Error())
		return
	}

	// 筛选属于该Deployment的ReplicaSet
	var deploymentReplicaSets []appsv1.ReplicaSet
	for _, rs := range replicaSets {
		if rs.OwnerReferences != nil {
			for _, owner := range rs.OwnerReferences {
				if owner.Kind == "Deployment" && owner.Name == deploymentName {
					deploymentReplicaSets = append(deploymentReplicaSets, rs)
					break
				}
			}
		}
	}

	// 提取版本信息
	var result []map[string]interface{}
	for _, rs := range deploymentReplicaSets {
		// 获取revision（从annotations中）
		revision := int64(0)
		if rs.Annotations != nil {
			if revStr, ok := rs.Annotations["deployment.kubernetes.io/revision"]; ok {
				if rev, err := strconv.ParseInt(revStr, 10, 64); err == nil {
					revision = rev
				}
			}
		}

		// 获取镜像信息（从第一个容器）
		image := "-"
		if len(rs.Spec.Template.Spec.Containers) > 0 {
			image = rs.Spec.Template.Spec.Containers[0].Image
		}

		// 获取创建时间
		createdAt := rs.CreationTimestamp.Time

		result = append(result, map[string]interface{}{
			"revision":  revision,
			"image":     image,
			"createdAt": createdAt,
			"name":      rs.Name,
		})
	}

	// 按revision降序排序（最新版本在前）
	sort.Slice(result, func(i, j int) bool {
		revI := result[i]["revision"].(int64)
		revJ := result[j]["revision"].(int64)
		return revI > revJ
	})

	utils.Success(c, result)
}

// GetDeploymentHistoryRevision 获取指定版本的详情
func (h *K8sHandler) GetDeploymentHistoryRevision(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")
	revisionStr := c.Param("revision")

	revision, err := strconv.ParseInt(revisionStr, 10, 64)
	if err != nil {
		utils.BadRequest(c, "无效的版本号")
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取所有ReplicaSet
	replicaSets, err := client.GetReplicaSets(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取ReplicaSet列表失败: "+err.Error())
		return
	}

	// 找到指定版本的ReplicaSet
	var targetReplicaSet *appsv1.ReplicaSet
	for _, rs := range replicaSets {
		if rs.OwnerReferences != nil {
			for _, owner := range rs.OwnerReferences {
				if owner.Kind == "Deployment" && owner.Name == deploymentName {
					if rs.Annotations != nil {
						if revStr, ok := rs.Annotations["deployment.kubernetes.io/revision"]; ok {
							if rev, err := strconv.ParseInt(revStr, 10, 64); err == nil && rev == revision {
								targetReplicaSet = &rs
								break
							}
						}
					}
					break
				}
			}
		}
		if targetReplicaSet != nil {
			break
		}
	}

	if targetReplicaSet == nil {
		utils.NotFound(c, "找不到指定版本")
		return
	}

	// 转换为YAML
	yamlData, err := yaml.Marshal(targetReplicaSet)
	if err != nil {
		utils.InternalServerError(c, "转换YAML失败: "+err.Error())
		return
	}

	utils.Success(c, map[string]interface{}{
		"revision": revision,
		"yaml":     string(yamlData),
		"name":     targetReplicaSet.Name,
	})
}

// RollbackDeployment 回滚Deployment到指定版本
func (h *K8sHandler) RollbackDeployment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未找到用户信息")
		return
	}

	clusterID := c.Param("id")
	namespace := c.Param("namespace")
	deploymentName := c.Param("deploymentName")

	var req struct {
		Revision int64 `json:"revision"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "无效的请求参数")
		return
	}

	var cluster models.K8sCluster
	if err := h.db.Where("id = ? AND user_id = ?", clusterID, userID).First(&cluster).Error; err != nil {
		utils.NotFound(c, "集群不存在")
		return
	}

	client, err := k8s.NewClientFromConfig(cluster.Config)
	if err != nil {
		utils.InternalServerError(c, "创建K8s客户端失败: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取Deployment
	deployment, err := client.GetDeployment(ctx, namespace, deploymentName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.NotFound(c, "Deployment不存在")
		} else {
			utils.InternalServerError(c, "获取Deployment失败: "+err.Error())
		}
		return
	}

	// 获取所有ReplicaSet
	replicaSets, err := client.GetReplicaSets(ctx, namespace)
	if err != nil {
		utils.InternalServerError(c, "获取ReplicaSet列表失败: "+err.Error())
		return
	}

	// 找到指定版本的ReplicaSet
	var targetReplicaSet *appsv1.ReplicaSet
	for _, rs := range replicaSets {
		if rs.OwnerReferences != nil {
			for _, owner := range rs.OwnerReferences {
				if owner.Kind == "Deployment" && owner.Name == deploymentName {
					if rs.Annotations != nil {
						if revStr, ok := rs.Annotations["deployment.kubernetes.io/revision"]; ok {
							if rev, err := strconv.ParseInt(revStr, 10, 64); err == nil && rev == req.Revision {
								targetReplicaSet = &rs
								break
							}
						}
					}
					break
				}
			}
		}
		if targetReplicaSet != nil {
			break
		}
	}

	if targetReplicaSet == nil {
		utils.NotFound(c, "找不到指定版本")
		return
	}

	// 回滚：将Deployment的spec更新为指定版本的ReplicaSet的spec
	deployment.Spec.Template = targetReplicaSet.Spec.Template

	// 更新Deployment（需要通过client的方法）
	// 由于client没有暴露clientset，我们需要通过其他方式更新
	// 这里使用dynamic client或者直接调用API
	// 暂时使用GetDeployment和UpdateDeployment的组合
	// 注意：需要确保client有UpdateDeployment方法，如果没有，需要添加
	
	// 使用kubectl rollback命令的等价操作：更新Deployment的spec
	// 由于client封装可能没有直接暴露，我们通过获取并更新实现
	appsClient := client.GetClientset().AppsV1()
	_, err = appsClient.Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		utils.InternalServerError(c, "回滚失败: "+err.Error())
		return
	}

	utils.Success(c, map[string]interface{}{
		"message": "回滚成功",
		"revision": req.Revision,
	})
}
