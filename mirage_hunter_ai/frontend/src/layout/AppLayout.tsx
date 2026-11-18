import { useEffect, useState, type ReactNode } from 'react'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AppLayoutProps { children: ReactNode }

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  return <div className="app-shell"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /><main className="main-content"><Header onMenu={() => setSidebarOpen(true)} darkMode={darkMode} onToggleTheme={() => setDarkMode((current) => !current)} /><div className="page-content">{children}</div></main></div>
}
