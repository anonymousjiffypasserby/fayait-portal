import { useLang } from '../context/LangContext'

const mockInvoices = [
  { id: 'INV-001', period: 'March 2026', amount: 150.00, status: 'paid', date: '2026-03-01' },
  { id: 'INV-002', period: 'February 2026', amount: 150.00, status: 'paid', date: '2026-02-01' },
  { id: 'INV-003', period: 'January 2026', amount: 125.00, status: 'paid', date: '2026-01-01' },
  { id: 'INV-004', period: 'April 2026', amount: 150.00, status: 'unpaid', date: '2026-04-01' },
]

export default function Billing() {
  const { t } = useLang()

  const unpaid = mockInvoices.filter(i => i.status === 'unpaid')
  const total = mockInvoices.reduce((sum, i) => sum + i.amount, 0)

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)', marginBottom: 24 }}>
        {t('billing')}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {t('currentPlan')}
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)' }}>Business</div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>$150 / month</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {t('nextBilling')}
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--faya-navy)' }}>May 1, 2026</div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>Auto-renewal</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: unpaid.length > 0 ? '0.5px solid #E24B4A' : '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 11, color: '#888780', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {t('invoiceStatus')}
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: unpaid.length > 0 ? '#E24B4A' : '#1D9E75' }}>
            {unpaid.length > 0 ? `${unpaid.length} ${t('unpaid')}` : t('paid')}
          </div>
          <div style={{ fontSize: 11, color: '#888780', marginTop: 4 }}>
            {unpaid.length > 0 ? `$${unpaid.reduce((s,i) => s + i.amount, 0).toFixed(2)} due` : 'All clear'}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontSize: 13, fontWeight: 500, color: 'var(--faya-navy)' }}>
          {t('invoices')}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f4f5f7', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {['#', t('date'), 'Period', t('amount'), t('invoiceStatus'), ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#5F5E5A', fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockInvoices.map(invoice => (
              <tr key={invoice.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', color: '#888780', fontFamily: 'monospace', fontSize: 12 }}>{invoice.id}</td>
                <td style={{ padding: '12px 16px', color: '#5F5E5A' }}>{invoice.date}</td>
                <td style={{ padding: '12px 16px', color: 'var(--faya-navy)', fontWeight: 500 }}>{invoice.period}</td>
                <td style={{ padding: '12px 16px', color: 'var(--faya-navy)', fontWeight: 500 }}>${invoice.amount.toFixed(2)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                    background: invoice.status === 'paid' ? '#EAF3DE' : '#FCEBEB',
                    color: invoice.status === 'paid' ? '#3B6D11' : '#A32D2D'
                  }}>
                    {invoice.status === 'paid' ? t('paid') : t('unpaid')}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{
                    background: 'none', border: '0.5px solid rgba(0,0,0,0.15)',
                    borderRadius: 6, padding: '4px 10px', fontSize: 11,
                    cursor: 'pointer', color: '#5F5E5A'
                  }}>
                    {t('downloadInvoice')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
