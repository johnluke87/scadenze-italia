import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Alert, Loading, useLoad } from '../ui.jsx';
import { MONTHS, toIso, todayIso } from '../util.js';

const HEAD = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

/** Festivi nazionali calcolati lato client, anche per anni diversi dal corrente. */
function holidays(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  const easterMon = toIso(new Date(year, month - 1, day + 1));
  const fixed = { '01-01': 'Capodanno', '01-06': 'Epifania', '04-25': 'Liberazione', '05-01': 'Festa del lavoro', '06-02': 'Festa della Repubblica', '08-15': 'Ferragosto', '11-01': 'Ognissanti', '12-08': 'Immacolata', '12-25': 'Natale', '12-26': 'Santo Stefano' };
  const out = { [easterMon]: 'Lunedì dell’Angelo' };
  for (const [md, n] of Object.entries(fixed)) out[`${year}-${md}`] = n;
  return out;
}

export default function Calendar() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { data, error, loading } = useLoad(() => api('/deadlines'));

  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;

  const first = new Date(ym.y, ym.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(ym.y, ym.m, 1 - offset);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const weeks = cells[35].getMonth() !== ym.m ? cells.slice(0, 35) : cells;
  const hol = { ...holidays(ym.y - 1), ...holidays(ym.y), ...holidays(ym.y + 1) };
  const byDay = {};
  for (const d of data.deadlines) {
    if (d.status === 'archived') continue;
    (byDay[d.due_date] ||= []).push(d);
  }
  const today = todayIso();
  const move = (n) => setYm(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const monthItems = Object.entries(byDay).filter(([k]) => k.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}`)).flatMap(([, v]) => v);

  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0, textTransform: 'capitalize' }}>{MONTHS[ym.m]} {ym.y}</h1>
        <div className="row">
          <button type="button" className="btn small" onClick={() => move(-1)} aria-label="Mese precedente">‹</button>
          <button type="button" className="btn small" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Oggi</button>
          <button type="button" className="btn small" onClick={() => move(1)} aria-label="Mese successivo">›</button>
        </div>
      </div>
      <div className="cal" role="grid" aria-label="Calendario del mese">
        {HEAD.map((h) => <div key={h} className="cal-h" role="columnheader">{h}</div>)}
        {weeks.map((d) => {
          const iso = toIso(d);
          const items = byDay[iso] || [];
          const cls = ['cal-d', d.getMonth() !== ym.m && 'out', iso === today && 'today', (hol[iso] || d.getDay() === 0) && 'holiday'].filter(Boolean).join(' ');
          return (
            <div key={iso} className={cls} role="gridcell" title={hol[iso] || undefined}>
              <span className="n">{d.getDate()}</span>
              {items.map((x) => <Link key={x.id} to={`/scadenza/${x.id}`} className={x.state} title={x.title}>{x.title}</Link>)}
            </div>
          );
        })}
      </div>
      <section className="section">
        <h2>In questo mese</h2>
        {monthItems.length === 0 ? <div className="empty">Nessuna scadenza.</div> : (
          <ul className="dl-list">
            {monthItems.map((x) => (
              <li key={x.id}>
                <Link to={`/scadenza/${x.id}`} className={`dl-item ${x.state}`}>
                  <div className="dl-date"><b>{Number(x.due_date.slice(8))}</b><span>{MONTHS[ym.m].slice(0, 3)}</span></div>
                  <div className="dl-body"><div className="dl-title">{x.title}</div></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
