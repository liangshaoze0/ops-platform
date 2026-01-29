import { useState, useEffect } from 'react'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import UserProfile from '../components/UserProfile'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './Preferences.css'

const Preferences = () => {
  const { user, logout } = useAuth()
  const { language, changeLanguage, t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState({
    language: 'zh-CN',
    theme: 'light',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchPreferences()
  }, [])

  // 应用主题
  useEffect(() => {
    applyTheme(preferences.theme)
  }, [preferences.theme])

  const fetchPreferences = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('请先登录')
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const response = await api.get('/preference')
      if (response.data.data) {
        const fetchedLanguage = response.data.data.language || 'zh-CN'
        setPreferences({
          language: fetchedLanguage,
          theme: response.data.data.theme || 'light',
        })
        // 应用获取到的语言设置
        if (fetchedLanguage !== language) {
          changeLanguage(fetchedLanguage)
        }
      }
    } catch (err) {
      console.error('获取偏好设置失败:', err)
      if (err.response?.status === 401) {
        setError('未授权，请重新登录')
      } else {
        setError(err.response?.data?.message || '获取偏好设置失败')
      }
      // 如果获取失败，使用默认值
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = (theme) => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark-theme')
      root.classList.remove('light-theme')
    } else if (theme === 'light') {
      root.classList.add('light-theme')
      root.classList.remove('dark-theme')
    } else {
      // auto - 根据系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark-theme')
        root.classList.remove('light-theme')
      } else {
        root.classList.add('light-theme')
        root.classList.remove('dark-theme')
      }
    }
  }

  const handleChange = (field, value) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await api.put('/preference', preferences)
      // 立即应用语言更改
      if (preferences.language) {
        changeLanguage(preferences.language)
      }
      setSuccess(t('preferences.saved'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const languageOptions = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en-US', label: 'English' },
  ]

  const themeOptions = [
    { value: 'light', label: t('preferences.themeLight'), icon: '☀️' },
    { value: 'dark', label: t('preferences.themeDark'), icon: '🌙' },
    { value: 'auto', label: t('preferences.themeAuto'), icon: '🔄' },
  ]

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
            <h1>{t('preferences.title')}</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="loading">{t('common.loading')}</div>
          ) : (
            <div className="preferences-container">
              {/* 语言设置 */}
              <div className="preference-section">
                <div className="section-header">
                  <h2>{t('preferences.language')}</h2>
                  <p className="section-description">{t('preferences.languageDesc')}</p>
                </div>
                <div className="option-group">
                  {languageOptions.map((option) => (
                    <label key={option.value} className="option-item">
                      <input
                        type="radio"
                        name="language"
                        value={option.value}
                        checked={preferences.language === option.value}
                        onChange={(e) => handleChange('language', e.target.value)}
                      />
                      <span className="option-label">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 主题设置 */}
              <div className="preference-section">
                <div className="section-header">
                  <h2>{t('preferences.theme')}</h2>
                  <p className="section-description">{t('preferences.themeDesc')}</p>
                </div>
                <div className="option-group theme-group">
                  {themeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`option-item theme-option ${preferences.theme === option.value ? 'active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={preferences.theme === option.value}
                        onChange={(e) => handleChange('theme', e.target.value)}
                      />
                      <div className="theme-option-content">
                        <span className="theme-icon">{option.icon}</span>
                        <span className="option-label">{option.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="preference-actions">
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t('preferences.saving') : t('preferences.saveSettings')}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Preferences
