import { useState, useEffect } from 'react'
import { T, zammadApi } from './shared'

const STATUSES = [
  { key: 'new',              label: 'New'          },
  { key: 'open',             label: 'Open'         },
  { key: 'pending reminder', label: 'Pending'      },
  { key: 'closed',           label: 'Closed'       },
]

const PRIORITIES = [
  { key: '1', label: 'Low'       },
  { key: '2', label: 'Normal'    },
  { key: '3', label: 'High'      },
  { key: '4', label: 'Emergency' },
]

export default function FilterPanel({ filters, onChange, isAdmin, onClose }) {
  const [groups,  setGroups]  = useState([])
  const [agents,  setAgents]  = useState([])

  useEffect(() => {
    zammadApi.getGroups().then(g => setGroups(Array.isArray(g) ? g : [])).catch(() => {})
    if (isAdmin) {
      zammadApi.getUsers().then(u => setAgents(Array.isArray(u) ? u.filter(x => x.role_ids?.length || x.roles?.length) : [])).catch(() => {})
    }
  }, [isAdmin])

  const toggle = (field, val) => {
    const cur = filters[field] || []
    const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]
    onChange({ ...filters, [field]: next })
  }

  const set = (field, val) => onChange({ ...filters, [field]: val })

  const activeCount = [
    (filters.status || []).length,
    (filters.priority || []).length,
    filters.group ? 1 : 0,
    filters.agent ? 1 : 0,
    filters.dateFrom || filters.dateTo ? 1 : 0,
    filters.hasAttachment ? 1 : 0,
    filters.overdue ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 280, background: T.card, borderLeft: `1px solid ${T.border}`,
      zIndex: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: T.navy, fontFamily: T.font }}>
          Filters {activeCount > 0 && <span style={{ color: '#6366f1', fontSize: 12 }}>({activeCount})</span>}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeCount > 0 && (
            <button onClick={() => onChange({ status: [], priority: [], group: '', agent: '', dateFrom: '', dateTo: '', hasAttachment: false, overdue: false })}
              style={ghostBtn}>Clear all</button>
          )}
          <button onClick={onClose} style={ghostBtn}>✕</button>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1 }}>
        {/* Status */}
        <Section label="Status">
          {STATUSES.map(s => (
            <CheckRow key={s.key} label={s.label}
              checked={(filters.status || []).includes(s.key)}
              onChange={() => toggle('status', s.key)} />
          ))}
        </Section>

        {/* Priority */}
        <Section label="Priority">
          {PRIORITIES.map(p => (
            <CheckRow key={p.key} label={p.label}
              checked={(filters.priority || []).includes(p.key)}
              onChange={() => toggle('priority', p.key)} />
          ))}
        </Section>

        {/* Group */}
        <Section label="Group / Team">
          <select value={filters.group || ''} onChange={e => set('group', e.target.value)} style={selectStyle}>
            <option value="">All groups</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Section>

        {/* Agent (admin only) */}
        {isAdmin && (
          <Section label="Agent">
            <select value={filters.agent || ''} onChange={e => set('agent', e.target.value)} style={selectStyle}>
              <option value="">All agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.firstname} {a.lastname}</option>)}
            </select>
          </Section>
        )}

        {/* Date range */}
        <Section label="Date Created">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={filters.dateFrom || ''} onChange={e => set('dateFrom', e.target.value)}
              style={{ ...selectStyle, flex: 1 }} />
            <span style={{ color: T.muted, fontSize: 11 }}>to</span>
            <input type="date" value={filters.dateTo || ''} onChange={e => set('dateTo', e.target.value)}
              style={{ ...selectStyle, flex: 1 }} />
          </div>
        </Section>

        {/* Toggles */}
        <Section label="Other">
          <ToggleRow label="Has attachment" checked={!!filters.hasAttachment}
            onChange={() => set('hasAttachment', !filters.hasAttachment)} />
          <ToggleRow label="Overdue (past SLA)" checked={!!filters.overdue}
            onChange={() => set('overdue', !filters.overdue)} />
        </Section>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: T.font }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', fontFamily: T.font }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: '#6366f1' }} />
      <span style={{ fontSize: 13, color: T.navy }}>{label}</span>
    </label>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', cursor: 'pointer', fontFamily: T.font }}>
      <span style={{ fontSize: 13, color: T.navy }}>{label}</span>
      <div onClick={onChange} style={{
        width: 34, height: 18, borderRadius: 9, position: 'relative',
        background: checked ? '#6366f1' : '#d1d5db', transition: 'background 0.2s', cursor: 'pointer',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </label>
  )
}

const ghostBtn = {
  background: 'none', border: 'none', color: T.muted, fontSize: 12,
  cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontFamily: T.font,
}

const selectStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 6,
  border: `1px solid ${T.border}`, fontSize: 13, fontFamily: T.font,
  color: T.navy, background: '#fafafa', outline: 'none', boxSizing: 'border-box',
}
