<?php
session_start();
require '../db.php';
header('Content-Type: application/json');

// 1. KIỂM TRA QUYỀN
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["message" => "Từ chối truy cập! Chỉ Quản trị viên mới có quyền."]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// 2. GET: Lấy danh sách tài khoản 
if ($method === 'GET' && $action === 'get_users') {
    $result = $conn->query("SELECT wallet_address, role FROM users ORDER BY (role = 'pending') DESC, id DESC");
    
    $users = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }
    
    // Trả về trực tiếp mảng $users để Javascript đọc được data.forEach(...)
    echo json_encode($users);
    exit;
}

// 3. POST: Cập nhật quyền 
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action']) && $data['action'] === 'update_role') {
        
        // --- A. Kiểm tra dữ liệu đầu vào (Validation) ---
        if (empty($data['wallet_address']) || empty($data['role'])) {
            http_response_code(400);
            echo json_encode(["message" => "Dữ liệu không hợp lệ: Thiếu địa chỉ ví hoặc quyền."]);
            exit;
        }

        $wallet = trim($data['wallet_address']);
        $new_role = trim($data['role']);

    $allowed_roles = ['admin', 'farmer', 'transporter', 'pending'];        

if (!in_array($new_role, $allowed_roles)) {
            http_response_code(400);
            echo json_encode(["message" => "Quyền không hợp lệ!"]);
            exit;
        }

        if (isset($_SESSION['wallet_address']) && $_SESSION['wallet_address'] === $wallet) {
            http_response_code(403);
            echo json_encode(["message" => "Bạn không thể tự thay đổi hoặc hạ quyền của chính tài khoản mình!"]);
            exit;
        }

        $stmt = $conn->prepare("UPDATE users SET role = ? WHERE wallet_address = ?");
        if ($stmt) {
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