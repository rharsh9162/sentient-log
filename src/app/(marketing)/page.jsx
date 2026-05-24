import Link from "next/link";
import { XCircle, Zap, Bot, Bell, MousePointerClick } from "lucide-react";

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
          <div className="landing-logo-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/icon.png" alt="SentientLog Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="landing-logo-text">SentientLog</span>
        </div>
        <div className="landing-nav-links">
          <Link href="/login" className="btn-secondary">
            Log In
          </Link>
          <Link href="/register" className="btn-primary">
            Get Started Free
          </Link>
        </div>
      </nav>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-section hero-section">
          <h1 className="landing-title">
            Supercharge your observability with{" "}
            <span className="text-gradient">AI-driven</span> analytics.
          </h1>
          <p className="landing-subtitle">
            Let AI illuminate your sales journey, system events, and log tracking.
            Analyze trends and stay in command with a sleek, insight-driven
            dashboard.
          </p>

          <div className="landing-cta">
            <Link href="/register" className="btn-primary btn-large">
              Start Building Now
            </Link>
            <Link href="/login" className="btn-glass btn-large">
              View Dashboard
            </Link>
          </div>

          {/* Dashboard Preview Image */}
          <div className="landing-preview-wrapper" style={{ padding: '0 20px', marginTop: '40px', maxWidth: '1000px', margin: '40px auto 0' }}>
            <div className="landing-preview-glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', borderRadius: '24px' }}>
              <img 
                src="/dashboard-preview.png" 
                alt="SentientLog Dashboard Preview" 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  borderRadius: '16px',
                  display: 'block',
                  boxShadow: '0 12px 48px rgba(31, 38, 135, 0.15), 0 1px 3px rgba(255,255,255,0.5) inset'
                }} 
              />
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="landing-section problem-section">
          <h2 className="section-heading">Why SentientLog?</h2>
          <p className="section-subheading">
            Traditional logging tools are noisy, complicated, and lack actionable insights. You spend hours digging through text files just to figure out why a page is slow.
          </p>
          <div className="features-grid">
            <div className="landing-card">
              <div className="card-icon red"><XCircle size={28} /></div>
              <h3>Data Overload</h3>
              <p>Too many logs, too little signal. Finding the root cause of an error feels like finding a needle in a haystack.</p>
            </div>
            <div className="landing-card">
              <div className="card-icon red"><XCircle size={28} /></div>
              <h3>Delayed Responses</h3>
              <p>You only find out about site crashes or slow APIs when customers complain on social media.</p>
            </div>
            <div className="landing-card">
              <div className="card-icon red"><XCircle size={28} /></div>
              <h3>Fragmented Tools</h3>
              <p>Switching between analytics, error tracking, and uptime monitors wastes time and context.</p>
            </div>
          </div>
        </section>

        {/* The Solution / Features Section */}
        <section className="landing-section features-section">
          <h2 className="section-heading">Everything you need in <span className="text-gradient">one dashboard</span></h2>
          <p className="section-subheading">
            SentientLog acts as your intelligent co-pilot, automatically tracking what matters and notifying you before things break.
          </p>
          
          <div className="features-grid">
            <div className="landing-card">
              <div className="card-icon green"><Zap size={28} /></div>
              <h3>Real-Time API Latency</h3>
              <p>Automatically monkey-patches `fetch` and `axios` to track endpoint performance without manual instrumentation.</p>
            </div>
            <div className="landing-card">
              <div className="card-icon indigo"><Bot size={28} /></div>
              <h3>AI-Powered Analysis</h3>
              <p>Chat directly with your logs. Ask "Why were there so many errors today?" and get instant context and summaries.</p>
            </div>
            <div className="landing-card">
              <div className="card-icon yellow"><Bell size={28} /></div>
              <h3>Smart Alerting</h3>
              <p>Set custom thresholds for error rates or slow pages. Get instantly notified via email the moment things go south.</p>
            </div>
            <div className="landing-card">
              <div className="card-icon pink"><MousePointerClick size={28} /></div>
              <h3>User Interaction Tracking</h3>
              <p>Capture page views and button clicks to see exactly how users are navigating your application.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="landing-section how-it-works-section">
          <h2 className="section-heading">Get started in minutes</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Drop in the snippet</h3>
              <p>Add our lightweight <code>&lt;script&gt;</code> tag to your website's HTML. It works with any framework or vanilla site.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Set your alerts</h3>
              <p>Define what "normal" looks like for your app and set thresholds for anomalies.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Let AI do the rest</h3>
              <p>Watch as your dashboard lights up with insights, charts, and actionable metrics.</p>
            </div>
          </div>
        </section>
        
        {/* Documentation / Integration Guide */}
        <section className="landing-section docs-section">
          <h2 className="section-heading">Integration Guide</h2>
          <p className="section-subheading">
            No massive dependencies to install. You can find your <strong>YOUR_ACCOUNT_ID</strong> in the SentientLog dashboard once you sign up!
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "40px", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
            
            {/* HTML / MERN Snippet */}
            <div>
              <h3 style={{ fontSize: "18px", color: "var(--text)", marginBottom: "16px", textAlign: "left" }}>For Standard HTML / MERN Apps:</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "12px", textAlign: "left" }}>Paste this inside the <code>&lt;head&gt;</code> of your <code>index.html</code>.</p>
              <div className="code-block-wrapper" style={{ marginTop: 0 }}>
                <div className="code-block-header">
                  <div className="preview-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <span className="code-filename">index.html</span>
                </div>
                <pre className="code-block">
                  <code>
