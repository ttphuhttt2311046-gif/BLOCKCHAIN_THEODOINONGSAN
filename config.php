<?php
require __DIR__ . '/env.php';
header('Content-Type: application/javascript; charset=UTF-8');
$abiPath = __DIR__ . '/SupplyChainABI.json';
$abi = is_readable($abiPath) ? json_decode(file_get_contents($abiPath), true) : null;
if (!is_array($abi)) {
    http_response_code(500);
    echo 'throw new Error("Không đọc được ABI của smart contract");';
    exit;
}

echo 'window.APP_CONFIG = ' . json_encode([
    'RPC_URL'          => env('RPC_URL'),
    'CONTRACT_ADDRESS' => env('CONTRACT_ADDRESS'),
    'CONTRACT_ABI'     => $abi,
], JSON_UNESCAPED_SLASHES) . ';';