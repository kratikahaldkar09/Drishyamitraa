import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-icon">📷</div>
          <h1 className="hero-title">Drishyamitra</h1>
          <p className="hero-subtitle">
            Professional Photography Platform
          </p>
          <p className="hero-text">
            Transform your photography workflow with AI-powered tools, smart organization,
            and seamless sharing across multiple platforms.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" to="/signup">Get Started Free</Link>
            <Link className="btn" to="/login">Login</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

