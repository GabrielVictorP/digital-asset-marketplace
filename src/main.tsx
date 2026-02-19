import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/logger' // Import logger to override console in production
import './lib/network-interceptor' // Import network interceptor to mask sensitive data in production

createRoot(document.getElementById("root")!).render(<App />);
