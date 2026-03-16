import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function People() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const r = await fetch('/api/people');
    const d = await r.json();
    setItems(d);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const r = await fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const d = await r.json();
      if (r.ok) {
        setName('');
        await load();
        navigate(`/people/${d.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 className="page-title">People</h2>
      <form onSubmit={create} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="New person name" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Add Person'}</button>
      </form>
      <div className="grid">
        {items.map(p => (
          <Link 
            key={p.id} 
            to={`/people/${p.id}`} 
            className="tile" 
            style={{ 
              alignItems: 'center', 
              textAlign: 'center', 
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
          >
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 }}>
              {p.profileImage ? (
                <img src={p.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 32 }}>👤</span>
              )}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 999 }}>
              {p.count} photos
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
