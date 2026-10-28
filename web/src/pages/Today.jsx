import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { DeadlineList, Loading, Alert, useEntities, useLoad } from '../ui.jsx';
import { daysUntil, formatDate, todayIso } from '../util.js';

export default function Today() {
  const { data, error, loading } = useLoad(() => api('/deadlines'));
  const { data: ent } = useEntities();

  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;

  const open = data.deadlines.filter((d) => d.status === 'open');
  const overdue = open.filter((d) => d.state === 'overdue');
  const week = open.filter((d) => d.state === 'week');
  const month = open.filter((d) => d.state === 'soon');
  const later = open.filter((d) => d.state === 'open' && daysUntil(d.due_date) <= 120).slice(0, 5);

  return (
    <>
      <div className="row between" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Oggi</h1>
          <span className="muted">{formatDate(todayIso(), { weekday: true })}</span>
        </div>
        <Link to="/nuova" className="btn primary">+ Nuova</Link>
      </div>

      {open.length === 0 ? (
        <div className="empty">
          <p>Non hai ancora scadenze.</p>
          <Link to="/nuova" className="btn primary">Aggiungi la prima</Link>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat overdue"><b>{overdue.length}</b><span>Scadute</span></div>
            <div className="stat week"><b>{week.length}</b><span>Entro 7 giorni</span></div>
            <div className="stat"><b>{month.length}</b><span>Entro 30 giorni</span></div>
          </div>

          {overdue.length > 0 && (
            <section className="section">
              <div className="section-head"><h2>Scadute</h2></div>
              <DeadlineList items={overdue} ent={ent} />
            </section>
          )}
          <section className="section">
            <div className="section-head"><h2>Prossimi 7 giorni</h2></div>
            <DeadlineList items={week} ent={ent} empty="Niente questa settimana." />
          </section>
          <section className="section">
            <div className="section-head"><h2>Prossimi 30 giorni</h2></div>
            <DeadlineList items={month} ent={ent} empty="Niente nel prossimo mese." />
          </section>
          {later.length > 0 && (
            <section className="section">
              <div className="section-head"><h2>Più avanti</h2><Link to="/elenco">Vedi tutte</Link></div>
              <DeadlineList items={later} ent={ent} />
            </section>
          )}
        </>
      )}
    </>
  );
}
