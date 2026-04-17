import { useState } from 'react'
import { T, STATUS_COLORS, getStatus, initials, fmtDate, btn } from './shared'
import { ProvisioningRow } from './ProvisioningBadge'

const TH = ({ children, style }) => (
  <th style={{
    padding: '9px 14px', textAlign: 'left', fontWeight: 600,
    fontSize: 11, color: T.muted, background: '#f4f5f7',
    borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
    ...style,
  }}>
    {children}
  </th>
)

const TD = ({ children, style }) => (
  <td style={{ padding: '11px 14px', fontSize: 13, verticalAlign: 'middle', ...style }}>{children}</td>
)

function StatusBadge({ user }) {
  const s = getStatus(user)
  const c = STATUS_COLORS[s]
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function Avatar({ name }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: T.orange, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

export default function UsersTable({
  users, selected, onSelect, onSelectAll,
  onEdit, onToggleActive, onResetPassword, onViewProvisioning,
  onBulkDeactivate, onBulkActivate, onBulkResetPassword,
}) {
  const [expandedProv, setExpandedProv] = useState(null)
  const allSelected = users.length > 0 && users.every(u => selected.has(u.id))
  const someSelected = selected.size > 0

  if (!users.length) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
        No users found.
      </div>
    )
  }

  return (
    <div>
      {someSelected && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', background: '#fff7f4',
          borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: T.orange, fontWeight: 500 }}>
            {selected.size} selected
          </span>
          <button onClick={onBulkDeactivate} style={{ ...btn('danger'), fontSize: 11 }}>Deactivate</button>
          <button onClick={onBulkActivate} style={{ ...btn('ghost'), fontSize: 11 }}>Activate</button>
          <button onClick={onBulkResetPassword} style={{ ...btn('ghost'), fontSize: 11 }}>Reset Passwords (CSV)</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <TH style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => onSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
              </TH>
              <TH>User</TH>
              <TH>Role</TH>
              <TH>Department</TH>
              <TH>Services</TH>
              <TH>Status</TH>
              <TH>Last Login</TH>
              <TH>Provisioning</TH>
              <TH style={{ textAlign: 'right' }}>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isInactive = u.active === false
              const provKeys = Object.keys(u.provisioning_status || {})
              const hasFailed = provKeys.some(k => u.provisioning_status[k] === 'failed')
              const showProv = expandedProv === u.id

              return (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                    opacity: isInactive ? 0.55 : 1,
                    background: selected.has(u.id) ? '#fff7f4' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!selected.has(u.id)) e.currentTarget.style.background = '#fafafa' }}
                  onMouseLeave={e => { if (!selected.has(u.id)) e.currentTarget.style.background = 'transparent' }}
                >
                  <TD>
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={e => onSelect(u.id, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </TD>
                  <TD>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.name} />
                      <div>
                        <div style={{ fontWeight: 500, color: T.navy }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{u.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD style={{ color: T.muted }}>
                    {u.role === 'admin' || u.role === 'superadmin' ? (
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: '#EEF2FF', color: '#4338CA', fontWeight: 500 }}>
                        {u.role}
                      </span>
                    ) : u.role}
                  </TD>
                  <TD style={{ color: T.muted }}>{u.department || '—'}</TD>
                  <TD>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {u.access?.filter(a => a.level !== 'none').slice(0, 4).map(a => (
                        <span key={a.service} style={{
                          fontSize: 10, padding: '1px 5px', borderRadius: 3,
                          background: '#F1EFE8', color: '#5F5E5A', fontWeight: 500,
                        }}>
                          {a.service}
                        </span>
                      ))}
                    </div>
                  </TD>
                  <TD><StatusBadge user={u} /></TD>
                  <TD style={{ color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(u.last_login)}</TD>
                  <TD>
                    {provKeys.length > 0 ? (
                      <div>
                        <button
                          onClick={() => setExpandedProv(showProv ? null : u.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 11, color: hasFailed ? '#A32D2D' : '#3B6D11',
                            padding: 0, fontFamily: T.font,
                          }}
                        >
                          {hasFailed ? '❌ Issues' : '✅ OK'} {showProv ? '▲' : '▼'}
                        </button>
                        {showProv && <ProvisioningRow provisioningStatus={u.provisioning_status} />}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: T.muted }}>—</span>
                    )}
                  </TD>
                  <TD style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button onClick={() => onEdit(u)} style={btn('ghost')}>Edit</button>
                      <button
                        onClick={() => onToggleActive(u)}
                        style={btn(u.active !== false ? 'danger' : 'ghost')}
                      >
                        {u.active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => onResetPassword(u)} style={btn('ghost')}>Reset PW</button>
                      {hasFailed && (
                        <button onClick={() => onEdit(u)} style={{ ...btn('ghost'), color: '#A32D2D', borderColor: 'rgba(163,45,45,0.4)' }}>
                          Retry
                        </button>
                      )}
                    </div>
                  </TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
