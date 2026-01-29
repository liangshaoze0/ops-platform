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
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [activeSubtab, setActiveSubtab] = useState(subtabFromUrl)
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
  const [selectedStatefulSet, setSelectedStatefulSet] = useState(null)
  const [statefulSetDetail, setStatefulSetDetail] = useState(null)
  const [statefulSetPods, setStatefulSetPods] = useState([])
  const [statefulSetDetailTab, setStatefulSetDetailTab] = useState('pods')
  const [statefulSetCostInfo, setStatefulSetCostInfo] = useState(null)
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
  const [servicesPage, setServicesPage] = useState(1)
  const [servicesPageSize, setServicesPageSize] = useState(20)
  const [servicesTotal, setServicesTotal] = useState(0)
  const [configMapsPage, setConfigMapsPage] = useState(1)
  const [configMapsPageSize, setConfigMapsPageSize] = useState(20)
  const [configMapsTotal, setConfigMapsTotal] = useState(0)
  const [secretsPage, setSecretsPage] = useState(1)
  const [secretsPageSize, setSecretsPageSize] = useState(20)
  const [secretsTotal, setSecretsTotal] = useState(0)
  const [pvcsPage, setPvcsPage] = useState(1)
  const [pvcsPageSize, setPvcsPageSize] = useState(20)
  const [pvcsTotal, setPvcsTotal] = useState(0)

  // 命名空间搜索和选择状态
  const [namespaceSearchTerm, setNamespaceSearchTerm] = useState('')
  const [namespaceSearchType, setNamespaceSearchType] = useState('name')
  const [selectedNamespaces, setSelectedNamespaces] = useState([])
  const [showCreateNamespaceModal, setShowCreateNamespaceModal] = useState(false)
  const [showEditNamespaceModal, setShowEditNamespaceModal] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [editingNamespace, setEditingNamespace] = useState(null)
  
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
  }, [searchParams])
  
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
      // 如果切换到工作负载或网络页面，先获取命名空间列表
      if ((activeTab === 'workloads' || activeTab === 'network') && namespaces.length === 0) {
        fetchNamespaces()
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
        // 如果命名空间列表为空，先获取命名空间列表
        if (namespaces.length === 0) {
          fetchNamespaces()
        }
        fetchServices(selectedNetworkNamespace || '')
      } else if (activeTab === 'config') {
        fetchConfigMaps()
        fetchSecrets()
      } else if (activeTab === 'storage') {
        fetchPVCs()
      } else if (activeTab === 'security') {
        // 安全管理相关数据获取可以根据需要添加
      }
    }
  }, [id, activeTab, searchParams, selectedNetworkNamespace])

  useEffect(() => {
    if (selectedNamespace) {
      fetchPods(selectedNamespace)
    }
  }, [selectedNamespace, id])

  // 当工作负载命名空间或类型变化时，重新获取数据
  useEffect(() => {
    if (activeTab === 'workloads' && id) {
      const type = searchParams.get('type') || 'deployments'
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
    }
  }, [selectedWorkloadNamespace, workloadType, id, activeTab, searchParams])
  
  // 使用ref来跟踪是否正在加载，避免重复加载
  const isLoadingDeploymentRef = useRef(false)
  // 使用ref跟踪已加载的deployment，避免重复加载
  const loadedDeploymentRef = useRef(null)
  
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

  const fetchWorkloads = async (namespace = '') => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/pods`, {
        params: {
          namespace: namespace || undefined,
          page: workloadsPage,
          page_size: workloadsPageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setWorkloads(data.data)
        setWorkloadsTotal(data.total || 0)
      } else {
        setWorkloads(Array.isArray(data) ? data : [])
        setWorkloadsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取工作负载失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchWorkloadsFailed'))
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
      if (data.data) {
        setDaemonSets(data.data)
        setWorkloadsTotal(data.total || 0)
      } else {
        setDaemonSets(Array.isArray(data) ? data : [])
        setWorkloadsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取DaemonSet列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchDaemonSetsFailed'))
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
      if (data.data) {
        setJobs(data.data)
        setWorkloadsTotal(data.total || 0)
      } else {
        setJobs(Array.isArray(data) ? data : [])
        setWorkloadsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取Job列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchJobsFailed'))
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
      if (data.data) {
        setCronJobs(data.data)
        setWorkloadsTotal(data.total || 0)
      } else {
        setCronJobs(Array.isArray(data) ? data : [])
        setWorkloadsTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取CronJob列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchCronJobsFailed'))
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
      if (namespace) {
        params.namespace = namespace
      }
      const response = await api.get(`/k8s/clusters/${id}/services`, {
        params,
      })
      const data = response.data.data || response.data
      if (data.data) {
        setServices(data.data)
        setServicesTotal(data.total || 0)
      } else {
        setServices(Array.isArray(data) ? data : [])
        setServicesTotal(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取服务列表失败:', err)
      setError(err.response?.data?.message || t('k8s.fetchServicesFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchConfigMaps = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/configmaps`, {
        params: {
          page: configMapsPage,
          page_size: configMapsPageSize,
        },
      })
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

  const fetchSecrets = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/secrets`, {
        params: {
          page: secretsPage,
          page_size: secretsPageSize,
        },
      })
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

  const fetchPVCs = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/k8s/clusters/${id}/pvcs`, {
        params: {
          page: pvcsPage,
          page_size: pvcsPageSize,
        },
      })
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
    setIsDeploymentFromUrl(false) // 从列表点击，不是从URL恢复
    
    // 更新URL参数，保存deployment信息
    const newParams = new URLSearchParams(searchParams)
    newParams.set('deployment', deployment.name)
    newParams.set('deploymentNamespace', deployment.namespace)
    setSearchParams(newParams, { replace: true })
    
    setSelectedDeployment(deployment)
    
    // 更新ref，标记为已加载
    const deploymentKey = `${deployment.namespace}/${deployment.name}`
    loadedDeploymentRef.current = deploymentKey
    
    // 使用内部函数加载详情
    await loadDeploymentDetail(deployment)
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
    // 如果是从URL恢复的状态（刷新后），不允许返回
    if (isDeploymentFromUrl) {
      return
    }
    
    setSelectedDeployment(null)
    setDeploymentDetail(null)
    setDeploymentPods([])
    setDeploymentCostInfo(null)
    setDeploymentDetailTab('pods')
    setIsDeploymentFromUrl(false)
    setHpaList([])
    setCronHpaList([])
    
    // 清除URL参数
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('deployment')
    newParams.delete('deploymentNamespace')
    setSearchParams(newParams, { replace: true })
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

  // StatefulSet相关处理函数
  const handleStatefulSetClick = async (statefulSet) => {
    try {
      setLoading(true)
      setError('')
      setSelectedStatefulSet(statefulSet)
      
      // 获取StatefulSet详情
      const detailResponse = await api.get(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}`)
      if (detailResponse.data && detailResponse.data.data) {
        setStatefulSetDetail(detailResponse.data.data)
      } else {
        throw new Error('获取StatefulSet详情失败：响应数据格式错误')
      }
      
      // 获取关联的Pods
      try {
        const podsResponse = await api.get(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}/pods`)
        console.log('StatefulSet Pods API响应:', podsResponse)
        
        let podsData = []
        if (podsResponse.data) {
          if (podsResponse.data.data && Array.isArray(podsResponse.data.data)) {
            podsData = podsResponse.data.data
          } else if (Array.isArray(podsResponse.data)) {
            podsData = podsResponse.data
          } else if (podsResponse.data.data && Array.isArray(podsResponse.data.data)) {
            podsData = podsResponse.data.data
          }
        }
        
        setStatefulSetPods(podsData)
        if (podsData.length === 0) {
          setError('')
          console.warn('StatefulSet没有关联的Pods')
        }
      } catch (podsErr) {
        console.error('获取StatefulSet Pods失败:', podsErr)
        setStatefulSetPods([])
        if (podsErr.response?.status !== 404) {
          setError(podsErr.response?.data?.message || podsErr.message || '获取Pod列表失败，但StatefulSet详情已加载')
        } else {
          setError('')
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
        console.warn('获取StatefulSet成本信息失败:', costErr)
        setStatefulSetCostInfo(null)
      }
      
    } catch (err) {
      console.error('获取StatefulSet详情失败:', err)
      setError(err.response?.data?.message || err.message || t('k8s.fetchDetailFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleBackFromStatefulSetDetail = () => {
    setSelectedStatefulSet(null)
    setStatefulSetDetail(null)
    setStatefulSetPods([])
    setStatefulSetCostInfo(null)
    setStatefulSetDetailTab('pods')
  }

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

  const handleRedeployStatefulSet = async (statefulSet) => {
    if (!window.confirm(t('k8s.confirmRedeploy'))) {
      return
    }
    try {
      setLoading(true)
      await api.post(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}/redeploy`)
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

  const handleViewStatefulSetLogs = async (statefulSet) => {
    await handleStatefulSetClick(statefulSet)
    setStatefulSetDetailTab('logs')
  }

  const handleDeleteStatefulSet = async (statefulSet) => {
    if (!window.confirm(t('k8s.confirmDeleteStatefulSet'))) {
      return
    }
    try {
      setLoading(true)
      await api.delete(`/k8s/clusters/${id}/namespaces/${statefulSet.namespace}/statefulsets/${statefulSet.name}`)
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
              {loading ? (
                <div className="loading">{t('common.loading')}</div>
              ) : (
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
                                          <a 
                                            href="#" 
                                          className="namespace-link"
                                            onClick={(e) => {
                                              e.preventDefault()
                                            setSelectedNamespace(ns.name)
                                          }}
                                        >
                                          {ns.name}
                                        </a>
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
                                                <button onClick={() => {
                                                setSelectedNamespace(ns.name)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                {t('k8s.viewPods')}
                                                </button>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                                  if (window.confirm(t('k8s.confirmDeleteNamespace'))) {
                                                    // TODO: 实现删除命名空间
                                                  }
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
                </>
              )}
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
                    {loading ? t('common.loading') : t('common.save')}
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
                    {loading ? t('common.loading') : t('common.save')}
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
        </main>
      </div>
    </div>
  )
}

export default K8sClusterDetail
