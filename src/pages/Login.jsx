import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DEMO_USERS = [
  { email: 'admin@acme.com', password: 'admin123', name: 'John Doe', company: 'Acme Corp', role: 'IT Admin' },
  { email: 'admin@fayait.com', password: 'faya123', name: 'Anfarcio', company: 'Faya IT', role: 'Super Admin' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [lang, setLang] = useState('EN')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    const user = DEMO_USERS.find(u => u.email === email && u.password === password)
    if (user) {
      login(user)
      navigate('/')
    } else {
      setError(lang === 'EN' ? 'Invalid email or password' : 'Ongeldig e-mailadres of wachtwoord')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--faya-gray)'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 400,
        border: '0.5px solid rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 28, fontWeight: 700, color: 'var(--faya-navy)',
            letterSpacing: -0.5, marginBottom: 4
          }}>
            FAYA<span style={{ color: 'var(--faya-orange)' }}>IT</span>
          </div>
          <div style={{ fontSize: 13, color: '#888780' }}>
            {lang === 'EN' ? 'Client Portal' : 'Klantportaal'}
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 4, background: '#f4f5f7',
          borderRadius: 8, padding: 3, marginBottom: 24
        }}>
          {['EN', 'NL'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              flex: 1, border: 'none', borderRadius: 6, padding: '6px 0',
              fontSize: 12, cursor: 'pointer',
              background: lang === l ? '#fff' : 'transparent',
              color: lang === l ? 'var(--faya-navy)' : '#888780',
              fontWeight: lang === l ? 500 : 400,
              border: lang === l ? '0.5px solid rgba(0,0,0,0.08)' : 'none'
            }}>{l}</button>
          ))}
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
              {lang === 'EN' ? 'Email address' : 'E-mailadres'}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={lang === 'EN' ? 'you@company.com' : 'u@bedrijf.com'}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 14, outline: 'none' }}
              required
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
              {lang === 'EN' ? 'Password' : 'Wachtwoord'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 14, outline: 'none' }}
              required
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#E24B4A', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" style={{
            width: '100%', padding: '11px 0', marginTop: 16,
            background: 'var(--faya-orange)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14,
            fontWeight: 500, cursor: 'pointer'
          }}>
            {lang === 'EN' ? 'Sign in' : 'Inloggen'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#B4B2A9' }}>
          {lang === 'EN' ? 'Need help?' : 'Hulp nodig?'}{' '}
          <a href="mailto:support@fayait.com" style={{ color: 'var(--faya-orange)' }}>
            support@fayait.com
          </a>
        </div>
      </div>
    </div>
  )
}
