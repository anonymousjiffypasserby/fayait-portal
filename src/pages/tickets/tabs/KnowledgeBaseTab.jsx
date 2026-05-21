import { useState, useEffect } from 'react'
import { T, zammadApi } from '../shared'

// Extract body from Zammad 7 answer — body lives inside translations array
function answerBody(a) {
  if (!a) return ''
  // Zammad 7: translations[].content.body or translations[].body
  if (Array.isArray(a.translations) && a.translations.length > 0) {
    const t = a.translations[0]
    return t?.content?.body || t?.body || ''
  }
  // Fallback for older formats
  return a.body || a.content || ''
}

function answerTitle(a) {
  if (!a) return '(untitled)'
  if (Array.isArray(a.translations) && a.translations.length > 0) {
    return a.translations[0]?.title || a.title || '(untitled)'
  }
  return a.title || '(untitled)'
}

export default function KnowledgeBaseTab({ ticketTitle, onInsert, isAdmin }) {
  const [kb,       setKb]       = useState(null)  // first KB object, or null
  const [answers,  setAnswers]  = useState([])
  const [search,   setSearch]   = useState(ticketTitle || '')
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [error,    setError]    = useState(null)

  const loadAnswers = async (kbObj) => {
    const locale = kbObj?.locale_default || kbObj?.locales?.[0] || 'en-us'
    try {
      const ans = await zammadApi.getKBAnswers(kbObj.id, locale).catch(() =>
        // Try without locale if the locale-based path 404s
        zammadApi.getKBAnswers(kbObj.id, 'en').catch(() => [])
      )
      setAnswers(Array.isArray(ans) ? ans : [])
    } catch {
      setAnswers([])
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    zammadApi.getKnowledgeBases()
      .then(data => {
        if (cancelled) return
        // Handle various response shapes
        const list = Array.isArray(data) ? data
          : data?.assets?.KnowledgeBase ? Object.values(data.assets.KnowledgeBase)
          : []
        if (list.length > 0) {
          setKb(list[0])
          return loadAnswers(list[0])
        }
        setKb(null)
      })
      .catch(() => { if (!cancelled) setKb(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleCreateKB = async () => {
    setCreating(true)
    setError(null)
    try {
      const newKb = await zammadApi.createKnowledgeBase({
        name: 'Knowledge Base',
        locale_default: 'en-us',
        color_highlight: '#38bdf8',
        color_header: '#1e3a5f',
        color_header_link: '#ffffff',
      })
      setKb(newKb)
      setAnswers([])
    } catch (err) {
      setError(err.message || 'Failed to create knowledge base')
    } finally {
      setCreating(false)
    }
  }

  const filtered = answers.filter(a => {
    const q = search.toLowerCase()
    if (!q) return true
    const title = answerTitle(a).toLowerCase()
    const body  = answerBody(a).toLowerCase()
    return title.includes(q) || body.includes(q)
  })

  if (loading) return <div style={{ padding: 24, color: T.muted, fontSize: 13 }}>Loading…</div>

  if (!kb) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontFamily: T.font }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 6 }}>No knowledge base</div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>
          No knowledge base has been configured in Zammad yet.
        </div>
        {error && (
          <div style={{ fontSize: 12, color: T.red, marginBottom: 12 }}>{error}</div>
        )}
        {isAdmin && (
          <button
            onClick={handleCreateKB}
            disabled={creating}
            style={{
              padding: '8px 20px', borderRadius: 7, border: 'none',
              background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600,
              fontFamily: T.font, cursor: creating ? 'default' : 'pointer',
            }}
          >
            {creating ? 'Creating…' : 'Create Knowledge Base'}
          </button>
        )}
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
        {answers.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            No articles in this knowledge base yet.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            No articles match "{search}"
          </div>
        ) : (
          filtered.map(a => {
            const title = answerTitle(a)
            const body  = answerBody(a)
            return (
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{title}</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{expanded === a.id ? '▲' : '▼'}</span>
                </div>

                {/* Expanded body */}
                {expanded === a.id && (
                  <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.border}` }}>
                    {body ? (
                      <div
                        style={{ fontSize: 12, color: T.navy, lineHeight: 1.6, marginBottom: 10 }}
                        dangerouslySetInnerHTML={{ __html: body }}
                      />
                    ) : (
                      <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>(no content)</div>
                    )}
                    {onInsert && (
                      <button
                        onClick={() => onInsert(body || '')}
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
            )
          })
        )}
      </div>
    </div>
  )
}
