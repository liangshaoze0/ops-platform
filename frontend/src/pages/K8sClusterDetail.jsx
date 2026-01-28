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
  }, [id, activeTab, searchParams, nodesPage, nodesPageSize, namespacesPage, namespacesPageSize, podsPage, podsPageSize, workloadsPage, workloadsPageSize, servicesPage, servicesPageSize, configMapsPage, configMapsPageSize, secretsPage, secretsPageSize, pvcsPage, pvcsPageSize, selectedNetworkNamespace])

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
      const response = await api.get(`/k8s/clusters/${id}/namespaces`, {
        params: {
          page: namespacesPage,
          page_size: namespacesPageSize,
        },
      })
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
                          onPageChange={setNodesPage}
                          onPageSizeChange={(newSize) => {
                            setNodesPageSize(newSize)
                            setNodesPage(1)
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
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{t('k8s.namespaceName')}</th>
                                <th>{t('k8s.status')}</th>
                                <th>{t('k8s.createdAt')}</th>
                                <th>{t('k8s.labels')}</th>
                                <th>{t('common.actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {namespaces.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="empty-state">
                                    {t('k8s.noNamespaces')}
                                  </td>
                                </tr>
                              ) : (
                                namespaces.map((ns) => (
                                  <tr key={ns.name}>
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
                                    <td>
                                      <span className={`status-badge ${ns.status === 'Active' ? 'status-connected' : 'status-unknown'}`}>
                                        {ns.status}
                                      </span>
                                    </td>
                                    <td>
                                      {new Date(ns.created_at).toLocaleString('zh-CN')}
                                    </td>
                                    <td>
                                      {ns.labels && Object.keys(ns.labels).length > 0
                                        ? Object.entries(ns.labels).map(([k, v]) => `${k}=${v}`).join(', ')
                                        : '-'}
                                    </td>
                                    <td>
                                      <button
                                        className="btn-text btn-view"
                                        onClick={() => setSelectedNamespace(ns.name)}
                                        title={t('k8s.viewPods')}
                                      >
                                        {t('k8s.viewPods')}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {!loading && !selectedNamespace && namespaces.length > 0 && (
                        <Pagination
                          currentPage={namespacesPage}
                          totalPages={Math.ceil(namespacesTotal / namespacesPageSize)}
                          totalItems={namespacesTotal}
                          pageSize={namespacesPageSize}
                          onPageChange={setNamespacesPage}
                          onPageSizeChange={(newSize) => {
                            setNamespacesPageSize(newSize)
                            setNamespacesPage(1)
                          }}
                        />
                      )}
                      {!loading && selectedNamespace && pods.length > 0 && (
                        <Pagination
                          currentPage={podsPage}
                          totalPages={Math.ceil(podsTotal / podsPageSize)}
                          totalItems={podsTotal}
                          pageSize={podsPageSize}
                          onPageChange={setPodsPage}
                          onPageSizeChange={(newSize) => {
                            setPodsPageSize(newSize)
                            setPodsPage(1)
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'workloads' && (
                    <div className="workloads-section">
                      {selectedDeployment ? (
                        // Deployment详情视图（即使deploymentDetail还未加载，也显示标题）
                        <div className="deployment-detail-view">
                          {/* 返回按钮和标题 */}
                          <div className="page-title-bar">
                            <div>
                              {!isDeploymentFromUrl && (
                                <button
                                  className="btn-back"
                                  onClick={handleBackFromDeploymentDetail}
                                >
                                  ← {selectedDeployment.name}
                                </button>
                              )}
                              {isDeploymentFromUrl && (
                                <h2 style={{ margin: 0 }}>{selectedDeployment.name || 'Loading...'}</h2>
                              )}
                            </div>
                            <div>
                          {deploymentDetail && (
                            <>
                          <button
                            className="btn-primary"
                            onClick={() => {
                                  setEditingDeployment(selectedDeployment)
                                  setEditDeploymentData({
                                    replicas: deploymentDetail?.replicas || 1,
                                    image: deploymentDetail?.image || deploymentDetail?.images?.[0] || '',
                                    labels: deploymentDetail?.labels || {},
                                    annotations: deploymentDetail?.annotations || {}
                                  })
                                  setShowEditDeploymentModal(true)
                                }}
                              >
                                {t('common.edit')}
                          </button>
                          <button
                                className="btn-primary"
                            onClick={() => {
                                  setScalingDeployment(selectedDeployment)
                                  setScaleReplicas(deploymentDetail?.replicas || 1)
                                  setShowScaleDeploymentModal(true)
                            }}
                          >
                                {t('k8s.scale')}
                          </button>
                              <button className="btn-secondary">YAML {t('common.edit')}</button>
                              <button className="btn-secondary">{t('common.more')} ▼</button>
                            </>
                          )}
                        </div>
                          </div>

                          {/* 加载中或基本信息 */}
                          {loading && !deploymentDetail ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                              <div className="loading">{t('common.loading')}</div>
                            </div>
                          ) : deploymentDetail ? (
                          <div className="info-section">
                            <div className="info-grid basic-info-two-columns">
                              <div className="info-card">
                                <h3>{t('k8s.basicInfo')}</h3>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.name')}:</span>
                                  <span className="info-value">{deploymentDetail?.name || selectedDeployment?.name || '-'}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.namespace')}:</span>
                                  <span className="info-value">{deploymentDetail?.namespace || selectedDeployment?.namespace || '-'}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.selector')}:</span>
                                  <span className="info-value">
                                    {deploymentDetail?.selector && Object.keys(deploymentDetail.selector).length > 0
                                      ? Object.entries(deploymentDetail.selector).map(([k, v]) => `${k}:${v}`).join(', ')
                                      : '-'}
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.annotations')}:</span>
                                  <span className="info-value">
                                    {deploymentDetail?.annotations && Object.keys(deploymentDetail.annotations).length > 0
                                      ? Object.entries(deploymentDetail.annotations).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ')
                                      : '-'}
                                    {deploymentDetail?.annotations && Object.keys(deploymentDetail.annotations).length > 3 && (
                                      <button className="btn-text" style={{ marginLeft: '8px' }}>{t('k8s.showAll')}</button>
                                    )}
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.createdAt')}:</span>
                                  <span className="info-value">
                                    {deploymentDetail?.created_at 
                                      ? new Date(deploymentDetail.created_at).toLocaleString('zh-CN')
                                      : selectedDeployment?.created_at
                                      ? new Date(selectedDeployment.created_at).toLocaleString('zh-CN')
                                      : '-'}
                                  </span>
                                </div>
                              </div>
                              <div className="info-card">
                                <h3>{t('k8s.configuration')}</h3>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.strategy')}:</span>
                                  <span className="info-value">{deploymentDetail.strategy || 'RollingUpdate'}</span>
                                </div>
                                {deploymentDetail.strategy === 'RollingUpdate' && (
                                  <>
                                    <div className="info-item">
                                      <span className="info-label">{t('k8s.maxSurge')}:</span>
                                      <span className="info-value">{deploymentDetail.maxSurge || '25%'}</span>
                                    </div>
                                    <div className="info-item">
                                      <span className="info-label">{t('k8s.maxUnavailable')}:</span>
                                      <span className="info-value">{deploymentDetail.maxUnavailable || '25%'}</span>
                                    </div>
                                  </>
                                )}
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.labels')}:</span>
                                  <span className="info-value">
                                    {deploymentDetail.labels && Object.keys(deploymentDetail.labels).length > 0
                                      ? Object.entries(deploymentDetail.labels).slice(0, 3).map(([k, v]) => (
                                          <span key={k} className="label-tag" style={{ marginRight: '4px' }}>{k}={v}</span>
                                        ))
                                      : '-'}
                                    {deploymentDetail.labels && Object.keys(deploymentDetail.labels).length > 3 && (
                                      <button className="btn-text" style={{ marginLeft: '8px' }}>{t('k8s.showAll')}</button>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          ) : null}

                          {/* 状态信息 */}
                          {deploymentDetail && (
                          <div className="status-summary" style={{ marginTop: '20px', marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <span>
                              {t('k8s.ready')}: {deploymentDetail.readyReplicas || 0}/{deploymentDetail.replicas || 0}{t('k8s.unit')}, 
                              {t('k8s.updated')}: {deploymentDetail.updated || 0}{t('k8s.unit')}, 
                              {t('k8s.available')}: {deploymentDetail.available || 0}{t('k8s.unit')}
                            </span>
                            <button className="btn-text" style={{ marginLeft: '12px' }}>{t('k8s.expandStatus')} ▼</button>
                          </div>
                          )}

                          {/* 标签页 */}
                          {deploymentDetail && (
                          <>
                          <div className="deployment-detail-tabs">
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'pods' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('pods')}
                            >
                              {t('k8s.pods')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'access' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('access')}
                            >
                              {t('k8s.accessMethod')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'events' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('events')}
                            >
                              {t('k8s.events')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'scale' ? 'active' : ''}`}
                              onClick={() => {
                                setDeploymentDetailTab('scale')
                                // 切换到容器伸缩标签页时，加载HPA和CronHPA数据
                                if (selectedDeployment) {
                                  fetchHpaList(selectedDeployment)
                                  checkCronHpaInstalled()
                                  fetchCronHpaList(selectedDeployment)
                                }
                              }}
                            >
                              {t('k8s.containerScaling')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'history' ? 'active' : ''}`}
                              onClick={() => {
                                setDeploymentDetailTab('history')
                                // 切换到历史版本标签页时，加载历史版本数据
                                if (selectedDeployment) {
                                  fetchDeploymentHistoryVersions(selectedDeployment)
                                }
                              }}
                            >
                              {t('k8s.historyVersions')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'logs' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('logs')}
                            >
                              {t('k8s.logs')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'monitoring' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('monitoring')}
                            >
                              {t('k8s.monitoring')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${deploymentDetailTab === 'cost' ? 'active' : ''}`}
                              onClick={() => setDeploymentDetailTab('cost')}
                            >
                              {t('k8s.costInsights')}
                            </button>
                          </div>

                          {/* 标签页内容 */}
                          <div className="deployment-detail-content">
                            {deploymentDetailTab === 'pods' && (
                              <div className="table-wrapper">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>{t('k8s.name')}</th>
                                      <th>{t('k8s.image')}</th>
                                      <th>{t('k8s.status')}</th>
                                      <th>{t('k8s.monitoring')}</th>
                                      <th>{t('k8s.restarts')}</th>
                                      <th>{t('k8s.podIP')}</th>
                                      <th>{t('k8s.node')}</th>
                                      <th>{t('k8s.createdAt')}</th>
                                      <th>{t('common.actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {deploymentPods.length === 0 ? (
                                      <tr>
                                        <td colSpan="9" className="empty-state">
                                          {t('k8s.noPods')}
                                        </td>
                                      </tr>
                                    ) : (
                                      deploymentPods.map((pod, index) => {
                                        // 确保字段正确映射（后端返回的字段名）
                                        // 后端返回的字段是 "name"，确保正确读取
                                        const podName = pod.name || pod.metadata?.name || pod.Name || '-'
                                        const podImages = Array.isArray(pod.images) ? pod.images : (pod.image ? [pod.image] : [])
                                        const podStatus = pod.status || 'Unknown'
                                        const podRestarts = pod.restarts || 0
                                        const podIP = pod.podIP || '-'
                                        const podNode = pod.node || ''
                                        const podNodeIP = pod.nodeIP || ''
                                        const podCreatedAt = pod.created_at
                                        
                                        // 调试日志（仅第一个Pod）
                                        if (index === 0) {
                                          console.log('=== Pod数据映射检查 ===')
                                          console.log('原始Pod数据:', pod)
                                          console.log('Pod所有字段:', Object.keys(pod))
                                          console.log('pod.name值:', pod.name)
                                          console.log('pod.metadata:', pod.metadata)
                                          console.log('映射后的字段:', {
                                            name: podName,
                                            images: podImages,
                                            status: podStatus,
                                            restarts: podRestarts,
                                            podIP: podIP,
                                            node: podNode,
                                            nodeIP: podNodeIP,
                                            created_at: podCreatedAt
                                          })
                                        }
                                        
                                        // 如果podName仍然是'-'，尝试从其他字段获取
                                        if (podName === '-' && pod) {
                                          console.warn(`Pod ${index} 名称获取失败，尝试其他字段:`, {
                                            'pod.name': pod.name,
                                            'pod.metadata?.name': pod.metadata?.name,
                                            'pod.Name': pod.Name,
                                            '所有字段': Object.keys(pod)
                                          })
                                        }
                                        
                                        // 最终确定Pod名称（确保有值）
                                        const finalPodName = podName !== '-' ? podName : (pod.name || pod.metadata?.name || pod.Name || `Pod-${index}`)
                                        
                                        return (
                                          <tr key={`${pod.namespace || 'default'}-${finalPodName}-${index}`}>
                                            {/* 名称 */}
                                            <td>
                                              <span title={finalPodName}>
                                                {finalPodName}
                                              </span>
                                            </td>
                                            {/* 镜像 */}
                                            <td className="image-cell">
                                              <div className="image-content">
                                                {(() => {
                                                  const image = podImages.length > 0 ? podImages[0] : '-'
                                                  if (image === '-') return <div>-</div>
                                                  const lastSlashIndex = image.lastIndexOf('/')
                                                  if (lastSlashIndex > 0 && lastSlashIndex < image.length - 1) {
                                                    return (
                                                      <>
                                                        <div>{image.substring(0, lastSlashIndex + 1)}</div>
                                                        <div>{image.substring(lastSlashIndex + 1)}</div>
                                                      </>
                                                    )
                                                  }
                                                  return <div>{image}</div>
                                                })()}
                                              </div>
                                            </td>
                                            {/* 状态 */}
                                            <td>
                                              <span className={`status-badge ${getPodStatusClass(podStatus)}`}>
                                                {podStatus}
                                              </span>
                                            </td>
                                            {/* 监控 */}
                                            <td>
                                              <span style={{ cursor: 'pointer' }} title={t('k8s.monitoring')}>📊</span>
                                            </td>
                                            {/* 重启次数 */}
                                            <td>{podRestarts}</td>
                                            {/* POD IP */}
                                            <td>{podIP}</td>
                                            {/* 节点 */}
                                            <td>
                                              {podNode ? (
                                                <div>
                                                  <div>{podNode}</div>
                                                  {podNodeIP && (
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{podNodeIP}</div>
                                                  )}
                                                </div>
                                              ) : '-'}
                                            </td>
                                            {/* 创建时间 */}
                                            <td>
                                              {podCreatedAt 
                                                ? new Date(podCreatedAt).toLocaleString('zh-CN', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                  })
                                                : '-'}
                                            </td>
                                            {/* 操作 */}
                                            <td>
                                              <div className="action-buttons">
                                <button
                                                  className="btn-text btn-edit"
                                                  onClick={() => {
                                                    const podForEdit = { ...pod, namespace: pod.namespace || selectedDeployment?.namespace || deploymentDetail?.namespace }
                                                    handleEditYaml(podForEdit)
                                                  }}
                                                  title={`YAML ${t('common.edit')}`}
                                                >
                                                  YAML {t('common.edit')}
                                </button>
                                                <button 
                                                  className="btn-text"
                                                  onClick={() => {
                                                    const podForLogs = { ...pod, namespace: pod.namespace || selectedDeployment?.namespace || deploymentDetail?.namespace }
                                                    handleViewLogs(podForLogs)
                                                  }}
                                                  title={t('k8s.terminal')}
                                                >
                                                  {t('k8s.terminal')}
                                                </button>
                                                <button className="btn-text btn-more" title={t('common.more')}>
                                                  {t('common.more')} ▼
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                      })
                                    )}
                                  </tbody>
                                </table>
                            </div>
                            )}
                            {deploymentDetailTab === 'cost' && (
                              <div className="cost-insights-section">
                                {deploymentCostInfo ? (
                                  <div className="info-grid">
                                    <div className="info-card">
                                      <h3>{t('k8s.costOverview')}</h3>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.totalCost')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.totalCost ? `¥${deploymentCostInfo.totalCost.toFixed(2)}` : '-'}
                                        </span>
                          </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.cpuCost')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.cpuCost ? `¥${deploymentCostInfo.cpuCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.memoryCost')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.memoryCost ? `¥${deploymentCostInfo.memoryCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.storageCost')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.storageCost ? `¥${deploymentCostInfo.storageCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.networkCost')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.networkCost ? `¥${deploymentCostInfo.networkCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="info-card">
                                      <h3>{t('k8s.resourceUsage')}</h3>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.cpuUsage')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.cpuUsage ? `${deploymentCostInfo.cpuUsage} cores` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.memoryUsage')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.memoryUsage ? `${deploymentCostInfo.memoryUsage} Gi` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.storageUsage')}:</span>
                                        <span className="info-value">
                                          {deploymentCostInfo.storageUsage ? `${deploymentCostInfo.storageUsage} Gi` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.replicas')}:</span>
                                        <span className="info-value">
                                          {deploymentDetail?.replicas || 0}
                                        </span>
                                      </div>
                                    </div>
                                    {deploymentCostInfo.costBreakdown && (
                                      <div className="info-card">
                                        <h3>{t('k8s.costBreakdown')}</h3>
                                        <div className="info-item">
                                          <span className="info-label">{t('k8s.dailyCost')}:</span>
                                          <span className="info-value">
                                            {deploymentCostInfo.costBreakdown.daily ? `¥${deploymentCostInfo.costBreakdown.daily.toFixed(2)}` : '-'}
                                          </span>
                                        </div>
                                        <div className="info-item">
                                          <span className="info-label">{t('k8s.monthlyCost')}:</span>
                                          <span className="info-value">
                                            {deploymentCostInfo.costBreakdown.monthly ? `¥${deploymentCostInfo.costBreakdown.monthly.toFixed(2)}` : '-'}
                                          </span>
                                        </div>
                                        <div className="info-item">
                                          <span className="info-label">{t('k8s.yearlyCost')}:</span>
                                          <span className="info-value">
                                            {deploymentCostInfo.costBreakdown.yearly ? `¥${deploymentCostInfo.costBreakdown.yearly.toFixed(2)}` : '-'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                    {t('k8s.costInfoNotAvailable')}
                                  </div>
                                )}
                              </div>
                            )}
                            {deploymentDetailTab === 'scale' && (
                              <div className="container-scaling-section">
                                {/* 指标伸缩 (HPA) */}
                                <div style={{ marginBottom: '32px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0 }}>指标伸缩 (HPA)</h3>
                                    <a 
                                      href="#" 
                                      onClick={(e) => {
                                        e.preventDefault()
                                        setShowCreateHpaModal(true)
                                      }}
                                      style={{ color: '#667eea', textDecoration: 'none', cursor: 'pointer' }}
                                    >
                                      创建
                                    </a>
                                  </div>
                                  <div className="table-wrapper">
                                    <table className="data-table">
                                      <thead>
                                        <tr>
                                          <th>名称</th>
                                          <th>目标使用率</th>
                                          <th>当前使用率</th>
                                          <th>最小副本数</th>
                                          <th>最大副本数</th>
                                          <th>当前副本数</th>
                                          <th>创建时间</th>
                                          <th>操作</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {hpaList.length === 0 ? (
                                          <tr>
                                            <td colSpan="8" className="empty-state">
                                              没有数据
                                            </td>
                                          </tr>
                                        ) : (
                                          hpaList.map((hpa) => (
                                            <tr key={hpa.name}>
                                              <td>{hpa.name}</td>
                                              <td>{hpa.targetUsage || '-'}%</td>
                                              <td>{hpa.currentUsage || '-'}%</td>
                                              <td>{hpa.minReplicas || '-'}</td>
                                              <td>{hpa.maxReplicas || '-'}</td>
                                              <td>{hpa.currentReplicas || '-'}</td>
                                              <td>{hpa.createdAt ? new Date(hpa.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                              <td>
                                                <div className="action-buttons">
                                                  <button className="btn-text btn-edit" onClick={() => {
                                                    setEditingHpa(hpa)
                                                    setShowCreateHpaModal(true)
                                                  }}>编辑</button>
                                                  <button className="btn-text danger" onClick={() => {
                                                    if (window.confirm(`确定要删除HPA ${hpa.name}吗？`)) {
                                                      handleDeleteHpa(hpa)
                                                    }
                                                  }}>删除</button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                        </div>
                      </div>

                                {/* 定时伸缩 (CronHPA) */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <h3 style={{ margin: 0 }}>定时伸缩 (CronHPA)</h3>
                                      {!cronHpaInstalled && (
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                          <span style={{ marginRight: '4px' }}>?</span>
                                          ack-kubernetes-cronhpa-controller 组件未安装, 
                                          <a 
                                            href="#" 
                                            onClick={(e) => {
                                              e.preventDefault()
                                              handleInstallCronHpa()
                                            }}
                                            style={{ color: '#667eea', textDecoration: 'none', cursor: 'pointer', marginLeft: '4px' }}
                                          >
                                            点击安装
                                          </a>
                                        </span>
                                      )}
                                    </div>
                                    {cronHpaInstalled && (
                                      <a 
                                        href="#" 
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setShowCreateCronHpaModal(true)
                                        }}
                                        style={{ color: '#667eea', textDecoration: 'none', cursor: 'pointer' }}
                                      >
                                        创建
                                      </a>
                                    )}
                                  </div>
                                  <div className="table-wrapper">
                                    <table className="data-table">
                                      <thead>
                                        <tr>
                                          <th>名称</th>
                                          <th>任务名称</th>
                                          <th>状态</th>
                                          <th>调度周期</th>
                                          <th>目标副本数</th>
                                          <th>最近调度</th>
                                          <th>创建时间</th>
                                          <th>操作</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cronHpaList.length === 0 ? (
                                          <tr>
                                            <td colSpan="8" className="empty-state">
                                              没有数据
                                            </td>
                                          </tr>
                                        ) : (
                                          cronHpaList.map((cronHpa) => (
                                            <tr key={cronHpa.name}>
                                              <td>{cronHpa.name}</td>
                                              <td>{cronHpa.taskName || '-'}</td>
                                              <td>
                                                <span className={`status-badge ${cronHpa.status === 'Active' ? 'status-connected' : 'status-unknown'}`}>
                                                  {cronHpa.status || '-'}
                                                </span>
                                              </td>
                                              <td>{cronHpa.schedule || '-'}</td>
                                              <td>{cronHpa.targetReplicas || '-'}</td>
                                              <td>{cronHpa.lastScheduled ? new Date(cronHpa.lastScheduled).toLocaleString('zh-CN') : '-'}</td>
                                              <td>{cronHpa.createdAt ? new Date(cronHpa.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                              <td>
                                                <div className="action-buttons">
                                                  <button className="btn-text btn-edit" onClick={() => {
                                                    setEditingCronHpa(cronHpa)
                                                    setShowCreateCronHpaModal(true)
                                                  }}>编辑</button>
                                                  <button className="btn-text danger" onClick={() => {
                                                    if (window.confirm(`确定要删除CronHPA ${cronHpa.name}吗？`)) {
                                                      handleDeleteCronHpa(cronHpa)
                                                    }
                                                  }}>删除</button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}
                            {deploymentDetailTab === 'history' && (
                              <div className="history-versions-section">
                                <div className="table-wrapper">
                                  <table className="data-table">
                                    <thead>
                                      <tr>
                                        <th>版本</th>
                                        <th>镜像</th>
                                        <th>创建时间</th>
                                        <th>操作</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {deploymentHistoryVersions.length === 0 ? (
                                        <tr>
                                          <td colSpan="4" className="empty-state">
                                            没有数据
                                          </td>
                                        </tr>
                                      ) : (
                                        deploymentHistoryVersions.map((version) => (
                                          <tr key={version.revision}>
                                            <td>{version.revision}</td>
                                            <td>{version.image || '-'}</td>
                                            <td>
                                              {version.createdAt 
                                                ? new Date(version.createdAt).toLocaleString('zh-CN', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                  })
                                                : '-'}
                                            </td>
                                            <td>
                                              <div className="action-buttons">
                                                <a
                                                  href="#"
                                                  onClick={(e) => {
                                                    e.preventDefault()
                                                    handleViewVersionDetail(version.revision)
                                                  }}
                                                  style={{ color: '#667eea', textDecoration: 'none', marginRight: '16px' }}
                                                >
                                                  详情
                                                </a>
                                                <a
                                                  href="#"
                                                  onClick={(e) => {
                                                    e.preventDefault()
                                                    handleRollbackDeployment(version.revision)
                                                  }}
                                                  style={{ color: '#667eea', textDecoration: 'none' }}
                                                >
                                                  回滚到该版本
                                                </a>
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
                            {deploymentDetailTab !== 'pods' && deploymentDetailTab !== 'cost' && deploymentDetailTab !== 'scale' && deploymentDetailTab !== 'history' && (
                              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                {t('k8s.featureComingSoon')}
                              </div>
                            )}
                          </div>
                          </>
                          )}
                        </div>
                      ) : selectedStatefulSet && statefulSetDetail ? (
                        // StatefulSet详情视图
                        <div className="deployment-detail-view">
                          {/* 返回按钮和标题 */}
                          <div className="page-title-bar">
                            <div>
                              <button
                                className="btn-back"
                                onClick={handleBackFromStatefulSetDetail}
                              >
                                ← {selectedStatefulSet.name}
                              </button>
                            </div>
                            <div>
                              <button 
                                className="btn-primary"
                                onClick={() => {
                                  setEditingStatefulSet(selectedStatefulSet)
                                  setEditStatefulSetData({
                                    replicas: statefulSetDetail?.replicas || 1,
                                    image: statefulSetDetail?.image || statefulSetDetail?.images?.[0] || '',
                                    labels: statefulSetDetail?.labels || {},
                                    annotations: statefulSetDetail?.annotations || {}
                                  })
                                  setShowEditStatefulSetModal(true)
                                }}
                              >
                                {t('common.edit')}
                              </button>
                              <button 
                                className="btn-primary"
                                onClick={() => {
                                  setScalingStatefulSet(selectedStatefulSet)
                                  setScaleStatefulSetReplicas(statefulSetDetail?.replicas || 1)
                                  setShowScaleStatefulSetModal(true)
                                }}
                              >
                                {t('k8s.scale')}
                              </button>
                              <button 
                                className="btn-secondary"
                                onClick={() => {
                                  handleEditStatefulSetYaml(selectedStatefulSet)
                                }}
                              >
                                YAML {t('common.edit')}
                              </button>
                              <div className="action-dropdown">
                                <button 
                                  className="btn-secondary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                      if (menu !== e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')) {
                                        menu.classList.remove('show')
                                      }
                                    })
                                    const dropdown = e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')
                                    if (dropdown) {
                                      dropdown.classList.toggle('show')
                                    }
                                  }}
                                >
                                  {t('common.more')} ▼
                                </button>
                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => {
                                    setShowMonitoringModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.monitoring')}
                                  </button>
                                  <button onClick={() => {
                                    setShowOptimizationModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
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
                                    setShowNodeAffinityModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.nodeAffinity')}
                                  </button>
                                  <button onClick={() => {
                                    setScalingStatefulSet(selectedStatefulSet)
                                    setScaleStatefulSetReplicas(statefulSetDetail?.replicas || 1)
                                    setShowScaleStatefulSetModal(true)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.elasticScaling')}
                                  </button>
                                  <button onClick={() => {
                                    setShowTolerationModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.schedulingToleration')}
                                  </button>
                                  <button onClick={() => {
                                    setShowResourceProfileModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.resourceProfile')}
                                  </button>
                                  <button onClick={() => {
                                    handleStatefulSetClick(selectedStatefulSet)
                                    setStatefulSetDetailTab('cost')
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.costInsights')}
                                  </button>
                                  <button onClick={() => {
                                    setShowUpgradeStrategyModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.upgradeStrategy')}
                                  </button>
                                  <button onClick={() => {
                                    setShowCloneModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.cloneCreate')}
                                  </button>
                                  <button onClick={() => {
                                    setShowRollbackModal(true)
                                    setSelectedStatefulSet(selectedStatefulSet)
                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                  }}>
                                    {t('k8s.rollback')}
                                  </button>
                                  <button onClick={() => {
                                    handleViewStatefulSetLogs(selectedStatefulSet)
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
                        </div>
                      </div>

                          {/* 基本信息 */}
                          <div className="info-section">
                            <div className="info-grid basic-info-two-columns">
                              <div className="info-card">
                                <h3>{t('k8s.basicInfo')}</h3>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.name')}:</span>
                                  <span className="info-value">{statefulSetDetail.name}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.namespace')}:</span>
                                  <span className="info-value">{statefulSetDetail.namespace}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.selector')}:</span>
                                  <span className="info-value">
                                    {statefulSetDetail.selector ? Object.entries(statefulSetDetail.selector).map(([k, v]) => `${k}:${v}`).join(', ') : '-'}
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.annotations')}:</span>
                                  <span className="info-value">
                                    {statefulSetDetail.annotations && Object.keys(statefulSetDetail.annotations).length > 0
                                      ? Object.entries(statefulSetDetail.annotations).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(', ')
                                      : '-'}
                                    {statefulSetDetail.annotations && Object.keys(statefulSetDetail.annotations).length > 3 && (
                                      <button className="btn-text" style={{ marginLeft: '8px' }}>{t('k8s.showAll')}</button>
                                    )}
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.createdAt')}:</span>
                                  <span className="info-value">
                                    {statefulSetDetail.created_at ? new Date(statefulSetDetail.created_at).toLocaleString('zh-CN') : '-'}
                                  </span>
                                </div>
                              </div>
                              <div className="info-card">
                                <h3>{t('k8s.configuration')}</h3>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.strategy')}:</span>
                                  <span className="info-value">{statefulSetDetail.strategy || 'RollingUpdate'}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">{t('k8s.labels')}:</span>
                                  <span className="info-value">
                                    {statefulSetDetail.labels && Object.keys(statefulSetDetail.labels).length > 0
                                      ? Object.entries(statefulSetDetail.labels).slice(0, 3).map(([k, v]) => (
                                          <span key={k} className="label-tag" style={{ marginRight: '4px' }}>{k}={v}</span>
                                        ))
                                      : '-'}
                                    {statefulSetDetail.labels && Object.keys(statefulSetDetail.labels).length > 3 && (
                                      <button className="btn-text" style={{ marginLeft: '8px' }}>{t('k8s.showAll')}</button>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 状态信息 */}
                          <div className="status-summary" style={{ marginTop: '20px', marginBottom: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <span>
                              {t('k8s.ready')}: {statefulSetDetail.readyReplicas || 0}/{statefulSetDetail.replicas || 0}{t('k8s.unit')}, 
                              {t('k8s.updated')}: {statefulSetDetail.updated || 0}{t('k8s.unit')}, 
                              {t('k8s.available')}: {statefulSetDetail.available || 0}{t('k8s.unit')}
                            </span>
                            <button className="btn-text" style={{ marginLeft: '12px' }}>{t('k8s.expandStatus')} ▼</button>
                          </div>

                          {/* 标签页 */}
                          <div className="deployment-detail-tabs">
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'pods' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('pods')}
                            >
                              {t('k8s.pods')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'access' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('access')}
                            >
                              {t('k8s.accessMethod')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'events' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('events')}
                            >
                              {t('k8s.events')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'scale' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('scale')}
                            >
                              {t('k8s.containerScaling')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'history' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('history')}
                            >
                              {t('k8s.historyVersions')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'logs' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('logs')}
                            >
                              {t('k8s.logs')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'monitoring' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('monitoring')}
                            >
                              {t('k8s.monitoring')}
                            </button>
                            <button
                              className={`deployment-detail-tab ${statefulSetDetailTab === 'cost' ? 'active' : ''}`}
                              onClick={() => setStatefulSetDetailTab('cost')}
                            >
                              {t('k8s.costInsights')}
                            </button>
                          </div>

                          {/* 标签页内容 */}
                          <div className="deployment-detail-content">
                            {statefulSetDetailTab === 'pods' && (
                              <div className="table-wrapper">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>{t('k8s.name')}</th>
                                      <th>{t('k8s.image')}</th>
                                      <th>{t('k8s.status')}</th>
                                      <th>{t('k8s.monitoring')}</th>
                                      <th>{t('k8s.restarts')}</th>
                                      <th>{t('k8s.podIP')}</th>
                                      <th>{t('k8s.node')}</th>
                                      <th>{t('k8s.createdAt')}</th>
                                      <th>{t('common.actions')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {statefulSetPods.length === 0 ? (
                                      <tr>
                                        <td colSpan="9" className="empty-state">
                                          {t('k8s.noPods')}
                                        </td>
                                      </tr>
                                    ) : (
                                      statefulSetPods.map((pod) => (
                                        <tr key={pod.name}>
                                          <td>
                                            <span>
                                              {pod.name}
                                            </span>
                                          </td>
                                          <td className="image-cell">
                                            <div className="image-content">
                                              {(() => {
                                                const image = pod.images && pod.images[0] ? pod.images[0] : '-'
                                                if (image === '-') return <div>-</div>
                                                const lastSlashIndex = image.lastIndexOf('/')
                                                if (lastSlashIndex > 0 && lastSlashIndex < image.length - 1) {
                                                  return (
                                                    <>
                                                      <div>{image.substring(0, lastSlashIndex + 1)}</div>
                                                      <div>{image.substring(lastSlashIndex + 1)}</div>
                                                    </>
                                                  )
                                                }
                                                return <div>{image}</div>
                                              })()}
                                            </div>
                                          </td>
                                          <td>
                                            <span className={`status-badge ${getPodStatusClass(pod.status)}`}>
                                              {pod.status}
                                            </span>
                                          </td>
                                          <td>
                                            <span style={{ cursor: 'pointer' }}>📊</span>
                                          </td>
                                          <td>{pod.restarts || 0}</td>
                                          <td>{pod.podIP || '-'}</td>
                                          <td>
                                            {pod.node ? (
                                              <div>
                                                <div>{pod.node}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{pod.nodeIP || ''}</div>
                                              </div>
                                            ) : '-'}
                                          </td>
                                          <td>{pod.created_at ? new Date(pod.created_at).toLocaleString('zh-CN') : '-'}</td>
                                          <td>
                                            <div className="action-buttons">
                                              <button className="btn-text btn-edit">YAML {t('common.edit')}</button>
                                              <button className="btn-text">{t('k8s.terminal')}</button>
                                              <button className="btn-text btn-more">{t('common.more')} ▼</button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {statefulSetDetailTab === 'cost' && (
                              <div className="cost-insights-section">
                                {statefulSetCostInfo ? (
                                  <div className="info-grid">
                                    <div className="info-card">
                                      <h3>{t('k8s.costOverview')}</h3>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.totalCost')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.totalCost ? `¥${statefulSetCostInfo.totalCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.cpuCost')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.cpuCost ? `¥${statefulSetCostInfo.cpuCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.memoryCost')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.memoryCost ? `¥${statefulSetCostInfo.memoryCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.storageCost')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.storageCost ? `¥${statefulSetCostInfo.storageCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.networkCost')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.networkCost ? `¥${statefulSetCostInfo.networkCost.toFixed(2)}` : '-'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="info-card">
                                      <h3>{t('k8s.resourceUsage')}</h3>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.cpuUsage')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.cpuUsage ? `${statefulSetCostInfo.cpuUsage} cores` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.memoryUsage')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.memoryUsage ? `${statefulSetCostInfo.memoryUsage} Gi` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.storageUsage')}:</span>
                                        <span className="info-value">
                                          {statefulSetCostInfo.storageUsage ? `${statefulSetCostInfo.storageUsage} Gi` : '-'}
                                        </span>
                                      </div>
                                      <div className="info-item">
                                        <span className="info-label">{t('k8s.replicas')}:</span>
                                        <span className="info-value">
                                          {statefulSetDetail?.replicas || 0}
                                        </span>
                                      </div>
                                    </div>
                                    {statefulSetCostInfo.costBreakdown && (
                                      <div className="info-card">
                                        <h3>{t('k8s.costBreakdown')}</h3>
                                        <div className="info-item">
                                          <span className="info-label">{t('k8s.dailyCost')}:</span>
                                          <span className="info-value">
                                            {statefulSetCostInfo.costBreakdown.daily ? `¥${statefulSetCostInfo.costBreakdown.daily.toFixed(2)}` : '-'}
                                          </span>
                                        </div>
                                        <div className="info-item">
                                          <span className="info-label">{t('k8s.monthlyCost')}:</span>
                                          <span className="info-value">
                                            {statefulSetCostInfo.costBreakdown.monthly ? `¥${statefulSetCostInfo.costBreakdown.monthly.toFixed(2)}` : '-'}
                                          </span>
                                        </div>
                                        <div className="info-item">
                                          <span className="info-label">{t('k8s.yearlyCost')}:</span>
                                          <span className="info-value">
                                            {statefulSetCostInfo.costBreakdown.yearly ? `¥${statefulSetCostInfo.costBreakdown.yearly.toFixed(2)}` : '-'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                    {t('k8s.costInfoNotAvailable')}
                                  </div>
                                )}
                              </div>
                            )}
                            {statefulSetDetailTab !== 'pods' && statefulSetDetailTab !== 'cost' && (
                              <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                {t('k8s.featureComingSoon')}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Deployment列表视图
                        <div>
                          {!selectedDeployment && workloadType === 'deployments' && (() => {
                        const filtered = deployments.filter((item) => {
                          if (workloadSearchTerm) {
                            const searchLower = workloadSearchTerm.toLowerCase()
                            return item.name?.toLowerCase().includes(searchLower) ||
                                   item.namespace?.toLowerCase().includes(searchLower)
                          }
                          return true
                        });
                        return (
                          <div>
                            {/* 工具栏 */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              marginBottom: '16px',
                              flexWrap: 'wrap'
                            }}>
                              {/* 命名空间下拉框 */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '14px', color: '#64748b' }}>命名空间:</label>
                                <select
                                  value={selectedWorkloadNamespace || ''}
                                  onChange={(e) => {
                                    const newNamespace = e.target.value || ''
                                    setSelectedWorkloadNamespace(newNamespace)
                                    // 更新URL参数
                                    const newParams = new URLSearchParams(searchParams)
                                    if (newNamespace) {
                                      newParams.set('namespace', newNamespace)
                                    } else {
                                      newParams.delete('namespace')
                                    }
                                    setSearchParams(newParams, { replace: true })
                                    // 刷新列表
                                    if (newNamespace) {
                                      fetchDeployments(newNamespace)
                                    } else {
                                      fetchDeployments()
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '14px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    color: '#1a1a1a',
                                    cursor: 'pointer',
                                    minWidth: '150px'
                                  }}
                                >
                                  <option value="">全部命名空间</option>
                                  {namespaces.map((ns) => (
                                    <option key={ns.name} value={ns.name}>
                                      {ns.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              {/* 名称下拉框 */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '14px', color: '#64748b' }}>名称:</label>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setWorkloadSearchTerm(e.target.value)
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '14px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    color: '#1a1a1a',
                                    cursor: 'pointer',
                                    minWidth: '150px'
                                  }}
                                >
                                  <option value="">请选择</option>
                                  {deployments.map((deployment) => (
                                    <option key={`${deployment.namespace}-${deployment.name}`} value={deployment.name}>
                                      {deployment.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              {/* 搜索输入框 */}
                              <div style={{ 
                                position: 'relative', 
                                flex: '1', 
                                minWidth: '200px',
                                maxWidth: '300px'
                              }}>
                                <input
                                  type="text"
                                  placeholder="请输入"
                                  value={workloadSearchTerm}
                                  onChange={(e) => setWorkloadSearchTerm(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 32px 6px 12px',
                                    fontSize: '14px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    color: '#1a1a1a'
                                  }}
                                />
                                <span style={{
                                  position: 'absolute',
                                  right: '10px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  color: '#94a3b8',
                                  pointerEvents: 'none'
                                }}>
                                  <span style={{ fontSize: '14px' }}>🔍</span>
                                </span>
                              </div>
                            </div>
                            
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.tags')}</th>
                                  <th>{t('k8s.podCount')}</th>
                                  <th>{t('k8s.image')}</th>
                                  <th>{t('k8s.createdAt')}</th>
                                  <th>{t('k8s.updatedAt')}</th>
                                  <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.length === 0 ? (
                                  <tr>
                                    <td colSpan="8" className="empty-state">
                                      {workloadSearchTerm ? t('k8s.noWorkloadsFound') : t('k8s.noDeployments')}
                                    </td>
                                  </tr>
                                ) : (
                                  filtered.map((deployment) => {
                                    // 处理名称换行（如果名称较长，在合适位置换行）
                                    const name = deployment.name || ''
                                    const nameParts = name.split('-')
                                    // 如果名称包含多个连字符，在最后一个连字符前换行
                                    const displayName = nameParts.length > 2 
                                      ? `${nameParts.slice(0, -1).join('-')}-\n${nameParts[nameParts.length - 1]}`
                                      : name
                                    
                                    // 处理名称点击
                                    const handleNameClick = (e) => {
                                      e.preventDefault()
                                      handleDeploymentClick(deployment)
                                    }
                                    
                                    // 处理镜像换行（在最后一个斜杠前换行）
                                    const image = deployment.image || deployment.images?.[0] || '-'
                                    let displayImage = image
                                    if (image && image !== '-') {
                                      const lastSlashIndex = image.lastIndexOf('/')
                                      // 如果包含斜杠且斜杠不在开头或结尾，则换行
                                      if (lastSlashIndex > 0 && lastSlashIndex < image.length - 1) {
                                        displayImage = `${image.substring(0, lastSlashIndex + 1)}\n${image.substring(lastSlashIndex + 1)}`
                                      }
                                    }
                                    
                                    // 容器组数量格式：实际启动数量/实际副本数量
                                    // 实际启动数量：使用availableReplicas，如果没有则使用readyReplicas
                                    // 实际副本数量：使用replicas
                                    const availableReplicas = deployment.availableReplicas !== undefined 
                                      ? deployment.availableReplicas 
                                      : (deployment.readyReplicas || 0)
                                    const podCount = `${availableReplicas}/${deployment.replicas || 0}`
                                    
                                    return (
                                    <tr key={`${deployment.namespace}-${deployment.name}`}>
                                        <td className="name-cell">
                                          <div 
                                            className="name-content name-link"
                                            onClick={handleNameClick}
                                            style={{ cursor: 'pointer', color: '#667eea' }}
                                          >
                                            {displayName.split('\n').map((part, idx) => (
                                              <div key={idx}>{part}</div>
                                            ))}
                                          </div>
                                        </td>
                                      <td>{deployment.namespace}</td>
                                        <td>
                                          {deployment.labels && Object.keys(deployment.labels).length > 0 ? (
                                            <span className="tags-icon">🏷️</span>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                        <td>{podCount}</td>
                                        <td className="image-cell">
                                          <div className="image-content">
                                            {image === '-' ? (
                                              <div>-</div>
                                            ) : (
                                              displayImage.split('\n').map((part, idx) => (
                                                <div key={idx}>{part}</div>
                                              ))
                                            )}
                                          </div>
                                        </td>
                                      <td>{deployment.created_at ? new Date(deployment.created_at).toLocaleString('zh-CN') : '-'}</td>
                                        <td>{deployment.updated_at ? new Date(deployment.updated_at).toLocaleString('zh-CN') : '-'}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button 
                                              className="btn-text btn-detail"
                                              title={t('k8s.detail')}
                                              onClick={() => handleDeploymentClick(deployment)}
                                            >
                                              {t('k8s.detail')}
                                            </button>
                                            <button 
                                              className="btn-text btn-edit"
                                              title={t('common.edit')}
                                              onClick={() => {
                                                setEditingDeployment(deployment)
                                                setEditDeploymentData({
                                                  replicas: deployment.replicas || 1,
                                                  image: deployment.image || deployment.images?.[0] || '',
                                                  labels: deployment.labels || {},
                                                  annotations: {}
                                                })
                                                setShowEditDeploymentModal(true)
                                              }}
                                            >
                                              {t('common.edit')}
                                            </button>
                                            <button 
                                              className="btn-text btn-scale"
                                              title={t('k8s.scale')}
                                              onClick={() => {
                                                setScalingDeployment(deployment)
                                                setScaleReplicas(deployment.replicas || 1)
                                                setShowScaleDeploymentModal(true)
                                              }}
                                            >
                                              {t('k8s.scale')}
                                            </button>
                                            <div className="action-dropdown">
                                              <button 
                                                className="btn-text btn-more"
                                                title={t('common.more')}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  // 关闭其他下拉菜单
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')
                                                  if (dropdown) {
                                                    dropdown.classList.toggle('show')
                                                  }
                                                }}
                                              >
                                                ⋯
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                {/* 1. 监控 */}
                                                <button onClick={() => {
                                                  setShowMonitoringModal(true)
                                                  setSelectedDeployment(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.monitoring')}
                                                </button>
                                                {/* 2. 升级策略 */}
                                                <button onClick={() => {
                                                  setShowUpgradeStrategyModal(true)
                                                  setSelectedDeployment(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.upgradeStrategy')}
                                                </button>
                                                {/* 3. 重新部署 */}
                                                <button onClick={() => {
                                                  handleRedeploy(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.redeploy')}
                                                </button>
                                                {/* 4. 智能优化 */}
                                                <button onClick={() => {
                                                  setShowOptimizationModal(true)
                                                  setSelectedDeployment(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.intelligentOptimization')}
                                                </button>
                                                {/* 5. 编辑标签 */}
                                                <button onClick={() => {
                                                  handleEditDeploymentLabels(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                {/* 6. 编辑注解 */}
                                                <button onClick={() => {
                                                  handleEditDeploymentAnnotations(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editAnnotations')}
                                                </button>
                                                {/* 7. 节点亲和性 */}
                                                <button onClick={() => {
                                                  setShowNodeAffinityModal(true)
                                                  setSelectedDeployment(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.nodeAffinity')}
                                                </button>
                                                {/* 8. 调度容忍 */}
                                                <button onClick={() => {
                                                  setShowTolerationModal(true)
                                                  setSelectedDeployment(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.schedulingToleration')}
                                                </button>
                                                {/* 9. 资源画像 */}
                                                <button onClick={() => {
                                                  setShowResourceProfileModal(true)
                                                  setSelectedDeployment(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.resourceProfile')}
                                                </button>
                                                {/* 10. 成本洞察 */}
                                                <button onClick={() => {
                                                  handleDeploymentClick(deployment)
                                                  setDeploymentDetailTab('cost')
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.costInsights')}
                                                </button>
                                                {/* 11. 复制创建 */}
                                                <button onClick={() => {
                                                  setShowCloneModal(true)
                                                  setSelectedDeployment(deployment)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.cloneCreate')}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                    </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}

                      {!selectedDeployment && workloadType === 'statefulsets' && (() => {
                        const filtered = statefulSets.filter((item) => {
                          if (workloadSearchTerm) {
                            const searchLower = workloadSearchTerm.toLowerCase()
                            return item.name?.toLowerCase().includes(searchLower) ||
                                   item.namespace?.toLowerCase().includes(searchLower)
                          }
                          return true
                        });
                        return (
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.tags')}</th>
                                  <th>{t('k8s.podCount')}</th>
                                  <th>{t('k8s.image')}</th>
                                  <th>{t('k8s.createdAt')}</th>
                                  <th>{t('k8s.updatedAt')}</th>
                                  <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.length === 0 ? (
                                  <tr>
                                    <td colSpan="8" className="empty-state">
                                      {workloadSearchTerm ? t('k8s.noWorkloadsFound') : t('k8s.noStatefulSets')}
                                    </td>
                                  </tr>
                                ) : (
                                  filtered.map((sts) => {
                                    const handleNameClick = (e) => {
                                      e.preventDefault()
                                      handleStatefulSetClick(sts)
                                    }
                                    
                                    // 名称换行处理
                                    const displayName = sts.name && sts.name.length > 20
                                      ? sts.name.substring(0, 20) + '\n' + sts.name.substring(20)
                                      : sts.name || '-'
                                    
                                    // 镜像换行处理
                                    const image = sts.image || sts.images?.[0] || '-'
                                    const displayImage = image && image !== '-' && image.length > 30
                                      ? image.substring(0, 30) + '\n' + image.substring(30)
                                      : image
                                    
                                    // 容器组数量格式：实际启动数量/实际副本数量
                                    const availableReplicas = sts.availableReplicas !== undefined 
                                      ? sts.availableReplicas 
                                      : (sts.readyReplicas || 0)
                                    const podCount = `${availableReplicas}/${sts.replicas || 0}`
                                    
                                    return (
                                    <tr key={`${sts.namespace}-${sts.name}`}>
                                        <td className="name-cell">
                                          <div 
                                            className="name-content name-link"
                                            onClick={handleNameClick}
                                            style={{ cursor: 'pointer', color: '#667eea' }}
                                          >
                                            {displayName.split('\n').map((part, idx) => (
                                              <div key={idx}>{part}</div>
                                            ))}
                                          </div>
                                        </td>
                                      <td>{sts.namespace}</td>
                                        <td>
                                          {sts.labels && Object.keys(sts.labels).length > 0 ? (
                                            <span className="tags-icon">🏷️</span>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                        <td>{podCount}</td>
                                        <td className="image-cell">
                                          <div className="image-content">
                                            {displayImage === '-' ? (
                                              <div>-</div>
                                            ) : (
                                              displayImage.split('\n').map((part, idx) => (
                                                <div key={idx}>{part}</div>
                                              ))
                                            )}
                                          </div>
                                        </td>
                                      <td>{sts.created_at ? new Date(sts.created_at).toLocaleString('zh-CN') : '-'}</td>
                                        <td>{sts.updated_at ? new Date(sts.updated_at).toLocaleString('zh-CN') : '-'}</td>
                                        <td>
                                          <div className="action-buttons">
                                            <button 
                                              className="btn-text btn-detail"
                                              title={t('k8s.detail')}
                                              onClick={() => handleStatefulSetClick(sts)}
                                            >
                                              {t('k8s.detail')}
                                            </button>
                                            <button 
                                              className="btn-text btn-edit"
                                              title={t('common.edit')}
                                              onClick={() => {
                                                setEditingStatefulSet(sts)
                                                setEditStatefulSetData({
                                                  replicas: sts.replicas || 1,
                                                  image: sts.image || sts.images?.[0] || '',
                                                  labels: sts.labels || {},
                                                  annotations: {}
                                                })
                                                setShowEditStatefulSetModal(true)
                                              }}
                                            >
                                              {t('common.edit')}
                                            </button>
                                            <button 
                                              className="btn-text btn-scale"
                                              title={t('k8s.scale')}
                                              onClick={() => {
                                                setScalingStatefulSet(sts)
                                                setScaleStatefulSetReplicas(sts.replicas || 1)
                                                setShowScaleStatefulSetModal(true)
                                              }}
                                            >
                                              {t('k8s.scale')}
                                            </button>
                                            <div className="action-dropdown">
                                              <button 
                                                className="btn-text btn-more"
                                                title={t('common.more')}
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                    if (menu !== e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')) {
                                                      menu.classList.remove('show')
                                                    }
                                                  })
                                                  const dropdown = e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')
                                                  if (dropdown) {
                                                    dropdown.classList.toggle('show')
                                                  }
                                                }}
                                              >
                                                ⋯
                                              </button>
                                              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => {
                                                  setShowMonitoringModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.monitoring')}
                                                </button>
                                                <button onClick={() => {
                                                  setShowOptimizationModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.intelligentOptimization')}
                                                </button>
                                                <button onClick={() => {
                                                  handleEditStatefulSetYaml(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.yamlEdit')}
                                                </button>
                                                <button onClick={() => {
                                                  handleRedeployStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.redeploy')}
                                                </button>
                                                <button onClick={() => {
                                                  handleEditStatefulSetLabels(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editLabels')}
                                                </button>
                                                <button onClick={() => {
                                                  handleEditStatefulSetAnnotations(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.editAnnotations')}
                                                </button>
                                                <button onClick={() => {
                                                  setShowNodeAffinityModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.nodeAffinity')}
                                                </button>
                                                <button onClick={() => {
                                                  setScalingStatefulSet(sts)
                                                  setScaleStatefulSetReplicas(sts.replicas || 1)
                                                  setShowScaleStatefulSetModal(true)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.elasticScaling')}
                                                </button>
                                                <button onClick={() => {
                                                  setShowTolerationModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.schedulingToleration')}
                                                </button>
                                                <button onClick={() => {
                                                  setShowResourceProfileModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.resourceProfile')}
                                                </button>
                                                <button onClick={() => {
                                                  handleStatefulSetClick(sts)
                                                  setStatefulSetDetailTab('cost')
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.costInsights')}
                                                </button>
                                                <button onClick={() => {
                                                  setShowUpgradeStrategyModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.upgradeStrategy')}
                                                </button>
                                                <button onClick={() => {
                                                  setShowCloneModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.cloneCreate')}
                                                </button>
                                                <button onClick={() => {
                                                  setShowRollbackModal(true)
                                                  setSelectedStatefulSet(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.rollback')}
                                                </button>
                                                <button onClick={() => {
                                                  handleViewStatefulSetLogs(sts)
                                                  document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                }}>
                                                  {t('k8s.logs')}
                                                </button>
                                                <button
                                                  className="danger"
                                                  onClick={() => {
                                                    handleDeleteStatefulSet(sts)
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
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}

                      {workloadType === 'daemonsets' && (() => {
                        const filtered = daemonSets.filter((item) => {
                          if (workloadSearchTerm) {
                            const searchLower = workloadSearchTerm.toLowerCase()
                            return item.name?.toLowerCase().includes(searchLower) ||
                                   item.namespace?.toLowerCase().includes(searchLower)
                          }
                          return true
                        })
                        return (
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('k8s.daemonSetName')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.desired')}</th>
                                  <th>{t('k8s.current')}</th>
                                  <th>{t('k8s.ready')}</th>
                                  <th>{t('k8s.available')}</th>
                                  <th>{t('k8s.age')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" className="empty-state">
                                      {workloadSearchTerm ? t('k8s.noWorkloadsFound') : t('k8s.noDaemonSets')}
                                    </td>
                                  </tr>
                                ) : (
                                  filtered.map((ds) => (
                                    <tr key={`${ds.namespace}-${ds.name}`}>
                                      <td>{ds.name}</td>
                                      <td>{ds.namespace}</td>
                                      <td>{ds.desired || 0}</td>
                                      <td>{ds.current || 0}</td>
                                      <td>{ds.ready || 0}</td>
                                      <td>{ds.available || 0}</td>
                                      <td>{ds.age}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}

                      {!selectedDeployment && workloadType === 'jobs' && (() => {
                        const filtered = jobs.filter((item) => {
                          if (workloadSearchTerm) {
                            const searchLower = workloadSearchTerm.toLowerCase()
                            return item.name?.toLowerCase().includes(searchLower) ||
                                   item.namespace?.toLowerCase().includes(searchLower)
                          }
                          return true
                        })
                        return (
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('k8s.jobName')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.completions')}</th>
                                  <th>{t('k8s.succeeded')}</th>
                                  <th>{t('k8s.active')}</th>
                                  <th>{t('k8s.failed')}</th>
                                  <th>{t('k8s.age')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" className="empty-state">
                                      {workloadSearchTerm ? t('k8s.noWorkloadsFound') : t('k8s.noJobs')}
                                    </td>
                                  </tr>
                                ) : (
                                  filtered.map((job) => (
                                    <tr key={`${job.namespace}-${job.name}`}>
                                      <td>{job.name}</td>
                                      <td>{job.namespace}</td>
                                      <td>{job.completions || '-'}</td>
                                      <td>{job.succeeded || 0}</td>
                                      <td>{job.active || 0}</td>
                                      <td>{job.failed || 0}</td>
                                      <td>{job.age}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}

                      {!selectedDeployment && workloadType === 'cronjobs' && (() => {
                        const filtered = cronJobs.filter((item) => {
                          if (workloadSearchTerm) {
                            const searchLower = workloadSearchTerm.toLowerCase()
                            return item.name?.toLowerCase().includes(searchLower) ||
                                   item.namespace?.toLowerCase().includes(searchLower)
                          }
                          return true
                        })
                        return (
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>{t('k8s.cronJobName')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                  <th>{t('k8s.schedule')}</th>
                                  <th>{t('k8s.lastScheduleTime')}</th>
                                  <th>{t('k8s.active')}</th>
                                  <th>{t('k8s.suspend')}</th>
                                  <th>{t('k8s.age')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" className="empty-state">
                                      {workloadSearchTerm ? t('k8s.noWorkloadsFound') : t('k8s.noCronJobs')}
                                    </td>
                                  </tr>
                                ) : (
                                  filtered.map((cj) => (
                                    <tr key={`${cj.namespace}-${cj.name}`}>
                                      <td>{cj.name}</td>
                                      <td>{cj.namespace}</td>
                                      <td>{cj.schedule || '-'}</td>
                                      <td>{cj.lastScheduleTime ? new Date(cj.lastScheduleTime).toLocaleString('zh-CN') : '-'}</td>
                                      <td>{cj.active || 0}</td>
                                      <td>{cj.suspend ? t('common.yes') : t('common.no')}</td>
                                      <td>{cj.age}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}

                      {!selectedDeployment && workloadType === 'pods' && (() => {
                        const filtered = workloads.filter((item) => {
                          if (workloadSearchTerm) {
                            const searchLower = workloadSearchTerm.toLowerCase()
                            return item.name?.toLowerCase().includes(searchLower) ||
                                   item.namespace?.toLowerCase().includes(searchLower) ||
                                   item.status?.toLowerCase().includes(searchLower) ||
                                   item.node?.toLowerCase().includes(searchLower)
                          }
                          return true
                        })
                        return (
                          <div className="table-wrapper">
                            <table className="data-table">
                              <thead>
                                <tr>
                                    <th>
                                      <input type="checkbox" />
                                    </th>
                                    <th>{t('k8s.name')}</th>
                                  <th>{t('k8s.namespace')}</th>
                                    <th>{t('k8s.tags')}</th>
                                  <th>{t('k8s.status')}</th>
                                  <th>{t('k8s.restarts')}</th>
                                    <th>{t('k8s.podIP')}</th>
                                  <th>{t('k8s.node')}</th>
                                    <th>{t('k8s.createdAt')}</th>
                                    <th>{t('k8s.cpuMemory')}</th>
                                    <th>{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.length === 0 ? (
                                  <tr>
                                      <td colSpan="11" className="empty-state">
                                      {workloadSearchTerm ? t('k8s.noWorkloadsFound') : t('k8s.noPods')}
                                    </td>
                                  </tr>
                                ) : (
                                    filtered.map((pod) => {
                                      // 格式化CPU和内存显示
                                      const cpuDisplay = pod.cpuRequest ? pod.cpuRequest.toFixed(3) : '0'
                                      const memoryDisplay = pod.memoryRequest 
                                        ? (pod.memoryRequest / (1024 * 1024)).toFixed(3) + ' Mi'
                                        : '0 Mi'
                                      
                                      // 节点显示：主机名和IP
                                      const nodeDisplay = pod.node ? (
                                        <div>
                                          <div>{pod.node}</div>
                                          {pod.nodeIP && (
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                              {pod.nodeIP}
                                              {pod.nodeInternalIP && pod.nodeInternalIP !== pod.nodeIP && (
                                                <span>, {pod.nodeInternalIP}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : '-'
                                      
                                      // 镜像显示：在名称下方
                                      const imageDisplay = pod.images && pod.images.length > 0
                                        ? pod.images.map((img, idx) => {
                                            const parts = img.split(':')
                                            const imageName = parts[0]
                                            const imageTag = parts.length > 1 ? parts[1] : 'latest'
                                            return (
                                              <div key={idx} style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                                {imageName}:{imageTag}
                                              </div>
                                            )
                                          })
                                        : null
                                      
                                      return (
                                    <tr key={`${pod.namespace}-${pod.name}`}>
                                          <td>
                                            <input type="checkbox" />
                                          </td>
                                          <td className="name-cell">
                                            <div>
                                              <div style={{ fontWeight: '500' }}>
                                                {pod.name}
                                              </div>
                                              {imageDisplay}
                                            </div>
                                          </td>
                                      <td>{pod.namespace}</td>
                                          <td>
                                            {pod.labels && Object.keys(pod.labels).length > 0 ? (
                                              <span className="tags-icon">🏷️</span>
                                            ) : (
                                              '-'
                                            )}
                                          </td>
                                      <td>
                                        <span className={`status-badge ${getPodStatusClass(pod.status)}`}>
                                              {pod.status === 'Running' && (
                                                <span style={{ 
                                                  display: 'inline-block', 
                                                  width: '8px', 
                                                  height: '8px', 
                                                  borderRadius: '50%', 
                                                  backgroundColor: '#10b981', 
                                                  marginRight: '6px' 
                                                }}></span>
                                              )}
                                          {pod.status}
                                        </span>
                                      </td>
                                          <td>{pod.restarts || 0}</td>
                                          <td>{pod.podIP || '-'}</td>
                                          <td>{nodeDisplay}</td>
                                          <td>{pod.created_at ? new Date(pod.created_at).toLocaleString('zh-CN', { 
                                            year: 'numeric', 
                                            month: '2-digit', 
                                            day: '2-digit', 
                                            hour: '2-digit', 
                                            minute: '2-digit', 
                                            second: '2-digit' 
                                          }) : '-'}</td>
                                          <td>
                                            <div>
                                              <div>{cpuDisplay} {t('k8s.cores')}</div>
                                              <div style={{ fontSize: '12px', color: '#64748b' }}>{memoryDisplay}</div>
                          </div>
                                          </td>
                                          <td>
                                            <div className="action-buttons">
                  <button
                                                className="btn-text btn-edit"
                                                onClick={() => handleEditYaml(pod)}
                                              >
                                                YAML {t('common.edit')}
                  </button>
                                              <button className="btn-text">{t('k8s.terminal')}</button>
                                              <div className="action-dropdown">
                                                <button 
                                                  className="btn-text btn-more"
                                                  title={t('common.more')}
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                                                      if (menu !== e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')) {
                                                        menu.classList.remove('show')
                                                      }
                                                    })
                                                    const dropdown = e.target.closest('.action-dropdown')?.querySelector('.dropdown-menu')
                                                    if (dropdown) {
                                                      dropdown.classList.toggle('show')
                                                    }
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
                                                    // TODO: 实现终端功能
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}>
                                                    {t('k8s.terminal')}
                  </button>
                                                  <button onClick={() => {
                                                    handleRestartPod(pod.namespace, pod.name)
                                                    document.querySelector('.dropdown-menu.show')?.classList.remove('show')
                                                  }}>
                                                    {t('k8s.restart')}
                                                  </button>
                  <button
                                                    className="danger"
                    onClick={() => {
                                                      if (window.confirm(t('k8s.confirmDeletePod'))) {
                                                        handleDeletePod(pod)
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
                                    )
                                  }
                                  )
                            )}
                          </tbody>
                        </table>
                      </div>
                        )
                      })()}

                      {!selectedDeployment && workloadType === 'custom' && (
                        <div className="empty-state">
                          <p>{t('k8s.customResourcesComingSoon')}</p>
                        </div>
                      )}
                      {!selectedDeployment && !loading && workloadsTotal > 0 && (
                        <Pagination
                          currentPage={workloadsPage}
                          totalPages={Math.ceil(workloadsTotal / workloadsPageSize)}
                          totalItems={workloadsTotal}
                          pageSize={workloadsPageSize}
                          onPageChange={setWorkloadsPage}
                          onPageSizeChange={(newSize) => {
                            setWorkloadsPageSize(newSize)
                            setWorkloadsPage(1)
                          }}
                        />
                      )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'config' && (
                    <div className="config-section">
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '16px' }}>{t('k8s.configMaps')}</h3>
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{t('k8s.configMapName')}</th>
                                <th>{t('k8s.namespace')}</th>
                                <th>{t('k8s.dataKeys')}</th>
                                <th>{t('k8s.createdAt')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {configMaps.length === 0 ? (
                                <tr>
                                  <td colSpan="4" className="empty-state">
                                    {t('k8s.noConfigMaps')}
                                  </td>
                                </tr>
                              ) : (
                                configMaps.map((cm) => (
                                  <tr key={`${cm.namespace}-${cm.name}`}>
                                    <td>{cm.name}</td>
                                    <td>{cm.namespace}</td>
                                    <td>{cm.dataKeys || '-'}</td>
                                    <td>{cm.created_at ? new Date(cm.created_at).toLocaleString('zh-CN') : '-'}</td>
                                  </tr>
                                ))
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
                            onPageChange={setConfigMapsPage}
                            onPageSizeChange={(newSize) => {
                              setConfigMapsPageSize(newSize)
                              setConfigMapsPage(1)
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <h3 style={{ marginBottom: '16px' }}>{t('k8s.secrets')}</h3>
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{t('k8s.secretName')}</th>
                                <th>{t('k8s.namespace')}</th>
                                <th>{t('k8s.secretType')}</th>
                                <th>{t('k8s.createdAt')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {secrets.length === 0 ? (
                                <tr>
                                  <td colSpan="4" className="empty-state">
                                    {t('k8s.noSecrets')}
                                  </td>
                                </tr>
                              ) : (
                                secrets.map((secret) => (
                                  <tr key={`${secret.namespace}-${secret.name}`}>
                                    <td>{secret.name}</td>
                                    <td>{secret.namespace}</td>
                                    <td>{secret.type || '-'}</td>
                                    <td>{secret.created_at ? new Date(secret.created_at).toLocaleString('zh-CN') : '-'}</td>
                                  </tr>
                                ))
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
                          onPageChange={setSecretsPage}
                          onPageSizeChange={(newSize) => {
                            setSecretsPageSize(newSize)
                            setSecretsPage(1)
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'storage' && (
                    <div className="storage-section">
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('k8s.pvcName')}</th>
                              <th>{t('k8s.namespace')}</th>
                              <th>{t('k8s.status')}</th>
                              <th>{t('k8s.capacity')}</th>
                              <th>{t('k8s.accessModes')}</th>
                              <th>{t('k8s.storageClass')}</th>
                              <th>{t('k8s.createdAt')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pvcs.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="empty-state">
                                  {t('k8s.noPVCs')}
                                </td>
                              </tr>
                            ) : (
                              pvcs.map((pvc) => (
                                <tr key={`${pvc.namespace}-${pvc.name}`}>
                                  <td>{pvc.name}</td>
                                  <td>{pvc.namespace}</td>
                                  <td>
                                    <span className={`status-badge ${pvc.status === 'Bound' ? 'status-connected' : 'status-unknown'}`}>
                                      {pvc.status || '-'}
                                    </span>
                                  </td>
                                  <td>{pvc.capacity || '-'}</td>
                                  <td>{pvc.accessModes || '-'}</td>
                                  <td>{pvc.storageClass || '-'}</td>
                                  <td>{pvc.created_at ? new Date(pvc.created_at).toLocaleString('zh-CN') : '-'}</td>
                                </tr>
                              ))
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
                          onPageChange={setPvcsPage}
                          onPageSizeChange={(newSize) => {
                            setPvcsPageSize(newSize)
                            setPvcsPage(1)
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="security-section">
                      <div className="security-tabs">
                  <button
                          className={`security-subtab ${activeSubtab === 'authorization' || activeSubtab === '' ? 'active' : ''}`}
                    onClick={() => {
                            setActiveSubtab('authorization')
                            setSearchParams({ tab: 'security', subtab: 'authorization' })
                    }}
                  >
                          {t('nav.authorization')}
                  </button>
                  <button
                          className={`security-subtab ${activeSubtab === 'roles' ? 'active' : ''}`}
                    onClick={() => {
                            setActiveSubtab('roles')
                            setSearchParams({ tab: 'security', subtab: 'roles' })
                          }}
                        >
                          {t('nav.roleManagement')}
                        </button>
                        <button
                          className={`security-subtab ${activeSubtab === 'audit' ? 'active' : ''}`}
                          onClick={() => {
                            setActiveSubtab('audit')
                            setSearchParams({ tab: 'security', subtab: 'audit' })
                          }}
                        >
                          {t('nav.audit')}
                        </button>
                        <button
                          className={`security-subtab ${activeSubtab === 'policy' ? 'active' : ''}`}
                          onClick={() => {
                            setActiveSubtab('policy')
                            setSearchParams({ tab: 'security', subtab: 'policy' })
                          }}
                        >
                          {t('nav.policyManagement')}
                        </button>
                        <button
                          className={`security-subtab ${activeSubtab === 'inspection' ? 'active' : ''}`}
                          onClick={() => {
                            setActiveSubtab('inspection')
                            setSearchParams({ tab: 'security', subtab: 'inspection' })
                          }}
                        >
                          {t('nav.configInspection')}
                        </button>
                        <button
                          className={`security-subtab ${activeSubtab === 'monitoring' ? 'active' : ''}`}
                          onClick={() => {
                            setActiveSubtab('monitoring')
                            setSearchParams({ tab: 'security', subtab: 'monitoring' })
                          }}
                        >
                          {t('nav.securityMonitoring')}
                        </button>
                      </div>
                      <div className="security-content">
                        {(activeSubtab === 'authorization' || activeSubtab === '') && (
                          <div>
                            <p>授权管理功能正在开发中，集群ID: {id}</p>
                          </div>
                        )}
                        {activeSubtab === 'roles' && (
                          <div>
                            <p>角色管理功能正在开发中，集群ID: {id}</p>
                          </div>
                        )}
                        {activeSubtab === 'audit' && (
                          <div>
                            <p>审计功能正在开发中，集群ID: {id}</p>
                          </div>
                        )}
                        {activeSubtab === 'policy' && (
                          <div>
                            <p>策略管理功能正在开发中，集群ID: {id}</p>
                          </div>
                        )}
                        {activeSubtab === 'inspection' && (
                          <div>
                            <p>配置巡检功能正在开发中，集群ID: {id}</p>
                          </div>
                        )}
                        {activeSubtab === 'monitoring' && (
                          <div>
                            <p>安全监控功能正在开发中，集群ID: {id}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'storage' && (
                    <div className="storage-section">
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('k8s.pvcName')}</th>
                              <th>{t('k8s.namespace')}</th>
                              <th>{t('k8s.status')}</th>
                              <th>{t('k8s.capacity')}</th>
                              <th>{t('k8s.accessModes')}</th>
                              <th>{t('k8s.storageClass')}</th>
                              <th>{t('k8s.createdAt')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pvcs.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="empty-state">
                                  {t('k8s.noPVCs')}
                                </td>
                              </tr>
                            ) : (
                              pvcs.map((pvc) => (
                                <tr key={`${pvc.namespace}-${pvc.name}`}>
                                  <td>{pvc.name}</td>
                                  <td>{pvc.namespace}</td>
                                  <td>
                                    <span className={`status-badge ${pvc.status === 'Bound' ? 'status-connected' : 'status-unknown'}`}>
                                      {pvc.status || '-'}
                                    </span>
                                  </td>
                                  <td>{pvc.capacity || '-'}</td>
                                  <td>{pvc.accessModes || '-'}</td>
                                  <td>{pvc.storageClass || '-'}</td>
                                  <td>{pvc.created_at ? new Date(pvc.created_at).toLocaleString('zh-CN') : '-'}</td>
                                </tr>
                              ))
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
                          onPageChange={setPvcsPage}
                          onPageSizeChange={(newSize) => {
                            setPvcsPageSize(newSize)
                            setPvcsPage(1)
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
                <div className="labels-editor-container">
                  <div className="labels-list">
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
                          className="btn-remove"
                          onClick={() => {
                            const newLabels = { ...editingLabels }
                            delete newLabels[key]
                            setEditingLabels(newLabels)
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn-add-label"
                    onClick={() => {
                      setEditingLabels({ ...editingLabels, '': '' })
                    }}
                  >
                    + {t('k8s.addLabel')}
                  </button>
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
                <div className="annotations-editor-container">
                  <div className="annotations-list">
                    {Object.entries(editingAnnotations).map(([key, value]) => (
                      <div key={key} className="annotation-item">
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
                          className="btn-remove"
                          onClick={() => {
                            const newAnnotations = { ...editingAnnotations }
                            delete newAnnotations[key]
                            setEditingAnnotations(newAnnotations)
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn-add-annotation"
                    onClick={() => {
                      setEditingAnnotations({ ...editingAnnotations, '': '' })
                    }}
                  >
                    + {t('k8s.addAnnotation')}
                  </button>
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

          {/* YAML编辑模态框 */}
          {showYamlModal && (
            <div className="modal-overlay" onClick={() => setShowYamlModal(false)}>
              <div className="modal-content yaml-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.editYaml')} - {editingPod?.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowYamlModal(false)
                      setEditingPod(null)
                      setPodYaml('')
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="yaml-warning">
                  <strong>{t('k8s.yamlEditWarning')}</strong>
                  <p>{t('k8s.yamlEditWarningDesc')}</p>
                </div>
                <div className="yaml-editor-container">
                  <textarea
                    className="yaml-editor"
                    value={podYaml}
                    onChange={(e) => setPodYaml(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowYamlModal(false)
                      setEditingPod(null)
                      setPodYaml('')
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveYaml}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 编辑Deployment模态框 */}
          {showEditDeploymentModal && editingDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowEditDeploymentModal(false)
              setEditingDeployment(null)
              setEditDeploymentData({ replicas: 1, image: '', labels: {}, annotations: {} })
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('common.edit')} - {editingDeployment.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowEditDeploymentModal(false)
                      setEditingDeployment(null)
                      setEditDeploymentData({ replicas: 1, image: '', labels: {}, annotations: {} })
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('k8s.replicas')}</label>
                    <input
                      type="number"
                      min="0"
                      value={editDeploymentData.replicas}
                      onChange={(e) => setEditDeploymentData({ ...editDeploymentData, replicas: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.image')}</label>
                    <input
                      type="text"
                      value={editDeploymentData.image}
                      onChange={(e) => setEditDeploymentData({ ...editDeploymentData, image: e.target.value })}
                      placeholder={t('k8s.imagePlaceholder')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.labels')}</label>
                    <div className="key-value-pairs">
                      {Object.entries(editDeploymentData.labels).map(([key, value], index) => (
                        <div key={index} className="key-value-row">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newLabels = { ...editDeploymentData.labels }
                              delete newLabels[key]
                              newLabels[e.target.value] = value
                              setEditDeploymentData({ ...editDeploymentData, labels: newLabels })
                            }}
                            placeholder={t('k8s.key')}
                          />
                          <span>=</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setEditDeploymentData({
                                ...editDeploymentData,
                                labels: { ...editDeploymentData.labels, [key]: e.target.value }
                              })
                            }}
                            placeholder={t('k8s.value')}
                          />
                          <button
                            className="btn-remove"
                            onClick={() => {
                              const newLabels = { ...editDeploymentData.labels }
                              delete newLabels[key]
                              setEditDeploymentData({ ...editDeploymentData, labels: newLabels })
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn-add"
                        onClick={() => {
                          setEditDeploymentData({
                            ...editDeploymentData,
                            labels: { ...editDeploymentData.labels, '': '' }
                          })
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
                      setShowEditDeploymentModal(false)
                      setEditingDeployment(null)
                      setEditDeploymentData({ replicas: 1, image: '', labels: {}, annotations: {} })
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await api.put(`/k8s/clusters/${id}/namespaces/${editingDeployment.namespace}/deployments/${editingDeployment.name}`, {
                          replicas: editDeploymentData.replicas,
                          image: editDeploymentData.image,
                          labels: editDeploymentData.labels
                        })
                        setShowEditDeploymentModal(false)
                        setEditingDeployment(null)
                        setEditDeploymentData({ replicas: 1, image: '', labels: {}, annotations: {} })
                        // 刷新列表
                        if (selectedWorkloadNamespace) {
                          fetchDeployments(selectedWorkloadNamespace)
                        } else {
                          fetchDeployments()
                        }
                        // 如果正在查看详情，刷新详情
                        if (selectedDeployment && editingDeployment.name === selectedDeployment.name) {
                          await handleDeploymentClick(editingDeployment)
                        }
                      } catch (err) {
                        console.error('更新Deployment失败:', err)
                        setError(err.response?.data?.message || err.message || t('k8s.updateDeploymentFailed'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 伸缩Deployment模态框 */}
          {showScaleDeploymentModal && scalingDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowScaleDeploymentModal(false)
              setScalingDeployment(null)
              setScaleReplicas(1)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.scale')} - {scalingDeployment.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowScaleDeploymentModal(false)
                      setScalingDeployment(null)
                      setScaleReplicas(1)
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('k8s.replicas')}</label>
                    <input
                      type="number"
                      min="0"
                      value={scaleReplicas}
                      onChange={(e) => setScaleReplicas(parseInt(e.target.value) || 0)}
                    />
                    <p className="form-hint">{t('k8s.replicasHint')}</p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowScaleDeploymentModal(false)
                      setScalingDeployment(null)
                      setScaleReplicas(1)
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await api.put(`/k8s/clusters/${id}/namespaces/${scalingDeployment.namespace}/deployments/${scalingDeployment.name}/scale`, {
                          replicas: scaleReplicas
                        })
                        setShowScaleDeploymentModal(false)
                        setScalingDeployment(null)
                        setScaleReplicas(1)
                        // 刷新列表
                        if (selectedWorkloadNamespace) {
                          fetchDeployments(selectedWorkloadNamespace)
                        } else {
                          fetchDeployments()
                        }
                        // 如果正在查看详情，刷新详情
                        if (selectedDeployment && scalingDeployment.name === selectedDeployment.name) {
                          await handleDeploymentClick(scalingDeployment)
                        }
                      } catch (err) {
                        console.error('伸缩Deployment失败:', err)
                        setError(err.response?.data?.message || err.message || t('k8s.scaleDeploymentFailed'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deployment YAML编辑模态框 */}
          {showYamlEditModal && editingDeploymentYaml && (
            <div className="modal-overlay" onClick={() => {
              setShowYamlEditModal(false)
              setEditingDeploymentYaml(null)
              setDeploymentYaml('')
            }}>
              <div className="modal-content yaml-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.yamlEdit')} - {editingDeploymentYaml.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowYamlEditModal(false)
                      setEditingDeploymentYaml(null)
                      setDeploymentYaml('')
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="yaml-warning">
                  <strong>{t('k8s.yamlEditWarning')}</strong>
                  <p>{t('k8s.yamlEditWarningDesc')}</p>
                </div>
                <div className="yaml-editor-container">
                  <textarea
                    className="yaml-editor"
                    value={deploymentYaml}
                    onChange={(e) => setDeploymentYaml(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowYamlEditModal(false)
                      setEditingDeploymentYaml(null)
                      setDeploymentYaml('')
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await api.put(`/k8s/clusters/${id}/namespaces/${editingDeploymentYaml.namespace}/deployments/${editingDeploymentYaml.name}/yaml`, {
                          yaml: deploymentYaml
                        })
                        setShowYamlEditModal(false)
                        setEditingDeploymentYaml(null)
                        setDeploymentYaml('')
                        // 刷新列表
                        if (selectedWorkloadNamespace) {
                          fetchDeployments(selectedWorkloadNamespace)
                        } else {
                          fetchDeployments()
                        }
                      } catch (err) {
                        console.error('更新Deployment YAML失败:', err)
                        setError(err.response?.data?.message || err.message || t('k8s.updateYamlFailed'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 监控模态框 */}
          {showMonitoringModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowMonitoringModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.monitoring')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowMonitoringModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 智能优化模态框 */}
          {showOptimizationModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowOptimizationModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.intelligentOptimization')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowOptimizationModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 节点亲和性模态框 */}
          {showNodeAffinityModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowNodeAffinityModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.nodeAffinity')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowNodeAffinityModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 调度容忍模态框 */}
          {showTolerationModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowTolerationModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.schedulingToleration')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowTolerationModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 资源画像模态框 */}
          {showResourceProfileModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowResourceProfileModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.resourceProfile')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowResourceProfileModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 升级策略模态框 */}
          {showUpgradeStrategyModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowUpgradeStrategyModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.upgradeStrategy')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowUpgradeStrategyModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 复制创建模态框 */}
          {showCloneModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowCloneModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.cloneCreate')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowCloneModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 回滚模态框 */}
          {showRollbackModal && selectedDeployment && (
            <div className="modal-overlay" onClick={() => {
              setShowRollbackModal(false)
              setSelectedDeployment(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.rollback')} - {selectedDeployment.name}</h2>
                  <button className="modal-close" onClick={() => {
                    setShowRollbackModal(false)
                    setSelectedDeployment(null)
                  }}>{t('common.close')}</button>
                </div>
                <div className="modal-body">
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    {t('k8s.featureComingSoon')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 编辑StatefulSet模态框 */}
          {showEditStatefulSetModal && editingStatefulSet && (
            <div className="modal-overlay" onClick={() => {
              setShowEditStatefulSetModal(false)
              setEditingStatefulSet(null)
              setEditStatefulSetData({ replicas: 1, image: '', labels: {}, annotations: {} })
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('common.edit')} - {editingStatefulSet.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowEditStatefulSetModal(false)
                      setEditingStatefulSet(null)
                      setEditStatefulSetData({ replicas: 1, image: '', labels: {}, annotations: {} })
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('k8s.replicas')}</label>
                    <input
                      type="number"
                      min="0"
                      value={editStatefulSetData.replicas}
                      onChange={(e) => setEditStatefulSetData({ ...editStatefulSetData, replicas: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.image')}</label>
                    <input
                      type="text"
                      value={editStatefulSetData.image}
                      onChange={(e) => setEditStatefulSetData({ ...editStatefulSetData, image: e.target.value })}
                      placeholder={t('k8s.imagePlaceholder')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.labels')}</label>
                    <div className="key-value-pairs">
                      {Object.entries(editStatefulSetData.labels).map(([key, value], index) => (
                        <div key={index} className="key-value-row">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newLabels = { ...editStatefulSetData.labels }
                              delete newLabels[key]
                              newLabels[e.target.value] = value
                              setEditStatefulSetData({ ...editStatefulSetData, labels: newLabels })
                            }}
                            placeholder={t('k8s.key')}
                          />
                          <span>=</span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setEditStatefulSetData({
                                ...editStatefulSetData,
                                labels: { ...editStatefulSetData.labels, [key]: e.target.value }
                              })
                            }}
                            placeholder={t('k8s.value')}
                          />
                          <button
                            className="btn-remove"
                            onClick={() => {
                              const newLabels = { ...editStatefulSetData.labels }
                              delete newLabels[key]
                              setEditStatefulSetData({ ...editStatefulSetData, labels: newLabels })
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn-add"
                        onClick={() => {
                          setEditStatefulSetData({
                            ...editStatefulSetData,
                            labels: { ...editStatefulSetData.labels, '': '' }
                          })
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
                      setShowEditStatefulSetModal(false)
                      setEditingStatefulSet(null)
                      setEditStatefulSetData({ replicas: 1, image: '', labels: {}, annotations: {} })
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await api.put(`/k8s/clusters/${id}/namespaces/${editingStatefulSet.namespace}/statefulsets/${editingStatefulSet.name}`, {
                          replicas: editStatefulSetData.replicas,
                          image: editStatefulSetData.image,
                          labels: editStatefulSetData.labels
                        })
                        setShowEditStatefulSetModal(false)
                        setEditingStatefulSet(null)
                        setEditStatefulSetData({ replicas: 1, image: '', labels: {}, annotations: {} })
                        if (selectedWorkloadNamespace) {
                          fetchStatefulSets(selectedWorkloadNamespace)
                        } else {
                          fetchStatefulSets()
                        }
                        if (selectedStatefulSet && editingStatefulSet.name === selectedStatefulSet.name) {
                          await handleStatefulSetClick(editingStatefulSet)
                        }
                      } catch (err) {
                        console.error('更新StatefulSet失败:', err)
                        setError(err.response?.data?.message || err.message || t('k8s.updateStatefulSetFailed'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 伸缩StatefulSet模态框 */}
          {showScaleStatefulSetModal && scalingStatefulSet && (
            <div className="modal-overlay" onClick={() => {
              setShowScaleStatefulSetModal(false)
              setScalingStatefulSet(null)
              setScaleStatefulSetReplicas(1)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.scale')} - {scalingStatefulSet.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowScaleStatefulSetModal(false)
                      setScalingStatefulSet(null)
                      setScaleStatefulSetReplicas(1)
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>{t('k8s.replicas')}</label>
                    <input
                      type="number"
                      min="0"
                      value={scaleStatefulSetReplicas}
                      onChange={(e) => setScaleStatefulSetReplicas(parseInt(e.target.value) || 0)}
                    />
                    <p className="form-hint">{t('k8s.replicasHint')}</p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowScaleStatefulSetModal(false)
                      setScalingStatefulSet(null)
                      setScaleStatefulSetReplicas(1)
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await api.put(`/k8s/clusters/${id}/namespaces/${scalingStatefulSet.namespace}/statefulsets/${scalingStatefulSet.name}/scale`, {
                          replicas: scaleStatefulSetReplicas
                        })
                        setShowScaleStatefulSetModal(false)
                        setScalingStatefulSet(null)
                        setScaleStatefulSetReplicas(1)
                        if (selectedWorkloadNamespace) {
                          fetchStatefulSets(selectedWorkloadNamespace)
                        } else {
                          fetchStatefulSets()
                        }
                        if (selectedStatefulSet && scalingStatefulSet.name === selectedStatefulSet.name) {
                          await handleStatefulSetClick(scalingStatefulSet)
                        }
                      } catch (err) {
                        console.error('伸缩StatefulSet失败:', err)
                        setError(err.response?.data?.message || err.message || t('k8s.scaleStatefulSetFailed'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* StatefulSet YAML编辑模态框 */}
          {showStatefulSetYamlEditModal && editingStatefulSetYaml && (
            <div className="modal-overlay" onClick={() => {
              setShowStatefulSetYamlEditModal(false)
              setEditingStatefulSetYaml(null)
              setStatefulSetYaml('')
            }}>
              <div className="modal-content yaml-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.yamlEdit')} - {editingStatefulSetYaml.name}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowStatefulSetYamlEditModal(false)
                      setEditingStatefulSetYaml(null)
                      setStatefulSetYaml('')
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="yaml-warning">
                  <strong>{t('k8s.yamlEditWarning')}</strong>
                  <p>{t('k8s.yamlEditWarningDesc')}</p>
                </div>
                <div className="yaml-editor-container">
                  <textarea
                    className="yaml-editor"
                    value={statefulSetYaml}
                    onChange={(e) => setStatefulSetYaml(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowStatefulSetYamlEditModal(false)
                      setEditingStatefulSetYaml(null)
                      setStatefulSetYaml('')
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        await api.put(`/k8s/clusters/${id}/namespaces/${editingStatefulSetYaml.namespace}/statefulsets/${editingStatefulSetYaml.name}/yaml`, {
                          yaml: statefulSetYaml
                        })
                        setShowStatefulSetYamlEditModal(false)
                        setEditingStatefulSetYaml(null)
                        setStatefulSetYaml('')
                        if (selectedWorkloadNamespace) {
                          fetchStatefulSets(selectedWorkloadNamespace)
                        } else {
                          fetchStatefulSets()
                        }
                      } catch (err) {
                        console.error('更新StatefulSet YAML失败:', err)
                        setError(err.response?.data?.message || err.message || t('k8s.updateYamlFailed'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 创建/编辑HPA模态框 */}
          {showCreateHpaModal && (
            <div className="modal-overlay" onClick={() => {
              setShowCreateHpaModal(false)
              setEditingHpa(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingHpa ? '编辑HPA' : '创建HPA'}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowCreateHpaModal(false)
                      setEditingHpa(null)
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>名称</label>
                    <input
                      type="text"
                      value={editingHpa?.name || ''}
                      disabled={!!editingHpa}
                      placeholder="HPA名称"
                    />
                  </div>
                  <div className="form-group">
                    <label>目标使用率 (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editingHpa?.targetUsage || 80}
                      placeholder="80"
                    />
                  </div>
                  <div className="form-group">
                    <label>最小副本数</label>
                    <input
                      type="number"
                      min="1"
                      value={editingHpa?.minReplicas || 1}
                    />
                  </div>
                  <div className="form-group">
                    <label>最大副本数</label>
                    <input
                      type="number"
                      min="1"
                      value={editingHpa?.maxReplicas || 10}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateHpaModal(false)
                      setEditingHpa(null)
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      // TODO: 实现创建/更新HPA
                      setShowCreateHpaModal(false)
                      setEditingHpa(null)
                      if (selectedDeployment) {
                        fetchHpaList(selectedDeployment)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 创建/编辑CronHPA模态框 */}
          {showCreateCronHpaModal && (
            <div className="modal-overlay" onClick={() => {
              setShowCreateCronHpaModal(false)
              setEditingCronHpa(null)
            }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingCronHpa ? '编辑CronHPA' : '创建CronHPA'}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      setShowCreateCronHpaModal(false)
                      setEditingCronHpa(null)
                    }}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>名称</label>
                    <input
                      type="text"
                      value={editingCronHpa?.name || ''}
                      disabled={!!editingCronHpa}
                      placeholder="CronHPA名称"
                    />
                  </div>
                  <div className="form-group">
                    <label>任务名称</label>
                    <input
                      type="text"
                      value={editingCronHpa?.taskName || ''}
                      placeholder="任务名称"
                    />
                  </div>
                  <div className="form-group">
                    <label>调度周期 (Cron表达式)</label>
                    <input
                      type="text"
                      value={editingCronHpa?.schedule || ''}
                      placeholder="0 0 * * *"
                    />
                  </div>
                  <div className="form-group">
                    <label>目标副本数</label>
                    <input
                      type="number"
                      min="0"
                      value={editingCronHpa?.targetReplicas || 0}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateCronHpaModal(false)
                      setEditingCronHpa(null)
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      // TODO: 实现创建/更新CronHPA
                      setShowCreateCronHpaModal(false)
                      setEditingCronHpa(null)
                      if (selectedDeployment) {
                        fetchCronHpaList(selectedDeployment)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('common.save')}
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
