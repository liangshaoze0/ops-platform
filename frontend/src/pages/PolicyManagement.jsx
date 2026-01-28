import { useState, useEffect } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './SecurityManagement.css'

const PolicyManagement = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    policy_type: 'access',
    rules: '',
    enabled: true,
  })

  useEffect(() => {
    fetchPolicies()
  }, [currentPage, pageSize])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/security/policies', {
        params: {
          page: currentPage,
          page_size: pageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setPolicies(data.data)
        setTotalItems(data.total || 0)
      } else {
        setPolicies(Array.isArray(data) ? data : [])
        setTotalItems(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取策略列表失败:', err)
      const errorMessage = err.response?.data?.message || err.message || '获取策略列表失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.post('/security/policies', formData)
      setSuccess('策略创建成功')
      setShowAddModal(false)
      setFormData({
        name: '',
        description: '',
        policy_type: 'access',
        rules: '',
        enabled: true,
      })
      fetchPolicies()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || '操作失败'
      setError(errorMessage)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个策略吗？')) {
      return
    }

    try {
      await api.delete(`/security/policies/${id}`)
      setSuccess('策略删除成功')
      fetchPolicies()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || '删除失败')
    }
  }

  const togglePolicy = async (id, enabled) => {
    try {
      await api.put(`/security/policies/${id}`, { enabled: !enabled })
      setSuccess('策略状态更新成功')
      fetchPolicies()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || '更新失败')
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
            <h1>策略管理</h1>
            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              添加策略
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>类型</th>
                    <th>描述</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        暂无策略数据
                      </td>
                    </tr>
                  ) : (
                    policies.map((policy) => (
                      <tr key={policy.id}>
                        <td>{policy.name}</td>
                        <td>{policy.policy_type || '-'}</td>
                        <td>{policy.description || '-'}</td>
                        <td>
                          <button
                            className={`btn-text ${policy.enabled ? 'btn-active' : 'btn-inactive'}`}
                            onClick={() => togglePolicy(policy.id, policy.enabled)}
                          >
                            {policy.enabled ? '启用' : '禁用'}
                          </button>
                        </td>
                        <td>{new Date(policy.created_at).toLocaleString('zh-CN')}</td>
                        <td>
                          <button
                            className="btn-text btn-delete"
                            onClick={() => handleDelete(policy.id)}
                            title="删除"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && policies.length > 0 && (
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

          {/* 添加策略模态框 */}
          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>添加策略</h2>
                  <button
                    className="modal-close"
                    onClick={() => setShowAddModal(false)}
                  >
                    关闭
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>策略名称 *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>策略类型 *</label>
                    <select
                      name="policy_type"
                      value={formData.policy_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="access">访问控制</option>
                      <option value="network">网络策略</option>
                      <option value="resource">资源策略</option>
                      <option value="security">安全策略</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>描述</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>规则 (JSON格式) *</label>
                    <textarea
                      name="rules"
                      value={formData.rules}
                      onChange={handleInputChange}
                      rows="10"
                      placeholder='{"allow": ["GET", "POST"], "deny": ["DELETE"]}'
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        name="enabled"
                        checked={formData.enabled}
                        onChange={handleInputChange}
                      />
                      启用策略
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowAddModal(false)}
                    >
                      取消
                    </button>
                    <button type="submit" className="btn-primary">
                      保存
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

export default PolicyManagement
