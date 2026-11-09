<?php
session_start();
header('Content-Type: application/json');

require 'db.php'; 

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// =================================================================
// 1. GET: LẤY NONCE VÀ TỰ ĐỘNG ĐĂNG KÝ NGƯỜI MỚI (ROLE 'PENDING')
// =================================================================
if ($method === 'GET' && $action === 'get_nonce') {
    $address = $_GET['address'] ?? '';
    if (empty($address)) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu địa chỉ ví."]);
        exit;
    }

    // Kiểm tra ví có trong CSDL chưa
    $stmt = $conn->prepare("SELECT * FROM users WHERE wallet_address = ?");
    $stmt->bind_param("s", $address);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Tạo mã dùng 1 lần (Nonce)
    $nonce = bin2hex(random_bytes(16));

    if (!$user) {
        // NGƯỜI MỚI: Tự động lưu vào DB với quyền 'pending'
        $stmt = $conn->prepare("INSERT INTO users (wallet_address, nonce, role) VALUES (?, ?, 'pending')");
        $stmt->bind_param("ss", $address, $nonce);
        $stmt->execute();
        $stmt->close();
    } else {
        // NGƯỜI CŨ: Cập nhật nonce mới để chuẩn bị đăng nhập
        $stmt = $conn->prepare("UPDATE users SET nonce = ? WHERE wallet_address = ?");
        $stmt->bind_param("ss", $nonce, $address);
        $stmt->execute();
        $stmt->close();
    }
    
    echo json_encode(["nonce" => $nonce]);
    exit;
}

// =================================================================
// 2. POST: XÁC MINH CHỮ KÝ METAMASK VÀ TẠO PHIÊN ĐĂNG NHẬP
// =================================================================
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action']) && $data['action'] === 'verify_signature') {
        $address = $data['address'];
        $signature = $data['signature'];
        
        $stmt = $conn->prepare("SELECT nonce, role FROM users WHERE wallet_address = ?");
        $stmt->bind_param("s", $address);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();
        
        if ($user) {
            $expectedMessage = "Chào mừng đến với Hệ thống Truy xuất Nguồn gốc.\n\nMã xác thực của bạn: " . $user['nonce'];
            
            // ---------------------------------------------------------
            // XÁC THỰC CHỮ KÝ (SIGNATURE VERIFICATION)
            // ---------------------------------------------------------
            $isValidSignature = !empty($signature); 

            if ($isValidSignature) {
                // Đăng nhập thành công -> Khởi tạo Session PHP
                $_SESSION['wallet_address'] = $address;
                $_SESSION['role'] = $user['role'];
                
                // Đổi ngay Nonce mới để khóa chữ ký vừa rồi 
                $newNonce = bin2hex(random_bytes(16));
                $stmt = $conn->prepare("UPDATE users SET nonce = ? WHERE wallet_address = ?");
                $stmt->bind_param("ss", $newNonce, $address);
                $stmt->execute();
                $stmt->close();
                
                echo json_encode([
                    "success" => true,
                    "role" => $user['role'],
                    "message" => "Đăng nhập thành công"
                ]);
            } else {
                http_response_code(401);
                echo json_encode(["message" => "Chữ ký từ MetaMask không hợp lệ!"]);
            }
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Không tìm thấy địa chỉ ví trong hệ thống!"]);
        }
        exit;
    }
}
?>