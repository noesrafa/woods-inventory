import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Login() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o contrasena incorrectos'
        : err.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D47A1] to-[#1A237E] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Woods</h1>
          <p className="text-white/60 text-sm mt-1">Inventario</p>
        </div>

        <form onSubmit={handleLogin} className="bg-surface rounded-2xl shadow-xl p-6 space-y-4">
          {error && (
            <div className="bg-danger-bg text-danger-text text-sm p-3 rounded-lg border border-bdr">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-txt-s mb-1.5">
              Correo electronico
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt-s mb-1.5">
              Contrasena
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
