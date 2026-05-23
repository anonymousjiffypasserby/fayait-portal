import { useState, useEffect } from 'react'
import { T, StatCard, SectionCard, DataTable, Spinner, EmptyState, InvStatusBadge,
         fmtCurrency, fmtDate, SetupNotice } from './shared'
import { erpSetup, erpFinance } from '../../services/erpnextApi'

const ERP_URL = import.meta.env.VITE_ERP_URL || 'https://erp.fayait.com'

export default function FinanceDashboard() {
  const [company,    setCompany]    = useState(null)
  const [noSetup,    setNoSetup]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [salesInv,   setSalesInv]   = useState([])
  const [purchInv,   setPurchInv]   = useState([])
  const [stats,      setStats]      = useState({ revenue: 0, ar: 0, ap: 0, customers: 0, suppliers: 0 })

  useEffect(() => {
    setLoading(true)
    erpSetup.getCompanies().then(companies => {
      if (!companies.length) { setNoSetup(true); setLoading(false); return }
      const co = companies[0]
      setCompany(co)

      const now   = new Date()
      const mStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
      const mEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10)

      Promise.allSettled([
        erpFinance.getSalesInvoices({ limit: 8, filters: [['docstatus','!=',2]] }),
        erpFinance.getPurchaseInvoices({ limit: 8, filters: [['docstatus','!=',2]] }),
        erpFinance.getSalesInvoices({
          limit: 500,
          fields: ['grand_total', 'outstanding_amount', 'status', 'customer'],
          filters: [['posting_date','between',[mStart,mEnd]],['docstatus','=',1]],
        }),
        // customer + supplier counts
        fetch(`${ERP_URL}/api/resource/Customer?limit_page_length=1&fields=["name"]`, {
          headers: { Authorization: `token ${import.meta.env.VITE_ERP_TOKEN||'306686e0fa0c28d:05e917b76198d96'}` }
        }).then(r=>r.json()),
        fetch(`${ERP_URL}/api/resource/Supplier?limit_page_length=1&fields=["name"]`, {
          headers: { Authorization: `token ${import.meta.env.VITE_ERP_TOKEN||'306686e0fa0c28d:05e917b76198d96'}` }
        }).then(r=>r.json()),
      ]).then(([si, pi, siMonth, custRes, suppRes]) => {
        if (si.status === 'fulfilled') setSalesInv(si.value)
        if (pi.status === 'fulfilled') setPurchInv(pi.value)

        let revenue = 0, ar = 0
        if (siMonth.status === 'fulfilled') {
          siMonth.value.forEach(inv => {
            revenue += parseFloat(inv.grand_total || 0)
            ar      += parseFloat(inv.outstanding_amount || 0)
          })
        }
        setStats(prev => ({
          ...prev, revenue, ar,
          customers: custRes?.data?.length ?? 0,
          suppliers: suppRes?.data?.length ?? 0,
        }))
      }).finally(() => setLoading(false))
    }).catch(() => { setNoSetup(true); setLoading(false) })
  }, [])

  if (loading) return <Spinner />
  if (noSetup) return <SetupNotice erpUrl={ERP_URL} />

  const invCols = [
    { key: 'name', label: 'Invoice', width: 140 },
    { key: 'customer', label: 'Customer' },
    { key: 'posting_date', label: 'Date', render: v => fmtDate(v), width: 110 },
    { key: 'grand_total', label: 'Total', render: (v,r) => fmtCurrency(v, r.currency), width: 120 },
    { key: 'outstanding_amount', label: 'Outstanding', render: (v,r) => {
      const n = parseFloat(v||0)
      return <span style={{ color: n > 0 ? T.red : T.green, fontWeight: 600 }}>{fmtCurrency(v,r.currency)}</span>
    }, width: 130 },
    { key: 'status', label: 'Status', render: v => <InvStatusBadge status={v} />, width: 120 },
  ]

  const purchCols = [
    { key: 'name', label: 'Bill', width: 140 },
    { key: 'supplier', label: 'Supplier' },
    { key: 'posting_date', label: 'Date', render: v => fmtDate(v), width: 110 },
    { key: 'grand_total', label: 'Total', render: (v,r) => fmtCurrency(v, r.currency), width: 120 },
    { key: 'outstanding_amount', label: 'Outstanding', render: (v,r) => {
      const n = parseFloat(v||0)
      return <span style={{ color: n > 0 ? T.yellow : T.green, fontWeight: 600 }}>{fmtCurrency(v,r.currency)}</span>
    }, width: 130 },
    { key: 'status', label: 'Status', render: v => <InvStatusBadge status={v} />, width: 120 },
  ]

  return (
    <div style={{ padding: 24, fontFamily: T.font, background: T.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>Finance Overview</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
          {company?.company_name} · {company?.default_currency}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          label="Revenue This Month"
          value={fmtCurrency(stats.revenue)}
          sub="Submitted sales invoices"
          accent={T.green}
          icon="💰"
        />
        <StatCard
          label="Accounts Receivable"
          value={fmtCurrency(stats.ar)}
          sub="Outstanding from customers"
          accent={T.yellow}
          icon="📥"
        />
        <StatCard
          label="Customers"
          value={stats.customers}
          sub="Active customer records"
          accent={T.blue}
          icon="👥"
        />
        <StatCard
          label="Suppliers"
          value={stats.suppliers}
          sub="Active supplier records"
          accent={T.orange}
          icon="🏭"
        />
      </div>

      {/* Two-column tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <SectionCard
          title="Recent Sales Invoices"
          action={
            <a href={`${ERP_URL}/app/sales-invoice`} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: T.orange, fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </a>
          }
        >
          <DataTable
            cols={invCols.slice(0, 4)}
            rows={salesInv}
            emptyIcon="🧾"
            emptyMsg="No sales invoices yet"
          />
        </SectionCard>

        <SectionCard
          title="Recent Purchase Bills"
          action={
            <a href={`${ERP_URL}/app/purchase-invoice`} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: T.orange, fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </a>
          }
        >
          <DataTable
            cols={purchCols.slice(0, 4)}
            rows={purchInv}
            emptyIcon="📄"
            emptyMsg="No purchase bills yet"
          />
        </SectionCard>
      </div>

      {/* Quick links to ERPNext */}
      <SectionCard title="Quick Actions">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 16 }}>
          {[
            { label: '+ New Sales Invoice',    href: `${ERP_URL}/app/sales-invoice/new-sales-invoice-1` },
            { label: '+ New Purchase Invoice', href: `${ERP_URL}/app/purchase-invoice/new-purchase-invoice-1` },
            { label: '+ New Payment Entry',    href: `${ERP_URL}/app/payment-entry/new-payment-entry-1` },
            { label: '+ New Journal Entry',    href: `${ERP_URL}/app/journal-entry/new-journal-entry-1` },
            { label: '+ New Customer',         href: `${ERP_URL}/app/customer/new-customer-1` },
            { label: '+ New Supplier',         href: `${ERP_URL}/app/supplier/new-supplier-1` },
          ].map(a => (
            <a
              key={a.href}
              href={a.href}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '8px 16px', borderRadius: 8,
                background: T.orangeLight, color: T.orange,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                border: `1px solid #f9c3ab`,
              }}
            >{a.label}</a>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