<span className="code-tag">&lt;!DOCTYPE html&gt;</span>{`\n`}
<span className="code-tag">&lt;html</span> <span className="code-attr">lang</span>=<span className="code-string">"en"</span><span className="code-tag">&gt;</span>{`\n`}
<span className="code-tag">&lt;head&gt;</span>{`\n`}
  <span className="code-comment">&lt;!-- SentientLog Analytics Tracker --&gt;</span>{`\n`}
  <span className="code-tag">&lt;script</span> <span className="code-attr">src</span>=<span className="code-string">"https://sentient-log-rho.vercel.app/tracker.js"</span>{`\n`}
          <span className="code-attr">data-site-id</span>=<span className="code-string">"YOUR_ACCOUNT_ID"</span> <span className="code-attr">defer</span><span className="code-tag">&gt;&lt;/script&gt;</span>{`\n`}
<span className="code-tag">&lt;/head&gt;</span>{`\n`}
<span className="code-tag">&lt;body&gt;</span>{`\n`}
  <span className="code-tag">&lt;h1&gt;</span>Hello World!<span className="code-tag">&lt;/h1&gt;</span>{`\n`}
<span className="code-tag">&lt;/body&gt;</span>{`\n`}
<span className="code-tag">&lt;/html&gt;</span>
                  </code>
                </pre>
              </div>
            </div>

            {/* Next.js Snippet */}
            <div>
              <h3 style={{ fontSize: "18px", color: "var(--text)", marginBottom: "16px", textAlign: "left" }}>For Next.js Apps:</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "12px", textAlign: "left" }}>Use the Next.js Script component in your root <code>layout.jsx</code>.</p>
              <div className="code-block-wrapper" style={{ marginTop: 0 }}>
                <div className="code-block-header">
                  <div className="preview-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <span className="code-filename">app/layout.jsx</span>
                </div>
                <pre className="code-block">
                  <code>
<span className="code-tag">import</span> Script <span className="code-tag">from</span> <span className="code-string">"next/script"</span>;{`\n\n`}
<span className="code-tag">export default function</span> <span className="code-attr">RootLayout</span>({`{ children }`}) {`{\n`}
  <span className="code-tag">return</span> ({`\n`}
    <span className="code-tag">&lt;html</span> <span className="code-attr">lang</span>=<span className="code-string">"en"</span><span className="code-tag">&gt;</span>{`\n`}
      <span className="code-tag">&lt;body&gt;</span>{`\n`}
        <span className="code-comment">{`{/* SentientLog Analytics Tracker */}`}</span>{`\n`}
        <span className="code-tag">&lt;Script</span>{`\n`}
          <span className="code-attr">src</span>=<span className="code-string">"https://sentient-log-rho.vercel.app/tracker.js"</span>{`\n`}
          <span className="code-attr">data-site-id</span>=<span className="code-string">"YOUR_ACCOUNT_ID"</span>{`\n`}
          <span className="code-attr">strategy</span>=<span className="code-string">"afterInteractive"</span>{`\n`}
        <span className="code-tag">/&gt;</span>{`\n`}
        {`{children}\n`}
      <span className="code-tag">&lt;/body&gt;</span>{`\n`}
    <span className="code-tag">&lt;/html&gt;</span>{`\n`}
  );{`\n`}
{`}`}
                  </code>
                </pre>
              </div>
            </div>

          </div>
        </section>
        
        {/* Final CTA */}
        <section className="landing-section final-cta">
          <h2 className="section-heading">Ready to gain full visibility?</h2>
          <Link href="/register" className="btn-primary btn-large" style={{ marginTop: '24px' }}>
            Get Started Free
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} SentientLog. All rights reserved.</p>
      </footer>
    </div>
  );
}
