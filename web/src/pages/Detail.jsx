import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Alert, Loading, StateBadge, ownerLabel, useEntities, useLoad } from '../ui.jsx';
import { formatDate, recurLabel, relative } from '../util.js';
import { DeadlineForm } from './NewDeadline.jsx';

function icsFor(d) {
  const day = d.due_date.replaceAll('-', '');
  const next = new Date(`${d.due_date}T00:00:00`);
  next.setDate(next.getDate() + 1);
  const end = next.toISOString().slice(0, 10).replaceAll('-', '');
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scadenze Italia//IT', 'BEGIN:VEVENT',
    `UID:scadenza-${d.id}@scadenze-italia`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${esc(d.title)}`,
    d.notes ? `DESCRIPTION:${esc(d.notes)}` : null, 'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export default function Detail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { config } = useApp();
  const { data, error, loading, reload } = useLoad(() => api(`/deadlines/${id}`), [id]);
  const { data: ent } = useEntities();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (loading && !data) return <Loading />;
  if (error) return <><Alert>{error}</Alert><Link to="/elenco">Torna all’elenco</Link></>;

  const d = data.deadline;
  const t = data.template || {};
  const owner = ownerLabel(d, ent);

  async function act(action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setErr('');
    setMsg('');
    try {
      if (action === 'delete') {
        await api(`/deadlines/${id}`, { method: 'DELETE' });
        nav('/elenco', { replace: true });
        return;
      }
      const r = await api(`/deadlines/${id}`, { method: 'POST', body: { action } });
      if (action === 'duplicate') {
        nav(`/scadenza/${r.id}`);
        return;
      }
      if (action === 'done') setMsg(r.next ? `Fatto! Prossima scadenza: ${formatDate(r.next)}.` : 'Segnata come fatta.');
      reload();
    } catch (e) {
      setErr(e.message);
    }
  }

  function downloadIcs() {
    const blob = new Blob([icsFor(d)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scadenza-${d.id}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (editing) {
    return (
      <>
        <button type="button" className="btn small ghost" onClick={() => setEditing(false)}>← Annulla</button>
        <h1 style={{ marginTop: 8 }}>Modifica</h1>
        <DeadlineForm
          templateKey={d.template_key}
          id={d.id}
          initial={{ ...d, notes: d.notes ?? '', amount: d.amount ?? '', person_id: d.person_id ?? '', vehicle_id: d.vehicle_id ?? '', property_id: d.property_id ?? '', remind_days: d.remind_days ?? '' }}
          onSaved={() => { setEditing(false); setMsg('Modifiche salvate.'); reload(); }}
        />
      </>
    );
  }

  const shifted = d.holiday_shift || null;

  return (
    <div className="dl-detail">
      <Link to="/elenco" className="btn small ghost">← Elenco</Link>
      <div className="row between" style={{ margin: '8px 0 4px' }}>
        <h1 style={{ margin: 0 }}>{d.title}</h1>
        <StateBadge state={d.state} />
      </div>
      <p className="muted">{config.categories[d.category]}{owner && ` · ${owner}`}</p>
      <Alert kind="ok">{msg}</Alert>
      <Alert>{err}</Alert>

      <div className="card">
        <p style={{ fontSize: '1.25rem', marginBottom: 4 }}><b>{formatDate(d.due_date, { weekday: true })}</b></p>
        <p className="muted">{d.status === 'open' ? relative(d.due_date) : d.status === 'done' ? `Fatta il ${formatDate(d.done_at)}` : 'Archiviata'}</p>
        {shifted && shifted !== d.due_date && d.status === 'open' && (
          <Alert kind="warn">Cade di sabato, domenica o festivo: per i pagamenti di solito slitta al primo giorno feriale ({formatDate(shifted)}).</Alert>
        )}
        <dl>
          <dt>Ricorrenza</dt><dd>{recurLabel(d.recur)}</dd>
          <dt>Promemoria</dt><dd>{(d.remind_days || '').split(',').filter(Boolean).map((n) => `${n.trim()} gg`).join(', ') || '—'} prima</dd>
          {d.amount && <><dt>Importo</dt><dd>{d.amount}</dd></>}
          {d.done_at && d.status === 'open' && <><dt>Ultima volta</dt><dd>{formatDate(d.done_at)}</dd></>}
        </dl>
        {d.notes && <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{d.notes}</p>}
      </div>

      {(t.hint || t.link) && (
        <div className="card">
          <h3>Come funziona</h3>
          {t.hint && <p className="muted">{t.hint}</p>}
          {t.link && <a className="btn small" href={t.link} target="_blank" rel="noreferrer">Sito ufficiale ↗</a>}
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        {d.status === 'open' && (
          <button type="button" className="btn primary" onClick={() => act('done')}>
            ✓ Fatta{d.recur !== 'once' && d.recur !== 'none' ? ', calcola la prossima' : ''}
          </button>
        )}
        {d.status !== 'open' && <button type="button" className="btn primary" onClick={() => act('reopen')}>Riapri</button>}
        <button type="button" className="btn" onClick={() => setEditing(true)}>Modifica</button>
        <button type="button" className="btn" onClick={downloadIcs}>Aggiungi al calendario</button>
        <button type="button" className="btn" onClick={() => act('duplicate')}>Duplica</button>
        {d.status === 'open' && <button type="button" className="btn" onClick={() => act('archive')}>Archivia</button>}
        <button type="button" className="btn danger" onClick={() => act('delete', 'Eliminare questa scadenza?')}>Elimina</button>
      </div>
    </div>
  );
}
