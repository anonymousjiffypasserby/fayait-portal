import { useState, useEffect } from 'react'
import { T, zammadApi } from './shared'

// ── Shared styles ──────────────────────────────────────────────────────────────
const card = {
  background: T.card, borderRadius: 10, border: `1px solid ${T.border}`,
  padding: '20px 24px', marginBottom: 18,
}
const label = { fontSize: 12, fontWeight: 600, color: T.navy, marginBottom: 4, display: 'block' }
const input = (extra = {}) => ({
  width: '100%', boxSizing: 'border-box', padding: '8px 12px',
  borderRadius: 7, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: T.font, color: T.navy,
  background: '#fafafa', outline: 'none', ...extra,
})
const btn = (color = '#6366f1', outline = false) => ({
  padding: '7px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600,
  fontFamily: T.font, cursor: 'pointer',
  border: outline ? `1px solid ${color}` : 'none',
  background: outline ? 'transparent' : color,
  color: outline ? color : '#fff',
})
const dangerBtn = { ...btn('#e74c3c'), padding: '5px 12px', fontSize: 12 }
const pill = (active) => ({
  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  border: `1px solid ${active ? '#6366f1' : T.border}`,
  background: active ? '#eef2ff' : '#fafafa',
  color: active ? '#6366f1' : T.muted,
  cursor: 'pointer', fontFamily: T.font,
})

