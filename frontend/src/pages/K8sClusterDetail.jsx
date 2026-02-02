import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './K8sClusterDetail.css'

const K8sClusterDetail = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'info'
  const subtabFromUrl = searchParams.get('subtab') || ''
  const configSubtabFromUrl = searchParams.get('configSubtab') || 'configmaps'
  const networkSubtabFromUrl = searchParams.get('networkSubtab') || 'services'
  const storageSubtabFromUrl = searchParams.get('storageSubtab') || 'pvcs'
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [activeSubtab, setActiveSubtab] = useState(subtabFromUrl)
  const [configSubtab, setConfigSubtab] = useState(configSubtabFromUrl)
  const [networkSubtab, setNetworkSubtab] = useState(networkSubtabFromUrl)
  const [storageSubtab, setStorageSubtab] = useState(storageSubtabFromUrl)
  const [clusterInfo, setClusterInfo] = useState(null)
  const [nodes, setNodes] = useState([])
  const [namespaces, setNamespaces] = useState([])
  const [selectedNamespace, setSelectedNamespace] = useState(null)
  const [pods, setPods] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showYamlModal, setShowYamlModal] = useState(false)
  const [editingPod, setEditingPod] = useState(null)
  const [podYaml, setPodYaml] = useState('')
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [podLogs, setPodLogs] = useState('')
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showAnnotationsModal, setShowAnnotationsModal] = useState(false)
  const [editingLabels, setEditingLabels] = useState({})
  const [editingAnnotations, setEditingAnnotations] = useState({})
  const [workloads, setWorkloads] = useState([])
  const [services, setServices] = useState([])
  const [configMaps, setConfigMaps] = useState([])
  const [secrets, setSecrets] = useState([])
  const [pvcs, setPvcs] = useState([])
  const [pvs, setPvs] = useState([])
  const [storageClasses, setStorageClasses] = useState([])
  const [deployments, setDeployments] = useState([])
  const [statefulSets, setStatefulSets] = useState([])
  const [daemonSets, setDaemonSets] = useState([])
  const [jobs, setJobs] = useState([])
  const [cronJobs, setCronJobs] = useState([])
  // 从URL参数初始化状态（确保刷新后保持当前页面）
  const typeFromUrl = searchParams.get('type') || 'deployments'
  const namespaceFromUrl = searchParams.get('namespace') || ''
  const [workloadType, setWorkloadType] = useState(typeFromUrl)
  const [selectedWorkloadNamespace, setSelectedWorkloadNamespace] = useState(namespaceFromUrl)
  const [workloadSearchTerm, setWorkloadSearchTerm] = useState('')
  const [selectedNetworkNamespace, setSelectedNetworkNamespace] = useState(
    activeTab === 'network' ? namespaceFromUrl : ''
  )
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedIngresses, setSelectedIngresses] = useState([])
  const [servicesPage, setServicesPage] = useState(1)
  const [servicesPageSize, setServicesPageSize] = useState(20)
  const [servicesTotal, setServicesTotal] = useState(0)
  const [ingresses, setIngresses] = useState([])
  const [ingressesPage, setIngressesPage] = useState(1)
  const [ingressesPageSize, setIngressesPageSize] = useState(20)
  const [ingressesTotal, setIngressesTotal] = useState(0)
  const [networkSearchTerm, setNetworkSearchTerm] = useState('')
  // 从URL参数恢复deployment信息
  const deploymentNameFromUrl = searchParams.get('deployment')
  const deploymentNamespaceFromUrl = searchParams.get('deploymentNamespace')
  const [selectedDeployment, setSelectedDeployment] = useState(
    deploymentNameFromUrl && deploymentNamespaceFromUrl
      ? { name: deploymentNameFromUrl, namespace: deploymentNamespaceFromUrl }
      : null
  )
  const [deploymentDetail, setDeploymentDetail] = useState(null)
  const [isDeploymentFromUrl, setIsDeploymentFromUrl] = useState(
    !!(deploymentNameFromUrl && deploymentNamespaceFromUrl)
  )
  const [deploymentPods, setDeploymentPods] = useState([])
  const [deploymentDetailTab, setDeploymentDetailTab] = useState('pods')
  const [deploymentCostInfo, setDeploymentCostInfo] = useState(null)
  const [hpaList, setHpaList] = useState([])
  const [cronHpaList, setCronHpaList] = useState([])
  const [cronHpaInstalled, setCronHpaInstalled] = useState(false)
  const [showCreateHpaModal, setShowCreateHpaModal] = useState(false)
  const [showCreateCronHpaModal, setShowCreateCronHpaModal] = useState(false)
  const [editingHpa, setEditingHpa] = useState(null)
  const [editingCronHpa, setEditingCronHpa] = useState(null)
  const [deploymentHistoryVersions, setDeploymentHistoryVersions] = useState([])
  const [showEditDeploymentModal, setShowEditDeploymentModal] = useState(false)
  const [editingDeployment, setEditingDeployment] = useState(null)
  const [editDeploymentData, setEditDeploymentData] = useState({
    replicas: 1,
    image: '',
    labels: {},
    annotations: {}
  })
  const [showScaleDeploymentModal, setShowScaleDeploymentModal] = useState(false)
  const [scalingDeployment, setScalingDeployment] = useState(null)
  const [scaleReplicas, setScaleReplicas] = useState(1)
  const [showYamlEditModal, setShowYamlEditModal] = useState(false)
  const [editingDeploymentYaml, setEditingDeploymentYaml] = useState(null)
  const [deploymentYaml, setDeploymentYaml] = useState('')
  const [showNodeAffinityModal, setShowNodeAffinityModal] = useState(false)
  const [showTolerationModal, setShowTolerationModal] = useState(false)
  const [showResourceProfileModal, setShowResourceProfileModal] = useState(false)
  const [showUpgradeStrategyModal, setShowUpgradeStrategyModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [showRollbackModal, setShowRollbackModal] = useState(false)
  const [showMonitoringModal, setShowMonitoringModal] = useState(false)
  const [showOptimizationModal, setShowOptimizationModal] = useState(false)
  
  // 分页状态
  const [nodesPage, setNodesPage] = useState(1)
  const [nodesPageSize, setNodesPageSize] = useState(20)
  const [nodesTotal, setNodesTotal] = useState(0)
  const [namespacesPage, setNamespacesPage] = useState(1)
  const [namespacesPageSize, setNamespacesPageSize] = useState(20)
  const [namespacesTotal, setNamespacesTotal] = useState(0)
  const [podsPage, setPodsPage] = useState(1)
  const [podsPageSize, setPodsPageSize] = useState(20)
  const [podsTotal, setPodsTotal] = useState(0)
  const [workloadsPage, setWorkloadsPage] = useState(1)
  const [workloadsPageSize, setWorkloadsPageSize] = useState(20)
  const [workloadsTotal, setWorkloadsTotal] = useState(0)
  const [configMapsPage, setConfigMapsPage] = useState(1)
  const [configMapsPageSize, setConfigMapsPageSize] = useState(20)
  const [configMapsTotal, setConfigMapsTotal] = useState(0)
  const [secretsPage, setSecretsPage] = useState(1)
  const [secretsPageSize, setSecretsPageSize] = useState(20)
  const [secretsTotal, setSecretsTotal] = useState(0)
  const [selectedConfigMaps, setSelectedConfigMaps] = useState([])
  const [selectedSecrets, setSelectedSecrets] = useState([])
  const [configSearchTerm, setConfigSearchTerm] = useState('')
  const [selectedConfigNamespace, setSelectedConfigNamespace] = useState('')
  const [pvcsPage, setPvcsPage] = useState(1)
  const [pvcsPageSize, setPvcsPageSize] = useState(20)
  const [pvcsTotal, setPvcsTotal] = useState(0)
  const [pvsPage, setPvsPage] = useState(1)
  const [pvsPageSize, setPvsPageSize] = useState(20)
  const [pvsTotal, setPvsTotal] = useState(0)
  const [storageClassesPage, setStorageClassesPage] = useState(1)
  const [storageClassesPageSize, setStorageClassesPageSize] = useState(20)
  const [storageClassesTotal, setStorageClassesTotal] = useState(0)
  const [selectedStorageNamespace, setSelectedStorageNamespace] = useState('')
  const [storageSearchTerm, setStorageSearchTerm] = useState('')

  // 命名空间搜索和选择状态
  const [namespaceSearchTerm, setNamespaceSearchTerm] = useState('')
  const [namespaceSearchType, setNamespaceSearchType] = useState('name')
  const [selectedNamespaces, setSelectedNamespaces] = useState([])
  const [showCreateNamespaceModal, setShowCreateNamespaceModal] = useState(false)
  const [showEditNamespaceModal, setShowEditNamespaceModal] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [editingNamespace, setEditingNamespace] = useState(null)
  const [selectedDeployments, setSelectedDeployments] = useState([])
  const [selectedStatefulSets, setSelectedStatefulSets] = useState([])
  const [selectedJobs, setSelectedJobs] = useState([])
  const [selectedCronJobs, setSelectedCronJobs] = useState([])
  
  // 创建 Deployment 状态
  const [showCreateDeploymentModal, setShowCreateDeploymentModal] = useState(false)
  const [createDeploymentStep, setCreateDeploymentStep] = useState(1)
  const [createDeploymentData, setCreateDeploymentData] = useState({
    // 基本信息
    name: '',
    namespace: 'default',
    replicas: 2,
    type: 'Deployment',
    labels: {},
    annotations: {},
    timeZoneSync: false,
    // 容器配置
    containers: [{
      name: 'container-1',
      image: '',
      imagePullPolicy: 'IfNotPresent',
      imageSecret: '',
      cpuLimit: '',
      memoryLimit: '',
      ephemeralStorageLimit: '',
      gpuType: 'none',
      cpuRequest: '0.25',
      memoryRequest: '512Mi',
      ephemeralStorageRequest: '',
      stdin: false,
      tty: false,
      privileged: false,
      initContainer: false,
      ports: [],
      envVars: [],
    }],
    // 高级配置
    hpaEnabled: false,
    cronHpaEnabled: false,
    upgradeStrategy: false,
    nodeAffinity: [],
    podAffinity: [],
    podAntiAffinity: [],
    tolerations: [],
    podLabels: {},
    podAnnotations: {},
  })
  
  // StatefulSet 详情状态
  const [selectedStatefulSet, setSelectedStatefulSet] = useState(null)
  const [statefulSetDetail, setStatefulSetDetail] = useState(null)
  const [statefulSetPods, setStatefulSetPods] = useState([])
  const [statefulSetDetailTab, setStatefulSetDetailTab] = useState('pods')
  const [statefulSetCostInfo, setStatefulSetCostInfo] = useState(null)
  const [showEditStatefulSetModal, setShowEditStatefulSetModal] = useState(false)
  const [editingStatefulSet, setEditingStatefulSet] = useState(null)
  const [editStatefulSetData, setEditStatefulSetData] = useState({
    replicas: 1,
    image: '',
    labels: {},
    annotations: {}
  })
  const [showScaleStatefulSetModal, setShowScaleStatefulSetModal] = useState(false)
  const [scalingStatefulSet, setScalingStatefulSet] = useState(null)
  const [scaleStatefulSetReplicas, setScaleStatefulSetReplicas] = useState(1)
  const [showStatefulSetYamlEditModal, setShowStatefulSetYamlEditModal] = useState(false)
  const [editingStatefulSetYaml, setEditingStatefulSetYaml] = useState(null)
  const [statefulSetYaml, setStatefulSetYaml] = useState('')
  
  // 创建 StatefulSet 状态
  const [showCreateStatefulSetModal, setShowCreateStatefulSetModal] = useState(false)
  const [createStatefulSetStep, setCreateStatefulSetStep] = useState(1)
  const [createStatefulSetData, setCreateStatefulSetData] = useState({
    // 基本信息
    name: '',
    namespace: 'default',
    replicas: 2,
    type: 'StatefulSet',
    labels: {},
    annotations: {},
    timeZoneSync: false,
    // 容器配置
    containers: [{
      name: 'container-1',
      image: '',
      imagePullPolicy: 'IfNotPresent',
      imageSecret: '',
      cpuLimit: '',
      memoryLimit: '',
      ephemeralStorageLimit: '',
      gpuType: 'none',
      cpuRequest: '0.25',
      memoryRequest: '512Mi',
      ephemeralStorageRequest: '',
      stdin: false,
      tty: false,
      privileged: false,
      initContainer: false,
      ports: [],
      envVars: [],
    }],
    // 高级配置
    hpaEnabled: false,
    cronHpaEnabled: false,
    upgradeStrategy: false,
    nodeAffinity: [],
    podAffinity: [],
    podAntiAffinity: [],
    tolerations: [],
    podLabels: {},
    podAnnotations: {},
  })
  
  // 创建命名空间状态
  const [newNamespaceName, setNewNamespaceName] = useState('')
  const [newNamespaceDeletionProtection, setNewNamespaceDeletionProtection] = useState(false)
  const [newNamespaceLabels, setNewNamespaceLabels] = useState({})
  
  // 编辑命名空间状态
  const [editNamespaceName, setEditNamespaceName] = useState('')
  const [editNamespaceDeletionProtection, setEditNamespaceDeletionProtection] = useState(false)
  const [editNamespaceLabels, setEditNamespaceLabels] = useState({})
  
  // 资源配额状态
  const [resourceQuotaExpanded, setResourceQuotaExpanded] = useState(true)
  const [limitRangeExpanded, setLimitRangeExpanded] = useState(true)
  const [quotaData, setQuotaData] = useState({
    // Resource Quota
    cpuLimit: '',
    memoryLimit: '',
    memoryLimitUnit: 'Gi',
    cpuRequest: '',
    memoryRequest: '',
    memoryRequestUnit: 'Gi',
    exclusiveGpu: '',
    sharedGpuMemory: '',
    sharedGpuMemoryUnit: 'Gi',
    storageClaim: '',
    storageSpace: '',
    storageSpaceUnit: 'Gi',
    configFile: '',
    containerGroup: '',
    service: '',
    loadBalancerService: '',
    secret: '',
    // Limit Range
    limitCpuLimit: '',
    limitMemoryLimit: '',
    limitMemoryLimitUnit: 'Gi',
    requestCpuLimit: '',
    requestMemoryLimit: '',
    requestMemoryLimitUnit: 'Gi',
  })

  // 从URL参数同步tab和type（初始化时从URL恢复状态）
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'info'
    const typeFromUrl = searchParams.get('type') || 'deployments'
    const subtabFromUrl = searchParams.get('subtab') || ''
    const namespaceFromUrl = searchParams.get('namespace') || ''
    
    // 恢复标签页
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
    
    // 恢复工作负载类型
    if (typeFromUrl !== workloadType && tabFromUrl === 'workloads') {
      setWorkloadType(typeFromUrl)
    }
    
    // 恢复安全子标签
    if (subtabFromUrl !== activeSubtab && tabFromUrl === 'security') {
      setActiveSubtab(subtabFromUrl || 'authorization')
    }
    
    // 恢复工作负载命名空间
    if (namespaceFromUrl !== selectedWorkloadNamespace && tabFromUrl === 'workloads') {
      setSelectedWorkloadNamespace(namespaceFromUrl)
    }
    
    // 恢复网络子标签
    const networkSubtabFromUrl = searchParams.get('networkSubtab') || 'services'
    if (networkSubtabFromUrl !== networkSubtab && tabFromUrl === 'network') {
      setNetworkSubtab(networkSubtabFromUrl)
    }
    
    // 恢复配置管理子标签
    const configSubtabFromUrl = searchParams.get('configSubtab') || 'configmaps'
    if (configSubtabFromUrl !== configSubtab && tabFromUrl === 'config') {
      setConfigSubtab(configSubtabFromUrl)
    }
    
    // 恢复存储子标签
    const storageSubtabFromUrl = searchParams.get('storageSubtab') || 'pvcs'
    if (storageSubtabFromUrl !== storageSubtab && (tabFromUrl === 'storage' || activeTab === 'storage')) {
      setStorageSubtab(storageSubtabFromUrl)
    }
  }, [searchParams, activeTab, storageSubtab])
  
  // 确保命名空间列表已加载（用于工作负载过滤）
  useEffect(() => {
    if (activeTab === 'workloads' && id && namespaces.length === 0) {
      fetchNamespaces()
    }
  }, [activeTab, id])
  
  // 当activeTab变化时，更新URL参数（确保刷新后保持当前页面）
  useEffect(() => {
    const currentTab = searchParams.get('tab') || 'info'
    if (activeTab !== currentTab) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', activeTab)
      // 如果切换到非workloads标签，清除type参数
      if (activeTab !== 'workloads') {
        newParams.delete('type')
      }
      // 如果切换到非security标签，清除subtab参数
      if (activeTab !== 'security') {
        newParams.delete('subtab')
      }
      // 如果切换到非config标签，清除configSubtab参数
      if (activeTab !== 'config') {
        newParams.delete('configSubtab')
      }
      // 如果切换到非storage标签，清除storageSubtab参数
      if (activeTab !== 'storage') {
        newParams.delete('storageSubtab')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [activeTab])
  
  // 当workloadType变化时，更新URL参数
  useEffect(() => {
    if (activeTab === 'workloads') {
      const currentType = searchParams.get('type') || 'deployments'
      if (workloadType !== currentType) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('type', workloadType)
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [workloadType, activeTab])
  
  // 当configSubtab变化时，更新URL参数
  useEffect(() => {
    if (activeTab === 'config') {
      const currentConfigSubtab = searchParams.get('configSubtab') || 'configmaps'
      if (configSubtab !== currentConfigSubtab) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('configSubtab', configSubtab)
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [configSubtab, activeTab])
  
  // 当storageSubtab变化时，更新URL参数
  useEffect(() => {
    if (activeTab === 'storage') {
      const currentStorageSubtab = searchParams.get('storageSubtab') || 'pvcs'
      // 只有当 storageSubtab 状态与 URL 中的值不同时才更新 URL，避免循环
      if (storageSubtab !== currentStorageSubtab) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('storageSubtab', storageSubtab)
        setSearchParams(newParams, { replace: true })
      }
    } else {
      // 当离开存储标签时，清除storageSubtab URL参数
      if (searchParams.get('storageSubtab')) {
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('storageSubtab')
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [storageSubtab, activeTab])
  
  // 当 storageSubtab 状态更新后，确保数据被正确获取
  useEffect(() => {
    if (activeTab === 'storage' && id) {
      // 如果命名空间列表为空，先获取所有命名空间列表（用于下拉框）
      if (namespaces.length === 0) {
        fetchAllNamespaces()
      }
      // 确保 storageSubtab 有值（如果为空或未定义，使用默认值 'pvcs'）
      const currentStorageSubtab = storageSubtab || 'pvcs'
      // 根据子标签加载数据
      if (currentStorageSubtab === 'pvcs') {
        fetchPVCs(selectedStorageNamespace || '')
      } else if (currentStorageSubtab === 'pvs') {
        fetchPVs()
      } else if (currentStorageSubtab === 'storageclasses') {
        fetchStorageClasses()
      }
    }
  }, [storageSubtab, id, activeTab, selectedStorageNamespace])
  
  // 当selectedWorkloadNamespace变化时，更新URL参数
  useEffect(() => {
    if (activeTab === 'workloads') {
      const currentNamespace = searchParams.get('namespace') || ''
      if (selectedWorkloadNamespace !== currentNamespace) {
        const newParams = new URLSearchParams(searchParams)
        if (selectedWorkloadNamespace) {
          newParams.set('namespace', selectedWorkloadNamespace)
        } else {
          newParams.delete('namespace')
        }
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [selectedWorkloadNamespace, activeTab])
  
  
  // 当activeSubtab变化时，更新URL参数
  useEffect(() => {
    if (activeTab === 'security') {
      const currentSubtab = searchParams.get('subtab') || ''
      if (activeSubtab !== currentSubtab) {
        const newParams = new URLSearchParams(searchParams)
        if (activeSubtab) {
          newParams.set('subtab', activeSubtab)
        } else {
          newParams.delete('subtab')
        }
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [activeSubtab, activeTab])

  useEffect(() => {
    if (id) {
      fetchClusterInfo()
      // 如果切换到工作负载页面，先获取命名空间列表
      if (activeTab === 'workloads' && namespaces.length === 0) {
        fetchNamespaces()
      }
      // 如果切换到网络页面，先获取所有命名空间列表（用于下拉框）
      if (activeTab === 'network' && namespaces.length === 0) {
        fetchAllNamespaces()
      }
      // 如果切换到配置管理页面，先获取所有命名空间列表（用于下拉框）
      if (activeTab === 'config' && namespaces.length === 0) {
        fetchAllNamespaces()
      }
      // 如果切换到存储页面，先获取所有命名空间列表（用于下拉框）
      if (activeTab === 'storage' && namespaces.length === 0) {
        fetchAllNamespaces()
      }
    }
  }, [id])

  useEffect(() => {
    if (id) {
      if (activeTab === 'nodes') {
        fetchNodes()
      } else if (activeTab === 'namespaces') {
        fetchNamespaces()
      } else if (activeTab === 'workloads') {
        // 如果命名空间列表为空，先获取命名空间列表
        if (namespaces.length === 0) {
          fetchNamespaces()
        }
        const type = searchParams.get('type') || 'deployments'
        setWorkloadType(type)
        const namespace = selectedWorkloadNamespace || ''
        if (type === 'deployments') {
          fetchDeployments(namespace)
        } else if (type === 'statefulsets') {
          fetchStatefulSets(namespace)
        } else if (type === 'daemonsets') {
          fetchDaemonSets(namespace)
        } else if (type === 'jobs') {
          fetchJobs(namespace)
        } else if (type === 'cronjobs') {
          fetchCronJobs(namespace)
        } else if (type === 'pods') {
          fetchWorkloads(namespace)
        }
      } else if (activeTab === 'network') {
        // 如果命名空间列表为空，先获取所有命名空间列表（用于下拉框）
        if (namespaces.length === 0) {
          fetchAllNamespaces()
        }
        // 根据子标签加载数据
        if (networkSubtab === 'services') {
          fetchServices(selectedNetworkNamespace || '')
        } else if (networkSubtab === 'ingress') {
          fetchIngresses(selectedNetworkNamespace || '')
        }
      } else if (activeTab === 'config') {
        if (configSubtab === 'configmaps') {
          fetchConfigMaps(selectedConfigNamespace || '')
        } else if (configSubtab === 'secrets') {
          fetchSecrets(selectedConfigNamespace || '')
        }
      } else if (activeTab === 'storage') {
        // 确保 storageSubtab 有值（如果 URL 中没有，使用默认值）
        // 数据获取由专门的 useEffect 处理（第442-458行）
        const currentStorageSubtab = searchParams.get('storageSubtab') || 'pvcs'
        if (currentStorageSubtab !== storageSubtab) {
          setStorageSubtab(currentStorageSubtab)
        }
      } else if (activeTab === 'security') {
        // 安全管理相关数据获取可以根据需要添加
      }
    }
  }, [id, activeTab, searchParams, selectedNetworkNamespace, namespaces.length, networkSubtab, configSubtab, storageSubtab, selectedStorageNamespace, pvsPage, pvsPageSize, storageClassesPage, storageClassesPageSize])

  useEffect(() => {
    if (selectedNamespace) {
      fetchPods(selectedNamespace)
    }
  }, [selectedNamespace, id])

  // 当工作负载命名空间或类型变化时，重新获取数据
  useEffect(() => {
    if (activeTab === 'workloads' && id) {
      const type = searchParams.get('type') || workloadType || 'deployments'
      const namespace = selectedWorkloadNamespace || ''
      console.log('工作负载数据获取触发:', { type, namespace, activeTab, id })
      
      if (type === 'deployments') {
        fetchDeployments(namespace)
      } else if (type === 'statefulsets') {
        fetchStatefulSets(namespace)
      } else if (type === 'daemonsets') {
        fetchDaemonSets(namespace)
      } else if (type === 'jobs') {
        fetchJobs(namespace)
      } else if (type === 'cronjobs') {
        fetchCronJobs(namespace)
      } else if (type === 'pods') {
        console.log('准备获取 Pod 列表，参数:', { namespace, workloadsPage, workloadsPageSize })
        fetchWorkloads(namespace)
      }
    }
  }, [selectedWorkloadNamespace, workloadType, id, activeTab, searchParams, workloadsPage, workloadsPageSize])
  
  // 使用ref来跟踪是否正在加载，避免重复加载
  const isLoadingDeploymentRef = useRef(false)
  // 使用ref跟踪已加载的deployment，避免重复加载
  const loadedDeploymentRef = useRef(null)
  // 使用ref来跟踪是否正在加载StatefulSet，避免重复加载
  const isLoadingStatefulSetRef = useRef(false)
  // 使用ref跟踪已加载的StatefulSet，避免重复加载
  const loadedStatefulSetRef = useRef(null)
  
  // 加载deployment详情的内部函数（不更新URL）
  const loadDeploymentDetail = useCallback(async (deployment) => {
    if (isLoadingDeploymentRef.current) {
      console.log('正在加载deployment详情，跳过重复请求')
      return
    }
    
    try {
      isLoadingDeploymentRef.current = true
      setLoading(true)
      setError('')
      
      console.log('开始加载deployment详情:', deployment)
      
      // 获取Deployment详情
      const detailResponse = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}`)
      if (detailResponse.data && detailResponse.data.data) {
        setDeploymentDetail(detailResponse.data.data)
        console.log('Deployment详情加载成功:', detailResponse.data.data)
      } else {
        throw new Error('获取Deployment详情失败：响应数据格式错误')
      }
      
      // 获取关联的Pods
      try {
        const podsResponse = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/pods`)
        let podsData = []
        if (podsResponse.data) {
          if (podsResponse.data.data !== undefined) {
            if (Array.isArray(podsResponse.data.data)) {
              podsData = podsResponse.data.data
            }
          } else if (Array.isArray(podsResponse.data)) {
            podsData = podsResponse.data
          }
        }
        setDeploymentPods(podsData)
        console.log('Pods加载成功，数量:', podsData.length)
      } catch (podsErr) {
        setDeploymentPods([])
        if (podsErr.response?.status !== 404) {
          setError(podsErr.response?.data?.message || podsErr.message || '获取Pod列表失败')
        }
      }
      
      // 获取成本信息
      try {
        const costResponse = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/cost`)
        if (costResponse.data && costResponse.data.data) {
          setDeploymentCostInfo(costResponse.data.data)
        } else if (costResponse.data) {
          setDeploymentCostInfo(costResponse.data)
        }
      } catch (costErr) {
        setDeploymentCostInfo(null)
      }
      
      // 获取HPA列表（延迟加载，避免阻塞主流程）
      setTimeout(() => {
        fetchHpaList(deployment)
      }, 100)
      
      // 获取CronHPA列表和检查组件状态（延迟加载）
      setTimeout(() => {
        checkCronHpaInstalled()
        fetchCronHpaList(deployment)
      }, 200)
      
      // 获取历史版本（延迟加载）
      setTimeout(() => {
        fetchDeploymentHistoryVersions(deployment)
      }, 300)
      
    } catch (err) {
      console.error('获取Deployment详情失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchDetailFailed'))
      setSelectedDeployment(null)
      setDeploymentDetail(null)
      setDeploymentPods([])
    } finally {
      setLoading(false)
      isLoadingDeploymentRef.current = false
    }
  }, [id, t])
  
  // 加载StatefulSet详情的内部函数（不更新URL）
  const loadStatefulSetDetail = useCallback(async (statefulSet) => {
    if (isLoadingStatefulSetRef.current) {
      console.log('正在加载StatefulSet详情，跳过重复请求')
      return
    }
    
    try {
      isLoadingStatefulSetRef.current = true
      setLoading(true)
      setError('')
      
      console.log('开始加载StatefulSet详情:', statefulSet)
      
      // 获取StatefulSet详情
      const detailResponse = await api.get(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}`)
      if (detailResponse.data && detailResponse.data.data) {
        setStatefulSetDetail(detailResponse.data.data)
        console.log('StatefulSet详情加载成功:', detailResponse.data.data)
      } else {
        throw new Error('获取StatefulSet详情失败：响应数据格式错误')
      }
      
      // 获取关联的Pods
      try {
        const podsResponse = await api.get(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}/pods`)
        let podsData = []
        if (podsResponse.data) {
          if (podsResponse.data.data !== undefined) {
            if (Array.isArray(podsResponse.data.data)) {
              podsData = podsResponse.data.data
            }
          } else if (Array.isArray(podsResponse.data)) {
            podsData = podsResponse.data
          }
        }
        setStatefulSetPods(podsData)
        console.log('Pods加载成功，数量:', podsData.length)
      } catch (podsErr) {
        setStatefulSetPods([])
        if (podsErr.response?.status !== 404) {
          setError(podsErr.response?.data?.message || podsErr.message || '获取Pod列表失败')
        }
      }
      
      // 获取成本信息
      try {
        const costResponse = await api.get(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}/cost`)
        if (costResponse.data && costResponse.data.data) {
          setStatefulSetCostInfo(costResponse.data.data)
        } else if (costResponse.data) {
          setStatefulSetCostInfo(costResponse.data)
        }
      } catch (costErr) {
        setStatefulSetCostInfo(null)
      }
      
    } catch (err) {
      console.error('获取StatefulSet详情失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchDetailFailed'))
      setSelectedStatefulSet(null)
      setStatefulSetDetail(null)
      setStatefulSetPods([])
    } finally {
      setLoading(false)
      isLoadingStatefulSetRef.current = false
    }
  }, [id, t])
  
  // 从URL参数恢复deployment详情（页面刷新后）
  useEffect(() => {
    const deploymentName = searchParams.get('deployment')
    const deploymentNamespace = searchParams.get('deploymentNamespace')
    
    console.log('检查URL参数恢复deployment:', { 
      deploymentName, 
      deploymentNamespace, 
      activeTab, 
      id,
      selectedDeployment: selectedDeployment?.name,
      deploymentDetail: deploymentDetail?.name,
      loadedKey: loadedDeploymentRef.current,
      isLoading: isLoadingDeploymentRef.current
    })
    
    if (deploymentName && deploymentNamespace && activeTab === 'workloads' && id) {
      const deploymentKey = `${deploymentNamespace}/${deploymentName}`
      const currentKey = selectedDeployment 
        ? `${selectedDeployment.namespace}/${selectedDeployment.name}` 
        : null
      
      // 需要加载的情况：
      // 1. 还没有加载过这个deployment（loadedDeploymentRef.current !== deploymentKey）
      // 2. 当前选中的deployment与URL中的不一致（currentKey !== deploymentKey）
      // 3. 当前选中的deployment与URL中的一致，但详情数据为空（currentKey === deploymentKey && !deploymentDetail）
      // 4. 如果selectedDeployment不存在，也需要设置并加载
      const needsLoad = !selectedDeployment || // 如果selectedDeployment不存在，需要设置并加载
                       (loadedDeploymentRef.current !== deploymentKey && !isLoadingDeploymentRef.current) ||
                       (currentKey !== deploymentKey && !isLoadingDeploymentRef.current) ||
                       (currentKey === deploymentKey && !deploymentDetail && !isLoadingDeploymentRef.current)
      
      if (needsLoad) {
        console.log('从URL恢复deployment详情，开始加载:', { 
          deploymentName, 
          deploymentNamespace, 
          deploymentKey, 
          needsLoad,
          reason: {
            notLoaded: loadedDeploymentRef.current !== deploymentKey,
            keyMismatch: currentKey !== deploymentKey,
            noDetail: currentKey === deploymentKey && !deploymentDetail
          }
        })
        setIsDeploymentFromUrl(true)
        const deployment = { name: deploymentName, namespace: deploymentNamespace }
        setSelectedDeployment(deployment)
        loadedDeploymentRef.current = deploymentKey
        // 加载详情（不更新URL）
        loadDeploymentDetail(deployment).then(() => {
          // 加载完成后，确保ref已更新
          console.log('Deployment详情加载完成')
          loadedDeploymentRef.current = deploymentKey
        }).catch((err) => {
          console.error('加载deployment详情失败:', err)
          loadedDeploymentRef.current = null
        })
      } else {
        console.log('跳过加载，原因:', {
          loadedKey: loadedDeploymentRef.current,
          currentKey: currentKey,
          targetKey: deploymentKey,
          isLoading: isLoadingDeploymentRef.current,
          hasDetail: !!deploymentDetail,
          needsLoad: false
        })
      }
    } else if (!deploymentName && !deploymentNamespace) {
      // 如果URL中没有deployment参数，清除状态
      if (isDeploymentFromUrl) {
        console.log('清除deployment状态')
        setIsDeploymentFromUrl(false)
        setSelectedDeployment(null)
        setDeploymentDetail(null)
        setDeploymentPods([])
        setDeploymentCostInfo(null)
        loadedDeploymentRef.current = null
      }
    }
  }, [searchParams, activeTab, id, loadDeploymentDetail])
  
  // 额外的useEffect：确保在selectedDeployment存在但deploymentDetail为空时加载（页面刷新后）
  // 这个useEffect专门处理初始化时selectedDeployment已设置但deploymentDetail为空的情况
  useEffect(() => {
    // 只在workloads标签页且selectedDeployment存在但deploymentDetail为空时触发
    if (selectedDeployment && !deploymentDetail && activeTab === 'workloads' && id && !isLoadingDeploymentRef.current) {
      const deploymentKey = `${selectedDeployment.namespace}/${selectedDeployment.name}`
      // 检查URL参数，确保是从URL恢复的状态
      const urlDeploymentName = searchParams.get('deployment')
      const urlDeploymentNamespace = searchParams.get('deploymentNamespace')
      
      // 如果URL中有deployment参数，且与selectedDeployment匹配，且还没有加载过，则加载
      if (urlDeploymentName === selectedDeployment.name && 
          urlDeploymentNamespace === selectedDeployment.namespace &&
          loadedDeploymentRef.current !== deploymentKey) {
        console.log('检测到selectedDeployment存在但deploymentDetail为空（从URL恢复），触发加载:', selectedDeployment)
        setIsDeploymentFromUrl(true)
        loadedDeploymentRef.current = deploymentKey
        loadDeploymentDetail(selectedDeployment).then(() => {
          console.log('Deployment详情加载完成（从selectedDeployment触发）')
          loadedDeploymentRef.current = deploymentKey
        }).catch((err) => {
          console.error('加载deployment详情失败:', err)
          loadedDeploymentRef.current = null
        })
      }
    }
  }, [selectedDeployment, deploymentDetail, activeTab, id, loadDeploymentDetail, searchParams])
  
  // 从URL参数恢复StatefulSet详情（页面刷新后）
  useEffect(() => {
    const statefulSetName = searchParams.get('statefulset')
    const statefulSetNamespace = searchParams.get('statefulsetNamespace')
    
    if (statefulSetName && statefulSetNamespace && activeTab === 'workloads' && id) {
      const statefulSetKey = `${statefulSetNamespace}/${statefulSetName}`
      const currentKey = selectedStatefulSet 
        ? `${selectedStatefulSet.namespace}/${selectedStatefulSet.name}` 
        : null
      
      const needsLoad = !selectedStatefulSet || 
                       (loadedStatefulSetRef.current !== statefulSetKey && !isLoadingStatefulSetRef.current) ||
                       (currentKey !== statefulSetKey && !isLoadingStatefulSetRef.current) ||
                       (currentKey === statefulSetKey && !statefulSetDetail && !isLoadingStatefulSetRef.current)
      
      if (needsLoad) {
        const statefulSet = { name: statefulSetName, namespace: statefulSetNamespace }
        setSelectedStatefulSet(statefulSet)
        loadedStatefulSetRef.current = statefulSetKey
        loadStatefulSetDetail(statefulSet).then(() => {
          loadedStatefulSetRef.current = statefulSetKey
        }).catch((err) => {
          console.error('加载StatefulSet详情失败:', err)
          loadedStatefulSetRef.current = null
        })
      }
    } else if (!statefulSetName && !statefulSetNamespace && selectedStatefulSet && activeTab === 'workloads') {
      if (searchParams.get('view') !== 'detail') {
        setSelectedStatefulSet(null)
        setStatefulSetDetail(null)
        setStatefulSetPods([])
        loadedStatefulSetRef.current = null
      }
    }
  }, [selectedStatefulSet, statefulSetDetail, activeTab, id, loadStatefulSetDetail, searchParams])
  
  // 额外的useEffect：确保在selectedStatefulSet存在但statefulSetDetail为空时加载（页面刷新后）
  useEffect(() => {
    if (selectedStatefulSet && !statefulSetDetail && activeTab === 'workloads' && id && !isLoadingStatefulSetRef.current) {
      const statefulSetKey = `${selectedStatefulSet.namespace}/${selectedStatefulSet.name}`
      const urlStatefulSetName = searchParams.get('statefulset')
      const urlStatefulSetNamespace = searchParams.get('statefulsetNamespace')
      
      if (urlStatefulSetName === selectedStatefulSet.name && 
          urlStatefulSetNamespace === selectedStatefulSet.namespace &&
          loadedStatefulSetRef.current !== statefulSetKey) {
        loadedStatefulSetRef.current = statefulSetKey
        loadStatefulSetDetail(selectedStatefulSet).then(() => {
          loadedStatefulSetRef.current = statefulSetKey
        }).catch((err) => {
          console.error('加载StatefulSet详情失败:', err)
          loadedStatefulSetRef.current = null
        })
      }
    }
  }, [selectedStatefulSet, statefulSetDetail, activeTab, id, loadStatefulSetDetail, searchParams])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
          menu.classList.remove('show')
        })
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchClusterInfo = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/info`)
      setClusterInfo(response.data.data)
    } catch (err) {
      console.error('获取集群信息失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchInfoFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchNodes = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/nodes`, {
        params: {
          page: nodesPage,
          page_size: nodesPageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setNodes(data.data)
        setNodesTotal(data.total || 0)
      } else {
        setNodes(Array.isArray(data) ? data : [])
        setNodesTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取节点列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchNodesFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchNamespaces = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
          page: namespacesPage,
          page_size: namespacesPageSize,
      }
      if (namespaceSearchTerm && namespaceSearchType === 'name') {
        params.search = namespaceSearchTerm
      }
      const response = await api.get(`/k8s/clusters/${id}/namespaces`, { params })
      const data = response.data.data || response.data
      if (data.data) {
        setNamespaces(data.data)
        setNamespacesTotal(data.total || 0)
      } else {
        setNamespaces(Array.isArray(data) ? data : [])
        setNamespacesTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取命名空间列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchNamespacesFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 获取所有命名空间（用于下拉框，不分页）
  const fetchAllNamespaces = async () => {
    try {
      setError('')
      // 使用一个很大的 page_size 来获取所有命名空间
      const params = {
        page: 1,
        page_size: 1000, // 足够大的值以获取所有命名空间
      }
      const response = await api.get(`/k8s/clusters/${id}/namespaces`, { params })
      const data = response.data.data || response.data
      let allNamespaces = []
      if (data.data) {
        allNamespaces = data.data
      } else if (Array.isArray(data)) {
        allNamespaces = data
      } else if (Array.isArray(response.data)) {
        allNamespaces = response.data
      }
      // 更新命名空间列表，但不更新分页状态
      setNamespaces(allNamespaces)
      console.log('[fetchAllNamespaces] 获取到所有命名空间:', allNamespaces.length, '个')
    } catch (err) {
      console.error('获取所有命名空间列表失败:', err)
      // 不显示错误，避免影响用户体验
    }
  }

  // 编辑命名空间
  const handleEditNamespace = async () => {
    if (!editingNamespace || !editNamespaceName.trim()) {
      setError(t('k8s.namespaceNameRequired'))
      return
    }

    // 验证命名空间名称格式
    const nameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
    if (!nameRegex.test(editNamespaceName) || editNamespaceName.length < 1 || editNamespaceName.length > 63) {
      setError(t('k8s.namespaceNameInvalid'))
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // 过滤掉空的标签键
      const filteredLabels = {}
      Object.entries(editNamespaceLabels).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredLabels[key.trim()] = value.trim()
        }
      })
      
      const payload = {
        name: editNamespaceName.trim(),
        deletionProtection: editNamespaceDeletionProtection,
        labels: filteredLabels,
      }

      await api.put(`/k8s/clusters/${id}/namespaces/${editingNamespace.name}`, payload)
      
      setSuccess(t('k8s.editNamespaceSuccess'))
      setShowEditNamespaceModal(false)
      setEditingNamespace(null)
      setEditNamespaceName('')
      setEditNamespaceDeletionProtection(false)
      setEditNamespaceLabels({})
      
      // 刷新命名空间列表
      fetchNamespaces()
    } catch (err) {
      console.error('编辑命名空间失败:', err)
      setError(err.response?.data?.message || t('k8s.editNamespaceFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 编辑命名空间YAML
  const handleEditNamespaceYaml = async (namespace) => {
    try {
      setLoading(true)
      setError('')
      
      // 获取命名空间的YAML
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${namespace.name}/yaml`)
      const yamlContent = response.data?.data?.yaml || response.data?.yaml || ''
      
      setPodYaml(yamlContent)
      setEditingNamespace(namespace)
      setShowYamlModal(true)
    } catch (err) {
      console.error('获取命名空间YAML失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchYamlFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 删除命名空间
  const handleDeleteNamespace = async (namespace) => {
    if (!window.confirm(t('k8s.confirmDeleteNamespace'))) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      await api.delete(`/k8s/clusters/${id}/namespaces/${namespace.name}`)
      
      setSuccess(t('k8s.deleteNamespaceSuccess'))
      setTimeout(() => {
        fetchNamespaces()
        setSuccess('')
      }, 1000)
    } catch (err) {
      console.error('删除命名空间失败:', err)
      setError(err.response?.data?.message || t('k8s.deleteNamespaceFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 切换命名空间删除保护
  const handleToggleNamespaceDeletionProtection = async (namespace) => {
    try {
      setLoading(true)
      setError('')
      
      // 获取当前命名空间信息
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${namespace.name}`)
      const nsData = response.data?.data || response.data
      
      // 检查是否已有删除保护（通过finalizer判断）
      const hasProtection = nsData.finalizers && nsData.finalizers.includes('kubernetes')
      const newProtection = !hasProtection
      
      // 更新删除保护状态
      const payload = {
        name: namespace.name,
        deletionProtection: newProtection,
        labels: nsData.labels || {},
      }
      
      await api.put(`/k8s/clusters/${id}/namespaces/${namespace.name}`, payload)
      
      setSuccess(newProtection ? t('k8s.enableDeletionProtectionSuccess') : t('k8s.disableDeletionProtectionSuccess'))
      setTimeout(() => {
        fetchNamespaces()
        setSuccess('')
      }, 1000)
    } catch (err) {
      console.error('切换删除保护失败:', err)
      setError(err.response?.data?.message || t('k8s.toggleDeletionProtectionFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 创建 Deployment
  const handleCreateDeployment = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 验证必填字段
      if (!createDeploymentData.name || !createDeploymentData.name.trim()) {
        setError(t('k8s.nameAndNamespaceRequired'))
        setLoading(false)
        return
      }
      
      if (!createDeploymentData.namespace || !createDeploymentData.namespace.trim()) {
        setError(t('k8s.nameAndNamespaceRequired'))
        setLoading(false)
        return
      }
      
      // 确保 replicas 是有效的整数且至少为 1
      const replicas = parseInt(createDeploymentData.replicas) || 1
      if (replicas < 1) {
        setError(t('k8s.invalidReplicas'))
        setLoading(false)
        return
      }
      
      // 验证容器配置
      if (!createDeploymentData.containers || createDeploymentData.containers.length === 0) {
        setError(t('k8s.imageRequired'))
        setLoading(false)
        return
      }
      
      // 验证每个容器都有镜像
      for (const container of createDeploymentData.containers) {
        if (!container.image || !container.image.trim()) {
          setError(t('k8s.imageRequired'))
          setLoading(false)
          return
        }
      }
      
      // 过滤掉空的标签和注解
      const filteredLabels = {}
      Object.entries(createDeploymentData.labels || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredLabels[key.trim()] = value.trim()
        }
      })
      
      const filteredAnnotations = {}
      Object.entries(createDeploymentData.annotations || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredAnnotations[key.trim()] = value.trim()
        }
      })
      
      const filteredPodLabels = {}
      Object.entries(createDeploymentData.podLabels || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredPodLabels[key.trim()] = value.trim()
        }
      })
      
      const filteredPodAnnotations = {}
      Object.entries(createDeploymentData.podAnnotations || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredPodAnnotations[key.trim()] = value.trim()
        }
      })
      
      const payload = {
        name: createDeploymentData.name.trim(),
        namespace: createDeploymentData.namespace.trim(),
        replicas: replicas,
        labels: filteredLabels,
        annotations: filteredAnnotations,
        containers: createDeploymentData.containers.map(container => ({
          name: container.name || `container-${Math.random().toString(36).substr(2, 9)}`,
          image: container.image.trim(),
          imagePullPolicy: container.imagePullPolicy || 'IfNotPresent',
          imageSecret: container.imageSecret || '',
          cpuLimit: container.cpuLimit || '',
          memoryLimit: container.memoryLimit || '',
          ephemeralStorageLimit: container.ephemeralStorageLimit || '',
          gpuType: container.gpuType || 'none',
          cpuRequest: container.cpuRequest || '',
          memoryRequest: container.memoryRequest || '',
          ephemeralStorageRequest: container.ephemeralStorageRequest || '',
          stdin: container.stdin || false,
          tty: container.tty || false,
          privileged: container.privileged || false,
          initContainer: container.initContainer || false,
          ports: (container.ports || []).filter(port => port.containerPort > 0),
          envVars: (container.envVars || []).filter(env => env.name && env.name.trim()),
        })),
        podLabels: filteredPodLabels,
        podAnnotations: filteredPodAnnotations,
        timeZoneSync: createDeploymentData.timeZoneSync || false,
        hpaEnabled: createDeploymentData.hpaEnabled || false,
        cronHpaEnabled: createDeploymentData.cronHpaEnabled || false,
        upgradeStrategy: createDeploymentData.upgradeStrategy || false,
        nodeAffinity: createDeploymentData.nodeAffinity || [],
        podAffinity: createDeploymentData.podAffinity || [],
        podAntiAffinity: createDeploymentData.podAntiAffinity || [],
        tolerations: createDeploymentData.tolerations || [],
      }

      await api.post(`/k8s/clusters/${id}/deployments`, payload)
      
      setSuccess(t('k8s.createDeploymentSuccess'))
      // 刷新 Deployment 列表
      fetchDeployments(createDeploymentData.namespace)
      
      // 注意：不重置数据，保持在步骤4显示成功信息
    } catch (err) {
      console.error('创建 Deployment 失败:', err)
      setError(err.response?.data?.message || t('k8s.createDeploymentFailed'))
      // 创建失败时，返回步骤3
      setCreateDeploymentStep(3)
    } finally {
      setLoading(false)
    }
  }

  // 创建 StatefulSet
  const handleCreateStatefulSet = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 验证必填字段
      if (!createStatefulSetData.name || !createStatefulSetData.name.trim()) {
        setError(t('k8s.nameAndNamespaceRequired'))
        setLoading(false)
        return
      }
      
      if (!createStatefulSetData.namespace || !createStatefulSetData.namespace.trim()) {
        setError(t('k8s.nameAndNamespaceRequired'))
        setLoading(false)
        return
      }
      
      // 确保 replicas 是有效的整数且至少为 1
      const replicas = parseInt(createStatefulSetData.replicas) || 1
      if (replicas < 1) {
        setError(t('k8s.invalidReplicas'))
        setLoading(false)
        return
      }
      
      // 验证容器配置
      if (!createStatefulSetData.containers || createStatefulSetData.containers.length === 0) {
        setError(t('k8s.imageRequired'))
        setLoading(false)
        return
      }
      
      // 验证每个容器都有镜像
      for (const container of createStatefulSetData.containers) {
        if (!container.image || !container.image.trim()) {
          setError(t('k8s.imageRequired'))
          setLoading(false)
          return
        }
      }
      
      // 过滤掉空的标签和注解
      const filteredLabels = {}
      Object.entries(createStatefulSetData.labels || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredLabels[key.trim()] = value.trim()
        }
      })
      
      const filteredAnnotations = {}
      Object.entries(createStatefulSetData.annotations || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredAnnotations[key.trim()] = value.trim()
        }
      })
      
      const filteredPodLabels = {}
      Object.entries(createStatefulSetData.podLabels || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredPodLabels[key.trim()] = value.trim()
        }
      })
      
      const filteredPodAnnotations = {}
      Object.entries(createStatefulSetData.podAnnotations || {}).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredPodAnnotations[key.trim()] = value.trim()
        }
      })
      
      const payload = {
        name: createStatefulSetData.name.trim(),
        namespace: createStatefulSetData.namespace.trim(),
        replicas: replicas,
        labels: filteredLabels,
        annotations: filteredAnnotations,
        containers: createStatefulSetData.containers.map(container => ({
          name: container.name || `container-${Math.random().toString(36).substr(2, 9)}`,
          image: container.image.trim(),
          imagePullPolicy: container.imagePullPolicy || 'IfNotPresent',
          imageSecret: container.imageSecret || '',
          cpuLimit: container.cpuLimit || '',
          memoryLimit: container.memoryLimit || '',
          ephemeralStorageLimit: container.ephemeralStorageLimit || '',
          gpuType: container.gpuType || 'none',
          cpuRequest: container.cpuRequest || '',
          memoryRequest: container.memoryRequest || '',
          ephemeralStorageRequest: container.ephemeralStorageRequest || '',
          stdin: container.stdin || false,
          tty: container.tty || false,
          privileged: container.privileged || false,
          initContainer: container.initContainer || false,
          ports: (container.ports || []).filter(port => port.containerPort > 0),
          envVars: (container.envVars || []).filter(env => env.name && env.name.trim()),
        })),
        podLabels: filteredPodLabels,
        podAnnotations: filteredPodAnnotations,
        timeZoneSync: createStatefulSetData.timeZoneSync || false,
        hpaEnabled: createStatefulSetData.hpaEnabled || false,
        cronHpaEnabled: createStatefulSetData.cronHpaEnabled || false,
        upgradeStrategy: createStatefulSetData.upgradeStrategy || false,
        nodeAffinity: createStatefulSetData.nodeAffinity || [],
        podAffinity: createStatefulSetData.podAffinity || [],
        podAntiAffinity: createStatefulSetData.podAntiAffinity || [],
        tolerations: createStatefulSetData.tolerations || [],
      }

      await api.post(`/k8s/clusters/${id}/statefulsets`, payload)
      
      setSuccess(t('k8s.createStatefulSetSuccess'))
      // 刷新 StatefulSet 列表
      fetchStatefulSets(createStatefulSetData.namespace)
      
      // 关闭模态框并重置数据
      setShowCreateStatefulSetModal(false)
      setCreateStatefulSetStep(1)
      setCreateStatefulSetData({
        name: '',
        namespace: 'default',
        replicas: 2,
        type: 'StatefulSet',
        labels: {},
        annotations: {},
        timeZoneSync: false,
        containers: [{
          name: 'container-1',
          image: '',
          imagePullPolicy: 'IfNotPresent',
          imageSecret: '',
          cpuLimit: '',
          memoryLimit: '',
          ephemeralStorageLimit: '',
          gpuType: 'none',
          cpuRequest: '0.25',
          memoryRequest: '512Mi',
          ephemeralStorageRequest: '',
          stdin: false,
          tty: false,
          privileged: false,
          initContainer: false,
          ports: [],
          envVars: [],
        }],
        hpaEnabled: false,
        cronHpaEnabled: false,
        upgradeStrategy: false,
        nodeAffinity: [],
        podAffinity: [],
        podAntiAffinity: [],
        tolerations: [],
        podLabels: {},
        podAnnotations: {},
      })
    } catch (err) {
      console.error('创建 StatefulSet 失败:', err)
      setError(err.response?.data?.message || t('k8s.createStatefulSetFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 创建命名空间
  const handleCreateNamespace = async () => {
    if (!newNamespaceName.trim()) {
      setError(t('k8s.namespaceNameRequired'))
      return
    }

    // 验证命名空间名称格式
    const nameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
    if (!nameRegex.test(newNamespaceName) || newNamespaceName.length < 1 || newNamespaceName.length > 63) {
      setError(t('k8s.namespaceNameInvalid'))
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // 过滤掉空的标签键
      const filteredLabels = {}
      Object.entries(newNamespaceLabels).forEach(([key, value]) => {
        if (key.trim() && value.trim()) {
          filteredLabels[key.trim()] = value.trim()
        }
      })
      
      const payload = {
        name: newNamespaceName.trim(),
        deletionProtection: newNamespaceDeletionProtection,
        labels: filteredLabels,
      }

      await api.post(`/k8s/clusters/${id}/namespaces`, payload)
      
      setSuccess(t('k8s.createNamespaceSuccess'))
      setShowCreateNamespaceModal(false)
      setNewNamespaceName('')
      setNewNamespaceDeletionProtection(false)
      setNewNamespaceLabels({})
      
      // 刷新命名空间列表
      fetchNamespaces()
    } catch (err) {
      console.error('创建命名空间失败:', err)
      setError(err.response?.data?.message || t('k8s.createNamespaceFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 保存资源配额与限制
  const handleSaveQuota = async () => {
    if (!editingNamespace) return

    try {
      setLoading(true)
      setError('')
      
      // 构建Resource Quota数据
      const resourceQuota = {}
      
      // 计算资源限制
      if (quotaData.cpuLimit) {
        resourceQuota['limits.cpu'] = quotaData.cpuLimit
      }
      if (quotaData.memoryLimit) {
        resourceQuota['limits.memory'] = `${quotaData.memoryLimit}${quotaData.memoryLimitUnit}`
      }
      if (quotaData.cpuRequest) {
        resourceQuota['requests.cpu'] = quotaData.cpuRequest
      }
      if (quotaData.memoryRequest) {
        resourceQuota['requests.memory'] = `${quotaData.memoryRequest}${quotaData.memoryRequestUnit}`
      }
      if (quotaData.exclusiveGpu) {
        resourceQuota['requests.nvidia.com/gpu'] = quotaData.exclusiveGpu
      }
      if (quotaData.sharedGpuMemory) {
        resourceQuota['requests.nvidia.com/gpu-memory'] = `${quotaData.sharedGpuMemory}${quotaData.sharedGpuMemoryUnit}`
      }
      
      // 存储资源限制
      if (quotaData.storageClaim) {
        resourceQuota['persistentvolumeclaims'] = quotaData.storageClaim
      }
      if (quotaData.storageSpace) {
        resourceQuota['requests.storage'] = `${quotaData.storageSpace}${quotaData.storageSpaceUnit}`
      }
      
      // 其他资源限制
      if (quotaData.configFile) {
        resourceQuota['configmaps'] = quotaData.configFile
      }
      if (quotaData.containerGroup) {
        resourceQuota['pods'] = quotaData.containerGroup
      }
      if (quotaData.service) {
        resourceQuota['services'] = quotaData.service
      }
      if (quotaData.loadBalancerService) {
        resourceQuota['services.loadbalancers'] = quotaData.loadBalancerService
      }
      if (quotaData.secret) {
        resourceQuota['secrets'] = quotaData.secret
      }

      // 构建Limit Range数据
      const limitRange = {}
      
      if (quotaData.limitCpuLimit || quotaData.limitMemoryLimit) {
        limitRange.limits = {}
        if (quotaData.limitCpuLimit) {
          limitRange.limits.cpu = quotaData.limitCpuLimit
        }
        if (quotaData.limitMemoryLimit) {
          limitRange.limits.memory = `${quotaData.limitMemoryLimit}${quotaData.limitMemoryLimitUnit}`
        }
      }
      
      if (quotaData.requestCpuLimit || quotaData.requestMemoryLimit) {
        limitRange.requests = {}
        if (quotaData.requestCpuLimit) {
          limitRange.requests.cpu = quotaData.requestCpuLimit
        }
        if (quotaData.requestMemoryLimit) {
          limitRange.requests.memory = `${quotaData.requestMemoryLimit}${quotaData.requestMemoryLimitUnit}`
        }
      }

      // 发送API请求
      const payload = {
        namespace: editingNamespace.name,
        resourceQuota: Object.keys(resourceQuota).length > 0 ? resourceQuota : null,
        limitRange: Object.keys(limitRange).length > 0 ? limitRange : null,
      }

      await api.post(`/k8s/clusters/${id}/namespaces/${editingNamespace.name}/quota`, payload)
      
      setSuccess(t('k8s.updateQuotaSuccess'))
      setShowQuotaModal(false)
      setEditingNamespace(null)
      
      // 刷新命名空间列表
      fetchNamespaces()
    } catch (err) {
      console.error('保存资源配额失败:', err)
      setError(err.response?.data?.message || t('k8s.updateQuotaFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkloads = async (namespace = '', page = null) => {
    if (!id) {
      console.error('集群 ID 不存在，无法获取 Pod 列表')
      setError('集群 ID 不存在')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      const currentPage = page !== null ? page : workloadsPage
      const params = {
        page: currentPage,
        page_size: workloadsPageSize,
      }
      // 如果指定了命名空间，添加到参数中；如果为空字符串，不传递该参数（获取所有命名空间的 Pod）
      if (namespace && namespace.trim()) {
        params.namespace = namespace.trim()
      }
      
      console.log('获取 Pod 列表，参数:', { clusterId: id, params, currentPage, workloadsPage, workloadsPageSize })
      const response = await api.get(`/k8s/clusters/${id}/pods`, { params })
      console.log('Pod 列表 API 响应:', response)
      console.log('响应数据结构:', {
        'response.data': response.data,
        'response.data.data': response.data?.data,
        'response.data.data.data': response.data?.data?.data,
        'isArray(response.data)': Array.isArray(response.data),
        'isArray(response.data.data)': Array.isArray(response.data?.data)
      })
      
      const data = response.data.data || response.data
      if (data && data.data && Array.isArray(data.data)) {
        // 标准分页格式: { data: [...], total: 100 }
        setWorkloads(data.data)
        setWorkloadsTotal(data.total || data.data.length)
        console.log('Pod 列表获取成功（分页格式），数量:', data.data.length, '总计:', data.total)
      } else if (Array.isArray(data)) {
        // 直接数组格式
        setWorkloads(data)
        setWorkloadsTotal(data.length)
        console.log('Pod 列表获取成功（直接数组），数量:', data.length)
      } else if (Array.isArray(response.data)) {
        // 响应数据本身就是数组
        setWorkloads(response.data)
        setWorkloadsTotal(response.data.length)
        console.log('Pod 列表获取成功（响应数组），数量:', response.data.length)
      } else {
        // 空数据或未知格式
        console.warn('Pod 列表数据格式未知，设置为空:', { data, responseData: response.data })
        setWorkloads([])
        setWorkloadsTotal(0)
      }
    } catch (err) {
      console.error('获取 Pod 列表失败:', err)
      console.error('错误详情:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        params: err.config?.params,
        stack: err.stack
      })
      // 如果是网络错误（如 socket hang up），显示更友好的错误信息
      if (err.code === 'ECONNRESET' || err.message?.includes('socket hang up') || err.message?.includes('Network Error')) {
        setError('网络连接失败，请检查后端服务是否正常运行')
      } else if (err.response?.status === 404) {
        setError('API 端点不存在，请检查后端路由配置')
      } else if (err.response?.status === 500) {
        setError('服务器内部错误，请检查后端日志')
      } else {
        setError(err.response?.data?.message || err.message || t('k8s.fetchWorkloadsFailed'))
      }
      // 即使获取失败，也清空列表，避免显示旧数据
      setWorkloads([])
      setWorkloadsTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeployments = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const params = {}
      if (namespace) {
        params.namespace = namespace
      }
      params.page = workloadsPage
      params.page_size = workloadsPageSize
      
      const response = await api.get(`/k8s/clusters/${id}/deployments`, { params })
      console.log('Deployments响应:', response.data)
      
      const data = response.data.data || response.data
      let deploymentsList = []
      if (data && data.data) {
        deploymentsList = data.data
        setWorkloadsTotal(data.total || 0)
      } else if (Array.isArray(data)) {
        deploymentsList = data
        setWorkloadsTotal(data.length)
      } else if (Array.isArray(response.data)) {
        deploymentsList = response.data
        setWorkloadsTotal(response.data.length)
      } else {
        deploymentsList = []
        setWorkloadsTotal(0)
      }
      
      // 确保每个deployment都有image字段
      deploymentsList = deploymentsList.map(deployment => {
        if (!deployment.image && deployment.images && deployment.images.length > 0) {
          deployment.image = deployment.images[0]
        }
        if (!deployment.image) {
          deployment.image = '-'
        }
        return deployment
      })
      
      setDeployments(deploymentsList)
      console.log('设置后的deployments:', deploymentsList)
    } catch (err) {
      console.error('获取Deployment列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchDeploymentsFailed'))
      setDeployments([])
      setWorkloadsTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatefulSets = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/statefulsets`, {
        params: {
          namespace: namespace || undefined,
          page: workloadsPage,
          page_size: workloadsPageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setStatefulSets(data.data)
        setWorkloadsTotal(data.total || 0)
      } else {
        setStatefulSets(Array.isArray(data) ? data : [])
        setWorkloadsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取StatefulSet列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchStatefulSetsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchDaemonSets = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/daemonsets`, {
        params: {
          namespace: namespace || undefined,
          page: workloadsPage,
          page_size: workloadsPageSize,
        },
      })
      const data = response.data.data || response.data
      let daemonSetsList = []
      if (data && data.data) {
        daemonSetsList = data.data
        setWorkloadsTotal(data.total || 0)
      } else if (Array.isArray(data)) {
        daemonSetsList = data
        setWorkloadsTotal(data.length)
      } else if (Array.isArray(response.data)) {
        daemonSetsList = response.data
        setWorkloadsTotal(response.data.length)
      } else {
        daemonSetsList = []
        setWorkloadsTotal(0)
      }
      
      // 确保每个 DaemonSet 都有 images 数组
      daemonSetsList = daemonSetsList.map(ds => {
        if (!ds.images) {
          if (ds.image) {
            ds.images = [ds.image]
          } else {
            ds.images = []
          }
        } else if (!Array.isArray(ds.images)) {
          ds.images = [ds.images]
        }
        return ds
      })
      
      setDaemonSets(daemonSetsList)
    } catch (err) {
      console.error('获取DaemonSet列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchDaemonSetsFailed'))
      setDaemonSets([])
      setWorkloadsTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/jobs`, {
        params: {
          namespace: namespace || undefined,
          page: workloadsPage,
          page_size: workloadsPageSize,
        },
      })
      const data = response.data.data || response.data
      let jobsList = []
      if (data && data.data) {
        jobsList = data.data
        setWorkloadsTotal(data.total || 0)
      } else if (Array.isArray(data)) {
        jobsList = data
        setWorkloadsTotal(data.length)
      } else if (Array.isArray(response.data)) {
        jobsList = response.data
        setWorkloadsTotal(response.data.length)
      } else {
        jobsList = []
        setWorkloadsTotal(0)
      }
      
      // 确保每个 Job 都有 images 数组
      jobsList = jobsList.map(job => {
        if (!job.images) {
          if (job.image) {
            job.images = [job.image]
          } else {
            job.images = []
          }
        } else if (!Array.isArray(job.images)) {
          job.images = [job.images]
        }
        return job
      })
      
      setJobs(jobsList)
    } catch (err) {
      console.error('获取Job列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchJobsFailed'))
      setJobs([])
      setWorkloadsTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchCronJobs = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/cronjobs`, {
        params: {
          namespace: namespace || undefined,
          page: workloadsPage,
          page_size: workloadsPageSize,
        },
      })
      const data = response.data.data || response.data
      let cronJobsList = []
      if (data && data.data) {
        cronJobsList = data.data
        setWorkloadsTotal(data.total || 0)
      } else if (Array.isArray(data)) {
        cronJobsList = data
        setWorkloadsTotal(data.length)
      } else if (Array.isArray(response.data)) {
        cronJobsList = response.data
        setWorkloadsTotal(response.data.length)
      } else {
        cronJobsList = []
        setWorkloadsTotal(0)
      }
      
      // 确保每个 CronJob 都有 images 数组
      cronJobsList = cronJobsList.map(cronJob => {
        if (!cronJob.images) {
          if (cronJob.image) {
            cronJob.images = [cronJob.image]
          } else {
            cronJob.images = []
          }
        } else if (!Array.isArray(cronJob.images)) {
          cronJob.images = [cronJob.images]
        }
        return cronJob
      })
      
      setCronJobs(cronJobsList)
    } catch (err) {
      console.error('获取CronJob列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchCronJobsFailed'))
      setCronJobs([])
      setWorkloadsTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const params = {
          page: servicesPage,
          page_size: servicesPageSize,
      }
      if (namespace && namespace.trim()) {
        params.namespace = namespace.trim()
      }
      console.log('[fetchServices] 请求参数:', { id, namespace, params })
      const response = await api.get(`/k8s/clusters/${id}/services`, {
        params,
      })
      console.log('[fetchServices] 响应数据:', response.data)
      const data = response.data.data || response.data
      let servicesList = []
      if (data && data.data) {
        servicesList = data.data
        setServicesTotal(data.total || 0)
      } else if (Array.isArray(data)) {
        servicesList = data
        setServicesTotal(data.length)
      } else if (Array.isArray(response.data)) {
        servicesList = response.data
        setServicesTotal(response.data.length)
      } else {
        servicesList = []
        setServicesTotal(0)
      }
      console.log('[fetchServices] 处理后的服务列表:', servicesList)
      // 确保每个服务对象都有必要的字段
      servicesList = servicesList.map(svc => ({
        name: svc.name || '',
        namespace: svc.namespace || '',
        type: svc.type || 'ClusterIP',
        clusterIP: svc.clusterIP || svc.cluster_ip || 'None',
        cluster_ip: svc.clusterIP || svc.cluster_ip || 'None',
        ports: svc.ports || [],
        selector: svc.selector || {},
        externalIPs: svc.externalIPs || [],
        loadBalancerIP: svc.loadBalancerIP || '',
        created_at: svc.created_at || svc.createdAt,
        createdAt: svc.created_at || svc.createdAt,
        ...svc
      }))
      setServices(servicesList)
    } catch (err) {
      console.error('获取服务列表失败:', err)
      console.error('错误详情:', err.response?.data)
      setError(err.response?.data?.message || err.message || t('k8s.fetchServicesFailed'))
      setServices([])
      setServicesTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchIngresses = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const params = {
          page: ingressesPage,
          page_size: ingressesPageSize,
      }
      if (namespace && namespace.trim()) {
        params.namespace = namespace.trim()
      }
      console.log('[fetchIngresses] 请求参数:', { id, namespace, params })
      const response = await api.get(`/k8s/clusters/${id}/ingresses`, {
        params,
      })
      console.log('[fetchIngresses] 响应数据:', response.data)
      const data = response.data.data || response.data
      let ingressesList = []
      if (data && data.data) {
        ingressesList = data.data
        setIngressesTotal(data.total || 0)
      } else if (Array.isArray(data)) {
        ingressesList = data
        setIngressesTotal(data.length)
      } else if (Array.isArray(response.data)) {
        ingressesList = response.data
        setIngressesTotal(response.data.length)
      } else {
        ingressesList = []
        setIngressesTotal(0)
      }
      console.log('[fetchIngresses] 处理后的路由列表:', ingressesList)
      setIngresses(ingressesList)
    } catch (err) {
      console.error('获取 Ingress 列表失败:', err)
      console.error('错误详情:', err.response?.data)
      setError(err.response?.data?.message || err.message || t('k8s.fetchIngressesFailed'))
      setIngresses([])
      setIngressesTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchConfigMaps = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: configMapsPage,
        page_size: configMapsPageSize,
      }
      if (namespace) {
        params.namespace = namespace
      }
      const response = await api.get(`/k8s/clusters/${id}/configmaps`, { params })
      const data = response.data.data || response.data
      if (data.data) {
        setConfigMaps(data.data)
        setConfigMapsTotal(data.total || 0)
      } else {
        setConfigMaps(Array.isArray(data) ? data : [])
        setConfigMapsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取ConfigMap列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchConfigMapsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchSecrets = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: secretsPage,
        page_size: secretsPageSize,
      }
      if (namespace) {
        params.namespace = namespace
      }
      const response = await api.get(`/k8s/clusters/${id}/secrets`, { params })
      const data = response.data.data || response.data
      if (data.data) {
        setSecrets(data.data)
        setSecretsTotal(data.total || 0)
      } else {
        setSecrets(Array.isArray(data) ? data : [])
        setSecretsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取Secret列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchSecretsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchPVCs = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: pvcsPage,
        page_size: pvcsPageSize,
      }
      if (namespace) {
        params.namespace = namespace
      }
      const response = await api.get(`/k8s/clusters/${id}/pvcs`, { params })
      const data = response.data.data || response.data
      if (data.data) {
        setPvcs(data.data)
        setPvcsTotal(data.total || 0)
      } else {
        setPvcs(Array.isArray(data) ? data : [])
        setPvcsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取PVC列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchPVCsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchPVs = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: pvsPage,
        page_size: pvsPageSize,
      }
      const response = await api.get(`/k8s/clusters/${id}/pvs`, { params })
      const data = response.data.data || response.data
      if (data.data) {
        setPvs(data.data)
        setPvsTotal(data.total || 0)
      } else {
        setPvs(Array.isArray(data) ? data : [])
        setPvsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取PV列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchPVsFailed') || '获取存储卷列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchStorageClasses = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: storageClassesPage,
        page_size: storageClassesPageSize,
      }
      const response = await api.get(`/k8s/clusters/${id}/storageclasses`, { params })
      const data = response.data.data || response.data
      if (data.data) {
        setStorageClasses(data.data)
        setStorageClassesTotal(data.total || 0)
      } else {
        setStorageClasses(Array.isArray(data) ? data : [])
        setStorageClassesTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取StorageClass列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchStorageClassesFailed') || '获取存储类列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchPods = async (namespace) => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/pods`, {
        params: {
          namespace: namespace,
          page: podsPage,
          page_size: podsPageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setPods(data.data)
        setPodsTotal(data.total || 0)
      } else {
        setPods(Array.isArray(data) ? data : [])
        setPodsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取Pod列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchPodsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRestartPod = async (namespace, podName) => {
    const confirmMsg = t('k8s.confirmRestartPod').replace('{podName}', podName)
    if (!window.confirm(confirmMsg)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      await api.post(`/k8s/clusters/${id}/namespaces/${namespace}/pods/${podName}/restart`)
      setSuccess(t('k8s.restartPodSuccess'))
      // 刷新Pod列表
      setTimeout(() => {
        fetchPods(namespace)
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.restartPodFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditYaml = async (pod) => {
    try {
      setLoading(true)
      setError('')
      setEditingPod(pod)
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${pod.namespace}/pods/${pod.name}/yaml`)
      setPodYaml(response.data.data.yaml)
      setShowYamlModal(true)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.fetchYamlFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveYaml = async () => {
    // 如果是命名空间，使用命名空间的更新逻辑
    if (editingNamespace && !editingPod) {
      try {
        setLoading(true)
        setError('')
        await api.put(`/k8s/clusters/${id}/namespaces/${editingNamespace.name}/yaml`, {
          yaml: podYaml
        })
        setSuccess(t('k8s.updateYamlSuccess'))
        setShowYamlModal(false)
        setPodYaml('')
        setEditingNamespace(null)
        fetchNamespaces()
        setTimeout(() => setSuccess(''), 1000)
      } catch (err) {
        setError(err.response?.data?.message || t('k8s.updateYamlFailed'))
      } finally {
        setLoading(false)
      }
      return
    }

    // 原有的Pod更新逻辑
    if (!editingPod) return

    try {
      setLoading(true)
      setError('')
      await api.put(`/k8s/clusters/${id}/namespaces/${editingPod.namespace}/pods/${editingPod.name}/yaml`, {
        yaml: podYaml
      })
      setSuccess(t('k8s.updateYamlSuccess'))
      setShowYamlModal(false)
      setEditingPod(null)
      setPodYaml('')
      // 刷新Pod列表
      setTimeout(() => {
        fetchPods(editingPod.namespace)
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.updateYamlFailed'))
    } finally {
      setLoading(false)
    }
  }

  const getPodStatusClass = (status) => {
    const statusMap = {
      'Running': 'status-connected',
      'Pending': 'status-unknown',
      'Succeeded': 'status-connected',
      'Failed': 'status-error',
      'Unknown': 'status-unknown',
    }
    return statusMap[status] || 'status-unknown'
  }


  const handleDeploymentClick = async (deployment) => {
    // 跳转到新页面，使用URL参数
    const newParams = new URLSearchParams()
    newParams.set('tab', 'workloads')
    newParams.set('type', 'deployments')
    newParams.set('deployment', deployment.name)
    newParams.set('deploymentNamespace', deployment.namespace)
    newParams.set('view', 'detail')
    
    // 使用 navigate 跳转，看起来像新页面
    navigate(`/k8s/cluster/${id}?${newParams.toString()}`, { replace: false })
    
    // 滚动到页面顶部
    window.scrollTo(0, 0)
    
    // 设置状态
    setIsDeploymentFromUrl(true)
    setSelectedDeployment(deployment)
    
    // 更新ref，标记为已加载
    const deploymentKey = `${deployment.namespace}/${deployment.name}`
    loadedDeploymentRef.current = deploymentKey
    
    // 使用内部函数加载详情
    await loadDeploymentDetail(deployment)
  }
  
  // StatefulSet相关处理函数
  const handleStatefulSetClick = async (statefulSet) => {
    // 跳转到新页面，使用URL参数
    const newParams = new URLSearchParams()
    newParams.set('tab', 'workloads')
    newParams.set('type', 'statefulsets')
    newParams.set('statefulset', statefulSet.name)
    newParams.set('statefulsetNamespace', statefulSet.namespace)
    newParams.set('view', 'detail')
    
    // 使用 navigate 跳转，看起来像新页面
    navigate(`/k8s/cluster/${id}?${newParams.toString()}`, { replace: false })
    
    // 滚动到页面顶部
    window.scrollTo(0, 0)
    
    // 设置状态
    setSelectedStatefulSet(statefulSet)
    
    // 更新ref，标记为已加载
    const statefulSetKey = `${statefulSet.namespace}/${statefulSet.name}`
    loadedStatefulSetRef.current = statefulSetKey
    
    // 使用内部函数加载详情
    await loadStatefulSetDetail(statefulSet)
  }
  
  // 保留原有的handleDeploymentClick逻辑作为备用（已重构为loadDeploymentDetail）
  const handleDeploymentClickOld = async (deployment) => {
    try {
      setLoading(true)
      setError('')
      setSelectedDeployment(deployment)
      
      // 获取Deployment详情
      const detailResponse = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}`)
      console.log('=== Deployment详情API响应 ===')
      console.log('完整响应:', detailResponse)
      console.log('响应数据:', detailResponse.data)
      
      if (detailResponse.data && detailResponse.data.data) {
        const detailData = detailResponse.data.data
        console.log('Deployment详情数据:', detailData)
        console.log('字段检查:', {
          name: detailData.name,
          namespace: detailData.namespace,
          selector: detailData.selector,
          annotations: detailData.annotations,
          created_at: detailData.created_at,
          labels: detailData.labels
        })
        setDeploymentDetail(detailData)
      } else {
        console.error('Deployment详情响应格式错误:', detailResponse.data)
        throw new Error('获取Deployment详情失败：响应数据格式错误')
      }
      
      // 获取关联的Pods
      try {
        const podsResponse = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/pods`)
        console.log('=== Pods API 响应 ===')
        console.log('完整响应:', podsResponse)
        console.log('响应数据:', podsResponse.data)
        console.log('响应数据类型:', typeof podsResponse.data)
        
        // 处理不同的响应格式
        let podsData = []
        if (podsResponse.data) {
          // 标准格式: { code: 200, message: "success", data: [...] }
          if (podsResponse.data.data !== undefined) {
            if (Array.isArray(podsResponse.data.data)) {
              podsData = podsResponse.data.data
              console.log('使用格式: response.data.data (数组)')
            } else if (podsResponse.data.data && typeof podsResponse.data.data === 'object') {
              // 可能是嵌套的数据结构
              console.log('检测到嵌套数据结构:', podsResponse.data.data)
              if (Array.isArray(podsResponse.data.data.data)) {
                podsData = podsResponse.data.data.data
                console.log('使用格式: response.data.data.data (数组)')
              }
            }
          } 
          // 直接是数组格式
          else if (Array.isArray(podsResponse.data)) {
            podsData = podsResponse.data
            console.log('使用格式: response.data (直接数组)')
          }
        }
        
        console.log('解析后的Pods数据:', podsData)
        console.log('Pods数量:', podsData.length)
        
        // 验证pods数据格式
        if (podsData.length > 0) {
          console.log('第一个Pod示例:', podsData[0])
          console.log('Pod字段:', Object.keys(podsData[0]))
        } else {
          console.warn('⚠️ Pods列表为空，可能的原因：')
          console.warn('1. Deployment还没有创建Pod')
          console.warn('2. Pod的标签与Deployment的Selector不匹配')
          console.warn('3. Pod已被删除')
          console.warn('4. 命名空间不正确')
          console.warn('5. API返回格式异常')
        }
        
        setDeploymentPods(podsData)
        
        // 如果成功获取但列表为空，清除之前的错误信息
        if (podsData.length === 0) {
          setError('')
        }
      } catch (podsErr) {
        console.error('❌ 获取Pods失败:', podsErr)
        console.error('错误详情:', {
          message: podsErr.message,
          response: podsErr.response?.data,
          status: podsErr.response?.status,
          statusText: podsErr.response?.statusText,
          url: podsErr.config?.url,
          stack: podsErr.stack
        })
        // 即使获取Pods失败，也显示Deployment详情，只是Pods列表为空
        setDeploymentPods([])
        // 只在有实际错误时才显示错误信息
        if (podsErr.response?.status !== 404) {
          const errorMsg = podsErr.response?.data?.message || podsErr.message || '获取Pod列表失败，但Deployment详情已加载'
          setError(errorMsg)
          console.error('显示错误信息:', errorMsg)
        } else {
          setError('')
        }
      }
      
      // 获取成本信息
      try {
        const costUrl = `/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/cost`
        console.log('=== 获取成本信息 ===')
        console.log('URL:', costUrl)
        console.log('Deployment:', { name: deployment.name, namespace: deployment.namespace })
        
        const costResponse = await api.get(costUrl)
        console.log('成本信息响应:', costResponse.data)
        if (costResponse.data && costResponse.data.data) {
          setDeploymentCostInfo(costResponse.data.data)
        } else if (costResponse.data) {
          setDeploymentCostInfo(costResponse.data)
        }
      } catch (costErr) {
        console.warn('⚠️ 获取成本信息失败:', costErr)
        console.warn('错误详情:', {
          message: costErr.message,
          response: costErr.response?.data,
          status: costErr.response?.status,
          statusText: costErr.response?.statusText,
          url: costErr.config?.url
        })
        // 成本信息获取失败不影响主流程，设置为null
        setDeploymentCostInfo(null)
        // 404错误是正常的，如果后端还没有实现成本功能
        if (costErr.response?.status === 404) {
          console.info('成本信息API返回404，可能是功能尚未实现')
        }
      }
      
    } catch (err) {
      console.error('获取Deployment详情失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchDetailFailed'))
      // 发生错误时重置状态
      setSelectedDeployment(null)
      setDeploymentDetail(null)
      setDeploymentPods([])
    } finally {
      setLoading(false)
    }
  }

  const handleBackFromDeploymentDetail = () => {
    // 清除URL参数，返回到列表视图
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('deployment')
    newParams.delete('deploymentNamespace')
    newParams.delete('view')
    setSearchParams(newParams, { replace: true })
    
    setSelectedDeployment(null)
    setDeploymentDetail(null)
    setDeploymentPods([])
    setDeploymentCostInfo(null)
    setDeploymentDetailTab('pods')
    setIsDeploymentFromUrl(false)
    setHpaList([])
    setCronHpaList([])
    
    // 滚动到页面顶部
    window.scrollTo(0, 0)
  }
  
  // 获取HPA列表
  const fetchHpaList = async (deployment) => {
    if (!deployment || !deployment.name || !deployment.namespace) return
    
    try {
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/hpa`)
      const data = response.data.data || response.data
      if (Array.isArray(data)) {
        setHpaList(data)
      } else if (data && Array.isArray(data.data)) {
        setHpaList(data.data)
      } else {
        setHpaList([])
      }
    } catch (err) {
      console.error('获取HPA列表失败:', err)
      // 如果API不存在（404），设置为空数组
      if (err.response?.status === 404) {
        setHpaList([])
      } else {
        setError(err.response?.data?.message || '获取HPA列表失败')
      }
    }
  }
  
  // 获取CronHPA列表
  const fetchCronHpaList = async (deployment) => {
    if (!deployment || !deployment.name || !deployment.namespace) return
    
    try {
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/cronhpa`)
      const data = response.data.data || response.data
      if (Array.isArray(data)) {
        setCronHpaList(data)
      } else if (data && Array.isArray(data.data)) {
        setCronHpaList(data.data)
      } else {
        setCronHpaList([])
      }
    } catch (err) {
      console.error('获取CronHPA列表失败:', err)
      // 如果API不存在（404），设置为空数组
      if (err.response?.status === 404) {
        setCronHpaList([])
      } else {
        setError(err.response?.data?.message || '获取CronHPA列表失败')
      }
    }
  }
  
  // 检查CronHPA组件是否安装
  const checkCronHpaInstalled = async () => {
    try {
      const response = await api.get(`/k8s/clusters/${id}/cronhpa/status`)
      const data = response.data.data || response.data
      setCronHpaInstalled(data?.installed || false)
    } catch (err) {
      console.error('检查CronHPA组件状态失败:', err)
      setCronHpaInstalled(false)
    }
  }
  
  // 安装CronHPA组件
  const handleInstallCronHpa = async () => {
    try {
      setLoading(true)
      setError('')
      await api.post(`/k8s/clusters/${id}/cronhpa/install`)
      setSuccess('CronHPA组件安装成功')
      setCronHpaInstalled(true)
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err.response?.data?.message || '安装CronHPA组件失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 删除HPA
  const handleDeleteHpa = async (hpa) => {
    if (!selectedDeployment) return
    
    try {
      setLoading(true)
      setError('')
      await api.delete(`/k8s/clusters/${id}/namespaces/${selectedDeployment.namespace}/deployments/${selectedDeployment.name}/hpa/${hpa.name}`)
      setSuccess('HPA删除成功')
      setTimeout(() => {
        fetchHpaList(selectedDeployment)
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || '删除HPA失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 删除CronHPA
  const handleDeleteCronHpa = async (cronHpa) => {
    if (!selectedDeployment) return
    
    try {
      setLoading(true)
      setError('')
      await api.delete(`/k8s/clusters/${id}/namespaces/${selectedDeployment.namespace}/deployments/${selectedDeployment.name}/cronhpa/${cronHpa.name}`)
      setSuccess('CronHPA删除成功')
      setTimeout(() => {
        fetchCronHpaList(selectedDeployment)
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || '删除CronHPA失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 获取Deployment历史版本
  const fetchDeploymentHistoryVersions = async (deployment) => {
    if (!deployment || !deployment.name || !deployment.namespace) return
    
    try {
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/history`)
      const data = response.data.data || response.data
      if (Array.isArray(data)) {
        setDeploymentHistoryVersions(data)
      } else if (data && Array.isArray(data.data)) {
        setDeploymentHistoryVersions(data.data)
      } else {
        setDeploymentHistoryVersions([])
      }
    } catch (err) {
      console.error('获取Deployment历史版本失败:', err)
      if (err.response?.status === 404) {
        setDeploymentHistoryVersions([])
      } else {
        setError(err.response?.data?.message || '获取历史版本失败')
      }
    }
  }
  
  // 回滚到指定版本
  const handleRollbackDeployment = async (revision) => {
    if (!selectedDeployment) return
    
    if (!window.confirm(`确定要回滚到版本 ${revision} 吗？`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      await api.post(`/k8s/clusters/${id}/namespaces/${selectedDeployment.namespace}/deployments/${selectedDeployment.name}/rollback`, {
        revision: revision
      })
      setSuccess('回滚成功')
      setTimeout(() => {
        // 刷新历史版本列表和deployment详情
        fetchDeploymentHistoryVersions(selectedDeployment)
        if (selectedDeployment) {
          loadDeploymentDetail(selectedDeployment)
        }
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || '回滚失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 查看版本详情
  const handleViewVersionDetail = async (revision) => {
    if (!selectedDeployment) return
    
    try {
      setLoading(true)
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${selectedDeployment.namespace}/deployments/${selectedDeployment.name}/history/${revision}`)
      const data = response.data.data || response.data
      // 显示版本详情的YAML
      setPodYaml(data.yaml || JSON.stringify(data, null, 2))
      setShowYamlModal(true)
    } catch (err) {
      setError(err.response?.data?.message || '获取版本详情失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理Deployment YAML编辑
  const handleEditDeploymentYaml = async (deployment) => {
    try {
      setLoading(true)
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/yaml`)
      if (response.data && response.data.data) {
        setDeploymentYaml(response.data.data.yaml || response.data.data)
      } else {
        setDeploymentYaml(response.data.yaml || '')
      }
      setEditingDeploymentYaml(deployment)
      setShowYamlEditModal(true)
    } catch (err) {
      console.error('获取Deployment YAML失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchYamlFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理重新部署
  const handleRedeploy = async (deployment) => {
    if (!window.confirm(t('k8s.confirmRedeploy'))) {
      return
    }
    try {
      setLoading(true)
      await api.post(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/redeploy`)
      // 刷新列表
      if (selectedWorkloadNamespace) {
        fetchDeployments(selectedWorkloadNamespace)
      } else {
        fetchDeployments()
      }
    } catch (err) {
      console.error('重新部署失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.redeployFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理编辑Deployment标签
  const handleEditDeploymentLabels = (deployment) => {
    setEditingDeployment(deployment)
    setEditDeploymentData({
      replicas: deployment.replicas || 1,
      image: deployment.image || deployment.images?.[0] || '',
      labels: deployment.labels || {},
      annotations: {}
    })
    setShowEditDeploymentModal(true)
  }

  // 处理编辑Deployment注解
  const handleEditDeploymentAnnotations = async (deployment) => {
    try {
      setLoading(true)
      const detailResponse = await api.get(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}`)
      if (detailResponse.data && detailResponse.data.data) {
        setEditingDeployment(deployment)
        setEditDeploymentData({
          replicas: detailResponse.data.data.replicas || 1,
          image: detailResponse.data.data.image || detailResponse.data.data.images?.[0] || '',
          labels: {},
          annotations: detailResponse.data.data.annotations || {}
        })
        setShowEditDeploymentModal(true)
      }
    } catch (err) {
      console.error('获取Deployment详情失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchDetailFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理查看Deployment日志
  const handleViewDeploymentLogs = async (deployment) => {
    await handleDeploymentClick(deployment)
    setDeploymentDetailTab('logs')
  }

  // 处理删除Deployment
  const handleDeleteDeployment = async (deployment) => {
    if (!window.confirm(t('k8s.confirmDeleteDeployment'))) {
      return
    }
    try {
      setLoading(true)
      await api.delete(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}`)
      // 如果删除的是当前查看的Deployment，返回列表
      if (selectedDeployment && selectedDeployment.name === deployment.name && selectedDeployment.namespace === deployment.namespace) {
        handleBackFromDeploymentDetail()
      }
      // 刷新列表
      if (selectedWorkloadNamespace) {
        fetchDeployments(selectedWorkloadNamespace)
        } else {
        fetchDeployments()
      }
    } catch (err) {
      console.error('删除Deployment失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.deleteDeploymentFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理伸缩Deployment
  const handleScaleDeployment = async (deployment) => {
    const currentReplicas = deployment.replicas || deploymentDetail?.replicas || 1
    const newReplicas = prompt(t('k8s.scaleDeployment'), currentReplicas)
    if (newReplicas === null) return
    
    const replicas = parseInt(newReplicas)
    if (isNaN(replicas) || replicas < 0) {
      setError(t('k8s.invalidReplicas'))
      return
    }
    
    try {
      setLoading(true)
      await api.put(`/k8s/clusters/${id}/namespaces/${deployment.namespace}/deployments/${deployment.name}/scale`, {
        replicas: replicas
      })
      // 刷新详情
      if (selectedDeployment && selectedDeployment.name === deployment.name) {
        await loadDeploymentDetail(selectedDeployment)
      }
      // 刷新列表
      if (selectedWorkloadNamespace) {
        fetchDeployments(selectedWorkloadNamespace)
      } else {
        fetchDeployments()
      }
      setSuccess(t('k8s.scaleSuccess'))
    } catch (err) {
      console.error('伸缩Deployment失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.scaleFailed'))
    } finally {
      setLoading(false)
    }
  }

  // StatefulSet 相关处理函数
  // 处理返回StatefulSet列表
  const handleBackFromStatefulSetDetail = () => {
    const newParams = new URLSearchParams()
    newParams.set('tab', 'workloads')
    newParams.set('type', 'statefulsets')
    if (selectedWorkloadNamespace) {
      newParams.set('namespace', selectedWorkloadNamespace)
    }
    navigate(`/k8s/cluster/${id}?${newParams.toString()}`, { replace: true })
    setSelectedStatefulSet(null)
    setStatefulSetDetail(null)
    setStatefulSetPods([])
    setStatefulSetDetailTab('pods')
    loadedStatefulSetRef.current = null
  }

  // 处理StatefulSet YAML编辑
  const handleEditStatefulSetYaml = async (statefulSet) => {
    try {
      setLoading(true)
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}/yaml`)
      if (response.data && response.data.data) {
        setStatefulSetYaml(response.data.data.yaml || response.data.data)
      } else {
        setStatefulSetYaml(response.data.yaml || '')
      }
      setEditingStatefulSetYaml(statefulSet)
      setShowStatefulSetYamlEditModal(true)
    } catch (err) {
      console.error('获取StatefulSet YAML失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchYamlFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理重新部署StatefulSet
  const handleRedeployStatefulSet = async (statefulSet) => {
    if (!window.confirm(t('k8s.confirmRedeploy'))) {
      return
    }
    try {
      setLoading(true)
      await api.post(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}/redeploy`)
      // 刷新列表
      if (selectedWorkloadNamespace) {
        fetchStatefulSets(selectedWorkloadNamespace)
      } else {
        fetchStatefulSets()
      }
    } catch (err) {
      console.error('重新部署StatefulSet失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.redeployFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理编辑StatefulSet标签
  const handleEditStatefulSetLabels = (statefulSet) => {
    setEditingStatefulSet(statefulSet)
    setEditStatefulSetData({
      replicas: statefulSet.replicas || 1,
      image: statefulSet.image || statefulSet.images?.[0] || '',
      labels: statefulSet.labels || {},
      annotations: {}
    })
    setShowEditStatefulSetModal(true)
  }

  // 处理编辑StatefulSet注解
  const handleEditStatefulSetAnnotations = async (statefulSet) => {
    try {
      setLoading(true)
      const detailResponse = await api.get(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}`)
      if (detailResponse.data && detailResponse.data.data) {
        setEditingStatefulSet(statefulSet)
        setEditStatefulSetData({
          replicas: detailResponse.data.data.replicas || 1,
          image: detailResponse.data.data.image || detailResponse.data.data.images?.[0] || '',
          labels: {},
          annotations: detailResponse.data.data.annotations || {}
        })
        setShowEditStatefulSetModal(true)
      }
    } catch (err) {
      console.error('获取StatefulSet详情失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchDetailFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理查看StatefulSet日志
  const handleViewStatefulSetLogs = async (statefulSet) => {
    await handleStatefulSetClick(statefulSet)
    setStatefulSetDetailTab('logs')
  }

  // 处理删除StatefulSet
  const handleDeleteStatefulSet = async (statefulSet) => {
    if (!window.confirm(t('k8s.confirmDeleteStatefulSet'))) {
      return
    }
    try {
      setLoading(true)
      await api.delete(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}`)
      // 如果删除的是当前查看的StatefulSet，返回列表
      if (selectedStatefulSet && selectedStatefulSet.name === statefulSet.name && selectedStatefulSet.namespace === statefulSet.namespace) {
        handleBackFromStatefulSetDetail()
      }
      // 刷新列表
      if (selectedWorkloadNamespace) {
        fetchStatefulSets(selectedWorkloadNamespace)
      } else {
        fetchStatefulSets()
      }
    } catch (err) {
      console.error('删除StatefulSet失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.deleteStatefulSetFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理伸缩StatefulSet
  const handleScaleStatefulSet = async (statefulSet) => {
    const currentReplicas = statefulSet.replicas || statefulSetDetail?.replicas || 1
    const newReplicas = prompt(t('k8s.scaleStatefulSet'), currentReplicas)
    if (newReplicas === null) return
    
    const replicas = parseInt(newReplicas)
    if (isNaN(replicas) || replicas < 0) {
      setError(t('k8s.invalidReplicas'))
      return
    }
    
    try {
      setLoading(true)
      await api.put(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}/scale`, {
        replicas: replicas
      })
      // 刷新详情
      if (selectedStatefulSet && selectedStatefulSet.name === statefulSet.name) {
        await loadStatefulSetDetail(selectedStatefulSet)
      }
      // 刷新列表
      if (selectedWorkloadNamespace) {
        fetchStatefulSets(selectedWorkloadNamespace)
      } else {
        fetchStatefulSets()
      }
      setSuccess(t('k8s.scaleSuccess'))
    } catch (err) {
      console.error('伸缩StatefulSet失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.scaleFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 批量删除StatefulSet
  const handleBatchDeleteStatefulSets = async () => {
    if (selectedStatefulSets.length === 0) return
    if (!window.confirm(t('k8s.confirmBatchDeleteStatefulSets'))) {
      return
    }
    try {
      setLoading(true)
      for (const key of selectedStatefulSets) {
        const [namespace, name] = key.split('/')
        await api.delete(`/k8s/clusters/${id}/namespaces/${namespace}/statefulsets/${name}`)
      }
      setSelectedStatefulSets([])
      if (selectedWorkloadNamespace) {
        fetchStatefulSets(selectedWorkloadNamespace)
      } else {
        fetchStatefulSets()
      }
      setSuccess(t('k8s.batchDeleteSuccess'))
    } catch (err) {
      console.error('批量删除StatefulSet失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.batchDeleteFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 批量重新部署StatefulSet
  const handleBatchRedeployStatefulSets = async () => {
    if (selectedStatefulSets.length === 0) return
    if (!window.confirm(t('k8s.confirmBatchRedeployStatefulSets'))) {
      return
    }
    try {
      setLoading(true)
      for (const key of selectedStatefulSets) {
        const [namespace, name] = key.split('/')
        await api.post(`/k8s/clusters/${id}/namespaces/${namespace}/statefulsets/${name}/redeploy`)
      }
      setSelectedStatefulSets([])
      if (selectedWorkloadNamespace) {
        fetchStatefulSets(selectedWorkloadNamespace)
      } else {
        fetchStatefulSets()
      }
      setSuccess(t('k8s.batchRedeploySuccess'))
    } catch (err) {
      console.error('批量重新部署StatefulSet失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.batchRedeployFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 处理查看Pod详情
  const handleViewPodDetails = (pod) => {
    // 可以跳转到Pod详情页或显示Pod详情模态框
    setSelectedNamespace(pod.namespace)
    setActiveTab('pods')
    // 这里可以添加更多逻辑，比如高亮选中的Pod
  }

  const handleViewLogs = async (pod) => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/namespaces/${pod.namespace}/pods/${pod.name}/logs`)
      setPodLogs(response.data.data.logs)
      setEditingPod(pod)
      setShowLogsModal(true)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.fetchLogsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePod = async (pod) => {
    const confirmMsg = t('k8s.confirmDeletePod').replace('{podName}', pod.name)
    if (!window.confirm(confirmMsg)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      await api.delete(`/k8s/clusters/${id}/namespaces/${pod.namespace}/pods/${pod.name}`)
      setSuccess(t('k8s.deletePodSuccess'))
      setTimeout(() => {
        fetchPods(pod.namespace)
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.deletePodFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditLabels = (pod) => {
    setEditingPod(pod)
    setEditingLabels(pod.labels || {})
    setShowLabelsModal(true)
  }

  const handleSaveLabels = async () => {
    if (!editingPod) return

    try {
      setLoading(true)
      setError('')
      await api.put(`/k8s/clusters/${id}/namespaces/${editingPod.namespace}/pods/${editingPod.name}/labels`, {
        labels: editingLabels
      })
      setSuccess(t('k8s.updateLabelsSuccess'))
      setShowLabelsModal(false)
      setEditingPod(null)
      setEditingLabels({})
      setTimeout(() => {
        fetchPods(editingPod.namespace)
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.updateLabelsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditAnnotations = (pod) => {
    setEditingPod(pod)
    setEditingAnnotations(pod.annotations || {})
    setShowAnnotationsModal(true)
  }

  const handleSaveAnnotations = async () => {
    if (!editingPod) return

    try {
      setLoading(true)
      setError('')
      await api.put(`/k8s/clusters/${id}/namespaces/${editingPod.namespace}/pods/${editingPod.name}/annotations`, {
        annotations: editingAnnotations
      })
      setSuccess(t('k8s.updateAnnotationsSuccess'))
      setShowAnnotationsModal(false)
      setEditingPod(null)
      setEditingAnnotations({})
      setTimeout(() => {
        fetchPods(editingPod.namespace)
        setSuccess('')
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.updateAnnotationsFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <Sidebar />
      <div className="page-content">
        <header className="page-header">
          <div className="header-right">
            <UserProfile user={user} onLogout={logout} />
          </div>
        </header>

        <main className="page-main">
          <div className="page-title-bar">
            <div>
              <button
                className="btn-back"
                onClick={() => navigate('/k8s')}
              >
                ← {t('common.back')}
              </button>
              <h1>{t('k8s.clusterDetail')}</h1>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="cluster-detail-container">
            <div className="tab-content">
                <>
                  {activeTab === 'info' && (
                    <div className="info-section">
                      {clusterInfo && (
                        <div className="info-grid">
                          <div className="info-card">
                            <h3>{t('k8s.basicInfo')}</h3>
                            <div className="info-item">
                              <span className="info-label">{t('k8s.name')}:</span>
                              <span className="info-value">{clusterInfo.name}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">{t('k8s.type')}:</span>
                              <span className="info-value">{clusterInfo.type}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">{t('k8s.apiServer')}:</span>
                              <span className="info-value">{clusterInfo.api_server}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">{t('k8s.status')}:</span>
                              <span className={`status-badge ${clusterInfo.status === 'connected' ? 'status-connected' : 'status-unknown'}`}>
                                {clusterInfo.status}
                              </span>
                            </div>
                          </div>

                          {clusterInfo.version && (
                            <div className="info-card">
                              <h3>{t('k8s.versionInfo')}</h3>
                              <div className="info-item">
                                <span className="info-label">{t('k8s.k8sVersion')}:</span>
                                <span className="info-value">{clusterInfo.version.gitVersion}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">{t('k8s.platform')}:</span>
                                <span className="info-value">{clusterInfo.version.platform}</span>
                              </div>
                            </div>
                          )}

                          <div className="info-card">
                            <h3>{t('k8s.resources')}</h3>
                            <div className="info-item">
                              <span className="info-label">{t('k8s.nodeCount')}:</span>
                              <span className="info-value">{clusterInfo.nodeCount || 0}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">{t('k8s.namespaceCount')}:</span>
                              <span className="info-value">{clusterInfo.namespaceCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'nodes' && (
                    <div className="nodes-section">
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('k8s.nodeName')}</th>
                              <th>{t('k8s.status')}</th>
                              <th>{t('k8s.roles')}</th>
                              <th>{t('k8s.version')}</th>
                              <th>{t('k8s.os')}</th>
                              <th>{t('k8s.cpu')}</th>
                              <th>{t('k8s.memory')}</th>
                              <th>{t('k8s.pods')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nodes.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="empty-state">
                                  {t('k8s.noNodes')}
                                </td>
                              </tr>
                            ) : (
                              nodes.map((node) => (
                                <tr key={node.name}>
                                  <td>{node.name}</td>
                                  <td>
                                    <span className={`status-badge ${node.status === 'Ready' ? 'status-connected' : 'status-error'}`}>
                                      {node.status}
                                    </span>
                                  </td>
                                  <td>
                                    {node.roles && node.roles.length > 0 ? node.roles.join(', ') : '-'}
                                  </td>
                                  <td>{node.version}</td>
                                  <td>{node.os}</td>
                                  <td>{node.cpu}</td>
                                  <td>{node.memory}</td>
                                  <td>{node.pods}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {!loading && nodes.length > 0 && (
                        <Pagination
                          currentPage={nodesPage}
                          totalPages={Math.ceil(nodesTotal / nodesPageSize)}
                          totalItems={nodesTotal}
                          pageSize={nodesPageSize}
                          onPageChange={(page) => {
                            setNodesPage(page)
                            fetchNodes()
                          }}
                          onPageSizeChange={(newSize) => {
                            setNodesPageSize(newSize)
                            setNodesPage(1)
                            fetchNodes()
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'namespaces' && (
                    <div className="namespaces-section">
                      {selectedNamespace ? (
                        <div>
                          <div className="namespace-header">
                            <button
                              className="btn-back-small"
                              onClick={() => setSelectedNamespace(null)}
                            >
                              ← {t('common.back')}
                            </button>
                            <h3>{t('k8s.podsInNamespace').replace('{namespace}', selectedNamespace)}</h3>
                          </div>
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('k8s.podName')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.status')}</th>
                                  <th>{t('k8s.ready')}</th>
                                  <th>{t('k8s.containers')}</th>
                                  <th>{t('k8s.images')}</th>
                                  <th>{t('k8s.labels')}</th>
                                  <th>{t('k8s.createdAt')}</th>
                                  <th>{t('k8s.updatedAt')}</th>
                                  <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pods.length === 0 ? (
                                  <tr>
                                    <td colSpan="10" className="empty-state">
                                      {t('k8s.noPods')}
                                    </td>
                                  </tr>
                                ) : (
                                  pods.map((pod) => (
                                    <tr key={pod.name}>
                                      <td>{pod.name}</td>
                                      <td>{pod.namespace}</td>
                                      <td>
                                        <span className={`status-badge ${getPodStatusClass(pod.status)}`}>
                                          {pod.status}
                                        </span>
                                      </td>
                                      <td>{pod.ready}</td>
                                      <td>{pod.containers || 0}</td>
                                      <td className="images-cell">
                                        {pod.images && pod.images.length > 0
                                          ? pod.images.slice(0, 2).join(', ') + (pod.images.length > 2 ? '...' : '')
                                          : '-'}
                                      </td>
                                      <td className="labels-cell">
                                        {pod.labels && Object.keys(pod.labels).length > 0
                                          ? Object.entries(pod.labels).slice(0, 2).map(([k, v]) => (
                                              <span key={k} className="label-tag">{k}={v}</span>
                                            ))
                                          : '-'}
                                      </td>
                                      <td>
                                        {pod.created_at ? new Date(pod.created_at).toLocaleString('zh-CN') : '-'}
                                      </td>
                                      <td>
                                        {pod.updated_at ? new Date(pod.updated_at).toLocaleString('zh-CN') : '-'}
                                      </td>
                                      <td>
                                        <div className="action-buttons">
                                          <div className="action-dropdown">
                                            <button
                                              className="btn-text btn-more"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                // 关闭其他下拉菜单
                                                document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                  if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                    menu.classList.remove('show')
                                                  }
                                                })
                                                const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                dropdown.classList.toggle('show')
                                              }}
                                            >
                                              {t('common.more')} ▼
                                            </button>
                                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                              <button onClick={() => {
                                                handleEditYaml(pod)
                                                document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                              }}>
                                                {t('k8s.editYaml')}
                                              </button>
                                              <button onClick={() => {
                                                handleRestartPod(pod.namespace, pod.name)
                                                document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                              }}>
                                                {t('k8s.restart')}
                                              </button>
                                              <button onClick={() => {
                                                handleViewLogs(pod)
                                                document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                              }}>
                                                {t('k8s.logs')}
                                              </button>
                                              <button onClick={() => {
                                                handleEditLabels(pod)
                                                document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                              }}>
                                                {t('k8s.editLabels')}
                                              </button>
                                              <button onClick={() => {
                                                handleEditAnnotations(pod)
                                                document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                              }}>
                                                {t('k8s.editAnnotations')}
                                              </button>
                                              <button
                                                className="danger"
                                                onClick={() => {
                                                  handleDeletePod(pod)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}
                                              >
                                                {t('common.delete')}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                            <div>
                          <div className="section-header">
                            <h2>{t('k8s.namespacesAndQuota')}</h2>
                            </div>
                          <div className="section-actions-left">
                          <button
                            className="btn-primary"
                              onClick={() => setShowCreateNamespaceModal(true)}
                            >
                              {t('common.create')}
                          </button>
                            <select
                              className="search-type-select"
                              value={namespaceSearchType}
                              onChange={(e) => setNamespaceSearchType(e.target.value)}
                            >
                              <option value="name">{t('k8s.name')}</option>
                            </select>
                            <input
                              type="text"
                              className="search-input-inline"
                              placeholder={t('k8s.searchPlaceholder')}
                              value={namespaceSearchTerm}
                              onChange={(e) => setNamespaceSearchTerm(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  fetchNamespaces()
                                }
                              }}
                            />
                            <button
                              className="btn-search"
                              onClick={() => fetchNamespaces()}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedNamespaces.length === namespaces.length && namespaces.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedNamespaces(namespaces.map(ns => ns.name))
                                        } else {
                                          setSelectedNamespaces([])
                                        }
                                      }}
                                    />
                                  </th>
                                      <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.labels')}</th>
                                <th>{t('k8s.status')}</th>
                                <th>{t('k8s.createdAt')}</th>
                                <th>{t('common.actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {namespaces.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-state">
                                    {t('k8s.noNamespaces')}
                                  </td>
                                </tr>
                              ) : (
                                  namespaces
                                    .filter((ns) => {
                                      if (!namespaceSearchTerm) return true
                                      if (namespaceSearchType === 'name') {
                                        return ns.name.toLowerCase().includes(namespaceSearchTerm.toLowerCase())
                                      }
                                      return true
                                    })
                                    .map((ns) => (
                                  <tr key={ns.name}>
                                    <td>
                                        <input
                                          type="checkbox"
                                          checked={selectedNamespaces.includes(ns.name)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedNamespaces([...selectedNamespaces, ns.name])
                                            } else {
                                              setSelectedNamespaces(selectedNamespaces.filter(name => name !== ns.name))
                                            }
                                          }}
                                        />
                                    </td>
                                    <td>
                                        <span className="namespace-link">
                                          {ns.name}
                                      </span>
                                    </td>
                                      <td></td>
                                    <td>
                                      {ns.labels && Object.keys(ns.labels).length > 0
                                          ? Object.entries(ns.labels).map(([k, v]) => (
                                              <span key={k} className="label-tag">{k}={v}</span>
                                            ))
                                        : '-'}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${ns.status === 'Active' ? 'status-connected' : 'status-unknown'}`}>
                                          <span className="status-icon">✓</span> {t('k8s.ready')}
                                  </span>
                                            </td>
                                      <td>
                                        {ns.created_at ? new Date(ns.created_at).toLocaleString('zh-CN') : '-'}
                                            </td>
                                            <td>
                                              <div className="action-buttons">
                                      <button
                                            className="btn-text"
                                                  onClick={() => {
                                              setEditingNamespace(ns)
                                              setShowQuotaModal(true)
                                                  }}
                                                >
                                            {t('k8s.resourceQuotaAndLimits')}
                                      </button>
                                                <button 
                                                  className="btn-text"
                                                  onClick={() => {
                                              setEditingNamespace(ns)
                                              setShowEditNamespaceModal(true)
                                }}
                              >
                                {t('common.edit')}
                              </button>
                              <div className="action-dropdown">
                                <button 
                                                className="btn-text btn-more"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                  if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                        menu.classList.remove('show')
                                      }
                                    })
                                                const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                      dropdown.classList.toggle('show')
                                  }}
                                >
                                              ⋮
                                </button>
                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                  disabled
                                                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                              onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}
                                                >
                                    {t('k8s.monitoring')}
                                  </button>
                                  <button onClick={() => {
                                                  handleEditNamespaceYaml(ns)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.yamlEdit')}
                                  </button>
                                  <button
                                    className="danger"
                                    onClick={() => {
                                                    handleDeleteNamespace(ns)
                                      document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    }}
                                  >
                                    {t('common.delete')}
                                  </button>
                                                  <button onClick={() => {
                                                  handleToggleNamespaceDeletionProtection(ns)
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}>
                                                  {t('k8s.enableDeletionProtection')}
                            </button>
                          </div>
                                            </div>
                                            </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                                        </div>
                        </div>
                      )}
                      {!loading && !selectedNamespace && namespaces.length > 0 && (
                        <Pagination
                          currentPage={namespacesPage}
                          totalPages={Math.ceil(namespacesTotal / namespacesPageSize)}
                          totalItems={namespacesTotal}
                          pageSize={namespacesPageSize}
                          onPageChange={(page) => {
                            setNamespacesPage(page)
                            fetchNamespaces()
                          }}
                          onPageSizeChange={(newSize) => {
                            setNamespacesPageSize(newSize)
                            setNamespacesPage(1)
                            fetchNamespaces()
                          }}
                        />
                      )}
                      {!loading && selectedNamespace && pods.length > 0 && (
                        <Pagination
                          currentPage={podsPage}
                          totalPages={Math.ceil(podsTotal / podsPageSize)}
                          totalItems={podsTotal}
                          pageSize={podsPageSize}
                          onPageChange={(page) => {
                            setPodsPage(page)
                            fetchPods(selectedNamespace)
                          }}
                          onPageSizeChange={(newSize) => {
                            setPodsPageSize(newSize)
                            setPodsPage(1)
                            fetchPods(selectedNamespace)
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'network' && (
                    <div className="network-section">
                      {/* 服务 (Service) 列表 */}
                      {networkSubtab === 'services' && (
                      <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>服务 <span className="deployment-subtitle">Service</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setError('创建服务功能暂未实现')
                                }}
                              >
                                创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedNetworkNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedNetworkNamespace(newNamespace)
                                    setServicesPage(1)
                                    fetchServices(newNamespace || '')
                                  }}
                                >
                                  <option value="">全部命名空间</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">名称</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder="请输入"
                                    value={networkSearchTerm}
                                    onChange={(e) => setNetworkSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchServices(selectedNetworkNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchServices(selectedNetworkNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchServices(selectedNetworkNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedServices.length > 0 && selectedServices.length === services.filter((svc) => {
                                        if (!networkSearchTerm) return true
                                        return (svc.name || '').toLowerCase().includes(networkSearchTerm.toLowerCase())
                                      }).length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const filteredServices = services.filter((svc) => {
                                            if (!networkSearchTerm) return true
                                            return (svc.name || '').toLowerCase().includes(networkSearchTerm.toLowerCase())
                                          })
                                          setSelectedServices(filteredServices.map(svc => `${svc.namespace}/${svc.name}`))
                                        } else {
                                          setSelectedServices([])
                                        }
                                      }}
                                    />
                                  </th>
                                  <th>名称</th>
                                  <th>命名空间</th>
                                  <th>类型</th>
                                  <th>集群 IP</th>
                                  <th>端口映射</th>
                                  <th>外部 IP 地址</th>
                                  <th>选择器</th>
                                  <th>创建时间</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {services
                                  .filter((svc) => {
                                    if (!networkSearchTerm) return true
                                    return (svc.name || '').toLowerCase().includes(networkSearchTerm.toLowerCase())
                                  })
                                  .map((svc) => {
                                    const key = `${svc.namespace}/${svc.name}`
                                    const isSelected = selectedServices.includes(key)
                                    const ports = svc.ports || []
                                    const portMapping = ports.length > 0 
                                      ? ports.map(p => {
                                          if (typeof p === 'string') {
                                            return p
                                          }
                                          if (p.nodePort) {
                                            return `${p.port}:${p.targetPort || p.port}/${p.protocol || 'TCP'}`
                                          }
                                          return `${p.port}${p.targetPort && p.targetPort !== p.port ? ':' + p.targetPort : ''}/${p.protocol || 'TCP'}`
                                        }).join(', ')
                                      : '-'
                                    const selector = svc.selector ? Object.entries(svc.selector).map(([k, v]) => `${k}: ${v}`).join(', ') : '-'
                                    const createdAt = svc.created_at || svc.createdAt
                                    const createdYear = createdAt ? new Date(createdAt).getFullYear() + '年' : '-'
                                    return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedServices([...selectedServices, key])
                                              } else {
                                                setSelectedServices(selectedServices.filter(k => k !== key))
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="name-cell">{svc.name}</td>
                                        <td>{svc.namespace || '-'}</td>
                                        <td>{svc.type || 'ClusterIP'}</td>
                                        <td>{svc.clusterIP || svc.cluster_ip || 'None'}</td>
                                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={portMapping}>
                                          {portMapping}
                                        </td>
                                        <td>{svc.externalIPs && svc.externalIPs.length > 0 ? svc.externalIPs.join(', ') : (svc.loadBalancerIP || 'None')}</td>
                                        <td className="labels-cell" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selector}>
                                          {selector}
                                        </td>
                                        <td>{createdYear}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              setError('更新服务功能暂未实现')
                                            }}>
                                              更新
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              setError('YAML 编辑功能暂未实现')
                                            }}>
                                              YAML 编辑
                                            </button>
                                            <div className="action-dropdown">
                                              <button
                                                className="btn-text btn-more"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                  dropdown.classList.toggle('show')
                                                }}
                                              >
                                                ⋮
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                    if (window.confirm(`确定要删除服务 ${svc.name} 吗？`)) {
                                                      setError('删除服务功能暂未实现')
                                                    }
                                                  }}
                                                >
                                                  删除
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {services.length === 0 && (
                                  <tr>
                                    <td colSpan="10" className="empty-state">{t('k8s.noServices')}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {selectedServices.length > 0 && (
                            <div className="batch-actions" style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  if (window.confirm(`确定要删除选中的 ${selectedServices.length} 个服务吗？`)) {
                                    setError('批量删除服务功能暂未实现')
                                  }
                                }}
                              >
                                批量删除({selectedServices.length})
                              </button>
                            </div>
                          )}

                          {!loading && services.length > 0 && (
                            <Pagination
                              currentPage={servicesPage}
                              totalPages={Math.ceil(servicesTotal / servicesPageSize)}
                              totalItems={servicesTotal}
                              pageSize={servicesPageSize}
                              onPageChange={(page) => {
                                setServicesPage(page)
                                fetchServices(selectedNetworkNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setServicesPageSize(newSize)
                                setServicesPage(1)
                                fetchServices(selectedNetworkNamespace || '')
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* 路由 (Ingress) 列表 */}
                      {networkSubtab === 'ingress' && (
                      <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>路由 <span className="deployment-subtitle">Ingress</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setError('创建路由功能暂未实现')
                                }}
                              >
                                创建 Ingress
                              </button>
                              <button className="btn-secondary" disabled>
                                使用 YAML 创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedNetworkNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedNetworkNamespace(newNamespace)
                                    setIngressesPage(1)
                                    fetchIngresses(newNamespace || '')
                                  }}
                                >
                                  <option value="">全部命名空间</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">名称</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder="请输入"
                                    value={networkSearchTerm}
                                    onChange={(e) => setNetworkSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchIngresses(selectedNetworkNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchIngresses(selectedNetworkNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button className="btn-secondary" disabled style={{ marginRight: '8px' }}>
                                Nginx Ingress 概览
                              </button>
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchIngresses(selectedNetworkNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedIngresses.length > 0 && selectedIngresses.length === ingresses.filter((ing) => {
                                        if (!networkSearchTerm) return true
                                        return (ing.name || '').toLowerCase().includes(networkSearchTerm.toLowerCase())
                                      }).length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const filteredIngresses = ingresses.filter((ing) => {
                                            if (!networkSearchTerm) return true
                                            return (ing.name || '').toLowerCase().includes(networkSearchTerm.toLowerCase())
                                          })
                                          setSelectedIngresses(filteredIngresses.map(ing => `${ing.namespace}/${ing.name}`))
                                        } else {
                                          setSelectedIngresses([])
                                        }
                                      }}
                                    />
                                  </th>
                                  <th>名称</th>
                                  <th>命名空间</th>
                                  <th>网关类型</th>
                                  <th>规则</th>
                                  <th>端点</th>
                                  <th>创建时间</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ingresses
                                  .filter((ing) => {
                                    if (!networkSearchTerm) return true
                                    return (ing.name || '').toLowerCase().includes(networkSearchTerm.toLowerCase())
                                  })
                                  .map((ing) => {
                                    const key = `${ing.namespace}/${ing.name}`
                                    const isSelected = selectedIngresses.includes(key)
                                    const rules = ing.rules || []
                                    const rulesList = []
                                    if (rules.length > 0) {
                                      rules.forEach(rule => {
                                        const host = rule.host || '*'
                                        const paths = rule.paths || []
                                        if (paths.length > 0) {
                                          paths.forEach(p => {
                                            const path = p.path || '/'
                                            const serviceName = p.serviceName || (p.backend && p.backend.service && p.backend.service.name) || (p.backend && p.backend.serviceName) || '-'
                                            rulesList.push(`${host}${path} → ${serviceName}`)
                                          })
                                        } else {
                                          rulesList.push(host)
                                        }
                                      })
                                    }
                                    const rulesDisplay = rulesList.length > 0 ? rulesList.join('\n') : '-'
                                    const rulesDisplayText = rulesList.length > 0 ? rulesList.join('; ') : '-'
                                    const endpoint = ing.endpoint || ing.loadBalancerIP || ing.loadBalancer || '-'
                                    const gatewayType = ing.gatewayType || ing.ingress_class || '-'
                                    const isNginx = gatewayType.toLowerCase().includes('nginx')
                                    const isALB = gatewayType.toLowerCase().includes('alb')
                                    const createdAt = ing.created_at || ing.createdAt
                                    const createdTime = createdAt ? (() => {
                                      const date = new Date(createdAt)
                                      const year = date.getFullYear()
                                      const month = String(date.getMonth() + 1).padStart(2, '0')
                                      const day = String(date.getDate()).padStart(2, '0')
                                      const hours = String(date.getHours()).padStart(2, '0')
                                      const minutes = String(date.getMinutes()).padStart(2, '0')
                                      const seconds = String(date.getSeconds()).padStart(2, '0')
                                      return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
                                    })() : '-'
                                    return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedIngresses([...selectedIngresses, key])
                                              } else {
                                                setSelectedIngresses(selectedIngresses.filter(k => k !== key))
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="name-cell">{ing.name}</td>
                                        <td>{ing.namespace || '-'}</td>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {isALB ? (
                                              <span style={{ color: '#ff4d4f', fontSize: '16px' }}>☁</span>
                                            ) : isNginx ? (
                                              <span style={{ color: '#52c41a', fontSize: '14px', fontWeight: 'bold' }}>N</span>
                                            ) : null}
                                            <span>{gatewayType}</span>
                                          </div>
                                        </td>
                                        <td style={{ maxWidth: '500px', lineHeight: '1.6' }}>
                                          {rulesList.length > 0 ? (
                                            <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }} title={rulesDisplayText}>
                                              {rulesDisplay}
                                            </div>
                                          ) : (
                                            <span>-</span>
                                          )}
                                        </td>
                                        <td>{endpoint}</td>
                                        <td>{createdTime}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              setError('更新路由功能暂未实现')
                                            }}>
                                              更新
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              setError('YAML 编辑功能暂未实现')
                                            }}>
                                              YAML 编辑
                                            </button>
                                            {isNginx && (
                                              <button className="btn-text" onClick={() => {
                                                setError('监控功能暂未实现')
                                              }}>
                                                监控
                                              </button>
                                            )}
                                            <div className="action-dropdown">
                                              <button
                                                className="btn-text btn-more"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                  dropdown.classList.toggle('show')
                                                }}
                                              >
                                                ⋮
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                    if (window.confirm(`确定要删除路由 ${ing.name} 吗？`)) {
                                                      setError('删除路由功能暂未实现')
                                                    }
                                                  }}
                                                >
                                                  删除
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {ingresses.length === 0 && (
                                  <tr>
                                    <td colSpan="8" className="empty-state">{t('k8s.noIngresses')}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {selectedIngresses.length > 0 && (
                            <div className="batch-actions" style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  if (window.confirm(`确定要删除选中的 ${selectedIngresses.length} 个路由吗？`)) {
                                    setError('批量删除路由功能暂未实现')
                                  }
                                }}
                              >
                                批量删除({selectedIngresses.length})
                              </button>
                            </div>
                          )}

                          {!loading && ingresses.length > 0 && (
                            <Pagination
                              currentPage={ingressesPage}
                              totalPages={Math.ceil(ingressesTotal / ingressesPageSize)}
                              totalItems={ingressesTotal}
                              pageSize={ingressesPageSize}
                              onPageChange={(page) => {
                                setIngressesPage(page)
                                fetchIngresses(selectedNetworkNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setIngressesPageSize(newSize)
                                setIngressesPage(1)
                                fetchIngresses(selectedNetworkNamespace || '')
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'config' && (
                    <div className="config-section">
                      {/* 配置项 (ConfigMap) 列表 */}
                      {configSubtab === 'configmaps' && (
                      <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>配置项 <span className="deployment-subtitle">Configmap</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setError('创建配置项功能暂未实现')
                                }}
                              >
                                创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedConfigNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedConfigNamespace(newNamespace)
                                    setConfigMapsPage(1)
                                    fetchConfigMaps(newNamespace || '')
                                  }}
                                >
                                  <option value="">全部命名空间</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">名称</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder="请输入"
                                    value={configSearchTerm}
                                    onChange={(e) => setConfigSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchConfigMaps(selectedConfigNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchConfigMaps(selectedConfigNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchConfigMaps(selectedConfigNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedConfigMaps.length > 0 && selectedConfigMaps.length === configMaps.filter((cm) => {
                                        if (!configSearchTerm) return true
                                        return (cm.name || '').toLowerCase().includes(configSearchTerm.toLowerCase())
                                      }).length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const filteredConfigMaps = configMaps.filter((cm) => {
                                            if (!configSearchTerm) return true
                                            return (cm.name || '').toLowerCase().includes(configSearchTerm.toLowerCase())
                                          })
                                          setSelectedConfigMaps(filteredConfigMaps.map(cm => `${cm.namespace}/${cm.name}`))
                                        } else {
                                          setSelectedConfigMaps([])
                                        }
                                      }}
                                    />
                                  </th>
                                  <th>名称</th>
                                  <th>命名空间</th>
                                  <th>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 5.5L8 10.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      标签
                                    </span>
                                  </th>
                                  <th>创建时间</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {configMaps
                                  .filter((cm) => {
                                    if (!configSearchTerm) return true
                                    return (cm.name || '').toLowerCase().includes(configSearchTerm.toLowerCase())
                                  })
                                  .map((cm) => {
                                    const key = `${cm.namespace}/${cm.name}`
                                    const isSelected = selectedConfigMaps.includes(key)
                                    // 格式化创建时间：YYYY年MM月DD日 HH:MM:SS
                                    let formattedTime = '-'
                                    if (cm.created_at || cm.createdAt) {
                                      const date = new Date(cm.created_at || cm.createdAt)
                                      const year = date.getFullYear()
                                      const month = String(date.getMonth() + 1).padStart(2, '0')
                                      const day = String(date.getDate()).padStart(2, '0')
                                      const hours = String(date.getHours()).padStart(2, '0')
                                      const minutes = String(date.getMinutes()).padStart(2, '0')
                                      const seconds = String(date.getSeconds()).padStart(2, '0')
                                      formattedTime = `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
                                    }
                                    return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedConfigMaps([...selectedConfigMaps, key])
                                              } else {
                                                setSelectedConfigMaps(selectedConfigMaps.filter(k => k !== key))
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="name-cell">{cm.name}</td>
                                        <td>{cm.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {cm.labels && Object.keys(cm.labels).length > 0 ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 5.5L8 10.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td>{formattedTime}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              setError('编辑配置项功能暂未实现')
                                            }}>
                                              编辑
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              setError('YAML编辑功能暂未实现')
                                            }}>
                                              YAML 编辑
                                            </button>
                                            <button className="btn-text danger" onClick={() => {
                                              if (window.confirm(`确定要删除配置项 ${cm.name} 吗？`)) {
                                                setError('删除配置项功能暂未实现')
                                              }
                                            }}>
                                              删除
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {configMaps.length === 0 && (
                                  <tr>
                                    <td colSpan="6" className="empty-state">{t('k8s.noConfigMaps') || '暂无配置项'}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {!loading && configMaps.length > 0 && (
                            <Pagination
                              currentPage={configMapsPage}
                              totalPages={Math.ceil(configMapsTotal / configMapsPageSize)}
                              totalItems={configMapsTotal}
                              pageSize={configMapsPageSize}
                              onPageChange={(page) => {
                                setConfigMapsPage(page)
                                fetchConfigMaps(selectedConfigNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setConfigMapsPageSize(newSize)
                                setConfigMapsPage(1)
                                fetchConfigMaps(selectedConfigNamespace || '')
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* 保密字典 (Secret) 列表 */}
                      {configSubtab === 'secrets' && (
                      <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>保密字典 <span className="deployment-subtitle">Secret</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setError('创建保密字典功能暂未实现')
                                }}
                              >
                                创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedConfigNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedConfigNamespace(newNamespace)
                                    setSecretsPage(1)
                                    fetchSecrets(newNamespace || '')
                                  }}
                                >
                                  <option value="">全部命名空间</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">名称</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder="请输入"
                                    value={configSearchTerm}
                                    onChange={(e) => setConfigSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchSecrets(selectedConfigNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchSecrets(selectedConfigNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchSecrets(selectedConfigNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedSecrets.length > 0 && selectedSecrets.length === secrets.filter((s) => {
                                        if (!configSearchTerm) return true
                                        return (s.name || '').toLowerCase().includes(configSearchTerm.toLowerCase())
                                      }).length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const filteredSecrets = secrets.filter((s) => {
                                            if (!configSearchTerm) return true
                                            return (s.name || '').toLowerCase().includes(configSearchTerm.toLowerCase())
                                          })
                                          setSelectedSecrets(filteredSecrets.map(s => `${s.namespace}/${s.name}`))
                                        } else {
                                          setSelectedSecrets([])
                                        }
                                      }}
                                    />
                                  </th>
                                  <th>名称</th>
                                  <th>命名空间</th>
                                  <th>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 5.5L8 10.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      标签
                                    </span>
                                  </th>
                                  <th>类型</th>
                                  <th>创建时间</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {secrets
                                  .filter((s) => {
                                    if (!configSearchTerm) return true
                                    return (s.name || '').toLowerCase().includes(configSearchTerm.toLowerCase())
                                  })
                                  .map((s) => {
                                    const key = `${s.namespace}/${s.name}`
                                    const isSelected = selectedSecrets.includes(key)
                                    // 格式化创建时间：YYYY年MM月DD日 HH:MM:SS
                                    let formattedTime = '-'
                                    if (s.created_at || s.createdAt) {
                                      const date = new Date(s.created_at || s.createdAt)
                                      const year = date.getFullYear()
                                      const month = String(date.getMonth() + 1).padStart(2, '0')
                                      const day = String(date.getDate()).padStart(2, '0')
                                      const hours = String(date.getHours()).padStart(2, '0')
                                      const minutes = String(date.getMinutes()).padStart(2, '0')
                                      const seconds = String(date.getSeconds()).padStart(2, '0')
                                      formattedTime = `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
                                    }
                                    return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedSecrets([...selectedSecrets, key])
                                              } else {
                                                setSelectedSecrets(selectedSecrets.filter(k => k !== key))
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="name-cell">{s.name}</td>
                                        <td>{s.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {s.labels && Object.keys(s.labels).length > 0 ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 5.5L8 10.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td>{s.type || 'Opaque'}</td>
                                        <td>{formattedTime}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              setError('编辑保密字典功能暂未实现')
                                            }}>
                                              编辑
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              setError('YAML编辑功能暂未实现')
                                            }}>
                                              YAML 编辑
                                            </button>
                                            <button className="btn-text danger" onClick={() => {
                                              if (window.confirm(`确定要删除保密字典 ${s.name} 吗？`)) {
                                                setError('删除保密字典功能暂未实现')
                                              }
                                            }}>
                                              删除
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {secrets.length === 0 && (
                                  <tr>
                                    <td colSpan="7" className="empty-state">{t('k8s.noSecrets') || '暂无保密字典'}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {!loading && secrets.length > 0 && (
                            <Pagination
                              currentPage={secretsPage}
                              totalPages={Math.ceil(secretsTotal / secretsPageSize)}
                              totalItems={secretsTotal}
                              pageSize={secretsPageSize}
                              onPageChange={(page) => {
                                setSecretsPage(page)
                                fetchSecrets(selectedConfigNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setSecretsPageSize(newSize)
                                setSecretsPage(1)
                                fetchSecrets(selectedConfigNamespace || '')
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'storage' && (
                    <div className="storage-section">
                      {/* 存储声明 (PersistentVolumeClaim) 列表 */}
                      {(storageSubtab === 'pvcs' || !storageSubtab || storageSubtab === '') && (
                      <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>存储声明 <span className="deployment-subtitle">PersistentVolumeClaim</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setError('创建存储声明功能暂未实现')
                                }}
                              >
                                创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedStorageNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedStorageNamespace(newNamespace)
                                    setPvcsPage(1)
                                    fetchPVCs(newNamespace || '')
                                  }}
                                >
                                  <option value="">全部命名空间</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder="请输入"
                                    value={storageSearchTerm}
                                    onChange={(e) => setStorageSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchPVCs(selectedStorageNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchPVCs(selectedStorageNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchPVCs(selectedStorageNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>名称</th>
                                  <th>命名空间</th>
                                  <th>总量</th>
                                  <th>访问模式</th>
                                  <th>状态</th>
                                  <th>存储类型</th>
                                  <th>关联的存储卷</th>
                                  <th>创建时间</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pvcs
                                  .filter((pvc) => {
                                    if (!storageSearchTerm) return true
                                    return (pvc.name || '').toLowerCase().includes(storageSearchTerm.toLowerCase())
                                  })
                                  .map((pvc) => {
                                    // 格式化创建时间：YYYY-MM-DD HH:MM:SS
                                    let formattedTime = '-'
                                    if (pvc.created_at || pvc.createdAt) {
                                      const date = new Date(pvc.created_at || pvc.createdAt)
                                      const year = date.getFullYear()
                                      const month = String(date.getMonth() + 1).padStart(2, '0')
                                      const day = String(date.getDate()).padStart(2, '0')
                                      const hours = String(date.getHours()).padStart(2, '0')
                                      const minutes = String(date.getMinutes()).padStart(2, '0')
                                      const seconds = String(date.getSeconds()).padStart(2, '0')
                                      formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
                                    }
                                    
                                    // 判断是否显示扩容按钮（根据存储类型，某些类型支持扩容）
                                    const canScale = pvc.storageClass && (
                                      pvc.storageClass.includes('disk') || 
                                      pvc.storageClass.includes('alicloud-disk')
                                    )
                                    
                                    return (
                                      <tr key={`${pvc.namespace}/${pvc.name}`}>
                                        <td className="name-cell">{pvc.name}</td>
                                        <td>{pvc.namespace || '-'}</td>
                                        <td>{pvc.capacity || pvc.size || '-'}</td>
                                        <td>{Array.isArray(pvc.accessModes) ? pvc.accessModes.join(', ') : (pvc.accessModes || pvc.accessMode || '-')}</td>
                                        <td>
                                          <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '2px',
                                            fontSize: '12px',
                                            background: pvc.status === 'Bound' ? '#f6ffed' : '#fff7e6',
                                            color: pvc.status === 'Bound' ? '#52c41a' : '#faad14',
                                            border: `1px solid ${pvc.status === 'Bound' ? '#b7eb8f' : '#ffe58f'}`
                                          }}>
                                            {pvc.status || '-'}
                                          </span>
                                        </td>
                                        <td>{pvc.storageClass || pvc.storageType || '-'}</td>
                                        <td>{pvc.volumeName || pvc.volume || '-'}</td>
                                        <td>{formattedTime}</td>
                                        <td>
                                          <div className="action-buttons">
                                            {canScale && (
                                              <button className="btn-text" onClick={() => {
                                                setError('扩容功能暂未实现')
                                              }}>
                                                扩容
                                              </button>
                                            )}
                                            <button className="btn-text" onClick={() => {
                                              setError('监控功能暂未实现')
                                            }}>
                                              监控
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              setError('查看Yaml功能暂未实现')
                                            }}>
                                              查看Yaml
                                            </button>
                                            <button className="btn-text danger" onClick={() => {
                                              if (window.confirm(`确定要删除存储声明 ${pvc.name} 吗？`)) {
                                                setError('删除存储声明功能暂未实现')
                                              }
                                            }}>
                                              删除
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {pvcs.length === 0 && (
                                  <tr>
                                    <td colSpan="9" className="empty-state">{t('k8s.noPVCs') || '暂无存储声明'}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {!loading && pvcs.length > 0 && (
                            <Pagination
                              currentPage={pvcsPage}
                              totalPages={Math.ceil(pvcsTotal / pvcsPageSize)}
                              totalItems={pvcsTotal}
                              pageSize={pvcsPageSize}
                              onPageChange={(page) => {
                                setPvcsPage(page)
                                fetchPVCs(selectedStorageNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setPvcsPageSize(newSize)
                                setPvcsPage(1)
                                fetchPVCs(selectedStorageNamespace || '')
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* 存储卷 (PersistentVolume) 列表 */}
                      {storageSubtab === 'pvs' && (
                      <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>存储卷 <span className="deployment-subtitle">PersistentVolume</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setError('创建存储卷功能暂未实现')
                                }}
                              >
                                创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder="请输入"
                                    value={storageSearchTerm}
                                    onChange={(e) => setStorageSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchPVs()
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchPVs()}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchPVs()}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>名称</th>
                                  <th>总量</th>
                                  <th>访问模式</th>
                                  <th>回收策略</th>
                                  <th>状态</th>
                                  <th>存储类型</th>
                                  <th>绑定存储声明</th>
                                  <th>创建时间</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pvs
                                  .filter((pv) => {
                                    if (!storageSearchTerm) return true
                                    return (pv.name || '').toLowerCase().includes(storageSearchTerm.toLowerCase())
                                  })
                                  .map((pv) => {
                                    // 格式化创建时间：YYYY-MM-DD HH:MM:SS
                                    let formattedTime = '-'
                                    if (pv.created_at || pv.createdAt) {
                                      const date = new Date(pv.created_at || pv.createdAt)
                                      const year = date.getFullYear()
                                      const month = String(date.getMonth() + 1).padStart(2, '0')
                                      const day = String(date.getDate()).padStart(2, '0')
                                      const hours = String(date.getHours()).padStart(2, '0')
                                      const minutes = String(date.getMinutes()).padStart(2, '0')
                                      const seconds = String(date.getSeconds()).padStart(2, '0')
                                      formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
                                    }
                                    
                                    // 获取绑定存储声明信息
                                    const claimNamespace = pv.claimRef?.namespace || pv.claimNamespace || '-'
                                    const claimName = pv.claimRef?.name || pv.claimName || '-'
                                    const hasClaim = claimNamespace !== '-' && claimName !== '-'
                                    
                                    // 判断是否显示回收站按钮（根据回收策略，Delete策略显示回收站）
                                    const canRecycle = pv.reclaimPolicy === 'Delete' || pv.reclaimPolicy === 'Recycle'
                                    
                                    return (
                                      <tr key={pv.name}>
                                        <td className="name-cell">{pv.name}</td>
                                        <td>{pv.capacity || pv.size || '-'}</td>
                                        <td>{Array.isArray(pv.accessModes) ? pv.accessModes.join(', ') : (pv.accessModes || pv.accessMode || '-')}</td>
                                        <td>{pv.reclaimPolicy || pv.recyclePolicy || '-'}</td>
                                        <td>
                                          <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '2px',
                                            fontSize: '12px',
                                            background: pv.status === 'Bound' ? '#f6ffed' : '#fff7e6',
                                            color: pv.status === 'Bound' ? '#52c41a' : '#faad14',
                                            border: `1px solid ${pv.status === 'Bound' ? '#b7eb8f' : '#ffe58f'}`
                                          }}>
                                            {pv.status || '-'}
                                          </span>
                                        </td>
                                        <td>{pv.storageClass || pv.storageType || '-'}</td>
                                        <td>
                                          {hasClaim ? (
                                            <div>
                                              <div>命名空间: {claimNamespace}</div>
                                              <div>名称: {claimName}</div>
                                            </div>
                                          ) : '-'}
                                        </td>
                                        <td>{formattedTime}</td>
                                        <td>
                                          <div className="action-buttons">
                                            {canRecycle && (
                                              <button className="btn-text" onClick={() => {
                                                setError('回收站功能暂未实现')
                                              }}>
                                                回收站
                                              </button>
                                            )}
                                            <button className="btn-text" onClick={() => {
                                              setError('标签管理功能暂未实现')
                                            }}>
                                              标签管理
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              setError('查看Yaml功能暂未实现')
                                            }}>
                                              查看Yaml
                                            </button>
                                            <button className="btn-text danger" onClick={() => {
                                              if (window.confirm(`确定要删除存储卷 ${pv.name} 吗？`)) {
                                                setError('删除存储卷功能暂未实现')
                                              }
                                            }}>
                                              删除
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {pvs.length === 0 && (
                                  <tr>
                                    <td colSpan="9" className="empty-state">{t('k8s.noPVs') || '暂无存储卷'}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {!loading && pvs.length > 0 && (
                            <Pagination
                              currentPage={pvsPage}
                              totalPages={Math.ceil(pvsTotal / pvsPageSize)}
                              totalItems={pvsTotal}
                              pageSize={pvsPageSize}
                              onPageChange={(page) => {
                                setPvsPage(page)
                                fetchPVs()
                              }}
                              onPageSizeChange={(newSize) => {
                                setPvsPageSize(newSize)
                                setPvsPage(1)
                                fetchPVs()
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* 存储类 (StorageClass) 列表 */}
                      {storageSubtab === 'storageclasses' && (
                      <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>存储类 <span className="deployment-subtitle">StorageClass</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary"
                                onClick={() => {
                                  setError('创建存储类功能暂未实现')
                                }}
                              >
                                创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder="请输入"
                                    value={storageSearchTerm}
                                    onChange={(e) => setStorageSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchStorageClasses()
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchStorageClasses()}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchStorageClasses()}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>名称</th>
                                  <th>提供者</th>
                                  <th>参数</th>
                                  <th>回收策略</th>
                                  <th>创建时间</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {storageClasses
                                  .filter((sc) => {
                                    if (!storageSearchTerm) return true
                                    return (sc.name || '').toLowerCase().includes(storageSearchTerm.toLowerCase())
                                  })
                                  .map((sc) => {
                                    // 格式化创建时间：YYYY-MM-DD HH:MM:SS
                                    let formattedTime = '-'
                                    if (sc.created_at || sc.createdAt) {
                                      const date = new Date(sc.created_at || sc.createdAt)
                                      const year = date.getFullYear()
                                      const month = String(date.getMonth() + 1).padStart(2, '0')
                                      const day = String(date.getDate()).padStart(2, '0')
                                      const hours = String(date.getHours()).padStart(2, '0')
                                      const minutes = String(date.getMinutes()).padStart(2, '0')
                                      const seconds = String(date.getSeconds()).padStart(2, '0')
                                      formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
                                    }
                                    
                                    // 格式化参数显示（作为标签）
                                    const parameters = sc.parameters || {}
                                    const paramEntries = Object.entries(parameters)
                                    
                                    return (
                                      <tr key={sc.name}>
                                        <td className="name-cell">{sc.name}</td>
                                        <td>{sc.provisioner || sc.provider || '-'}</td>
                                        <td>
                                          {paramEntries.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                              {paramEntries.map(([key, value]) => (
                                                <span
                                                  key={key}
                                                  style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: '#f0f0f0',
                                                    fontSize: '12px',
                                                    color: '#666'
                                                  }}
                                                >
                                                  {key}: {String(value)}
                                                </span>
                                              ))}
                                            </div>
                                          ) : '-'}
                                        </td>
                                        <td>{sc.reclaimPolicy || sc.recyclePolicy || '-'}</td>
                                        <td>{formattedTime}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              setError('查看Yaml功能暂未实现')
                                            }}>
                                              查看Yaml
                                            </button>
                                            <button className="btn-text danger" onClick={() => {
                                              if (window.confirm(`确定要删除存储类 ${sc.name} 吗？`)) {
                                                setError('删除存储类功能暂未实现')
                                              }
                                            }}>
                                              删除
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {storageClasses.length === 0 && (
                                  <tr>
                                    <td colSpan="6" className="empty-state">{t('k8s.noStorageClasses') || '暂无存储类'}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {!loading && storageClasses.length > 0 && (
                            <Pagination
                              currentPage={storageClassesPage}
                              totalPages={Math.ceil(storageClassesTotal / storageClassesPageSize)}
                              totalItems={storageClassesTotal}
                              pageSize={storageClassesPageSize}
                              onPageChange={(page) => {
                                setStorageClassesPage(page)
                                fetchStorageClasses()
                              }}
                              onPageSizeChange={(newSize) => {
                                setStorageClassesPageSize(newSize)
                                setStorageClassesPage(1)
                                fetchStorageClasses()
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </>
            </div>
          </div>

          {/* 日志查看模态框 */}
          {showLogsModal && (
            <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
              <div className="modal-content logs-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.podLogs')} - {editingPod?.name}</h2>
                                <button
                    className="modal-close"
                            onClick={() => {
                      setShowLogsModal(false)
                      setEditingPod(null)
                      setPodLogs('')
                    }}
                  >
                    {t('common.close')}
                          </button>
                </div>
                <div className="logs-container">
                  <pre className="logs-content">{podLogs || t('k8s.noLogs')}</pre>
                </div>
                <div className="modal-actions">
                          <button
                    type="button"
                    className="btn-secondary"
                            onClick={() => {
                      setShowLogsModal(false)
                      setEditingPod(null)
                      setPodLogs('')
                    }}
                  >
                    {t('common.close')}
                          </button>
                        </div>
                          </div>
                            </div>
                  )}


                  {activeTab === 'workloads' && (
                    <div className="workloads-section">
                      {/* 无状态 Deployment 列表 */}
                      {workloadType === 'deployments' && !searchParams.get('view') && (
                        <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>无状态 <span className="deployment-subtitle">Deployment</span></h2>
                                </div>
                                </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                            <button
                                className="btn-primary" 
                                onClick={() => setShowCreateDeploymentModal(true)}
                            >
                                使用镜像创建
                            </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                            </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedWorkloadNamespace}
                                  onChange={(e) => setSelectedWorkloadNamespace(e.target.value)}
                                >
                                  <option value="">{t('k8s.allNamespaces')}</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">{t('k8s.name')}</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder={t('k8s.searchPlaceholder')}
                                    value={workloadSearchTerm}
                                    onChange={(e) => setWorkloadSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchDeployments(selectedWorkloadNamespace || '')
                                      }
                                    }}
                                  />
                            <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchDeployments(selectedWorkloadNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                            </button>
                                              </div>
                                            </div>
                                          </div>

                            <div className="deployment-toolbar-right">
                              <button className="icon-btn" disabled title="设置">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.64l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V22a2.2 2.2 0 0 1-4.4 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 1 1-3.12-3.12l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H2a2.2 2.2 0 0 1 0-4.4h-.06A1.8 1.8 0 0 0 3.6 8.4a1.8 1.8 0 0 0 .36-1.98l-.04-.04A2.2 2.2 0 1 1 7.04 3.2l.04.04A1.8 1.8 0 0 0 9.06 3.6a1.8 1.8 0 0 0 1.1-1.66V2a2.2 2.2 0 0 1 4.4 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 1 1 3.12 3.12l-.04.04A1.8 1.8 0 0 0 20.4 8.4a1.8 1.8 0 0 0 1.66 1.1H22a2.2 2.2 0 0 1 0 4.4h-.06a1.8 1.8 0 0 0-1.66 1.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchDeployments(selectedWorkloadNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                          </div>
                          </div>

                              <div className="table-wrapper">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                    <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedDeployments.length === deployments.length && deployments.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedDeployments(deployments.map(d => `${d.namespace}/${d.name}`))
                                        } else {
                                          setSelectedDeployments([])
                                        }
                                      }}
                                    />
                                    </th>
                                      <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>标签</th>
                                  <th>容器组数量</th>
                                      <th>{t('k8s.image')}</th>
                                      <th>{t('k8s.createdAt')}</th>
                                  <th>{t('k8s.updatedAt')}</th>
                                      <th>{t('common.actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                {deployments
                                  .filter((d) => {
                                    if (!workloadSearchTerm) return true
                                    return (d.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                  })
                                  .map((d) => {
                                    const key = `${d.namespace}/${d.name}`
                                        return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={selectedDeployments.includes(key)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedDeployments([...selectedDeployments, key])
                                              } else {
                                                setSelectedDeployments(selectedDeployments.filter(x => x !== key))
                                              }
                                            }}
                                          />
                                            </td>
                                          <td className="name-cell">
                                <button
                                            className="deployment-link"
                                            onClick={() => handleDeploymentClick(d)}
                                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                                          >
                                            {d.name}
                                </button>
                                            </td>
                                        <td>{d.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {d.labels && Object.keys(d.labels).length > 0 ? (
                                            <div className="labels-container">
                                              {Object.entries(d.labels).slice(0, 3).map(([key, value]) => (
                                                <span key={key} className="label-tag">
                                                  {key}:{value}
                                        </span>
                                              ))}
                                              {Object.keys(d.labels).length > 3 && (
                                                <span className="label-more">+{Object.keys(d.labels).length - 3}</span>
                                                  )}
                                                </div>
                                ) : (
                                            '-'
                                          )}
                                            </td>
                                      <td>
                                          {(d.readyReplicas ?? d.ready_replicas ?? 0)}/{(d.replicas ?? 0)}
                                            </td>
                                        <td className="images-cell">
                                          {d.image || (Array.isArray(d.images) && d.images.length ? d.images[0] : '-')}
                                            </td>
                                        <td>{d.created_at || d.createdAt ? new Date(d.created_at || d.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                        <td>{d.updated_at || d.updatedAt ? new Date(d.updated_at || d.updatedAt).toLocaleString('zh-CN') : '-'}</td>
                                            <td>
                                              <div className="action-buttons">
                                            <button className="btn-text" onClick={() => handleDeploymentClick(d)}>
                                              详情
                                </button>
                                            <button className="btn-text" onClick={() => handleEditDeploymentLabels(d)}>
                                {t('common.edit')}
                              </button>
                                            <button className="btn-text" onClick={() => handleScaleDeployment(d)}>
                                {t('k8s.scale')}
                              </button>
                              <div className="action-dropdown">
                                                <button 
                                                  className="btn-text btn-more"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                        menu.classList.remove('show')
                                      }
                                    })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                      dropdown.classList.toggle('show')
                                  }}
                                >
                                                ⋮
                                                </button>
                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 监控功能暂不开放
                                  }} disabled>
                                    {t('k8s.monitoring')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 智能优化功能暂不开放
                                  }} disabled>
                                    {t('k8s.intelligentOptimization')}
                                  </button>
                                  <button onClick={() => {
                                    handleEditDeploymentYaml(d)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.yamlEdit')}
                                  </button>
                                  <button onClick={() => {
                                    handleRedeploy(d)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.redeploy')}
                                  </button>
                                  <button onClick={() => {
                                    handleEditDeploymentLabels(d)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.editLabels')}
                                  </button>
                                  <button onClick={() => {
                                    handleEditDeploymentAnnotations(d)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.editAnnotations')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 节点亲和性功能暂不开放
                                  }} disabled>
                                    {t('k8s.nodeAffinity')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 弹性伸缩功能暂不开放
                                  }} disabled>
                                    {t('k8s.elasticScaling')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 调度容忍功能暂不开放
                                  }} disabled>
                                    {t('k8s.schedulingToleration')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 资源画像功能暂不开放
                                  }} disabled>
                                    {t('k8s.resourceProfile')}
                                  </button>
                                  <button onClick={() => {
                                    handleDeploymentClick(d)
                                    setTimeout(() => setDeploymentDetailTab('cost'), 100)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.costInsight')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 升级策略功能暂不开放
                                  }} disabled>
                                    {t('k8s.upgradeStrategy')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 复制创建功能暂不开放
                                  }} disabled>
                                    {t('k8s.cloneCreate')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 回滚功能暂不开放
                                  }} disabled>
                                    {t('k8s.rollback')}
                                  </button>
                                  <button onClick={() => {
                                    handleViewDeploymentLogs(d)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.logs')}
                                  </button>
                                                <button className="danger" onClick={() => {
                                                  handleDeleteDeployment(d)
                                      document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('common.delete')}
                                                </button>
                                </div>
                              </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                  })}
                                {deployments.length === 0 && (
                                  <tr>
                                    <td colSpan="9" className="empty-state">{t('k8s.noDeployments')}</td>
                                        </tr>
                                    )}
                                  </tbody>
                                </table>
                            </div>

                          {!loading && deployments.length > 0 && (
                        <Pagination
                          currentPage={workloadsPage}
                          totalPages={Math.ceil(workloadsTotal / workloadsPageSize)}
                          totalItems={workloadsTotal}
                          pageSize={workloadsPageSize}
                              onPageChange={(page) => {
                                setWorkloadsPage(page)
                                fetchDeployments(selectedWorkloadNamespace || '')
                              }}
                          onPageSizeChange={(newSize) => {
                            setWorkloadsPageSize(newSize)
                            setWorkloadsPage(1)
                                fetchDeployments(selectedWorkloadNamespace || '')
                          }}
                        />
                                            )}
                                      </div>
                                    )}

                      {/* 有状态 StatefulSet 列表 */}
                      {workloadType === 'statefulsets' && !searchParams.get('view') && (
                        <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>有状态 <span className="deployment-subtitle">StatefulSet</span></h2>
                                  </div>
                                  </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                            <button
                                className="btn-primary" 
                                onClick={() => setShowCreateStatefulSetModal(true)}
                            >
                                使用镜像创建
                            </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                            </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedWorkloadNamespace}
                                  onChange={(e) => setSelectedWorkloadNamespace(e.target.value)}
                                >
                                  <option value="">{t('k8s.allNamespaces')}</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">{t('k8s.name')}</option>
                                </select>

                                <div className="toolbar-search">
                                <input
                                    className="toolbar-search-input"
                                    placeholder={t('k8s.searchPlaceholder')}
                                  value={workloadSearchTerm}
                                  onChange={(e) => setWorkloadSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchStatefulSets(selectedWorkloadNamespace || '')
                                      }
                                    }}
                                  />
                            <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchStatefulSets(selectedWorkloadNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                            </button>
                                  </div>
                        </div>
                      </div>

                            <div className="deployment-toolbar-right">
                              <button className="icon-btn" disabled title="设置">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.64l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V22a2.2 2.2 0 0 1-4.4 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 1 1-3.12-3.12l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H2a2.2 2.2 0 0 1 0-4.4h-.06A1.8 1.8 0 0 0 3.6 8.4a1.8 1.8 0 0 0 .36-1.98l-.04-.04A2.2 2.2 0 1 1 7.04 3.2l.04.04A1.8 1.8 0 0 0 9.06 3.6a1.8 1.8 0 0 0 1.1-1.66V2a2.2 2.2 0 0 1 4.4 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 1 1 3.12 3.12l-.04.04A1.8 1.8 0 0 0 20.4 8.4a1.8 1.8 0 0 0 1.66 1.1H22a2.2 2.2 0 0 1 0 4.4h-.06a1.8 1.8 0 0 0-1.66 1.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchStatefulSets(selectedWorkloadNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                                    </div>
                                  </div>
                            
                                  <div className="table-wrapper">
                                    <table className="data-table">
                                      <thead>
                                        <tr>
                                    <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedStatefulSets.length === statefulSets.length && statefulSets.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedStatefulSets(statefulSets.map(s => `${s.namespace}/${s.name}`))
                                        } else {
                                          setSelectedStatefulSets([])
                                        }
                                      }}
                                    />
                                    </th>
                                  <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>标签</th>
                                  <th>容器组数量</th>
                                  <th>{t('k8s.image')}</th>
                                  <th>{t('k8s.createdAt')}</th>
                                  <th>{t('k8s.updatedAt')}</th>
                                  <th>{t('common.actions')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                {statefulSets
                                  .filter((s) => {
                                    if (!workloadSearchTerm) return true
                                    return (s.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                  })
                                  .map((s) => {
                                    const key = `${s.namespace}/${s.name}`
                                    return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={selectedStatefulSets.includes(key)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedStatefulSets([...selectedStatefulSets, key])
                                              } else {
                                                setSelectedStatefulSets(selectedStatefulSets.filter(x => x !== key))
                                              }
                                            }}
                                          />
                                              </td>
                                        <td className="name-cell">
                                <button
                                            className="deployment-link"
                                            onClick={() => handleStatefulSetClick(s)}
                                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                                          >
                                            {s.name}
                                </button>
                                            </td>
                                        <td>{s.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {s.labels && Object.keys(s.labels).length > 0 ? (
                                            <div className="labels-container">
                                              {Object.entries(s.labels).slice(0, 3).map(([key, value]) => (
                                                <span key={key} className="label-tag">
                                                  {key}:{value}
                                        </span>
                                              ))}
                                              {Object.keys(s.labels).length > 3 && (
                                                <span className="label-more">+{Object.keys(s.labels).length - 3}</span>
                                    )}
                                  </div>
                                          ) : (
                                            '-'
                                          )}
                                          </td>
                                      <td>
                                          {(s.readyReplicas ?? s.ready_replicas ?? 0)}/{(s.replicas ?? 0)}
                                            </td>
                                        <td className="images-cell">
                                          {s.image || (Array.isArray(s.images) && s.images.length ? s.images[0] : '-')}
                                            </td>
                                        <td>{s.created_at || s.createdAt ? new Date(s.created_at || s.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                        <td>{s.updated_at || s.updatedAt ? new Date(s.updated_at || s.updatedAt).toLocaleString('zh-CN') : '-'}</td>
                                            <td>
                                              <div className="action-buttons">
                                            <button className="btn-text" onClick={() => handleStatefulSetClick(s)}>
                                              详情
                              </button>
                                            <button className="btn-text" onClick={() => handleEditStatefulSetLabels(s)}>
                                {t('common.edit')}
                              </button>
                                            <button className="btn-text" onClick={() => handleScaleStatefulSet(s)}>
                                {t('k8s.scale')}
                              </button>
                              <div className="action-dropdown">
                                <button 
                                                className="btn-text btn-more"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                        menu.classList.remove('show')
                                      }
                                    })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                      dropdown.classList.toggle('show')
                                  }}
                                >
                                                ⋮
                                </button>
                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 监控功能暂不开放
                                  }} disabled>
                                    {t('k8s.monitoring')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 智能优化功能暂不开放
                                  }} disabled>
                                    {t('k8s.intelligentOptimization')}
                                  </button>
                                  <button onClick={() => {
                                    handleEditStatefulSetYaml(s)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.yamlEdit')}
                                  </button>
                                  <button onClick={() => {
                                    handleRedeployStatefulSet(s)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.redeploy')}
                                  </button>
                                  <button onClick={() => {
                                    handleEditStatefulSetLabels(s)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.editLabels')}
                                  </button>
                                  <button onClick={() => {
                                    handleEditStatefulSetAnnotations(s)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.editAnnotations')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 节点亲和性功能暂不开放
                                  }} disabled>
                                    {t('k8s.nodeAffinity')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 弹性伸缩功能暂不开放
                                  }} disabled>
                                    {t('k8s.elasticScaling')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 调度容忍功能暂不开放
                                  }} disabled>
                                    {t('k8s.schedulingToleration')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 资源画像功能暂不开放
                                  }} disabled>
                                    {t('k8s.resourceProfile')}
                                  </button>
                                  <button onClick={() => {
                                    handleStatefulSetClick(s)
                                    setTimeout(() => setStatefulSetDetailTab('cost'), 100)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.costInsight')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 升级策略功能暂不开放
                                  }} disabled>
                                    {t('k8s.upgradeStrategy')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 复制创建功能暂不开放
                                  }} disabled>
                                    {t('k8s.cloneCreate')}
                                  </button>
                                  <button onClick={() => {
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 回滚功能暂不开放
                                  }} disabled>
                                    {t('k8s.rollback')}
                                  </button>
                                  <button onClick={() => {
                                    handleViewStatefulSetLogs(s)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.logs')}
                                  </button>
                                                <button className="danger" onClick={() => {
                                                  handleDeleteStatefulSet(s)
                                      document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('common.delete')}
                                  </button>
                                </div>
                              </div>
                        </div>
                                        </td>
                                    </tr>
                                    )
                                  })}
                                {statefulSets.length === 0 && (
                                  <tr>
                                    <td colSpan="9" className="empty-state">{t('k8s.noStatefulSets')}</td>
                                        </tr>
                                )}
                              </tbody>
                            </table>
                      </div>

                          {selectedStatefulSets.length > 0 && (
                            <div className="batch-actions">
                              <input
                                type="checkbox"
                                checked={selectedStatefulSets.length === statefulSets.length && statefulSets.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStatefulSets(statefulSets.map(s => `${s.namespace}/${s.name}`))
                                  } else {
                                    setSelectedStatefulSets([])
                                  }
                                }}
                              />
                              <button 
                                className="btn-secondary" 
                                onClick={handleBatchDeleteStatefulSets}
                                disabled={selectedStatefulSets.length === 0}
                              >
                                批量删除({selectedStatefulSets.length})
                              </button>
                              <button 
                                className="btn-secondary" 
                                onClick={handleBatchRedeployStatefulSets}
                                disabled={selectedStatefulSets.length === 0}
                              >
                                批量重新部署({selectedStatefulSets.length})
                              </button>
                                </div>
                          )}

                          {!loading && statefulSets.length > 0 && (
                        <Pagination
                          currentPage={workloadsPage}
                          totalPages={Math.ceil(workloadsTotal / workloadsPageSize)}
                          totalItems={workloadsTotal}
                          pageSize={workloadsPageSize}
                              onPageChange={(page) => {
                                setWorkloadsPage(page)
                                fetchStatefulSets(selectedWorkloadNamespace || '')
                              }}
                          onPageSizeChange={(newSize) => {
                            setWorkloadsPageSize(newSize)
                            setWorkloadsPage(1)
                                fetchStatefulSets(selectedWorkloadNamespace || '')
                          }}
                        />
                                            )}
                                </div>
                                    )}

                      {/* 守护进程集 DaemonSet 列表 */}
                      {workloadType === 'daemonsets' && !searchParams.get('view') && (
                        <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>守护进程集 <span className="deployment-subtitle">DaemonSet</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                            <button
                                className="btn-primary" 
                                onClick={() => {
                                  // TODO: 实现创建 DaemonSet 功能
                                  setError('创建 DaemonSet 功能暂未实现')
                                }}
                              >
                                使用镜像创建
                            </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                            </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedWorkloadNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedWorkloadNamespace(newNamespace)
                                    setWorkloadsPage(1)
                                    fetchDaemonSets(newNamespace || '')
                                  }}
                                >
                                  <option value="">{t('k8s.allNamespaces')}</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">{t('k8s.name')}</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder={t('k8s.searchPlaceholder')}
                                    value={workloadSearchTerm}
                                    onChange={(e) => setWorkloadSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchDaemonSets(selectedWorkloadNamespace || '')
                                      }
                                    }}
                                  />
                            <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchDaemonSets(selectedWorkloadNamespace || '')}
                            >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                            </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button className="icon-btn" disabled title="设置">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.64l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V22a2.2 2.2 0 0 1-4.4 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 1 1-3.12-3.12l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H2a2.2 2.2 0 0 1 0-4.4h-.06A1.8 1.8 0 0 0 3.6 8.4a1.8 1.8 0 0 0 .36-1.98l-.04-.04A2.2 2.2 0 1 1 7.04 3.2l.04.04A1.8 1.8 0 0 0 9.06 3.6a1.8 1.8 0 0 0 1.1-1.66V2a2.2 2.2 0 0 1 4.4 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 1 1 3.12 3.12l-.04.04A1.8 1.8 0 0 0 20.4 8.4a1.8 1.8 0 0 0 1.66 1.1H22a2.2 2.2 0 0 1 0 4.4h-.06a1.8 1.8 0 0 0-1.66 1.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchDaemonSets(selectedWorkloadNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            </div>
                          </div>

                              <div className="table-wrapper">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>标签</th>
                                  <th>容器组数量</th>
                                      <th>{t('k8s.image')}</th>
                                      <th>{t('k8s.createdAt')}</th>
                                      <th>{t('common.actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                {daemonSets
                                  .filter((ds) => {
                                    if (!workloadSearchTerm) return true
                                    return (ds.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                  })
                                  .map((ds) => {
                                    const key = `${ds.namespace}/${ds.name}`
                                    return (
                                      <tr key={key}>
                                        <td className="name-cell">
                                          {ds.name}
                                        </td>
                                        <td>{ds.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {ds.labels && Object.keys(ds.labels).length > 0 ? (
                                            <div className="labels-container">
                                              {Object.entries(ds.labels).slice(0, 3).map(([key, value]) => (
                                                <span key={key} className="label-tag">
                                                  {key}:{value}
                                            </span>
                                              ))}
                                              {Object.keys(ds.labels).length > 3 && (
                                                <span className="label-more">+{Object.keys(ds.labels).length - 3}</span>
                                              )}
                                            </div>
                                          ) : (
                                            '-'
                                          )}
                                          </td>
                                          <td>
                                          {(ds.readyReplicas ?? ds.ready_replicas ?? 0)}/{(ds.replicas ?? ds.desiredNumberScheduled ?? 0)}
                                          </td>
                                        <td className="images-cell">
                                          {Array.isArray(ds.images) && ds.images.length > 0 ? (
                                              <div>
                                              {ds.images.map((img, idx) => (
                                                <div key={idx}>{img}</div>
                                              ))}
                                              </div>
                                          ) : (ds.image ? (
                                            <div>{ds.image}</div>
                                          ) : '-')}
                                          </td>
                                        <td>{ds.created_at || ds.createdAt ? new Date(ds.created_at || ds.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                          <td>
                                            <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现 DaemonSet 详情功能
                                              setError('DaemonSet 详情功能暂未实现')
                                            }}>
                                              详情
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现编辑 DaemonSet 功能
                                              setError('编辑 DaemonSet 功能暂未实现')
                                            }}>
                                              {t('common.edit')}
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现监控功能
                                            }} disabled>
                                              {t('k8s.monitoring')}
                                            </button>
                                            <div className="action-dropdown">
                                              <button 
                                                className="btn-text btn-more"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                  dropdown.classList.toggle('show')
                                                }}
                                              >
                                                ⋮
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.monitoring')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.intelligentOptimization')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.yamlEdit')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.redeploy')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.editAnnotations')}
                                                </button>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                    // TODO: 实现删除 DaemonSet 功能
                                                    if (window.confirm(t('k8s.confirmDeleteDaemonSet'))) {
                                                      setError('删除 DaemonSet 功能暂未实现')
                                                    }
                                                  }}
                                                >
                                                  {t('common.delete')}
                                                </button>
                                              </div>
                                            </div>
                                            </div>
                                          </td>
                                        </tr>
                                    )
                                  })}
                                {daemonSets.length === 0 && (
                                  <tr>
                                    <td colSpan="7" className="empty-state">{t('k8s.noDaemonSets')}</td>
                                  </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                          {!loading && daemonSets.length > 0 && (
                            <Pagination
                              currentPage={workloadsPage}
                              totalPages={Math.ceil(workloadsTotal / workloadsPageSize)}
                              totalItems={workloadsTotal}
                              pageSize={workloadsPageSize}
                              onPageChange={(page) => {
                                setWorkloadsPage(page)
                                fetchDaemonSets(selectedWorkloadNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setWorkloadsPageSize(newSize)
                                setWorkloadsPage(1)
                                fetchDaemonSets(selectedWorkloadNamespace || '')
                              }}
                            />
                          )}
                                      </div>
                                    )}

                      {/* 任务 Job 列表 */}
                      {workloadType === 'jobs' && !searchParams.get('view') && (
                        <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>任务 <span className="deployment-subtitle">Job</span></h2>
                                  </div>
                                  </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary" 
                                onClick={() => {
                                  // TODO: 实现创建 Job 功能
                                  setError('创建 Job 功能暂未实现')
                                }}
                              >
                                使用镜像创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedWorkloadNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedWorkloadNamespace(newNamespace)
                                    setWorkloadsPage(1)
                                    fetchJobs(newNamespace || '')
                                  }}
                                >
                                  <option value="">{t('k8s.allNamespaces')}</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">{t('k8s.name')}</option>
                                </select>

                                <div className="toolbar-search">
                                <input
                                    className="toolbar-search-input"
                                    placeholder={t('k8s.searchPlaceholder')}
                                  value={workloadSearchTerm}
                                  onChange={(e) => setWorkloadSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchJobs(selectedWorkloadNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchJobs(selectedWorkloadNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button className="icon-btn" disabled title="设置">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.64l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V22a2.2 2.2 0 0 1-4.4 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 1 1-3.12-3.12l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H2a2.2 2.2 0 0 1 0-4.4h-.06A1.8 1.8 0 0 0 3.6 8.4a1.8 1.8 0 0 0 .36-1.98l-.04-.04A2.2 2.2 0 1 1 7.04 3.2l.04.04A1.8 1.8 0 0 0 9.06 3.6a1.8 1.8 0 0 0 1.1-1.66V2a2.2 2.2 0 0 1 4.4 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 1 1 3.12 3.12l-.04.04A1.8 1.8 0 0 0 20.4 8.4a1.8 1.8 0 0 0 1.66 1.1H22a2.2 2.2 0 0 1 0 4.4h-.06a1.8 1.8 0 0 0-1.66 1.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchJobs(selectedWorkloadNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              </div>
                            </div>
                            
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedJobs.length > 0 && selectedJobs.length === jobs.filter((job) => {
                                        if (!workloadSearchTerm) return true
                                        return (job.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                      }).length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const filteredJobs = jobs.filter((job) => {
                                            if (!workloadSearchTerm) return true
                                            return (job.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                          })
                                          setSelectedJobs(filteredJobs.map(job => `${job.namespace}/${job.name}`))
                                        } else {
                                          setSelectedJobs([])
                                        }
                                      }}
                                    />
                                  </th>
                                  <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>标签</th>
                                  <th>状态(全部)</th>
                                  <th>Pod 状态</th>
                                  <th>{t('k8s.image')}</th>
                                  <th>{t('k8s.createdAt')}</th>
                                  <th>完成时间</th>
                                  <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobs
                                  .filter((job) => {
                                    if (!workloadSearchTerm) return true
                                    return (job.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                  })
                                  .map((job) => {
                                    const key = `${job.namespace}/${job.name}`
                                    const isSelected = selectedJobs.includes(key)
                                    const activePods = job.activePods || job.active_pods || 0
                                    const succeededPods = job.succeededPods || job.succeeded_pods || 0
                                    const failedPods = job.failedPods || job.failed_pods || 0
                                    const status = job.status || job.phase || 'Unknown'
                                    const statusText = status === 'Complete' || status === 'Succeeded' ? '已成功' : 
                                                      status === 'Failed' ? '已失败' : 
                                                      status === 'Active' || status === 'Running' ? '运行中' : status
                                    return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedJobs([...selectedJobs, key])
                                              } else {
                                                setSelectedJobs(selectedJobs.filter(k => k !== key))
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="name-cell">
                                          {job.name}
                                        </td>
                                        <td>{job.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {job.labels && Object.keys(job.labels).length > 0 ? (
                                            <div className="labels-container">
                                              {Object.entries(job.labels).slice(0, 3).map(([key, value]) => (
                                                <span key={key} className="label-tag">
                                                  {key}:{value}
                                                </span>
                                              ))}
                                              {Object.keys(job.labels).length > 3 && (
                                                <span className="label-more">+{Object.keys(job.labels).length - 3}</span>
                                              )}
                                          </div>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                        <td>
                                          <span className={`status-badge ${status === 'Complete' || status === 'Succeeded' ? 'status-success' : status === 'Failed' ? 'status-error' : 'status-running'}`}>
                                            {statusText}
                                          </span>
                                        </td>
                                        <td>
                                          活跃{activePods} 成功{succeededPods} 失败{failedPods}
                                        </td>
                                        <td className="images-cell">
                                          {Array.isArray(job.images) && job.images.length > 0 ? (
                                            <div>
                                              {job.images.map((img, idx) => (
                                                <div key={idx}>{img}</div>
                                              ))}
                                          </div>
                                          ) : (job.image ? (
                                            <div>{job.image}</div>
                                          ) : '-')}
                                        </td>
                                        <td>{job.created_at || job.createdAt ? new Date(job.created_at || job.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                        <td>{job.completion_time || job.completionTime ? new Date(job.completion_time || job.completionTime).toLocaleString('zh-CN') : '-'}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现 Job 详情功能
                                              setError('Job 详情功能暂未实现')
                                            }}>
                                              详情
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现 YAML 编辑功能
                                              setError('YAML 编辑功能暂未实现')
                                            }}>
                                              YAML 编辑
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现伸缩功能
                                              setError('Job 伸缩功能暂未实现')
                                            }}>
                                              {t('k8s.scale')}
                                            </button>
                                            <div className="action-dropdown">
                                              <button 
                                                className="btn-text btn-more"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                    dropdown.classList.toggle('show')
                                                }}
                                              >
                                                ⋮
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.monitoring')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.intelligentOptimization')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.yamlEdit')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.redeploy')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.editAnnotations')}
                                                </button>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                    // TODO: 实现删除 Job 功能
                                                    if (window.confirm(t('k8s.confirmDeleteJob'))) {
                                                      setError('删除 Job 功能暂未实现')
                                                    }
                                                  }}
                                                >
                                                  {t('common.delete')}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                    </tr>
                                    )
                                  })}
                                {jobs.length === 0 && (
                                  <tr>
                                    <td colSpan="10" className="empty-state">{t('k8s.noJobs')}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {selectedJobs.length > 0 && (
                            <div className="batch-actions" style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                              <button 
                                className="btn-secondary" 
                                onClick={() => {
                                  // TODO: 实现批量删除功能
                                  if (window.confirm(`确定要删除选中的 ${selectedJobs.length} 个 Job 吗？`)) {
                                    setError('批量删除 Job 功能暂未实现')
                                  }
                                }}
                              >
                                批量删除({selectedJobs.length})
                              </button>
                            </div>
                          )}

                          {!loading && jobs.length > 0 && (
                            <Pagination
                              currentPage={workloadsPage}
                              totalPages={Math.ceil(workloadsTotal / workloadsPageSize)}
                              totalItems={workloadsTotal}
                              pageSize={workloadsPageSize}
                              onPageChange={(page) => {
                                setWorkloadsPage(page)
                                fetchJobs(selectedWorkloadNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setWorkloadsPageSize(newSize)
                                setWorkloadsPage(1)
                                fetchJobs(selectedWorkloadNamespace || '')
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* 定时任务 CronJob 列表 */}
                      {workloadType === 'cronjobs' && !searchParams.get('view') && (
                        <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>定时任务 <span className="deployment-subtitle">CronJob</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button
                                className="btn-primary" 
                                onClick={() => {
                                  // TODO: 实现创建 CronJob 功能
                                  setError('创建 CronJob 功能暂未实现')
                                }}
                              >
                                使用镜像创建
                              </button>
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedWorkloadNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedWorkloadNamespace(newNamespace)
                                    setWorkloadsPage(1)
                                    fetchCronJobs(newNamespace || '')
                                  }}
                                >
                                  <option value="">{t('k8s.allNamespaces')}</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">{t('k8s.name')}</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder={t('k8s.searchPlaceholder')}
                                    value={workloadSearchTerm}
                                    onChange={(e) => setWorkloadSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchCronJobs(selectedWorkloadNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchCronJobs(selectedWorkloadNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button className="icon-btn" disabled title="设置">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.64l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V22a2.2 2.2 0 0 1-4.4 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 1 1-3.12-3.12l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H2a2.2 2.2 0 0 1 0-4.4h-.06A1.8 1.8 0 0 0 3.6 8.4a1.8 1.8 0 0 0 .36-1.98l-.04-.04A2.2 2.2 0 1 1 7.04 3.2l.04.04A1.8 1.8 0 0 0 9.06 3.6a1.8 1.8 0 0 0 1.1-1.66V2a2.2 2.2 0 0 1 4.4 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 1 1 3.12 3.12l-.04.04A1.8 1.8 0 0 0 20.4 8.4a1.8 1.8 0 0 0 1.66 1.1H22a2.2 2.2 0 0 1 0 4.4h-.06a1.8 1.8 0 0 0-1.66 1.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchCronJobs(selectedWorkloadNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={selectedCronJobs.length > 0 && selectedCronJobs.length === cronJobs.filter((cronJob) => {
                                        if (!workloadSearchTerm) return true
                                        return (cronJob.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                      }).length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const filteredCronJobs = cronJobs.filter((cronJob) => {
                                            if (!workloadSearchTerm) return true
                                            return (cronJob.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                          })
                                          setSelectedCronJobs(filteredCronJobs.map(cronJob => `${cronJob.namespace}/${cronJob.name}`))
                                        } else {
                                          setSelectedCronJobs([])
                                        }
                                      }}
                                    />
                                  </th>
                                  <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>标签</th>
                                  <th>{t('k8s.image')}</th>
                                  <th>{t('k8s.createdAt')}</th>
                                  <th>最近调度</th>
                                  <th>挂起</th>
                                  <th>计划</th>
                                  <th>活跃</th>
                                  <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cronJobs
                                  .filter((cronJob) => {
                                    if (!workloadSearchTerm) return true
                                    return (cronJob.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                  })
                                  .map((cronJob) => {
                                    const key = `${cronJob.namespace}/${cronJob.name}`
                                    const isSelected = selectedCronJobs.includes(key)
                                    const activeJobs = cronJob.activeJobs || cronJob.active_jobs || 0
                                    const suspended = cronJob.suspended !== undefined ? cronJob.suspended : (cronJob.suspend !== undefined ? cronJob.suspend : false)
                                    const schedule = cronJob.schedule || cronJob.cron || '-'
                                    const lastScheduleTime = cronJob.lastScheduleTime || cronJob.last_schedule_time || cronJob.lastSchedule || cronJob.last_schedule
                                    return (
                                      <tr key={key}>
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedCronJobs([...selectedCronJobs, key])
                                              } else {
                                                setSelectedCronJobs(selectedCronJobs.filter(k => k !== key))
                                              }
                                            }}
                                          />
                                        </td>
                                        <td className="name-cell">
                                          {cronJob.name}
                                        </td>
                                        <td>{cronJob.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {cronJob.labels && Object.keys(cronJob.labels).length > 0 ? (
                                            <div className="labels-container">
                                              {Object.entries(cronJob.labels).slice(0, 3).map(([key, value]) => (
                                                <span key={key} className="label-tag">
                                                  {key}:{value}
                                                </span>
                                              ))}
                                              {Object.keys(cronJob.labels).length > 3 && (
                                                <span className="label-more">+{Object.keys(cronJob.labels).length - 3}</span>
                                              )}
                                            </div>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                        <td className="images-cell">
                                          {Array.isArray(cronJob.images) && cronJob.images.length > 0 ? (
                                            <div>
                                              {cronJob.images.map((img, idx) => (
                                                <div key={idx}>{img}</div>
                                              ))}
                                            </div>
                                          ) : (cronJob.image ? (
                                            <div>{cronJob.image}</div>
                                          ) : '-')}
                                        </td>
                                        <td>{cronJob.created_at || cronJob.createdAt ? new Date(cronJob.created_at || cronJob.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                        <td>{lastScheduleTime ? new Date(lastScheduleTime).toLocaleString('zh-CN') : '-'}</td>
                                        <td>{suspended ? 'True' : 'False'}</td>
                                        <td>{schedule}</td>
                                        <td>{activeJobs}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现 CronJob 详情功能
                                              setError('CronJob 详情功能暂未实现')
                                            }}>
                                              详情
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现 YAML 编辑功能
                                              setError('YAML 编辑功能暂未实现')
                                            }}>
                                              YAML 编辑
                                            </button>
                                            <button className="btn-text" onClick={() => {
                                              // TODO: 实现停止功能
                                              setError('停止 CronJob 功能暂未实现')
                                            }}>
                                              停止
                                            </button>
                                            <div className="action-dropdown">
                                              <button 
                                                className="btn-text btn-more"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                  dropdown.classList.toggle('show')
                                                }}
                                              >
                                                ⋮
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.monitoring')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.intelligentOptimization')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.yamlEdit')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.redeploy')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }} disabled>
                                                  {t('k8s.editAnnotations')}
                                                </button>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                    // TODO: 实现删除 CronJob 功能
                                                    if (window.confirm(t('k8s.confirmDeleteCronJob'))) {
                                                      setError('删除 CronJob 功能暂未实现')
                                                    }
                                                  }}
                                                >
                                                  {t('common.delete')}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {cronJobs.length === 0 && (
                                  <tr>
                                    <td colSpan="11" className="empty-state">{t('k8s.noCronJobs')}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {selectedCronJobs.length > 0 && (
                            <div className="batch-actions" style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                              <button 
                                className="btn-secondary" 
                                onClick={() => {
                                  // TODO: 实现批量删除功能
                                  if (window.confirm(`确定要删除选中的 ${selectedCronJobs.length} 个 CronJob 吗？`)) {
                                    setError('批量删除 CronJob 功能暂未实现')
                                  }
                                }}
                              >
                                批量删除({selectedCronJobs.length})
                              </button>
                            </div>
                          )}

                          {!loading && cronJobs.length > 0 && (
                            <Pagination
                              currentPage={workloadsPage}
                              totalPages={Math.ceil(workloadsTotal / workloadsPageSize)}
                              totalItems={workloadsTotal}
                              pageSize={workloadsPageSize}
                              onPageChange={(page) => {
                                setWorkloadsPage(page)
                                fetchCronJobs(selectedWorkloadNamespace || '')
                              }}
                              onPageSizeChange={(newSize) => {
                                setWorkloadsPageSize(newSize)
                                setWorkloadsPage(1)
                                fetchCronJobs(selectedWorkloadNamespace || '')
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* 容器组 Pod 列表 */}
                      {workloadType === 'pods' && !searchParams.get('view') && (
                        <div className="deployment-list-section">
                          <div className="section-header deployment-header">
                            <div className="deployment-title">
                              <h2>容器组 <span className="deployment-subtitle">Pod</span></h2>
                            </div>
                          </div>

                          <div className="deployment-toolbar">
                            <div className="deployment-toolbar-left">
                              <button className="btn-secondary" disabled>
                                使用YAML创建资源
                              </button>

                              <div className="toolbar-filters">
                                <label className="toolbar-label">命名空间</label>
                                <select
                                  className="toolbar-select"
                                  value={selectedWorkloadNamespace}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value
                                    setSelectedWorkloadNamespace(newNamespace)
                                    setWorkloadsPage(1)
                                    // 立即根据命名空间获取 Pod 数据，重置页码为 1
                                    fetchWorkloads(newNamespace || '', 1)
                                  }}
                                >
                                  <option value="">{t('k8s.allNamespaces')}</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                                  ))}
                                </select>

                                <select className="toolbar-select" value="name" disabled>
                                  <option value="name">{t('k8s.name')}</option>
                                </select>

                                <div className="toolbar-search">
                                  <input
                                    className="toolbar-search-input"
                                    placeholder={t('k8s.searchPlaceholder')}
                                    value={workloadSearchTerm}
                                    onChange={(e) => setWorkloadSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        fetchWorkloads(selectedWorkloadNamespace || '')
                                      }
                                    }}
                                  />
                                  <button
                                    className="toolbar-search-btn"
                                    onClick={() => fetchWorkloads(selectedWorkloadNamespace || '')}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="deployment-toolbar-right">
                              <button className="icon-btn" disabled title="设置">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.64l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V22a2.2 2.2 0 0 1-4.4 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 1 1-3.12-3.12l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H2a2.2 2.2 0 0 1 0-4.4h-.06A1.8 1.8 0 0 0 3.6 8.4a1.8 1.8 0 0 0 .36-1.98l-.04-.04A2.2 2.2 0 1 1 7.04 3.2l.04.04A1.8 1.8 0 0 0 9.06 3.6a1.8 1.8 0 0 0 1.1-1.66V2a2.2 2.2 0 0 1 4.4 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 1 1 3.12 3.12l-.04.04A1.8 1.8 0 0 0 20.4 8.4a1.8 1.8 0 0 0 1.66 1.1H22a2.2 2.2 0 0 1 0 4.4h-.06a1.8 1.8 0 0 0-1.66 1.1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button
                                className="icon-btn"
                                title="刷新"
                                onClick={() => fetchWorkloads(selectedWorkloadNamespace || '')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.labels')}</th>
                                  <th>{t('k8s.status')}</th>
                                  <th>{t('k8s.restartCount')}</th>
                                  <th>Pod IP</th>
                                  <th>{t('k8s.node')}</th>
                                  <th>{t('k8s.createdAt')}</th>
                                  <th>CPU (核) / 内存 (字节)</th>
                                  <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {workloads
                                  .filter((pod) => {
                                    if (!workloadSearchTerm) return true
                                    return (pod.name || '').toLowerCase().includes(workloadSearchTerm.toLowerCase())
                                  })
                                  .map((pod) => {
                                    const key = `${pod.namespace}/${pod.name}`
                                    // 提取容器镜像信息用于显示在名称下方
                                    const containerImages = pod.containers || []
                                    const imageInfo = containerImages.length > 0 
                                      ? containerImages.map(c => {
                                          const imageName = c.image || ''
                                          const parts = imageName.split(':')
                                          if (parts.length > 1) {
                                            return `${parts[0].split('/').pop()}:${parts[1]}`
                                          }
                                          return imageName.split('/').pop()
                                        }).join(', ')
                                      : (pod.image || (Array.isArray(pod.images) && pod.images.length ? pod.images[0] : ''))
                                    
                                    // 格式化 CPU 和内存
                                    const cpuUsage = pod.cpu || pod.cpuUsage || '0'
                                    const memoryUsage = pod.memory || pod.memoryUsage || '0'
                                    const memoryInMi = typeof memoryUsage === 'string' && memoryUsage.includes('Mi') 
                                      ? memoryUsage 
                                      : (typeof memoryUsage === 'number' ? `${(memoryUsage / 1024 / 1024).toFixed(3)} Mi` : memoryUsage)
                                    
                                    return (
                                      <tr key={key}>
                                        <td className="name-cell">
                                          <div>
                                            <div>{pod.name}</div>
                                            {imageInfo && (
                                              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                {imageInfo}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td>{pod.namespace || '-'}</td>
                                        <td className="labels-cell">
                                          {pod.labels && Object.keys(pod.labels).length > 0 ? (
                                            <div className="labels-container">
                                              {Object.entries(pod.labels).slice(0, 3).map(([key, value]) => (
                                                <span key={key} className="label-tag">
                                                  {key}:{value}
                                                </span>
                                              ))}
                                              {Object.keys(pod.labels).length > 3 && (
                                                <span className="label-more">+{Object.keys(pod.labels).length - 3}</span>
                                              )}
                                            </div>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                        <td>
                                          <span className={`status-badge ${getPodStatusClass(pod.status)}`}>
                                            {pod.status === 'Running' && '● '}
                                            {pod.status || 'Unknown'}
                                          </span>
                                        </td>
                                        <td>{pod.restartCount || pod.restart_count || 0}</td>
                                        <td>{pod.ip || pod.podIP || '-'}</td>
                                        <td>
                                          {pod.nodeName ? (
                                            <>
                                              {pod.nodeName}
                                              {pod.nodeIP && (
                                                <>
                                                  <br />
                                                  <span className="node-ip">{pod.nodeIP}</span>
                                                </>
                                              )}
                                            </>
                                          ) : '-'}
                                        </td>
                                        <td>{pod.created_at || pod.createdAt ? new Date(pod.created_at || pod.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                        <td>
                                          {cpuUsage} / {memoryInMi}
                                        </td>
                                        <td>
                                          <div className="action-buttons">
                                            <button className="btn-text" onClick={() => handleViewPodDetails(pod)}>
                                              详情
                                            </button>
                                            <span className="action-separator">|</span>
                                            <button className="btn-text" onClick={() => handleEditYaml(pod)}>
                                              YAML {t('common.edit')}
                                            </button>
                                            <span className="action-separator">|</span>
                                            <button className="btn-text" onClick={() => handleViewLogs(pod)}>
                                              {t('k8s.terminal')}
                                            </button>
                                            <span className="action-separator">|</span>
                                            <div className="action-dropdown">
                                            <button 
                                                className="btn-text btn-more"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                  dropdown.classList.toggle('show')
                                                }}
                                              >
                                                {t('common.more')} ▼
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => {
                                                  handleRestartPod(pod.namespace, pod.name)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.restart')}
                                                </button>
                                                <button onClick={() => {
                                                  handleEditLabels(pod)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                <button onClick={() => {
                                                  handleEditAnnotations(pod)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editAnnotations')}
                                            </button>
                                            <button 
                                                  className="danger"
                                              onClick={() => {
                                                    handleDeletePod(pod)
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}
                                                >
                                                  {t('common.delete')}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                {workloads.length === 0 && (
                                  <tr>
                                    <td colSpan="10" className="empty-state">{t('k8s.noPods')}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {!loading && workloads.length > 0 && (
                            <Pagination
                              currentPage={workloadsPage}
                              totalPages={Math.ceil(workloadsTotal / workloadsPageSize)}
                              totalItems={workloadsTotal}
                              pageSize={workloadsPageSize}
                              onPageChange={(page) => {
                                setWorkloadsPage(page)
                                fetchWorkloads(selectedWorkloadNamespace || '', page)
                              }}
                              onPageSizeChange={(newSize) => {
                                setWorkloadsPageSize(newSize)
                                setWorkloadsPage(1)
                                fetchWorkloads(selectedWorkloadNamespace || '', 1)
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Deployment 详情视图 */}
                      {((selectedDeployment && deploymentDetail) || (searchParams.get('view') === 'detail' && selectedDeployment)) && (
                        <div className="deployment-detail-view">
                          {/* 头部 */}
                          <div className="deployment-detail-header">
                            <div className="deployment-detail-header-left">
                                            <button 
                                className="back-button"
                                onClick={handleBackFromDeploymentDetail}
                                title={t('common.back')}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                            </button>
                              <h1 className="deployment-detail-title">{deploymentDetail?.name || selectedDeployment?.name || '-'}</h1>
                            </div>
                            <div className="deployment-detail-header-right">
                              <button className="btn-primary" onClick={() => handleEditDeploymentLabels(selectedDeployment)}>
                                              {t('common.edit')}
                                            </button>
                              <button className="btn-primary" onClick={() => handleScaleDeployment(selectedDeployment)}>
                                              {t('k8s.scale')}
                                            </button>
                              <button className="btn-primary" onClick={() => handleEditDeploymentYaml(selectedDeployment)}>
                                YAML {t('common.edit')}
                                            </button>
                                            <div className="action-dropdown">
                                              <button 
                                  className="btn-primary"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                      if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                    const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                    dropdown.classList.toggle('show')
                                                }}
                                              >
                                  {t('common.more')} ▼
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 监控功能暂不开放
                                  }} disabled>
                                                  {t('k8s.monitoring')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 智能优化功能暂不开放
                                  }} disabled>
                                                  {t('k8s.intelligentOptimization')}
                                                </button>
                                                <button onClick={() => {
                                    handleEditDeploymentYaml(selectedDeployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.yamlEdit')}
                                                </button>
                                                <button onClick={() => {
                                    handleRedeploy(selectedDeployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.redeploy')}
                                                </button>
                                                <button onClick={() => {
                                    handleEditDeploymentLabels(selectedDeployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                <button onClick={() => {
                                    handleEditDeploymentAnnotations(selectedDeployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editAnnotations')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 节点亲和性功能暂不开放
                                  }} disabled>
                                                  {t('k8s.nodeAffinity')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 弹性伸缩功能暂不开放
                                  }} disabled>
                                                  {t('k8s.elasticScaling')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 调度容忍功能暂不开放
                                  }} disabled>
                                                  {t('k8s.schedulingToleration')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 资源画像功能暂不开放
                                  }} disabled>
                                                  {t('k8s.resourceProfile')}
                                                </button>
                                                <button onClick={() => {
                                    setDeploymentDetailTab('cost')
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                    {t('k8s.costInsight')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 升级策略功能暂不开放
                                  }} disabled>
                                                  {t('k8s.upgradeStrategy')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 复制创建功能暂不开放
                                  }} disabled>
                                                  {t('k8s.cloneCreate')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 回滚功能暂不开放
                                  }} disabled>
                                                  {t('k8s.rollback')}
                                                </button>
                                                <button onClick={() => {
                                    setDeploymentDetailTab('logs')
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.logs')}
                                                </button>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                      handleDeleteDeployment(selectedDeployment)
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}
                                                >
                                                  {t('common.delete')}
                                                </button>
                                              </div>
                                            </div>
                            <button
                                className="icon-btn"
                                onClick={async () => {
                                  if (selectedDeployment) {
                                    // 重置加载状态，强制刷新
                                    isLoadingDeploymentRef.current = false
                                    loadedDeploymentRef.current = ''
                                    await loadDeploymentDetail(selectedDeployment)
                                  }
                                }}
                                title={t('common.refresh')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                                          </div>
                          </div>

                          {/* 主要内容区域 */}
                          <div className="deployment-detail-content">
                            {/* 基本信息 - 两列布局 */}
                            {deploymentDetail ? (
                          <div className="info-section">
                                <h3>{t('k8s.basicInfo')}</h3>
                                <div className="info-grid-two-columns">
                                  {/* 左列 */}
                                  <div className="info-column-left">
                                <div className="info-item">
                                      <label>{t('k8s.name')}</label>
                                      <span>{deploymentDetail.name || selectedDeployment?.name || '-'}</span>
                          </div>
                                <div className="info-item">
                                      <label>{t('k8s.namespace')}</label>
                                      <span>{deploymentDetail.namespace || selectedDeployment?.namespace || '-'}</span>
                                            </div>
                                <div className="info-item">
                                      <label>{t('k8s.selector')}</label>
                                      <div className="selector-tags">
                                        {deploymentDetail.selector && Object.entries(deploymentDetail.selector).map(([key, value]) => (
                                          <span key={key} className="selector-tag">{key}:{value}</span>
                                        ))}
                                        {(!deploymentDetail.selector || Object.keys(deploymentDetail.selector).length === 0) && '-'}
                                        </div>
                                              </div>
                                    {deploymentDetail.annotations && Object.keys(deploymentDetail.annotations).length > 0 && (
                                <div className="info-item">
                                        <label>{t('k8s.annotations')}</label>
                                        <div className="annotation-tags">
                                          {Object.entries(deploymentDetail.annotations).map(([key, value]) => (
                                            <span key={key} className="annotation-tag">{key}:{value}</span>
                                          ))}
                                              </div>
                                            </div>
                                    )}
                                      <div className="info-item">
                                      <label>{t('k8s.status')}</label>
                                      <div className="status-inline">
                            <span>
                                          {t('k8s.ready')}:{deploymentDetail.readyReplicas || deploymentDetail.ready_replicas || 0}/{deploymentDetail.replicas || 0}个, {t('k8s.updated')}:{deploymentDetail.updatedReplicas || deploymentDetail.updated_replicas || 0}个, {t('k8s.available')}:{deploymentDetail.availableReplicas || deploymentDetail.available_replicas || 0}个
                                        </span>
                                        <button className="expand-details-btn-inline">
                                          展开现状详情 ▼
                  </button>
                          </div>
              </div>
            </div>

                                  {/* 右列 */}
                                  <div className="info-column-right">
                                <div className="info-item">
                                      <label>{t('k8s.createdAt')}</label>
                                      <span>{deploymentDetail.created_at ? new Date(deploymentDetail.created_at).toLocaleString('zh-CN') : '-'}</span>
                        </div>
                                      <div className="info-item">
                                      <label>{t('k8s.strategy')}</label>
                                      <span>{deploymentDetail.strategy || 'RollingUpdate'}</span>
                        </div>
                                    {(deploymentDetail.strategy === 'RollingUpdate' || !deploymentDetail.strategy) && (
                                <div className="info-item">
                                        <label>{t('k8s.rollingUpdateStrategy')}</label>
                                        <div className="strategy-details">
                                          <div>超过期望的Pod数量: {deploymentDetail.maxSurge || deploymentDetail.max_surge || '25%'}</div>
                                          <div>不可用Pod最大数量: {deploymentDetail.maxUnavailable || deploymentDetail.max_unavailable || '25%'}</div>
                    </div>
                        </div>
                                    )}
                                    {deploymentDetail.labels && Object.keys(deploymentDetail.labels).length > 0 && (
                                <div className="info-item">
                                        <label>{t('k8s.labels')}</label>
                                        <div className="labels-list">
                                          {Object.entries(deploymentDetail.labels).map(([key, value]) => (
                                            <span key={key} className="label-tag">{key}:{value}</span>
                                          ))}
                                          <button className="show-all-btn">显示全部</button>
                          </div>
                      </div>
                      )}
                          </div>
                      </div>
                    </div>
                            ) : selectedDeployment ? (
                              <div className="info-section">
                                <h3>{t('k8s.basicInfo')}</h3>
                                <div className="info-grid-two-columns">
                                  <div className="info-column-left">
                                      <div className="info-item">
                                      <label>{t('k8s.name')}</label>
                                      <span>{selectedDeployment.name || '-'}</span>
                          </div>
                                        <div className="info-item">
                                      <label>{t('k8s.namespace')}</label>
                                      <span>{selectedDeployment.namespace || '-'}</span>
                                        </div>
                                        </div>
                                  <div className="info-column-right">
                                        </div>
                                      </div>
                                  </div>
                            ) : null}
                          </div>

                          {/* 标签页 */}
                          <div className="deployment-detail-tabs">
                  <button
                              className={`tab-button ${deploymentDetailTab === 'pods' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('pods')}
                            >
                              {t('k8s.containerGroup')}
                  </button>
                  <button
                              className={`tab-button ${deploymentDetailTab === 'access' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('access')}
                            >
                              {t('k8s.accessMethod')}
                        </button>
                        <button
                              className={`tab-button ${deploymentDetailTab === 'events' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('events')}
                            >
                              {t('k8s.events')}
                        </button>
                        <button
                              className={`tab-button ${deploymentDetailTab === 'scaling' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('scaling')}
                            >
                              {t('k8s.containerScaling')}
                        </button>
                        <button
                              className={`tab-button ${deploymentDetailTab === 'history' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('history')}
                            >
                              {t('k8s.historyVersions')}
                        </button>
                        <button
                              className={`tab-button ${deploymentDetailTab === 'logs' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('logs')}
                            >
                              {t('k8s.logs')}
                            </button>
                            <button
                              className={`tab-button ${deploymentDetailTab === 'monitoring' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('monitoring')}
                            >
                              {t('k8s.monitoring')}
                            </button>
                            <button
                              className={`tab-button ${deploymentDetailTab === 'cost' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('cost')}
                            >
                              {t('k8s.costInsight')}
                                                </button>
                                                <button
                              className={`tab-button ${deploymentDetailTab === 'triggers' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('triggers')}
                            >
                              {t('k8s.triggers')}
                        </button>
                      </div>

                          {/* 标签页内容 */}
                          <div className="deployment-detail-tab-content">
                            {deploymentDetailTab === 'pods' && (
                              <div className="pods-tab-content">
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                    <th>{t('k8s.name')}</th>
                                      <th>{t('k8s.image')}</th>
                                        <th>{t('k8s.status')} (全部) ▼</th>
                                      <th>{t('k8s.monitoring')}</th>
                                        <th>{t('k8s.restartCount')} ▲</th>
                                        <th>Pod IP</th>
                                  <th>{t('k8s.node')}</th>
                                    <th>{t('k8s.createdAt')}</th>
                                    <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                      {deploymentPods && deploymentPods.length > 0 ? (
                                        deploymentPods.map((pod) => (
                                        <tr key={pod.name}>
                                            <td className="name-cell">{pod.name}</td>
                                            <td className="images-cell">{pod.image || (Array.isArray(pod.images) && pod.images.length ? pod.images[0] : '-')}</td>
                                          <td>
                                              <span className={`status-badge status-${(pod.status || '').toLowerCase()}`}>
                                                {pod.status === 'Running' && '● '}
                                                {pod.status || 'Unknown'}
                                    </span>
                                  </td>
                                          <td>
                                              <button className="icon-btn" title={t('k8s.monitoring')}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                  <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
                                                  <path d="M7 12l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                              </button>
                                          </td>
                                            <td>{pod.restartCount || 0}</td>
                                            <td>{pod.ip || '-'}</td>
                                            <td>
                                              {pod.nodeName ? (
                                                <>
                                                  {pod.nodeName}
                                                  <br />
                                                  <span className="node-ip">{pod.nodeIP || ''}</span>
                                                </>
                                            ) : '-'}
                                          </td>
                                          <td>{pod.created_at ? new Date(pod.created_at).toLocaleString('zh-CN') : '-'}</td>
                                          <td>
                                            <div className="action-buttons">
                                                <button className="btn-text" onClick={() => handleViewPodDetails(pod)}>
                                                  详情
                                            </button>
                                                <span className="action-separator">|</span>
                                                <button className="btn-text" onClick={() => handleEditYaml(pod)}>
                                                YAML {t('common.edit')}
                                            </button>
                                                <span className="action-separator">|</span>
                                                <button className="btn-text" onClick={() => handleViewLogs(pod)}>
                                                  {t('k8s.terminal')}
                                            </button>
                                                <span className="action-separator">|</span>
                                            <div className="action-dropdown">
                                                  <button className="btn-text btn-more">
                                                  {t('common.more')} ▼
                                              </button>
                                                  <div className="dropdown-menu">
                                                    <button onClick={() => handleRestartPod(pod)}>
                                                    {t('k8s.restart')}
                                                </button>
                                                    <button className="danger" onClick={() => handleDeletePod(pod)}>
                                                    {t('common.delete')}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                    </td>
                                  </tr>
                              ))
                                      ) : (
                                        <tr>
                                          <td colSpan="9" className="empty-state">{t('k8s.noPods')}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                                {deploymentPods && deploymentPods.length > 0 && (
                                  <div className="pagination-info">
                                    共有{deploymentPods.length}条,每页显示:25条
                                            </div>
                                          )}
                                        </div>
                  )}

                            {deploymentDetailTab !== 'pods' && (
                              <div className="tab-placeholder">
                                {t('k8s.comingSoon')}
                                              </div>
                        )}
                                              </div>
                                            </div>
                                            )}

                      {/* StatefulSet 详情视图 */}
                      {((selectedStatefulSet && statefulSetDetail) || (searchParams.get('view') === 'detail' && searchParams.get('statefulset') && selectedStatefulSet)) && (
                        <div className="deployment-detail-view">
                          {/* 头部 */}
                          <div className="deployment-detail-header">
                            <div className="deployment-detail-header-left">
                  <button
                                className="back-button"
                                onClick={handleBackFromStatefulSetDetail}
                                title={t('common.back')}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                            </button>
                              <h1 className="deployment-detail-title">{statefulSetDetail?.name || selectedStatefulSet?.name || '-'}</h1>
                            </div>
                            <div className="deployment-detail-header-right">
                              <button className="btn-primary" onClick={() => handleEditStatefulSetLabels(selectedStatefulSet)}>
                                              {t('common.edit')}
                                            </button>
                              <button className="btn-primary" onClick={() => handleScaleStatefulSet(selectedStatefulSet)}>
                                              {t('k8s.scale')}
                                            </button>
                              <button className="btn-primary" onClick={() => handleEditStatefulSetYaml(selectedStatefulSet)}>
                                                YAML {t('common.edit')}
                  </button>
                                              <div className="action-dropdown">
                                                <button 
                                  className="btn-primary"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                      if (menu !== e.target.closest('.action-dropdown').querySelector('.dropdown-menu')) {
                                                        menu.classList.remove('show')
                                                      }
                                                    })
                                    const dropdown = e.target.closest('.action-dropdown').querySelector('.dropdown-menu')
                                                      dropdown.classList.toggle('show')
                                                  }}
                                                >
                                                  {t('common.more')} ▼
                    </button>
                                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                  <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 监控功能暂不开放
                                  }} disabled>
                                                  {t('k8s.monitoring')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 智能优化功能暂不开放
                                  }} disabled>
                                                  {t('k8s.intelligentOptimization')}
                                                </button>
                                                <button onClick={() => {
                                    handleEditStatefulSetYaml(selectedStatefulSet)
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}>
                                                  {t('k8s.yamlEdit')}
                    </button>
                                                  <button onClick={() => {
                                    handleRedeployStatefulSet(selectedStatefulSet)
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}>
                                                  {t('k8s.redeploy')}
                  </button>
                                                  <button onClick={() => {
                                    handleEditStatefulSetLabels(selectedStatefulSet)
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                <button onClick={() => {
                                    handleEditStatefulSetAnnotations(selectedStatefulSet)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editAnnotations')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 节点亲和性功能暂不开放
                                  }} disabled>
                                                  {t('k8s.nodeAffinity')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 弹性伸缩功能暂不开放
                                  }} disabled>
                                                  {t('k8s.elasticScaling')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 调度容忍功能暂不开放
                                  }} disabled>
                                                  {t('k8s.schedulingToleration')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 资源画像功能暂不开放
                                  }} disabled>
                                                  {t('k8s.resourceProfile')}
                                                </button>
                                                <button onClick={() => {
                                    setStatefulSetDetailTab('cost')
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                    {t('k8s.costInsight')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 升级策略功能暂不开放
                                  }} disabled>
                                                  {t('k8s.upgradeStrategy')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 复制创建功能暂不开放
                                  }} disabled>
                                                  {t('k8s.cloneCreate')}
                                                </button>
                                                <button onClick={() => {
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                    // 回滚功能暂不开放
                                  }} disabled>
                                                  {t('k8s.rollback')}
                                                </button>
                                                <button onClick={() => {
                                    setStatefulSetDetailTab('logs')
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.logs')}
                                                  </button>
                  <button
                                                    className="danger"
                    onClick={() => {
                                      handleDeleteStatefulSet(selectedStatefulSet)
                                                      document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                    }}
                                                  >
                                                    {t('common.delete')}
                  </button>
                </div>
              </div>
                            <button
                                className="icon-btn"
                                onClick={async () => {
                                  if (selectedStatefulSet) {
                                    // 重置加载状态，强制刷新
                                    isLoadingStatefulSetRef.current = false
                                    loadedStatefulSetRef.current = ''
                                    await loadStatefulSetDetail(selectedStatefulSet)
                                  }
                                }}
                                title={t('common.refresh')}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                      </div>
                          </div>

                          {/* 主要内容区域 */}
                          <div className="deployment-detail-content">
                            {/* 基本信息 - 两列布局 */}
                            {statefulSetDetail ? (
                          <div className="info-section">
                                <h3>{t('k8s.basicInfo')}</h3>
                                <div className="info-grid-two-columns">
                                  {/* 左列 */}
                                  <div className="info-column-left">
                                <div className="info-item">
                                      <label>{t('k8s.name')}</label>
                                      <span>{statefulSetDetail.name || selectedStatefulSet?.name || '-'}</span>
                        </div>
                                <div className="info-item">
                                      <label>{t('k8s.createdAt')}</label>
                                      <span>{statefulSetDetail.created_at ? new Date(statefulSetDetail.created_at).toLocaleString('zh-CN') : '-'}</span>
                        </div>
                                <div className="info-item">
                                      <label>{t('k8s.annotations')}</label>
                                      <span>{statefulSetDetail.annotations && Object.keys(statefulSetDetail.annotations).length > 0 ? Object.entries(statefulSetDetail.annotations).map(([key, value]) => `${key}:${value}`).join(', ') : '-'}</span>
                    </div>
                                      <div className="info-item">
                                      <label>{t('k8s.strategy')}</label>
                                      <span>{statefulSetDetail.strategy || 'RollingUpdate'}</span>
                        </div>
                                  </div>

                                  {/* 右列 */}
                                  <div className="info-column-right">
                                <div className="info-item">
                                      <label>{t('k8s.namespace')}</label>
                                      <span>{statefulSetDetail.namespace || selectedStatefulSet?.namespace || '-'}</span>
                        </div>
                                    {statefulSetDetail.labels && Object.keys(statefulSetDetail.labels).length > 0 && (
                                <div className="info-item">
                                        <label>{t('k8s.labels')}</label>
                                        <div className="labels-list">
                                          {Object.entries(statefulSetDetail.labels).map(([key, value]) => (
                                            <span key={key} className="label-tag">{key}:{value}</span>
                                          ))}
                      </div>
                      </div>
                      )}
                                <div className="info-item">
                                      <label>{t('k8s.selector')}</label>
                                      <div className="selector-tags">
                                        {statefulSetDetail.selector && Object.entries(statefulSetDetail.selector).map(([key, value]) => (
                                          <span key={key} className="selector-tag">{key}:{value}</span>
                                        ))}
                                        {(!statefulSetDetail.selector || Object.keys(statefulSetDetail.selector).length === 0) && '-'}
                    </div>
                                              </div>
                                      <div className="info-item">
                                      <label>{t('k8s.status')}</label>
                                      <div className="status-inline">
                            <span>
                                          {t('k8s.ready')}:{statefulSetDetail.readyReplicas || statefulSetDetail.ready_replicas || 0}/{statefulSetDetail.replicas || 0}个, {t('k8s.updated')}:{statefulSetDetail.updatedReplicas || statefulSetDetail.updated_replicas || 0}个, {t('k8s.available')}:{statefulSetDetail.availableReplicas || statefulSetDetail.available_replicas || 0}个
                                    </span>
                      </div>
                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : selectedStatefulSet ? (
                              <div className="info-section">
                                <h3>{t('k8s.basicInfo')}</h3>
                                <div className="info-grid-two-columns">
                                  <div className="info-column-left">
                                      <div className="info-item">
                                      <label>{t('k8s.name')}</label>
                                      <span>{selectedStatefulSet.name || '-'}</span>
                          </div>
                                        </div>
                                  <div className="info-column-right">
                                        <div className="info-item">
                                      <label>{t('k8s.namespace')}</label>
                                      <span>{selectedStatefulSet.namespace || '-'}</span>
                                        </div>
                                        </div>
                                      </div>
                                  </div>
                            ) : null}
                          </div>

                          {/* 标签页 */}
                          <div className="deployment-detail-tabs">
                  <button
                              className={`tab-button ${statefulSetDetailTab === 'pods' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('pods')}
                            >
                              {t('k8s.containerGroup')}
                  </button>
                  <button
                              className={`tab-button ${statefulSetDetailTab === 'access' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('access')}
                            >
                              {t('k8s.accessMethod')}
                        </button>
                        <button
                              className={`tab-button ${statefulSetDetailTab === 'events' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('events')}
                            >
                              {t('k8s.events')}
                        </button>
                        <button
                              className={`tab-button ${statefulSetDetailTab === 'scaling' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('scaling')}
                            >
                              {t('k8s.containerScaling')}
                        </button>
                        <button
                              className={`tab-button ${statefulSetDetailTab === 'history' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('history')}
                            >
                              {t('k8s.historyVersions')}
                        </button>
                        <button
                              className={`tab-button ${statefulSetDetailTab === 'logs' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('logs')}
                            >
                              {t('k8s.logs')}
                            </button>
                            <button
                              className={`tab-button ${statefulSetDetailTab === 'monitoring' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('monitoring')}
                            >
                              {t('k8s.monitoring')}
                            </button>
                            <button
                              className={`tab-button ${statefulSetDetailTab === 'cost' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('cost')}
                            >
                              {t('k8s.costInsight')}
                        </button>
                      </div>

                          {/* 标签页内容 */}
                          <div className="deployment-detail-tab-content">
                            {statefulSetDetailTab === 'pods' && (
                              <div className="pods-tab-content">
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                                    <th>{t('k8s.name')}</th>
                                      <th>{t('k8s.image')}</th>
                                        <th>{t('k8s.status')} (全部) ▼</th>
                                      <th>{t('k8s.monitoring')}</th>
                                        <th>{t('k8s.restartCount')} ▲</th>
                                        <th>Pod IP</th>
                                  <th>{t('k8s.node')}</th>
                              <th>{t('k8s.createdAt')}</th>
                                    <th>{t('common.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                                      {statefulSetPods && statefulSetPods.length > 0 ? (
                                        statefulSetPods.map((pod) => (
                                        <tr key={pod.name}>
                                            <td className="name-cell">{pod.name}</td>
                                            <td className="images-cell">
                                              {Array.isArray(pod.images) && pod.images.length > 0 ? (
                                                <div>
                                                  {pod.images.map((img, idx) => (
                                                    <div key={idx}>{img}</div>
                                                  ))}
                                                </div>
                                              ) : (pod.image || '-')}
                                </td>
                                          <td>
                                              <span className={`status-badge status-${(pod.status || '').toLowerCase()}`}>
                                                {pod.status === 'Running' && '● '}
                                                {pod.status || 'Unknown'}
                                    </span>
                                  </td>
                                          <td>
                                              <button className="icon-btn" title={t('k8s.monitoring')}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                  <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
                                                  <path d="M7 12l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                              </button>
                                          </td>
                                            <td>{pod.restartCount || 0}</td>
                                            <td>{pod.ip || '-'}</td>
                                            <td>
                                              {pod.nodeName ? (
                                                <>
                                                  {pod.nodeName}
                                                  <br />
                                                  <span className="node-ip">{pod.nodeIP || ''}</span>
                                                </>
                                            ) : '-'}
                                          </td>
                                          <td>{pod.created_at ? new Date(pod.created_at).toLocaleString('zh-CN') : '-'}</td>
                                          <td>
                                            <div className="action-buttons">
                                                <button className="btn-text" onClick={() => handleViewPodDetails(pod)}>
                                                  详情
                                            </button>
                                                <span className="action-separator">|</span>
                                                <button className="btn-text" onClick={() => handleEditYaml(pod)}>
                                                YAML {t('common.edit')}
                                            </button>
                                                <span className="action-separator">|</span>
                                                <button className="btn-text" onClick={() => handleViewLogs(pod)}>
                                                  {t('k8s.terminal')}
                                            </button>
                                                <span className="action-separator">|</span>
                                            <div className="action-dropdown">
                                                  <button className="btn-text btn-more">
                                                  {t('common.more')} ▼
                                              </button>
                                                  <div className="dropdown-menu">
                                                    <button onClick={() => handleRestartPod(pod.namespace, pod.name)}>
                                                    {t('k8s.restart')}
                                                </button>
                                                    <button className="danger" onClick={() => handleDeletePod(pod)}>
                                                    {t('common.delete')}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                    </td>
                                </tr>
                              ))
                                      ) : (
                                        <tr>
                                          <td colSpan="9" className="empty-state">{t('k8s.noPods')}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                                {statefulSetPods && statefulSetPods.length > 0 && (
                                  <div className="pagination-info">
                                    共有{statefulSetPods.length}条,每页显示:25条
                    </div>
              )}
            </div>
                  )}

                            {statefulSetDetailTab !== 'pods' && (
                              <div className="tab-placeholder">
                                {t('k8s.comingSoon')}
                </div>
                        )}
                </div>
                </div>
                                            )}
            </div>
          )}

          {/* 编辑标签模态框 */}
          {showLabelsModal && (
            <div className="modal-overlay" onClick={() => setShowLabelsModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.editLabels')} - {editingPod?.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowLabelsModal(false)
                      setEditingPod(null)
                      setEditingLabels({})
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('k8s.labels')}</label>
                    <div className="labels-editor">
                    {Object.entries(editingLabels).map(([key, value]) => (
                      <div key={key} className="label-item">
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => {
                            const newLabels = { ...editingLabels }
                            delete newLabels[key]
                            newLabels[e.target.value] = value
                            setEditingLabels(newLabels)
                          }}
                          placeholder={t('k8s.labelKey')}
                        />
                        <span>=</span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            setEditingLabels({ ...editingLabels, [key]: e.target.value })
                          }}
                          placeholder={t('k8s.labelValue')}
                        />
                        <button
                            className="btn-text"
                          onClick={() => {
                            const newLabels = { ...editingLabels }
                            delete newLabels[key]
                            setEditingLabels(newLabels)
                          }}
                        >
                            {t('common.delete')}
                        </button>
                      </div>
                    ))}
                  <button
                        className="btn-text"
                    onClick={() => {
                      setEditingLabels({ ...editingLabels, '': '' })
                    }}
                  >
                    + {t('k8s.addLabel')}
                  </button>
                                              </div>
                                            </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowLabelsModal(false)
                      setEditingPod(null)
                      setEditingLabels({})
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveLabels}
                    disabled={loading}
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 编辑注解模态框 */}
          {showAnnotationsModal && (
            <div className="modal-overlay" onClick={() => setShowAnnotationsModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.editAnnotations')} - {editingPod?.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowAnnotationsModal(false)
                      setEditingPod(null)
                      setEditingAnnotations({})
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('k8s.annotations')}</label>
                    <div className="labels-editor">
                    {Object.entries(editingAnnotations).map(([key, value]) => (
                        <div key={key} className="label-item">
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => {
                            const newAnnotations = { ...editingAnnotations }
                            delete newAnnotations[key]
                            newAnnotations[e.target.value] = value
                            setEditingAnnotations(newAnnotations)
                          }}
                          placeholder={t('k8s.annotationKey')}
                        />
                        <span>=</span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            setEditingAnnotations({ ...editingAnnotations, [key]: e.target.value })
                          }}
                          placeholder={t('k8s.annotationValue')}
                        />
                        <button
                            className="btn-text"
                          onClick={() => {
                            const newAnnotations = { ...editingAnnotations }
                            delete newAnnotations[key]
                            setEditingAnnotations(newAnnotations)
                          }}
                        >
                            {t('common.delete')}
                        </button>
                      </div>
                    ))}
                  <button
                        className="btn-text"
                    onClick={() => {
                      setEditingAnnotations({ ...editingAnnotations, '': '' })
                    }}
                  >
                    + {t('k8s.addAnnotation')}
                  </button>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowAnnotationsModal(false)
                      setEditingPod(null)
                      setEditingAnnotations({})
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveAnnotations}
                    disabled={loading}
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 资源配额与限制模态框 */}
          {showQuotaModal && editingNamespace && (
            <div className="modal-overlay" onClick={() => setShowQuotaModal(false)}>
              <div className="modal-content quota-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.resourceQuotaAndLimits')}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowQuotaModal(false)
                      setEditingNamespace(null)
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  {/* 信息提示横幅 */}
                  <div className="info-banner">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM8 12C7.45 12 7 11.55 7 11C7 10.45 7.45 10 8 10C8.55 10 9 10.45 9 11C9 11.55 8.55 12 8 12ZM9 9H7V5H9V9Z" fill="#F59E0B"/>
                    </svg>
                    <span>{t('k8s.quotaInfoBanner')}</span>
                </div>

                  {/* 两列布局容器 */}
                  <div className="quota-sections-container">
                    {/* Resource Quota 部分 */}
                    <div className="quota-section">
                    <div 
                      className="quota-section-header"
                      onClick={() => setResourceQuotaExpanded(!resourceQuotaExpanded)}
                    >
                      <span className="quota-section-title">{t('k8s.resourceQuota')}</span>
                      <svg 
                        className={`quota-arrow ${resourceQuotaExpanded ? 'expanded' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none"
                      >
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                </div>
                    {resourceQuotaExpanded && (
                      <div className="quota-section-content">
                        {/* 计算资源限制 */}
                        <div className="quota-subsection">
                          <h4>{t('k8s.computeResourceLimits')}</h4>
                          
                          {/* CPU Limit */}
                          <div className="quota-field">
                            <label>{t('k8s.cpuLimit')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                    <input
                                type="text"
                                className="quota-input"
                                value={quotaData.cpuLimit}
                                onChange={(e) => setQuotaData({...quotaData, cpuLimit: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">核</span>
                  </div>
            </div>

                          {/* Memory Limit */}
                          <div className="quota-field">
                            <label>{t('k8s.memoryLimit')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                    <input
                      type="text"
                                className="quota-input"
                                value={quotaData.memoryLimit}
                                onChange={(e) => setQuotaData({...quotaData, memoryLimit: e.target.value})}
                                placeholder="0"
                              />
                              <select
                                className="quota-unit-select"
                                value={quotaData.memoryLimitUnit}
                                onChange={(e) => setQuotaData({...quotaData, memoryLimitUnit: e.target.value})}
                              >
                                <option value="Gi">Gi</option>
                                <option value="Mi">Mi</option>
                              </select>
                  </div>
                          </div>

                          {/* CPU Request */}
                          <div className="quota-field">
                            <label>{t('k8s.cpuRequest')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                          <input
                            type="text"
                                className="quota-input"
                                value={quotaData.cpuRequest}
                                onChange={(e) => setQuotaData({...quotaData, cpuRequest: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">核</span>
                  </div>
                          </div>

                          {/* Memory Request */}
                          <div className="quota-field">
                            <label>{t('k8s.memoryRequest')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                          <input
                            type="text"
                                className="quota-input"
                                value={quotaData.memoryRequest}
                                onChange={(e) => setQuotaData({...quotaData, memoryRequest: e.target.value})}
                                placeholder="0"
                              />
                              <select
                                className="quota-unit-select"
                                value={quotaData.memoryRequestUnit}
                                onChange={(e) => setQuotaData({...quotaData, memoryRequestUnit: e.target.value})}
                              >
                                <option value="Gi">Gi</option>
                                <option value="Mi">Mi</option>
                              </select>
                        </div>
                    </div>

                          {/* Exclusive GPU Limit */}
                          <div className="quota-field">
                            <label>
                              {t('k8s.exclusiveGpuLimit')}
                              <svg className="help-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M7 10V7M7 4H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                    <input
                                type="text"
                                className="quota-input"
                                value={quotaData.exclusiveGpu}
                                onChange={(e) => setQuotaData({...quotaData, exclusiveGpu: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">个</span>
                  </div>
                </div>

                          {/* Shared GPU Memory Limit */}
                          <div className="quota-field">
                            <label>
                              {t('k8s.sharedGpuMemoryLimit')}
                              <svg className="help-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M7 10V7M7 4H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.sharedGpuMemory}
                                onChange={(e) => setQuotaData({...quotaData, sharedGpuMemory: e.target.value})}
                                placeholder="0"
                              />
                              <select
                                className="quota-unit-select"
                                value={quotaData.sharedGpuMemoryUnit}
                                onChange={(e) => setQuotaData({...quotaData, sharedGpuMemoryUnit: e.target.value})}
                              >
                                <option value="Gi">Gi</option>
                                <option value="Mi">Mi</option>
                              </select>
                </div>
              </div>
            </div>

                        {/* 存储资源限制 */}
                        <div className="quota-subsection">
                          <h4>{t('k8s.storageResourceLimits')}</h4>
                          
                          {/* Storage Claim Quantity */}
                          <div className="quota-field">
                            <label>{t('k8s.storageClaimQuantity')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                    <input
                                type="text"
                                className="quota-input"
                                value={quotaData.storageClaim}
                                onChange={(e) => setQuotaData({...quotaData, storageClaim: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">个</span>
                  </div>
                </div>

                          {/* Storage Space */}
                          <div className="quota-field">
                            <label>{t('k8s.storageSpace')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.storageSpace}
                                onChange={(e) => setQuotaData({...quotaData, storageSpace: e.target.value})}
                                placeholder="0"
                              />
                              <select
                                className="quota-unit-select"
                                value={quotaData.storageSpaceUnit}
                                onChange={(e) => setQuotaData({...quotaData, storageSpaceUnit: e.target.value})}
                              >
                                <option value="Gi">Gi</option>
                                <option value="Mi">Mi</option>
                              </select>
                </div>
              </div>
            </div>

                        {/* 其他资源限制 */}
                        <div className="quota-subsection">
                          <h4>{t('k8s.otherResourceLimits')}</h4>
                          
                          {/* Config File Quantity */}
                          <div className="quota-field">
                            <label>{t('k8s.configFileQuantity')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.configFile}
                                onChange={(e) => setQuotaData({...quotaData, configFile: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">个</span>
                </div>
                </div>

                          {/* Container Group Quantity */}
                          <div className="quota-field">
                            <label>{t('k8s.containerGroupQuantity')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.containerGroup}
                                onChange={(e) => setQuotaData({...quotaData, containerGroup: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">个</span>
                </div>
                </div>

                          {/* Service Quantity */}
                          <div className="quota-field">
                            <label>{t('k8s.serviceQuantity')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                    <input
                      type="text"
                                className="quota-input"
                                value={quotaData.service}
                                onChange={(e) => setQuotaData({...quotaData, service: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">个</span>
              </div>
            </div>

                          {/* Load Balancer Service Quantity */}
                          <div className="quota-field">
                            <label>{t('k8s.loadBalancerServiceQuantity')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                          <input
                            type="text"
                                className="quota-input"
                                value={quotaData.loadBalancerService}
                                onChange={(e) => setQuotaData({...quotaData, loadBalancerService: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">个</span>
                </div>
                  </div>

                          {/* Secret Quantity */}
                          <div className="quota-field">
                            <label>{t('k8s.secretQuantity')}</label>
                            <div className="quota-input-group">
                              <span className="quota-label">{t('k8s.maxUsage')}</span>
                    <input
                                type="text"
                                className="quota-input"
                                value={quotaData.secret}
                                onChange={(e) => setQuotaData({...quotaData, secret: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">个</span>
                  </div>
                </div>
              </div>
            </div>
          )}
                  </div>

                    {/* Limit Range 部分 */}
                    <div className="quota-section">
                    <div 
                      className="quota-section-header"
                      onClick={() => setLimitRangeExpanded(!limitRangeExpanded)}
                    >
                      <span className="quota-section-title">
                        {t('k8s.defaultResourceLimits')}
                        <svg className="help-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7 10V7M7 4H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <svg 
                        className={`quota-arrow ${limitRangeExpanded ? 'expanded' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none"
                      >
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                </div>
                    {limitRangeExpanded && (
                      <div className="quota-section-content">
                        {/* 资源限制 */}
                        <div className="quota-subsection">
                          <h4>{t('k8s.resourceLimit')}</h4>
                          
                          {/* CPU Limit */}
                          <div className="quota-field">
                            <label>{t('k8s.cpuLimit')}</label>
                            <div className="quota-input-group">
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.limitCpuLimit}
                                onChange={(e) => setQuotaData({...quotaData, limitCpuLimit: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">核</span>
                </div>
                  </div>

                          {/* Memory Limit */}
                          <div className="quota-field">
                            <label>{t('k8s.memoryLimit')}</label>
                            <div className="quota-input-group">
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.limitMemoryLimit}
                                onChange={(e) => setQuotaData({...quotaData, limitMemoryLimit: e.target.value})}
                                placeholder="0"
                              />
                              <select
                                className="quota-unit-select"
                                value={quotaData.limitMemoryLimitUnit}
                                onChange={(e) => setQuotaData({...quotaData, limitMemoryLimitUnit: e.target.value})}
                              >
                                <option value="Gi">Gi</option>
                                <option value="Mi">Mi</option>
                              </select>
                </div>
                  </div>
                </div>

                        {/* 资源申请 */}
                        <div className="quota-subsection">
                          <h4>{t('k8s.resourceRequest')}</h4>
                          
                          {/* CPU Limit */}
                          <div className="quota-field">
                            <label>{t('k8s.cpuLimit')}</label>
                            <div className="quota-input-group">
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.requestCpuLimit}
                                onChange={(e) => setQuotaData({...quotaData, requestCpuLimit: e.target.value})}
                                placeholder="0"
                              />
                              <span className="quota-unit">核</span>
                </div>
                  </div>

                          {/* Memory Limit */}
                          <div className="quota-field">
                            <label>{t('k8s.memoryLimit')}</label>
                            <div className="quota-input-group">
                              <input
                                type="text"
                                className="quota-input"
                                value={quotaData.requestMemoryLimit}
                                onChange={(e) => setQuotaData({...quotaData, requestMemoryLimit: e.target.value})}
                                placeholder="0"
                              />
                              <select
                                className="quota-unit-select"
                                value={quotaData.requestMemoryLimitUnit}
                                onChange={(e) => setQuotaData({...quotaData, requestMemoryLimitUnit: e.target.value})}
                              >
                                <option value="Gi">Gi</option>
                                <option value="Mi">Mi</option>
                              </select>
                  </div>
                </div>
              </div>
            </div>
          )}
                </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowQuotaModal(false)
                      setEditingNamespace(null)
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveQuota}
                    disabled={loading}
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 创建命名空间模态框 */}
          {showCreateNamespaceModal && (
            <div className="modal-overlay" onClick={() => setShowCreateNamespaceModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.createNamespace')}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowCreateNamespaceModal(false)
                      setNewNamespaceName('')
                      setNewNamespaceDeletionProtection(false)
                      setNewNamespaceLabels({})
                      setError('')
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  {/* 命名空间名称 */}
                  <div className="form-group">
                    <label>
                      <span className="required">*</span> {t('k8s.namespaceName')}
                    </label>
                    <div className="input-with-counter">
                    <input
                        type="text"
                        className="form-input"
                        value={newNamespaceName}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value.length <= 63) {
                            setNewNamespaceName(value)
                          }
                        }}
                        placeholder={t('k8s.namespaceNamePlaceholder')}
                        maxLength={63}
                      />
                      <span className="char-counter">{newNamespaceName.length}/63</span>
                  </div>
                    <div className="form-hint">
                      {t('k8s.namespaceNameRule')}
                    </div>
                  </div>

                  {/* 删除保护 */}
                  <div className="form-group">
                    <label>{t('k8s.deletionProtection')}</label>
                    <div className="toggle-switch-container">
                      <label className="toggle-switch">
                    <input
                          type="checkbox"
                          checked={newNamespaceDeletionProtection}
                          onChange={(e) => setNewNamespaceDeletionProtection(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">
                        {t('k8s.enableDeletionProtection')}
                        <svg className="help-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7 10V7M7 4H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                  </div>
                  </div>

                  {/* 命名空间标签 */}
                  <div className="form-group">
                    <label>{t('k8s.namespaceTags')}</label>
                    <div className="labels-editor">
                      {Object.entries(newNamespaceLabels).map(([key, value]) => (
                        <div key={key} className="label-item">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newLabels = { ...newNamespaceLabels }
                              delete newLabels[key]
                              newLabels[e.target.value] = value
                              setNewNamespaceLabels(newLabels)
                            }}
                            placeholder={t('k8s.variableName')}
                            className="label-input"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setNewNamespaceLabels({ ...newNamespaceLabels, [key]: e.target.value })
                            }}
                            placeholder={t('k8s.variableValue')}
                            className="label-input"
                          />
                          <button
                            className="btn-text btn-delete"
                            onClick={() => {
                              const newLabels = { ...newNamespaceLabels }
                              delete newLabels[key]
                              setNewNamespaceLabels(newLabels)
                            }}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn-text btn-add-label"
                        onClick={() => {
                          setNewNamespaceLabels({ ...newNamespaceLabels, '': '' })
                        }}
                      >
                        + {t('k8s.addNamespaceTag')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateNamespaceModal(false)
                      setNewNamespaceName('')
                      setNewNamespaceDeletionProtection(false)
                      setNewNamespaceLabels({})
                      setError('')
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleCreateNamespace}
                    disabled={loading || !newNamespaceName.trim()}
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 编辑命名空间模态框 */}
          {showEditNamespaceModal && editingNamespace && (
            <div className="modal-overlay" onClick={() => {
              setShowEditNamespaceModal(false)
              setEditingNamespace(null)
              setEditNamespaceName('')
              setEditNamespaceDeletionProtection(false)
              setEditNamespaceLabels({})
              setError('')
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.editNamespace')}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowEditNamespaceModal(false)
                      setEditingNamespace(null)
                      setEditNamespaceName('')
                      setEditNamespaceDeletionProtection(false)
                      setEditNamespaceLabels({})
                      setError('')
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  {/* 命名空间名称 */}
                  <div className="form-group">
                    <label>
                      <span className="required">*</span> {t('k8s.namespaceName')}
                    </label>
                    <div className="input-with-counter">
                    <input
                        type="text"
                        className="form-input"
                        value={editNamespaceName}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value.length <= 63) {
                            setEditNamespaceName(value)
                          }
                        }}
                        placeholder={t('k8s.namespaceNamePlaceholder')}
                        maxLength={63}
                      />
                      <span className="char-counter">{editNamespaceName.length}/63</span>
                  </div>
                    <div className="form-hint">
                      {t('k8s.namespaceNameRule')}
                </div>
              </div>

                  {/* 删除保护 */}
                  <div className="form-group">
                    <label>{t('k8s.deletionProtection')}</label>
                    <div className="toggle-switch-container">
                      <label className="toggle-switch">
                    <input
                          type="checkbox"
                          checked={editNamespaceDeletionProtection}
                          onChange={(e) => setEditNamespaceDeletionProtection(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="toggle-label">
                        {t('k8s.enableDeletionProtection')}
                        <svg className="help-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7 10V7M7 4H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                  </div>
                  </div>

                  {/* 命名空间标签 */}
                  <div className="form-group">
                    <label>{t('k8s.namespaceTags')}</label>
                    <div className="labels-editor">
                      {Object.entries(editNamespaceLabels).map(([key, value]) => (
                        <div key={key} className="label-item">
                    <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newLabels = { ...editNamespaceLabels }
                              delete newLabels[key]
                              newLabels[e.target.value] = value
                              setEditNamespaceLabels(newLabels)
                            }}
                            placeholder={t('k8s.variableName')}
                            className="label-input"
                          />
                    <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setEditNamespaceLabels({ ...editNamespaceLabels, [key]: e.target.value })
                            }}
                            placeholder={t('k8s.variableValue')}
                            className="label-input"
                          />
                  <button
                            className="btn-text btn-delete"
                    onClick={() => {
                              const newLabels = { ...editNamespaceLabels }
                              delete newLabels[key]
                              setEditNamespaceLabels(newLabels)
                            }}
                          >
                            {t('common.delete')}
                  </button>
                </div>
                      ))}
                  <button
                        className="btn-text btn-add-label"
                    onClick={() => {
                          setEditNamespaceLabels({ ...editNamespaceLabels, '': '' })
                    }}
                  >
                        + {t('k8s.addNamespaceTag')}
                  </button>
                </div>
                </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowEditNamespaceModal(false)
                      setEditingNamespace(null)
                      setEditNamespaceName('')
                      setEditNamespaceDeletionProtection(false)
                      setEditNamespaceLabels({})
                      setError('')
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleEditNamespace}
                    disabled={loading || !editNamespaceName.trim()}
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 创建 Deployment 模态框 */}
          {showCreateDeploymentModal && (
            <div className="modal-overlay" onClick={() => {
              if (createDeploymentStep === 4) {
                setShowCreateDeploymentModal(false)
                setCreateDeploymentStep(1)
              }
            }}>
              <div className="modal-content create-deployment-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <button
                    className="btn-back-small"
                    onClick={() => {
                      if (createDeploymentStep > 1) {
                        setCreateDeploymentStep(createDeploymentStep - 1)
                      } else {
                        setShowCreateDeploymentModal(false)
                        setCreateDeploymentStep(1)
                      }
                    }}
                  >
                    ← {t('common.back')}
                  </button>
                  <h2>{t('k8s.create')}</h2>
                  {createDeploymentStep < 4 && (
                    <button
                      className="modal-close"
                      onClick={() => {
                        setShowCreateDeploymentModal(false)
                        setCreateDeploymentStep(1)
                        setCreateDeploymentData({
                          name: '',
                          namespace: 'default',
                          replicas: 2,
                          type: 'Deployment',
                          labels: {},
                          annotations: {},
                          timeZoneSync: false,
                          containers: [{
                            name: 'container-1',
                            image: '',
                            imagePullPolicy: 'IfNotPresent',
                            imageSecret: '',
                            cpuLimit: '',
                            memoryLimit: '',
                            ephemeralStorageLimit: '',
                            gpuType: 'none',
                            cpuRequest: '0.25',
                            memoryRequest: '512Mi',
                            ephemeralStorageRequest: '',
                            stdin: false,
                            tty: false,
                            privileged: false,
                            initContainer: false,
                            ports: [],
                            envVars: [],
                          }],
                          hpaEnabled: false,
                          cronHpaEnabled: false,
                          upgradeStrategy: false,
                          nodeAffinity: [],
                          podAffinity: [],
                          podAntiAffinity: [],
                          tolerations: [],
                          podLabels: {},
                          podAnnotations: {},
                        })
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* 步骤指示器 */}
                <div className="step-indicator">
                  <div className={`step ${createDeploymentStep > 1 ? 'completed' : ''} ${createDeploymentStep === 1 ? 'active' : ''}`}>
                    <div>{createDeploymentStep > 1 ? '✓' : '1'}</div>
                    <span>应用基本信息</span>
                </div>
                  <div className={`step ${createDeploymentStep > 2 ? 'completed' : ''} ${createDeploymentStep === 2 ? 'active' : ''}`}>
                    <div>{createDeploymentStep > 2 ? '✓' : '2'}</div>
                    <span>容器配置</span>
                  </div>
                  <div className={`step ${createDeploymentStep > 3 ? 'completed' : ''} ${createDeploymentStep === 3 ? 'active' : ''}`}>
                    <div>{createDeploymentStep > 3 ? '✓' : '3'}</div>
                    <span>高级配置</span>
                </div>
                  <div className={`step ${createDeploymentStep === 4 ? 'active' : ''}`}>
                    <div>4</div>
                    <span>创建完成</span>
              </div>
            </div>

                <div className="modal-body create-deployment-body">
                  {/* 步骤1: 应用基本信息 */}
                  {createDeploymentStep === 1 && (
                    <div className="create-deployment-step">
                      <div className="form-group">
                        <label>{t('k8s.applicationName')}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={createDeploymentData.name}
                          onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, name: e.target.value })}
                          placeholder={t('k8s.applicationNamePlaceholder')}
                        />
                        <div className="form-hint">
                          {t('k8s.applicationNameRule')}
                </div>
                  </div>

                      <div className="form-group">
                        <label>{t('k8s.namespace')}</label>
                        <select
                          className="form-input"
                          value={createDeploymentData.namespace}
                          onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, namespace: e.target.value })}
                        >
                          <option value="">全部命名空间</option>
                          {namespaces.map(ns => (
                            <option key={ns.name} value={ns.name}>{ns.name}</option>
                          ))}
                        </select>
                </div>

                      <div className="form-group">
                        <label>
                          <span className="required">*</span> {t('k8s.replicas')}
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          value={createDeploymentData.replicas}
                          onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, replicas: parseInt(e.target.value) || 1 })}
                          min="1"
                        />
                </div>

                      <div className="form-group">
                        <label>{t('k8s.type')}</label>
                        <select
                          className="form-input"
                          value={createDeploymentData.type}
                          onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, type: e.target.value })}
                        >
                          <option value="Deployment">无状态 (Deployment)</option>
                        </select>
                </div>

                      <div className="form-group">
                        <label>{t('k8s.labels')}</label>
                  <button
                          type="button"
                          className="btn-text btn-add"
                    onClick={() => {
                            const newLabels = { ...createDeploymentData.labels, '': '' }
                            setCreateDeploymentData({ ...createDeploymentData, labels: newLabels })
                    }}
                  >
                          {t('common.add')}
                  </button>
                        {Object.entries(createDeploymentData.labels).map(([key, value]) => (
                          <div key={key} className="label-item">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                                const newLabels = { ...createDeploymentData.labels }
                              delete newLabels[key]
                              newLabels[e.target.value] = value
                                setCreateDeploymentData({ ...createDeploymentData, labels: newLabels })
                            }}
                              placeholder={t('k8s.variableName')}
                              className="label-input"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                                setCreateDeploymentData({
                                  ...createDeploymentData,
                                  labels: { ...createDeploymentData.labels, [key]: e.target.value }
                                })
                              }}
                              placeholder={t('k8s.variableValue')}
                              className="label-input"
                          />
                          <button
                              className="btn-text btn-delete"
                            onClick={() => {
                                const newLabels = { ...createDeploymentData.labels }
                              delete newLabels[key]
                                setCreateDeploymentData({ ...createDeploymentData, labels: newLabels })
                            }}
                          >
                              {t('common.delete')}
                          </button>
                        </div>
                      ))}
                    </div>

                      <div className="form-group">
                        <label>{t('k8s.annotations')}</label>
                  <button
                    type="button"
                          className="btn-text btn-add"
                    onClick={() => {
                            const newAnnotations = { ...createDeploymentData.annotations, '': '' }
                            setCreateDeploymentData({ ...createDeploymentData, annotations: newAnnotations })
                    }}
                  >
                          {t('common.add')}
                  </button>
                        {Object.entries(createDeploymentData.annotations).map(([key, value]) => (
                          <div key={key} className="label-item">
                            <input
                              type="text"
                              value={key}
                              onChange={(e) => {
                                const newAnnotations = { ...createDeploymentData.annotations }
                                delete newAnnotations[key]
                                newAnnotations[e.target.value] = value
                                setCreateDeploymentData({ ...createDeploymentData, annotations: newAnnotations })
                              }}
                              placeholder={t('k8s.variableName')}
                              className="label-input"
                            />
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => {
                                setCreateDeploymentData({
                                  ...createDeploymentData,
                                  annotations: { ...createDeploymentData.annotations, [key]: e.target.value }
                                })
                              }}
                              placeholder={t('k8s.variableValue')}
                              className="label-input"
                            />
                  <button
                              className="btn-text btn-delete"
                    onClick={() => {
                                const newAnnotations = { ...createDeploymentData.annotations }
                                delete newAnnotations[key]
                                setCreateDeploymentData({ ...createDeploymentData, annotations: newAnnotations })
                              }}
                            >
                              {t('common.delete')}
                  </button>
                </div>
                        ))}
                      </div>

                  <div className="form-group">
                        <label>
                    <input
                            type="checkbox"
                            checked={createDeploymentData.timeZoneSync}
                            onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, timeZoneSync: e.target.checked })}
                          />
                          {t('k8s.timeZoneSync')}
                        </label>
                  </div>
                </div>
          )}

                  {/* 步骤2: 容器配置 */}
                  {createDeploymentStep === 2 && (
                    <div className="create-deployment-step">
                      <div className="container-tabs">
                        {createDeploymentData.containers.map((container, index) => (
                  <button
                            key={index}
                            className={`container-tab ${index === 0 ? 'active' : ''}`}
                          >
                            容器{index + 1}
                  </button>
                        ))}
                  <button
                          className="btn-text btn-add-container"
                          onClick={() => {
                            const newContainers = [...createDeploymentData.containers, {
                              name: `container-${createDeploymentData.containers.length + 1}`,
                              image: '',
                              imagePullPolicy: 'IfNotPresent',
                              imageSecret: '',
                              cpuLimit: '',
                              memoryLimit: '',
                              ephemeralStorageLimit: '',
                              gpuType: 'none',
                              cpuRequest: '0.25',
                              memoryRequest: '512Mi',
                              ephemeralStorageRequest: '',
                              stdin: false,
                              tty: false,
                              privileged: false,
                              initContainer: false,
                              ports: [],
                              envVars: [],
                            }]
                            setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                          }}
                        >
                          + 添加容器
                  </button>
                </div>

                      {createDeploymentData.containers.map((container, index) => (
                        <div key={index} className="container-config">
                          <div className="form-group">
                            <label>{t('k8s.imageName')}</label>
                            <div className="input-with-button">
                              <input
                                type="text"
                                className="form-input"
                                value={container.image}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].image = e.target.value
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                                placeholder={t('k8s.imageNamePlaceholder')}
                              />
                              <button type="button" className="btn-secondary" disabled>
                                {t('k8s.selectImage')}
                              </button>
              </div>
            </div>

                          <div className="form-group">
                            <label>{t('k8s.imagePullPolicy')}</label>
                            <select
                              className="form-input"
                              value={container.imagePullPolicy}
                              onChange={(e) => {
                                const newContainers = [...createDeploymentData.containers]
                                newContainers[index].imagePullPolicy = e.target.value
                                setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                              }}
                            >
                              <option value="IfNotPresent">IfNotPresent</option>
                              <option value="Always">Always</option>
                              <option value="Never">Never</option>
                            </select>
                            <button type="button" className="btn-text" disabled>
                              {t('k8s.setImageSecret')}
                  </button>
                </div>

                          <div className="form-group">
                            <label>{t('k8s.resourceLimits')}</label>
                            <div className="resource-inputs">
                              <input
                                type="text"
                                className="form-input"
                                placeholder={t('k8s.cpuExample')}
                                value={container.cpuLimit}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].cpuLimit = e.target.value
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                              />
                              <input
                                type="text"
                                className="form-input"
                                placeholder={t('k8s.memoryExample')}
                                value={container.memoryLimit}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].memoryLimit = e.target.value
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                              />
                              <input
                                type="text"
                                className="form-input"
                                placeholder={t('k8s.ephemeralStorageExample')}
                                value={container.ephemeralStorageLimit}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].ephemeralStorageLimit = e.target.value
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                              />
                </div>
              </div>

                          <div className="form-group">
                            <label>{t('k8s.gpuResourceLimits')}</label>
                            <div className="radio-group">
                              <label>
                                <input
                                  type="radio"
                                  value="none"
                                  checked={container.gpuType === 'none'}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].gpuType = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                />
                                {t('k8s.dontUseGpu')}
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  value="exclusive"
                                  checked={container.gpuType === 'exclusive'}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].gpuType = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                />
                                {t('k8s.exclusiveGpu')}
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  value="shared"
                                  checked={container.gpuType === 'shared'}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].gpuType = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                />
                                {t('k8s.sharedGpu')}
                              </label>
                </div>
              </div>

                  <div className="form-group">
                            <label>{t('k8s.resourceRequests')}</label>
                            <div className="resource-inputs">
                    <input
                      type="text"
                                className="form-input"
                                value={container.cpuRequest}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].cpuRequest = e.target.value
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                              />
                              <input
                                type="text"
                                className="form-input"
                                value={container.memoryRequest}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].memoryRequest = e.target.value
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                              />
                              <input
                                type="text"
                                className="form-input"
                                placeholder={t('k8s.ephemeralStorageExample')}
                                value={container.ephemeralStorageRequest}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].ephemeralStorageRequest = e.target.value
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                    />
                  </div>
                  </div>

                  <div className="form-group">
                            <label>{t('k8s.containerStartup')}</label>
                            <div className="checkbox-group">
                              <label>
                    <input
                                  type="checkbox"
                                  checked={container.stdin}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].stdin = e.target.checked
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                />
                                stdin
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={container.tty}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].tty = e.target.checked
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                />
                                tty
                              </label>
                  </div>
              </div>

                  <div className="form-group">
                            <label>
                    <input
                                type="checkbox"
                                checked={container.privileged}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].privileged = e.target.checked
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                              />
                              {t('k8s.privilegedContainer')}
                            </label>
                  </div>

                  <div className="form-group">
                            <label>
                    <input
                                type="checkbox"
                                checked={container.initContainer}
                                onChange={(e) => {
                                  const newContainers = [...createDeploymentData.containers]
                                  newContainers[index].initContainer = e.target.checked
                                  setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                }}
                              />
                              {t('k8s.initContainer')}
                            </label>
                  </div>

                          <div className="form-group">
                            <label>{t('k8s.ports')}</label>
                  <button
                    type="button"
                              className="btn-text btn-add"
                    onClick={() => {
                                const newContainers = [...createDeploymentData.containers]
                                newContainers[index].ports.push({ name: '', containerPort: '', protocol: 'TCP' })
                                setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                    }}
                  >
                              {t('common.add')}
                  </button>
                            {container.ports.map((port, portIndex) => (
                              <div key={portIndex} className="port-item">
                                <input
                                  type="text"
                                  placeholder={t('k8s.portName')}
                                  value={port.name}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].ports[portIndex].name = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                  className="label-input"
                                />
                                <input
                                  type="number"
                                  placeholder={t('k8s.containerPort')}
                                  value={port.containerPort}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].ports[portIndex].containerPort = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                  className="label-input"
                                />
                                <select
                                  value={port.protocol}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].ports[portIndex].protocol = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                  className="label-input"
                                >
                                  <option value="TCP">TCP</option>
                                  <option value="UDP">UDP</option>
                                </select>
                  <button
                                  className="btn-text btn-delete"
                                  onClick={() => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].ports.splice(portIndex, 1)
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                >
                                  {t('common.delete')}
                  </button>
                </div>
                            ))}
              </div>

                          <div className="form-group">
                            <label>{t('k8s.envVars')}</label>
                  <button
                              type="button"
                              className="btn-text btn-add"
                    onClick={() => {
                                const newContainers = [...createDeploymentData.containers]
                                newContainers[index].envVars.push({ name: '', value: '' })
                                setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                              }}
                            >
                              {t('common.add')}
                            </button>
                            {container.envVars.map((env, envIndex) => (
                              <div key={envIndex} className="label-item">
                                <input
                                  type="text"
                                  placeholder={t('k8s.variableName')}
                                  value={env.name}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].envVars[envIndex].name = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                  className="label-input"
                                />
                                <input
                                  type="text"
                                  placeholder={t('k8s.variableValue')}
                                  value={env.value}
                                  onChange={(e) => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].envVars[envIndex].value = e.target.value
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                  className="label-input"
                                />
                                <button
                                  className="btn-text btn-delete"
                                  onClick={() => {
                                    const newContainers = [...createDeploymentData.containers]
                                    newContainers[index].envVars.splice(envIndex, 1)
                                    setCreateDeploymentData({ ...createDeploymentData, containers: newContainers })
                                  }}
                                >
                                  {t('common.delete')}
                  </button>
                </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 步骤3: 高级配置 */}
                  {createDeploymentStep === 3 && (
                    <div className="create-deployment-step">
                  <div className="form-group">
                        <label>
                    <input
                            type="checkbox"
                            checked={createDeploymentData.hpaEnabled}
                            onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, hpaEnabled: e.target.checked })}
                          />
                          {t('k8s.hpaEnabled')}
                        </label>
                  </div>

                  <div className="form-group">
                        <label>
                    <input
                            type="checkbox"
                            checked={createDeploymentData.cronHpaEnabled}
                            onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, cronHpaEnabled: e.target.checked })}
                          />
                          {t('k8s.cronHpaEnabled')}
                        </label>
                  </div>

                  <div className="form-group">
                        <label>
                    <input
                            type="checkbox"
                            checked={createDeploymentData.upgradeStrategy}
                            onChange={(e) => setCreateDeploymentData({ ...createDeploymentData, upgradeStrategy: e.target.checked })}
                          />
                          {t('k8s.upgradeStrategy')}
                        </label>
                  </div>

                  <div className="form-group">
                        <label>{t('k8s.podLabels')}</label>
                        <button
                          type="button"
                          className="btn-text btn-add"
                          onClick={() => {
                            const newPodLabels = { ...createDeploymentData.podLabels, '': '' }
                            setCreateDeploymentData({ ...createDeploymentData, podLabels: newPodLabels })
                          }}
                        >
                          {t('common.add')}
                        </button>
                        {Object.entries(createDeploymentData.podLabels).map(([key, value]) => (
                          <div key={key} className="label-item">
                    <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                                const newPodLabels = { ...createDeploymentData.podLabels }
                                delete newPodLabels[key]
                                newPodLabels[e.target.value] = value
                                setCreateDeploymentData({ ...createDeploymentData, podLabels: newPodLabels })
                              }}
                              placeholder={t('k8s.name')}
                              className="label-input"
                            />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                                setCreateDeploymentData({
                                  ...createDeploymentData,
                                  podLabels: { ...createDeploymentData.podLabels, [key]: e.target.value }
                              })
                            }}
                            placeholder={t('k8s.value')}
                              className="label-input"
                          />
                          <button
                              className="btn-text btn-delete"
                            onClick={() => {
                                const newPodLabels = { ...createDeploymentData.podLabels }
                                delete newPodLabels[key]
                                setCreateDeploymentData({ ...createDeploymentData, podLabels: newPodLabels })
                              }}
                            >
                              {t('common.delete')}
                          </button>
                  </div>
                      ))}
                </div>
                  </div>
                  )}

                  {/* 步骤4: 创建完成 */}
                  {createDeploymentStep === 4 && (
                    <div className="create-deployment-step success-step">
                      <div className="success-icon">✓</div>
                      <h3>{t('k8s.createDeploymentSuccess')}</h3>
                      <p>{t('k8s.deploymentCreatedMessage')}</p>
                </div>
                  )}
                </div>

                <div className="modal-actions">
                  {createDeploymentStep < 4 && (
                    <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                          if (createDeploymentStep > 1) {
                            setCreateDeploymentStep(createDeploymentStep - 1)
                          } else {
                            setShowCreateDeploymentModal(false)
                            setCreateDeploymentStep(1)
                          }
                        }}
                      >
                        {createDeploymentStep > 1 ? t('common.previous') : t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                        onClick={() => {
                          if (createDeploymentStep === 1) {
                            if (!createDeploymentData.name || !createDeploymentData.namespace) {
                              setError(t('k8s.nameAndNamespaceRequired'))
                              return
                            }
                            setCreateDeploymentStep(2)
                          } else if (createDeploymentStep === 2) {
                            if (createDeploymentData.containers.some(c => !c.image)) {
                              setError(t('k8s.imageRequired'))
                              return
                            }
                            setCreateDeploymentStep(3)
                          } else if (createDeploymentStep === 3) {
                            // 先设置步骤4，然后调用创建函数
                            setCreateDeploymentStep(4)
                            handleCreateDeployment()
                      }
                    }}
                    disabled={loading}
                  >
                        {createDeploymentStep === 3 ? t('k8s.create') : t('common.next')}
                  </button>
                    </>
                  )}
                  {createDeploymentStep === 4 && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setShowCreateDeploymentModal(false)
                        setCreateDeploymentStep(1)
                      }}
                    >
                      {t('common.close')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default K8sClusterDetail
