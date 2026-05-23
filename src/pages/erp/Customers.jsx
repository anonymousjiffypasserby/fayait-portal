import { useState, useEffect, useCallback } from 'react'
import { T, PageHeader, SectionCard, DataTable, Btn, SearchBar, FilterSelect,
         ErrMsg, SetupNotice, fmtDate } from './shared'
import { erpCommerce, erpSetup } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

const CUST_TYPE_OPTIONS = [
  { value: 'Company',    label: 'Company' },
  { value: 'Individual', label: 'Individual' },
]

function CustomerList() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [type,    setType]    = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE = 30

  const load = useCallback(() => {
    setLoading(true); setError(null)
    const filters = []
    if (type) filters.push(['customer_type', '=', type])
    erpCommerce.getCustomers({ limit: PAGE, start: page * PAGE, filters: filters.length ? filters : undefined })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [type, page])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.name?.toLowerCase().includes(q)
          || r.customer_name?.toLowerCase().includes(q)
          || r.email_id?.toLowerCase().includes(q)
          || r.mobile_no?.toLowerCase().includes(q)
      })
    : rows

  const cols = [
    { key: 'customer_name', label: 'Name' },
    { key: 'customer_group', label: 'Group', width: 140 },
    { key: 'customer_type', label: 'Type', width: 110 },
    { key: 'territory', label: 'Territory', width: 130 },
    { key: 'mobile_no', label: 'Mobile', width: 140 },
    { key: 'email_id', label: 'Email' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Customers"
        sub="All customer records from ERPNext"
        actions={
          <a href={`${ERP_URL}/app/customer/new-customer-1`} target="_blank" rel="noreferrer"
            style={{ padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            + New in ERPNext
          </a>
        }
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(0) }} placeholder="Search by name, email or mobile…" />
        <FilterSelect value={type} onChange={v => { setType(v); setPage(0) }} options={CUST_TYPE_OPTIONS} placeholder="All Types" />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="👥" emptyMsg="No customers found"
            onRowClick={row => window.open(`${ERP_URL}/app/customer/${row.name}`, '_blank')}
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

function SupplierList() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE = 30

  const load = useCallback(() => {
    setLoading(true); setError(null)
    erpCommerce.getSuppliers({ limit: PAGE, start: page * PAGE })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.name?.toLowerCase().includes(q)
          || r.supplier_name?.toLowerCase().includes(q)
          || r.email_id?.toLowerCase().includes(q)
      })
    : rows

  const cols = [
    { key: 'supplier_name', label: 'Name' },
    { key: 'supplier_group', label: 'Group', width: 140 },
    { key: 'supplier_type', label: 'Type', width: 110 },
    { key: 'country', label: 'Country', width: 120 },
    { key: 'mobile_no', label: 'Mobile', width: 140 },
    { key: 'email_id', label: 'Email' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Suppliers"
        sub="All supplier records from ERPNext"
        actions={
          <a href={`${ERP_URL}/app/supplier/new-supplier-1`} target="_blank" rel="noreferrer"
            style={{ padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            + New in ERPNext
          </a>
        }
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(0) }} placeholder="Search by name or email…" />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="🏭" emptyMsg="No suppliers found"
            onRowClick={row => window.open(`${ERP_URL}/app/supplier/${row.name}`, '_blank')}
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

export default function Customers() {
  const [tab,     setTab]     = useState('customers')
  const [noSetup, setNoSetup] = useState(false)

  useEffect(() => {
    erpSetup.getCompanies().then(c => { if (!c.length) setNoSetup(true) }).catch(() => setNoSetup(true))
  }, [])

  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0 }}>
        {[
          { key: 'customers', label: '👥 Customers' },
          { key: 'suppliers', label: '🏭 Suppliers' },
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
        {tab === 'customers' ? <CustomerList key="customers" /> : <SupplierList key="suppliers" />}
      </div>
    </div>
  )
}
