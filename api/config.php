<?php
return [
    'db' => [
        'host' => '127.0.0.1',
        'name' => 'scadenze_italia',
        'user' => 'root',
        'pass' => '',
        'charset' => 'utf8mb4',
    ],
    'debug' => null, // null = solo in locale
    'token_days' => 30,
    'cron_token' => 'scadenze-italia-cron-locale', // sul sito: in private/scadenze-italia.php
    'app_url' => '', // vuoto = dalla richiesta
    'mail_from' => 'scadenze-italia@localhost',
    'donate_url' => 'https://ko-fi.com/johnluke87',
];
