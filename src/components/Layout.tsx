import { Outlet, NavLink } from 'react-router-dom'
import { Package, User, ClipboardEdit, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  { to: '/', icon: Package, label: 'Catalogo' },
  { to: '/products', icon: ClipboardEdit, label: 'Productos' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export default function Layout() {
  const { theme, toggle } = useTheme()

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-app-bg">
      {/* Header */}
      <header className="shrink-0 bg-header text-white px-4 py-3 flex items-center justify-between z-40">
        <h1 className="text-lg font-bold tracking-tight">Woods</h1>
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {/* Content — overflow-hidden so each page manages its own scroll */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-nav border-t border-nav-bdr safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-xs min-w-[64px] min-h-[44px] transition-colors ${
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-txt-m'
                }`
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
