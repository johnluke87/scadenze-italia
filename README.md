# Scadenze Italia

Le scadenze vere della vita in Italia (documenti, auto, casa, fisco) con promemoria per email.
Online: https://www.gianlucadario.com/apps/scadenze-italia/

Specifica: [SPEC.md](SPEC.md) · Business plan: [BUSINESS_PLAN.md](BUSINESS_PLAN.md)

## Struttura
- `api/` — backend PHP 8. Le tabelle (prefisso `scad_`) si creano da sole alla prima richiesta.
- `web/` — React + Vite. `npm run build` produce `web/dist` (percorsi relativi).

Questa cartella è `apps/scadenze-italia/sorgenti` del sito: `_deploy\carica.bat` compila `web/`,
copia `web/dist` e `api/` in `apps/scadenze-italia` (mai `config.php`, mai `data/`) e carica via FTP.

## Configurazione
- `api/config.php`: valori di base (DB locale di riserva, giorni del token...).
- Sul sito: database in `/private/db.php`, sezione `scadenze` (`local` / `prod`); segreti
  (`cron_token`) in `/private/scadenze-italia.php`; email con `/private/mailer.php`.
- In locale le email non partono: finiscono in `api/data/outbox/`.

## Sviluppo
```bash
cd web
npm install
npm run dev     # http://localhost:5173/ (API dalla copia in XAMPP)
npm run build
```

## Promemoria
Un job su cron-job.org ogni ora: `GET apps/scadenze-italia/api/cron?token=CRON_TOKEN`.
