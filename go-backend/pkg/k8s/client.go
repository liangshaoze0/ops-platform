package k8s

import (
	"context"
	"fmt"
	"io"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	autoscalingv2client "k8s.io/client-go/kubernetes/typed/autoscaling/v2"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"sigs.k8s.io/yaml"
)

// Client K8s客户端封装
type Client struct {
	clientset           *kubernetes.Clientset
	config              *rest.Config
	dynamicClient       dynamic.Interface
	discoveryClient     discovery.CachedDiscoveryInterface
	autoscalingV2Client autoscalingv2client.AutoscalingV2Interface
}

// NewClientFromConfig 从kubeconfig字符串创建K8s客户端
func NewClientFromConfig(kubeconfig string) (*Client, error) {
	// 解析kubeconfig
	configObj, err := clientcmd.Load([]byte(kubeconfig))
	if err != nil {
		return nil, fmt.Errorf("加载kubeconfig失败: %w", err)
	}

	// 构建REST配置
	config, err := clientcmd.NewDefaultClientConfig(*configObj, &clientcmd.ConfigOverrides{}).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("解析kubeconfig失败: %w", err)
	}

	// 设置超时
	config.Timeout = 30 * time.Second

	// 创建clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("创建K8s客户端失败: %w", err)
	}

	// 创建dynamic client用于创建任意资源
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("创建动态客户端失败: %w", err)
	}

	// 创建discovery client用于资源发现
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("创建发现客户端失败: %w", err)
	}

	// 创建cached discovery client以支持restmapper
	cachedDiscoveryClient := memory.NewMemCacheClient(discoveryClient)

	// 创建autoscaling v2 client
	autoscalingV2Client := clientset.AutoscalingV2()

	return &Client{
		clientset:           clientset,
		config:              config,
		dynamicClient:       dynamicClient,
		discoveryClient:     cachedDiscoveryClient,
		autoscalingV2Client: autoscalingV2Client,
	}, nil
}

// TestConnection 测试连接
func (c *Client) TestConnection(ctx context.Context) error {
	_, err := c.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{Limit: 1})
	return err
}

// GetClusterInfo 获取集群信息
func (c *Client) GetClusterInfo(ctx context.Context) (map[string]interface{}, error) {
	info := make(map[string]interface{})

	// 获取版本信息
	version, err := c.clientset.Discovery().ServerVersion()
	if err != nil {
		return nil, fmt.Errorf("获取版本信息失败: %w", err)
	}

	info["version"] = map[string]string{
		"gitVersion": version.GitVersion,
		"platform":   version.Platform,
	}

	// 获取节点数量
	nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err == nil {
		info["nodeCount"] = len(nodes.Items)
	}

	// 获取命名空间数量
	namespaces, err := c.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err == nil {
		info["namespaceCount"] = len(namespaces.Items)
	}

	return info, nil
}

// GetDynamicClient 获取dynamic client
func (c *Client) GetDynamicClient() dynamic.Interface {
	return c.dynamicClient
}

// GetAutoscalingV2Client 获取autoscaling v2 client
func (c *Client) GetAutoscalingV2Client() autoscalingv2client.AutoscalingV2Interface {
	return c.autoscalingV2Client
}

// GetClientset 获取kubernetes clientset
func (c *Client) GetClientset() *kubernetes.Clientset {
	return c.clientset
}

// GetNodes 获取节点列表
func (c *Client) GetNodes(ctx context.Context) ([]corev1.Node, error) {
	nodes, err := c.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取节点列表失败: %w", err)
	}
	return nodes.Items, nil
}

// GetNode 获取单个节点详情
func (c *Client) GetNode(ctx context.Context, name string) (*corev1.Node, error) {
	node, err := c.clientset.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取节点详情失败: %w", err)
	}
	return node, nil
}

// GetNamespaces 获取命名空间列表
func (c *Client) GetNamespaces(ctx context.Context) ([]corev1.Namespace, error) {
	namespaces, err := c.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取命名空间列表失败: %w", err)
	}
	return namespaces.Items, nil
}

// GetNamespace 获取单个命名空间详情
func (c *Client) GetNamespace(ctx context.Context, name string) (*corev1.Namespace, error) {
	namespace, err := c.clientset.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取命名空间详情失败: %w", err)
	}
	return namespace, nil
}

