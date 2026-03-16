import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function Bubble({ side = 'left', children }) {
  return <div className={`bubble ${side}`}>{children}</div>;
}

export default function Chat() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);

  async function handleAction(m, index) {
    if (m.action === 'send') {
      try {
        const r = await fetch(api('/api/send-photos'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: m.email, label: m.label })
        });
        const data = await r.json();
        const successText = data.emailed
          ? (data.label
            ? `[SUCCESS] Successfully sent ${data.count} photos of ${data.label} to ${data.email}!`
            : `[SUCCESS] Successfully sent ${data.count} photos to ${data.email}!`)
          : (data.reason === 'missing_credentials'
            ? `[INFO] Prepared ${data.count}${data.label ? ` photos of ${data.label}` : ' photos'}, but email sending is not configured.`
            : `[ERROR] Email failed (${data.reason || 'unknown error'}).`);
        setItems(prev => [...prev, { side: 'left', text: successText }]);
      } catch (e) {
        setItems(prev => [...prev, { side: 'left', text: 'Failed to send photos' }]);
      }
    } else if (m.action === 'open_label') {
      navigate(`/gallery?label=${encodeURIComponent(m.label)}`);
    } else if (m.action === 'show_photos') {
      // Toggle photos display in the specific bubble
      setItems(prev => prev.map((item, i) => 
        i === index ? { ...item, showPhotos: !item.showPhotos } : item
      ));
    }
  }

  async function send() {
    const t = text.trim();
    if (!t) return;
    setItems(prev => [...prev, { side: 'right', text: t }]);
    setText('');
    try {
      const r = await fetch(api('/api/intent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t })
      });
      const data = await r.json();
      if (data.intent === 'greeting') {
        setItems(prev => [...prev, { side: 'left', text: 'Hello! How can I help with your photos?' }]);
      } else if (data.intent === 'send_photos_prepare') {
        const msg = data.label
          ? `Ready to send ${data.count} photos of ${data.label} to ${data.email}`
          : `Ready to send ${data.count} photos to ${data.email}`;
        setItems(prev => [
          ...prev,
          { side: 'left', text: msg },
          { side: 'left', action: 'send', title: data.label ? `Send ${data.count} Photos of ${data.label} to ${data.email}` : `Send ${data.count} Photos to ${data.email}`, email: data.email, label: data.label || null }
        ]);
      } else if (data.intent === 'find_photos') {
        const msg = `Found ${data.count} photos of ${data.label}`;
        setItems(prev => [
          ...prev,
          { 
            side: 'left', 
            text: msg, 
            action: 'show_photos', 
            title: `View Photos of ${data.label}`, 
            label: data.label, 
            urls: data.urls || [], 
            showPhotos: false 
          }
        ]);
      } else {
        setItems(prev => [...prev, { side: 'left', text: `Intent detected: ${data.intent}` }]);
      }
    } catch (e) {
      setItems(prev => [...prev, { side: 'left', text: 'Error contacting assistant' }]);
    }
  }

  return (
    <div className="container">
      <h2 className="page-title">Chat Assistant</h2>
      <div className="chat" style={{ height: '500px', overflowY: 'auto' }}>
        {items.map((m, i) => (
          <Bubble key={i} side={m.side}>
            {m.text && <div>{m.text}</div>}
            {m.action && (
              <div style={{ marginTop: '8px' }}>
                <button 
                  className={`btn ${m.action === 'send' ? 'success' : 'btn-primary'}`} 
                  onClick={() => handleAction(m, i)}
                  style={{ color: m.action === 'show_photos' ? 'var(--primary)' : 'inherit' }}
                >
                  {m.title}
                </button>
                {m.action === 'show_photos' && m.showPhotos && m.urls && (
                  <div className="chat-photo-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '4px', 
                    marginTop: '8px' 
                  }}>
                    {m.urls.map((url, j) => (
                      <img 
                        key={j} 
                        src={api(url)} 
                        alt="" 
                        className="chat-photo" 
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '4px' }}
                        onClick={() => navigate(`/gallery?label=${encodeURIComponent(m.label)}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Bubble>
        ))}
      </div>
      <div className="chat-input">
        <input
          className="input"
          placeholder="Type your message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="btn btn-primary" onClick={send}>Send</button>
      </div>
    </div>
  );
}
