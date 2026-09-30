import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/common/Navbar'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setDisplayName(data?.display_name || '')
      setLoading(false)
    }
    if (user) load()
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    if (!displayName.trim()) return setError('Display name is required')
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: displayName.trim(), updated_at: new Date().toISOString() })

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>

        {/* Avatar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
          </div>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>

        {/* Edit form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="font-semibold text-white mb-4">Edit Profile</h2>

          {error && <p className="text-red-400 text-sm mb-3 bg-red-400/10 p-3 rounded-lg">{error}</p>}
          {saved && <p className="text-green-400 text-sm mb-3 bg-green-400/10 p-3 rounded-lg">Profile saved!</p>}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name as it appears to others"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">This is how team managers will find you when adding you to a team.</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[{ label: 'Matches', value: '-' }, { label: 'Runs', value: '-' }, { label: 'Wickets', value: '-' }].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
