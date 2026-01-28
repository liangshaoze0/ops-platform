import { useState, useEffect } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import { useAuth } from '../contexts/AuthContext'
import './RoleManagement.css'

const RoleManagement = () => {
  const { user, logout } = useAuth()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await api.get('/roles')
      setRoles(response.data.data || [])
    } catch (err) {
      console.error('获取角色列表失败:', err)
      setError('获取角色列表失败')
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
            <h1>角色管理</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>角色名称</th>
                    <th>显示名称</th>
                    <th>描述</th>
                    <th>权限</th>
                    <th>系统角色</th>
                    <th>创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-state">
                        暂无角色数据
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <tr key={role.id}>
                        <td>{role.id}</td>
                        <td>
                          <span className="role-name">{role.name}</span>
                        </td>
                        <td>{role.display_name || '-'}</td>
                        <td>{role.description || '-'}</td>
                        <td>
                          <span className="permissions-badge">
                            {role.permissions ? '已配置' : '未配置'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${role.is_system ? 'system' : 'custom'}`}>
                            {role.is_system ? '系统' : '自定义'}
                          </span>
                        </td>
                        <td>{new Date(role.created_at).toLocaleString('zh-CN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default RoleManagement
