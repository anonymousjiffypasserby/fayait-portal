import { T, ITEM_TYPE_ICONS, fmtDate, isCheckedOut } from './shared'

export default function KitTable({ kits, onOpen, onCheckout, isAdmin }) {
  if (!kits.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>◫</div>
        <div style={{ fontSize: 14 }}>No kits found</div>
      </div>
    )
  }

  const Th = ({ children, style }) => (
    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${T.border}`, background: '#fafbfc', whiteSpace: 'nowrap', ...style }}>
      {children}
    </th>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.font }}>
        <thead>
          <tr>
            <Th>Kit Name</Th>
            <Th>Items</Th>
            <Th>Status</Th>
            <Th>Checkouts</Th>
            <Th>Last Out</Th>
            <Th style={{ textAlign: 'right' }}>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {kits.map((kit, i) => {
            const out = isCheckedOut(kit)
            return (
              <tr
                key={kit.id}
                onClick={() => onOpen(kit)}
                style={{
                  background: i % 2 === 0 ? T.card : '#fafbfc',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? T.card : '#fafbfc'}
              >
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: T.text }}>
                  <div>{kit.name}</div>
                  {kit.notes && (
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 400, marginTop: 1, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {kit.notes}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {kit.item_count || 0}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>items</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                    background: out ? T.orange + '18' : T.green + '18',
                    color: out ? T.orange : T.green,
                    border: `1px solid ${out ? T.orange : T.green}30`,
                  }}>
                    {out ? 'Checked Out' : 'Available'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: T.text }}>
                  {kit.checkout_count || 0}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: T.muted }}>
                  {fmtDate(kit.last_checkout_date) || '—'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    {!out && (
                      <button
                        onClick={() => onCheckout(kit)}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}
                      >
                        Checkout
                      </button>
                    )}
                    {out && (
                      <span style={{ fontSize: 11, color: T.orange, fontWeight: 600, padding: '4px 6px' }}>Out</span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => onOpen(kit)}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: 'pointer', fontFamily: T.font }}
                      >
                        View
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
