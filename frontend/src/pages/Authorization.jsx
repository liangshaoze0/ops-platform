import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './SecurityManagement.css'

const Authorization = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [authorizations, setAuthorizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    user_id: '',
    resource: '',
    action: '',
    effect: 'allow',
  })

  useEffect(() => {
    fetchAuthorizations()
  }, [currentPage, pageSize])

  const fetchAuthorizations = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/security/authorizations', {
        params: {
          page: currentPage,
          page_size: pageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setAuthorizations(data.data)
        setTotalItems(data.total || 0)
      } else {
        setAuthorizations(Array.isArray(data) ? data : [])
        setTotalItems(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取授权列表失败:', err)
      const errorMessage = err.response?.data?.message || err.message || '获取授权列表失败'
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

    try {
      await api.post('/security/authorizations', formData)
      setSuccess('授权创建成功')
      setShowAddModal(false)
      setFormData({
        user_id: '',
        resource: '',
        action: '',
        effect: 'allow',
      })
      fetchAuthorizations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || '操作失败'
      setError(errorMessage)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个授权吗？')) {
      return
    }

    try {
      await api.delete(`/security/authorizations/${id}`)
      setSuccess('授权删除成功')
      fetchAuthorizations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || '删除失败')
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
            <h1>授权管理</h1>
            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              添加授权
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
                    <th>用户ID</th>
                    <th>资源</th>
                    <th>操作</th>
                    <th>效果</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {authorizations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        暂无授权数据
                      </td>
                    </tr>
                  ) : (
                    authorizations.map((auth) => (
                      <tr key={auth.id}>
                        <td>{auth.user_id}</td>
                        <td>{auth.resource}</td>
                        <td>{auth.action}</td>
                        <td>
                          <span className={`status-badge ${auth.effect === 'allow' ? 'status-connected' : 'status-error'}`}>
                            {auth.effect === 'allow' ? '允许' : '拒绝'}
                          </span>
                        </td>
                        <td>{new Date(auth.created_at).toLocaleString('zh-CN')}</td>
                        <td>
                          <button
                            className="btn-text btn-delete"
                            onClick={() => handleDelete(auth.id)}
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

          {!loading && authorizations.length > 0 && (
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

          {/* 添加授权模态框 */}
          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>添加授权</h2>
                  <button
                    className="modal-close"
                    onClick={() => setShowAddModal(false)}
                  >
                    关闭
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>用户ID *</label>
                    <input
                      type="number"
                      name="user_id"
                      value={formData.user_id}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>资源 *</label>
                    <input
                      type="text"
                      name="resource"
                      value={formData.resource}
                      onChange={handleInputChange}
                      placeholder="例如: /api/users"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>操作 *</label>
                    <select
                      name="action"
                      value={formData.action}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">请选择</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="*">全部</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>效果 *</label>
                    <select
                      name="effect"
                      value={formData.effect}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="allow">允许</option>
                      <option value="deny">拒绝</option>
                    </select>
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

export default Authorization
