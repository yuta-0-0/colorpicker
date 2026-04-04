import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import type { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Failed to get session:', error)
      }
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return <AppLayout />
}

function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    if (!inviteCode.trim()) {
      setError('招待コードを入力してください')
      return
    }

    setLoading(true)
    setError('')

    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, used_by')
      .eq('code', inviteCode.trim())
      .single() as { data: { id: string; used_by: string | null } | null; error: any }

    if (inviteError || !invitation) {
      setError('招待コードが無効です')
      setLoading(false)
      return
    }

    if (invitation.used_by) {
      setError('この招待コードはすでに使用されています')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (authError) {
      setError('ログインに失敗しました。もう一度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <div className="w-full max-w-sm p-8 bg-surface-raised border border-border rounded-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-text-primary">ColorPicker</h1>
          <p className="text-sm text-text-secondary mt-1">Beta版 · 招待制</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">招待コード</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="招待コードを入力"
              className="w-full px-3 py-2 bg-surface-overlay border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>処理中...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google でログイン
              </>
            )}
          </button>

          <p className="text-xs text-text-muted text-center">
            本アプリはBeta版です。再配布は禁止されています。
          </p>
        </div>
      </div>
    </div>
  )
}
