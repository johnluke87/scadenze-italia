<?php
declare(strict_types=1);

date_default_timezone_set('Europe/Rome');

function is_local(): bool {
    return !isset($_SERVER['SERVER_ADDR']) || in_array($_SERVER['SERVER_ADDR'], ['127.0.0.1', '::1', 'localhost'], true);
}

/** Un file della cartella private/ del sito (www.gianlucadario.com), cercato nelle cartelle superiori. */
function site_private(string $file): ?string {
    for ($dir = __DIR__, $i = 0; $i < 7; $i++, $dir = dirname($dir)) {
        if (is_file($dir . '/private/' . $file)) {
            return $dir . '/private/' . $file;
        }
    }
    return null;
}

function cfg(): array {
    static $c;
    if (!$c) {
        $c = require dirname(__DIR__) . '/config.php';
        // sul sito: segreti (cron_token...) in private/scadenze-italia.php; in sviluppo: config.local.php
        // il bot Telegram (token e nome) in private/scadenze-italia-telegram.php
        foreach ([site_private('scadenze-italia.php'), site_private('scadenze-italia-telegram.php'), dirname(__DIR__) . '/config.local.php'] as $file) {
            if ($file && is_file($file)) {
                $extra = require $file;
                if (is_array($extra)) {
                    $c = array_replace_recursive($c, $extra);
                }
            }
        }
        $c['debug'] ??= is_local();
    }
    return $c;
}

