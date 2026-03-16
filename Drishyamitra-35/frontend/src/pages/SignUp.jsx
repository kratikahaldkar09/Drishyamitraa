import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function SignUp() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const navigate = useNavigate();
  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }
  function onSubmit(e) {
    e.preventDefault();
    if (!form.email.endsWith('@gmail.com')) {
      alert('Only @gmail.com emails are allowed');
      return;
    }
    if (form.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    if (form.password !== form.confirm) {
      alert('Passwords do not match');
      return;
    }
    if (form.username.includes('@')) {
      alert('Username should not be an email address');
      return;
    }
    try {
      localStorage.setItem('userName', form.username.trim() || 'User');
      localStorage.setItem('userEmail', form.email.trim() || '');
      window.dispatchEvent(new CustomEvent('auth-change'));
    } catch {}
    navigate('/login');
  }
  return (
    <div className="auth-wrapper">
      <form className="card auth-card" onSubmit={onSubmit} autoComplete="on">
        <h2 className="card-title">Drishyamitra</h2>
        <p className="card-subtitle">Create your account</p>
        <label className="field"><span>Username</span>
          <input 
            value={form.username} 
            onChange={e => setField('username', e.target.value)} 
            required 
            autoComplete="username"
            name="username"
          />
        </label>
        <label className="field"><span>Email</span>
          <input 
            type="email" 
            value={form.email} 
            onChange={e => setField('email', e.target.value)} 
            required 
            autoComplete="email"
            name="email"
          />
        </label>
        <label className="field"><span>Password</span>
          <input 
            type="password" 
            value={form.password} 
            onChange={e => setField('password', e.target.value)} 
            required 
            autoComplete="new-password"
            name="password"
          />
        </label>
        <label className="field"><span>Confirm Password</span>
          <input 
            type="password" 
            value={form.confirm} 
            onChange={e => setField('confirm', e.target.value)} 
            required 
            autoComplete="new-password"
            name="confirm-password"
          />
        </label>
        <button className="btn btn-primary" type="submit">Create Account</button>
        <div className="muted">Already have an account? <Link to="/login">Sign in</Link></div>
      </form>
    </div>
  );
}
