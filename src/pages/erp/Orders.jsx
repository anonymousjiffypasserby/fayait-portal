import { useState, useEffect, useCallback } from 'react'
import { T, PageHeader, SectionCard, DataTable, Btn, SearchBar, FilterSelect,
         OrderStatusBadge, fmtCurrency, fmtDate, ErrMsg, SetupNotice } from './shared'
import { erpCommerce, erpSetup } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

const SO_STATUS = [
  { value: 'Draft',               label: 'Draft' },
  { value: 'To Deliver and Bill', label: 'To Deliver and Bill' },
  { value: 'To Bill',             label: 'To Bill' },
  { value: 'To Deliver',          label: 'To Deliver' },
  { value: 'Completed',           label: 'Completed' },
  { value: 'Cancelled',           label: 'Cancelled' },
  { value: 'Closed',              label: 'Closed' },
]

function OrderList({ type }) {
  const isSales = type === 'sales'
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE = 30

  const load = useCallback(() => {
    setLoading(true); setError(null)
    const filters = []
    if (status) filters.push(['status', '=', status])
    const fn = isSales ? erpCommerce.getSalesOrders : erpCommerce.getPurchaseOrders
    fn({ limit: PAGE, start: page * PAGE, filters: filters.length ? filters : undefined })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [type, status, page])

  useEffect(() => { load() }, [load])

  const partyKey   = isSales ? 'customer' : 'supplier'
  const partyLabel = isSales ? 'Customer' : 'Supplier'
  const dateKey    = isSales ? 'delivery_date' : 'schedule_date'
  const dateLabel  = isSales ? 'Delivery' : 'Required'
  const newPath    = isSales
    ? `${ERP_URL}/app/sales-order/new-sales-order-1`
    : `${ERP_URL}/app/purchase-order/new-purchase-order-1`
  const erpPath    = isSales ? 'sales-order' : 'purchase-order'

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.name?.toLowerCase().includes(q) || r[partyKey]?.toLowerCase().includes(q)
      })
    : rows

  const cols = [
    { key: 'name',             label: 'Order ID', width: 160 },
    { key: partyKey,           label: partyLabel },
    { key: 'transaction_date', label: 'Date',     render: v => fmtDate(v), width: 110 },
    { key: dateKey,            label: dateLabel,  render: v => fmtDate(v), width: 110 },
    { key: 'grand_total',      label: 'Total',    render: (v,r) => fmtCurrency(v, r.currency), width: 130 },
    { key: 'status',           label: 'Status',   render: v => <OrderStatusBadge status={v} />, width: 160 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title={isSales ? 'Sales Orders' : 'Purchase Orders'}
        sub={isSales ? 'Outgoing orders to customers' : 'Incoming orders from suppliers'}
        actions={
          <a href={newPath} target="_blank" rel="noreferrer"
            style={{ padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            + New in ERPNext
          </a>
        }
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(0) }} placeholder={`Search by ${partyLabel.toLowerCase()} or ID…`} />
        <FilterSelect value={status} onChange={v => { setStatus(v); setPage(0) }} options={SO_STATUS} placeholder="All Statuses" />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon={isSales ? '📦' : '🛒'}
            emptyMsg={`No ${isSales ? 'sales orders' : 'purchase orders'} found`}
            onRowClick={row => window.open(`${ERP_URL}/app/${erpPath}/${row.name}`, '_blank')}
          />
        </SectionCard>
        {!loading && rows.length === PAGE && (
          <div style={{ display: 'flex', gap: 10, padding: 16, justifyContent: 'center' }}>
            <Btn onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} variant="outline" small>← Prev</Btn>
            <span style={{ fontSize: 13, color: T.muted, alignSelf: 'center' }}>Page {page + 1}</span>
            <Btn onClick={() => setPage(p => p+1)} variant="outline" small>Next →</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Orders() {
  const [tab,     setTab]     = useState('sales')
  const [noSetup, setNoSetup] = useState(false)

  useEffect(() => {
    erpSetup.getCompanies().then(c => { if (!c.length) setNoSetup(true) }).catch(() => setNoSetup(true))
  }, [])

  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0 }}>
        {[
          { key: 'sales',    label: '📦 Sales Orders' },
          { key: 'purchase', label: '🛒 Purchase Orders' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '13px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? T.orange : T.muted,
            borderBottom: tab === t.key ? `2px solid ${T.orange}` : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <OrderList key={tab} type={tab} />
      </div>
    </div>
  )
}