/** Indirizzo dell'app (per i link nelle email): da config, altrimenti dalla richiesta. */
function app_url(): string {
    if (!empty(cfg()['app_url'])) {
        return rtrim((string) cfg()['app_url'], '/');
    }
    $https = ($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off';
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php', 2)), '/');
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $base;
}

function db(): PDO {
    static $pdo;
    if ($pdo) {
        return $pdo;
    }
    $c = cfg()['db'];
    // sul sito: credenziali in /private/db.php (sezione "scadenze"), DB condiviso con altre app: tabelle scad_
    if ($file = site_private('db.php')) {
        $all = require $file;
        if (isset($all['scadenze'])) {
            $p = $all['scadenze'][is_local() ? 'local' : 'prod'];
            $c = ['host' => $p['host'], 'name' => $p['db'], 'user' => $p['user'], 'pass' => $p['password'], 'charset' => 'utf8mb4', 'create' => false];
        }
    }
    $name = preg_replace('/[^a-z0-9_]/i', '', $c['name']);
    if ($c['create'] ?? true) {
        $root = new PDO("mysql:host={$c['host']};charset={$c['charset']}", $c['user'], $c['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $root->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }
    $pdo = new PDO(
        "mysql:host={$c['host']};dbname={$name};charset={$c['charset']}",
        $c['user'],
        $c['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    schema_install($pdo);
    return $pdo;
}

function schema_install(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email_verified TINYINT(1) NOT NULL DEFAULT 0,
        comune VARCHAR(120) NULL,
        provincia VARCHAR(4) NULL,
        regione VARCHAR(80) NULL,
        lat DECIMAL(9,6) NULL,
        lng DECIMAL(9,6) NULL,
        remind_days VARCHAR(40) NOT NULL DEFAULT '30,7,1',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_sessions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id), INDEX (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_email_tokens (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        purpose VARCHAR(20) NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_people (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        name VARCHAR(80) NOT NULL,
        birthdate DATE NULL,
        relation VARCHAR(40) NOT NULL DEFAULT 'io',
        INDEX (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_vehicles (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        name VARCHAR(80) NOT NULL,
        plate VARCHAR(15) NULL,
        kind VARCHAR(20) NOT NULL DEFAULT 'auto',
        first_reg DATE NULL,
        region VARCHAR(80) NULL,
        INDEX (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_properties (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        name VARCHAR(80) NOT NULL,
        kind VARCHAR(30) NOT NULL DEFAULT 'abitazione',
        comune VARCHAR(120) NULL,
        INDEX (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_deadlines (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        person_id INT UNSIGNED NULL,
        vehicle_id INT UNSIGNED NULL,
        property_id INT UNSIGNED NULL,
        template_key VARCHAR(40) NOT NULL,
        title VARCHAR(160) NOT NULL,
        category VARCHAR(40) NOT NULL,
        due_date DATE NOT NULL,
        recur VARCHAR(20) NOT NULL DEFAULT 'none',
        remind_days VARCHAR(40) NULL,
        notes TEXT NULL,
        amount VARCHAR(40) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        done_at DATE NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id), INDEX (due_date), INDEX (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_reminder_log (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        deadline_id INT UNSIGNED NOT NULL,
        remind_on DATE NOT NULL,
        sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_dl (deadline_id, remind_on)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scad_rate_limits (
        ip VARCHAR(45) NOT NULL,
        action VARCHAR(40) NOT NULL,
        window_start DATETIME NOT NULL,
        hits INT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (ip, action, window_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // colonne aggiunte dopo la prima versione (le tabelle online esistono già)
    $have = $pdo->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scad_users'")->fetchAll(PDO::FETCH_COLUMN);
    $add = [
        'telegram_chat_id' => 'VARCHAR(32) NULL',
        'notify_email' => 'TINYINT(1) NOT NULL DEFAULT 1',
        'notify_telegram' => 'TINYINT(1) NOT NULL DEFAULT 1',
    ];
    foreach ($add as $col => $def) {
        if (!in_array($col, $have, true)) {
            $pdo->exec("ALTER TABLE scad_users ADD COLUMN $col $def");
        }
    }
}

function cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && preg_match('#^http://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Content-Type: application/json; charset=utf-8');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_body(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function out(mixed $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): never {
    out(['error' => $msg], $code);
}

function client_ip(): string {
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 45);
}

function rate_limit(string $action, int $max): void {
    $ip = client_ip();
    $hour = (new DateTimeImmutable('now'))->format('Y-m-d H:00:00');
    $st = db()->prepare('INSERT INTO scad_rate_limits (ip, action, window_start, hits) VALUES (?,?,?,1)
        ON DUPLICATE KEY UPDATE hits = hits + 1');
    $st->execute([$ip, $action, $hour]);
    $q = db()->prepare('SELECT hits FROM scad_rate_limits WHERE ip=? AND action=? AND window_start=?');
    $q->execute([$ip, $action, $hour]);
    $hits = (int) $q->fetchColumn();
    if ($hits > $max) {
        fail('Troppe richieste, riprova tra un’ora.', 429);
    }
}

function route_path(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    if ($base !== '' && strpos($path, $base) === 0) {
        $path = substr($path, strlen($base));
    }
    $path = $path ?: '/';
    return rtrim($path, '/') ?: '/';
}

function bearer(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        $h = (string) (array_change_key_case(getallheaders())['authorization'] ?? '');
    }
    if (preg_match('/Bearer\s+(.+)/i', $h, $m)) {
        return trim($m[1]);
    }
    return null;
}

function public_user(array $u): array {
    return [
        'id' => (int) $u['id'],
        'name' => $u['name'],
        'email' => $u['email'],
        'email_verified' => (bool) $u['email_verified'],
        'comune' => $u['comune'],
        'provincia' => $u['provincia'],
        'regione' => $u['regione'],
        'lat' => $u['lat'] !== null ? (float) $u['lat'] : null,
        'lng' => $u['lng'] !== null ? (float) $u['lng'] : null,
        'remind_days' => $u['remind_days'],
        'notify_email' => (bool) ($u['notify_email'] ?? true),
        'notify_telegram' => (bool) ($u['notify_telegram'] ?? true),
        'telegram_linked' => !empty($u['telegram_chat_id']),
    ];
}

function issue_token(int $userId): string {
    $raw = bin2hex(random_bytes(32));
    $hash = hash('sha256', $raw);
    $days = (int) cfg()['token_days'];
    $exp = (new DateTimeImmutable("+$days days"))->format('Y-m-d H:i:s');
    db()->prepare('INSERT INTO scad_sessions (user_id, token_hash, expires_at) VALUES (?,?,?)')->execute([$userId, $hash, $exp]);
    return $raw;
}

function require_user(): array {
    $raw = bearer();
    if (!$raw) {
        fail('Devi entrare.', 401);
    }
    $st = db()->prepare('SELECT u.* FROM scad_sessions s JOIN scad_users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > NOW()');
    $st->execute([hash('sha256', $raw)]);
    $u = $st->fetch();
    if (!$u) {
        fail('Sessione scaduta. Entra di nuovo.', 401);
    }
    return $u;
}

function owned_id(string $table, mixed $id, int $userId): ?int {
    $id = (int) ($id ?? 0);
    if ($id <= 0) {
        return null;
    }
    $st = db()->prepare("SELECT id FROM scad_$table WHERE id=? AND user_id=?");
    $st->execute([$id, $userId]);
    return $st->fetchColumn() ? $id : null;
}

function valid_date(mixed $d): bool {
    if (!is_string($d) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
        return false;
    }
    [$y, $m, $day] = array_map('intval', explode('-', $d));
    return checkdate($m, $day, $y);
}

function valid_remind(mixed $r): bool {
    return is_string($r) && preg_match('/^\s*\d{1,3}(\s*,\s*\d{1,3})*\s*$/', $r) === 1;
}

function issue_email_token(int $userId, string $purpose, string $ttl): string {
    $raw = bin2hex(random_bytes(24));
    $exp = (new DateTimeImmutable($ttl))->format('Y-m-d H:i:s');
    db()->prepare('INSERT INTO scad_email_tokens (user_id, purpose, token_hash, expires_at) VALUES (?,?,?,?)')
        ->execute([$userId, $purpose, hash('sha256', $raw), $exp]);
    return $raw;
}

function app_mail(string $to, string $subject, string $html): void {
    // sul sito: la casella SMTP comune (private/mailer.php); in locale le email finiscono in data/outbox
    if (!is_local() && ($mailer = site_private('mailer.php'))) {
        require_once $mailer;
        site_send_mail($to, $subject, $html);
        return;
    }
    $dir = dirname(__DIR__) . '/data/outbox';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $name = date('Ymd-His') . '-' . preg_replace('/[^a-z0-9]+/i', '-', $to) . '.html';
    $body = "<p><strong>A:</strong> " . htmlspecialchars($to) . "<br><strong>Oggetto:</strong> "
        . htmlspecialchars($subject) . "</p>" . $html;
    file_put_contents($dir . '/' . $name, $body);
}

function geocode_it(string $q): array {
    $q = trim($q);
    if (mb_strlen($q) < 2) {
        return [];
    }
    $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
        'q' => $q,
        'format' => 'jsonv2',
        'addressdetails' => 1,
        'countrycodes' => 'it',
        'limit' => 6,
    ]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => ['User-Agent: ScadenzeItalia/1.0 (localhost; educational)'],
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $json = json_decode((string) $raw, true);
    if (!is_array($json)) {
        return [];
    }
    $out = [];
    foreach ($json as $row) {
        $addr = $row['address'] ?? [];
        $out[] = [
            'label' => $row['display_name'] ?? '',
            'lat' => (float) $row['lat'],
            'lng' => (float) $row['lon'],
            'comune' => $addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['municipality'] ?? '',
            'provincia' => $addr['iso3166_2_lvl6'] ?? substr((string) ($addr['county'] ?? ''), 0, 4),
            'regione' => $addr['state'] ?? '',
        ];
    }
    return $out;
}
