import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

function formatSize(bytes) {
  if (bytes == null) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function FaceModal({ open, onClose, file }) {
  const [name, setName] = useState('');
  if (!open) return null;
  async function onLabel() {
    if (!file?.name || !name.trim()) return;
    await fetch(api(`/api/photos/${encodeURIComponent(file.name)}/label`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: name.trim() })
    });
    setName('');
    onClose({ labeled: true });
  }
  return (
    <div className="modal">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">Label Faces</div>
          <button className="modal-x" onClick={() => onClose(null)}>✕</button>
        </div>
        <div className="modal-body">
          {file?.url ? (
            <img className="face-img" src={file.url} alt={file.name} />
          ) : (
            <div className="face-box" />
          )}
          <div className="muted" style={{ textAlign: 'center', marginTop: 8 }}>Face 1 of 1</div>
          <input
            className="input"
            placeholder="Enter person's name..."
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onLabel} disabled={!name.trim()}>Label</button>
            <button className="btn btn-secondary" onClick={() => onClose({ skip: true })}>Skip</button>
          </div>
          <div className="muted" style={{ textAlign: 'center' }}>0 faces labeled so far</div>
        </div>
      </div>
    </div>
  );
}

function Card({ file, onLabel, onSkip, onDelete, skipped }) {
  return (
    <div className="photo-card" style={{ opacity: skipped ? 0.6 : 1 }}>
      {file.url ? (
        <img className="photo-thumb" src={file.url} alt={file.name} />
      ) : (
        <div className="photo-thumb" />
      )}
      <div className="photo-meta">
        <div className="photo-name" title={file.name}>{file.name}</div>
        <div className="muted">{formatSize(file.size)}</div>
      </div>
      {file.label ? <div className="muted">Label: {file.label}</div> : null}
      {file.event ? <div className="muted">Event: {file.event}</div> : null}
      {file.location ? <div className="muted">Location: {file.location}</div> : null}
      <div className="photo-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button className="btn danger" onClick={onDelete}>Delete</button>
        <button className="btn btn-primary" onClick={onLabel}>Label</button>
        <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent('openInfo', { detail: { file } }))} style={{ background: '#fff1f2', color: 'var(--text)', border: '1px solid var(--border)' }}>Info</button>
      </div>
    </div>
  );
}

export default function Gallery() {
  const [query, setQuery] = useState({ event: '', location: '' });
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [files, setFiles] = useState([]);
  const [skippedMap, setSkippedMap] = useState({});
  const [emailLog, setEmailLog] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoEvent, setInfoEvent] = useState('');
  const [infoLocation, setInfoLocation] = useState('');
  const [infoFile, setInfoFile] = useState(null);

  useEffect(() => {
    refresh();
    (async () => {
      try {
        const r = await fetch(api('/api/email-log'), { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          setEmailLog(d && d.sent_on ? d : null);
        }
      } catch {}
    })();
    function onOpenInfo(e) {
      const f = e.detail?.file;
      if (!f) return;
      setInfoFile(f);
      setInfoEvent(f.event || '');
      setInfoLocation(f.location || '');
      setInfoOpen(true);
    }
    window.addEventListener('openInfo', onOpenInfo);
    return () => window.removeEventListener('openInfo', onOpenInfo);
  }, []);

  async function refresh() {
    try {
      const r = await fetch(api('/api/photos'), { cache: 'no-store' });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      setFiles(data.files || []);
    } catch (e) {
      console.error('Failed to load photos', e);
      setFiles([]);
    }
  }

  const urlLabel = new URLSearchParams(window.location.search).get('label');
  const filtered = urlLabel
    ? files.filter(f => (f.label || '').toLowerCase() === urlLabel.toLowerCase())
    : files.filter(f =>
        (f.event || '').toLowerCase().includes(query.event.toLowerCase()) &&
        (f.location || '').toLowerCase().includes(query.location.toLowerCase())
      );
  return (
    <div className="container">
      <h2 className="page-title">My Photos</h2>
      <div className="filters">
        <input
          className="input"
          placeholder="Filter by event..."
          value={query.event}
          onChange={e => setQuery(q => ({ ...q, event: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Filter by location..."
          value={query.location}
          onChange={e => setQuery(q => ({ ...q, location: e.target.value }))}
        />
        <button className="btn btn-primary" onClick={() => document.getElementById('galleryUploader').click()}>Upload Photos</button>
        <input id="galleryUploader" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
          const fd = new FormData();
          [...e.target.files].forEach(f => fd.append('files', f));
          await fetch(api('/api/photos'), { method: 'POST', body: fd });
          await refresh();
        }} />
      </div>

      <div className="gallery-grid">
        {filtered.map((f, i) => (
          <Card key={i} file={f} skipped={!!skippedMap[f.name]} onLabel={() => { setSelected(f); setShowModal(true); }} onSkip={() => {
            setSkippedMap(m => ({ ...m, [f.name]: true }));
          }} onDelete={async () => {
            await fetch(api(`/api/photos/${encodeURIComponent(f.name)}`), { method: 'DELETE' });
            await refresh();
          }} />
        ))}
      </div>

      {emailLog ? (
        <div className="card email-log">
          <div className="email-title">Photos from Drishyamitra</div>
          <div className="muted">Here are {emailLog.count} photos you requested</div>
          <div className="muted">Sent on: {emailLog.sent_on}</div>
          <div className="muted">From: {emailLog.from || 'Not configured'}</div>
          <div className="muted">To: {emailLog.to || '—'}</div>
        </div>
      ) : null}

      {infoOpen ? (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Photo Info</div>
              <button className="modal-x" onClick={() => setInfoOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {infoFile?.url ? <img className="face-img" src={infoFile.url} alt={infoFile.name} /> : <div className="face-box" />}
              <input className="input" placeholder="Event..." value={infoEvent} onChange={e => setInfoEvent(e.target.value)} />
              <input className="input" placeholder="Location..." value={infoLocation} onChange={e => setInfoLocation(e.target.value)} />
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={async () => {
                  if (!infoFile?.name) return;
                  await fetch(api(`/api/photos/${encodeURIComponent(infoFile.name)}/meta`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: infoEvent.trim(), location: infoLocation.trim() })
                  });
                  setInfoOpen(false);
                  await refresh();
                }} disabled={!infoEvent.trim() && !infoLocation.trim()}>Save</button>
                <button className="btn danger" onClick={async () => {
                  if (!infoFile?.name) return;
                  if (window.confirm('Are you sure you want to delete this photo?')) {
                    await fetch(api(`/api/photos/${encodeURIComponent(infoFile.name)}`), { method: 'DELETE' });
                    setInfoOpen(false);
                    await refresh();
                  }
                }}>Delete</button>
                <button className="btn btn-secondary" onClick={() => setInfoOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <FaceModal open={showModal} file={selected} onClose={(res) => { setShowModal(false); if (res && res.labeled) { refresh(); } }} />
    </div>
  );
}
