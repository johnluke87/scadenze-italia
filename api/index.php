<?php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/holidays.php';
require __DIR__ . '/lib/templates.php';

cors();
$path = route_path();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = json_body();

try {
    if ($path === '/config' && $method === 'GET') {
        $y = (int) date('Y');
        out([
            'donate_url' => cfg()['donate_url'],
            'categories' => categories(),
            'templates' => templates(),
            'holidays' => italian_holidays($y),
        ]);
    }

    if ($path === '/geocode' && $method === 'GET') {
        out(['results' => geocode_it((string) ($_GET['q'] ?? ''))]);
    }

    if ($path === '/auth/register' && $method === 'POST') {
        rate_limit('register', 5);
        $name = trim((string) ($body['name'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $privacy = !empty($body['privacy']);
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || !$privacy) {
            fail('Nome, email valida, password di almeno 8 caratteri e consenso privacy.');
        }
        try {
            db()->prepare('INSERT INTO scad_users (name, email, password_hash) VALUES (?,?,?)')
                ->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException) {
            fail('Questa email è già registrata.', 409);
        }
        $id = (int) db()->lastInsertId();
        db()->prepare('INSERT INTO scad_people (user_id, name, relation) VALUES (?,?,?)')->execute([$id, $name, 'io']);
        $tok = issue_email_token($id, 'verify', '+24 hours');
        $url = app_url() . '/#/verifica/' . $tok;
        app_mail($email, 'Conferma l’email — Scadenze Italia',
            "<p>Ciao " . htmlspecialchars($name) . ",</p><p>Conferma l’indirizzo:</p><p><a href=\"$url\">$url</a></p>");
        $res = ['token' => issue_token($id), 'user' => public_user(db()->query('SELECT * FROM scad_users WHERE id=' . $id)->fetch())];
        if (!empty(cfg()['debug'])) {
            $res['dev_verify_url'] = $url;
        }
        out($res, 201);
    }

    if ($path === '/auth/login' && $method === 'POST') {
        rate_limit('login', 8);
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $st = db()->prepare('SELECT * FROM scad_users WHERE email=?');
        $st->execute([$email]);
        $u = $st->fetch();
        if (!$u || !password_verify((string) ($body['password'] ?? ''), $u['password_hash'])) {
            fail('Email o password non corretti.', 401);
        }
        out(['token' => issue_token((int) $u['id']), 'user' => public_user($u)]);
    }

    if ($path === '/auth/verify' && $method === 'POST') {
        $raw = trim((string) ($body['token'] ?? ''));
        $st = db()->prepare('SELECT * FROM scad_email_tokens WHERE token_hash=? AND purpose="verify" AND used_at IS NULL AND expires_at > NOW()');
        $st->execute([hash('sha256', $raw)]);
        $row = $st->fetch();
        if (!$row) {
            fail('Link non valido o scaduto.');
        }
        db()->prepare('UPDATE scad_users SET email_verified=1 WHERE id=?')->execute([(int) $row['user_id']]);
        db()->prepare('UPDATE scad_email_tokens SET used_at=NOW() WHERE id=?')->execute([(int) $row['id']]);
        out(['ok' => true]);
    }

    if ($path === '/auth/forgot' && $method === 'POST') {
        rate_limit('forgot', 5);
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $st = db()->prepare('SELECT * FROM scad_users WHERE email=?');
        $st->execute([$email]);
        $u = $st->fetch();
        if ($u) {
            $tok = issue_email_token((int) $u['id'], 'reset', '+60 minutes');
            $url = app_url() . '/#/reset/' . $tok;
            app_mail($u['email'], 'Nuova password — Scadenze Italia',
                "<p>Reimposta la password (60 minuti):</p><p><a href=\"$url\">$url</a></p>");
            if (!empty(cfg()['debug'])) {
                out(['ok' => true, 'dev_reset_url' => $url]);
            }
        }
        out(['ok' => true]);
    }

    if ($path === '/auth/reset' && $method === 'POST') {
        $raw = trim((string) ($body['token'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        if (strlen($password) < 8) {
            fail('Password di almeno 8 caratteri.');
        }
        $st = db()->prepare('SELECT * FROM scad_email_tokens WHERE token_hash=? AND purpose="reset" AND used_at IS NULL AND expires_at > NOW()');
        $st->execute([hash('sha256', $raw)]);
        $row = $st->fetch();
        if (!$row) {
            fail('Link non valido o scaduto.');
        }
        $uid = (int) $row['user_id'];
        db()->prepare('UPDATE scad_users SET password_hash=? WHERE id=?')->execute([password_hash($password, PASSWORD_DEFAULT), $uid]);
        db()->prepare('UPDATE scad_email_tokens SET used_at=NOW() WHERE id=?')->execute([(int) $row['id']]);
        db()->prepare('DELETE FROM scad_sessions WHERE user_id=?')->execute([$uid]);
        out(['ok' => true]);
    }

    if ($path === '/cron' && $method === 'GET') {
        $token = (string) cfg()['cron_token'];
        if ($token === '' || !hash_equals($token, (string) ($_GET['token'] ?? ''))) {
            fail('Non autorizzato.', 403);
        }
        $today = (new DateTimeImmutable('today'))->format('Y-m-d');
        $rows = db()->query("SELECT d.*, u.email, u.name AS uname, u.email_verified, u.remind_days AS udefault
            FROM scad_deadlines d JOIN scad_users u ON u.id=d.user_id WHERE d.status='open'")->fetchAll();
        $sent = 0;
        $skipped = 0;
        foreach ($rows as $d) {
            $days = $d['remind_days'] ?: $d['udefault'] ?: '30,7,1';
            foreach (explode(',', $days) as $n) {
                $n = (int) trim($n);
                if ($n < 0) {
                    continue;
                }
                $when = (new DateTimeImmutable($d['due_date']))->modify("-$n days")->format('Y-m-d');
                if ($when !== $today) {
                    continue;
                }
                if (!(int) $d['email_verified']) {
                    $skipped++;
                    continue;
                }
                try {
                    db()->prepare('INSERT INTO scad_reminder_log (deadline_id, remind_on) VALUES (?,?)')->execute([(int) $d['id'], $today]);
                } catch (PDOException) {
                    continue;
                }
                app_mail($d['email'], 'Scade ' . ($n === 0 ? 'oggi' : "tra $n giorni") . ': ' . $d['title'],
                    '<p>Ciao ' . htmlspecialchars($d['uname']) . ',</p><p><strong>'
                    . htmlspecialchars($d['title']) . '</strong> scade il <strong>'
                    . htmlspecialchars((new DateTimeImmutable($d['due_date']))->format('d/m/Y')) . '</strong>.</p>'
                    . '<p><a href="' . htmlspecialchars(app_url() . '/#/scadenza/' . (int) $d['id']) . '">Apri la scadenza</a></p>');
                $sent++;
            }
        }
        out(['sent' => $sent, 'skipped_unverified' => $skipped]);
    }

    $u = require_user();
    $uid = (int) $u['id'];

    if ($path === '/me' && $method === 'GET') {
        out(['user' => public_user($u)]);
    }

    if ($path === '/me' && $method === 'PUT') {
        $name = trim((string) ($body['name'] ?? $u['name']));
        $remind = trim((string) ($body['remind_days'] ?? $u['remind_days']));
        if (!preg_match('/^[0-9, ]+$/', $remind)) {
            fail('Giorni di preavviso non validi.');
        }
        db()->prepare('UPDATE scad_users SET name=?, comune=?, provincia=?, regione=?, lat=?, lng=?, remind_days=? WHERE id=?')
            ->execute([
                $name,
                $body['comune'] ?? $u['comune'],
                $body['provincia'] ?? $u['provincia'],
                $body['regione'] ?? $u['regione'],
                isset($body['lat']) ? (float) $body['lat'] : $u['lat'],
                isset($body['lng']) ? (float) $body['lng'] : $u['lng'],
                $remind,
                $uid,
            ]);
        $u = db()->query('SELECT * FROM scad_users WHERE id=' . $uid)->fetch();
        out(['user' => public_user($u)]);
    }

    if ($path === '/me/password' && $method === 'POST') {
        if (!password_verify((string) ($body['current'] ?? ''), $u['password_hash'])) {
            fail('Password attuale non corretta.', 403);
        }
        $np = (string) ($body['password'] ?? '');
        if (strlen($np) < 8) {
            fail('Nuova password di almeno 8 caratteri.');
        }
        db()->prepare('UPDATE scad_users SET password_hash=? WHERE id=?')->execute([password_hash($np, PASSWORD_DEFAULT), $uid]);
        out(['ok' => true]);
    }

    if ($path === '/me' && $method === 'DELETE') {
        db()->prepare('DELETE FROM scad_reminder_log WHERE deadline_id IN (SELECT id FROM scad_deadlines WHERE user_id=?)')->execute([$uid]);
        db()->prepare('DELETE FROM scad_deadlines WHERE user_id=?')->execute([$uid]);
        db()->prepare('DELETE FROM scad_people WHERE user_id=?')->execute([$uid]);
        db()->prepare('DELETE FROM scad_vehicles WHERE user_id=?')->execute([$uid]);
        db()->prepare('DELETE FROM scad_properties WHERE user_id=?')->execute([$uid]);
        db()->prepare('DELETE FROM scad_sessions WHERE user_id=?')->execute([$uid]);
        db()->prepare('DELETE FROM scad_email_tokens WHERE user_id=?')->execute([$uid]);
        db()->prepare('DELETE FROM scad_users WHERE id=?')->execute([$uid]);
        out(['ok' => true]);
    }

    if ($path === '/export' && $method === 'GET') {
        $p = db()->prepare('SELECT * FROM scad_deadlines WHERE user_id=? ORDER BY due_date');
        $p->execute([$uid]);
        out(['deadlines' => $p->fetchAll()]);
    }

    $crud = [
        '/people' => 'people',
        '/vehicles' => 'vehicles',
        '/properties' => 'properties',
    ];
    foreach ($crud as $base => $table) {
        if ($path === $base && $method === 'GET') {
            $st = db()->prepare("SELECT * FROM scad_$table WHERE user_id=? ORDER BY id");
            $st->execute([$uid]);
            out([$table => $st->fetchAll()]);
        }
        $isItem = preg_match('#^' . $base . '/(\d+)$#', $path, $m) === 1;
        if (($path === $base && $method === 'POST') || ($isItem && $method === 'PUT')) {
            $itemId = $isItem ? owned_id($table, $m[1], $uid) : null;
            if ($isItem && !$itemId) {
                fail('Non trovato.', 404);
            }
            $name = trim((string) ($body['name'] ?? ''));
            if ($name === '') {
                fail('Indica un nome.');
            }
            if ($table === 'people') {
                $birth = ($body['birthdate'] ?? '') ?: null;
                if ($birth !== null && !valid_date($birth)) {
                    fail('Data di nascita non valida.');
                }
                $vals = [$name, $birth, (string) ($body['relation'] ?? 'famiglia')];
                $cols = ['name', 'birthdate', 'relation'];
            } elseif ($table === 'vehicles') {
                $reg = ($body['first_reg'] ?? '') ?: null;
                if ($reg !== null && preg_match('/^\d{4}-\d{2}$/', (string) $reg)) {
                    $reg .= '-01';
                }
                if ($reg !== null && !valid_date($reg)) {
                    fail('Data di immatricolazione non valida.');
                }
                $kind = in_array($body['kind'] ?? '', ['auto', 'moto', 'altro'], true) ? $body['kind'] : 'auto';
                $vals = [$name, strtoupper(trim((string) ($body['plate'] ?? ''))) ?: null, $kind, $reg, ($body['region'] ?? '') ?: $u['regione']];
                $cols = ['name', 'plate', 'kind', 'first_reg', 'region'];
            } else {
                $kind = in_array($body['kind'] ?? '', ['abitazione', 'secondo', 'box', 'affitto'], true) ? $body['kind'] : 'abitazione';
                $vals = [$name, $kind, ($body['comune'] ?? '') ?: $u['comune']];
                $cols = ['name', 'kind', 'comune'];
            }
            if ($itemId) {
                $set = implode(',', array_map(fn($c) => "$c=?", $cols));
                db()->prepare("UPDATE scad_$table SET $set WHERE id=? AND user_id=?")->execute([...$vals, $itemId, $uid]);
                out(['ok' => true]);
            }
            $ph = implode(',', array_fill(0, count($cols) + 1, '?'));
            db()->prepare("INSERT INTO scad_$table (user_id," . implode(',', $cols) . ") VALUES ($ph)")->execute([$uid, ...$vals]);
            out(['id' => (int) db()->lastInsertId()], 201);
        }
        if ($isItem && $method === 'DELETE') {
            $fk = ['people' => 'person_id', 'vehicles' => 'vehicle_id', 'properties' => 'property_id'][$table];
            db()->prepare("UPDATE scad_deadlines SET $fk=NULL WHERE $fk=? AND user_id=?")->execute([(int) $m[1], $uid]);
            db()->prepare("DELETE FROM scad_$table WHERE id=? AND user_id=?")->execute([(int) $m[1], $uid]);
            out(['ok' => true]);
        }
    }

    if ($path === '/deadlines' && $method === 'GET') {
        $st = db()->prepare('SELECT * FROM scad_deadlines WHERE user_id=? ORDER BY due_date, id');
        $st->execute([$uid]);
        $rows = $st->fetchAll();
        foreach ($rows as &$r) {
            $r['state'] = deadline_state($r['due_date'], $r['status']);
            $r['holiday_shift'] = null;
            $due = new DateTimeImmutable($r['due_date']);
            if (is_italian_holiday($due) || (int) $due->format('N') >= 6) {
                $r['holiday_shift'] = next_weekday_if_holiday($due)->format('Y-m-d');
            }
        }
        out(['deadlines' => $rows]);
    }

    if ($path === '/deadlines' && $method === 'POST') {
        $key = (string) ($body['template_key'] ?? 'custom');
        $tpl = template($key) ?: template('custom');
        $title = trim((string) ($body['title'] ?? $tpl['title']));
        if (!template($key)) {
            $key = 'custom';
        }
        $due = ($body['due_date'] ?? '') ?: suggest_due($key);
        if (!valid_date($due)) {
            fail('Indica la data di scadenza.');
        }
        $recur = (string) (($body['recur'] ?? '') ?: $tpl['recur']);
        if (!valid_recur($recur)) {
            fail('Ricorrenza non valida.');
        }
        $remind = ($body['remind_days'] ?? '') ?: $tpl['remind'];
        if (!valid_remind($remind)) {
            fail('Giorni di preavviso non validi.');
        }
        db()->prepare('INSERT INTO scad_deadlines (user_id,person_id,vehicle_id,property_id,template_key,title,category,due_date,recur,remind_days,notes,amount,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,\'open\')')->execute([
            $uid,
            owned_id('people', $body['person_id'] ?? null, $uid),
            owned_id('vehicles', $body['vehicle_id'] ?? null, $uid),
            owned_id('properties', $body['property_id'] ?? null, $uid),
            $key,
            mb_substr($title !== '' ? $title : $tpl['title'], 0, 160),
            $tpl['category'],
            $due,
            $recur,
            $remind,
            ($body['notes'] ?? '') ?: null,
            ($body['amount'] ?? '') ?: null,
        ]);
        out(['id' => (int) db()->lastInsertId()], 201);
    }

    if (preg_match('#^/deadlines/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        $st = db()->prepare('SELECT * FROM scad_deadlines WHERE id=? AND user_id=?');
        $st->execute([$id, $uid]);
        $row = $st->fetch();
        if (!$row) {
            fail('Scadenza non trovata.', 404);
        }
        if ($method === 'GET') {
            $row['state'] = deadline_state($row['due_date'], $row['status']);
            out(['deadline' => $row, 'template' => template($row['template_key'])]);
        }
        if ($method === 'PUT') {
            if (isset($body['due_date']) && !valid_date($body['due_date'])) {
                fail('Data non valida.');
            }
            if (isset($body['recur']) && !valid_recur((string) $body['recur'])) {
                fail('Ricorrenza non valida.');
            }
            if (isset($body['remind_days']) && $body['remind_days'] !== '' && !valid_remind($body['remind_days'])) {
                fail('Giorni di preavviso non validi.');
            }
            foreach (['person_id' => 'people', 'vehicle_id' => 'vehicles', 'property_id' => 'properties'] as $fk => $t) {
                if (array_key_exists($fk, $body)) {
                    $body[$fk] = owned_id($t, $body[$fk], $uid);
                }
            }
            if (isset($body['due_date']) && $body['due_date'] !== $row['due_date']) {
                db()->prepare('DELETE FROM scad_reminder_log WHERE deadline_id=?')->execute([$id]);
            }
            db()->prepare('UPDATE scad_deadlines SET title=?, due_date=?, recur=?, remind_days=?, notes=?, amount=?, person_id=?, vehicle_id=?, property_id=? WHERE id=? AND user_id=?')
                ->execute([
                    trim((string) ($body['title'] ?? $row['title'])),
                    $body['due_date'] ?? $row['due_date'],
                    $body['recur'] ?? $row['recur'],
                    $body['remind_days'] ?? $row['remind_days'],
                    $body['notes'] ?? $row['notes'],
                    $body['amount'] ?? $row['amount'],
                    array_key_exists('person_id', $body) ? ($body['person_id'] ?: null) : $row['person_id'],
                    array_key_exists('vehicle_id', $body) ? ($body['vehicle_id'] ?: null) : $row['vehicle_id'],
                    array_key_exists('property_id', $body) ? ($body['property_id'] ?: null) : $row['property_id'],
                    $id, $uid,
                ]);
            out(['ok' => true]);
        }
        if ($method === 'DELETE') {
            db()->prepare('DELETE FROM scad_reminder_log WHERE deadline_id=?')->execute([$id]);
            db()->prepare('DELETE FROM scad_deadlines WHERE id=? AND user_id=?')->execute([$id, $uid]);
            out(['ok' => true]);
        }
        if ($method === 'POST' && ($body['action'] ?? '') === 'done') {
            $today = new DateTimeImmutable('today');
            $next = next_due_after($row['recur'], $row['due_date'], $today);
            if ($next) {
                db()->prepare('UPDATE scad_deadlines SET due_date=?, status=\'open\', done_at=? WHERE id=?')->execute([$next, $today->format('Y-m-d'), $id]);
            } else {
                db()->prepare('UPDATE scad_deadlines SET status=\'done\', done_at=? WHERE id=?')->execute([$today->format('Y-m-d'), $id]);
            }
            out(['ok' => true, 'next' => $next]);
        }
        if ($method === 'POST' && in_array($body['action'] ?? '', ['archive', 'reopen'], true)) {
            $status = $body['action'] === 'archive' ? 'archived' : 'open';
            db()->prepare('UPDATE scad_deadlines SET status=? WHERE id=?')->execute([$status, $id]);
            out(['ok' => true]);
        }
        if ($method === 'POST' && ($body['action'] ?? '') === 'duplicate') {
            db()->prepare('INSERT INTO scad_deadlines (user_id,person_id,vehicle_id,property_id,template_key,title,category,due_date,recur,remind_days,notes,amount,status)
                SELECT user_id,person_id,vehicle_id,property_id,template_key,CONCAT(LEFT(title,150),\' (copia)\'),category,due_date,recur,remind_days,notes,amount,\'open\'
                FROM scad_deadlines WHERE id=? AND user_id=?')->execute([$id, $uid]);
            out(['id' => (int) db()->lastInsertId()], 201);
        }
    }

    fail('Non trovato.', 404);
} catch (Throwable $e) {
    error_log('scadenze-italia: ' . $e->getMessage());
    fail(cfg()['debug'] ? $e->getMessage() : 'Servizio non disponibile.', 500);
}
