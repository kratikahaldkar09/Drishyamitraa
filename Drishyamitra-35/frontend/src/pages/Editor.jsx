import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Editor() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasImage, setHasImage] = useState(false);
  const [origImg, setOrigImg] = useState(null);

  function pick() {
    inputRef.current?.click();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOrigImg(img);
      drawImage(img, 0, false, false, false, 100, 100);
      setHasImage(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const [rot, setRot] = useState(0);
  const [f, setF] = useState(false);
  const [gray, setGray] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showQuickEdit, setShowQuickEdit] = useState(false);

  function drawImage(img, rotation = 0, flip = false, grayscale = false, isSepia = false, b = 100, c = 100) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    
    if (rotation === 90 || rotation === 270) {
      [w, h] = [h, w];
    }
    
    canvas.width = w;
    canvas.height = h;
    
    ctx.save();
    
    // Apply filters using CSS filter string for efficiency
    let filterStr = `brightness(${b}%) contrast(${c}%)`;
    if (grayscale) filterStr += ' grayscale(100%)';
    if (isSepia) filterStr += ' sepia(100%)';
    ctx.filter = filterStr;

    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    
    ctx.restore();
  }

  function rotate(dir) {
    const next = dir === 'left' ? (rot + 270) % 360 : (rot + 90) % 360;
    setRot(next);
    if (origImg) drawImage(origImg, next, f, gray, sepia, brightness, contrast);
  }

  function flip() {
    const next = !f;
    setF(next);
    if (origImg) drawImage(origImg, rot, next, gray, sepia, brightness, contrast);
  }

  function grayscale() {
    const next = !gray;
    setGray(next);
    if (origImg) drawImage(origImg, rot, f, next, sepia, brightness, contrast);
  }

  function toggleSepia() {
    const next = !sepia;
    setSepia(next);
    if (origImg) drawImage(origImg, rot, f, gray, next, brightness, contrast);
  }

  function handleBrightness(val) {
    setBrightness(val);
    if (origImg) drawImage(origImg, rot, f, gray, sepia, val, contrast);
  }

  function handleContrast(val) {
    setContrast(val);
    if (origImg) drawImage(origImg, rot, f, gray, sepia, brightness, val);
  }

  function reset() {
    setRot(0);
    setF(false);
    setGray(false);
    setSepia(false);
    setBrightness(100);
    setContrast(100);
    if (origImg) drawImage(origImg, 0, false, false, false, 100, 100);
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `edited_${Date.now()}.png`;
    a.click();
  }

  async function saveToGallery() {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob(async b => {
      if (!b) return;
      const fd = new FormData();
      const f_file = new File([b], `edited_${Date.now()}.png`, { type: 'image/png' });
      fd.append('files', f_file);
      await fetch(api('/api/photos'), { method: 'POST', body: fd });
      navigate('/gallery');
    }, 'image/png');
  }

  return (
    <div className="container">
      <h2 className="page-title">Editor</h2>
      <section className="card">
        <div className="muted">Upload an image, apply quick edits, and save.</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={pick}>Choose Image</button>
          <button className={`btn ${showQuickEdit ? 'btn-primary' : ''}`} onClick={() => setShowQuickEdit(!showQuickEdit)} disabled={!hasImage}>
            Quick Edit
          </button>
          <button className="btn" onClick={() => rotate('left')} disabled={!hasImage}>Rotate Left</button>
          <button className="btn" onClick={() => rotate('right')} disabled={!hasImage}>Rotate Right</button>
          <button className="btn" onClick={flip} disabled={!hasImage}>Flip</button>
          <button className="btn" onClick={reset} disabled={!hasImage}>Reset All</button>
          <button className="btn btn-secondary" onClick={saveToGallery} disabled={!hasImage}>Save to Gallery</button>
          <button className="btn" onClick={download} disabled={!hasImage}>Download</button>
        </div>

        {showQuickEdit && hasImage && (
          <div className="quick-edit-panel" style={{ 
            marginTop: 20, 
            padding: 16, 
            background: '#f8fafc', 
            borderRadius: 12, 
            border: '1px solid var(--border)',
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            <div className="filter-group">
              <label className="tile-title" style={{ display: 'block', marginBottom: 8 }}>Effects</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn ${gray ? 'btn-primary' : 'btn-outline'}`} onClick={grayscale} style={{ flex: 1 }}>B&W</button>
                <button className={`btn ${sepia ? 'btn-primary' : 'btn-outline'}`} onClick={toggleSepia} style={{ flex: 1 }}>Sepia</button>
              </div>
            </div>
            
            <div className="filter-group">
              <label className="tile-title" style={{ display: 'block', marginBottom: 8 }}>Brightness: {brightness}%</label>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={brightness} 
                className="input" 
                style={{ padding: 0 }}
                onChange={(e) => handleBrightness(e.target.value)} 
              />
            </div>

            <div className="filter-group">
              <label className="tile-title" style={{ display: 'block', marginBottom: 8 }}>Contrast: {contrast}%</label>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={contrast} 
                className="input" 
                style={{ padding: 0 }}
                onChange={(e) => handleContrast(e.target.value)} 
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 800, borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        </div>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      </section>
    </div>
  );
}