// ── Channels tab ───────────────────────────────────────────────────────────────
function ChannelsTab() {
  const [channels,   setChannels]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [deleting,   setDeleting]   = useState(null)
  const [error,      setError]      = useState(null)

  const load = () => {
    setLoading(true)
    zammadApi.getEmailChannels()
      .then(data => {
        const raw = data?.assets?.Channel || {}
        setChannels(Object.values(raw))
      })
      .catch(() => setChannels([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this email channel?')) return
    setDeleting(id)
    try {
      await zammadApi.deleteEmailChannel(id)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div style={{ padding: 32, color: T.muted, fontSize: 13 }}>Loading…</div>

  return (
    <div>
      {error && (
        <div style={{ background: '#fef2f2', border: `1px solid #fecaca`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: T.red }}>
          {error}
        </div>
      )}

      {channels.length === 0 && !showWizard && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✉</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 6 }}>No email channels configured</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Add an email account to send and receive tickets via email.</div>
          <button onClick={() => setShowWizard(true)} style={btn()}>+ Add Email Channel</button>
        </div>
      )}

      {channels.map(ch => (
        <div key={ch.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
                  {ch.options?.outbound?.options?.user || ch.area || `Channel ${ch.id}`}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10,
                  background: ch.active ? '#dcfce7' : '#f1f5f9',
                  color: ch.active ? '#16a34a' : T.muted,
                  fontWeight: 600,
                }}>{ch.active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>
                {ch.area && <span style={{ marginRight: 12 }}>Area: {ch.area}</span>}
                {ch.options?.outbound?.adapter && (
                  <span style={{ marginRight: 12 }}>
                    Outbound: {ch.options.outbound.adapter.toUpperCase()}
                    {ch.options.outbound.options?.host && ` (${ch.options.outbound.options.host})`}
                  </span>
                )}
                {ch.options?.inbound?.adapter && (
                  <span>Inbound: {ch.options.inbound.adapter.toUpperCase()}
                    {ch.options.inbound.options?.host && ` (${ch.options.inbound.options.host})`}
                  </span>
                )}
              </div>
              {(ch.status_out || ch.status_in) && (
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                  {ch.status_out && <span style={{ marginRight: 12, color: ch.status_out === 'ok' ? '#16a34a' : T.red }}>Out: {ch.status_out}</span>}
                  {ch.status_in  && <span style={{ color: ch.status_in  === 'ok' ? '#16a34a' : T.red }}>In: {ch.status_in}</span>}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDelete(ch.id)}
              disabled={deleting === ch.id}
              style={dangerBtn}
            >
              {deleting === ch.id ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      ))}

      {channels.length > 0 && !showWizard && (
        <button onClick={() => setShowWizard(true)} style={btn()}>+ Add Email Channel</button>
      )}

      {showWizard && (
        <AddChannelWizard onDone={() => { setShowWizard(false); load() }} onCancel={() => setShowWizard(false)} />
      )}
    </div>
  )
}

function AddChannelWizard({ onDone, onCancel }) {
  const [step,    setStep]    = useState('probe') // probe | manual | done
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState(null)
  const [error,   setError]   = useState(null)

  // Manual form state
  const [smtpHost,  setSmtpHost]  = useState('')
  const [smtpPort,  setSmtpPort]  = useState('587')
  const [smtpSsl,   setSmtpSsl]   = useState(true)
  const [imapHost,  setImapHost]  = useState('')
  const [imapPort,  setImapPort]  = useState('993')
  const [imapSsl,   setImapSsl]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  const handleProbe = async () => {
    if (!email || !pass) return
    setProbing(true)
    setError(null)
    try {
      const result = await zammadApi.probeEmailChannel({ email, password: pass })
      setProbeResult(result)
      if (result?.result === 'ok' || result?.inbound || result?.outbound) {
        // Pre-fill manual form with probed values
        const ob = result?.outbound?.options || result?.outbound || {}
        const ib = result?.inbound?.options  || result?.inbound  || {}
        if (ob.host) setSmtpHost(ob.host)
        if (ob.port) setSmtpPort(String(ob.port))
        if (ib.host) setImapHost(ib.host)
        if (ib.port) setImapPort(String(ib.port))
        setStep('manual')
      } else {
        setStep('manual')
      }
    } catch (err) {
      setError(err.message)
      setStep('manual')
    } finally {
      setProbing(false)
    }
  }

  const handleSave = async () => {
    if (!email || !pass) return
    setSaving(true)
    setError(null)
    try {
      // Configure outbound (SMTP)
      await zammadApi.setEmailChannelOutbound({
        adapter: 'smtp',
        options: {
          host: smtpHost, port: parseInt(smtpPort, 10),
          user: email, password: pass, ssl: smtpSsl,
        },
      })
      // Configure inbound (IMAP) if host provided
      if (imapHost) {
        await zammadApi.setEmailChannelInbound({
          adapter: 'imap',
          options: {
            host: imapHost, port: parseInt(imapPort, 10),
            user: email, password: pass, ssl: imapSsl,
          },
        })
      }
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 16 }}>
        {step === 'probe' ? 'Add Email Channel' : step === 'done' ? 'Channel Configured' : 'Configure Email Settings'}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', borderRadius: 7, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: T.red }}>
          {error}
        </div>
      )}

      {step === 'done' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 6 }}>Email channel configured!</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Tickets can now be created and answered via email.</div>
          <button onClick={onDone} style={btn()}>Done</button>
        </div>
      ) : step === 'probe' ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>Email address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="support@example.com" style={input()} />
            </div>
            <div>
              <label style={label}>Password</label>
              <input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="••••••••" style={input()} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleProbe} disabled={!email || !pass || probing} style={btn()}>
              {probing ? 'Detecting…' : 'Auto-detect Settings'}
            </button>
            <button onClick={() => setStep('manual')} style={btn(T.muted, true)}>
              Manual Setup
            </button>
            <button onClick={onCancel} style={{ ...btn(T.muted, true), marginLeft: 'auto' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          {probeResult && (
            <div style={{ background: '#f0fdf4', borderRadius: 7, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: '#166534' }}>
              Settings auto-detected. Review and confirm below.
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 10 }}>Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={label}>Email address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="support@example.com" style={input()} />
            </div>
            <div>
              <label style={label}>Password</label>
              <input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="••••••••" style={input()} />
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 10 }}>Outbound (SMTP)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, marginBottom: 16, alignItems: 'end' }}>
            <div>
              <label style={label}>SMTP Host</label>
              <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" style={input()} />
            </div>
            <div>
              <label style={label}>Port</label>
              <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" style={input()} />
            </div>
            <div style={{ paddingBottom: 2 }}>
              <label style={{ ...label, marginBottom: 8 }}>SSL/TLS</label>
              <input type="checkbox" checked={smtpSsl} onChange={e => setSmtpSsl(e.target.checked)} style={{ width: 16, height: 16 }} />
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 10 }}>Inbound (IMAP) — optional</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, marginBottom: 20, alignItems: 'end' }}>
            <div>
              <label style={label}>IMAP Host</label>
              <input value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.gmail.com" style={input()} />
            </div>
            <div>
              <label style={label}>Port</label>
              <input value={imapPort} onChange={e => setImapPort(e.target.value)} placeholder="993" style={input()} />
            </div>
            <div style={{ paddingBottom: 2 }}>
              <label style={{ ...label, marginBottom: 8 }}>SSL/TLS</label>
              <input type="checkbox" checked={imapSsl} onChange={e => setImapSsl(e.target.checked)} style={{ width: 16, height: 16 }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={!email || !pass || !smtpHost || saving} style={btn()}>
              {saving ? 'Saving…' : 'Save Channel'}
            </button>
            <button onClick={() => setStep('probe')} style={btn(T.muted, true)}>Back</button>
            <button onClick={onCancel} style={{ ...btn(T.muted, true), marginLeft: 'auto' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Email Addresses tab ────────────────────────────────────────────────────────
function AddressesTab() {
  const [addresses, setAddresses] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(null)   // null | 'new' | address object
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [error,     setError]     = useState(null)

  const load = () => {
    setLoading(true)
    zammadApi.getEmailAddresses()
      .then(r => setAddresses(Array.isArray(r) ? r : []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    setSaving(true)
    setError(null)
    try {
      if (editing === 'new') {
        await zammadApi.createEmailAddress(form)
      } else {
        await zammadApi.updateEmailAddress(editing.id, form)
      }
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this email address?')) return
    setDeleting(id)
    try {
      await zammadApi.deleteEmailAddress(id)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div style={{ padding: 32, color: T.muted, fontSize: 13 }}>Loading…</div>

  return (
    <div>
      {error && (
        <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: T.red }}>
          {error}
        </div>
      )}

      {addresses.length === 0 && !editing && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>@</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 6 }}>No email addresses</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Add an email address to use as the sender for ticket emails.</div>
          <button onClick={() => setEditing('new')} style={btn()}>+ Add Email Address</button>
        </div>
      )}

      {addresses.map(addr => (
        <div key={addr.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 2 }}>
                {addr.realname ? `${addr.realname} <${addr.email}>` : addr.email}
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>
                {addr.channel_id && <span style={{ marginRight: 12 }}>Channel #{addr.channel_id}</span>}
                {addr.default && <span style={{ color: '#6366f1', fontWeight: 600 }}>Default</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(addr)} style={btn('#6366f1', true)}>Edit</button>
              <button onClick={() => handleDelete(addr.id)} disabled={deleting === addr.id} style={dangerBtn}>
                {deleting === addr.id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {addresses.length > 0 && !editing && (
        <button onClick={() => setEditing('new')} style={btn()}>+ Add Email Address</button>
      )}

      {editing && (
        <AddressForm
          initial={editing === 'new' ? null : editing}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          error={error}
        />
      )}
    </div>
  )
}

function AddressForm({ initial, saving, onSave, onCancel, error }) {
  const [email,    setEmail]    = useState(initial?.email    || '')
  const [realname, setRealname] = useState(initial?.realname || '')
  const [isDefault, setDefault] = useState(initial?.default  || false)

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 16 }}>
        {initial ? 'Edit Email Address' : 'Add Email Address'}
      </div>
      {error && (
        <div style={{ background: '#fef2f2', borderRadius: 7, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: T.red }}>{error}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={label}>Email address *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="support@example.com" style={input()} />
        </div>
        <div>
          <label style={label}>Display name</label>
          <input value={realname} onChange={e => setRealname(e.target.value)} placeholder="Acme Support" style={input()} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.navy, cursor: 'pointer' }}>
          <input type="checkbox" checked={isDefault} onChange={e => setDefault(e.target.checked)} />
          Set as default address
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onSave({ email, realname, default: isDefault })}
          disabled={!email || saving}
          style={btn()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} style={btn(T.muted, true)}>Cancel</button>
      </div>
    </div>
  )
}

// ── Signatures tab ─────────────────────────────────────────────────────────────
function SignaturesTab() {
  const [signatures, setSignatures] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [editing,    setEditing]    = useState(null)  // null | 'new' | signature object
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(null)
  const [error,      setError]      = useState(null)
  const [preview,    setPreview]    = useState(null)

  const load = () => {
    setLoading(true)
    zammadApi.getSignatures()
      .then(r => setSignatures(Array.isArray(r) ? r : []))
      .catch(() => setSignatures([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    setSaving(true)
    setError(null)
    try {
      if (editing === 'new') {
        await zammadApi.createSignature(form)
      } else {
        await zammadApi.updateSignature(editing.id, form)
      }
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this signature?')) return
    setDeleting(id)
    try {
      await zammadApi.deleteSignature(id)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div style={{ padding: 32, color: T.muted, fontSize: 13 }}>Loading…</div>

  return (
    <div>
      {error && (
        <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: T.red }}>
          {error}
        </div>
      )}

      {signatures.length === 0 && !editing && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✍</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 6 }}>No signatures</div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Create email signatures that agents can attach to replies.</div>
          <button onClick={() => setEditing('new')} style={btn()}>+ Add Signature</button>
        </div>
      )}

      {signatures.map(sig => (
        <div key={sig.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{sig.name}</span>
                {!sig.active && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9', color: T.muted, fontWeight: 600 }}>Inactive</span>
                )}
              </div>
              <div
                style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, maxHeight: 52, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setPreview(preview === sig.id ? null : sig.id)}
                title="Click to expand"
                dangerouslySetInnerHTML={{ __html: sig.body || '(empty)' }}
              />
              {preview === sig.id && (
                <div style={{ marginTop: 8, padding: '10px 14px', background: '#fafafa', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: sig.body || '(empty)' }} />
              )}
              {sig.note && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sig.note}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setEditing(sig)} style={btn('#6366f1', true)}>Edit</button>
              <button onClick={() => handleDelete(sig.id)} disabled={deleting === sig.id} style={dangerBtn}>
                {deleting === sig.id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {signatures.length > 0 && !editing && (
        <button onClick={() => setEditing('new')} style={btn()}>+ Add Signature</button>
      )}

      {editing && (
        <SignatureForm
          initial={editing === 'new' ? null : editing}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          error={error}
        />
      )}
    </div>
  )
}

function SignatureForm({ initial, saving, onSave, onCancel, error }) {
  const [name,   setName]   = useState(initial?.name  || '')
  const [body,   setBody]   = useState(initial?.body  || '')
  const [note,   setNote]   = useState(initial?.note  || '')
  const [active, setActive] = useState(initial ? !!initial.active : true)
  const [showPreview, setShowPreview] = useState(false)

  const VARIABLES = ['#{user.firstname}', '#{user.lastname}', '#{user.email}', '#{user.phone}', '#{company.name}']

  const insertVar = (v) => setBody(b => b + v)

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 16 }}>
        {initial ? 'Edit Signature' : 'New Signature'}
      </div>
      {error && (
        <div style={{ background: '#fef2f2', borderRadius: 7, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: T.red }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={label}>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Default" style={input()} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.navy, cursor: 'pointer', paddingBottom: 6 }}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Active
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...label, marginBottom: 0 }}>Body (HTML)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {VARIABLES.map(v => (
              <button key={v} onClick={() => insertVar(v)}
                style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, border: `1px solid ${T.border}`, background: '#fafafa', cursor: 'pointer', color: '#6366f1', fontFamily: T.font }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          placeholder={'<br>\n#{user.firstname} #{user.lastname}<br>\n--<br>\nYour Company Name'}
          style={input({ resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 })}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => setShowPreview(p => !p)}
          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'none', cursor: 'pointer', color: T.muted, fontFamily: T.font }}
        >
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
        {showPreview && (
          <div style={{ marginTop: 8, padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: 7, background: '#fafafa', fontSize: 13, lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: body || '(empty)' }} />
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={label}>Note (optional)</label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Internal note about this signature" style={input()} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onSave({ name, body, note, active })} disabled={!name || saving} style={btn()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} style={btn(T.muted, true)}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
const TABS = [
  { key: 'channels',   label: 'Email Channels',  icon: '📡' },
  { key: 'addresses',  label: 'Email Addresses',  icon: '@'  },
  { key: 'signatures', label: 'Signatures',        icon: '✍' },
]

export default function MailSettings() {
  const [tab, setTab] = useState('channels')

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: T.bg, fontFamily: T.font }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>Mail Settings</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Configure email channels, addresses, and agent signatures.</div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: T.card, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: T.font, display: 'flex', alignItems: 'center', gap: 6,
                background: tab === t.key ? '#6366f1' : 'transparent',
                color: tab === t.key ? '#fff' : T.muted,
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'channels'   && <ChannelsTab />}
        {tab === 'addresses'  && <AddressesTab />}
        {tab === 'signatures' && <SignaturesTab />}
      </div>
    </div>
  )
}
