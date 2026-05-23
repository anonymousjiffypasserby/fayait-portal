import { useState, useEffect, useCallback } from 'react'
import { T, PageHeader, SectionCard, DataTable, Btn, SearchBar, FilterSelect,
         DocStatusBadge, fmtCurrency, fmtDate, ErrMsg, SetupNotice, Spinner } from './shared'
import { erpInventory, erpSetup } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

const ENTRY_TYPES = [
  { value: 'Material Issue',       label: 'Material Issue' },
  { value: 'Material Receipt',     label: 'Material Receipt' },
  { value: 'Material Transfer',    label: 'Material Transfer' },
  { value: 'Manufacture',          label: 'Manufacture' },
  { value: 'Repack',               label: 'Repack' },
  { value: 'Send to Subcontractor',label: 'Send to Subcontractor' },
]

function StockEntriesTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [eType,   setEType]   = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE = 30

  const load = useCallback(() => {
    setLoading(true); setError(null)
    const filters = []
    if (eType) filters.push(['stock_entry_type', '=', eType])
    erpInventory.getStockEntries({ limit: PAGE, start: page * PAGE, filters: filters.length ? filters : undefined })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [eType, page])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.name?.toLowerCase().includes(q)
          || r.from_warehouse?.toLowerCase().includes(q)
          || r.to_warehouse?.toLowerCase().includes(q)
      })
    : rows

  const cols = [
    { key: 'name',             label: 'Entry ID', width: 160 },
    { key: 'stock_entry_type', label: 'Type', width: 180 },
    { key: 'posting_date',     label: 'Date', render: v => fmtDate(v), width: 110 },
    { key: 'from_warehouse',   label: 'From Warehouse' },
    { key: 'to_warehouse',     label: 'To Warehouse' },
    { key: 'total_amount',     label: 'Amount', render: v => fmtCurrency(v), width: 120 },
    { key: 'docstatus',        label: 'Status', render: v => <DocStatusBadge status={v} />, width: 100 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Stock Entries"
        sub="Inventory movement records"
        actions={
          <a href={`${ERP_URL}/app/stock-entry/new-stock-entry-1`} target="_blank" rel="noreferrer"
            style={{ padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            + New in ERPNext
          </a>
        }
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(0) }} placeholder="Search by ID or warehouse…" />
        <FilterSelect value={eType} onChange={v => { setEType(v); setPage(0) }} options={ENTRY_TYPES} placeholder="All Types" />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="📦" emptyMsg="No stock entries found"
            onRowClick={row => window.open(`${ERP_URL}/app/stock-entry/${row.name}`, '_blank')}
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

function WarehousesTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    erpInventory.getWarehouses()
      .then(w => setRows(w.filter(x => !x.is_group && !x.disabled)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? rows.filter(r => r.warehouse_name?.toLowerCase().includes(search.toLowerCase()) || r.name?.toLowerCase().includes(search.toLowerCase()))
    : rows

  const cols = [
    { key: 'warehouse_name', label: 'Warehouse Name' },
    { key: 'warehouse_type', label: 'Type', width: 150 },
    { key: 'parent_warehouse', label: 'Parent', width: 200 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Warehouses"
        sub="All warehouse locations"
        actions={
          <a href={`${ERP_URL}/app/warehouse/new-warehouse-1`} target="_blank" rel="noreferrer"
            style={{ padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            + New in ERPNext
          </a>
        }
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search warehouses…" />
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="🏭" emptyMsg="No warehouses found"
            onRowClick={row => window.open(`${ERP_URL}/app/warehouse/${encodeURIComponent(row.name)}`, '_blank')}
          />
        </SectionCard>
      </div>
    </div>
  )
}

function StockBalanceTab() {
  const [company,  setCompany]  = useState(null)
  const [report,   setReport]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    erpSetup.getCompanies().then(companies => {
      if (!companies.length) return
      const co = companies[0]
      setCompany(co)
      return erpInventory.stockBalance(co.name)
    }).then(r => {
      if (r) setReport(r)
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return (
    <div style={{ padding: 24 }}>
      <ErrMsg error={error} />
      <div style={{ fontSize: 13, color: T.muted }}>
        Stock Balance report requires ERPNext stock ledger entries. Open ERPNext to run full report.
      </div>
      <div style={{ marginTop: 12 }}>
        <a href={`${ERP_URL}/app/query-report/Stock%20Balance`} target="_blank" rel="noreferrer"
          style={{ color: T.orange, fontWeight: 600, fontSize: 13 }}>
          Open in ERPNext →
        </a>
      </div>
    </div>
  )

  const result = report?.result || []
  const cols = (report?.columns || []).map(c => ({
    key: typeof c === 'string' ? c.split(':')[0] : (c.fieldname || c.label),
    label: typeof c === 'string' ? c.split(':')[0] : (c.label || c.fieldname),
  }))

  const filtered = search
    ? result.filter(r => Array.isArray(r) ? r.some(v => String(v).toLowerCase().includes(search.toLowerCase())) : Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    : result

  if (!cols.length) return (
    <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
      No stock balance data. Add stock entries first.
      <div style={{ marginTop: 12 }}>
        <a href={`${ERP_URL}/app/query-report/Stock%20Balance`} target="_blank" rel="noreferrer"
          style={{ color: T.orange, fontWeight: 600 }}>Open in ERPNext →</a>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Stock Balance" sub={`Company: ${company?.company_name || '—'}`} />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Filter results…" />
        <a href={`${ERP_URL}/app/query-report/Stock%20Balance`} target="_blank" rel="noreferrer"
          style={{ padding: '5px 12px', borderRadius: 7, background: T.orangeLight, color: T.orange, fontSize: 12, fontWeight: 600, textDecoration: 'none', alignSelf: 'center' }}>
          Full Report in ERPNext →
        </a>
      </div>
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  {cols.map((c, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: T.muted }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    {cols.map((c, j) => (
                      <td key={j} style={{ padding: '10px 16px', color: T.navy, verticalAlign: 'middle' }}>
                        {Array.isArray(row) ? (row[j] ?? '—') : (row[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default function Inventory() {
  const [tab,     setTab]     = useState('entries')
  const [noSetup, setNoSetup] = useState(false)

  useEffect(() => {
    erpSetup.getCompanies().then(c => { if (!c.length) setNoSetup(true) }).catch(() => setNoSetup(true))
  }, [])

  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  const tabs = [
    { key: 'entries',   label: '📦 Stock Entries' },
    { key: 'warehouses',label: '🏭 Warehouses' },
    { key: 'balance',   label: '📊 Stock Balance' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '13px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? T.orange : T.muted,
            borderBottom: tab === t.key ? `2px solid ${T.orange}` : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'entries'    && <StockEntriesTab key="entries" />}
        {tab === 'warehouses' && <WarehousesTab   key="wh" />}
        {tab === 'balance'    && <StockBalanceTab key="balance" />}
      </div>
    </div>
  )
}
