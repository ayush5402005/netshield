import { useEffect, useState } from 'react';
import { Layout } from './components/Layout.jsx';
import { useLiveSocket } from './hooks/useLiveSocket.js';
import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Devices } from './pages/Devices.jsx';
import { WebsiteBlocking } from './pages/WebsiteBlocking.jsx';
import { LiveTraffic } from './pages/LiveTraffic.jsx';
import { Alerts } from './pages/Alerts.jsx';
import { Reports } from './pages/Reports.jsx';
import { SystemHealth } from './pages/SystemHealth.jsx';
import { Settings } from './pages/Settings.jsx';

const pages = {
  dashboard: Dashboard,
  devices: Devices,
  blocking: WebsiteBlocking,
  live: LiveTraffic,
  alerts: Alerts,
  reports: Reports,
  health: SystemHealth,
  settings: Settings,
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('netshield_token'));
  const [page, setPage] = useState('dashboard');
  const live = useLiveSocket(Boolean(token));
  const Page = pages[page] ?? Dashboard;

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'netshield_token') setToken(event.newValue);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!token) return <Login onLogin={setToken} />;

  return (
    <Layout
      page={page}
      setPage={setPage}
      socketConnected={live.connected}
      onLogout={() => {
        localStorage.removeItem('netshield_token');
        setToken(null);
      }}
    >
      <Page liveEvents={live.events} />
    </Layout>
  );
}

