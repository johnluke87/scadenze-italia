import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Alert, Field, Loading, useLoad } from '../ui.jsx';
import { formatDate, relationLabel, MONTHS } from '../util.js';

const KINDS = {
  people: {
    title: 'Famiglia',
    one: 'persona',
    intro: 'Le persone a cui collegare documenti e visite. La data di nascita serve a calcolare la durata di CIE e patente.',
    empty: { name: '', relation: 'famiglia', birthdate: '' },
    describe: (p) => [relationLabel(p.relation), p.birthdate && `nata/o il ${formatDate(p.birthdate)}`].filter(Boolean).join(' · '),
    quick: [['cie', 'Carta d’identità'], ['patente_b', 'Patente'], ['tessera_sanitaria', 'Tessera sanitaria']],
    param: 'person',
  },
  vehicles: {
    title: 'Veicoli',
    one: 'veicolo',
    intro: 'Con il mese di prima immatricolazione calcoliamo revisione e bollo.',
    empty: { name: '', plate: '', kind: 'auto', first_reg: '' },
    describe: (v) => [v.plate, v.kind, v.first_reg && `immatricolata ${MONTHS[Number(v.first_reg.slice(5, 7)) - 1]} ${v.first_reg.slice(0, 4)}`].filter(Boolean).join(' · '),
    quick: [['revisione', 'Revisione'], ['bollo', 'Bollo'], ['rca', 'RCA']],
    param: 'vehicle',
  },
  properties: {
    title: 'Immobili',
    one: 'immobile',
    intro: 'Casa, seconda casa, box o appartamento in affitto: per IMU, TARI, caldaia e assicurazione.',
    empty: { name: '', kind: 'abitazione', comune: '' },
    describe: (p) => [{ abitazione: 'Abitazione principale', secondo: 'Seconda casa', box: 'Box / pertinenza', affitto: 'In affitto' }[p.kind], p.comune].filter(Boolean).join(' · '),
    quick: [['imu_acconto', 'IMU'], ['tari', 'TARI'], ['caldaia_manutenzione', 'Caldaia']],
    param: 'property',
  },
};

function FormFields({ table, v, set }) {
  if (table === 'people') {
    return (
      <div className="grid2">
        <Field label="Nome"><input required maxLength={80} value={v.name} onChange={set('name')} /></Field>
        <Field label="Parentela">
          <select value={v.relation} onChange={set('relation')} disabled={v.relation === 'io'}>
            {['io', 'partner', 'figlio', 'genitore', 'famiglia', 'altro'].map((r) => <option key={r} value={r} disabled={r === 'io' && v.relation !== 'io'}>{relationLabel(r)}</option>)}
          </select>
        </Field>
        <Field label="Data di nascita (facoltativa)"><input type="date" value={v.birthdate || ''} onChange={set('birthdate')} /></Field>
      </div>
    );
  }
  if (table === 'vehicles') {
    return (
      <div className="grid2">
        <Field label="Nome"><input required maxLength={80} value={v.name} onChange={set('name')} placeholder="Es. Panda" /></Field>
        <Field label="Tipo">
          <select value={v.kind} onChange={set('kind')}><option value="auto">Auto</option><option value="moto">Moto</option><option value="altro">Altro</option></select>
        </Field>
        <Field label="Targa (facoltativa)"><input maxLength={15} value={v.plate || ''} onChange={(e) => set('plate')({ target: { value: e.target.value.toUpperCase() } })} /></Field>
        <Field label="Prima immatricolazione"><input type="month" value={(v.first_reg || '').slice(0, 7)} onChange={set('first_reg')} /></Field>
      </div>
    );
  }
  return (
    <div className="grid2">
      <Field label="Nome"><input required maxLength={80} value={v.name} onChange={set('name')} placeholder="Es. Casa" /></Field>
      <Field label="Tipo">
        <select value={v.kind} onChange={set('kind')}>
          <option value="abitazione">Abitazione principale</option><option value="secondo">Seconda casa</option>
          <option value="box">Box / pertinenza</option><option value="affitto">In affitto</option>
        </select>
      </Field>
      <Field label="Comune"><input maxLength={120} value={v.comune || ''} onChange={set('comune')} /></Field>
    </div>
  );
}

function EntityPage({ table }) {
  const K = KINDS[table];
  const { data, error, loading, reload } = useLoad(() => api(`/${table}`), [table]);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setEdit((s) => ({ ...s, [k]: e.target.value }));

  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  const items = data[table];

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      if (edit.id) await api(`/${table}/${edit.id}`, { method: 'PUT', body: edit });
      else await api(`/${table}`, { method: 'POST', body: edit });
      setEdit(null);
      reload();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Eliminare “${item.name}”? Le scadenze collegate restano, senza collegamento.`)) return;
    try {
      await api(`/${table}/${item.id}`, { method: 'DELETE' });
      reload();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <>
      <div className="row between" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>{K.title}</h1>
        {!edit && <button type="button" className="btn primary" onClick={() => setEdit({ ...K.empty })}>+ Aggiungi</button>}
      </div>
      <p className="muted">{K.intro}</p>
      <Alert>{err}</Alert>

      {edit && (
        <form className="card" onSubmit={save} style={{ marginBottom: 16 }}>
          <h2>{edit.id ? `Modifica ${K.one}` : `Nuovo ${K.one}`}</h2>
          <FormFields table={table} v={edit} set={set} />
          <div className="row">
            <button className="btn primary">Salva</button>
            <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Annulla</button>
          </div>
        </form>
      )}

      {items.length === 0 && !edit ? <div className="empty">Ancora nessun {K.one}.</div> : (
        <div className="stack">
          {items.map((it) => (
            <div className="card" key={it.id}>
              <div className="row between">
                <div>
                  <h3 style={{ margin: 0 }}>{it.name}</h3>
                  <small className="muted">{K.describe(it)}</small>
                </div>
                <div className="row">
                  <button type="button" className="btn small" onClick={() => setEdit({ ...it, birthdate: it.birthdate || '', first_reg: it.first_reg ? it.first_reg.slice(0, 7) : '' })}>Modifica</button>
                  {!(table === 'people' && it.relation === 'io') && <button type="button" className="btn small danger" onClick={() => remove(it)}>Elimina</button>}
                </div>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                {K.quick.map(([k, l]) => (
                  <Link key={k} className="btn small ghost" to={`/nuova?t=${k}&${K.param}=${it.id}`}>+ {l}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export const People = () => <EntityPage table="people" />;
export const Vehicles = () => <EntityPage table="vehicles" />;
export const Properties = () => <EntityPage table="properties" />;
