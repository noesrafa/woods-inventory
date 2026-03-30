import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const roleLabel = profile?.role === 'admin' ? 'Administrador' : 'Vendedor'

  return (
    <div className="h-full overflow-y-auto p-4 pb-8 space-y-4">
      <h1 className="text-xl font-bold text-txt">Mi Perfil</h1>

      <div className="bg-surface rounded-2xl shadow-sm border border-bdr-l overflow-hidden">
        {/* Avatar area */}
        <div className="bg-gradient-to-br from-[#0D47A1] to-[#1A237E] px-4 py-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <User size={36} className="text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">{profile?.full_name ?? 'Usuario'}</h2>
          <span className="mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white/80">
            {roleLabel}
          </span>
        </div>

        {/* Info items */}
        <div className="divide-y divide-bdr-l">
          <div className="flex items-center gap-3 px-4 py-4">
            <Mail size={18} className="text-txt-m" />
            <div>
              <p className="text-xs text-txt-m">Correo electronico</p>
              <p className="text-sm text-txt-s">{user?.email ?? '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-4">
            <Shield size={18} className="text-txt-m" />
            <div>
              <p className="text-xs text-txt-m">Rol</p>
              <p className="text-sm text-txt-s">{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <Button variant="danger" className="w-full" onClick={handleLogout}>
        <LogOut size={18} />
        Cerrar sesion
      </Button>
    </div>
  )
}
