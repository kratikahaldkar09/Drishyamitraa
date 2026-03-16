import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    if (!email.endsWith('@gmail.com')) {
      alert('Only @gmail.com emails are allowed');
      return;
    }
    if (password.length < 6) {
      alert('Invalid password. Must be at least 6 characters.');
      return;
    }
    if (username.includes('@')) {
      alert('Username should not be an email address');
      return;
    }
    try {
      localStorage.setItem('userName', username.trim() || 'User');
      localStorage.setItem('userEmail', email.trim() || '');
      window.dispatchEvent(new CustomEvent('auth-change'));
    } catch {}
    navigate('/dashboard');
  }

  return (
    <div className="auth-wrapper">
      <form className="card auth-card" onSubmit={onSubmit} autoComplete="on">
        <h2 className="card-title">Drishyamitra</h2>
        <p className="card-subtitle">Your Intelligent Photo Assistant</p>
        <label className="field">
          <span>Username</span>
          <input 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
            autoComplete="username"
            name="username"
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            autoComplete="email"
            name="email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            autoComplete="current-password"
            name="password"
          />
        </label>
        <button className="btn btn-primary" type="submit">Login</button>
        <div className="muted">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </div>
      </form>
    </div>
  );
}
