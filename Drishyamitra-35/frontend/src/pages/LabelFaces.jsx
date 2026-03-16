import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

function FaceOverlay({ boxes, hovered, width, height, onHover }) {
  return (
    <div style={{ position: 'relative', width, height }}>
      {boxes.map((b, i) => (
        <div
          key={i}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(-1)}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
            border: `2px solid ${hovered === i ? '#db2777' : 'transparent'}`,
            boxShadow: hovered === i ? '0 0 0 2px rgba(219,39,119,.25)' : 'none',
            borderRadius: 6,
            pointerEvents: 'auto',
            transition: 'border-color 0.2s ease-in-out'
          }}
        />
      ))}
    </div>
  );
}

export default function LabelFaces() {
  const navigate = useNavigate();
  const imgRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState('');
  const [boxes, setBoxes] = useState([]);
  const [hovered, setHovered] = useState(-1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const [editingIdx, setEditingIdx] = useState(-1);

  const stats = {
    total: results.length,
    labeled: results.filter(r => r.name !== 'Unknown').length,
    unlabeled: results.filter(r => r.name === 'Unknown').length
  };

  useEffect(() => {
    (async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setReady(true);
      } catch {
        setReady(false);
      }
    })();
  }, []);

  async function buildLabeledDescriptors() {
    const r = await fetch('/api/people');
    const people = await r.json();
    const entries = [];
    for (const p of people) {
      if (!p.profileImage) continue;
      const img = await faceapi.fetchImage(p.profileImage);
      const det = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (det && det.descriptor) {
        entries.push({ name: p.name, descriptor: det.descriptor, profileImage: p.profileImage });
      }
    }
    return entries;
  }

  function toViewBox(bb, naturalW, naturalH, viewW, viewH) {
    const sx = viewW / naturalW;
    const sy = viewH / naturalH;
    return { x: bb.x * sx, y: bb.y * sy, w: bb.width * sx, h: bb.height * sy };
  }

  async function extractFace(img, box) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 120;
    canvas.height = 120;
    ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, 120, 120);
    return canvas.toDataURL();
  }

  async function detect(fileUrl) {
    if (!ready) return;
    setLoading(true);
    try {
      const img = imgRef.current;
      if (!img) return;
      const dets = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      const labeled = await buildLabeledDescriptors();
      const out = [];
      const visBoxes = [];
      const vw = img.clientWidth;
      const vh = img.clientHeight;
      for (const d of dets) {
        let bestName = 'Unknown';
        let bestDist = 1;
        let bestImg = null;
        for (const e of labeled) {
          const dist = faceapi.euclideanDistance(d.descriptor, e.descriptor);
          if (dist < bestDist) {
            bestDist = dist;
            bestName = e.name;
            bestImg = e.profileImage;
          }
        }
        const conf = bestName !== 'Unknown' ? 1 : 0;
        const faceThumb = await extractFace(img, d.detection.box);
        out.push({ name: bestName, confidence: conf, profileImage: bestImg, faceThumb });
        visBoxes.push(toViewBox(d.detection.box, img.naturalWidth, img.naturalHeight, vw, vh));
      }
      setViewSize({ w: vw, h: vh });
      setBoxes(visBoxes);
      setResults(out);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => navigate('/people')} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>←</span> Back
        </button>
        <h2 className="page-title" style={{ margin: 0 }}>Label Faces</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="stat" style={{ padding: '12px' }}>
          <div className="stat-value" style={{ fontSize: '20px' }}>{stats.total}</div>
          <div className="stat-label">Total Faces</div>
        </div>
        <div className="stat" style={{ padding: '12px', borderColor: '#db2777' }}>
          <div className="stat-value" style={{ fontSize: '20px', color: '#db2777' }}>{stats.labeled}</div>
          <div className="stat-label">Labeled</div>
        </div>
        <div className="stat" style={{ padding: '12px', borderColor: '#ef4444' }}>
          <div className="stat-value" style={{ fontSize: '20px', color: '#ef4444' }}>{stats.unlabeled}</div>
          <div className="stat-label">Unlabeled</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <div className="dropzone big" onClick={() => document.getElementById('lf-uploader').click()} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '24px' }}>📷</div>
            <div style={{ fontWeight: 600 }}>{src ? 'Change Photo' : 'Upload Photo'}</div>
            {!src && <div className="muted" style={{ fontSize: '13px' }}>Click to select or drag group photo</div>}
          </div>
          <input
            id="lf-uploader"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = URL.createObjectURL(f);
              setSrc(url);
              setTimeout(() => detect(url), 50);
            }}
          />
          {src ? (
            <div style={{ position: 'relative', marginTop: 12 }}>
              <img
                ref={imgRef}
                src={src}
                alt=""
                style={{ width: '100%', maxHeight: 480, objectFit: 'contain', display: 'block', borderRadius: 12 }}
                onLoad={() => detect(src)}
              />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <FaceOverlay boxes={boxes} hovered={hovered} width={viewSize.w} height={viewSize.h} onHover={setHovered} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="card" style={{ alignSelf: 'start', background: '#ffffff', color: 'var(--text)', borderColor: 'var(--border)' }}>
          <div className="card-title" style={{ color: 'var(--text)' }}>Labeled Faces ({results.length})</div>
          <div className="muted" style={{ marginBottom: 12, color: 'var(--muted)' }}>{ready ? (loading ? 'Detecting...' : 'Hover a face to highlight it') : 'Models not loaded'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r, i) => (
              <div 
                key={i} 
                onMouseEnter={() => setHovered(i)} 
                onMouseLeave={() => setHovered(-1)} 
                className="tile" 
                style={{ 
                  borderColor: hovered === i ? '#db2777' : 'var(--border)', 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 12,
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '10px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  color: 'var(--text)'
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <img src={r.faceThumb || r.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  {editingIdx === i ? (
                    <input 
                      autoFocus
                      className="input"
                      style={{ padding: '2px 8px', fontSize: '14px', background: '#ffffff', color: 'var(--text)', border: '1px solid var(--primary)', width: '100%' }}
                      value={r.name}
                      onChange={e => {
                        const next = [...results];
                        next[i].name = e.target.value;
                        setResults(next);
                      }}
                      onBlur={() => setEditingIdx(-1)}
                      onKeyDown={e => e.key === 'Enter' && setEditingIdx(-1)}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{r.name}</div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Confidence: {(r.confidence * 100).toFixed(0)}%</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '12px', minWidth: '45px' }}
                    onClick={() => setEditingIdx(i)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn danger" 
                    style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', minWidth: '35px' }}
                    onClick={() => {
                      const next = results.filter((_, idx) => idx !== i);
                      setResults(next);
                      const nextBoxes = boxes.filter((_, idx) => idx !== i);
                      setBoxes(nextBoxes);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {!results.length ? <div className="muted" style={{ color: 'var(--muted)' }}>No faces detected yet</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
