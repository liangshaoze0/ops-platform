import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import UserProfile from '../components/UserProfile'
import Sidebar from '../components/Sidebar'
import './Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()

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
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>{t('dashboard.userInfo')}</h2>
              {user && (
                <div className="user-info">
                  <img
                    src={user.avatar_url || '/default-avatar.png'}
                    alt={user.username}
                    className="user-avatar-large"
                  />
                  <div className="user-details">
                    <h3>{user.name || user.username}</h3>
                    <p className="username">@{user.username}</p>
                    {user.email && <p className="email">{user.email}</p>}
                    {user.bio && <p className="bio">{user.bio}</p>}
                    {user.company && (
                      <p className="company">🏢 {user.company}</p>
                    )}
                    {user.location && (
                      <p className="location">📍 {user.location}</p>
                    )}
                    {user.github_url && (
                      <a
                        href={user.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-link"
                      >
                        {t('dashboard.viewGitHub')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
