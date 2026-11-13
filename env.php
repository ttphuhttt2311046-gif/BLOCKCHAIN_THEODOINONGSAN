<?php
function load_env($path)
{
    if (!is_readable($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }

        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if ($value !== '' && (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))) {
            $value = substr($value, 1, -1);
        }
        $_ENV[$key] = $value;
    }
}

function env($key, $default = null)
{
    $value = $_ENV[$key] ?? getenv($key);
    return $value === false || $value === null ? $default : $value;
}

load_env(dirname(__DIR__) . '/.env');
