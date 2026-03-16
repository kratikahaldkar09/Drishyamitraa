import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

export default function Person() {
  const { id } = useParams();
  const [name, setName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    const r = await fetch(`/api/people/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    setName(d.name || id);
    setPhotos(d.photos || []);
  };

  useEffect(() => { load(); }, [id]);

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/people/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      const r = await fetch(`/api/people/${id}/photos`, { method: 'POST', body: fd });
      if (r.ok) await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const delPhoto = async (fname) => {
    const r = await fetch(`/api/people/${id}/photos/${encodeURIComponent(fname)}`, { method: 'DELETE' });
    if (r.ok) await load();
  };

  const delPerson = async () => {
    const r = await fetch(`/api/people/${id}`, { method: 'DELETE' });
    if (r.ok) navigate('/people');
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => navigate('/people')} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>←</span> Back to People
        </button>
        <h2 className="page-title" style={{ margin: 0 }}>{name}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } }}
            style={{ minWidth: 220 }}
          />
          <button className="btn btn-primary" onClick={saveName} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          {saved ? <span className="muted">Saved</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : 'Upload Photos'}
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={upload} style={{ display: 'none' }} />
          </label>
          <button className="btn danger" onClick={delPerson}>Delete Person</button>
        </div>
      </div>
      <div className="gallery-grid">
        {photos.map((ph) => (
          <div key={ph.name} className="photo-card">
            <img src={ph.url} alt="" className="photo-thumb" />
            <div className="photo-actions">
              <button className="btn danger" onClick={() => delPhoto(ph.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
