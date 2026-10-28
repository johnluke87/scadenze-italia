<?php
declare(strict_types=1);

function templates(): array {
    return [
        'cie' => [
            'title' => 'Carta d’identità elettronica', 'category' => 'documenti',
            'hint' => 'Adulti 10 anni; 5 anni dai 3 ai 18; 3 anni sotto i 3. Scade al compleanno. Usa la data stampata sul documento.',
            'fields' => ['due', 'person'], 'recur' => 'once',
            'link' => 'https://www.cartaidentita.interno.gov.it/', 'remind' => '180,60,14',
        ],
        'passaporto' => [
            'title' => 'Passaporto', 'category' => 'documenti',
            'hint' => 'Stesse fasce della CIE, ma scade alla data stampata. Prenota in anticipo sull’Agenda passaporti.',
            'fields' => ['due', 'person'], 'recur' => 'once',
            'link' => 'https://www.passaportonline.poliziadistato.it/', 'remind' => '240,90,30',
        ],
        'tessera_sanitaria' => [
            'title' => 'Tessera sanitaria', 'category' => 'documenti',
            'hint' => 'Di solito 6 anni. La data è sul tesserino.',
            'fields' => ['due', 'person'], 'recur' => 'once',
            'link' => 'https://www.agenziaentrate.gov.it/', 'remind' => '60,14',
        ],
        'permesso_soggiorno' => [
            'title' => 'Permesso di soggiorno', 'category' => 'documenti',
            'hint' => 'Inserisci la scadenza stampata. Il rinnovo va chiesto in anticipo.',
            'fields' => ['due', 'person'], 'recur' => 'once', 'remind' => '90,30,14',
        ],
        'patente_b' => [
            'title' => 'Patente AM / A / B', 'category' => 'guida',
            'hint' => '10 anni fino a 50, 5 fino a 70, 3 fino a 80, 2 oltre gli 80 (MIT). La scadenza è sul documento (punto 4b).',
            'fields' => ['due', 'person'], 'recur' => 'once',
            'link' => 'https://mit.gov.it/rinnovo-patente', 'remind' => '120,30,7',
        ],
        'patente_c' => [
            'title' => 'Patente C / CE', 'category' => 'guida',
            'hint' => '5 anni fino a 65, poi 2 anni. Conferma sempre la data sul documento.',
            'fields' => ['due', 'person'], 'recur' => 'once',
            'link' => 'https://mit.gov.it/rinnovo-patente', 'remind' => '120,30,7',
        ],
        'patente_d' => [
            'title' => 'Patente D', 'category' => 'guida',
            'hint' => 'Regole MIT più strette. Usa la data sul documento.',
            'fields' => ['due', 'person'], 'recur' => 'once', 'remind' => '120,30,7',
        ],
        'patente_internazionale' => [
            'title' => 'Patente internazionale', 'category' => 'guida',
            'hint' => '1 o 3 anni dal rilascio, come sul permesso.',
            'fields' => ['due', 'person'], 'recur' => 'once', 'remind' => '60,14',
        ],
        'revisione' => [
            'title' => 'Revisione veicolo', 'category' => 'veicoli',
            'hint' => 'Prima dopo 4 anni dall’immatricolazione, poi ogni 2, entro la fine del mese.',
            'fields' => ['due', 'vehicle'], 'recur' => 'years:2',
            'link' => 'https://www.ilportaledellautomobilista.it/', 'remind' => '60,14,3',
        ],
        'bollo' => [
            'title' => 'Bollo auto / moto', 'category' => 'veicoli',
            'hint' => 'Ogni 12 mesi. L’importo esatto lo calcola solo ACI: da qui apri il calcolatore ufficiale.',
            'fields' => ['due', 'vehicle'], 'recur' => 'years:1',
            'link' => 'https://online.aci.it/acinet/calcolobollo/', 'remind' => '30,7,1',
        ],
        'superbollo' => [
            'title' => 'Superbollo', 'category' => 'veicoli',
            'hint' => 'Se dovuto, si paga con F24. Promemoria, non calcolo.',
            'fields' => ['due', 'vehicle'], 'recur' => 'years:1',
            'link' => 'https://www.aci.it/servizi/calcola-il-bollo-auto-ed-il-superbollo/', 'remind' => '30,7',
        ],
        'rca' => [
            'title' => 'Assicurazione RCA', 'category' => 'veicoli',
            'hint' => 'Data di scadenza della polizza. Ricorrenza 12 mesi (o 6 se lo imposti).',
            'fields' => ['due', 'vehicle'], 'recur' => 'years:1', 'remind' => '21,7,1',
        ],
        'imu_acconto' => [
            'title' => 'IMU — acconto', 'category' => 'casa',
            'hint' => '16 giugno ogni anno (L. 160/2019). Se cade di festa slitta al primo feriale.',
            'fields' => ['property'], 'recur' => 'yearly-fixed:06-16', 'remind' => '21,7,1',
        ],
        'imu_saldo' => [
            'title' => 'IMU — saldo', 'category' => 'casa',
            'hint' => '16 dicembre ogni anno.',
            'fields' => ['property'], 'recur' => 'yearly-fixed:12-16', 'remind' => '21,7,1',
        ],
        'tari' => [
            'title' => 'TARI', 'category' => 'casa',
            'hint' => 'Le rate le decide il Comune. Metti la prossima data del tuo avviso.',
            'fields' => ['due', 'property'], 'recur' => 'years:1', 'remind' => '14,3',
        ],
        'canone_rai' => [
            'title' => 'Canone RAI', 'category' => 'casa',
            'hint' => 'Di solito addebitato in bolletta. Promemoria informativo a fine gennaio.',
            'fields' => [], 'recur' => 'yearly-fixed:01-31', 'remind' => '14',
        ],
        'caldaia_manutenzione' => [
            'title' => 'Caldaia — manutenzione', 'category' => 'casa',
            'hint' => 'Frequenza del libretto (spesso 12 mesi). Non è la prova fumi.',
            'fields' => ['due', 'property'], 'recur' => 'years:1', 'remind' => '30,7',
        ],
        'caldaia_fumi' => [
            'title' => 'Caldaia — prova fumi', 'category' => 'casa',
            'hint' => 'Gas 10–100 kW: ogni 4 anni; liquido/solido: 2 anni (DPR 74/2013). La Regione può stringere.',
            'fields' => ['due', 'property'], 'recur' => 'years:4', 'remind' => '60,14',
        ],
        'estintore' => [
            'title' => 'Estintore', 'category' => 'casa',
            'hint' => 'Controllo periodico (6 o 12 mesi, come da cartellino).',
            'fields' => ['due', 'property'], 'recur' => 'years:1', 'remind' => '21',
        ],
        'assicurazione_casa' => [
            'title' => 'Assicurazione casa', 'category' => 'casa',
            'fields' => ['due', 'property'], 'recur' => 'years:1', 'remind' => '21,7',
        ],
        'affitto' => [
            'title' => 'Contratto / registrazione affitto', 'category' => 'casa',
            'fields' => ['due', 'property'], 'recur' => 'once', 'remind' => '60,14',
        ],
        '730' => [
            'title' => 'Dichiarazione 730', 'category' => 'fisco',
            'hint' => 'Data di legge variabile ogni anno: controlla e correggi. Default 30 settembre.',
            'fields' => [], 'recur' => 'yearly-fixed:09-30', 'remind' => '30,7',
        ],
        'iva_forfettario' => [
            'title' => 'Imposte forfettario', 'category' => 'fisco',
            'hint' => 'Saldo e acconti: inserisci la prossima data del tuo F24.',
            'fields' => ['due'], 'recur' => 'years:1', 'remind' => '21,7',
        ],
        'visita' => [
            'title' => 'Visita / controllo salute', 'category' => 'salute',
            'fields' => ['due', 'person'], 'recur' => 'once', 'remind' => '7,1',
        ],
        'vaccino' => [
            'title' => 'Vaccino / richiamo', 'category' => 'salute',
            'fields' => ['due', 'person'], 'recur' => 'once', 'remind' => '14,1',
        ],
        'dentista' => [
            'title' => 'Dentista', 'category' => 'salute',
            'fields' => ['due', 'person'], 'recur' => 'once', 'remind' => '7,1',
        ],
        'vaccino_animale' => [
            'title' => 'Vaccino animale', 'category' => 'animali',
            'fields' => ['due'], 'recur' => 'years:1', 'remind' => '21,3',
        ],
        'custom' => [
            'title' => 'Altra scadenza', 'category' => 'altro',
            'hint' => 'Titolo e data li scegli tu.',
            'fields' => ['due', 'title'], 'recur' => 'none', 'remind' => '7,1',
        ],
    ];
}

