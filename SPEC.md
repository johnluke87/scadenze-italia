# Scadenze Italia — specifica esaustiva

Stack: React (Vite) + PHP 8, MySQL, XAMPP. URL locale: `http://localhost/scadenze-italia/`

Timezone: `Europe/Rome`. Lingua: italiano.

---

## 1. Registrazione e account (tutti i passaggi)

### 1.1 Registrazione
1. Nome visibile, email, password (≥ 8 caratteri).
2. Consenso privacy (checkbox obbligatorio) + link alla pagina Privacy.
3. `POST /api/auth/register` crea utente `email_verified=0`, token di verifica (24 h), sessione **non** ancora piena per i reminder.
4. Email “Conferma l’indirizzo” con link `/?verifica=TOKEN`.
5. In locale l’email si salva in `api/data/outbox/` e il token compare anche in risposta `dev_verify_url` se `debug=true`.

### 1.2 Verifica email
1. `POST /api/auth/verify` con token.
2. Senza verifica: si entra, si inseriscono scadenze, **i reminder email restano spenti** (banner in app).

### 1.3 Accesso
`POST /api/auth/login` → token Bearer 30 giorni (tabella `sessions`). Cookie non usato: `localStorage`.

### 1.4 Password dimenticata
1. `POST /api/auth/forgot` (sempre 200, niente enumerazione email).
2. Token 60 minuti, un uso.
3. `POST /api/auth/reset` imposta password e chiude le altre sessioni.

### 1.5 Onboarding (dopo il primo login)
1. Comune di residenza (Nominatim, solo Italia) → `lat,lng,comune,provincia,regione`.
2. Quante persone in famiglia (1…12) — crea righe in `people` (tu sei “Io”).
3. Hai auto/moto? Sì → nome + targa opzionale.
4. Wizard “prime scadenze”: checkbox dei modelli più usati (CIE, patente, bollo, revisione, RCA, IMU, caldaia, tessera sanitaria). Per ciascuno chiede **la data che hai sul documento**.

### 1.6 Impostazioni
- Cambia nome, comune, password.
- Giorni di preavviso predefiniti: 30, 7, 1 (modificabili per scadenza).
- Esporta JSON delle scadenze.
- Cancella account (`DELETE /api/me`) e tutte le tabelle collegate.

### 1.7 Sicurezza
- Password `password_hash`.
- Query prepared.
- Rate limit: 8 login/ora per IP, 5 register/ora, 5 forgot/ora (`rate_limits`).
- Niente scansioni di documenti. Niente codice fiscale obbligatorio.

---

## 2. Dati utente (cosa si salva)

| Tabella | Contenuto |
|---|---|
| `users` | nome, email, hash, verifica, comune/provincia/regione, lat/lng, default_remind, created |
| `sessions` | token hash, scadenza |
| `email_tokens` | verify / reset |
| `people` | membri (nome, data nascita, parentela) |
| `vehicles` | nome, targa, tipo auto/moto/altro, prima immatricolazione (mese), kW opz., alimentazione, regione bollo |
| `properties` | nome, tipo (abitazione, secondo, box, affitto), comune |
| `deadlines` | titolo, `template_key`, categoria, `due_date`, ricorrenza, remind JSON, note, importo libero, stato, fk persona/veicolo/immobile |
| `reminder_log` | per non spammare lo stesso avviso |
| `rate_limits` | IP + azione |

Non si salvano: foto documenti, IBAN, SPID, dati sanitari clinici.

---

## 3. Modelli di scadenza (tutta Italia)

Ogni modello ha: chiave, categoria, campi, come si calcola la prossima data, giorni di preavviso, link ufficiale, nota legale breve.

### Documenti
| Chiave | Regola | Fonte |
|---|---|---|
| `cie` | Adulti 10 anni; 3–18 anni: 5; <3: 3. Scade **al compleanno**. Over 70: avviso che dal 2026 alcune CIE possono non scadere — l’utente conferma la data sul documento. | Ministero Interno / Polizia |
| `passaporto` | Stesse fasce d’età, scade **alla data stampata**. | Polizia di Stato |
| `tessera_sanitaria` | Data sul tesserino (di solito 6 anni). | Agenzia Entrate / ASL |
| `permesso_soggiorno` | Data sul permesso (utente). | |
| `cie_cartacea` | Promemoria: non valida per l’estero; in Italia fino alla data stampata. | |

### Guida
| Chiave | Regola | Fonte |
|---|---|---|
| `patente_b` | AM/A/B: 10 anni fino a 50, 5 fino a 70, 3 fino a 80, 2 oltre 80. Serve data di nascita + data di scadenza attuale (o data rinnovo). | MIT |
| `patente_c` | C/CE: 5 anni fino a 65, poi 2. | MIT |
| `patente_d` | D: 5 anni fino a 60, poi regole MIT (utente conferma data sul documento). | MIT |
| `patente_internazionale` | 1 o 3 anni da rilascio (scelta utente). | |

