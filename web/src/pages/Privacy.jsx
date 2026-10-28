export default function Privacy() {
  return (
    <main className="main narrow">
      <h1>Privacy</h1>
      <div className="card stack">
        <p><b>Cosa salviamo.</b> Nome, email, password (cifrata con hash), comune di residenza e le scadenze che inserisci: titolo, data, ricorrenza, note, e i nomi di persone, veicoli (targa facoltativa) e immobili a cui si riferiscono.</p>
        <p><b>Cosa non salviamo.</b> Foto o scansioni di documenti, codice fiscale, IBAN, credenziali SPID, dati sanitari clinici.</p>
        <p><b>Perché.</b> Solo per mostrarti le scadenze e mandarti i promemoria per email. I dati stanno sul server perché i promemoria partano anche a telefono spento.</p>
        <p><b>Servizi esterni.</b> La ricerca del comune usa Nominatim (OpenStreetMap): inviamo solo il testo che scrivi. I link ad ACI, MIT, Polizia di Stato e Agenzia delle Entrate aprono i siti ufficiali.</p>
        <p><b>I tuoi diritti.</b> Da Impostazioni puoi esportare tutte le scadenze in JSON e cancellare l’account: la cancellazione elimina subito tutti i dati collegati.</p>
        <p><b>Cookie e statistiche.</b> L’accesso usa un token salvato nel browser, non un cookie. Google Analytics si carica solo se lo accetti nel banner dei cookie, e puoi cambiare idea quando vuoi.</p>
        <p style={{ margin: 0 }}><b>Niente pubblicità</b> e nessuna vendita di dati. Il progetto si sostiene con donazioni volontarie.</p>
      </div>
    </main>
  );
}
