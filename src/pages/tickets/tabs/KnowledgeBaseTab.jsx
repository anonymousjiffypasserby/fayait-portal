import { useState, useEffect, useRef } from 'react'
import { T, zammadApi } from '../shared'

// Extract body from Zammad 7 answer — body lives inside translations array
function answerBody(a) {
  if (!a) return ''
  if (Array.isArray(a.translations) && a.translations.length > 0) {
    const t = a.translations[0]
    return t?.content?.body || t?.body || ''
  }
  return a.body || a.content || ''
}

function answerTitle(a) {
  if (!a) return '(untitled)'
  if (Array.isArray(a.translations) && a.translations.length > 0) {
    return a.translations[0]?.title || a.title || '(untitled)'
  }
  return a.title || '(untitled)'
}

// Zammad KB search endpoint — empty query returns all published answers.
// Tries locale_default first, falls back to 'en'.
async function fetchAnswers(kbObj, query = '') {
  const locales = [
    kbObj?.locale_default,
    kbObj?.locales?.[0],
    'en-us',
    'en',
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

  for (const locale of locales) {
    try {
      const r = await zammadApi.searchKBAnswers(kbObj.id, query, locale)
      const list = Array.isArray(r) ? r
        : r?.result ? r.result
        : r?.answers ? r.answers
        : []
      if (list.length > 0 || query) return list  // trust empty-query result if no query
    } catch { /* try next locale */ }
  }
  return []
}

export default function KnowledgeBaseTab({ ticketTitle, onInsert, isAdmin }) {
  const [kb,        setKb]        = useState(null)
  const [answers,   setAnswers]   = useState([])
  const [search,    setSearch]    = useState(ticketTitle || '')
  const [loading,   setLoading]   = useState(true)
  const [searching, setSearching] = useState(false)
  const [creating,  setCreating]  = useState(false)
  const [expanded,  setExpanded]  = useState(null)
  const [error,     setError]     = useState(null)
  const kbRef       = useRef(null)
  const searchTimer = useRef(null)

  // Initial load — fetch KB then answers
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    zammadApi.getKnowledgeBases()
      .then(async data => {
        if (cancelled) return
        const list = Array.isArray(data) ? data
          : data?.assets?.KnowledgeBase ? Object.values(data.assets.KnowledgeBase)
          : []

        if (list.length === 0) { setKb(null); return }

        const first = list[0]
        setKb(first)
        kbRef.current = first
        const ans = await fetchAnswers(first, search)
        if (!cancelled) setAnswers(ans)
      })
      .catch(() => { if (!cancelled) setKb(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  // Debounced server-side search whenever the query changes (after KB loaded)
  useEffect(() => {
    if (!kbRef.current) return
    clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const results = await fetchAnswers(kbRef.current, search)
      setAnswers(results)
      setSearching(false)
    }, 320)
    return () => clearTimeout(searchTimer.current)
  }, [search])

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
      kbRef.current = newKb
      setAnswers([])
    } catch (err) {
      setError(err.message || 'Failed to create knowledge base')
    } finally {
      setCreating(false)
    }
  }

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
        {searching ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>Searching…</div>
        ) : answers.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
            {search ? `No articles match "${search}"` : 'No articles in this knowledge base yet.'}
          </div>
        ) : (
          answers.map(a => {
            const title = answerTitle(a)
            const body  = answerBody(a)
            return (
              <div key={a.id} style={{
                border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden',
              }}>
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
