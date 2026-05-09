import { ChartBar, ChatCircleText, GitBranch, ShieldCheck } from "@phosphor-icons/react";
import "./App.css";

const setupItems = [
  "VitePlus + React app scaffolded",
  "TanStack Router installed for readable URL slugs",
  "Convex client dependency installed",
  "Convex component packages staged for rate limits, presence, queues, and batch jobs",
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Discussion Open</p>
        <h1>Live discussion intelligence foundation</h1>
        <p className="lede">
          This is the code-side starting point for the participant and instructor surfaces. Convex
          is wired to activate once the local deployment writes <code>VITE_CONVEX_URL</code>.
        </p>
        <div className="action-row">
          <a href="/session/demo-discussion" className="primary-link">
            Preview session route
          </a>
          <a href="/instructor/session/demo-discussion" className="secondary-link">
            Instructor route
          </a>
        </div>
      </section>

      <section className="status-grid" aria-label="Project setup status">
        <article>
          <ChatCircleText size={28} weight="duotone" />
          <h2>Participant Flow</h2>
          <p>QR join, nickname recovery, responses, tabs, and Fight Me mode.</p>
        </article>
        <article>
          <ChartBar size={28} weight="duotone" />
          <h2>Instructor Console</h2>
          <p>Presence pulse, category controls, LLM jobs, and telemetry.</p>
        </article>
        <article>
          <GitBranch size={28} weight="duotone" />
          <h2>Convex Backend</h2>
          <p>Session state, categorisation, prompt templates, and job traces.</p>
        </article>
        <article>
          <ShieldCheck size={28} weight="duotone" />
          <h2>Protections</h2>
          <p>Rate limits, content checks, debounce, and aggregate presence.</p>
        </article>
      </section>

      <section className="setup-panel">
        <h2>Setup checkpoint</h2>
        <ul>
          {setupItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
