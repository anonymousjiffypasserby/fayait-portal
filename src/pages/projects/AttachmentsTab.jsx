import { useState, useRef } from 'react'
import { T } from './shared'
import api from '../../services/api'

const fmtSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

const fileIcon = (filename) => {
  const ext = (filename || '').split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼'
  if (['pdf'].includes(ext)) return '📄'
  if (['doc','docx'].includes(ext)) return '📝'
  if (['xls','xlsx','csv'].includes(ext)) return '📊'
  if (['zip','tar','gz'].includes(ext)) return '📦'
  return '📎'
}

export default function AttachmentsTab({ project, attachments, onRefresh }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const upload = async (files) => {
    if (!files?.length) return
    setUploading(true); setError('')
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        await api.uploadProjectAttachment(project.id, fd)
      }
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return
    try {
      await api.deleteProjectAttachment(project.id, attachmentId)
      onRefresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    upload(e.dataTransfer.files)
  }

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto' }}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#6366f1' : T.border}`,
          borderRadius: 10, padding: '24px 16px', textAlign: 'center',
          background: dragOver ? 'rgba(99,102,241,0.04)' : '#f8fafc',
          cursor: 'pointer', marginBottom: 16, transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>
          {uploading ? 'Uploading…' : 'Drop files here or click to upload'}
        </div>
        <div style={{ fontSize: 11, color: T.mutedLight, marginTop: 4 }}>Max 25MB per file</div>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
          onChange={e => upload(e.target.files)} />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: T.red, fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* File grid */}
      {attachments.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', paddingTop: 16 }}>
          No attachments yet
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {attachments.map(a => (
            <div key={a.id} style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ fontSize: 28, textAlign: 'center' }}>{fileIcon(a.filename)}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.filename}>
                {a.filename}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: T.muted }}>{fmtSize(a.filesize)}</span>
                <span style={{ fontSize: 10, color: T.muted }}>{a.uploaded_by_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button
                  onClick={() => api.downloadProjectAttachment(project.id, a.id, a.filename)}
                  style={{
                    flex: 1, textAlign: 'center', fontSize: 11, padding: '4px 0',
                    background: '#f1f5f9', borderRadius: 5, color: T.navy,
                    border: 'none', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ↓ Download
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  style={{
                    fontSize: 11, padding: '4px 8px', background: '#fef2f2',
                    color: T.red, border: 'none', borderRadius: 5, cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
