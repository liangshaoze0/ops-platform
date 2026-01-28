import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './K8sManagement.css'

const K8sManagement = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCluster, setEditingCluster] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'local',
    description: '',
    api_server: '',
    config: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    fetchClusters()
  }, [currentPage, pageSize])

  const fetchClusters = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: currentPage,
        page_size: pageSize,
      }
      const response = await api.get('/k8s/clusters', {
        params,
      })
      const data = response.data.data || response.data
      if (data.data) {
        // 新格式：{ data: [...], total: ..., page: ..., page_size: ... }
        setClusters(data.data)
        setTotalItems(data.total || 0)
      } else {
        // 旧格式：直接是数组
        setClusters(Array.isArray(data) ? data : [])
        setTotalItems(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取集群列表失败:', err)
      const errorMessage = err.response?.data?.message || err.message || t('k8s.fetchFailed')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // 验证必填字段
    if (!formData.name || !formData.type || !formData.api_server || !formData.config) {
      setError('请填写所有必填字段')
      return
    }

    try {
      if (editingCluster) {
        // 更新集群
        console.log('更新集群数据:', formData)
        await api.put(`/k8s/clusters/${editingCluster.id}`, formData)
        setSuccess(t('k8s.updateSuccess'))
      } else {
        // 创建集群
        console.log('创建集群数据:', formData)
        await api.post('/k8s/clusters', formData)
        setSuccess(t('k8s.createSuccess'))
      }
      setShowAddModal(false)
      setShowEditModal(false)
      setEditingCluster(null)
      setFormData({
        name: '',
        type: 'local',
        description: '',
        api_server: '',
        config: '',
      })
      fetchClusters()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || t('k8s.operationFailed')
      setError(errorMessage)
      console.error('操作失败:', err.response?.data || err)
    }
  }

  const handleEdit = (cluster) => {
    setEditingCluster(cluster)
    setFormData({
      name: cluster.name,
      type: cluster.type,
      description: cluster.description || '',
      api_server: cluster.api_server,
      config: '', // 不显示原有配置，需要重新输入
    })
    setShowEditModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('k8s.confirmDelete'))) {
      return
    }

    try {
      await api.delete(`/k8s/clusters/${id}`)
      setSuccess(t('k8s.deleteSuccess'))
      fetchClusters()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.deleteFailed'))
    }
  }

  const handleTestConnection = async (id) => {
    try {
      const response = await api.post(`/k8s/clusters/${id}/test`)
      if (response.data.data.status === 'connected') {
        setSuccess(t('k8s.connectionSuccess'))
      } else {
        setError(t('k8s.connectionFailed'))
      }
      fetchClusters()
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 3000)
    } catch (err) {
      setError(err.response?.data?.message || t('k8s.testFailed'))
    }
  }

  const getTypeLabel = (type) => {
    const typeMap = {
      local: t('k8s.typeLocal'),
      aliyun: t('k8s.typeAliyun'),
      tencent: t('k8s.typeTencent'),
      mobile: t('k8s.typeMobile'),
    }
    return typeMap[type] || type
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      connected: 'status-connected',
      disconnected: 'status-disconnected',
      error: 'status-error',
      unknown: 'status-unknown',
    }
    return statusMap[status] || 'status-unknown'
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
            <h1>{t('k8s.title')}</h1>
            <button
              className="btn-primary"
              onClick={() => {
                setShowAddModal(true)
                setFormData({
                  name: '',
                  type: 'local',
                  description: '',
                  api_server: '',
                  config: '',
                })
              }}
            >
              {t('k8s.addCluster')}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="loading">{t('common.loading')}</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('k8s.name')}</th>
                    <th>{t('k8s.type')}</th>
                    <th>{t('k8s.apiServer')}</th>
                    <th>{t('k8s.status')}</th>
                    <th>{t('k8s.description')}</th>
                    <th>{t('k8s.createdAt')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        {t('k8s.noClusters')}
                      </td>
                    </tr>
                  ) : (
                    clusters.map((cluster) => (
                      <tr key={cluster.id}>
                        <td>
                          <a
                            href={`/k8s/cluster/${cluster.id}?tab=info`}
                            className="cluster-name-link"
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(`/k8s/cluster/${cluster.id}?tab=info`)
                            }}
                          >
                            {cluster.name}
                          </a>
                        </td>
                        <td>
                          <span className={`type-badge type-${cluster.type}`}>
                            {getTypeLabel(cluster.type)}
                          </span>
                        </td>
                        <td className="api-server-cell">{cluster.api_server}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadge(cluster.status)}`}>
                            {cluster.status}
                          </span>
                        </td>
                        <td className="description-cell">
                          {cluster.description || '-'}
                        </td>
                        <td>
                          {new Date(cluster.created_at).toLocaleDateString()}
                        </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-text btn-test"
                                onClick={() => handleTestConnection(cluster.id)}
                                title={t('k8s.testConnection')}
                              >
                                {t('k8s.testConnection')}
                              </button>
                              <button
                                className="btn-text btn-edit"
                                onClick={() => handleEdit(cluster)}
                                title={t('common.edit')}
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                className="btn-text btn-delete"
                                onClick={() => handleDelete(cluster.id)}
                                title={t('common.delete')}
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && clusters.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / pageSize)}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize)
                setCurrentPage(1)
              }}
            />
          )}

          {/* 添加集群模态框 */}
          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.addCluster')}</h2>
                  <button
                    className="modal-close"
                    onClick={() => setShowAddModal(false)}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>{t('k8s.name')} *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.type')} *</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="local">{t('k8s.typeLocal')}</option>
                      <option value="aliyun">{t('k8s.typeAliyun')}</option>
                      <option value="tencent">{t('k8s.typeTencent')}</option>
                      <option value="mobile">{t('k8s.typeMobile')}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.apiServer')} *</label>
                    <input
                      type="text"
                      name="api_server"
                      value={formData.api_server}
                      onChange={handleInputChange}
                      placeholder="https://kubernetes.example.com:6443"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.config')} *</label>
                    <textarea
                      name="config"
                      value={formData.config}
                      onChange={handleInputChange}
                      rows="10"
                      placeholder={t('k8s.configPlaceholder')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.description')}</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAddModal(false)}
                    >
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="btn-primary">
                      {t('common.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 编辑集群模态框 */}
          {showEditModal && (
            <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('k8s.editCluster')}</h2>
                  <button
                    className="modal-close"
                    onClick={() => setShowEditModal(false)}
                  >
                    {t('common.close')}
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>{t('k8s.name')} *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.type')} *</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="local">{t('k8s.typeLocal')}</option>
                      <option value="aliyun">{t('k8s.typeAliyun')}</option>
                      <option value="tencent">{t('k8s.typeTencent')}</option>
                      <option value="mobile">{t('k8s.typeMobile')}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.apiServer')} *</label>
                    <input
                      type="text"
                      name="api_server"
                      value={formData.api_server}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.config')} *</label>
                    <textarea
                      name="config"
                      value={formData.config}
                      onChange={handleInputChange}
                      rows="10"
                      placeholder={t('k8s.configPlaceholder')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('k8s.description')}</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowEditModal(false)}
                    >
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="btn-primary">
                      {t('common.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default K8sManagement