// CreateNamespace 创建命名空间
func (c *Client) CreateNamespace(ctx context.Context, name string, labels map[string]string, deletionProtection bool) (*corev1.Namespace, error) {
	namespace := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   name,
			Labels: labels,
		},
	}

	// 如果启用删除保护，添加 finalizer
	if deletionProtection {
		namespace.Finalizers = []string{"kubernetes"}
	}

	created, err := c.clientset.CoreV1().Namespaces().Create(ctx, namespace, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("创建命名空间失败: %w", err)
	}
	return created, nil
}

// UpdateNamespace 更新命名空间
func (c *Client) UpdateNamespace(ctx context.Context, name string, labels map[string]string, deletionProtection bool) (*corev1.Namespace, error) {
	// 先获取现有的命名空间
	namespace, err := c.clientset.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取命名空间失败: %w", err)
	}

	// 更新标签
	if namespace.Labels == nil {
		namespace.Labels = make(map[string]string)
	}
	for k, v := range labels {
		namespace.Labels[k] = v
	}

	// 更新删除保护（finalizer）
	if deletionProtection {
		// 检查是否已有 finalizer
		hasFinalizer := false
		for _, f := range namespace.Finalizers {
			if f == "kubernetes" {
				hasFinalizer = true
				break
			}
		}
		if !hasFinalizer {
			namespace.Finalizers = append(namespace.Finalizers, "kubernetes")
		}
	} else {
		// 移除 finalizer
		finalizers := []string{}
		for _, f := range namespace.Finalizers {
			if f != "kubernetes" {
				finalizers = append(finalizers, f)
			}
		}
		namespace.Finalizers = finalizers
	}

	updated, err := c.clientset.CoreV1().Namespaces().Update(ctx, namespace, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新命名空间失败: %w", err)
	}
	return updated, nil
}

// DeleteNamespace 删除命名空间
func (c *Client) DeleteNamespace(ctx context.Context, name string) error {
	err := c.clientset.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("删除命名空间失败: %w", err)
	}
	return nil
}

// GetNamespaceYAML 获取命名空间的YAML格式
func (c *Client) GetNamespaceYAML(ctx context.Context, name string) (string, error) {
	namespace, err := c.clientset.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("获取命名空间失败: %w", err)
	}

	// 转换为YAML
	yamlBytes, err := yaml.Marshal(namespace)
	if err != nil {
		return "", fmt.Errorf("转换为YAML失败: %w", err)
	}

	return string(yamlBytes), nil
}

// UpdateNamespaceFromYAML 从YAML更新命名空间
func (c *Client) UpdateNamespaceFromYAML(ctx context.Context, yamlContent string) (*corev1.Namespace, error) {
	var namespace corev1.Namespace
	if err := yaml.Unmarshal([]byte(yamlContent), &namespace); err != nil {
		return nil, fmt.Errorf("解析YAML失败: %w", err)
	}

	updated, err := c.clientset.CoreV1().Namespaces().Update(ctx, &namespace, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新命名空间失败: %w", err)
	}

	return updated, nil
}

// GetPods 获取Pod列表（可选命名空间）
func (c *Client) GetPods(ctx context.Context, namespace string) ([]corev1.Pod, error) {
	var pods *corev1.PodList
	var err error
	if namespace == "" {
		pods, err = c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	} else {
		pods, err = c.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取Pod列表失败: %w", err)
	}
	return pods.Items, nil
}

// GetServices 获取Service列表（可选命名空间）
func (c *Client) GetServices(ctx context.Context, namespace string) ([]corev1.Service, error) {
	var services *corev1.ServiceList
	var err error
	if namespace == "" {
		services, err = c.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	} else {
		services, err = c.clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取Service列表失败: %w", err)
	}
	return services.Items, nil
}

