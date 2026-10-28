import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import { formatDate, parseDate, relative, STATE_LABEL, MONTHS } from './util.js';

const paths = {
  today: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  plus: 'M12 5v14M5 12h14',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  people: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M15 3.13a3.5 3.5 0 010 6.75',
  car: 'M5 16h14M6 16l1.5-5h9L18 16M5 16v3h2v-2M19 16v3h-2v-2M8 13.5h.01M16 13.5h.01',
  home: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 004.6 15H4.5a2 2 0 110-4h.1a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0011 4.6V4.5a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7h.1a2 2 0 110 4h-.1a1.6 1.6 0 00-1.2.8z',
  check: 'M5 12.5l4.5 4.5L19 7',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
};

export function Icon({ name, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}

export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <span className="brand-mark"><Icon name="check" width="18" height="18" strokeWidth="3" /></span>
      Scadenze Italia
    </Link>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return fn()
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((e) => setState({ data: null, error: e.message, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

/** Persone, veicoli e immobili dell'utente, per etichette e select. */
export function useEntities() {
  return useLoad(async () => {
    const [p, v, i] = await Promise.all([api('/people'), api('/vehicles'), api('/properties')]);
    return { people: p.people, vehicles: v.vehicles, properties: i.properties };
  });
}

export function ownerLabel(d, ent) {
  if (!ent) return '';
  const parts = [];
  if (d.person_id) parts.push(ent.people.find((x) => x.id === d.person_id)?.name);
  if (d.vehicle_id) parts.push(ent.vehicles.find((x) => x.id === d.vehicle_id)?.name);
  if (d.property_id) parts.push(ent.properties.find((x) => x.id === d.property_id)?.name);
  return parts.filter(Boolean).join(' · ');
}

export function StateBadge({ state }) {
  return <span className={`badge ${state}`}>{STATE_LABEL[state] || state}</span>;
}

export function DeadlineList({ items, ent, empty = 'Niente qui.' }) {
  if (!items.length) return <div className="empty">{empty}</div>;
  return (
    <ul className="dl-list">
      {items.map((d) => {
        const date = parseDate(d.due_date);
        const owner = ownerLabel(d, ent);
        return (
          <li key={d.id}>
            <Link to={`/scadenza/${d.id}`} className={`dl-item ${d.state}`}>
              <div className="dl-date" aria-hidden="true">
                <b>{date.getDate()}</b>
                <span>{MONTHS[date.getMonth()].slice(0, 3)} {String(date.getFullYear()).slice(2)}</span>
              </div>
              <div className="dl-body">
                <div className="dl-title">{d.title}</div>
                <div className="dl-meta">
                  <span className="sr-only">{formatDate(d.due_date)}, </span>
                  {d.state === 'done' || d.state === 'archived' ? STATE_LABEL[d.state] : relative(d.due_date)}
                  {owner && ` · ${owner}`}
                </div>
              </div>
              {(d.state === 'overdue' || d.state === 'week') && <StateBadge state={d.state} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Loading() {
  return <p className="muted" role="status">Caricamento…</p>;
}
