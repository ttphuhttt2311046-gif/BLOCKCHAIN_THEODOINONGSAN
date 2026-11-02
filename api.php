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
    $farmer_id = 1; // Giả sử ID nông dân là 1

    // Lấy chain_id từ admin.js gửi sang (nếu có)
    $chain_id = isset($data->chain_id) ? (int)$data->chain_id : 0;

    // Ép id và chain_id của MySQL trùng khớp với chain_id từ Blockchain
    if ($chain_id > 0) {
        $sql_product = "INSERT INTO products (id, name, description, chain_id, farmer_id) 
                        VALUES ($chain_id, '$name', '$description', $chain_id, $farmer_id)";
    } else {
        $sql_product = "INSERT INTO products (name, description, farmer_id) 
                        VALUES ('$name', '$description', $farmer_id)";
    }
    
    if ($conn->query($sql_product) === TRUE) {
        $product_id = ($chain_id > 0) ? $chain_id : $conn->insert_id;
        
        // Tự cập nhật chain_id nếu sử dụng ID tự tăng
        if ($chain_id == 0) {
            $conn->query("UPDATE products SET chain_id = $product_id WHERE id = $product_id");
        }

        // Tạo mã Hash cho trạm đầu tiên (Khởi tạo)
        $status = "Khởi tạo";
        $location = "Cơ sở sản xuất";
        $timestamp = time();
        $raw_string = $product_id . $location . $status . $timestamp;
        $data_hash = "0x" . hash('sha256', $raw_string);

        $loc_esc = $conn->real_escape_string($location);
        $st_esc = $conn->real_escape_string($status);
        
        // Lưu dòng đầu tiên vào bảng tracking_history
        $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at) 
                        VALUES ($product_id, '$loc_esc', '$st_esc', '$data_hash', $farmer_id, FROM_UNIXTIME($timestamp))";
        $conn->query($sql_history);

        echo json_encode([
            "status" => "success",
            "id" => $product_id, 
            "chain_id" => $product_id, 
            "hash" => $data_hash, 
            "location" => $location
        ]);
    } else {
        echo json_encode(["message" => "Lỗi tạo lô hàng: " . $conn->error]);
    }
}

// ==========================================
// 2. TÍNH NĂNG CẬP NHẬT HÀNH TRÌNH
// ==========================================
elseif ($action === "update") {
    $input_id = (int)$data->id;
    $location = $conn->real_escape_string($data->location);
    $status = $conn->real_escape_string($data->status);
    $transporter_id = 2; // Giả sử ID tài xế là 2
    $timestamp = time();

    // Tìm thông tin sản phẩm theo id hoặc chain_id
    $p = $conn->query("SELECT id, chain_id FROM products WHERE id = $input_id OR chain_id = $input_id")->fetch_assoc();
    
    if (!$p) {
        echo json_encode(["message" => "Không tìm thấy lô hàng để cập nhật"]);
        exit;
    }

    $product_id = (int)$p['id'];
    $chain_id = $p['chain_id'] ? (int)$p['chain_id'] : $product_id;

    // Băm dữ liệu cập nhật
    $raw_string = $product_id . $location . $status . $timestamp;
    $data_hash = "0x" . hash('sha256', $raw_string);

    // Thêm dòng MỚI vào bảng tracking_history
    $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at) 
                    VALUES ($product_id, '$location', '$status', '$data_hash', $transporter_id, FROM_UNIXTIME($timestamp))";
    
    if ($conn->query($sql_history) === TRUE) {
        echo json_encode(["hash" => $data_hash, "chain_id" => $chain_id]);
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
// 4. ĐỌC LỊCH SỬ (Hỗ trợ tra cứu theo id hoặc chain_id)
// ==========================================
elseif ($action === "history") {
    $id = (int)$data->id;
    $p = $conn->query("SELECT id, name, chain_id FROM products WHERE id = $id OR chain_id = $id")->fetch_assoc();
    
    if (!$p) {
        echo json_encode(["message" => "Không tìm thấy lô hàng"]);
    } else {
        $real_id = (int)$p['id'];
        $chain_id = $p['chain_id'] ? (int)$p['chain_id'] : $real_id;
        
        $rs = $conn->query("SELECT product_id, location, status, data_hash, UNIX_TIMESTAMP(updated_at) AS ts 
                            FROM tracking_history 
                            WHERE product_id = $real_id OR product_id = $chain_id 
                            ORDER BY id ASC");
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