import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Settings() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(0);
  const [expandedAccount, setExpandedAccount] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api('/api/user'), { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          setUsername(d.username || '');
          setEmail(d.email || '');
          setAccounts(d.accounts || []);
          setActiveAccount(d.active_account || 0);
        }
      } catch (e) {
        console.error('Failed to load user settings', e);
      }
    })();
  }, []);

  async function save() {
    try {
      if (username.trim()) localStorage.setItem('userName', username.trim());
      localStorage.setItem('userEmail', email || '');
      
      await fetch(api('/api/user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          email,
          accounts,
          active_account: activeAccount
        })
      });
      navigate('/dashboard');
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  function addAccount() {
    const newAcc = { name: 'New Account', gmail_user: '', gmail_pass: '', groq_key: '' };
    setAccounts([...accounts, newAcc]);
    setExpandedAccount(accounts.length); // Expand the newly added account
  }

  function removeAccount(idx) {
    const next = accounts.filter((_, i) => i !== idx);
    setAccounts(next);
    if (activeAccount >= next.length && next.length > 0) setActiveAccount(next.length - 1);
  }

  function updateAccount(idx, field, val) {
    const next = [...accounts];
    next[idx] = { ...next[idx], [field]: val };
    setAccounts(next);
  }

  function logout() {
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    window.dispatchEvent(new CustomEvent('auth-change'));
    navigate('/login');
  }

  return (
    <div className="container">
      <h2 className="page-title">Settings</h2>
      
      <section className="card">
        <h3>Profile</h3>
        <div className="field">
          <span>Display Name</span>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
        </div>
        <div className="field">
          <span>Personal Email</span>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email" />
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Service Accounts</h3>
          <button className="btn btn-secondary" onClick={addAccount}>+ Add Account</button>
        </div>
        <div className="muted" style={{ marginBottom: 12 }}>Enter credentials for yourself or your friends. Select which one to use for sending photos and AI chat.</div>
        
        {accounts.length === 0 && <div className="muted">No service accounts added. Using system defaults from .env if available.</div>}
        
        {accounts.map((acc, idx) => (
          <div key={idx} className={`account-item ${activeAccount === idx ? 'active' : ''}`} style={{ 
            border: '1px solid var(--border)', 
            borderRadius: 8, 
            padding: 12, 
            marginBottom: 12,
            background: activeAccount === idx ? '#fff1f2' : 'transparent',
            borderColor: activeAccount === idx ? 'var(--primary)' : 'var(--border)',
            cursor: 'default'
          }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedAccount(expandedAccount === idx ? null : idx)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontSize: 12, transform: expandedAccount === idx ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                <input 
                  className="input" 
                  style={{ fontWeight: 'bold', width: 'auto', border: 'none', background: 'transparent', padding: 0, cursor: 'text' }} 
                  value={acc.name} 
                  onChange={e => updateAccount(idx, 'name', e.target.value)} 
                  onClick={e => e.stopPropagation()} // Prevent collapse when editing name
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                <button 
                  className={`btn btn-sm ${activeAccount === idx ? 'btn-primary' : 'btn-secondary'}`} 
                  style={activeAccount === idx ? { background: 'var(--primary)', color: '#fff' } : {}}
                  onClick={() => setActiveAccount(idx)}
                >
                  {activeAccount === idx ? 'Active' : 'Select'}
                </button>
                <button className="btn btn-secondary btn-sm danger" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => removeAccount(idx)}>Remove</button>
              </div>
            </div>
            
            {expandedAccount === idx && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>Gmail User</div>
                    <input className="input" value={acc.gmail_user} onChange={e => updateAccount(idx, 'gmail_user', e.target.value)} placeholder="email@gmail.com" />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>App Password</div>
                    <input className="input" type="password" value={acc.gmail_pass} onChange={e => updateAccount(idx, 'gmail_pass', e.target.value)} placeholder="App Password" />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div className="muted" style={{ fontSize: 12 }}>Groq API Key</div>
                  <input className="input" type="password" value={acc.groq_key} onChange={e => updateAccount(idx, 'groq_key', e.target.value)} placeholder="xai-..." />
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={save}>Save All Settings</button>
        <button className="btn btn-secondary" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
