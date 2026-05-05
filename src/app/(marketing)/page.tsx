import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Decorative Orbs */}
      <div className="landing-orb orb-1" />
      <div className="landing-orb orb-2" />
      <div className="landing-orb orb-3" />

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-logo-icon">S</div>
          <span className="landing-logo-text">SentientLog</span>
        </div>
        <div className="landing-nav-links">
          <Link href="/login" className="btn-secondary">Log In</Link>
          <Link href="/register" className="btn-primary">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-main">
        <h1 className="landing-title">
          Supercharge your observability with <span className="text-gradient">AI-driven</span> analytics.
        </h1>
        <p className="landing-subtitle">
          Let AI illuminate your sales journey, system events, and log tracking. Analyze trends and stay in command with a sleek, insight-driven dashboard.
        </p>
        
        <div className="landing-cta">
          <Link href="/register" className="btn-primary btn-large">Start Building Now</Link>
          <Link href="/login" className="btn-glass btn-large">View Dashboard</Link>
        </div>

        {/* Dashboard Preview Glass Element */}
        <div className="landing-preview-wrapper">
          <div className="landing-preview-glass">
            <div className="landing-preview-inner">
              <div className="preview-nav">
                <div className="preview-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="preview-search" />
              </div>
              <div className="preview-content">
                <div className="preview-sidebar" />
                <div className="preview-main">
                  <div className="preview-kpis">
                    <div className="preview-kpi-card" />
                    <div className="preview-kpi-card" />
                    <div className="preview-kpi-card" />
                  </div>
                  <div className="preview-chart" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
