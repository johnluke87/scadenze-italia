import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Alert, Field, useEntities } from '../ui.jsx';
import {
  RECUR_OPTIONS, addYears, ageAt, cieYears, formatDate, nextBollo, nextRevisione, parseDate, patenteBYears, recurLabel, toIso,
} from '../util.js';

export default function NewDeadline() {
  const { config } = useApp();
  const [params] = useSearchParams();
  const [key, setKey] = useState(params.get('t') && config.templates[params.get('t')] ? params.get('t') : null);
  const [cat, setCat] = useState('');

  if (key) {
    return (
      <>
        <button type="button" className="btn small ghost" onClick={() => setKey(null)}>← Cambia tipo</button>
        <h1 style={{ marginTop: 8 }}>{config.templates[key].title}</h1>
        <DeadlineForm templateKey={key} initial={{
          person_id: params.get('person') || '',
          vehicle_id: params.get('vehicle') || '',
          property_id: params.get('property') || '',
        }} />
      </>
    );
  }

  const groups = Object.entries(config.categories).filter(([c]) => !cat || c === cat);
  return (
    <>
      <h1>Nuova scadenza</h1>
      <p className="muted">Scegli il tipo: ogni modello sa già come si calcola la data e con quanto anticipo avvisarti.</p>
      <div className="row" style={{ marginBottom: 16 }}>
        <button type="button" className={`btn small ${cat === '' ? 'primary' : ''}`} onClick={() => setCat('')}>Tutte</button>
        {Object.entries(config.categories).map(([c, l]) => (
          <button type="button" key={c} className={`btn small ${cat === c ? 'primary' : ''}`} onClick={() => setCat(c)}>{l}</button>
        ))}
      </div>
      {groups.map(([c, label]) => {
        const tpls = Object.entries(config.templates).filter(([, t]) => t.category === c);
        if (!tpls.length) return null;
        return (
          <section key={c} style={{ marginBottom: 20 }}>
            <h2>{label}</h2>
            <div className="tpl-grid">
              {tpls.map(([k, t]) => (
                <button type="button" key={k} className="tpl" onClick={() => setKey(k)}>
                  <b>{t.title}</b>
                  <small className="muted">{recurLabel(t.recur)}</small>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

/** Form condiviso tra creazione e modifica. */
export function DeadlineForm({ templateKey, initial = {}, id, onSaved }) {
  const { config, user } = useApp();
  const nav = useNavigate();
  const t = config.templates[templateKey] || config.templates.custom;
  const { data: ent } = useEntities();
  const [v, setV] = useState({
    title: initial.title ?? (templateKey === 'custom' ? '' : t.title),
    due_date: initial.due_date ?? '',
    recur: initial.recur ?? t.recur,
    remind_days: initial.remind_days ?? t.remind ?? user.remind_days,
    notes: initial.notes ?? '',
    amount: initial.amount ?? '',
    person_id: initial.person_id ?? '',
    vehicle_id: initial.vehicle_id ?? '',
    property_id: initial.property_id ?? '',
  });
  const [calc, setCalc] = useState({ issued: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const fields = t.fields || [];
  const fixed = String(t.recur).startsWith('yearly-fixed');
  const person = ent?.people.find((p) => String(p.id) === String(v.person_id));
  const vehicle = ent?.vehicles.find((p) => String(p.id) === String(v.vehicle_id));

  // Suggerimenti di calcolo dalla regola del modello.
  let suggestion = null;
  if ((templateKey === 'revisione' || templateKey === 'revisione_moto') && vehicle?.first_reg) {
    suggestion = { date: nextRevisione(vehicle.first_reg), why: `Immatricolata a ${formatDate(vehicle.first_reg).replace(/^1 /, '')}: prima revisione a 4 anni, poi ogni 2, entro fine mese.` };
  } else if (templateKey === 'bollo' && vehicle?.first_reg) {
    suggestion = { date: nextBollo(vehicle.first_reg), why: 'Di solito il bollo scade a fine del mese di immatricolazione. Controlla l’ultima ricevuta.' };
  } else if ((templateKey === 'cie' || templateKey === 'patente_b') && person?.birthdate && calc.issued) {
    const age = ageAt(person.birthdate, calc.issued);
    const years = templateKey === 'cie' ? cieYears(age) : patenteBYears(age);
    const raw = addYears(calc.issued, years);
    // Scadono al compleanno successivo alla data teorica.
    const b = parseDate(person.birthdate);
    const r = parseDate(raw);
    let bday = new Date(r.getFullYear(), b.getMonth(), b.getDate());
    if (bday < r) bday = new Date(r.getFullYear() + 1, b.getMonth(), b.getDate());
    suggestion = { date: toIso(bday), why: `${age} anni al rilascio → validità ${years} anni, scade al compleanno. Verifica sul documento.` };
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const body = { ...v, template_key: templateKey };
    try {
      if (id) {
        await api(`/deadlines/${id}`, { method: 'PUT', body });
        onSaved?.();
      } else {
        const r = await api('/deadlines', { method: 'POST', body });
        nav(`/scadenza/${r.id}`, { replace: true });
      }
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <Alert>{err}</Alert>
      {t.hint && <Alert kind="info">{t.hint}{t.link && <> <a href={t.link} target="_blank" rel="noreferrer">Sito ufficiale ↗</a></>}</Alert>}

      <Field label="Titolo">
        <input required maxLength={160} value={v.title} onChange={set('title')} placeholder={t.title} />
      </Field>

      {fields.includes('person') && ent && (
        <Field label="Di chi è">
          <select value={v.person_id} onChange={set('person_id')}>
            <option value="">—</option>
            {ent.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      )}
      {fields.includes('vehicle') && ent && (
        <Field label="Veicolo" hint={ent.vehicles.length === 0 ? 'Aggiungi un veicolo da “Veicoli” per calcolare revisione e bollo.' : undefined}>
          <select value={v.vehicle_id} onChange={set('vehicle_id')}>
            <option value="">—</option>
            {ent.vehicles.map((p) => <option key={p.id} value={p.id}>{p.name}{p.plate ? ` (${p.plate})` : ''}</option>)}
          </select>
        </Field>
      )}
      {fields.includes('property') && ent && ent.properties.length > 0 && (
        <Field label="Immobile">
          <select value={v.property_id} onChange={set('property_id')}>
            <option value="">—</option>
            {ent.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      )}

      {(templateKey === 'cie' || templateKey === 'patente_b') && person?.birthdate && !id && (
        <Field label="Non trovi la scadenza? Data di rilascio (o ultimo rinnovo)" hint="Calcoliamo la scadenza dalla regola, ma la data stampata sul documento vale sempre.">
          <input type="date" value={calc.issued} onChange={(e) => setCalc({ issued: e.target.value })} />
        </Field>
      )}

      <Field label="Data di scadenza" hint={fixed && !v.due_date ? 'Data di legge: se la lasci vuota usiamo la prossima.' : undefined}>
        <input type="date" required={!fixed} value={v.due_date} onChange={set('due_date')} />
      </Field>
      {suggestion && suggestion.date !== v.due_date && (
        <div className="alert info row between">
          <span>Proposta: <b>{formatDate(suggestion.date)}</b><br /><small>{suggestion.why}</small></span>
          <button type="button" className="btn small" onClick={() => setV((s) => ({ ...s, due_date: suggestion.date }))}>Usa</button>
        </div>
      )}

      <div className="grid2">
        <Field label="Ricorrenza">
          <select value={v.recur} onChange={set('recur')}>
            {fixed && <option value={t.recur}>{recurLabel(t.recur)}</option>}
            {!RECUR_OPTIONS.some(([r]) => r === v.recur) && !fixed && <option value={v.recur}>{recurLabel(v.recur)}</option>}
            {RECUR_OPTIONS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
          </select>
        </Field>
        <Field label="Avvisami (giorni prima)" hint="Separati da virgola, es. 30,7,1">
          <input value={v.remind_days} onChange={set('remind_days')} pattern="\s*\d{1,3}(\s*,\s*\d{1,3})*\s*" inputMode="numeric" />
        </Field>
      </div>
      <Field label="Importo (facoltativo)" hint={templateKey === 'bollo' ? 'L’importo esatto lo calcola ACI: usa il link ufficiale.' : undefined}>
        <input value={v.amount} maxLength={40} onChange={set('amount')} placeholder="Es. 180 €" />
      </Field>
      <Field label="Note">
        <textarea value={v.notes} onChange={set('notes')} />
      </Field>
      <button className="btn primary block" disabled={busy}>{busy ? 'Salvataggio…' : id ? 'Salva modifiche' : 'Aggiungi scadenza'}</button>
    </form>
  );
}
