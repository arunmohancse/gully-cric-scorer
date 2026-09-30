import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Gully League" className="w-24 h-24 rounded-full object-cover mx-auto" />
          <h2 className="text-2xl font-bold text-white mt-3">GullyCricScorer</h2>
          <p className="text-gray-400 mt-1">Live cricket scoring made simple</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">{isSignUp ? 'Create Account' : 'Sign In'}</h3>

          {error && <p className="text-red-400 text-sm mb-4 bg-red-400/10 p-3 rounded-lg">{error}</p>}
          {message && <p className="text-green-400 text-sm mb-4 bg-green-400/10 p-3 rounded-lg">{message}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700" /></div>
            <div className="relative flex justify-center text-xs text-gray-500"><span className="bg-gray-900 px-2">or</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary-500 hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
