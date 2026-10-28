import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { DeadlineList, Loading, Alert, useEntities, useLoad } from '../ui.jsx';
import { daysUntil } from '../util.js';

const PERIODS = [
  ['', 'Qualsiasi periodo'],
  ['7', 'Entro 7 giorni'],
  ['30', 'Entro 30 giorni'],
  ['90', 'Entro 3 mesi'],
  ['365', 'Entro un anno'],
];

export default function List() {
  const { config } = useApp();
  const { data, error, loading } = useLoad(() => api('/deadlines'));
  const { data: ent } = useEntities();
  const [f, setF] = useState({ category: '', owner: '', period: '', status: 'open', q: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;

  const items = data.deadlines.filter((d) => {
    if (f.status === 'open' && d.status !== 'open') return false;
    if (f.status === 'overdue' && d.state !== 'overdue') return false;
    if (f.status === 'done' && d.status !== 'done') return false;
    if (f.status === 'archived' && d.status !== 'archived') return false;
    if (f.category && d.category !== f.category) return false;
    if (f.owner) {
      const [kind, id] = f.owner.split(':');
      if (Number(d[`${kind}_id`]) !== Number(id)) return false;
    }
    if (f.period && daysUntil(d.due_date) > Number(f.period)) return false;
    if (f.q && !d.title.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="row between" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Elenco</h1>
        <Link to="/nuova" className="btn primary">+ Nuova</Link>
      </div>
      <div className="filters">
        <label><span className="sr-only">Cerca</span><input type="search" placeholder="Cerca…" value={f.q} onChange={set('q')} /></label>
        <label><span className="sr-only">Stato</span>
          <select value={f.status} onChange={set('status')}>
            <option value="open">Da fare</option>
            <option value="overdue">Scadute</option>
            <option value="done">Fatte</option>
            <option value="archived">Archiviate</option>
            <option value="">Tutte</option>
          </select>
        </label>
        <label><span className="sr-only">Categoria</span>
          <select value={f.category} onChange={set('category')}>
            <option value="">Tutte le categorie</option>
            {Object.entries(config.categories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Periodo</span>
          <select value={f.period} onChange={set('period')}>
            {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        {ent && (ent.people.length + ent.vehicles.length + ent.properties.length > 1) && (
          <label><span className="sr-only">Di chi</span>
            <select value={f.owner} onChange={set('owner')}>
              <option value="">Tutti</option>
              {ent.people.length > 0 && <optgroup label="Persone">{ent.people.map((p) => <option key={p.id} value={`person:${p.id}`}>{p.name}</option>)}</optgroup>}
              {ent.vehicles.length > 0 && <optgroup label="Veicoli">{ent.vehicles.map((p) => <option key={p.id} value={`vehicle:${p.id}`}>{p.name}</option>)}</optgroup>}
              {ent.properties.length > 0 && <optgroup label="Immobili">{ent.properties.map((p) => <option key={p.id} value={`property:${p.id}`}>{p.name}</option>)}</optgroup>}
            </select>
          </label>
        )}
      </div>
      <p className="muted" role="status" style={{ fontSize: '0.9rem' }}>{items.length} scadenze</p>
      <DeadlineList items={items} ent={ent} empty="Nessuna scadenza con questi filtri." />
    </>
  );
}
