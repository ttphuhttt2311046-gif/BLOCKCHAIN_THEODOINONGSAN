<?php
require __DIR__ . '/env.php';
header('Content-Type: application/javascript; charset=UTF-8');
echo 'window.APP_CONFIG = ' . json_encode([
    'RPC_URL'          => env('RPC_URL'),
    'CONTRACT_ADDRESS' => env('CONTRACT_ADDRESS'),
], JSON_UNESCAPED_SLASHES) . ';';