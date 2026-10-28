import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field } from '../ui.jsx';

/** Ricerca del comune su Nominatim (via API, solo Italia). */
export default function ComuneSearch({ value, onPick }) {
  const [q, setQ] = useState(value?.comune || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    // Nominatim chiede al massimo 1 richiesta al secondo.
    const t = setTimeout(() => {
      setBusy(true);
      api(`/geocode?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.results.filter((x) => x.comune)))
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 1000);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <>
      <Field label="Comune di residenza" hint={busy ? 'Cerco…' : value?.comune ? `${value.comune}${value.regione ? `, ${value.regione}` : ''}` : 'Scrivi e scegli dalla lista.'}>
        <input
          value={q}
          autoComplete="off"
          placeholder="Es. Treviso"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
        />
      </Field>
      {open && results.length > 0 && (
        <ul className="suggest">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(r);
                  setQ(r.comune);
                  setOpen(false);
                }}
              >
                <b>{r.comune}</b> <small className="muted">{r.regione}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
