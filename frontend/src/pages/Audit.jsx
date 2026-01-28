import { useState, useEffect } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './SecurityManagement.css'

const Audit = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    username: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    fetchLogs()
  }, [currentPage, pageSize, filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: currentPage,
        page_size: pageSize,
        ...filters,
      }
      // 移除空值
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key]
        }
      })
      const response = await api.get('/audit/logs', { params })
      const data = response.data.data || response.data
      if (data.logs) {
        setLogs(data.logs)
        setTotalItems(data.total || 0)
      } else {
        setLogs(Array.isArray(data) ? data : [])
        setTotalItems(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取审计日志失败:', err)
      const errorMessage = err.response?.data?.message || err.message || '获取审计日志失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      action: '',
      resource: '',
      username: '',
      start_date: '',
      end_date: '',
    })
    setCurrentPage(1)
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
            <h1>审计日志</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* 筛选器 */}
          <div className="filter-section">
            <div className="filter-row">
              <div className="filter-group">
                <label>操作类型</label>
                <input
                  type="text"
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                  placeholder="例如: GET, POST"
                />
              </div>
              <div className="filter-group">
                <label>资源</label>
                <input
                  type="text"
                  name="resource"
                  value={filters.resource}
                  onChange={handleFilterChange}
                  placeholder="例如: /api/users"
                />
              </div>
              <div className="filter-group">
                <label>用户名</label>
                <input
                  type="text"
                  name="username"
                  value={filters.username}
                  onChange={handleFilterChange}
                  placeholder="搜索用户名"
                />
              </div>
              <div className="filter-group">
                <label>开始日期</label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="filter-group">
                <label>结束日期</label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="filter-actions">
                <button className="btn-secondary" onClick={clearFilters}>
                  清除
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>用户名</th>
                    <th>操作</th>
                    <th>资源</th>
                    <th>IP地址</th>
                    <th>状态</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        暂无审计日志
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{log.username || '-'}</td>
                        <td>{log.action || '-'}</td>
                        <td>{log.resource || '-'}</td>
                        <td>{log.ip_address || '-'}</td>
                        <td>
                          <span className={`status-badge ${log.status_code >= 200 && log.status_code < 300 ? 'status-connected' : 'status-error'}`}>
                            {log.status_code || '-'}
                          </span>
                        </td>
                        <td>{new Date(log.created_at).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && logs.length > 0 && (
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
        </main>
      </div>
    </div>
  )
}

export default Audit
