import { useState, useEffect, useCallback } from 'react'
import { T, PageHeader, SectionCard, DataTable, Btn, SearchBar, FilterSelect,
         fmtCurrency, ErrMsg, SetupNotice } from './shared'
import { erpInventory, erpSetup } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

export default function Items() {
  const [rows,       setRows]       = useState([])
  const [groups,     setGroups]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [group,      setGroup]      = useState('')
  const [stockOnly,  setStockOnly]  = useState(false)
  const [page,       setPage]       = useState(0)
  const [noSetup,    setNoSetup]    = useState(false)
  const PAGE = 30

  useEffect(() => {
    erpSetup.getCompanies()
      .then(c => { if (!c.length) setNoSetup(true) })
      .catch(() => setNoSetup(true))
    erpInventory.getItemGroups()
      .then(g => setGroups(g.filter(x => !x.is_group).map(x => ({ value: x.name, label: x.name }))))
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true); setError(null)
    const filters = [['disabled', '=', 0]]
    if (group) filters.push(['item_group', '=', group])
    if (stockOnly) filters.push(['is_stock_item', '=', 1])
    erpInventory.getItems({ limit: PAGE, start: page * PAGE, filters })
      .then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [group, stockOnly, page])

  useEffect(() => { if (!noSetup) load() }, [load, noSetup])

  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  const filtered = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.item_name?.toLowerCase().includes(q) || r.item_code?.toLowerCase().includes(q)
      })
    : rows

  const cols = [
    { key: 'item_code',  label: 'Code', width: 150 },
    { key: 'item_name',  label: 'Name' },
    { key: 'item_group', label: 'Group', width: 150 },
    { key: 'stock_uom',  label: 'UOM', width: 80 },
    { key: 'valuation_rate', label: 'Valuation Rate', render: v => fmtCurrency(v), width: 140 },
    { key: 'is_stock_item', label: 'Stock Item', width: 100,
      render: v => (
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 5,
          fontSize: 11, fontWeight: 600,
          background: v ? '#dcfce7' : '#f1f5f9',
          color: v ? '#15803d' : '#475569',
        }}>{v ? 'Yes' : 'No'}</span>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      <PageHeader
        title="Items"
        sub="Product and service catalogue from ERPNext"
        actions={
          <a href={`${ERP_URL}/app/item/new-item-1`} target="_blank" rel="noreferrer"
            style={{ padding: '7px 16px', borderRadius: 7, background: T.navy, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            + New in ERPNext
          </a>
        }
      />
      <div style={{ padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(0) }} placeholder="Search by name or code…" />
        <FilterSelect value={group} onChange={v => { setGroup(v); setPage(0) }} options={groups} placeholder="All Groups" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={stockOnly} onChange={e => { setStockOnly(e.target.checked); setPage(0) }} />
          Stock items only
        </label>
        <Btn onClick={load} variant="outline" small>↻ Refresh</Btn>
      </div>
      <ErrMsg error={error} />
      <div className="erp-content" style={{ flex: 1, overflowY: 'auto' }}>
        <SectionCard>
          <DataTable cols={cols} rows={filtered} loading={loading}
            emptyIcon="📦" emptyMsg="No items found"
            onRowClick={row => window.open(`${ERP_URL}/app/item/${row.name}`, '_blank')}
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
