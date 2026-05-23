import { useState, useEffect, useCallback } from 'react'
import { T, PageHeader, SectionCard, DataTable, Btn, SearchBar, FilterSelect,
         InvStatusBadge, fmtCurrency, fmtDate, ErrMsg, SetupNotice } from './shared'
import { erpFinance, erpSetup } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

const STATUS_OPTIONS = [
  { value: 'Draft',       label: 'Draft' },
  { value: 'Submitted',   label: 'Submitted' },
  { value: 'Unpaid',      label: 'Unpaid' },
  { value: 'Partly Paid', label: 'Partly Paid' },
  { value: 'Paid',        label: 'Paid' },
  { value: 'Overdue',     label: 'Overdue' },
  { value: 'Cancelled',   label: 'Cancelled' },
]

function InvoiceList({ type }) {
  const isSales = type === 'sales'
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE = 30

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const filters = []
    if (status)  filters.push([isSales ? 'status' : 'status', '=', status])
    const fn = isSales ? erpFinance.getSalesInvoices : erpFinance.getPurchaseInvoices
    fn({ limit: PAGE, start: page * PAGE, filters: filters.length ? filters : undefined })
      .then(data => setRows(data))
      .catch(e  => setError(e.message))
      .finally(() => setLoading(false))
  }, [type, status, page])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        const party = isSales ? r.customer : r.supplier
        return r.name?.toLowerCase().includes(q) || party?.toLowerCase().includes(q)
      })
    : rows

  const partyKey  = isSales ? 'customer'  : 'supplier'
  const partyLabel = isSales ? 'Customer' : 'Supplier'
  const newHref   = isSales
    ? `${ERP_URL}/app/sales-invoice/new-sales-invoice-1`
    : `${ERP_URL}/app/purchase-invoice/new-purchase-invoice-1`

  const cols = [
    { key: 'name',       label: 'Invoice ID', width: 160 },
    { key: partyKey,     label: partyLabel },
    { key: 'posting_date', label: 'Date',    render: v => fmtDate(v), width: 110 },
    { key: 'due_date',   label: 'Due',       render: v => fmtDate(v), width: 110 },
    { key: 'grand_total', label: 'Total',    render: (v,r) => fmtCurrency(v, r.currency), width: 130 },
    { key: 'outstanding_amount', label: 'Outstanding', render: (v,r) => {
      const n = parseFloat(v||0)
      return <span style={{ color: n > 0 ? T.red : T.green, fontWeight: 600 }}>{fmtCurrency(v,r.currency)}</span>
    }, width: 130 },
    { key: 'status', label: 'Status', render: v => <InvStatusBadge status={v} />, width: 130 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title={isSales ? 'Sales Invoices' : 'Purchase Bills'}
        sub={isSales ? 'All outgoing invoices raised to customers' : 'All incoming bills from suppliers'}
        actions={
          <a href={newHref} target="_blank" rel="noreferrer"
            style={{
              padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
            + New in ERPNext
          </a>
        }
      />

      {/* Filters */}
      <div style={{
        padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`,
        display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
      }}>
        <SearchBar
          value={search}
          onChange={v => { setSearch(v); setPage(0) }}
          placeholder={`Search by ${partyLabel.toLowerCase()} or ID…`}
        />
        <FilterSelect
          value={status}
          onChange={v => { setStatus(v); setPage(0) }}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
        />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>

      <ErrMsg error={error} />

      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable
            cols={cols}
            rows={filtered}
            loading={loading}
            emptyIcon={isSales ? '🧾' : '📄'}
            emptyMsg={`No ${isSales ? 'sales invoices' : 'purchase bills'} found`}
            onRowClick={row => window.open(`${ERP_URL}/app/${isSales ? 'sales' : 'purchase'}-invoice/${row.name}`, '_blank')}
          />
        </SectionCard>

        {/* Pagination */}
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

export default function Invoices() {
  const [tab, setTab] = useState('sales')
  const [noSetup, setNoSetup] = useState(false)

  useEffect(() => {
    erpSetup.getCompanies().then(c => { if (!c.length) setNoSetup(true) }).catch(() => setNoSetup(true))
  }, [])

  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      {/* Tab bar */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0,
      }}>
        {[
          { key: 'sales',    label: '🧾 Sales Invoices' },
          { key: 'purchase', label: '📄 Purchase Bills' },
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
        <InvoiceList key={tab} type={tab} />
      </div>
    </div>
  )
}
