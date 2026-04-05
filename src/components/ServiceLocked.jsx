import { useLang } from '../context/LangContext'

export default function ServiceLocked({ serviceName }) {
  const { t } = useLang()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 400, textAlign: 'center', padding: 40
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#F1EFE8', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 28, marginBottom: 20
      }}>
        🔒
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 8 }}>
        {serviceName}
      </h2>
      <p style={{ fontSize: 14, color: '#888780', marginBottom: 8 }}>
        {t('serviceInactive')}
      </p>
      <p style={{ fontSize: 13, color: '#B4B2A9', marginBottom: 24, maxWidth: 360 }}>
        {t('contactToActivate')}
      </p>
      <a href="mailto:support@fayait.com" style={{
        background: 'var(--faya-orange)', color: '#fff',
        padding: '10px 24px', borderRadius: 8, fontSize: 13,
        fontWeight: 500, textDecoration: 'none'
      }}>
        {t('contactUs')}
      </a>
    </div>
  )
}
