<?php
$host = '127.0.0.1';
$db   = 'traceability_db';
$user = 'root';
$pass = ''; 

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(["message" => "Lỗi kết nối CSDL: " . $conn->connect_error]);
    exit;
}

$conn->set_charset("utf8mb4");
?>