import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Login.css'

const Register = () => {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    setLoading(true)

    try {
      await register(formData)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="animated-bg"></div>
      </div>
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <h1>DevOps自动化运维平台</h1>
            <p>创建新账号</p>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">用户名 *</label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="请输入用户名（3-50个字符）"
                required
                minLength={3}
                maxLength={50}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">邮箱 *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="请输入邮箱地址"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="name">姓名</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="请输入姓名（可选）"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">密码 *</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="请输入密码（至少6位）"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码 *</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="请再次输入密码"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
          <div className="login-footer">
            <p>
              已有账号？<Link to="/login">立即登录</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
