import { useState, useEffect, useCallback } from 'react'
import { T, hrApi, fmtDate, Avatar, Spinner, EmptyState, EmpStatusBadge, ContractBadge } from './shared'
import EmployeeDetail from './EmployeeDetail'

export default function Employees({ user }) {
  const [employees, setEmployees] = useState([])
  const [depts, setDepts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterDept, setFilterDept]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterContract, setFilterContract] = useState('')
  const [selected, setSelected]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    hrApi.getEmployees()
      .then(d => {
        const rows = Array.isArray(d) ? d : (d?.rows || [])
        setEmployees(rows)
        const deptSet = [...new Set(rows.map(e => e.department_name || e.department).filter(Boolean))]
        setDepts(deptSet.sort())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchQ = !q || [e.name, e.email, e.job_title, e.employee_number, e.job_function_name]
      .some(v => v?.toLowerCase().includes(q))
    const matchDept   = !filterDept    || (e.department_name || e.department) === filterDept
    const matchStatus = !filterStatus  || e.employment_status === filterStatus
    const matchCon    = !filterContract|| e.contract_type === filterContract
    return matchQ && matchDept && matchStatus && matchCon
  })

  const selStyle = (active) => ({
    padding: '6px 12px', borderRadius: 6, border: `1px solid ${active ? T.orange : 'rgba(0,0,0,0.12)'}`,
    background: active ? '#fff8f5' : '#fff', color: active ? T.orange : '#374151',
    fontSize: 12, cursor: 'pointer', fontFamily: T.font,
  })

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>
            Employees
            <span style={{ fontSize: 13, color: T.muted, fontWeight: 400, marginLeft: 8 }}>
              {filtered.length} of {employees.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            placeholder="Search name, email, title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '7px 12px', borderRadius: 7,
              border: '1px solid rgba(0,0,0,0.14)', fontSize: 13, outline: 'none',
              fontFamily: T.font,
            }}
          />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selStyle(!!filterDept)}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle(!!filterStatus)}>
            <option value="">All Statuses</option>
            {['active','inactive','on_leave','terminated'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select value={filterContract} onChange={e => setFilterContract(e.target.value)} style={selStyle(!!filterContract)}>
            <option value="">All Contracts</option>
            {['full_time','part_time','contractor','intern'].map(c => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
          : filtered.length === 0
            ? <EmptyState icon="👥" title="No employees found" sub="Try adjusting your filters." />
            : (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: '#fafbfc' }}>
                      {['Employee', 'Job Title', 'Department', 'Manager', 'Contract', 'Status', 'Start Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp, i) => (
                      <tr
                        key={emp.id}
                        onClick={() => setSelected(emp)}
                        style={{
                          borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                          cursor: 'pointer',
                          background: selected?.id === emp.id ? '#fff8f5' : '#fff',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (selected?.id !== emp.id) e.currentTarget.style.background = '#f8f9fa' }}
                        onMouseLeave={e => { if (selected?.id !== emp.id) e.currentTarget.style.background = '#fff' }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={emp.name} url={emp.avatar_url} size={32} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: T.muted }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: T.navy }}>{emp.job_title || emp.job_function_name || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: T.muted }}>{emp.department_name || emp.department || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: T.muted }}>{emp.manager_name || '—'}</td>
                        <td style={{ padding: '12px 14px' }}><ContractBadge type={emp.contract_type} /></td>
                        <td style={{ padding: '12px 14px' }}><EmpStatusBadge status={emp.employment_status || 'active'} /></td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: T.muted }}>{fmtDate(emp.start_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Detail panel */}
      {selected && (
        <EmployeeDetail
          employee={selected}
          user={user}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}
