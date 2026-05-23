// ERPNext REST API client
// Auth: shared Administrator token (replaced by per-user Keycloak Bearer tokens when SSO is live)
const ERP_URL   = import.meta.env.VITE_ERP_URL   || 'https://erp.fayait.com'
const ERP_TOKEN = import.meta.env.VITE_ERP_TOKEN  || '306686e0fa0c28d:05e917b76198d96'

const hdrs = () => ({
  'Authorization': `token ${ERP_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
})

async function req(method, path, body) {
  const res = await fetch(`${ERP_URL}${path}`, {
    method,
    headers: hdrs(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = `ERPNext ${res.status}`
    try { const d = await res.json(); msg = d.exception || d.message || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

// ── Core REST helpers ─────────────────────────────────────────────────────────

export function erpList(doctype, { fields = ['name'], filters = [], limit = 50, orderBy = 'modified desc', start = 0 } = {}) {
  const dt = encodeURIComponent(doctype)
  const f  = encodeURIComponent(JSON.stringify(fields))
  const fl = encodeURIComponent(JSON.stringify(filters))
  return req('GET', `/api/resource/${dt}?fields=${f}&filters=${fl}&limit_page_length=${limit}&limit_start=${start}&order_by=${encodeURIComponent(orderBy)}`)
    .then(r => r.data || [])
}

export function erpGet(doctype, name) {
  return req('GET', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)
    .then(r => r.data)
}

export function erpCreate(doctype, data) {
  return req('POST', `/api/resource/${encodeURIComponent(doctype)}`, data)
    .then(r => r.data)
}

export function erpUpdate(doctype, name, data) {
  return req('PUT', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, data)
    .then(r => r.data)
}

export function erpDelete(doctype, name) {
  return req('DELETE', `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)
}

export function erpMethod(method, params = {}) {
  const qs = Object.entries(params).map(([k, v]) =>
    `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : v)}`
  ).join('&')
  return req('GET', `/api/method/${method}${qs ? '?' + qs : ''}`)
    .then(r => r.message)
}

export function erpMethodPost(method, body = {}) {
  return req('POST', `/api/method/${method}`, body).then(r => r.message)
}

export function erpSubmit(doctype, name) {
  return erpMethodPost('frappe.client.submit', { doctype, name })
}

export function erpCancel(doctype, name) {
  return erpMethodPost('frappe.client.cancel', { doctype, name })
}

// Run any built-in ERPNext report
export function erpRunReport(reportName, filters = {}) {
  return erpMethodPost('frappe.desk.query_report.run', {
    report_name: reportName,
    filters,
    ignore_prepared_report: 1,
  })
}

// ── Finance helpers ───────────────────────────────────────────────────────────

export const erpFinance = {
  getSalesInvoices: (opts) => erpList('Sales Invoice', {
    fields: ['name', 'customer', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'currency'],
    orderBy: 'posting_date desc',
    ...opts,
  }),
  getPurchaseInvoices: (opts) => erpList('Purchase Invoice', {
    fields: ['name', 'supplier', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'status', 'currency'],
    orderBy: 'posting_date desc',
    ...opts,
  }),
  getPayments: (opts) => erpList('Payment Entry', {
    fields: ['name', 'payment_type', 'party_type', 'party', 'paid_amount', 'posting_date', 'docstatus', 'mode_of_payment'],
    orderBy: 'posting_date desc',
    ...opts,
  }),
  getJournalEntries: (opts) => erpList('Journal Entry', {
    fields: ['name', 'voucher_type', 'posting_date', 'total_debit', 'remark', 'docstatus'],
    orderBy: 'posting_date desc',
    ...opts,
  }),
  getAccounts: (opts) => erpList('Account', {
    fields: ['name', 'account_name', 'account_type', 'root_type', 'parent_account', 'is_group'],
    orderBy: 'name asc',
    ...opts,
  }),
  getGLEntries: (opts) => erpList('GL Entry', {
    fields: ['name', 'posting_date', 'account', 'debit', 'credit', 'voucher_type', 'voucher_no', 'remarks'],
    orderBy: 'posting_date desc',
    ...opts,
  }),
  balanceSheet: (company, fiscalYearStart, fiscalYearEnd) =>
    erpRunReport('Balance Sheet', { company, period_start_date: fiscalYearStart, period_end_date: fiscalYearEnd }),
  profitLoss: (company, periodStart, periodEnd) =>
    erpRunReport('Profit and Loss Statement', { company, period_start_date: periodStart, period_end_date: periodEnd }),
  accountsReceivable: (company) =>
    erpRunReport('Accounts Receivable', { company }),
  accountsPayable: (company) =>
    erpRunReport('Accounts Payable', { company }),
  cashFlow: (company, periodStart, periodEnd) =>
    erpRunReport('Cash Flow', { company, period_start_date: periodStart, period_end_date: periodEnd }),
}

