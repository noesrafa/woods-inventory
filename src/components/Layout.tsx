import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/catalog', icon: Package, label: 'Catalogo' },
  { to: '/sales', icon: ShoppingCart, label: 'Ventas' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export default function Layout() {
  const { profile } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#0f3460] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-bold tracking-tight">Deko Inventario</h1>
        {profile?.full_name && (
          <span className="text-sm text-white/70 truncate ml-4">
            {profile.full_name}
          </span>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-xs min-w-[64px] min-h-[44px] transition-colors ${
                  isActive
                    ? 'text-[#0f3460] font-semibold'
                    : 'text-gray-400'
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
