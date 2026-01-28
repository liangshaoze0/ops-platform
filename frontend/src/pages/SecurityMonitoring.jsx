import { useState, useEffect } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './SecurityManagement.css'

const SecurityMonitoring = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  })

  useEffect(() => {
    fetchAlerts()
    fetchStats()
    // 自动刷新已关闭
    // const interval = setInterval(() => {
    //   fetchAlerts()
    //   fetchStats()
    // }, 30000)
    // return () => clearInterval(interval)
  }, [currentPage, pageSize])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/security/monitoring/alerts', {
        params: {
          page: currentPage,
          page_size: pageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setAlerts(data.data)
        setTotalItems(data.total || 0)
      } else {
        setAlerts(Array.isArray(data) ? data : [])
        setTotalItems(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取安全告警失败:', err)
      const errorMessage = err.response?.data?.message || err.message || '获取安全告警失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/security/monitoring/stats')
      if (response.data.data) {
        setStats(response.data.data)
      }
    } catch (err) {
      console.error('获取统计信息失败:', err)
    }
  }

  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/security/monitoring/alerts/${id}/acknowledge`)
      fetchAlerts()
      fetchStats()
    } catch (err) {
      setError(err.response?.data?.message || '操作失败')
    }
  }

  const getSeverityBadge = (severity) => {
    const severityMap = {
      critical: 'status-error',
      high: 'status-error',
      medium: 'status-warning',
      low: 'status-connected',
    }
    return severityMap[severity] || 'status-unknown'
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
            <h1>安全监控</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* 统计卡片 */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">总告警数</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card stat-critical">
              <div className="stat-label">严重</div>
              <div className="stat-value">{stats.critical}</div>
            </div>
            <div className="stat-card stat-high">
              <div className="stat-label">高</div>
              <div className="stat-value">{stats.high}</div>
            </div>
            <div className="stat-card stat-medium">
              <div className="stat-label">中</div>
              <div className="stat-value">{stats.medium}</div>
            </div>
            <div className="stat-card stat-low">
              <div className="stat-label">低</div>
              <div className="stat-value">{stats.low}</div>
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
                    <th>告警类型</th>
                    <th>严重程度</th>
                    <th>描述</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        暂无安全告警
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr key={alert.id}>
                        <td>{alert.id}</td>
                        <td>{alert.alert_type || '-'}</td>
                        <td>
                          <span className={`status-badge ${getSeverityBadge(alert.severity)}`}>
                            {alert.severity || '-'}
                          </span>
                        </td>
                        <td>{alert.description || '-'}</td>
                        <td>
                          <span className={`status-badge ${alert.acknowledged ? 'status-connected' : 'status-error'}`}>
                            {alert.acknowledged ? '已确认' : '未确认'}
                          </span>
                        </td>
                        <td>{new Date(alert.created_at).toLocaleString('zh-CN')}</td>
                        <td>
                          {!alert.acknowledged && (
                            <button
                              className="btn-text btn-edit"
                              onClick={() => handleAcknowledge(alert.id)}
                              title="确认"
                            >
                              确认
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && alerts.length > 0 && (
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

export default SecurityMonitoring
