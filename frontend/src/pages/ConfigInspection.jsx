import { useState, useEffect } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './SecurityManagement.css'

const ConfigInspection = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchInspections()
  }, [currentPage, pageSize])

  const fetchInspections = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/security/inspections', {
        params: {
          page: currentPage,
          page_size: pageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        setInspections(data.data)
        setTotalItems(data.total || 0)
      } else {
        setInspections(Array.isArray(data) ? data : [])
        setTotalItems(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取配置巡检列表失败:', err)
      const errorMessage = err.response?.data?.message || err.message || '获取配置巡检列表失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const runInspection = async () => {
    try {
      setRunning(true)
      setError('')
      await api.post('/security/inspections/run')
      setRunning(false)
      fetchInspections()
    } catch (err) {
      setRunning(false)
      setError(err.response?.data?.message || '执行巡检失败')
    }
  }

  const getSeverityBadge = (severity) => {
    const severityMap = {
      critical: 'status-error',
      high: 'status-error',
      medium: 'status-warning',
      low: 'status-connected',
      info: 'status-unknown',
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
            <h1>配置巡检</h1>
            <button
              className="btn-primary"
              onClick={runInspection}
              disabled={running}
            >
              {running ? '执行中...' : '执行巡检'}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>检查项</th>
                    <th>资源类型</th>
                    <th>资源名称</th>
                    <th>严重程度</th>
                    <th>状态</th>
                    <th>检查时间</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        暂无配置巡检数据
                      </td>
                    </tr>
                  ) : (
                    inspections.map((inspection) => (
                      <tr key={inspection.id}>
                        <td>{inspection.id}</td>
                        <td>{inspection.check_item || '-'}</td>
                        <td>{inspection.resource_type || '-'}</td>
                        <td>{inspection.resource_name || '-'}</td>
                        <td>
                          <span className={`status-badge ${getSeverityBadge(inspection.severity)}`}>
                            {inspection.severity || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${inspection.status === 'passed' ? 'status-connected' : 'status-error'}`}>
                            {inspection.status === 'passed' ? '通过' : '失败'}
                          </span>
                        </td>
                        <td>{new Date(inspection.created_at).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && inspections.length > 0 && (
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

export default ConfigInspection