function template(string $key): ?array {
    return templates()[$key] ?? null;
}

function categories(): array {
    return [
        'documenti' => 'Documenti',
        'guida' => 'Guida',
        'veicoli' => 'Veicoli',
        'casa' => 'Casa e tributi',
        'fisco' => 'Fisco',
        'salute' => 'Salute',
        'animali' => 'Animali',
        'altro' => 'Altro',
    ];
}

function suggest_due(string $key): ?string {
    $tz = new DateTimeZone('Europe/Rome');
    $y = (int) date('Y');
    if ($key === 'imu_acconto') {
        $d = new DateTimeImmutable("$y-06-16", $tz);
        if ($d < new DateTimeImmutable('today', $tz)) {
            $d = $d->modify('+1 year');
        }
        return $d->format('Y-m-d');
    }
    if ($key === 'imu_saldo') {
        $d = new DateTimeImmutable("$y-12-16", $tz);
        if ($d < new DateTimeImmutable('today', $tz)) {
            $d = $d->modify('+1 year');
        }
        return $d->format('Y-m-d');
    }
    if ($key === 'canone_rai') {
        $d = new DateTimeImmutable("$y-01-31", $tz);
        if ($d < new DateTimeImmutable('today', $tz)) {
            $d = $d->modify('+1 year');
        }
        return $d->format('Y-m-d');
    }
    if ($key === '730') {
        $d = new DateTimeImmutable("$y-09-30", $tz);
        if ($d < new DateTimeImmutable('today', $tz)) {
            $d = $d->modify('+1 year');
        }
        return $d->format('Y-m-d');
    }
    return null;
}

