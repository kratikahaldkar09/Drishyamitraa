import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Upload() {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Cleanup previews to avoid memory leaks
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
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function onPick() {
    inputRef.current?.click();
  }

  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function removeFile(index) {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="container">
      <section className="card upload-hero">
        <div className="upload-title">Quick Upload</div>
        <div
          className="dropzone big"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={onPick}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="upload-icon">📷</div>
          <div>Drop your photos here or click to browse</div>
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
          <div style={{ marginTop: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Selected Photos ({previews.length})</h4>
            <div className="thumbs" style={{ marginBottom: 20 }}>
              {previews.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt="preview" className="thumb" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      background: 'rgba(0,0,0,0.5)', color: 'white',
                      border: 'none', borderRadius: '50%', width: 24, height: 24,
                      cursor: 'pointer', fontSize: 14
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={upload} disabled={uploading}>
                {uploading ? 'Uploading...' : `Upload ${previews.length} Photos`}
              </button>
              <button className="btn btn-secondary" onClick={() => { setSelectedFiles([]); setPreviews([]); }} disabled={uploading}>
                Clear All
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
    </div>
  );
}