// GetIngresses 获取Ingress列表（可选命名空间）
func (c *Client) GetIngresses(ctx context.Context, namespace string) ([]networkingv1.Ingress, error) {
	var ingresses *networkingv1.IngressList
	var err error
	if namespace == "" {
		ingresses, err = c.clientset.NetworkingV1().Ingresses("").List(ctx, metav1.ListOptions{})
	} else {
		ingresses, err = c.clientset.NetworkingV1().Ingresses(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取Ingress列表失败: %w", err)
	}
	return ingresses.Items, nil
}

// GetConfigMaps 获取ConfigMap列表（可选命名空间）
func (c *Client) GetConfigMaps(ctx context.Context, namespace string) ([]corev1.ConfigMap, error) {
	var configMaps *corev1.ConfigMapList
	var err error
	if namespace == "" {
		configMaps, err = c.clientset.CoreV1().ConfigMaps("").List(ctx, metav1.ListOptions{})
	} else {
		configMaps, err = c.clientset.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取ConfigMap列表失败: %w", err)
	}
	return configMaps.Items, nil
}

// GetSecrets 获取Secret列表（可选命名空间）
func (c *Client) GetSecrets(ctx context.Context, namespace string) ([]corev1.Secret, error) {
	var secrets *corev1.SecretList
	var err error
	if namespace == "" {
		secrets, err = c.clientset.CoreV1().Secrets("").List(ctx, metav1.ListOptions{})
	} else {
		secrets, err = c.clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取Secret列表失败: %w", err)
	}
	return secrets.Items, nil
}

// GetPersistentVolumeClaims 获取PVC列表（可选命名空间）
func (c *Client) GetPersistentVolumeClaims(ctx context.Context, namespace string) ([]corev1.PersistentVolumeClaim, error) {
	var pvcs *corev1.PersistentVolumeClaimList
	var err error
	if namespace == "" {
		pvcs, err = c.clientset.CoreV1().PersistentVolumeClaims("").List(ctx, metav1.ListOptions{})
	} else {
		pvcs, err = c.clientset.CoreV1().PersistentVolumeClaims(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取PVC列表失败: %w", err)
	}
	return pvcs.Items, nil
}

// GetPersistentVolumes 获取PV列表
func (c *Client) GetPersistentVolumes(ctx context.Context) ([]corev1.PersistentVolume, error) {
	pvs, err := c.clientset.CoreV1().PersistentVolumes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取PV列表失败: %w", err)
	}
	return pvs.Items, nil
}

// GetStorageClasses 获取StorageClass列表
func (c *Client) GetStorageClasses(ctx context.Context) ([]storagev1.StorageClass, error) {
	storageClasses, err := c.clientset.StorageV1().StorageClasses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取StorageClass列表失败: %w", err)
	}
	return storageClasses.Items, nil
}

// GetPod 获取单个Pod
func (c *Client) GetPod(ctx context.Context, namespace, podName string) (*corev1.Pod, error) {
	pod, err := c.clientset.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取Pod失败: %w", err)
	}
	return pod, nil
}

// UpdatePod 更新Pod
func (c *Client) UpdatePod(ctx context.Context, namespace string, pod *corev1.Pod) (*corev1.Pod, error) {
	updatedPod, err := c.clientset.CoreV1().Pods(namespace).Update(ctx, pod, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新Pod失败: %w", err)
	}
	return updatedPod, nil
}

// GetPodLogs 获取Pod日志
func (c *Client) GetPodLogs(ctx context.Context, namespace, podName, containerName string, tailLines int64) (string, error) {
	opts := &corev1.PodLogOptions{
		TailLines: &tailLines,
	}
	if containerName != "" {
		opts.Container = containerName
	}

	req := c.clientset.CoreV1().Pods(namespace).GetLogs(podName, opts)

	logs, err := req.Stream(ctx)
	if err != nil {
		return "", fmt.Errorf("获取Pod日志失败: %w", err)
	}
	defer logs.Close()

	buf := make([]byte, 4096)
	var result []byte
	for {
		n, err := logs.Read(buf)
		if n > 0 {
			result = append(result, buf[:n]...)
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("读取日志失败: %w", err)
		}
	}

	return string(result), nil
}

// GetDeployments 获取Deployment列表（可选命名空间）
func (c *Client) GetDeployments(ctx context.Context, namespace string) ([]appsv1.Deployment, error) {
	var deployments *appsv1.DeploymentList
	var err error
	if namespace == "" {
		deployments, err = c.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	} else {
		deployments, err = c.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取Deployment列表失败: %w", err)
	}
	return deployments.Items, nil
}

