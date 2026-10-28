import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';
import { Brand, Icon, Loading } from './ui.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register, Verify, Forgot, Reset } from './pages/Auth.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import List from './pages/List.jsx';
import NewDeadline from './pages/NewDeadline.jsx';
import Detail from './pages/Detail.jsx';
import Calendar from './pages/Calendar.jsx';
import { People, Vehicles, Properties } from './pages/Entities.jsx';
import Settings from './pages/Settings.jsx';
import Privacy from './pages/Privacy.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const ONBOARD_KEY = 'si_onboarded';

export function markOnboarded(userId) {
  try {
    localStorage.setItem(`${ONBOARD_KEY}_${userId}`, '1');
  } catch {
    /* ignora */
  }
}

function needsOnboarding(user) {
  if (!user || user.comune) return false;
  try {
    return localStorage.getItem(`${ONBOARD_KEY}_${user.id}`) !== '1';
  } catch {
    return false;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const cfg = api('/config').then(setConfig).catch(() => setConfig({ templates: {}, categories: {}, holidays: {} }));
    const me = getToken()
      ? api('/me').then((r) => setUser(r.user)).catch(() => setUser(null))
      : Promise.resolve();
    Promise.all([cfg, me]).finally(() => setBooting(false));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate('/entra');
  }, [navigate]);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('si:logout', onLogout);
    return () => window.removeEventListener('si:logout', onLogout);
  }, []);

  const login = useCallback((token, u) => {
    setToken(token);
    setUser(u);
  }, []);

  if (booting) {
    return <main className="main narrow"><Loading /></main>;
  }

  return (
    <Ctx.Provider value={{ user, setUser, config, login, logout }}>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={user ? <Navigate to="/oggi" replace /> : <Landing />} />
          <Route path="/entra" element={user ? <Navigate to="/oggi" replace /> : <Login />} />
          <Route path="/registrati" element={user ? <Navigate to="/oggi" replace /> : <Register />} />
          <Route path="/verifica/:token" element={<Verify />} />
          <Route path="/password" element={<Forgot />} />
          <Route path="/reset/:token" element={<Reset />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>
        <Route element={<RequireUser />}>
          <Route path="/benvenuto" element={<Onboarding />} />
          <Route element={<AppShell />}>
            <Route path="/oggi" element={<Today />} />
            <Route path="/elenco" element={<List />} />
            <Route path="/nuova" element={<NewDeadline />} />
            <Route path="/scadenza/:id" element={<Detail />} />
            <Route path="/calendario" element={<Calendar />} />
            <Route path="/famiglia" element={<People />} />
            <Route path="/veicoli" element={<Vehicles />} />
            <Route path="/immobili" element={<Properties />} />
            <Route path="/impostazioni" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Ctx.Provider>
  );
}

function RequireUser() {
  const { user } = useApp();
  const loc = useLocation();
  if (!user) return <Navigate to="/entra" replace state={{ from: loc.pathname }} />;
  if (needsOnboarding(user) && loc.pathname !== '/benvenuto') return <Navigate to="/benvenuto" replace />;
  return <Outlet />;
}

function PublicShell() {
  const { user } = useApp();
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <nav className="row">
          {user ? (
            <NavLink className="btn small primary" to="/oggi">Apri l’app</NavLink>
          ) : (
            <>
              <NavLink className="btn small ghost" to="/entra">Entra</NavLink>
              <NavLink className="btn small primary" to="/registrati">Registrati</NavLink>
            </>
          )}
        </nav>
      </header>
      <Outlet />
      <Footer />
    </div>
  );
}

const NAV = [
  ['/oggi', 'today', 'Oggi'],
  ['/elenco', 'list', 'Elenco'],
  ['/nuova', 'plus', 'Nuova'],
  ['/calendario', 'calendar', 'Calendario'],
];
const NAV_MORE = [
  ['/famiglia', 'people', 'Famiglia'],
  ['/veicoli', 'car', 'Veicoli'],
  ['/immobili', 'home', 'Immobili'],
  ['/impostazioni', 'settings', 'Impostazioni'],
];

function AppShell() {
  const { user, logout } = useApp();
  return (
    <div className="shell app">
      <nav className="sidenav" aria-label="Menu principale">
        <Brand to="/oggi" />
        {[...NAV, ...NAV_MORE].map(([to, icon, label]) => (
          <NavLink key={to} to={to} className="nav"><Icon name={icon} />{label}</NavLink>
        ))}
        <div className="spacer" />
        <button type="button" className="btn ghost small" onClick={logout}><Icon name="logout" width="18" />Esci</button>
      </nav>
      <div className="col">
        <header className="topbar">
          <Brand to="/oggi" />
          <span className="muted" style={{ fontSize: '0.9rem' }}>{user.name}</span>
        </header>
        {!user.email_verified && (
          <div className="alert warn" style={{ margin: '12px 16px 0', borderRadius: 10 }}>
            Conferma la tua email per ricevere i promemoria: ti abbiamo mandato un link a <b>{user.email}</b>.
          </div>
        )}
        <main className="main" id="contenuto">
          <Outlet />
        </main>
        <Footer />
      </div>
      <nav className="bottomnav" aria-label="Menu">
        {[...NAV, ['/impostazioni', 'settings', 'Altro']].map(([to, icon, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive || (to === '/impostazioni' && NAV_MORE.some(([p]) => location.hash.startsWith(`#${p}`))) ? 'active' : '')}>
            <Icon name={icon} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Footer() {
  const { config } = useApp();
  return (
    <footer className="footer">
      Scadenze Italia · gratis, senza pubblicità ·{' '}
      <NavLink to="/privacy">Privacy</NavLink>
      {config?.donate_url && <> · <a href={config.donate_url} target="_blank" rel="noreferrer">Offrimi un caffè</a></>}
      {' · '}<a href="../supporto/?app=scadenze-italia">Scrivimi</a>
    </footer>
  );
}
