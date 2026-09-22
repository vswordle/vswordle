import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Practice from './pages/Practice'
import Private from './pages/Private'
import Profile from './pages/Profile'
import Play from './pages/Play'
import { supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState<Session | null | undefined>(() => supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return undefined
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="app-shell"><main className="loading-state">Loading session...</main></div>
  const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')
  return <BrowserRouter basename={basename}><AppFrame session={session} /></BrowserRouter>
}

function AppFrame({ session }: { session: Session | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const authenticated = Boolean(session)
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); navigate('/') }
  const protectedRoute = (element: ReactNode) => authenticated ? element : <Navigate replace state={{ from: location.pathname }} to="/login" />

  return <div className="app-shell"><header className="site-header"><Link className="brand" to="/"><span className="brand-mark">W</span><span>WORDLE <b>1V1</b></span></Link><nav><Link to="/">Home</Link><Link to="/practice">Practice</Link><Link to="/play">Play 1v1</Link><Link to="/private">Private</Link></nav><div className="header-actions">{authenticated ? <><Link className="profile-button" to="/profile"><span className="avatar avatar--yellow">{(session?.user.email ?? 'AM').slice(0, 2).toUpperCase()}</span><span>Profile</span></Link><button className="icon-button" onClick={() => void signOut}>Log out</button></> : <><Link className="icon-button" to="/login">Log in</Link><Link className="button button--primary header-signup" to="/signup">Sign up</Link></>}</div></header><Routes><Route path="/" element={<Home isAuthenticated={authenticated} username={session?.user.user_metadata.username} onLogin={() => navigate('/login')} onLogout={() => void signOut()} onPrivateMatch={() => navigate(authenticated ? '/private' : '/login')} onPractice={() => navigate('/practice')} onProfile={() => navigate('/profile')} onPublicMatch={() => navigate(authenticated ? '/play' : '/login')} onSignup={() => navigate('/signup')} />} /><Route path="/practice" element={<Practice />} /><Route path="/play" element={protectedRoute(<Play />)} /><Route path="/private" element={protectedRoute(<Private />)} /><Route path="/profile" element={protectedRoute(<Profile onLogin={() => navigate('/login')} />)} /><Route path="/login" element={authenticated ? <Navigate replace to="/" /> : <Auth onAuthenticated={() => navigate('/')} />} /><Route path="/signup" element={authenticated ? <Navigate replace to="/" /> : <Auth initialMode="signup" onAuthenticated={() => navigate('/')} />} /><Route path="*" element={<Navigate replace to="/" />} /></Routes><footer><span>WORDLE 1V1 © 2025</span><span className="footer-links"><Link to="/practice">Practice</Link><Link to="/">Privacy</Link><span>● {supabase ? 'Backend connected' : 'Demo environment'}</span></span></footer></div>
}

export default App
