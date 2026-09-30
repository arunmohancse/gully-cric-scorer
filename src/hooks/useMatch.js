import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMatch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function createMatch(matchData) {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert(matchData)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function getMatches(userId) {
    const { data, error } = await supabase
      .from('matches')
      .select('*, match_teams(team_id, innings_no, teams(name))')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  return { createMatch, getMatches, loading, error }
}
