import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()
  const { t } = useLanguage()
  const [expandedMenus, setExpandedMenus] = useState({})
  const [expandedSubMenus, setExpandedSubMenus] = useState({})
  
  // 从路径中提取集群ID（/k8s/cluster/:id）
  const clusterIdMatch = location.pathname.match(/\/k8s\/cluster\/([^\/]+)/)
  const clusterId = clusterIdMatch ? clusterIdMatch[1] : null

  const menuItems = [
    {
      path: '/dashboard',
      label: t('nav.dashboard'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3H9V9H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M11 3H17V9H11V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 11H9V17H3V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M11 11H17V17H11V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: t('nav.menuManagement'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3H17V5H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 7H17V9H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 11H17V13H3V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 15H17V17H3V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      children: [
        {
          path: '/users',
          label: t('nav.userManagement'),
          icon: (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 12C5.58172 12 2 14.6863 2 18V20H18V18C18 14.6863 14.4183 12 10 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
        },
        {
          path: '/roles',
          label: t('nav.roleManagement'),
          icon: (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L3 7V17H8V12H12V17H17V7L10 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
        },
      ],
    },
    {
      label: t('nav.k8sManagement'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2L3 7V17H7V12H13V17H17V7L10 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      children: [
        {
          path: '/k8s',
          label: t('nav.k8sClusterManagement'),
          icon: (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L3 7V17H7V12H13V17H17V7L10 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ),
          children: clusterId ? [
            {
              path: `/k8s/cluster/${clusterId}?tab=info`,
              label: t('k8s.clusterInfo'),
              tab: 'info',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=nodes`,
              label: t('k8s.nodeManagement'),
              tab: 'nodes',
              children: [
                {
                  path: `/k8s/cluster/${clusterId}?tab=nodes&subtab=nodepool`,
                  label: t('k8s.nodePool'),
                  tab: 'nodes',
                  subtab: 'nodepool',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=nodes&subtab=node`,
                  label: t('k8s.node'),
                  tab: 'nodes',
                  subtab: 'node',
                },
              ],
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=components`,
              label: t('k8s.componentManagement'),
              tab: 'components',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=namespaces`,
              label: t('k8s.namespacesAndQuota'),
              tab: 'namespaces',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=workloads`,
              label: t('k8s.workloads'),
              tab: 'workloads',
              children: [
                {
                  path: `/k8s/cluster/${clusterId}?tab=workloads&type=deployments`,
                  label: t('k8s.stateless'),
                  tab: 'workloads',
                  type: 'deployments',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=workloads&type=statefulsets`,
                  label: t('k8s.stateful'),
                  tab: 'workloads',
                  type: 'statefulsets',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=workloads&type=daemonsets`,
                  label: t('k8s.daemonsets'),
                  tab: 'workloads',
                  type: 'daemonsets',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=workloads&type=jobs`,
                  label: t('k8s.jobs'),
                  tab: 'workloads',
                  type: 'jobs',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=workloads&type=cronjobs`,
                  label: t('k8s.cronjobs'),
                  tab: 'workloads',
                  type: 'cronjobs',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=workloads&type=pods`,
                  label: t('k8s.pods'),
                  tab: 'workloads',
                  type: 'pods',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=workloads&type=custom`,
                  label: t('k8s.customResources'),
                  tab: 'workloads',
                  type: 'custom',
                },
              ],
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=network`,
              label: t('k8s.network'),
              tab: 'network',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=config`,
              label: t('k8s.configManagement'),
              tab: 'config',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=storage`,
              label: t('k8s.storage'),
              tab: 'storage',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=application`,
              label: t('k8s.application'),
              tab: 'application',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=inspection`,
              label: t('k8s.inspectionAndDiagnosis'),
              tab: 'inspection',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=operations`,
              label: t('k8s.operationsManagement'),
              tab: 'operations',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=cost`,
              label: t('k8s.costSuite'),
              tab: 'cost',
            },
            {
              path: `/k8s/cluster/${clusterId}?tab=security`,
              label: t('nav.securityManagement'),
              tab: 'security',
              children: [
                {
                  path: `/k8s/cluster/${clusterId}?tab=security&subtab=authorization`,
                  label: t('nav.authorization'),
                  tab: 'security',
                  subtab: 'authorization',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=security&subtab=roles`,
                  label: t('nav.roleManagement'),
                  tab: 'security',
                  subtab: 'roles',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=security&subtab=audit`,
                  label: t('nav.audit'),
                  tab: 'security',
                  subtab: 'audit',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=security&subtab=policy`,
                  label: t('nav.policyManagement'),
                  tab: 'security',
                  subtab: 'policy',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=security&subtab=inspection`,
                  label: t('nav.configInspection'),
                  tab: 'security',
                  subtab: 'inspection',
                },
                {
                  path: `/k8s/cluster/${clusterId}?tab=security&subtab=monitoring`,
                  label: t('nav.securityMonitoring'),
                  tab: 'security',
                  subtab: 'monitoring',
                },
              ],
            },
          ] : undefined,
        },
      ],
    },
  ]

  // 检查当前路径是否在某个菜单的子菜单中，如果是则自动展开
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => {
          // 精确匹配或路径以子菜单路径开头（用于处理/k8s/cluster/:id这样的路径）
          const isActive = location.pathname === child.path || location.pathname.startsWith(child.path + '/')
          if (isActive && child.children && child.children.length > 0) {
            // 如果有三级菜单且当前在集群详情页面，自动展开二级菜单
            setExpandedSubMenus((prev) => ({ ...prev, [child.path]: true }))
            
            // 检查是否有四级菜单需要展开
              child.children.forEach((grandchild) => {
                if (grandchild.children && grandchild.children.length > 0) {
                  const searchParams = new URLSearchParams(location.search)
                  const currentTab = searchParams.get('tab')
                  const currentType = searchParams.get('type')
                  const currentSubtab = searchParams.get('subtab')
                  if (grandchild.tab === currentTab) {
                    // 如果有 type 参数，检查 type 匹配
                    if (currentType) {
                      if (grandchild.children.some(gc => gc.type === currentType)) {
                        setExpandedSubMenus((prev) => ({ ...prev, [grandchild.path]: true }))
                      }
                    } else if (currentSubtab) {
                      // 如果有 subtab 参数，检查 subtab 匹配
                      if (grandchild.children.some(gc => gc.subtab === currentSubtab)) {
                        setExpandedSubMenus((prev) => ({ ...prev, [grandchild.path]: true }))
                      }
                    } else {
                      // 没有 type 或 subtab 参数，但 tab 匹配，也展开
                      setExpandedSubMenus((prev) => ({ ...prev, [grandchild.path]: true }))
                    }
                  }
                }
              })
          }
          return isActive
        })
        if (hasActiveChild) {
          setExpandedMenus((prev) => ({ ...prev, [item.label]: true }))
        }
      }
    })
  }, [location.pathname, location.search])

  const toggleMenu = (label) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }))
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  const hasActiveChild = (children) => {
    return children?.some((child) => {
      // 精确匹配或路径以子菜单路径开头（用于处理/k8s/cluster/:id这样的路径）
      const pathMatch = isActive(child.path) || location.pathname.startsWith(child.path + '/')
      if (pathMatch && child.children) {
        // 如果有三级菜单，检查是否有激活的三级菜单项
        const searchParams = new URLSearchParams(location.search)
        const currentTab = searchParams.get('tab')
        const currentType = searchParams.get('type')
        
        // 检查是否有四级菜单
        if (child.children[0]?.children) {
          const currentSubtab = searchParams.get('subtab')
          // 四级菜单：检查type或subtab参数
          return child.children.some((grandchild) => {
            if (grandchild.children) {
              return grandchild.children.some((greatGrandchild) => {
                if (currentType) {
                  return greatGrandchild.type === currentType
                } else if (currentSubtab) {
                  return greatGrandchild.subtab === currentSubtab
                }
                return false
              })
            }
            return grandchild.tab === currentTab || (!currentTab && grandchild.tab === 'info')
          })
        }
        
        // 三级菜单：检查tab参数
        return child.children.some((grandchild) => {
          return grandchild.tab === currentTab || (!currentTab && grandchild.tab === 'info')
        })
      }
      return pathMatch
    })
  }

  const toggleSubMenu = (path) => {
    setExpandedSubMenus((prev) => ({
      ...prev,
      [path]: !prev[path],
    }))
  }

  const isSubMenuExpanded = (path) => {
    return expandedSubMenus[path] || false
  }

  const [searchTerm, setSearchTerm] = useState('')

  // 过滤菜单项
  const filterMenuItems = (items, term) => {
    if (!term) return items
    return items.filter(item => {
      const labelMatch = item.label.toLowerCase().includes(term.toLowerCase())
      const childrenMatch = item.children && filterMenuItems(item.children, term).length > 0
      return labelMatch || childrenMatch
    }).map(item => {
      if (item.children) {
        return {
          ...item,
          children: filterMenuItems(item.children, term)
        }
      }
      return item
    })
  }

  const filteredMenuItems = filterMenuItems(menuItems, searchTerm)

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>{t('platform.name')}</h2>
      </div>
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={t('nav.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {filteredMenuItems.map((item) => {
            if (item.children) {
              const isExpanded = expandedMenus[item.label]
              const active = hasActiveChild(item.children)
              
              return (
                <li key={item.label} className="menu-item menu-item-parent">
                  <div
                    className={`menu-link menu-link-parent ${active ? 'active' : ''}`}
                    onClick={() => toggleMenu(item.label)}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-label">{item.label}</span>
                    <svg
                      className={`menu-arrow ${isExpanded ? 'expanded' : ''}`}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 12L10 8L6 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  {isExpanded && (
                    <ul className="submenu-list">
                      {item.children.map((child) => {
                        const isChildActive = isActive(child.path) || location.pathname.startsWith(child.path + '/')
                        const hasGrandchildren = child.children && child.children.length > 0
                        const isSubExpanded = isSubMenuExpanded(child.path)
                        const searchParams = new URLSearchParams(location.search)
                        const currentTab = searchParams.get('tab') || 'info'
                        const currentType = searchParams.get('type')
                        const currentSubtab = searchParams.get('subtab')
                        
                        return (
                          <li key={child.path} className={`submenu-item ${hasGrandchildren ? 'submenu-item-parent' : ''}`}>
                            {hasGrandchildren ? (
                              <>
                                <div
                                  className={`submenu-link submenu-link-parent ${isChildActive ? 'active' : ''}`}
                                  onClick={() => toggleSubMenu(child.path)}
                                >
                                  <span className="submenu-icon">{child.icon}</span>
                                  <span className="submenu-label">{child.label}</span>
                                  <svg
                                    className={`menu-arrow ${isSubExpanded ? 'expanded' : ''}`}
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M6 12L10 8L6 4"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                                {isSubExpanded && (
                                  <ul className="subsubmenu-list">
                                    {child.children.map((grandchild) => {
                                      // 检查是否有四级菜单
                                      if (grandchild.children && grandchild.children.length > 0) {
                                        const isGrandchildActive = grandchild.tab === currentTab && isChildActive
                                        const isGrandExpanded = expandedSubMenus[grandchild.path] || false
                                        
                                        return (
                                          <li key={grandchild.path} className="subsubmenu-item subsubmenu-item-parent">
                                            <div
                                              className={`subsubmenu-link subsubmenu-link-parent ${isGrandchildActive ? 'active' : ''}`}
                                              onClick={() => toggleSubMenu(grandchild.path)}
                                            >
                                              <span className="subsubmenu-label">{grandchild.label}</span>
                                              <svg
                                                className={`menu-arrow ${isGrandExpanded ? 'expanded' : ''}`}
                                                width="12"
                                                height="12"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                              >
                                                <path
                                                  d="M6 12L10 8L6 4"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                />
                                              </svg>
                                            </div>
                                            {isGrandExpanded && (
                                              <ul className="subsubsubmenu-list">
                                                {grandchild.children.map((greatGrandchild) => {
                                                  let isGreatGrandchildActive = false
                                                  if (greatGrandchild.type) {
                                                    // 使用 type 参数匹配（workloads）
                                                    isGreatGrandchildActive = greatGrandchild.type === currentType && isGrandchildActive
                                                  } else if (greatGrandchild.subtab) {
                                                    // 使用 subtab 参数匹配（security）
                                                    isGreatGrandchildActive = greatGrandchild.subtab === currentSubtab && isGrandchildActive
                                                  }
                                                  return (
                                                    <li key={greatGrandchild.path} className="subsubsubmenu-item">
                                                      <Link
                                                        to={greatGrandchild.path}
                                                        className={`subsubsubmenu-link ${isGreatGrandchildActive ? 'active' : ''}`}
                                                      >
                                                        <span className="subsubsubmenu-label">{greatGrandchild.label}</span>
                                                      </Link>
                                                    </li>
                                                  )
                                                })}
                                              </ul>
                                            )}
                                          </li>
                                        )
                                      }
                                      
                                      // 三级菜单项（无四级菜单）
                                      const isGrandchildActive = grandchild.tab === currentTab && isChildActive
                                      return (
                                        <li key={grandchild.path} className="subsubmenu-item">
                                          <Link
                                            to={grandchild.path}
                                            className={`subsubmenu-link ${isGrandchildActive ? 'active' : ''}`}
                                          >
                                            <span className="subsubmenu-label">{grandchild.label}</span>
                                          </Link>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                )}
                              </>
                            ) : (
                              <Link
                                to={child.path}
                                className={`submenu-link ${isChildActive ? 'active' : ''}`}
                              >
                                <span className="submenu-icon">{child.icon}</span>
                                <span className="submenu-label">{child.label}</span>
                              </Link>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            }

            return (
              <li key={item.path} className="menu-item">
                <Link
                  to={item.path}
                  className={`menu-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
