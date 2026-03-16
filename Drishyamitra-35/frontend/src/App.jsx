import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Gallery from './pages/Gallery.jsx';
import Chat from './pages/Chat.jsx';
import Editor from './pages/Editor.jsx';
import Settings from './pages/Settings.jsx';
import Upload from './pages/Upload.jsx';
import History from './pages/History.jsx';
import People from './pages/People.jsx';
import Person from './pages/Person.jsx';
import LabelFaces from './pages/LabelFaces.jsx';
import './styles.css';

function useAuth() {
  const [user, setUser] = useState(localStorage.getItem('userEmail'));
  
  useEffect(() => {
    const handleAuthChange = () => {
      setUser(localStorage.getItem('userEmail'));
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  return !!user;
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function NavBar() {
  const isAuthenticated = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname);

  function handleLogout() {
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    window.dispatchEvent(new CustomEvent('auth-change'));
    navigate('/');
  }

  return (
    <header className="nav">
      <div className="nav-brand">
        <span className="logo">📷</span> Drishyamitra
      </div>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        {isAuthenticated && !isAuthPage ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/people">People</Link>
            <Link to="/label-faces">Label Faces</Link>
            <Link to="/upload">Upload</Link>
            <Link to="/chat">Chat</Link>
            <Link to="/history">History</Link>
            <Link to="/settings">Settings</Link>
            <button 
              className="btn btn-sm" 
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0 10px' }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  return (
    <div className={isHome ? 'app-home' : 'app-internal'}>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
        <Route path="/people/:id" element={<ProtectedRoute><Person /></ProtectedRoute>} />
        <Route path="/label-faces" element={<ProtectedRoute><LabelFaces /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}
