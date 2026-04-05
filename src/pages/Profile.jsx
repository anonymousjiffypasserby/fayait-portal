import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { lang, switchLang, t } = useLang()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleProfileSave = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const updated = await api.updateProfile({ name, lang, theme })
      updateUser({ name: updated.name, lang: updated.lang, theme: updated.theme })
      setMessage(t('saveChanges') + ' ✓')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    setError('')
    setMessage('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setMessage('Password updated ✓')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 24 }}>
        {t('editProfile')}
      </h1>

      {message && (
        <div style={{ background: '#EAF3DE', color: '#3B6D11', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 20 }}>
          {t('editProfile')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--faya-orange)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 500
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--faya-navy)' }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: '#888780' }}>{user?.email}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{user?.company} · {user?.role}</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            {t('displayName')}
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            {t('language')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['EN', 'NL'].map(l => (
              <button key={l} onClick={() => switchLang(l)} style={{
                padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: lang === l ? 'var(--faya-orange)' : 'transparent',
                color: lang === l ? '#fff' : '#5F5E5A',
                border: lang === l ? 'none' : '0.5px solid rgba(0,0,0,0.15)',
                fontWeight: lang === l ? 500 : 400
              }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            {t('theme')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['light', 'dark'].map(th => (
              <button key={th} onClick={() => setTheme(th)} style={{
                padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: theme === th ? 'var(--faya-navy)' : 'transparent',
                color: theme === th ? '#fff' : '#5F5E5A',
                border: theme === th ? 'none' : '0.5px solid rgba(0,0,0,0.15)',
                fontWeight: theme === th ? 500 : 400
              }}>
                {th === 'light' ? t('light') : t('dark')}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleProfileSave} disabled={loading} style={{
          background: 'var(--faya-orange)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
        }}>
          {t('saveChanges')}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 20 }}>
          {t('changePassword')}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            {t('currentPassword')}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            {t('newPassword')}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            {t('confirmPassword')}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', fontSize: 14 }}
          />
        </div>

        <button onClick={handlePasswordChange} disabled={loading} style={{
          background: 'var(--faya-navy)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
        }}>
          {t('changePassword')}
        </button>
      </div>
    </div>
  )
}
