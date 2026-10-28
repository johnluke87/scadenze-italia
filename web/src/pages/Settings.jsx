import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Alert, Field, Icon } from '../ui.jsx';
import ComuneSearch from './ComuneSearch.jsx';
import Notifications from './Notifications.jsx';

export default function Settings() {
  const { user, setUser, logout } = useApp();
  const [profile, setProfile] = useState({ name: user.name, remind_days: user.remind_days });
  const [place, setPlace] = useState(user);
  const [pw, setPw] = useState({ current: '', password: '' });
  const [msg, setMsg] = useState({ kind: 'ok', text: '' });

  const say = (text, kind = 'ok') => setMsg({ kind, text });

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const body = { ...profile };
      if (place !== user) Object.assign(body, place);
      const r = await api('/me', { method: 'PUT', body });
      setUser(r.user);
      say('Impostazioni salvate.');
    } catch (ex) {
      say(ex.message, 'error');
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    try {
      await api('/me/password', { method: 'POST', body: pw });
      setPw({ current: '', password: '' });
      say('Password cambiata.');
    } catch (ex) {
      say(ex.message, 'error');
    }
  }

  async function exportJson() {
    try {
      const r = await api('/export');
      const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'scadenze-italia.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (ex) {
      say(ex.message, 'error');
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Cancellare l’account e tutte le scadenze? Non si può annullare.')) return;
    try {
      await api('/me', { method: 'DELETE' });
      logout();
    } catch (ex) {
      say(ex.message, 'error');
    }
  }

  return (
    <>
      <h1>Impostazioni</h1>
      <Alert kind={msg.kind}>{msg.text}</Alert>

      <div className="stack" style={{ marginBottom: 20 }}>
        <div className="row">
          <Link className="btn" to="/famiglia"><Icon name="people" width="18" />Famiglia</Link>
          <Link className="btn" to="/veicoli"><Icon name="car" width="18" />Veicoli</Link>
          <Link className="btn" to="/immobili"><Icon name="home" width="18" />Immobili</Link>
        </div>
      </div>

      <Notifications />

      <form className="card" onSubmit={saveProfile}>
        <h2>Profilo</h2>
        <Field label="Nome"><input required maxLength={80} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
        <Field label="Email" hint={user.email_verified ? 'Confermata.' : 'Non ancora confermata: controlla la posta.'}>
          <input value={user.email} disabled />
        </Field>
        <ComuneSearch value={place} onPick={(r) => setPlace({ comune: r.comune, provincia: r.provincia, regione: r.regione, lat: r.lat, lng: r.lng })} />
        <Field label="Preavvisi predefiniti (giorni prima)" hint="Usati quando una scadenza non ha preavvisi propri. Es. 30,7,1">
          <input value={profile.remind_days} pattern="\s*\d{1,3}(\s*,\s*\d{1,3})*\s*" onChange={(e) => setProfile({ ...profile, remind_days: e.target.value })} />
        </Field>
        <button className="btn primary">Salva</button>
      </form>

      <form className="card" onSubmit={savePassword}>
        <h2>Password</h2>
        <div className="grid2">
          <Field label="Attuale"><input type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="Nuova"><input type="password" autoComplete="new-password" minLength={8} required value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
        </div>
        <button className="btn">Cambia password</button>
      </form>

      <div className="card">
        <h2>I tuoi dati</h2>
        <div className="row">
          <button type="button" className="btn" onClick={exportJson}>Esporta JSON</button>
          <button type="button" className="btn" onClick={logout}>Esci</button>
          <button type="button" className="btn danger" onClick={deleteAccount}>Cancella account</button>
        </div>
      </div>
    </>
  );
}
