import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, Shield, User } from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const roleLabel = profile?.role === 'admin' ? 'Administrador' : 'Vendedor'

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Avatar area */}
        <div className="bg-gradient-to-br from-[#0f3460] to-[#1a1a2e] px-4 py-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <User size={36} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">{profile?.full_name ?? 'Usuario'}</h2>
          <span className="mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white/80">
            {roleLabel}
          </span>
        </div>

        {/* Info items */}
        <div className="divide-y divide-gray-100">
          <div className="flex items-center gap-3 px-4 py-4">
            <Mail size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Correo electronico</p>
              <p className="text-sm text-gray-700">{user?.email ?? '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-4">
            <Shield size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Rol</p>
              <p className="text-sm text-gray-700">{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-[#e94560] font-semibold bg-white rounded-xl border border-gray-200 hover:bg-red-50 transition-colors active:bg-red-100"
      >
        <LogOut size={18} />
        Cerrar sesion
      </button>
    </div>
  )
}
