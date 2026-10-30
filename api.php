<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

$conn = new mysqli("localhost", "root", "", "traceability_db");
if ($conn->connect_error) {
    die(json_encode(["message" => "Lỗi kết nối CSDL"]));
}

$data = json_decode(file_get_contents("php://input"));
$action = isset($data->action) ? $data->action : "";

// ==========================================
// 1. TÍNH NĂNG KHỞI TẠO LÔ HÀNG
// ==========================================
if ($action === "create") {
    $name = $conn->real_escape_string($data->name);
    $description = isset($data->description) ? $conn->real_escape_string($data->description) : "";
    $farmer_id = 1; // Giả sử ID của nông dân đang đăng nhập là 1

    // Bước 1.1: Lưu thông tin gốc vào bảng products
    $sql_product = "INSERT INTO products (name, description, farmer_id) VALUES ('$name', '$description', $farmer_id)";
    
    if ($conn->query($sql_product) === TRUE) {
        $product_id = $conn->insert_id; // Lấy ID lô hàng vừa tạo
        
        // Bước 1.2: Tạo mã Hash cho trạm đầu tiên (Khởi tạo)
        $status = "Khởi tạo";
        $location = "Nông trại";
        $timestamp = time();
        $raw_string = $product_id . $location . $status . $timestamp;
        $data_hash = "0x" . hash('sha256', $raw_string);

        // Bước 1.3: Lưu dòng đầu tiên vào bảng tracking_history
        $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by) 
                        VALUES ($product_id, '$location', '$status', '$data_hash', $farmer_id)";
        $conn->query($sql_history);

        echo json_encode(["id" => $product_id, "hash" => $data_hash]);
    } else {
        echo json_encode(["message" => "Lỗi tạo lô hàng: " . $conn->error]);
    }
}

// ==========================================
// 2. TÍNH NĂNG CẬP NHẬT HÀNH TRÌNH
// ==========================================
elseif ($action === "update") {
    $product_id = $conn->real_escape_string($data->id);
    $location = $conn->real_escape_string($data->location);
    $status = $conn->real_escape_string($data->status);
    $transporter_id = 2; // Giả sử ID của tài xế đang đăng nhập là 2
    $timestamp = time();

    // Bước 2.1: Băm dữ liệu cập nhật
    $raw_string = $product_id . $location . $status . $timestamp;
    $data_hash = "0x" . hash('sha256', $raw_string);

    // Bước 2.2: Thêm dòng MỚI vào bảng tracking_history (Tuyệt đối không dùng UPDATE)
    $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by) 
                    VALUES ($product_id, '$location', '$status', '$data_hash', $transporter_id)";
    
    if ($conn->query($sql_history) === TRUE) {
        echo json_encode(["hash" => $data_hash]); // Chỉ trả về hash để ký MetaMask
    } else {
        echo json_encode(["message" => "Lỗi cập nhật hành trình: " . $conn->error]);
    }
} else {
    echo json_encode(["message" => "Hành động không hợp lệ"]);
}

$conn->close();
?>