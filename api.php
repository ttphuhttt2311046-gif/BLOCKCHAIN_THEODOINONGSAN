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

// 1. KHỞI TẠO LÔ HÀNG
if ($action === "create") {
    $name = $conn->real_escape_string($data->name);
    $description = isset($data->description) ? $conn->real_escape_string($data->description) : "";
    $farmer_id = 1;

    $sql_product = "INSERT INTO products (name, description, farmer_id) VALUES ('$name', '$description', $farmer_id)";
    if ($conn->query($sql_product) === TRUE) {
        $product_id = $conn->insert_id;
        $status = "Khởi tạo";
        $location = "Nông trại";
        $ts = time();

        // Băm trên giá trị GỐC (chưa escape)
        $data_hash = "0x" . hash('sha256', $product_id . $location . $status . $ts);

        $loc_esc = $conn->real_escape_string($location);
        $st_esc = $conn->real_escape_string($status);
        $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at)
                        VALUES ($product_id, '$loc_esc', '$st_esc', '$data_hash', $farmer_id, FROM_UNIXTIME($ts))";
        $conn->query($sql_history);

        echo json_encode(["id" => $product_id, "hash" => $data_hash, "location" => $location]);
    } else {
        echo json_encode(["message" => "Lỗi tạo lô hàng: " . $conn->error]);
    }
}

// 2. CẬP NHẬT HÀNH TRÌNH (chỉ INSERT, không UPDATE)
elseif ($action === "update") {
    $product_id = (int)$data->id;
    $location = $data->location;
    $status = $data->status;
    $transporter_id = 2;
    $ts = time();

    $data_hash = "0x" . hash('sha256', $product_id . $location . $status . $ts);

    $loc_esc = $conn->real_escape_string($location);
    $st_esc = $conn->real_escape_string($status);
    $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at)
                    VALUES ($product_id, '$loc_esc', '$st_esc', '$data_hash', $transporter_id, FROM_UNIXTIME($ts))";

    if ($conn->query($sql_history) === TRUE) {
        echo json_encode(["hash" => $data_hash]);
    } else {
        echo json_encode(["message" => "Lỗi cập nhật hành trình: " . $conn->error]);
    }
}

// 3. LƯU ID TRÊN CHAIN VÀO DB
elseif ($action === "setChain") {
    $id = (int)$data->id;
    $chain_id = (int)$data->chain_id;
    $conn->query("UPDATE products SET chain_id = $chain_id WHERE id = $id");
    echo json_encode(["ok" => true]);
}

// 4. ĐỌC LỊCH SỬ (dùng cho người 3)
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

else {
    echo json_encode(["message" => "Hành động không hợp lệ"]);
}

$conn->close();