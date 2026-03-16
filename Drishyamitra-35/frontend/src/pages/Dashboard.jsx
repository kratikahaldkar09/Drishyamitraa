import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [displayName, setDisplayName] = useState('User');
  const [stats, setStats] = useState({ total: 0, this_month: 0, shared: 0, favorites: 0 });
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [today, setToday] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => previews.forEach(p => URL.revokeObjectURL(p));
  }, [previews]);

  function onFilesSelected(files) {
    if (!files || !files.length) return;
    const filesArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...filesArray]);
    const newPreviews = filesArray.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  }

  async function upload() {
    if (!selectedFiles.length) return;
    setUploading(true);
    const fd = new FormData();
    selectedFiles.forEach(f => fd.append('files', f));
    try {
      await fetch(api('/api/photos'), { method: 'POST', body: fd });
      navigate('/gallery');
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  }

  function removeFile(index) {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    const loadName = () => {
      try {
        const n = localStorage.getItem('userName') || 'User';
        setDisplayName(n);
      } catch {}
    };
    loadName();
    window.addEventListener('auth-change', loadName);
    refreshData();
    const now = new Date();
    const fmt = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    setToday(fmt.format(now));
    return () => window.removeEventListener('auth-change', loadName);
  }, []);

  async function refreshData() {
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(api('/api/stats'), { cache: 'no-store' }),
        fetch(api('/api/photos'), { cache: 'no-store' })
      ]);
      
      if (sRes.ok) {
        const sData = await sRes.json();
        setStats(sData);
      }
      
      if (pRes.ok) {
        const pData = await pRes.json();
        // Sort by created_at descending and take top 4
        const sorted = (pData.files || []).sort((a, b) => 
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        setRecentPhotos(sorted.slice(0, 4));
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    }
  }

  async function upload(files) {
    if (!files || !files.length) return;
    const fd = new FormData();
    [...files].forEach(f => fd.append('files', f));
    await fetch(api('/api/photos'), { method: 'POST', body: fd });
    navigate('/gallery');
  }

  function onPick() { inputRef.current?.click(); }

  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  return (
    <div className="container">
      <h2 className="page-title">Welcome back {displayName}!</h2>
      <div className="muted" style={{ marginTop: -6, marginBottom: 12 }}>📅 {today}</div>
      <div className="tiles">
        <button className="tile" onClick={() => navigate('/upload')}>
          <div className="tile-icon">⬆️</div>
          <div className="tile-title">Upload</div>
          <div className="muted">Add new photos</div>
        </button>
        <button className="tile" onClick={() => navigate('/gallery')}>
          <div className="tile-icon">🖼️</div>
          <div className="tile-title">Gallery</div>
          <div className="muted">Browse collection</div>
        </button>
        <button className="tile" onClick={() => navigate('/editor')}>
          <div className="tile-icon">✏️</div>
          <div className="tile-title">Editor</div>
          <div className="muted">AI enhancement</div>
        </button>
        <button className="tile" onClick={() => navigate('/chat')}>
          <div className="tile-icon">💬</div>
          <div className="tile-title">AI Chat</div>
          <div className="muted">Get assistance</div>
        </button>
      </div>
      <div className="grid">
        <Stat label="Total Photos" value={stats.total} />
        <Stat label="This Month" value={stats.this_month} />
        <Stat label="Shared" value={stats.shared} />
      </div>

      <section className="card upload-card">
        <h3>Quick Upload</h3>
        <div
          className="dropzone"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={onPick}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          Drop your photos here or click to browse
          <div className="muted">Supports JPG, PNG, HEIC up to 50MB</div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => onFilesSelected(e.target.files)}
        />
        
        {previews.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Selected Photos ({previews.length})</h4>
            <div className="thumbs" style={{ marginBottom: 16 }}>
              {previews.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt="preview" className="thumb" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      background: 'rgba(0,0,0,0.5)', color: 'white',
                      border: 'none', borderRadius: '50%', width: 20, height: 20,
                      cursor: 'pointer', fontSize: 12
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={upload} disabled={uploading}>
                {uploading ? 'Uploading...' : `Upload ${previews.length} Photos`}
              </button>
              <button className="btn btn-secondary" onClick={() => { setSelectedFiles([]); setPreviews([]); }} disabled={uploading}>
                Clear
              </button>
            </div>
          </div>
        )}

        {!previews.length && (
          <button className="btn btn-primary" onClick={onPick} style={{ marginTop: 12 }}>
            Choose Photos
          </button>
        )}
      </section>

      <section>
        <h3>Recent Photos</h3>
        <div className="thumbs">
          {recentPhotos.length === 0 ? (
            <div className="muted">No photos yet</div>
          ) : (
            recentPhotos.map((p, i) => (
              <img 
                key={i} 
                src={api(p.url)} 
                alt=""
                className="thumb"
                onClick={() => navigate('/gallery')}
              />
            ))
          )}
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => navigate('/gallery')}>View All</button>
        </div>
      </section>
    </div>
  );
}
