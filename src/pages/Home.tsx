interface HomeProps {
  isAuthenticated?: boolean
  username?: string
  onPractice: () => void
  onPublicMatch: () => void
  onPrivateMatch: () => void
  onLogin: () => void
  onSignup: () => void
  onProfile: () => void
  onLogout: () => void
}

export function Home({
  isAuthenticated = false,
  username,
  onPractice,
  onPublicMatch,
  onPrivateMatch,
  onLogin,
  onSignup,
  onProfile,
  onLogout,
}: HomeProps) {
  return (
    <main className="page-shell home-page">
      <section className="home-hero"><div><span className="eyebrow"><span className="live-dot" /> 1v1 word strategy</span><h1>Outthink.<br /><em>Outguess.</em><br />Outplay.</h1><p>A sharper five-letter duel. Practice solo, race a stranger, or settle the score with someone you know.</p><div className="hero-actions"><button className="button button--primary" onClick={onPublicMatch}>Play 1v1 <span>↗</span></button><button className="button button--quiet" onClick={onPractice}>Practice solo <span>→</span></button></div></div><div className="home-visual" aria-hidden="true"><span>W</span><span>O</span><span>R</span><span>D</span><span>L</span></div></section>
      <section className="home-modes"><Mode title="Practice" copy="Warm up without pressure." action="Start practicing" onClick={onPractice} /><Mode title="Public 1v1" copy="Find a worthy opponent." action="Find a match" onClick={onPublicMatch} featured /><Mode title="Private match" copy="Bring your own rivalry." action="Create a lobby" onClick={onPrivateMatch} /></section>
      <section className="home-account">{isAuthenticated ? <><span>Playing as <b>{username ?? 'player'}</b></span><button onClick={onProfile}>View profile</button><button onClick={onLogout}>Log out</button></> : <><span>Save your record and climb the ladder.</span><button onClick={onLogin}>Log in</button><button className="button button--primary" onClick={onSignup}>Create account</button></>}</section>
    </main>
  )
}

function Mode({ title, copy, action, featured, onClick }: { title: string; copy: string; action: string; featured?: boolean; onClick: () => void }) { return <article className={`mode-card ${featured ? 'mode-card--featured' : ''}`}><span className="card-number">{featured ? '02' : title === 'Practice' ? '01' : '03'}</span><h2>{title}</h2><p>{copy}</p><button onClick={onClick}>{action} <span>↗</span></button></article> }

export type { HomeProps }
export default Home
