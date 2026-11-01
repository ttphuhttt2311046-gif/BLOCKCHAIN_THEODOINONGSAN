<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

$conn = new mysqli("localhost", "root", "", "traceability_db");
if ($conn->connect_error) {
    die(json_encode(["message" => "Lỗi kết nối CSDL"]));
}

$conn->set_charset("utf8mb4");

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

        $loc_esc = $conn->real_escape_string($location);
        $st_esc = $conn->real_escape_string($status);
        
        // Bước 1.3: Lưu dòng đầu tiên vào bảng tracking_history
        $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at) 
                        VALUES ($product_id, '$loc_esc', '$st_esc', '$data_hash', $farmer_id, FROM_UNIXTIME($timestamp))";
        $conn->query($sql_history);

        echo json_encode(["id" => $product_id, "hash" => $data_hash, "location" => $location]);
    } else {
        echo json_encode(["message" => "Lỗi tạo lô hàng: " . $conn->error]);
    }
}

// ==========================================
// 2. TÍNH NĂNG CẬP NHẬT HÀNH TRÌNH
// ==========================================
elseif ($action === "update") {
    $product_id = (int)$data->id;
    $location = $conn->real_escape_string($data->location);
    $status = $conn->real_escape_string($data->status);
    $transporter_id = 2; // Giả sử ID của tài xế đang đăng nhập là 2
    $timestamp = time();

    // Bước 2.1: Băm dữ liệu cập nhật
    $raw_string = $product_id . $location . $status . $timestamp;
    $data_hash = "0x" . hash('sha256', $raw_string);

    // Bước 2.2: Thêm dòng MỚI vào bảng tracking_history
    $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at) 
                    VALUES ($product_id, '$location', '$status', '$data_hash', $transporter_id, FROM_UNIXTIME($timestamp))";
    
    if ($conn->query($sql_history) === TRUE) {
        echo json_encode(["hash" => $data_hash]); // Chỉ trả về hash để ký MetaMask
    } else {
        echo json_encode(["message" => "Lỗi cập nhật hành trình: " . $conn->error]);
    }
}

// ==========================================
// 3. LƯU ID TRÊN CHAIN VÀO DB
// ==========================================
elseif ($action === "confirm_blockchain" || $action === "setChain") {
    $id = (int)$data->id;
    $chain_id = (int)$data->chain_id;
    $conn->query("UPDATE products SET chain_id = $chain_id WHERE id = $id");
    echo json_encode(["ok" => true]);
}

// ==========================================
// 4. ĐỌC LỊCH SỬ (Dùng cho giao diện Trace)
// ==========================================
elseif ($action === "history") {
    $id = (int)$data->id;
    $p = $conn->query("SELECT id, name, chain_id FROM products WHERE id = $id")->fetch_assoc();
    
    if (!$p) {
        echo json_encode(["message" => "Không tìm thấy lô hàng"]);
    } else {
        $rs = $conn->query("SELECT product_id, location, status, data_hash, UNIX_TIMESTAMP(updated_at) AS ts 
                            FROM tracking_history WHERE product_id = $id ORDER BY id ASC");
        $history = [];
        while ($r = $rs->fetch_assoc()) {
            $r["product_id"] = (int)$r["product_id"];
            $r["ts"] = (int)$r["ts"];
            $history[] = $r;
        }
        echo json_encode(["product" => $p, "history" => $history]);
    }
} 

// ==========================================
// HÀNH ĐỘNG KHÔNG HỢP LỆ
// ==========================================
else {
    echo json_encode(["message" => "Hành động không hợp lệ"]);
}

$conn->close();
?>