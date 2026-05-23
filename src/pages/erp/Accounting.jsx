import { useState, useEffect, useCallback } from 'react'
import { T, PageHeader, SectionCard, DataTable, Btn, SearchBar, FilterSelect,
         DocStatusBadge, fmtCurrency, fmtDate, ErrMsg, SetupNotice } from './shared'
import { erpFinance, erpSetup } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

const JE_TYPES = [
  { value: 'Journal Entry',          label: 'Journal Entry' },
  { value: 'Bank Entry',             label: 'Bank Entry' },
  { value: 'Cash Entry',             label: 'Cash Entry' },
  { value: 'Credit Card Entry',      label: 'Credit Card Entry' },
  { value: 'Debit Note',             label: 'Debit Note' },
  { value: 'Credit Note',            label: 'Credit Note' },
  { value: 'Opening Entry',          label: 'Opening Entry' },
  { value: 'Depreciation Entry',     label: 'Depreciation Entry' },
  { value: 'Exchange Rate Revaluation', label: 'Exchange Rate Revaluation' },
]

const ACCOUNT_ROOTS = [
  { value: 'Asset',    label: 'Asset' },
  { value: 'Liability',label: 'Liability' },
  { value: 'Equity',   label: 'Equity' },
  { value: 'Income',   label: 'Income' },
  { value: 'Expense',  label: 'Expense' },
]

function JournalTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [jeType,  setJeType]  = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE = 30

  const load = useCallback(() => {
    setLoading(true); setError(null)
    const filters = [['docstatus', '!=', 2]]
    if (jeType) filters.push(['voucher_type', '=', jeType])
    erpFinance.getJournalEntries({ limit: PAGE, start: page * PAGE, filters })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [jeType, page])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.name?.toLowerCase().includes(q) || r.remark?.toLowerCase().includes(q)
      })
    : rows

  const cols = [
    { key: 'name',         label: 'Entry ID', width: 160 },
    { key: 'voucher_type', label: 'Type', width: 180 },
    { key: 'posting_date', label: 'Date', render: v => fmtDate(v), width: 110 },
    { key: 'total_debit',  label: 'Total Debit', render: v => fmtCurrency(v), width: 130 },
    { key: 'remark',       label: 'Remark' },
    { key: 'docstatus',    label: 'Status', render: v => <DocStatusBadge status={v} />, width: 110 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Journal Entries"
        sub="General ledger journal entries"
        actions={
          <a href={`${ERP_URL}/app/journal-entry/new-journal-entry-1`} target="_blank" rel="noreferrer"
            style={{ padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            + New in ERPNext
          </a>
        }
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(0) }} placeholder="Search by ID or remark…" />
        <FilterSelect value={jeType} onChange={v => { setJeType(v); setPage(0) }} options={JE_TYPES} placeholder="All Types" />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="📒" emptyMsg="No journal entries found"
            onRowClick={row => window.open(`${ERP_URL}/app/journal-entry/${row.name}`, '_blank')}
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

function AccountsTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [root,    setRoot]    = useState('')
  const PAGE = 200

  const load = useCallback(() => {
    setLoading(true); setError(null)
    const filters = [['is_group', '=', 0]]
    if (root) filters.push(['root_type', '=', root])
    erpFinance.getAccounts({ limit: PAGE, filters })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [root])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.account_name?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q)
      })
    : rows

  const ROOT_COLORS = {
    Asset:    { bg: '#dbeafe', color: '#1d4ed8' },
    Liability:{ bg: '#fee2e2', color: '#b91c1c' },
    Equity:   { bg: '#f5f3ff', color: '#4c1d95' },
    Income:   { bg: '#dcfce7', color: '#15803d' },
    Expense:  { bg: '#fef3c7', color: '#92400e' },
  }

  const cols = [
    { key: 'account_name',  label: 'Account Name' },
    { key: 'account_type',  label: 'Type', width: 160 },
    { key: 'root_type',     label: 'Root', width: 110,
      render: v => {
        const s = ROOT_COLORS[v] || { bg: '#f1f5f9', color: '#475569' }
        return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, ...s }}>{v}</span>
      },
    },
    { key: 'parent_account', label: 'Parent' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Chart of Accounts" sub="Account master list" />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search accounts…" />
        <FilterSelect value={root} onChange={setRoot} options={ACCOUNT_ROOTS} placeholder="All Root Types" />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="📊" emptyMsg="No accounts found"
            onRowClick={row => window.open(`${ERP_URL}/app/account/${encodeURIComponent(row.name)}`, '_blank')}
          />
        </SectionCard>
      </div>
    </div>
  )
}

function GLTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(0)
  const PAGE = 50

  const load = useCallback(() => {
    setLoading(true); setError(null)
    erpFinance.getGLEntries({ limit: PAGE, start: page * PAGE })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.account?.toLowerCase().includes(q) || r.voucher_no?.toLowerCase().includes(q)
      })
    : rows

  const cols = [
    { key: 'posting_date', label: 'Date',    render: v => fmtDate(v), width: 110 },
    { key: 'account',      label: 'Account' },
    { key: 'voucher_type', label: 'Voucher Type', width: 160 },
    { key: 'voucher_no',   label: 'Voucher No',   width: 160 },
    { key: 'debit',        label: 'Debit',  render: v => fmtCurrency(v), width: 120 },
    { key: 'credit',       label: 'Credit', render: v => fmtCurrency(v), width: 120 },
    { key: 'remarks',      label: 'Remarks' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="GL Entries" sub="General ledger transaction log" />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(0) }} placeholder="Search by account or voucher…" />
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="📋" emptyMsg="No GL entries found"
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

export default function Accounting() {
  const [tab,     setTab]     = useState('journal')
  const [noSetup, setNoSetup] = useState(false)

  useEffect(() => {
    erpSetup.getCompanies().then(c => { if (!c.length) setNoSetup(true) }).catch(() => setNoSetup(true))
  }, [])

  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  const tabs = [
    { key: 'journal',  label: '📒 Journal Entries' },
    { key: 'accounts', label: '📊 Chart of Accounts' },
    { key: 'gl',       label: '📋 GL Entries' },
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
        {tab === 'journal'  && <JournalTab  key="journal"  />}
        {tab === 'accounts' && <AccountsTab key="accounts" />}
        {tab === 'gl'       && <GLTab       key="gl"       />}
      </div>
    </div>
  )
}
