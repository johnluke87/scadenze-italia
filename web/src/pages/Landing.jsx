import { Link } from 'react-router-dom';

const FEATURES = [
  ['Regole italiane, non campi vuoti', 'La revisione cade a fine mese, la CIE scade al compleanno, l’IMU il 16 giugno e il 16 dicembre. I modelli lo sanno già.'],
  ['Tutta la famiglia', '“La patente di Luca”, “il bollo della Panda”, “la caldaia della casa al mare”: persone, veicoli e immobili in un solo account.'],
  ['Promemoria per email', 'Ti scriviamo con l’anticipo giusto per ogni scadenza: 6 mesi per la carta d’identità, una settimana per il bollo.'],
];

export default function Landing() {
  return (
    <main className="main">
      <section className="hero">
        <h1>Dimmi che documento o che targa hai. Ti dico quando scade.</h1>
        <p>
          Carta d’identità, patente, bollo, revisione, RCA, IMU, caldaia, tessera sanitaria: le scadenze vere della vita
          in Italia, calcolate e ricordate per tempo. Gratis, sul web, senza SPID.
        </p>
        <div className="row" style={{ marginTop: 20 }}>
          <Link to="/registrati" className="btn primary">Inizia gratis</Link>
          <Link to="/entra" className="btn">Ho già un account</Link>
        </div>
      </section>
      <section className="features">
        {FEATURES.map(([t, d]) => (
          <div className="card" key={t}>
            <h3>{t}</h3>
            <p className="muted" style={{ margin: 0 }}>{d}</p>
          </div>
        ))}
      </section>
      <section className="section card">
        <h2>Cosa non facciamo</h2>
        <p className="muted" style={{ margin: 0 }}>
          Non salviamo foto dei documenti, IBAN, SPID o dati clinici: solo le date. Non calcoliamo l’importo del bollo
          (lo fa solo ACI, ti diamo il link). Non vendiamo dati.
        </p>
      </section>
    </main>
  );
}
