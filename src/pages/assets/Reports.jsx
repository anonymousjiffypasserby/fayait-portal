import { useMemo } from 'react'
import { T, STATUS_COLORS, isOnline } from './shared'

const Card = ({ title, value, sub, color }) => (
  <div style={{
    background: T.card, borderRadius: 12, padding: '18px 20px',
    border: `1px solid ${T.border}`, flex: '1 1 160px', minWidth: 140,
  }}>
    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color: color || T.navy, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>}
  </div>
)

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

const BarRow = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: T.text, fontWeight: 500 }}>{label}</span>
        <span style={{ color: T.muted }}>{count} <span style={{ fontSize: 10 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: '#eef0f3', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color || T.navy, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

export default function Reports({ assets }) {
  const stats = useMemo(() => {
    const total = assets.length
    const online = assets.filter(isOnline).length
    const checkedOut = assets.filter(a => a.checked_out_to && !a.retired).length

    // Status breakdown
    const byStatus = {}
    assets.forEach(a => {
      if (!a.retired) {
        byStatus[a.status] = (byStatus[a.status] || 0) + 1
      }
    })

    // Type breakdown
    const byType = {}
    assets.forEach(a => {
      const t = a.asset_type || 'Unknown'
      byType[t] = (byType[t] || 0) + 1
    })

    // Department breakdown
    const byDept = {}
    assets.forEach(a => {
      const d = a.department || 'Unassigned'
      byDept[d] = (byDept[d] || 0) + 1
    })

    // Location breakdown
    const byLoc = {}
    assets.forEach(a => {
      const l = a.location || 'Unknown'
      byLoc[l] = (byLoc[l] || 0) + 1
    })

    // Warranty expiring within 90 days
    const now = new Date()
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const warrantyExpiring = assets.filter(a => {
      if (!a.warranty_expires || a.retired) return false
      const exp = new Date(a.warranty_expires)
      return exp >= now && exp <= in90
    })
    const warrantyExpired = assets.filter(a => {
      if (!a.warranty_expires || a.retired) return false
      return new Date(a.warranty_expires) < now
    })

    // Due for audit (>1 year since last audit)
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
    const dueAudit = assets.filter(a => !a.retired && (!a.last_audited_at || new Date(a.last_audited_at).getTime() < oneYearAgo))

    // Due for checkin
    const dueCheckin = assets.filter(a => a.expected_checkin_date && a.checked_out_to && new Date(a.expected_checkin_date) < now)

    // Requestable
    const requestable = assets.filter(a => a.requestable && !a.retired)

    // Top manufacturers
    const byMfr = {}
    assets.forEach(a => {
      if (a.manufacturer) byMfr[a.manufacturer] = (byMfr[a.manufacturer] || 0) + 1
    })

    return {
      total, online, offline: total - online, checkedOut,
      byStatus: Object.entries(byStatus).sort((a, b) => b[1] - a[1]),
      byType: Object.entries(byType).sort((a, b) => b[1] - a[1]),
      byDept: Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 8),
      byLoc: Object.entries(byLoc).sort((a, b) => b[1] - a[1]).slice(0, 8),
      byMfr: Object.entries(byMfr).sort((a, b) => b[1] - a[1]).slice(0, 6),
      warrantyExpiring: warrantyExpiring.length,
      warrantyExpired: warrantyExpired.length,
      dueAudit: dueAudit.length,
      dueCheckin: dueCheckin.length,
      requestable: requestable.length,
    }
  }, [assets])

  const statusColor = (s) => STATUS_COLORS[s] || T.muted
  const typeColors = ['#378ADD', '#1D9E75', '#ff6b35', '#f39c12', '#9b59b6', '#1abc9c']

  return (
    <div style={{ fontFamily: T.font, maxWidth: 860, paddingBottom: 60 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: T.navy }}>Asset Reports</h2>
      <p style={{ margin: '0 0 28px', fontSize: 13, color: T.muted }}>Summary overview of your asset inventory.</p>

      {/* Top stats */}
      <Section title="Overview">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <Card title="Total Assets" value={stats.total} />
          <Card title="Online" value={stats.online} color={T.green}
            sub={`${stats.total > 0 ? Math.round(stats.online / stats.total * 100) : 0}% of fleet`} />
          <Card title="Offline" value={stats.offline} color={T.muted} />
          <Card title="Checked Out" value={stats.checkedOut} color={T.blue} />
          <Card title="Requestable" value={stats.requestable} color={T.orange} />
        </div>
      </Section>

      {/* Attention */}
      {(stats.warrantyExpiring > 0 || stats.warrantyExpired > 0 || stats.dueAudit > 0 || stats.dueCheckin > 0) && (
        <Section title="Needs Attention">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {stats.warrantyExpired > 0 && (
              <Card title="Warranty Expired" value={stats.warrantyExpired} color={T.red} />
            )}
            {stats.warrantyExpiring > 0 && (
              <Card title="Warranty Expiring (90d)" value={stats.warrantyExpiring} color={T.yellow} />
            )}
            {stats.dueAudit > 0 && (
              <Card title="Due for Audit" value={stats.dueAudit} color={T.yellow} />
            )}
            {stats.dueCheckin > 0 && (
              <Card title="Overdue Checkin" value={stats.dueCheckin} color={T.red} />
            )}
          </div>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Status breakdown */}
        <div style={{ background: T.card, borderRadius: 12, padding: '18px 20px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>By Status</div>
          {stats.byStatus.map(([s, n]) => (
            <BarRow key={s} label={s} count={n} total={stats.total} color={statusColor(s)} />
          ))}
        </div>

        {/* Type breakdown */}
        <div style={{ background: T.card, borderRadius: 12, padding: '18px 20px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>By Type</div>
          {stats.byType.map(([t, n], i) => (
            <BarRow key={t} label={t} count={n} total={stats.total} color={typeColors[i % typeColors.length]} />
          ))}
        </div>

        {/* Department breakdown */}
        <div style={{ background: T.card, borderRadius: 12, padding: '18px 20px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>By Department</div>
          {stats.byDept.length === 0
            ? <div style={{ fontSize: 12, color: T.muted }}>No department data</div>
            : stats.byDept.map(([d, n]) => (
                <BarRow key={d} label={d} count={n} total={stats.total} color={T.navy} />
              ))
          }
        </div>

        {/* Manufacturer breakdown */}
        <div style={{ background: T.card, borderRadius: 12, padding: '18px 20px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>By Manufacturer</div>
          {stats.byMfr.length === 0
            ? <div style={{ fontSize: 12, color: T.muted }}>No manufacturer data</div>
            : stats.byMfr.map(([m, n], i) => (
                <BarRow key={m} label={m} count={n} total={stats.total} color={typeColors[i % typeColors.length]} />
              ))
          }
        </div>
      </div>

      {/* Location table */}
      {stats.byLoc.length > 0 && (
        <div style={{ marginTop: 24, background: T.card, borderRadius: 12, padding: '18px 20px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>By Location</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {stats.byLoc.map(([l, n]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 10px', background: '#f7f8fa', borderRadius: 7 }}>
                <span style={{ color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</span>
                <span style={{ fontWeight: 700, color: T.navy, marginLeft: 8 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
