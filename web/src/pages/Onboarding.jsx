import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp, markOnboarded } from '../App.jsx';
import { Alert, Brand, Field } from '../ui.jsx';
import { nextBollo, nextRevisione } from '../util.js';
import ComuneSearch from './ComuneSearch.jsx';

const RELATIONS = [['partner', 'Partner'], ['figlio', 'Figlio/a'], ['genitore', 'Genitore'], ['altro', 'Altro']];
const STARTERS = [
  ['cie', 'person'],
  ['patente_b', 'person'],
  ['tessera_sanitaria', 'person'],
  ['bollo', 'vehicle'],
  ['revisione', 'vehicle'],
  ['rca', 'vehicle'],
  ['imu_acconto', 'none'],
  ['imu_saldo', 'none'],
  ['caldaia_manutenzione', 'none'],
];

export default function Onboarding() {
  const { user, setUser, config } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [place, setPlace] = useState(user.comune ? user : null);
  const [birth, setBirth] = useState('');
  const [members, setMembers] = useState([]);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicle, setVehicle] = useState({ name: '', plate: '', kind: 'auto', first_reg: '' });
  const [picked, setPicked] = useState({});
  const [created, setCreated] = useState({ vehicleId: null, meId: null });

  const T = config.templates;
  const starters = STARTERS.filter(([k, kind]) => T[k] && (kind !== 'vehicle' || hasVehicle));

  function finish() {
    markOnboarded(user.id);
    nav('/oggi', { replace: true });
  }

  async function run(fn) {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const saveStep0 = () => run(async () => {
    if (place && place !== user) {
      const r = await api('/me', { method: 'PUT', body: place });
      setUser(r.user);
    }
    setStep(1);
  });

  const saveStep1 = () => run(async () => {
    const { people } = await api('/people');
    const me = people.find((p) => p.relation === 'io');
    if (me && birth) await api(`/people/${me.id}`, { method: 'PUT', body: { name: me.name, relation: 'io', birthdate: birth } });
    for (const m of members) {
      if (m.name.trim()) await api('/people', { method: 'POST', body: m });
    }
    setCreated((c) => ({ ...c, meId: me?.id ?? null }));
    setStep(2);
  });

  const saveStep2 = () => run(async () => {
    let vehicleId = created.vehicleId;
    if (hasVehicle && !vehicleId) {
      const r = await api('/vehicles', { method: 'POST', body: { ...vehicle, name: vehicle.name || (vehicle.kind === 'moto' ? 'Moto' : 'Auto') } });
      vehicleId = r.id;
      setCreated((c) => ({ ...c, vehicleId }));
    }
    const pre = {};
    if (hasVehicle && vehicle.first_reg) {
      const reg = `${vehicle.first_reg}-01`;
      pre.bollo = { on: false, date: nextBollo(reg) };
      pre.revisione = { on: false, date: nextRevisione(reg) };
    }
    setPicked((p) => ({ ...pre, ...p }));
    setStep(3);
  });

  const saveStep3 = () => run(async () => {
    for (const [key, kind] of starters) {
      const p = picked[key];
      if (!p?.on) continue;
      if (!p.date && T[key].fields.includes('due')) continue;
      await api('/deadlines', {
        method: 'POST',
        body: {
          template_key: key,
          due_date: p.date || undefined,
          person_id: kind === 'person' ? created.meId : null,
          vehicle_id: kind === 'vehicle' ? created.vehicleId : null,
        },
      });
    }
    finish();
  });

  const setPick = (key, patch) => setPicked((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  return (
    <div className="shell">
      <header className="topbar">
        <Brand to="/oggi" />
        <button type="button" className="btn small ghost" onClick={finish}>Salta</button>
      </header>
      <main className="main narrow">
        <div className="steps" aria-label={`Passo ${step + 1} di 4`}>
          {[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <Alert>{err}</Alert>

        {step === 0 && (
          <section className="card">
            <h1>Ciao {user.name}! Dove vivi?</h1>
            <p className="muted">Serve per bollo, IMU e TARI: alcune regole cambiano per regione o comune.</p>
            <ComuneSearch value={place} onPick={(r) => setPlace({ comune: r.comune, provincia: r.provincia, regione: r.regione, lat: r.lat, lng: r.lng })} />
            <button type="button" className="btn primary block" disabled={busy} onClick={saveStep0}>Avanti</button>
          </section>
        )}

        {step === 1 && (
          <section className="card">
            <h1>Chi c’è in famiglia?</h1>
            <p className="muted">Così puoi dire “la carta d’identità di Giulia”. La data di nascita aiuta a capire quanto dura un documento.</p>
            <Field label="La tua data di nascita (facoltativa)"><input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} /></Field>
            <Field label="Quante persone siete in tutto, te compreso?">
              <select
                value={members.length + 1}
                onChange={(e) => {
                  const n = Number(e.target.value) - 1;
                  setMembers((m) => Array.from({ length: n }, (_, i) => m[i] || { name: '', relation: 'partner', birthdate: '' }));
                }}
              >
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </Field>
            {members.map((m, i) => (
              <div key={i} className="grid2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 4 }}>
                <Field label={`Persona ${i + 2}`}>
                  <input value={m.name} placeholder="Nome" onChange={(e) => setMembers((ms) => ms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                </Field>
                <Field label="Parentela">
                  <select value={m.relation} onChange={(e) => setMembers((ms) => ms.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))}>
                    {RELATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>
            ))}
            <button type="button" className="btn primary block" disabled={busy} onClick={saveStep1}>Avanti</button>
          </section>
        )}

        {step === 2 && (
          <section className="card">
            <h1>Hai un’auto o una moto?</h1>
            <label className="check"><input type="radio" name="hv" checked={hasVehicle} onChange={() => setHasVehicle(true)} /><span>Sì</span></label>
            <label className="check"><input type="radio" name="hv" checked={!hasVehicle} onChange={() => setHasVehicle(false)} /><span>No, per ora no</span></label>
            {hasVehicle && (
              <>
                <div className="grid2">
                  <Field label="Nome"><input value={vehicle.name} placeholder="Es. Panda" onChange={(e) => setVehicle({ ...vehicle, name: e.target.value })} /></Field>
                  <Field label="Tipo">
                    <select value={vehicle.kind} onChange={(e) => setVehicle({ ...vehicle, kind: e.target.value })}>
                      <option value="auto">Auto</option><option value="moto">Moto</option><option value="altro">Altro</option>
                    </select>
                  </Field>
                </div>
                <div className="grid2">
                  <Field label="Targa (facoltativa)"><input value={vehicle.plate} maxLength={15} onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value.toUpperCase() })} /></Field>
                  <Field label="Mese di prima immatricolazione" hint="Dal libretto: serve per calcolare revisione e bollo.">
                    <input type="month" value={vehicle.first_reg} onChange={(e) => setVehicle({ ...vehicle, first_reg: e.target.value })} />
                  </Field>
                </div>
              </>
            )}
            <button type="button" className="btn primary block" disabled={busy} onClick={saveStep2}>Avanti</button>
          </section>
        )}

        {step === 3 && (
          <section className="card">
            <h1>Le prime scadenze</h1>
            <p className="muted">Spunta quelle che hai e scrivi la data che trovi sul documento. Puoi aggiungerne altre dopo.</p>
            {starters.map(([key]) => {
              const t = T[key];
              const p = picked[key] || {};
              const needsDate = t.fields.includes('due');
              return (
                <div key={key} style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <label className="check">
                    <input type="checkbox" checked={!!p.on} onChange={(e) => setPick(key, { on: e.target.checked })} />
                    <span><b>{t.title}</b>{t.hint && <><br /><small className="muted">{t.hint}</small></>}</span>
                  </label>
                  {p.on && needsDate && (
                    <Field label="Data di scadenza">
                      <input type="date" value={p.date || ''} onChange={(e) => setPick(key, { date: e.target.value })} />
                    </Field>
                  )}
                </div>
              );
            })}
            <button type="button" className="btn primary block" disabled={busy} onClick={saveStep3} style={{ marginTop: 8 }}>Fatto, vai alle scadenze</button>
          </section>
        )}
      </main>
    </div>
  );
}
