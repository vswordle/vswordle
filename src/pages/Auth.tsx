import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface AuthProps {
  initialMode?: 'login' | 'signup'
  onAuthenticated?: () => void
}

export function Auth({ initialMode = 'login', onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) { setError('Supabase is not configured.'); return }
    setLoading(true); setError(''); setMessage('')
    const response = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() || undefined } } })
    if (response.error) setError(response.error.message)
    else if (mode === 'signup' && !response.data.session) setMessage('Email confirmation is enabled in Supabase. Disable Confirm email in Authentication > Providers > Email, then sign up again.')
    else { setMessage(mode === 'signup' ? 'Account created.' : 'Signed in.'); onAuthenticated?.() }
    setLoading(false)
  }

  const logout = async () => {
    if (!supabase) return
    setLoading(true); const { error: logoutError } = await supabase.auth.signOut()
    if (logoutError) setError(logoutError.message)
    else setMessage('You have been signed out.')
    setLoading(false)
  }

  return (
    <main className="page-shell auth-page">
      <div className="auth-card">
        <span className="kicker">WORDLE 1V1 ACCOUNT</span>
        <h1>{mode === 'login' ? 'Welcome back.' : 'Join the ladder.'}</h1>
        <p>{mode === 'login' ? 'Sign in to keep your record and play ranked matches.' : 'Create an account to save your stats and match history.'}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Username<input autoComplete="username" minLength={3} maxLength={20} onChange={(event) => setUsername(event.target.value)} required value={username} /></label>}
          <label>Email<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="button button--primary" disabled={loading} type="submit">{loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'} <span>↗</span></button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }} type="button">{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}</button>
        <button className="auth-logout" disabled={loading} onClick={() => void logout()} type="button">Sign out current session</button>
      </div>
    </main>
  )
}

export type { AuthProps }
export default Auth