### Veicoli
| Chiave | Regola | Fonte |
|---|---|---|
| `revisione` | Prima: 4 anni da immatricolazione, **entro fine mese**; poi ogni 2 anni. | Codice della strada |
| `bollo` | Ogni 12 mesi; mese di scadenza = mese immatricolazione (o data ultimo bollo). **Importo: link ACI**, non lo stimiamo. | ACI / Regioni |
| `superbollo` | Promemoria se l’utente lo attiva (potenza). Link F24 ACI. | |
| `rca` | Data polizza, ricorrenza 12 mesi (o 6). | |
| `revisione_moto` | Come auto. | |

### Casa e tributi
| Chiave | Regola | Fonte |
|---|---|---|
| `imu_acconto` | 16 giugno ogni anno | L. 160/2019 |
| `imu_saldo` | 16 dicembre ogni anno | L. 160/2019 |
| `tari` | Date del proprio comune (utente le scrive; noi le ripetiamo ogni anno) | Comune / ARERA |
| `canone_rai` | 31 gennaio (addebito in bolletta: promemoria informativo) | |
| `caldaia_manutenzione` | Frequenza da libretto (12 o 24 mesi, scelta) | DPR 74/2013 + libretto |
| `caldaia_fumi` | Gas 10–100 kW: 4 anni; liquido/solido: 2 anni. Nota: la Regione può stringere. | DPR 74/2013 |
| `estintore` | 6 / 12 mesi revisione (scelta) | |
| `climatizzatore` | F-gas / controllo (utente) | |
| `assicurazione_casa` | Data polizza | |
| `affitto` | Rinnovo contratto / rinnovo registrazione | |
| `condominio` | Assemblea / saldo spese (utente) | |

### Fisco (cittadino / forfettario semplice)
| Chiave | Regola |
|---|---|
| `730` | 30 settembre (o data che l’utente corregge) |
| `cu` | Promemoria marzo |
| `iva_forfettario` | Saldo + acconto (date utente, default 30/6 e 30/11) |

### Salute e animali (solo date, niente cartelle cliniche)
Vaccino, visita, dentista, ricetta, lenti, donazione sangue, vaccino animale, richiamo.

### Altro
`custom`: titolo + data + ricorrenza nessuna/anno/mese.

**Festivi italiani** usati se una scadenza “salta” al lunedì successivo (IMU se 16 cade di domenica: l’app mostra la data di legge e avvisa “se cade di festa, di solito slitta al primo giorno feriale”).

---

## 4. Comportamento scadenze

- Stati: `aperta`, `in_scadenza` (entro 30 gg), `scaduta`, `fatta` (completa e genera la prossima se ricorrente).
- “Fatta oggi”: se ricorrente, nuova `due_date` secondo la regola del template.
- Filtri: categoria, persona, veicolo, periodo, stato.
- Vista Oggi: scadute, prossimi 7 giorni, prossimi 30.
- Vista mese: griglia.
- Duplica / archivia / elimina.
- Preavvisi per-scadenza (override dei default).

---

## 5. Reminder

- Canale v1: **email**.
- Cron: `GET /api/cron?token=` (cron-job.org / ogni ora).
- Per ogni scadenza aperta, per ogni giorno in `remind_days`, se `due_date - N = oggi` e non c’è log: accoda email.
- Email verifica obbligatoria, altrimenti skip + conteggio in risposta cron.
- Locale: file HTML in `api/data/outbox/`.
- Produzione: stesso `private/mailer.php` del sito se presente, senno SMTP in `config.local.php`.

---

## 6. Fonti dati (non inventate)

| Dato | Dove | API? |
|---|---|---|
| Comune, coordinate | Nominatim OSM, `countrycodes=it` | Sì, 1 req/s, User-Agent dell’app |
| Regole patente | MIT | No, tabelle in codice |
| Regole CIE/passaporto | Polizia / Interno | No, tabelle |
| IMU date | Legge | No, fisse |
| Bollo importo | ACI calcolobollo | **Link**, niente scraping |
| Revisione | Codice della strada | Calcolo locale |
| Festivi | Elenco nazionale + Pasqua | Calcolo locale |
| Caldaia | DPR 74/2013 | Testo in template |

Nessun dato “live” ministeriale è necessario per v1: le date stanno sul documento dell’utente.

---

## 7. Pagine UI

Landing, Entra, Registrati, Verifica, Password, Onboarding, Oggi, Elenco, Nuova, Dettaglio, Calendario, Famiglia, Veicoli, Immobili, Impostazioni, Privacy.

Mobile first. Accessibile. Reduced motion.

---

## 8. Fuori v1 (esplicito)
SPID, pagamento bollo, importo bollo, Telegram, app store, OCR della CIE, multi-valuta, inglese.
