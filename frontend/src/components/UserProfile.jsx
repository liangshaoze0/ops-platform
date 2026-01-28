import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import './UserProfile.css'

const UserProfile = ({ user, onLogout }) => {
  const { t } = useLanguage()
  const [showMenu, setShowMenu] = useState(false)

  if (!user) return null

  return (
    <div className="user-profile">
      <div
        className="user-profile-trigger"
        onClick={() => setShowMenu(!showMenu)}
      >
        <img
          src={user.avatar_url || '/default-avatar.png'}
          alt={user.username}
          className="user-avatar"
        />
        <span className="username">{user.username}</span>
        <svg
          className="dropdown-icon"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showMenu && (
        <>
          <div
            className="menu-overlay"
            onClick={() => setShowMenu(false)}
          ></div>
          <div className="user-menu">
            <div className="menu-item">
              <strong>{user.name || user.username}</strong>
              <span className="menu-email">{user.email}</span>
            </div>
            <div className="menu-divider"></div>
            <Link
              to="/preferences"
              className="menu-item menu-link"
              onClick={() => setShowMenu(false)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 2V4M10 16V18M18 10H16M4 10H2M15.6569 4.34315L14.2426 5.75736M5.75736 14.2426L4.34315 15.6569M15.6569 15.6569L14.2426 14.2426M5.75736 5.75736L4.34315 4.34315"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('nav.preferences')}
            </Link>
            <div className="menu-divider"></div>
            <button className="menu-item logout-btn" onClick={onLogout}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M6 14H3a2 2 0 01-2-2V4a2 2 0 012-2h3M10 12l4-4-4-4M14 8H6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('nav.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default UserProfile
