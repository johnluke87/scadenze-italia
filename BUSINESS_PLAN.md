# Scadenze Italia — business plan

## Prodotto
Agenda delle scadenze **vere della vita in Italia**: documenti, auto, casa, fisco, salute, animali. Non è un blocco note: ogni tipo ha regole, campi, link ufficiali e la data successiva calcolata.

## Problema
Una famiglia italiana ha 15–40 scadenze sparse (CIE, patente, bollo, revisione, RCA, IMU, caldaia, tessera sanitaria…). Le perde, paga more, o si accorge tardi. ACI Memo esiste ma chiede SPID e non guida il calcolo. Un calendario generico non sa che la revisione cade **a fine mese** né che la CIE scade **al compleanno**.

## Per chi
- Famiglie e coppie (più persone, più auto, più immobili)
- Chi ha un’auto o una moto
- Proprietari / inquilini (IMU, TARI, caldaia)
- Chi aiuta genitori anziani
- Partite IVA in forfettario (scadenze fisse, non commercialista)

## Promessa
“Dimmi che documento o che targa hai: ti dico **quando scade**, **quando occupartene**, e te lo ricordo per email.”

## Non è
- Deadlines (promemoria generici Telegram)
- My Transportation (storico spese auto)
- Un commercialista, un CAF, PagoPA o ACI Space
- Un archivio di scansioni dei documenti (solo date e metadati, niente foto di CIE/patente)

## Come si vince
1. **Modelli Italia**, non campi vuoti.
2. **Famiglia** in un account: “la patente di Luca”, “il bollo della Panda”.
3. **Tutta Italia**: regole nazionali + regione/comune dove serve (bollo, IMU del comune).
4. Gratis, sul web, senza app store e senza SPID obbligatorio.

## Modello
- Gratis, donazione Ko-fi come le altre app.
- Account proprio (email + password), non il portale privato `/apps/`.
- Dati dell’utente sul server (servono per i reminder anche a telefono spento).
- Nessuna vendita di dati.

## Metriche
- Registrati che completano il wizard (almeno 1 scadenza)
- Scadenze attive / utente
- Email di avviso aperte (più avanti)
- Ritorno a 7 e 30 giorni

## Rischi
- Regole che cambiano (CIE over 70, DPR caldaie): i testi stanno in `api/lib/templates.php` e si aggiornano.
- Bollo: importo esatto solo da ACI (noi calcoliamo la **data**, non i soldi, e linkiamo ACI).
- Email in locale non partono: finiscono in `api/data/outbox/`.