// GetDeployment 获取单个Deployment详情
func (c *Client) GetDeployment(ctx context.Context, namespace, name string) (*appsv1.Deployment, error) {
	deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取Deployment详情失败: %w", err)
	}
	return deployment, nil
}

// UpdateDeployment 更新Deployment
func (c *Client) UpdateDeployment(ctx context.Context, namespace string, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
	updated, err := c.clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新Deployment失败: %w", err)
	}
	return updated, nil
}

// ScaleDeployment 伸缩Deployment（修改副本数）
func (c *Client) ScaleDeployment(ctx context.Context, namespace, name string, replicas int32) error {
	// 获取现有Deployment
	deployment, err := c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("获取Deployment失败: %w", err)
	}

	// 更新副本数
	deployment.Spec.Replicas = &replicas

	// 更新Deployment
	_, err = c.clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("更新Deployment失败: %w", err)
	}

	return nil
}

// DeleteDeployment 删除Deployment
func (c *Client) DeleteDeployment(ctx context.Context, namespace, name string) error {
	err := c.clientset.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("删除Deployment失败: %w", err)
	}
	return nil
}

// GetPodsBySelector 根据selector获取Pod列表
func (c *Client) GetPodsBySelector(ctx context.Context, namespace string, selector map[string]string) ([]corev1.Pod, error) {
	// 如果selector为空，返回空列表
	if len(selector) == 0 {
		return []corev1.Pod{}, nil
	}

	labelSelector := metav1.LabelSelector{
		MatchLabels: selector,
	}
	selectorObj, err := metav1.LabelSelectorAsSelector(&labelSelector)
	if err != nil {
		return nil, fmt.Errorf("构建selector失败: %w", err)
	}

	var pods *corev1.PodList
	if namespace == "" {
		pods, err = c.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{
			LabelSelector: selectorObj.String(),
		})
	} else {
		pods, err = c.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{
			LabelSelector: selectorObj.String(),
		})
	}
	if err != nil {
		return nil, fmt.Errorf("获取Pod列表失败: %w", err)
	}
	return pods.Items, nil
}

// GetReplicaSets 获取ReplicaSet列表（可选命名空间）
func (c *Client) GetReplicaSets(ctx context.Context, namespace string) ([]appsv1.ReplicaSet, error) {
	var replicaSets *appsv1.ReplicaSetList
	var err error
	if namespace == "" {
		replicaSets, err = c.clientset.AppsV1().ReplicaSets("").List(ctx, metav1.ListOptions{})
	} else {
		replicaSets, err = c.clientset.AppsV1().ReplicaSets(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取ReplicaSet列表失败: %w", err)
	}
	return replicaSets.Items, nil
}

// GetStatefulSet 获取单个StatefulSet详情
func (c *Client) GetStatefulSet(ctx context.Context, namespace, name string) (*appsv1.StatefulSet, error) {
	statefulSet, err := c.clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取StatefulSet详情失败: %w", err)
	}
	return statefulSet, nil
}

// UpdateStatefulSet 更新StatefulSet
func (c *Client) UpdateStatefulSet(ctx context.Context, namespace string, statefulSet *appsv1.StatefulSet) (*appsv1.StatefulSet, error) {
	updated, err := c.clientset.AppsV1().StatefulSets(namespace).Update(ctx, statefulSet, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("更新StatefulSet失败: %w", err)
	}
	return updated, nil
}

// ScaleStatefulSet 伸缩StatefulSet（修改副本数）
func (c *Client) ScaleStatefulSet(ctx context.Context, namespace, name string, replicas int32) error {
	// 获取现有StatefulSet
	statefulSet, err := c.clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("获取StatefulSet失败: %w", err)
	}

	// 更新副本数
	statefulSet.Spec.Replicas = &replicas

	// 更新StatefulSet
	_, err = c.clientset.AppsV1().StatefulSets(namespace).Update(ctx, statefulSet, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("更新StatefulSet失败: %w", err)
	}

	return nil
}

