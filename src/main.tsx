import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from './lib/sentry'

// Fire-and-forget: initializes only when VITE_SENTRY_DSN is configured.
void initSentry();

createRoot(document.getElementById("root")!).render(<App />);
