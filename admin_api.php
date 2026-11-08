<?php
session_start();
require 'db.php';
header('Content-Type: application/json');

// 1. KIỂM TRA QUYỀN: Bắt buộc phải là 'admin' mới được gọi API này
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["message" => "Từ chối truy cập! Chỉ Quản trị viên mới có quyền."]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// 2. GET: Lấy danh sách tài khoản (Ưu tiên hiện 'pending' lên đầu)
if ($method === 'GET' && $action === 'get_users') {
    $result = $conn->query("SELECT wallet_address, role FROM users ORDER BY (role = 'pending') DESC, id DESC");
    
    $users = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }
    
    echo json_encode($users);
    exit;
}

// 3. POST: Cập nhật quyền (Role) cho ví
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action']) && $data['action'] === 'update_role') {
        $wallet = $data['wallet_address'];
        $new_role = $data['role'];

        $stmt = $conn->prepare("UPDATE users SET role = ? WHERE wallet_address = ?");
        if ($stmt) {
            // "ss" nghĩa là cả 2 biến truyền vào đều là dạng chuỗi (string)
            $stmt->bind_param("ss", $new_role, $wallet); 
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Cập nhật quyền thành công!"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Lỗi khi cập nhật vào cơ sở dữ liệu: " . $stmt->error]);
            }
            $stmt->close();
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Lỗi truy vấn SQL: " . $conn->error]);
        }
        exit;
    }
}
?>