<?php
require __DIR__ . '/env.php';
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

$conn = new mysqli(
    env('DB_HOST', 'localhost'),
    env('DB_USER', 'root'),
    env('DB_PASS', ''),
    env('DB_NAME', 'traceability_db')
);
if ($conn->connect_error) {
    die(json_encode(["message" => "Lỗi kết nối CSDL"]));
}
$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents("php://input"));
$action = isset($data->action) ? $data->action : "";

// Tọa độ: trả về 'NULL' cho SQL nếu không có
function coord($obj, $key) {
    return isset($obj->$key) ? (string)(float)$obj->$key : 'NULL';
}

// Tìm lô theo id (số) hoặc chain_id (chuỗi, ví dụ "4-2").
// Với chuỗi không phải số, không so sánh với id để tránh MySQL chuyển "4-2" thành 4.
function find_product($conn, $key) {
    $esc = $conn->real_escape_string($key);
    $cond = ctype_digit($key) ? "id = $esc OR chain_id = '$esc'" : "chain_id = '$esc'";
    $res = $conn->query("SELECT id, name, chain_id FROM products WHERE $cond LIMIT 1");
    return $res ? $res->fetch_assoc() : null;
}

// 1. KHỞI TẠO LÔ HÀNG
if ($action === "create") {
    $name = $conn->real_escape_string($data->name);
    $description = isset($data->description) ? $conn->real_escape_string($data->description) : "";
    $farmer_id = 1;
    $chain_id = (isset($data->chain_id) && $data->chain_id !== '')
        ? $conn->real_escape_string((string)$data->chain_id)
        : null;
    $chain_sql = $chain_id === null ? "NULL" : "'$chain_id'";

    $sql_product = "INSERT INTO products (name, description, chain_id, farmer_id)
                    VALUES ('$name', '$description', $chain_sql, $farmer_id)";
    if ($conn->query($sql_product) === TRUE) {
        $product_id = $conn->insert_id;

        // Nếu chưa truyền chain_id thì mặc định dùng id tự tăng (hành vi cũ)
        if ($chain_id === null) {
            $chain_id = (string)$product_id;
            $conn->query("UPDATE products SET chain_id = '$chain_id' WHERE id = $product_id");
        }

        $status = "Khởi tạo";
        $location = "Cơ sở sản xuất";
        $ts = time();
        $data_hash = "0x" . hash('sha256', $product_id . $location . $status . $ts);

        $loc_esc = $conn->real_escape_string($location);
        $st_esc = $conn->real_escape_string($status);
        $lat = coord($data, 'lat');
        $lng = coord($data, 'lng');

        $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at, lat, lng)
                        VALUES ($product_id, '$loc_esc', '$st_esc', '$data_hash', $farmer_id, FROM_UNIXTIME($ts), $lat, $lng)";
        if ($conn->query($sql_history) !== TRUE) {
            echo json_encode(["message" => "Lỗi ghi mốc khởi tạo: " . $conn->error]);
        } else {
            echo json_encode([
                "status" => "success",
                "id" => $product_id,
                "chain_id" => $chain_id,
                "hash" => $data_hash,
                "location" => $location
            ]);
        }
    } else {
        echo json_encode(["message" => "Lỗi tạo lô hàng: " . $conn->error]);
    }
}

// 2. CẬP NHẬT HÀNH TRÌNH (chỉ INSERT, không UPDATE)
elseif ($action === "update") {
    $p = find_product($conn, (string)$data->id);

    if (!$p) {
        echo json_encode(["message" => "Không tìm thấy lô hàng để cập nhật"]);
    } else {
        $product_id = (int)$p['id'];
        $chain_id = $p['chain_id'] !== null ? $p['chain_id'] : (string)$product_id;
        $transporter_id = 2;
        $ts = time();

        // Băm trên giá trị GỐC (chưa escape), giống computeHash trong app.js
        $data_hash = "0x" . hash('sha256', $product_id . $data->location . $data->status . $ts);

        $loc_esc = $conn->real_escape_string($data->location);
        $st_esc = $conn->real_escape_string($data->status);
        $lat = coord($data, 'lat');
        $lng = coord($data, 'lng');

        $sql_history = "INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at, lat, lng)
                        VALUES ($product_id, '$loc_esc', '$st_esc', '$data_hash', $transporter_id, FROM_UNIXTIME($ts), $lat, $lng)";
        if ($conn->query($sql_history) === TRUE) {
            echo json_encode(["hash" => $data_hash, "chain_id" => $chain_id]);
        } else {
            echo json_encode(["message" => "Lỗi cập nhật hành trình: " . $conn->error]);
        }
    }
}

// 3. LƯU CHAIN_ID (batchId trên chain) VÀO DB
elseif ($action === "confirm_blockchain" || $action === "setChain") {
    $id = (int)$data->id;
    $chain_id = $conn->real_escape_string((string)$data->chain_id);
    $conn->query("UPDATE products SET chain_id = '$chain_id' WHERE id = $id");
    echo json_encode(["ok" => true]);
}

// 4. ĐỌC LỊCH SỬ (tra cứu theo id hoặc chain_id)
elseif ($action === "history") {
    $p = find_product($conn, (string)$data->id);

    if (!$p) {
        echo json_encode(["message" => "Không tìm thấy lô hàng"]);
    } else {
        $real_id = (int)$p['id'];
        $rs = $conn->query("SELECT product_id, location, status, data_hash, lat, lng, UNIX_TIMESTAMP(updated_at) AS ts
                            FROM tracking_history WHERE product_id = $real_id ORDER BY id ASC");
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