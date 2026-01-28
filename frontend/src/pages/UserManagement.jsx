import { useState, useEffect } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import Pagination from '../components/Pagination'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './UserManagement.css'

const UserManagement = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role_id: '',
    is_active: true,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [currentPage, pageSize])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users', {
        params: {
          page: currentPage,
          page_size: pageSize,
        },
      })
      const data = response.data.data || response.data
      if (data.data) {
        // 新格式：{ data: [...], total: ..., page: ..., page_size: ... }
        setUsers(data.data)
        setTotalItems(data.total || 0)
      } else {
        // 旧格式：直接是数组
        setUsers(Array.isArray(data) ? data : [])
        setTotalItems(Array.isArray(data) ? data.length : 0)
      }
    } catch (err) {
      console.error('获取用户列表失败:', err)
      setError('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles')
      setRoles(response.data.data || [])
    } catch (err) {
      console.error('获取角色列表失败:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      // 准备提交数据
      const submitData = {}
      
      if (editingUser) {
        // 编辑模式：只发送有变化的字段
        if (formData.username) submitData.username = formData.username
        if (formData.email) submitData.email = formData.email
        if (formData.name !== undefined) submitData.name = formData.name
        if (formData.is_active !== undefined) submitData.is_active = formData.is_active
        // 只有填写了密码才更新密码
        if (formData.password) {
          submitData.password = formData.password
        }
        // 角色ID：如果为空字符串，发送0表示删除角色；如果有值，发送该值
        if (formData.role_id === '' || formData.role_id === null) {
          submitData.role_id = 0
        } else if (formData.role_id) {
          submitData.role_id = parseInt(formData.role_id, 10)
        }
      } else {
        // 创建模式：发送所有字段
        submitData.username = formData.username
        submitData.email = formData.email
        submitData.password = formData.password
        submitData.name = formData.name
        submitData.is_active = formData.is_active
        // 只有当 role_id 有值时才添加，并转换为数字
        if (formData.role_id && formData.role_id !== '') {
          submitData.role_id = parseInt(formData.role_id, 10)
        }
      }

      if (editingUser) {
        // 更新用户
        await api.put(`/users/${editingUser.id}`, submitData)
        setSuccess(t('users.updateSuccess'))
        setShowEditModal(false)
      } else {
        // 创建用户
        await api.post('/users', submitData)
        setSuccess(t('users.createSuccess'))
        setShowAddModal(false)
      }
      
      setEditingUser(null)
      setFormData({
        username: '',
        email: '',
        password: '',
        name: '',
        role_id: '',
        is_active: true,
      })
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || (editingUser ? t('users.updateFailed') : t('users.createFailed')))
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    // 获取用户的角色ID
    const userRoleId = user.user_roles && user.user_roles.length > 0 ? user.user_roles[0].role_id : ''
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '', // 编辑时不显示密码
      name: user.name || '',
      role_id: userRoleId || '',
      is_active: user.is_active !== undefined ? user.is_active : true,
    })
    setShowEditModal(true)
  }

  const handleDelete = async (userId) => {
    if (!window.confirm(t('users.confirmDelete'))) {
      return
    }

    try {
      await api.delete(`/users/${userId}`)
      setSuccess(t('users.deleteSuccess'))
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || t('users.deleteFailed'))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
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
            <h1>{t('users.title')}</h1>
            <button
              className="btn-primary"
              onClick={() => {
                setShowAddModal(true)
                setEditingUser(null)
                setFormData({
                  username: '',
                  email: '',
                  password: '',
                  name: '',
                  role_id: '',
                  is_active: true,
                })
              }}
            >
              {t('users.addUser')}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="loading">{t('common.loading')}</div>
          ) : (
            <div className="table-container">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>头像</th>
                      <th>用户名</th>
                      <th>邮箱</th>
                      <th>姓名</th>
                      <th>简介</th>
                      <th>{t('users.role')}</th>
                      <th>{t('users.status')}</th>
                      <th>{t('users.createdAt')}</th>
                      <th>{t('users.updatedAt')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="empty-state">
                          {t('users.noUsers')}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.username}
                                className="user-avatar-small"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'inline-block'
                                }}
                              />
                            ) : null}
                            <span className="avatar-placeholder" style={{ display: u.avatar_url ? 'none' : 'inline-block' }}>
                              {u.username?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </td>
                          <td>{u.username}</td>
                          <td>{u.email || '-'}</td>
                          <td>{u.name || '-'}</td>
                          <td className="bio-cell">
                            {u.bio ? (
                              <span title={u.bio}>{u.bio.length > 30 ? `${u.bio.substring(0, 30)}...` : u.bio}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            {u.user_roles && u.user_roles.length > 0
                              ? u.user_roles.map((ur) => ur.role?.display_name || ur.role?.name).join(', ')
                              : '-'}
                          </td>
                          <td>
                            <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                              {u.is_active ? t('users.active') : t('users.inactive')}
                            </span>
                          </td>
                          <td>{new Date(u.created_at).toLocaleString('zh-CN')}</td>
                          <td>{new Date(u.updated_at).toLocaleString('zh-CN')}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-text btn-edit"
                                onClick={() => handleEdit(u)}
                                title={t('common.edit')}
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                className="btn-text btn-delete"
                                onClick={() => handleDelete(u.id)}
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
            </div>
          )}

          {!loading && users.length > 0 && (
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

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('users.addUser')}</h2>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                {t('common.close')}
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>{t('users.username')} *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder={t('users.usernamePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('users.email')} *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder={t('users.emailPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('users.password')} {!editingUser && '*'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                  placeholder={editingUser ? t('users.passwordPlaceholderEdit') : t('users.passwordPlaceholder')}
                />
                {editingUser && (
                  <small className="form-hint">{t('users.passwordHint')}</small>
                )}
              </div>
              <div className="form-group">
                <label>{t('users.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('users.namePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('users.role')}</label>
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleInputChange}
                >
                  <option value="">{t('users.selectRole')}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name || role.name}
                    </option>
                  ))}
                </select>
              </div>
              {editingUser && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    {' '}{t('users.isActive')}
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingUser(null)
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? t('common.save') : t('users.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false)
          setEditingUser(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('users.editUser')}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
              >
                {t('common.close')}
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>{t('users.username')} *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder={t('users.usernamePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('users.email')} *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder={t('users.emailPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('users.password')}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('users.passwordPlaceholderEdit')}
                />
                <small className="form-hint">{t('users.passwordHint')}</small>
              </div>
              <div className="form-group">
                <label>{t('users.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('users.namePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('users.role')}</label>
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleInputChange}
                >
                  <option value="">{t('users.selectRole')}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name || role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  {' '}{t('users.isActive')}
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                  }}
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
    </div>
  )
}

export default UserManagement
