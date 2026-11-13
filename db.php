<?php
require_once __DIR__ . '/env.php';

mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli(
    env('DB_HOST', 'localhost'),
    env('DB_USER', 'root'),
    env('DB_PASS', ''),
    env('DB_NAME', 'traceability_db')
);

if ($conn->connect_error) {
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['message' => 'Lỗi kết nối cơ sở dữ liệu']);
    exit;
}

$conn->set_charset('utf8mb4');
