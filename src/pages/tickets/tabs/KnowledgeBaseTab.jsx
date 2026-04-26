import { useState, useEffect } from 'react'
import { T, zammadApi } from '../shared'

export default function KnowledgeBaseTab({ ticketTitle, onInsert }) {
  const [kbs,      setKbs]      = useState([])
  const [answers,  setAnswers]  = useState([])
  const [search,   setSearch]   = useState(ticketTitle || '')
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    zammadApi.getKnowledgeBase()
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setKbs(list)
        // Load answers from first KB
        if (list[0]?.id) return zammadApi.getKnowledgeBaseAnswers(list[0].id)
      })
      .then(ans => { if (ans) setAnswers(Array.isArray(ans) ? ans : []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = answers.filter(a => {
    const q = search.toLowerCase()
    return !q || a.title?.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q)
  })

  if (loading) return <div style={{ padding: 24, color: T.muted, fontSize: 13 }}>Loading…</div>

  if (kbs.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>
        No knowledge base configured in Zammad.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.font }}>
      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search knowledge base…"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '7px 12px',
            borderRadius: 7, border: `1px solid ${T.border}`,
            fontSize: 13, fontFamily: T.font, color: T.navy, outline: 'none',
          }}
        />
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            No articles found
          </div>
        ) : (
          filtered.map(a => (
            <div key={a.id} style={{
              border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden',
            }}>
              {/* Article header */}
              <div
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between',
                  background: expanded === a.id ? '#eef2ff' : T.card,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{a.title}</span>
                <span style={{ fontSize: 11, color: T.muted }}>{expanded === a.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded body */}
              {expanded === a.id && (
                <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.border}` }}>
                  <div
                    style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, marginBottom: 10 }}
                    dangerouslySetInnerHTML={{ __html: a.body || a.content || '(no content)' }}
                  />
                  {onInsert && (
                    <button
                      onClick={() => onInsert(a.body || a.content || '')}
                      style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: '#eef2ff', color: '#6366f1', border: 'none', cursor: 'pointer',
                        fontFamily: T.font,
                      }}
                    >
                      Insert into reply
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
