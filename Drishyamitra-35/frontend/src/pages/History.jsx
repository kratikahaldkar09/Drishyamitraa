import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total_shared: 0 });
  const [filter, setFilter] = useState('All');

  const loadData = async () => {
    try {
      const [lRes, sRes] = await Promise.all([
        fetch(api('/api/email-log'), { cache: 'no-store' }),
        fetch(api('/api/stats'), { cache: 'no-store' })
      ]);
      
      if (lRes.ok) {
        const data = await lRes.json();
        setLogs(Array.isArray(data) ? data : []);
      }
      
      if (sRes.ok) {
        const sData = await sRes.json();
        setStats({ total_shared: sData.shared || 0 });
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(logId) {
    if (!window.confirm('Are you sure you want to delete this delivery record?')) return;
    try {
      const r = await fetch(api(`/api/email-log/${logId}`), { method: 'DELETE' });
      if (r.ok) {
        loadData();
      }
    } catch (e) {
      console.error('Failed to delete log', e);
    }
  }

  const counts = {
    All: logs.length,
    Email: logs.filter(l => l.to && l.to.includes('@')).length
  };

  const filteredLogs = logs.filter(l => {
    if (filter === 'All') return true;
    if (filter === 'Email') return l.to && l.to.includes('@');
    return true;
  });

  return (
    <div className="container history-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Delivery History</h2>
          <div className="muted">Track all your photo deliveries</div>
        </div>
        <div className="stat-pill">
          <span className="stat-label">Total Shared:</span>
          <span className="stat-value" style={{ marginLeft: 8, fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total_shared}</span>
        </div>
      </div>

      <div className="history-tabs">
        {['All', 'Email'].map(t => (
          <button 
            key={t} 
            className={`tab-btn ${filter === t ? 'active' : ''}`} 
            onClick={() => setFilter(t)}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      <div className="history-list">
        {filteredLogs.length === 0 ? (
          <div className="card muted" style={{ textAlign: 'center', padding: 40 }}>
            No delivery history found.
          </div>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={i} className="card history-item">
              <div className="history-icon">
                📧
              </div>
              <div className="history-details">
                <div className="history-type">
                  Email Delivery
                </div>
                <div className="history-to">To: {log.to || 'Unknown'}</div>
                <div className="history-meta">
                  <span>📦 {log.count} photos</span>
                  <span style={{ marginLeft: 12 }}>🕒 {log.sent_on}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div className={`history-status ${log.emailed ? 'success' : 'failed'}`}>
                  {log.emailed ? 'sent' : (log.reason === 'missing_credentials' ? 'failed' : 'failed')}
                </div>
                {log.id && (
                  <button 
                    className="btn danger" 
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => handleDelete(log.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