// DeleteStatefulSet 删除StatefulSet
func (c *Client) DeleteStatefulSet(ctx context.Context, namespace, name string) error {
	err := c.clientset.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("删除StatefulSet失败: %w", err)
	}
	return nil
}

// GetStatefulSets 获取StatefulSet列表（可选命名空间）
func (c *Client) GetStatefulSets(ctx context.Context, namespace string) ([]appsv1.StatefulSet, error) {
	var statefulSets *appsv1.StatefulSetList
	var err error
	if namespace == "" {
		statefulSets, err = c.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	} else {
		statefulSets, err = c.clientset.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取StatefulSet列表失败: %w", err)
	}
	return statefulSets.Items, nil
}

// GetDaemonSets 获取DaemonSet列表（可选命名空间）
func (c *Client) GetDaemonSets(ctx context.Context, namespace string) ([]appsv1.DaemonSet, error) {
	var daemonSets *appsv1.DaemonSetList
	var err error
	if namespace == "" {
		daemonSets, err = c.clientset.AppsV1().DaemonSets("").List(ctx, metav1.ListOptions{})
	} else {
		daemonSets, err = c.clientset.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取DaemonSet列表失败: %w", err)
	}
	return daemonSets.Items, nil
}

// GetJobs 获取Job列表（可选命名空间）
func (c *Client) GetJobs(ctx context.Context, namespace string) ([]batchv1.Job, error) {
	var jobs *batchv1.JobList
	var err error
	if namespace == "" {
		jobs, err = c.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{})
	} else {
		jobs, err = c.clientset.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取Job列表失败: %w", err)
	}
	return jobs.Items, nil
}

// GetCronJobs 获取CronJob列表（可选命名空间）
func (c *Client) GetCronJobs(ctx context.Context, namespace string) ([]batchv1.CronJob, error) {
	var cronJobs *batchv1.CronJobList
	var err error
	if namespace == "" {
		cronJobs, err = c.clientset.BatchV1().CronJobs("").List(ctx, metav1.ListOptions{})
	} else {
		cronJobs, err = c.clientset.BatchV1().CronJobs(namespace).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		return nil, fmt.Errorf("获取CronJob列表失败: %w", err)
	}
	return cronJobs.Items, nil
}

// CreateResourceFromYAML 从YAML创建Kubernetes资源
func (c *Client) CreateResourceFromYAML(ctx context.Context, yamlContent string) error {
	// 解析YAML为unstructured对象
	var obj unstructured.Unstructured
	if err := yaml.Unmarshal([]byte(yamlContent), &obj); err != nil {
		return fmt.Errorf("解析YAML失败: %w", err)
	}

	// 获取资源的GVK
	gvk := obj.GroupVersionKind()
	if gvk.Empty() {
		return fmt.Errorf("无法从YAML中获取资源类型")
	}

	// 获取REST映射
	// 使用discovery client创建mapper，NewDeferredDiscoveryRESTMapper接受DiscoveryInterface
	mapper := restmapper.NewDeferredDiscoveryRESTMapper(c.discoveryClient)
	mapping, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		return fmt.Errorf("获取REST映射失败: %w", err)
	}

	// 获取命名空间
	namespace := obj.GetNamespace()
	if namespace == "" {
		namespace = "default"
	}

	// 获取资源接口
	var dr dynamic.ResourceInterface
	if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
		dr = c.dynamicClient.Resource(mapping.Resource).Namespace(namespace)
	} else {
		dr = c.dynamicClient.Resource(mapping.Resource)
	}

	// 创建资源
	_, err = dr.Create(ctx, &obj, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("创建资源失败: %w", err)
	}

	return nil
}

// CreateDeployment 创建Deployment
func (c *Client) CreateDeployment(ctx context.Context, namespace string, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
	created, err := c.clientset.AppsV1().Deployments(namespace).Create(ctx, deployment, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("创建Deployment失败: %w", err)
	}
	return created, nil
}

// DeletePod 删除Pod
func (c *Client) DeletePod(ctx context.Context, namespace, podName string) error {
	deletePolicy := metav1.DeletePropagationForeground
	err := c.clientset.CoreV1().Pods(namespace).Delete(ctx, podName, metav1.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	})
	if err != nil {
		return fmt.Errorf("删除Pod失败: %w", err)
	}
	return nil
}