// ── Commerce helpers ──────────────────────────────────────────────────────────

export const erpCommerce = {
  getCustomers: (opts) => erpList('Customer', {
    fields: ['name', 'customer_name', 'customer_group', 'customer_type', 'mobile_no', 'email_id', 'territory'],
    ...opts,
  }),
  getSuppliers: (opts) => erpList('Supplier', {
    fields: ['name', 'supplier_name', 'supplier_group', 'supplier_type', 'mobile_no', 'email_id', 'country'],
    ...opts,
  }),
  getSalesOrders: (opts) => erpList('Sales Order', {
    fields: ['name', 'customer', 'transaction_date', 'delivery_date', 'grand_total', 'status', 'currency'],
    orderBy: 'transaction_date desc',
    ...opts,
  }),
  getPurchaseOrders: (opts) => erpList('Purchase Order', {
    fields: ['name', 'supplier', 'transaction_date', 'schedule_date', 'grand_total', 'status', 'currency'],
    orderBy: 'transaction_date desc',
    ...opts,
  }),
  getQuotations: (opts) => erpList('Quotation', {
    fields: ['name', 'party_name', 'transaction_date', 'valid_till', 'grand_total', 'status'],
    orderBy: 'transaction_date desc',
    ...opts,
  }),
}

// ── Inventory helpers ─────────────────────────────────────────────────────────

export const erpInventory = {
  getItems: (opts) => erpList('Item', {
    fields: ['name', 'item_name', 'item_code', 'item_group', 'stock_uom', 'valuation_rate', 'is_stock_item', 'disabled'],
    ...opts,
  }),
  getItemGroups: () => erpList('Item Group', {
    fields: ['name', 'parent_item_group', 'is_group'],
    limit: 100,
  }),
  getWarehouses: () => erpList('Warehouse', {
    fields: ['name', 'warehouse_name', 'warehouse_type', 'parent_warehouse', 'is_group', 'disabled'],
    limit: 100,
  }),
  getStockEntries: (opts) => erpList('Stock Entry', {
    fields: ['name', 'stock_entry_type', 'posting_date', 'from_warehouse', 'to_warehouse', 'total_amount', 'docstatus'],
    orderBy: 'posting_date desc',
    ...opts,
  }),
  getMaterialRequests: (opts) => erpList('Material Request', {
    fields: ['name', 'material_request_type', 'transaction_date', 'schedule_date', 'status', 'company'],
    orderBy: 'transaction_date desc',
    ...opts,
  }),
  stockBalance: (company, warehouse, item) =>
    erpRunReport('Stock Balance', { company, ...(warehouse ? { warehouse } : {}), ...(item ? { item_code: item } : {}) }),
  stockAgeing: (company) =>
    erpRunReport('Stock Ageing', { company }),
}

// ── Company / Setup ───────────────────────────────────────────────────────────

export const erpSetup = {
  getCompanies: () => erpList('Company', {
    fields: ['name', 'company_name', 'abbr', 'default_currency', 'country', 'fiscal_year_start_date', 'fiscal_year_end_date'],
    limit: 10,
  }),
  getFiscalYears: () => erpList('Fiscal Year', {
    fields: ['name', 'year', 'year_start_date', 'year_end_date', 'is_fiscal_year_closed'],
    limit: 10,
    orderBy: 'year_start_date desc',
  }),
  getCurrencies: () => erpList('Currency', { fields: ['name', 'symbol', 'enabled'], filters: [['enabled', '=', 1]], limit: 200 }),
}

// ── Reports ───────────────────────────────────────────────────────────────────

export const erpReports = {
  getAll: () => erpList('Report', {
    fields: ['name', 'module', 'report_type', 'ref_doctype'],
    filters: [['disabled', '=', 0], ['is_standard', '=', 'Yes']],
    limit: 500,
    orderBy: 'module asc, name asc',
  }),
  run: (reportName, filters = {}) => erpRunReport(reportName, filters),
}