function next_due_after(string $recur, string $due, DateTimeImmutable $from): ?string {
    if ($recur === 'none' || $recur === 'once') {
        return null;
    }
    $d = new DateTimeImmutable($due, new DateTimeZone('Europe/Rome'));
    if (str_starts_with($recur, 'years:')) {
        $n = (int) substr($recur, 6);
        $next = $d->modify("+$n years");
        while ($next <= $from) {
            $next = $next->modify("+$n years");
        }
        return $next->format('Y-m-d');
    }
    if (str_starts_with($recur, 'yearly-fixed:')) {
        $md = substr($recur, 13);
        $year = (int) $from->format('Y');
        $next = DateTimeImmutable::createFromFormat('Y-m-d', $year . '-' . $md, new DateTimeZone('Europe/Rome'));
        if (!$next || $next <= $from) {
            $next = DateTimeImmutable::createFromFormat('Y-m-d', ($year + 1) . '-' . $md, new DateTimeZone('Europe/Rome'));
        }
        return $next ? $next->format('Y-m-d') : null;
    }
    if (preg_match('/^months:(\d+)$/', $recur, $m)) {
        $n = max(1, (int) $m[1]);
        $next = $d->modify("+$n months");
        while ($next <= $from) {
            $next = $next->modify("+$n months");
        }
        return $next->format('Y-m-d');
    }
    return null;
}

function valid_recur(string $recur): bool {
    return in_array($recur, ['none', 'once', 'months:1', 'months:6'], true)
        || preg_match('/^years:[1-9]$/', $recur) === 1
        || preg_match('/^yearly-fixed:(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/', $recur) === 1;
}

function deadline_state(string $due, string $status): string {
    if ($status === 'done' || $status === 'archived') {
        return $status;
    }
    $today = new DateTimeImmutable('today', new DateTimeZone('Europe/Rome'));
    $d = new DateTimeImmutable($due, new DateTimeZone('Europe/Rome'));
    if ($d < $today) {
        return 'overdue';
    }
    $diff = (int) $today->diff($d)->format('%a');
    if ($diff <= 7) {
        return 'week';
    }
    if ($diff <= 30) {
        return 'soon';
    }
    return 'open';
}
